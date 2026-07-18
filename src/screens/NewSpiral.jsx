import { useState } from 'react'
import { callAgent } from '../agent/callAgent'
import { createEntry } from '../db/entries'
import { createFragments, listFragments, returnFragment } from '../db/fragments'
import { createSpiralWithEntry, getSpiral, updateSpiral } from '../db/spirals'
import { exampleEntry, exampleSpiral } from '../demo/demoData'
import { useSpeech } from '../stt/useSpeech'

function agentFragments(result, spiralId, entryId) {
  const items = result.fragments ?? result.nodes ?? result.new_fragments ?? []
  return items.map(({ text, layer, kind, probability, evidence, pattern, note }) => {
    const fragment = { spiralId, entryId, text }
    if (layer !== undefined) fragment.layer = layer
    if (kind !== undefined) fragment.kind = kind
    if (probability !== undefined) fragment.probability = probability
    if (evidence !== undefined) fragment.evidence = evidence
    if (pattern !== undefined) fragment.pattern = pattern
    if (note !== undefined) fragment.note = note
    return fragment
  })
}

function closingCard(result) {
  if (result.keep?.text) return { closingText: result.keep.text, closingType: 'keep' }
  if (result.anchor?.text) return { closingText: result.anchor.text, closingType: 'anchor' }
  return {}
}

export default function NewSpiral({ spiralId }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('text')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const speech = useSpeech((transcript) => {
    setText((current) => `${current}${current ? ' ' : ''}${transcript}`)
    setSource('voice')
  })

  async function saveNewSpiral(spiralValues, entryValues) {
    const { spiral, entry } = await createSpiralWithEntry({ spiral: spiralValues, entry: entryValues })
    const diagnosisResult = await callAgent('diagnose', { rawText: entry.rawText })
    const diagnosis = diagnosisResult.diagnosis ?? 'replay'
    const decomposition = await callAgent('decompose', { rawText: entry.rawText, diagnosis })
    await updateSpiral(spiral.id, { diagnosis, title: diagnosisResult.headline || spiral.title, ...closingCard(decomposition) })
    const fragments = agentFragments(decomposition, spiral.id, entry.id)
    if (fragments.length) await createFragments(fragments)
    return spiral.id
  }

  async function saveToExistingSpiral(rawText, entrySource) {
    const spiral = await getSpiral(spiralId)
    if (!spiral) throw new Error('Cannot add a thought to a missing spiral.')
    const entry = await createEntry({ spiralId, rawText, source: entrySource })
    const existingFragments = await listFragments(spiralId)
    const diff = await callAgent('diff', { rawText, fragments: existingFragments })
    const newFragments = agentFragments({ new_fragments: diff.new_fragments }, spiralId, entry.id)
    if (newFragments.length) await createFragments(newFragments)
    const returnable = new Set(existingFragments.filter((fragment) => ['settled', 'released'].includes(fragment.status)).map((fragment) => fragment.id))
    await Promise.all((diff.returning ?? []).filter(({ existingId }) => returnable.has(existingId)).map(({ existingId }) => returnFragment(existingId)))
    await updateSpiral(spiralId, { state: 'open' })
    return spiralId
  }

  async function saveSpiral(spiralValues, entryValues) {
    setIsSaving(true)
    setError('')
    try {
      const savedId = spiralId
        ? await saveToExistingSpiral(entryValues.rawText, entryValues.source)
        : await saveNewSpiral(spiralValues, entryValues)
      window.location.hash = `#/spiral/${savedId}`
    } catch (saveError) {
      console.error('Unable to save spiral.', saveError)
      setError('Your thought could not be saved. Try again.')
    } finally {
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
    <main className="page shell">
      <header className="brand"><a href="#/">Untangle</a><span>{returning ? 'add to spiral' : 'new spiral'}</span></header>
      <section className="form-stage">
        <h1>{returning ? 'What returned to the loop?' : 'What’s looping tonight?'}</h1>
        <p className="subtle">Say it or type it, exactly as messy as it is in your head.</p>
        <div className="input-surface">
          <textarea aria-label="Your thought spiral" value={text} onChange={(event) => { setText(event.target.value); setSource('text') }} placeholder="In Tuesday's meeting I said the timeline was too aggressive and Priya just paused…" />
          {speech.interimTranscript && <p className="interim">{speech.interimTranscript}…</p>}
          <div className="actions">
            {speech.isSupported && <button className={`mic ${speech.isListening ? 'listening' : ''}`} type="button" onClick={speech.isListening ? speech.stop : speech.start} aria-label={speech.isListening ? 'Stop listening' : 'Speak your thought'}><span aria-hidden="true">◉</span></button>}
            <button className="button primary" type="button" onClick={holdItStill} disabled={!text.trim() || isSaving}>{isSaving ? 'Holding it still…' : 'Hold it still'}</button>
            <button className="button ghost" type="button" onClick={showExample} disabled={isSaving}>Show me an example</button>
          </div>
        </div>
        {speech.isListening && <p className="subtle listening-copy">Listening — tell it like it replays.</p>}
        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  )
}
