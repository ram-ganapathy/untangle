import { useEffect, useRef, useState } from 'react'
import { fragmentStatuses } from '../db/fragmentLifecycle'
import { listFragments, transitionFragmentStatus } from '../db/fragments'
import { updateSpiral } from '../db/spirals'
import EraseSpiral from './EraseSpiral'
import './Groove.css'

const resolved = new Set([fragmentStatuses.settled, fragmentStatuses.released])

function echoLabel(text) {
  const label = text.split(' ').slice(0, 4).join(' ')
  return label.length > 30 ? `${label.slice(0, 29)}...` : label
}

export default function Groove({ spiral }) {
  const [fragments, setFragments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const grooveRef = useRef(null)
  const echoRefs = useRef({})
  const orbitParams = useRef({})

  useEffect(() => {
    setIsLoading(true)
    listFragments(spiral.id)
      .then(setFragments)
      .catch((error) => console.error('Unable to load groove fragments.', error))
      .finally(() => setIsLoading(false))
  }, [spiral.id])

  const lifted = fragments.find((fragment) => fragment.status === fragmentStatuses.lifted)
  const circling = fragments.filter((fragment) => fragment.status === fragmentStatuses.swirling)
  const keepsakes = fragments.filter((fragment) => fragment.status === fragmentStatuses.settled)
  const fadedCount = fragments.filter((fragment) => fragment.status === fragmentStatuses.released).length
  const isComplete = fragments.length > 0 && fragments.every((fragment) => resolved.has(fragment.status))
  // A rumination can contain several observables; the first is the smallest useful stand-in for the unchangeable event.
  const realEvent = fragments.find((fragment) => fragment.layer === 'happened')?.text ?? spiral.title

  useEffect(() => {
    if (!circling.length) return undefined

    circling.forEach((fragment, index) => {
      if (orbitParams.current[fragment.id]) return
      orbitParams.current[fragment.id] = {
        theta: index * 1.86 - .45,
        radiusFraction: .34 + (index % 3) * .12,
        speed: .000045 + (index % 4) * .000015,
        wobblePhase: index * 1.4,
        wobbleTime: 0,
      }
    })

    const place = (time, shouldAdvance) => {
      const groove = grooveRef.current
      if (!groove) return
      const radius = groove.clientWidth / 2
      circling.forEach((fragment) => {
        const echo = echoRefs.current[fragment.id]
        const params = orbitParams.current[fragment.id]
        if (!echo || !params) return
        if (shouldAdvance) {
          params.theta += params.speed * time
          params.wobbleTime += time
        }
        const wobble = shouldAdvance ? Math.sin(params.wobbleTime * .00055 + params.wobblePhase) * 4 : 0
        const orbit = params.radiusFraction * (radius - 46) + wobble
        const x = radius + orbit * Math.cos(params.theta) - 41
        const y = radius + orbit * Math.sin(params.theta) - 25
        echo.style.transform = `translate(${x}px, ${y}px)`
      })
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
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
      console.error('Unable to update groove echo.', error)
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
      console.error('Unable to lift groove echo.', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  return (
    <main className="page groove-page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>rumination · step out of the groove</span></header>
        <section className="groove-stage">
          <span className="chip groove-chip">DIAGNOSIS · RUMINATION</span>
          <h1>{spiral.title}</h1>
          {spiral.engineFallback && <p className="engine-banner">Couldn't reach the engine — showing an example instead.</p>}
          {spiral.demoEngine && <a className="demo-engine-chip" href="#/connect">demo example — connect the engine to map your own words</a>}
          {spiral.shift && <p className="map-shift">{spiral.shift}</p>}
          <p className="subtle">The event is set. The rewrites are what keep wearing the groove deeper.</p>
          <EraseSpiral spiralId={spiral.id} />

          {isLoading ? <p className="subtle">Finding the echoes...</p> : (
            <>
              <div className={`groove-visual ${isComplete ? 'groove-still' : ''}`} ref={grooveRef}>
                <div className="groove-track track-one" /><div className="groove-track track-two" /><div className="groove-track track-three" />
                <div className="event-stone"><span>THE EVENT</span><strong>{realEvent}</strong></div>
                <div className="groove-keepsakes" aria-label="Lessons kept">
                  {keepsakes.map((fragment) => <span className="keepsake" key={fragment.id}>{echoLabel(fragment.text)}</span>)}
                </div>
                {circling.map((fragment) => <button className="groove-echo" key={fragment.id} type="button" ref={(element) => { echoRefs.current[fragment.id] = element }} onClick={() => lift(fragment)} disabled={isTransitioning} aria-label={`Examine: ${fragment.text}`}><span>{echoLabel(fragment.text)}</span>{fragment.returnCount >= 1 && <i>returned ×{fragment.returnCount}</i>}</button>)}
              </div>

              {!lifted && !isComplete && <p className="groove-hint">TAP AN ECHO TO HOLD IT STILL · {circling.length} REMAINING</p>}

              {lifted && <article className="groove-examination">
                {lifted.pattern && <span className="pattern-label">{lifted.pattern}</span>}
                <p className="groove-examination-text">{lifted.text}</p>
                <p className="groove-examination-note">{lifted.note}</p>
                <p className="groove-nudge">One lesson is enough. You may keep another only if it is genuinely useful.</p>
                <div className="groove-actions"><button className="button keep-button" type="button" onClick={() => transition(lifted, fragmentStatuses.settled)} disabled={isTransitioning}>Keep as the lesson</button><button className="button fade-button" type="button" onClick={() => transition(lifted, fragmentStatuses.released)} disabled={isTransitioning}>Let it fade</button></div>
                <button className="put-back" type="button" onClick={() => transition(lifted, fragmentStatuses.swirling)} disabled={isTransitioning}>Put it back for now</button>
              </article>}

              {!isComplete && (keepsakes.length > 0 || fadedCount > 0) && <p className="groove-tally"><span>{keepsakes.length} lesson{keepsakes.length === 1 ? '' : 's'} kept</span><span>{fadedCount} faded</span></p>}
              {isComplete && <>
                <section className="groove-complete"><p><span>{keepsakes.length} lesson{keepsakes.length === 1 ? '' : 's'} kept</span><span>{fadedCount} let go</span></p><h2>The groove is still.</h2></section>
                {spiral.closingText && <section className="groove-closing"><p>WORTH KEEPING FROM THIS</p><strong>{spiral.closingText}</strong></section>}
              </>}
            </>
          )}
          <a className="button ghost groove-new" href={`#/new/${spiral.id}`}>Pour in another</a>
        </section>
      </div>
    </main>
  )
}
