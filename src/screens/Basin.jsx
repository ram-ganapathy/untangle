import { useEffect, useRef, useState } from 'react'
import { fragmentStatuses } from '../db/fragmentLifecycle'
import { listFragments, transitionFragmentStatus, updateFragment } from '../db/fragments'
import { updateSpiral } from '../db/spirals'
import EraseSpiral from './EraseSpiral'
import EntrySediment from './EntrySediment'
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
  const basinRef = useRef(null)
  const wispRefs = useRef({})
  const orbitParams = useRef({})

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

  useEffect(() => {
    if (!swirling.length) return undefined

    swirling.forEach((fragment, index) => {
      if (orbitParams.current[fragment.id]) return
      orbitParams.current[fragment.id] = {
        theta: index * 2.1 + 0.4,
        rFrac: 0.28 + (index % 4) * 0.13,
        speed: 0.00006 + (index % 5) * 0.000018,
        wobbleAmplitude: 4 + (index % 3) * 3,
        wobbleFrequency: 0.0007 + (index % 4) * 0.00015,
        wobblePhase: index * 1.7,
      }
    })

    const place = (time, shouldAdvance) => {
      const basin = basinRef.current
      if (!basin) return
      const radius = basin.clientWidth / 2
      swirling.forEach((fragment) => {
        const wisp = wispRefs.current[fragment.id]
        const params = orbitParams.current[fragment.id]
        if (!wisp || !params) return
        if (shouldAdvance) params.theta += params.speed * time
        const wobble = shouldAdvance
          ? params.wobbleAmplitude * Math.sin(time * params.wobbleFrequency + params.wobblePhase)
          : 0
        const orbitRadius = params.rFrac * (radius - 44) + wobble
        const x = radius + orbitRadius * Math.cos(params.theta) - 33
        const y = radius + orbitRadius * Math.sin(params.theta) - 33
        wisp.style.transform = `translate(${x}px, ${y}px)`
      })
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      place(0, false)
      return undefined
    }

    let frame
    let previous = performance.now()
    const tick = (time) => {
      const elapsed = time - previous
      previous = time
      place(elapsed, true)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fragments])

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

  async function lift(fragment) {
    if (isTransitioning || lifted?.id === fragment.id) return
    setIsTransitioning(true)
    try {
      let nextFragments = fragments
      if (lifted) {
        const putBack = await transitionFragmentStatus(lifted.id, fragmentStatuses.swirling)
        nextFragments = nextFragments.map((item) => item.id === putBack.id ? putBack : item)
      }
      const newlyLifted = await transitionFragmentStatus(fragment.id, fragmentStatuses.lifted)
      nextFragments = nextFragments.map((item) => item.id === newlyLifted.id ? newlyLifted : item)
      setFragments(nextFragments)
    } catch (error) {
      console.error('Unable to lift basin fragment.', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  async function toggleLayer(fragment) {
    if (isTransitioning) return
    setIsTransitioning(true)
    try {
      const updated = await updateFragment(fragment.id, {
        layer: fragment.layer === 'happened' ? 'added' : 'happened',
      })
      setFragments((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (error) {
      console.error('Unable to correct basin fragment.', error)
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
          {spiral.engineFallback && <p className="engine-banner">Couldn't reach the engine — showing an example instead.</p>}
          {spiral.demoEngine && <a className="demo-engine-chip" href="#/connect">demo example — connect the engine to map your own words</a>}
          {spiral.shift && <p className="map-shift">{spiral.shift}</p>}
          <p className="subtle">Your memory, held still. Lift each wisp to see what belongs in the record.</p>
          <EraseSpiral spiralId={spiral.id} />

          {isLoading ? <p className="subtle">Gathering the wisps…</p> : (
            <>
              {!isComplete && (
                <div className="basin-wrap">
                  <div className={`basin ${swirling.length <= 2 ? 'calm' : ''}`} ref={basinRef}>
                    <div className={`basin-swirl ${swirling.length <= 2 ? 'calm' : ''}`} />
                    <div className="basin-ring ring-one" /><div className="basin-ring ring-two" /><div className="basin-ring ring-three" />
                    {swirling.map((fragment) => (
                      <button
                        className="wisp"
                        key={fragment.id}
                        type="button"
                        ref={(element) => { wispRefs.current[fragment.id] = element }}
                        onClick={() => lift(fragment)}
                        disabled={isTransitioning}
                      ><span className="wisp-label">{wispLabel(fragment.text)}</span>{fragment.returnCount >= 1 && <span className="returned-marker">returned ×{fragment.returnCount}</span>}</button>
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
                  <button className="layer-override" type="button" onClick={() => toggleLayer(lifted)} disabled={isTransitioning}>Not right? It is actually {lifted.layer === 'happened' ? 'something I added' : 'something that happened'}</button>
                  <button className="put-back" type="button" onClick={() => transition(lifted, fragmentStatuses.swirling)} disabled={isTransitioning}>Put it back for now</button>
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
                </>
              )}
            </>
          )}
          <a className="button ghost basin-new" href={`#/new/${spiral.id}`}>Pour in another</a>
          <EntrySediment spiralId={spiral.id} />
        </section>
      </div>
    </main>
  )
}
