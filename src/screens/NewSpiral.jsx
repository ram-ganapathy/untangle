import { useRef, useState } from 'react'
import { callAgent } from '../agent/callAgent'
import { analyzeAndPersistSpiral, agentFragments } from '../agent/persistAnalysis'
import { createEntry, listEntries } from '../db/entries'
import { createFragments, listFragments, returnFragment } from '../db/fragments'
import { createSpiralWithEntry, getSpiral, updateSpiral } from '../db/spirals'
import { exampleEntry, exampleSpiral } from '../demo/demoData'
import { useSpeech } from '../stt/useSpeech'

export default function NewSpiral({ spiralId }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('text')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const saveInProgress = useRef(false)
  const speech = useSpeech((transcript) => {
    setText((current) => `${current}${current ? ' ' : ''}${transcript}`)
    setSource('voice')
  })

  async function saveNewSpiral(spiralValues, entryValues) {
    const { spiral, entry } = await createSpiralWithEntry({ spiral: spiralValues, entry: entryValues })
    const analysis = await analyzeAndPersistSpiral(spiral, [entry])
    return { id: spiral.id, safety: analysis.safety }
  }

  async function saveToExistingSpiral(rawText, entrySource) {
    const spiral = await getSpiral(spiralId)
    if (!spiral) throw new Error('Cannot add a thought to a missing spiral.')
    const entry = await createEntry({ spiralId, rawText, source: entrySource })
    if (!spiral.diagnosis) {
      const analysis = await analyzeAndPersistSpiral(spiral, await listEntries(spiralId))
      return { id: spiralId, safety: analysis.safety }
    }
    const existingFragments = await listFragments(spiralId)
    const diff = await callAgent('diff', { rawText, fragments: existingFragments })
    if (diff.safety) {
      await updateSpiral(spiralId, { safety: true })
      return { id: spiralId, safety: true }
    }
    const newFragments = agentFragments({ new_fragments: diff.new_fragments }, spiralId, entry.id)
    if (newFragments.length) await createFragments(newFragments)
    const returnable = new Set(existingFragments.filter((fragment) => ['settled', 'released'].includes(fragment.status)).map((fragment) => fragment.id))
    await Promise.all((diff.returning ?? []).filter(({ existingId }) => returnable.has(existingId)).map(({ existingId }) => returnFragment(existingId)))
    await updateSpiral(spiralId, {
      state: 'open',
      engineFallback: Boolean(diff.__untangleFallback),
      shift: diff.shift ?? null,
    })
    return { id: spiralId, safety: false }
  }

  async function saveSpiral(spiralValues, entryValues) {
    if (saveInProgress.current) return
    saveInProgress.current = true
    setIsSaving(true)
    setError('')
    try {
      const saved = spiralId
        ? await saveToExistingSpiral(entryValues.rawText, entryValues.source)
        : await saveNewSpiral(spiralValues, entryValues)
      window.location.hash = saved.safety ? `#/care/${saved.id}` : `#/spiral/${saved.id}`
    } catch (saveError) {
      console.error('Unable to save spiral.', saveError)
      setError('Your thought could not be saved. Try again.')
    } finally {
      saveInProgress.current = false
      setIsSaving(false)
    }
  }

  function holdItStill() {
    const rawText = text.trim()
    if (!rawText || isSaving) return
    speech.stop()
    saveSpiral({ title: 'Untangling…', diagnosis: null }, { rawText, source })
  }

  function showExample() {
    if (isSaving) return
    speech.stop()
    saveSpiral(exampleSpiral, exampleEntry)
  }

  const returning = Boolean(spiralId)
  return (
    <main className="page new-spiral-page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>{returning ? 'add to spiral' : 'new spiral'}</span></header>
        <section className="form-stage">
        <h1>{returning ? 'What returned to the loop?' : 'What’s looping tonight?'}</h1>
        <p className="subtle">Say it or type it, exactly as messy as it is in your head.</p>
        <div className="input-surface">
          <textarea aria-label="Your thought spiral" value={text} onChange={(event) => { setText(event.target.value); setSource('text') }} placeholder="In Tuesday's meeting I said the timeline was too aggressive and Priya just paused…" />
          {speech.interimTranscript && <p className="interim">{speech.interimTranscript}…</p>}
          <div className="actions">
            {speech.isSupported && <button className={`mic ${speech.isListening ? 'listening' : ''}`} type="button" onClick={speech.isListening ? speech.stop : speech.start} aria-label={speech.isListening ? 'Stop listening' : 'Speak your thought'}><span aria-hidden="true">◉</span></button>}
            <button className="button primary" type="button" onClick={holdItStill} disabled={!text.trim() || isSaving}>{isSaving ? 'Holding it still…' : returning ? 'Pour in another' : 'Hold it still'}</button>
            {!returning && <button className="button ghost" type="button" onClick={showExample} disabled={isSaving}>Show me an example</button>}
          </div>
        </div>
        {speech.isListening && <p className="subtle listening-copy">Listening — tell it like it replays.</p>}
        {error && <p className="form-error">{error}</p>}
        </section>
      </div>
    </main>
  )
}
