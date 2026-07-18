import { useEffect, useState } from 'react'
import Basin from './Basin'
import Cascade from './Cascade'
import CareScreen from './CareScreen'
import { analyzeAndPersistSpiral } from '../agent/persistAnalysis'
import { listEntries } from '../db/entries'
import { getSpiral } from '../db/spirals'

export default function SpiralView({ spiralId }) {
  const [spiral, setSpiral] = useState(null)
  const [entries, setEntries] = useState([])
  const [isUntangling, setIsUntangling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const savedSpiral = await getSpiral(spiralId)
      setSpiral(savedSpiral)
      if (savedSpiral) setEntries(await listEntries(spiralId))
    }
    load().catch((error) => console.error('Unable to load spiral.', error))
  }, [spiralId])

  if (!spiral) {
    return <main className="page shell"><header className="brand"><a href="#/">Untangle</a><span>spiral map</span></header><section className="map-stage"><p className="subtle">Finding your spiral…</p></section></main>
  }

  if (spiral.safety) return <CareScreen />

  if (spiral.diagnosis === 'replay') return <Basin spiral={spiral} />
  if (['projection', 'rumination', 'deliberation'].includes(spiral.diagnosis)) {
    return <Cascade spiral={spiral} showDedicatedScreenNote={spiral.diagnosis !== 'projection'} />
  }

  async function untangle() {
    if (isUntangling) return
    setIsUntangling(true)
    setError('')
    try {
      const result = await analyzeAndPersistSpiral(spiral, entries)
      if (result.safety) window.location.hash = `#/care/${spiral.id}`
      else setSpiral(result.spiral)
    } catch (analysisError) {
      console.error('Unable to untangle saved spiral.', analysisError)
      setError('Your thought could not be untangled. Try again.')
    } finally {
      setIsUntangling(false)
    }
  }

  return (
    <main className="page shell">
      <header className="brand"><a href="#/">Untangle</a><span>spiral map</span></header>
      <section className="map-stage">
        <span className="chip">{spiral.diagnosis ? `DIAGNOSIS · ${spiral.diagnosis.toUpperCase()}` : 'WAITING TO UNTANGLE'}</span>
        <h1>{spiral.title}</h1>
        <p className="subtle">Your thought is held here. Its map is ready to be made.</p>
        {entries.map((entry) => <blockquote className="entry-preview" key={entry.id}>{entry.rawText}</blockquote>)}
        <button className="button primary" type="button" onClick={untangle} disabled={!entries.length || isUntangling}>{isUntangling ? 'Untangling…' : 'Untangle it'}</button>
        <a className="button ghost" href={`#/new/${spiral.id}`}>Add a thought</a>
        {error && <p className="form-error">{error}</p>}
      </section>
    </main>
  )
}
