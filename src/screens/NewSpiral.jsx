import { useState } from 'react'
import { callAgent } from '../agent/callAgent'
import { createFragments } from '../db/fragments'
import { createSpiralWithEntry, updateSpiral } from '../db/spirals'
import { exampleEntry, exampleSpiral } from '../demo/demoData'
import { useSpeech } from '../stt/useSpeech'

function agentFragments(result, spiralId, entryId) {
  if (Array.isArray(result.fragments)) {
    return result.fragments.map(({ text, layer, pattern, note }) => ({
      spiralId, entryId, text, layer, pattern, note,
    }))
  }
  return (result.nodes ?? []).map(({ text, kind, probability, evidence, pattern }) => ({
    spiralId, entryId, text, kind, probability, evidence, pattern,
  }))
}

function closingCard(result) {
  if (result.keep?.text) return { closingText: result.keep.text, closingType: 'keep' }
  if (result.anchor?.text) return { closingText: result.anchor.text, closingType: 'anchor' }
  return {}
}

export default function NewSpiral() {
  const [text, setText] = useState('')
  const [source, setSource] = useState('text')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const speech = useSpeech((transcript) => {
    setText((current) => `${current}${current ? ' ' : ''}${transcript}`)
    setSource('voice')
  })

  async function saveSpiral(spiralValues, entryValues) {
    setIsSaving(true)
    setError('')
    try {
      const { spiral, entry } = await createSpiralWithEntry({ spiral: spiralValues, entry: entryValues })
      const diagnosisResult = await callAgent('diagnose', { rawText: entry.rawText })
      const diagnosis = diagnosisResult.diagnosis ?? 'replay'
      const decomposition = await callAgent('decompose', { rawText: entry.rawText, diagnosis })

      // The schema has no closing-card field, so keep/anchor copy lives on its spiral.
      await updateSpiral(spiral.id, {
        diagnosis,
        title: diagnosisResult.headline || spiral.title,
        ...closingCard(decomposition),
      })
      const fragments = agentFragments(decomposition, spiral.id, entry.id)
      if (fragments.length) await createFragments(fragments)
      window.location.hash = `#/spiral/${spiral.id}`
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

  return (
    <main className="page shell">
      <header className="brand"><a href="#/">Untangle</a><span>new spiral</span></header>
      <section className="form-stage">
        <h1>What’s looping tonight?</h1>
        <p className="subtle">Say it or type it, exactly as messy as it is in your head.</p>
        <div className="input-surface">
          <textarea
            aria-label="Your thought spiral"
            value={text}
            onChange={(event) => { setText(event.target.value); setSource('text') }}
            placeholder="In Tuesday's meeting I said the timeline was too aggressive and Priya just paused…"
          />
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
