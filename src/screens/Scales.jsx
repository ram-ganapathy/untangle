import { useEffect, useMemo, useState } from 'react'
import { fragmentStatuses } from '../db/fragmentLifecycle'
import { listFragments, transitionFragmentStatus } from '../db/fragments'
import { updateSpiral } from '../db/spirals'
import EraseSpiral from './EraseSpiral'
import EntrySediment from './EntrySediment'
import './Scales.css'

const resolved = new Set([fragmentStatuses.settled, fragmentStatuses.released])

function optionNames(triggerText = '') {
  const match = triggerText.match(/between\s+(?:the\s+)?(.+?)\s+(?:and|or)\s+(?:the\s+)?(.+?)(?:[.!?]|$)/i)
  if (!match) return { left: 'one option', right: 'the other option' }
  return { left: match[1].trim(), right: match[2].trim() }
}

function optionWords(option) {
  return option.toLowerCase().match(/[a-z]+/g)?.filter((word) => word.length > 2 && !['the', 'and', 'with'].includes(word)) ?? []
}

function factorSide(factor, options, index) {
  const text = factor.text.toLowerCase()
  const leftHits = optionWords(options.left).filter((word) => text.includes(word)).length
  const rightHits = optionWords(options.right).filter((word) => text.includes(word)).length
  if (leftHits !== rightHits) return leftHits > rightHits ? 'left' : 'right'
  // The agent schema has no side field, so unmatched considerations alternate without asserting a preference.
  return index % 2 === 0 ? 'left' : 'right'
}

function starLabel(text) {
  const label = text.split(' ').slice(0, 4).join(' ')
  return label.length > 31 ? `${label.slice(0, 30)}...` : label
}

export default function Scales({ spiral }) {
  const [nodes, setNodes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    listFragments(spiral.id)
      .then((fragments) => setNodes(fragments.filter((fragment) => fragment.kind)))
      .catch((error) => console.error('Unable to load deliberation factors.', error))
      .finally(() => setIsLoading(false))
  }, [spiral.id])

  const trigger = nodes.find((node) => node.kind === 'trigger')
  const options = useMemo(() => optionNames(trigger?.text), [trigger?.text])
  const factors = useMemo(() => nodes.filter((node) => node.kind === 'fear').map((node, index) => ({ ...node, side: factorSide(node, options, index) })), [nodes, options])
  const lifted = factors.find((factor) => factor.status === fragmentStatuses.lifted)
  const weighed = factors.filter((factor) => factor.status === fragmentStatuses.settled)
  const releasedCount = factors.filter((factor) => factor.status === fragmentStatuses.released).length
  const isComplete = factors.length > 0 && factors.every((factor) => resolved.has(factor.status))
  const leftWeight = weighed.filter((factor) => factor.side === 'left').length
  const rightWeight = weighed.filter((factor) => factor.side === 'right').length
  const tilt = Math.max(-10, Math.min(10, (rightWeight - leftWeight) * 3.5))

  async function transition(factor, nextStatus) {
    if (isTransitioning) return
    setIsTransitioning(true)
    try {
      const updated = await transitionFragmentStatus(factor.id, nextStatus)
      const nextNodes = nodes.map((node) => node.id === updated.id ? updated : node)
      setNodes(nextNodes)
      const nextFactors = nextNodes.filter((node) => node.kind === 'fear')
      if (nextFactors.length && nextFactors.every((node) => resolved.has(node.status))) {
        // The trigger is the decision fulcrum, so it remains untouched while its factors resolve.
        await updateSpiral(spiral.id, { state: 'settled' })
      }
    } catch (error) {
      console.error('Unable to update deliberation factor.', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  async function lift(factor) {
    if (isTransitioning || lifted?.id === factor.id || factor.status !== fragmentStatuses.swirling) return
    setIsTransitioning(true)
    try {
      let nextNodes = nodes
      if (lifted) {
        const putBack = await transitionFragmentStatus(lifted.id, fragmentStatuses.swirling)
        nextNodes = nextNodes.map((node) => node.id === putBack.id ? putBack : node)
      }
      const newlyLifted = await transitionFragmentStatus(factor.id, fragmentStatuses.lifted)
      nextNodes = nextNodes.map((node) => node.id === newlyLifted.id ? newlyLifted : node)
      setNodes(nextNodes)
    } catch (error) {
      console.error('Unable to lift deliberation factor.', error)
    } finally {
      setIsTransitioning(false)
    }
  }

  function renderConstellation(side) {
    const sideFactors = factors.filter((factor) => factor.side === side && [fragmentStatuses.swirling, fragmentStatuses.settled].includes(factor.status))
    return <section className={`scale-constellation constellation-${side}`} aria-label={`${options[side]} considerations`}><p>{options[side]}</p>{sideFactors.map((factor) => <button className={`scale-star ${factor.status === fragmentStatuses.settled ? 'star-weighed' : ''}`} key={factor.id} type="button" onClick={() => lift(factor)} disabled={factor.status !== fragmentStatuses.swirling || isTransitioning} aria-label={factor.status === fragmentStatuses.settled ? `${factor.text}, weighed` : `Examine: ${factor.text}`}><i aria-hidden="true">✦</i><span>{starLabel(factor.text)}</span>{factor.returnCount >= 1 && <b>returned ×{factor.returnCount}</b>}</button>)}</section>
  }

  return (
    <main className="page scales-page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>deliberation · weigh what matters</span></header>
        <section className="scales-stage">
          <span className="chip scales-chip">DIAGNOSIS · DELIBERATION</span>
          <h1>{spiral.title}</h1>
          {spiral.engineFallback && <p className="engine-banner">Couldn't reach the engine — showing an example instead.</p>}
          {spiral.demoEngine && <a className="demo-engine-chip" href="#/connect">demo example — connect the engine to map your own words</a>}
          {spiral.shift && <p className="map-shift">{spiral.shift}</p>}
          <p className="subtle">There is no verdict here. Place each consideration where it belongs, then see what remains.</p>
          <EraseSpiral spiralId={spiral.id} />

          {isLoading ? <p className="subtle">Gathering the considerations...</p> : <>
            <div className={`scales-board ${isComplete ? 'scales-complete' : ''}`} style={{ '--beam-tilt': `${tilt}deg` }}>
              {renderConstellation('left')}
              {renderConstellation('right')}
              <div className="unknown-stars" aria-hidden="true"><i>☆</i><i>☆</i><i>☆</i></div>
              <div className="scale-beam"><i /><span className="scale-fulcrum"><small>THE DECISION</small><strong>{trigger?.text ?? spiral.title}</strong></span></div>
            </div>

            {!lifted && !isComplete && <p className="scales-hint">TAP A STAR TO EXAMINE IT · {factors.filter((factor) => factor.status === fragmentStatuses.swirling).length} REMAINING</p>}
            {lifted && <article className="scales-examination">
              {lifted.pattern && <span className="scales-pattern">{lifted.pattern}</span>}
              <p className="scales-examination-text">{lifted.text}</p>
              <p className="scales-examination-note">{lifted.evidence}</p>
              <div className="scales-actions"><button className="button weigh-button" type="button" onClick={() => transition(lifted, fragmentStatuses.settled)} disabled={isTransitioning}>Weigh with {options[lifted.side]}</button><button className="button noise-button" type="button" onClick={() => transition(lifted, fragmentStatuses.released)} disabled={isTransitioning}>Release as noise</button></div>
              <button className="scales-put-back" type="button" onClick={() => transition(lifted, fragmentStatuses.swirling)} disabled={isTransitioning}>Put it back for now</button>
            </article>}
            {!isComplete && (weighed.length > 0 || releasedCount > 0) && <p className="scales-tally"><span>{weighed.length} weighed</span><span>{releasedCount} released as noise</span></p>}
            {isComplete && <><section className="scales-finished"><p><span>{weighed.length} weighed</span><span>{releasedCount} released as noise</span></p><h2>The weights can rest here.</h2></section>{spiral.closingText && <section className="scales-anchor"><p>THE SMALLEST THING TO FIND OUT FIRST</p><strong>{spiral.closingText}</strong></section>}</>}
          </>}
          <a className="button ghost scales-new" href={`#/new/${spiral.id}`}>Pour in another</a>
          <EntrySediment spiralId={spiral.id} />
        </section>
      </div>
    </main>
  )
}
