import { useEffect, useState } from 'react'
import Basin from './Basin'
import Cascade from './Cascade'
import { listEntries } from '../db/entries'
import { getSpiral } from '../db/spirals'

export default function SpiralView({ spiralId }) {
  const [spiral, setSpiral] = useState(null)
  const [entries, setEntries] = useState([])

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

  if (spiral.diagnosis === 'replay') return <Basin spiral={spiral} />
  if (['projection', 'rumination', 'deliberation'].includes(spiral.diagnosis)) {
    return <Cascade spiral={spiral} showDedicatedScreenNote={spiral.diagnosis !== 'projection'} />
  }

  return (
    <main className="page shell">
      <header className="brand"><a href="#/">Untangle</a><span>spiral map</span></header>
      <section className="map-stage">
        <span className="chip">{spiral.diagnosis ? `DIAGNOSIS · ${spiral.diagnosis.toUpperCase()}` : 'WAITING TO UNTANGLE'}</span>
        <h1>{spiral.title}</h1>
        <p className="subtle">Your thought is held here. Its map comes next.</p>
        {entries.map((entry) => <blockquote className="entry-preview" key={entry.id}>{entry.rawText}</blockquote>)}
        <a className="button ghost" href={`#/new/${spiral.id}`}>Add a thought</a>
      </section>
    </main>
  )
}
