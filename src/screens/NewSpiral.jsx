import { useState } from 'react'
import { createSpiralWithEntry } from '../db/spirals'
import { exampleEntry, exampleSpiral } from '../demo/demoData'
import { useSpeech } from '../stt/useSpeech'

function titleFrom(text) {
  return text.trim().split(/\s+/).slice(0, 6).join(' ')
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
      const { spiral } = await createSpiralWithEntry({ spiral: spiralValues, entry: entryValues })
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
    // M3 replaces this pending value with the agent diagnosis.
    saveSpiral({ title: titleFrom(rawText), diagnosis: null }, { rawText, source })
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
