import { useEffect, useState } from 'react'
import { fragmentStatuses } from '../db/fragmentLifecycle'
import { listFragments, transitionFragmentStatus } from '../db/fragments'
import { updateSpiral } from '../db/spirals'
import './Cascade.css'

function temperature(index, total) {
  const progress = total <= 1 ? 0 : index / (total - 1)
  return `hsl(${18 + progress * 192} ${62 - progress * 24}% ${63 - progress * 6}%)`
}

export default function Cascade({ spiral, showDedicatedScreenNote = false }) {
  const [nodes, setNodes] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [isReleasing, setIsReleasing] = useState(false)

  useEffect(() => {
    listFragments(spiral.id)
      .then((fragments) => setNodes(
        fragments
          .filter((fragment) => fragment.kind)
          .sort((left, right) => (right.probability ?? 0) - (left.probability ?? 0)),
      ))
      .catch((error) => console.error('Unable to load cascade fragments.', error))
  }, [spiral.id])

  const fears = nodes.filter((node) => node.kind === 'fear')
  const releasedCount = fears.filter((node) => node.status === fragmentStatuses.released).length
  const allReleased = fears.length > 0 && fears.every((node) => node.status === fragmentStatuses.released)

  async function releaseFear(fear) {
    if (isReleasing || fear.status === fragmentStatuses.released) return
    setIsReleasing(true)
    try {
      // Guard every release through lifted; a resumed lifted fear completes from there.
      let current = fear
      if (current.status === fragmentStatuses.swirling) {
        current = await transitionFragmentStatus(current.id, fragmentStatuses.lifted)
      }
      const released = await transitionFragmentStatus(current.id, fragmentStatuses.released)
      const nextNodes = nodes.map((node) => node.id === released.id ? released : node)
      setNodes(nextNodes)
      setExpanded(null)
      if (nextNodes.filter((node) => node.kind === 'fear').every((node) => node.status === fragmentStatuses.released)) {
        // The trigger remains as-is: it is the real event, not a fear to resolve.
        await updateSpiral(spiral.id, { state: 'settled' })
      }
    } catch (error) {
      console.error('Unable to release cascade fear.', error)
    } finally {
      setIsReleasing(false)
    }
  }

  return (
    <main className="page cascade-page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>see the spiral from outside</span></header>
        <section className="cascade-stage">
          <span className="chip cascade-chip">DIAGNOSIS · {spiral.diagnosis?.toUpperCase()}</span>
          {showDedicatedScreenNote && <span className="coming-label">DEDICATED SCREEN COMING</span>}
          <h1>{spiral.title}</h1>
          {spiral.engineFallback && <p className="engine-banner">Couldn't reach the engine — showing an example instead.</p>}
          {spiral.shift && <p className="map-shift">{spiral.shift}</p>}
          <p className="subtle">The chain gets less likely as it travels away from what is real.</p>

          <div className="cascade-list">
            {nodes.map((node, index) => {
              const color = temperature(index, nodes.length)
              const isTrigger = node.kind === 'trigger'
              const isReleased = node.status === fragmentStatuses.released
              const isExpanded = expanded === node.id
              return (
                <div className="cascade-node" key={node.id}>
                  {index > 0 && !isReleased && <div className="cascade-connector"><i />then, you fear…</div>}
                  {isReleased ? <p className="released-line">released · was {node.probability}% likely</p> : (
                    <article className="cascade-card" style={{ '--node-color': color, animationDelay: `${index * .14}s` }} onClick={() => setExpanded(isExpanded ? null : node.id)}>
                      {node.returnCount >= 1 && <span className="cascade-returned">returned ×{node.returnCount}</span>}
                      <div className="cascade-card-top"><div><strong className="cascade-probability">{node.probability < 1 ? node.probability : Math.round(node.probability)}%</strong><span>{isTrigger ? 'REAL' : 'LIKELY'}</span></div><p>{node.text}</p></div>
                      <div className="probability-bar"><i style={{ width: `${Math.max(node.probability, 1.5)}%` }} /></div>
                      {isExpanded && <div className="cascade-evidence"><p>{node.evidence}</p>{!isTrigger && <button type="button" onClick={(event) => { event.stopPropagation(); releaseFear(node) }} disabled={isReleasing}>Release this one</button>}</div>}
                    </article>
                  )}
                </div>
              )
            })}
          </div>

          {releasedCount > 0 && spiral.closingText && <section className="cascade-anchor"><p>WHAT'S ACTUALLY YOURS TO DO</p><strong>{spiral.closingText}</strong></section>}
          {allReleased && <p className="cascade-calm">The chain is down to the one thing that is real.</p>}
          <a className="button ghost cascade-new" href={`#/new/${spiral.id}`}>Pour in another</a>
        </section>
      </div>
    </main>
  )
}
