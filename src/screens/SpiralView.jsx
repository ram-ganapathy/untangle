import { useEffect, useState } from 'react'
import Basin from './Basin'
import Cascade from './Cascade'
import Groove from './Groove'
import CareScreen from './CareScreen'
import { analyzeAndPersistSpiral } from '../agent/persistAnalysis'
import { listEntries } from '../db/entries'
import { getSpiral } from '../db/spirals'
import EraseSpiral from './EraseSpiral'

export default function SpiralView({ spiralId }) {
  const [spiral, setSpiral] = useState(null)
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUntangling, setIsUntangling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const savedSpiral = await getSpiral(spiralId)
      setSpiral(savedSpiral)
      if (savedSpiral) setEntries(await listEntries(spiralId))
      setIsLoading(false)
    }
    load().catch((error) => {
      console.error('Unable to load spiral.', error)
      setIsLoading(false)
    })
  }, [spiralId])

  if (isLoading) {
    return <main className="page"><div className="shell"><header className="brand"><a href="#/">Untangle</a><span>spiral map</span></header><section className="map-stage"><p className="subtle">Finding your spiral…</p></section></div></main>
  }

  if (!spiral) return <main className="page"><div className="shell"><header className="brand"><a href="#/">Untangle</a><span>spiral map</span></header><section className="map-stage"><h1>This spiral isn’t here.</h1><p className="subtle">It may have been removed, or this link is incomplete.</p><a className="button primary" href="#/">Back to your library</a></section></div></main>

  if (spiral.safety) return <CareScreen />

  if (spiral.diagnosis === 'replay') return <Basin spiral={spiral} />
  if (spiral.diagnosis === 'rumination') return <Groove spiral={spiral} />
  if (['projection', 'deliberation'].includes(spiral.diagnosis)) {
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
    <main className="page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>spiral map</span></header>
        <section className="map-stage">
        <span className="chip">{spiral.diagnosis ? `DIAGNOSIS · ${spiral.diagnosis.toUpperCase()}` : 'WAITING TO UNTANGLE'}</span>
        <h1>{spiral.title}</h1>
        {spiral.demoEngine && <a className="demo-engine-chip" href="#/connect">demo example — connect the engine to map your own words</a>}
        <p className="subtle">Your thought is held here. Its map is ready to be made.</p>
        {entries.map((entry) => <blockquote className="entry-preview" key={entry.id}>{entry.rawText}</blockquote>)}
        <button className="button primary" type="button" onClick={untangle} disabled={!entries.length || isUntangling}>{isUntangling ? 'Untangling…' : 'Untangle it'}</button>
        <a className="button ghost" href={`#/new/${spiral.id}`}>Pour in another</a>
        <EraseSpiral spiralId={spiral.id} />
        {error && <p className="form-error">{error}</p>}
        </section>
      </div>
    </main>
  )
}
