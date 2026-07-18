import { useState } from 'react'
import { callAgent } from '../agent/callAgent'

export default function AgentTest() {
  const [text, setText] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  async function run() {
    if (!text.trim() || isRunning) return
    setIsRunning(true)
    const diagnosis = await callAgent('diagnose', { rawText: text.trim() })
    if (diagnosis.safety) {
      console.log('Untangle agent test', { diagnosis })
      setIsRunning(false)
      return
    }
    const decomposition = await callAgent('decompose', { rawText: text.trim(), diagnosis: diagnosis.diagnosis })
    console.log('Untangle agent test', { diagnosis, decomposition })
    setIsRunning(false)
  }

  return (
    <main className="page shell">
      <header className="brand"><a href="#/">Untangle</a><span>agent test</span></header>
      <section className="form-stage">
        <h1>Test the map engine.</h1>
        <div className="input-surface"><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste a thought-dump…" /><div className="actions"><button className="button primary" type="button" onClick={run} disabled={!text.trim() || isRunning}>{isRunning ? 'Mapping…' : 'Run agent test'}</button></div></div>
        <p className="subtle">Valid diagnosis and fragment JSON are logged to the browser console.</p>
      </section>
    </main>
  )
}
