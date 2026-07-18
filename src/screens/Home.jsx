import { useEffect, useState } from 'react'
import { listSpirals } from '../db/spirals'

function touchedAt(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
}

export default function Home() {
  const [spirals, setSpirals] = useState([])

  useEffect(() => {
    listSpirals().then(setSpirals).catch((error) => console.error('Unable to load spiral library.', error))
  }, [])

  return (
    <main className="page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>spiral library</span></header>
        <section className="home-hero">
        <p className="eyebrow">YOUR LIBRARY</p>
        {spirals.length === 0 ? <><h1>Nothing is waiting to be sorted.</h1><p className="subtle">Something looping? Pour it in.</p></> : <><h1>Thoughts you have held still.</h1><p className="subtle">Return to any map exactly where you left it.</p></>}
        <a className="button primary" href="#/new">Start a spiral</a>
        </section>
        {spirals.length > 0 && <section className="spiral-library">{spirals.map((spiral) => <a className="spiral-row" href={`#/spiral/${spiral.id}`} key={spiral.id}><span><strong>{spiral.title}</strong><small>{touchedAt(spiral.updatedAt)}</small></span><span className="library-meta"><em>{spiral.diagnosis || 'waiting'}</em><b>{spiral.state}</b></span></a>)}</section>}
      </div>
    </main>
  )
}
