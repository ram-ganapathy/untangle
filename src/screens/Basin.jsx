import { useEffect, useState } from 'react'
import { fragmentStatuses } from '../db/fragmentLifecycle'
import { listFragments, transitionFragmentStatus } from '../db/fragments'
import { updateSpiral } from '../db/spirals'
import './Basin.css'

const resolved = new Set([fragmentStatuses.settled, fragmentStatuses.released])

function wispLabel(text) {
  const label = text.split(' ').slice(0, 3).join(' ')
  return label.length > 24 ? `${label.slice(0, 23)}…` : label
}

export default function Basin({ spiral }) {
  const [fragments, setFragments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    listFragments(spiral.id)
      .then(setFragments)
      .catch((error) => console.error('Unable to load basin fragments.', error))
      .finally(() => setIsLoading(false))
  }, [spiral.id])

  const lifted = fragments.find((fragment) => fragment.status === fragmentStatuses.lifted)
  const swirling = fragments.filter((fragment) => fragment.status === fragmentStatuses.swirling)
  const stones = fragments.filter((fragment) => fragment.status === fragmentStatuses.settled)
  const mistCount = fragments.filter((fragment) => fragment.status === fragmentStatuses.released).length
  const isComplete = fragments.length > 0 && fragments.every((fragment) => resolved.has(fragment.status))

  async function transition(fragment, nextStatus) {
    if (isTransitioning) return
    setIsTransitioning(true)
    try {
      const updated = await transitionFragmentStatus(fragment.id, nextStatus)
      const nextFragments = fragments.map((item) => item.id === updated.id ? updated : item)
      setFragments(nextFragments)
      if (nextFragments.every((item) => resolved.has(item.status))) {
        await updateSpiral(spiral.id, { state: 'settled' })
      }
    } catch (error) {
      console.error('Unable to update basin fragment.', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  return (
    <main className="page basin-page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>replay · sift the memory</span></header>
        <section className="basin-stage">
          <span className="chip basin-chip">DIAGNOSIS · REPLAY</span>
          <h1>{spiral.title}</h1>
          <p className="subtle">Your memory, held still. Lift each wisp to see what belongs in the record.</p>

          {isLoading ? <p className="subtle">Gathering the wisps…</p> : (
            <>
              {!isComplete && (
                <div className="basin-wrap">
                  <div className={`basin ${swirling.length <= 2 ? 'calm' : ''}`}>
                    <div className="basin-swirl" />
                    <div className="basin-ring ring-one" /><div className="basin-ring ring-two" /><div className="basin-ring ring-three" />
                    {swirling.map((fragment, index) => (
                      <button
                        className="wisp"
                        key={fragment.id}
                        type="button"
                        style={{ '--wisp-angle': `${(index * 137) % 360}deg`, '--wisp-radius': `${30 + (index % 3) * 16}%` }}
                        onClick={() => transition(fragment, fragmentStatuses.lifted)}
                        disabled={Boolean(lifted) || isTransitioning}
                      >{wispLabel(fragment.text)}</button>
                    ))}
                  </div>
                </div>
              )}

              {!lifted && !isComplete && <p className="basin-hint">TAP A WISP TO LIFT IT OUT · {swirling.length} REMAINING</p>}

              {lifted && (
                <article className="examination-card">
                  {lifted.pattern && <span className="pattern-label">{lifted.pattern}</span>}
                  <p className="examination-text">{lifted.text}</p>
                  <p className="examination-note">{lifted.note}</p>
                  <button
                    className={`button ${lifted.layer === 'happened' ? 'settle-button' : 'release-button'}`}
                    type="button"
                    onClick={() => transition(lifted, lifted.layer === 'happened' ? fragmentStatuses.settled : fragmentStatuses.released)}
                    disabled={isTransitioning}
                  >{lifted.layer === 'happened' ? 'Set it in the record' : 'Let it go to mist'}</button>
                </article>
              )}

              {stones.length > 0 && (
                <section className="record">
                  <p className="record-label">THE RECORD — WHAT ACTUALLY HAPPENED</p>
                  {stones.map((fragment) => <div className="stone" key={fragment.id}>{fragment.text}</div>)}
                  {mistCount > 0 && <p className="mist-count">released to mist: {mistCount}</p>}
                </section>
              )}

              {isComplete && (
                <>
                  <section className="basin-tally">
                    <p><span>{stones.length} in the record</span><span>{mistCount} gone to mist</span></p>
                    <h2>The basin is clear.</h2>
                  </section>
                  {spiral.closingText && <section className="closing-card"><p>{spiral.closingType === 'anchor' ? 'WHAT IS YOURS TO DO' : 'WORTH KEEPING FROM THIS'}</p><strong>{spiral.closingText}</strong></section>}
                  <p className="basin-calm">The record stays. The mist was never yours to carry.</p>
                  <a className="button ghost basin-new" href="#/new">Pour in another</a>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
