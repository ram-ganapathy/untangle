import { useEffect, useRef, useState } from 'react'
import { listAllFragments } from '../db/fragments'
import { listSpirals } from '../db/spirals'
import './Sky.css'

const regions = {
  replay: [27, 31],
  projection: [73, 27],
  rumination: [31, 72],
  deliberation: [71, 70],
}

function seed(value, salt = 0) {
  let hash = 2166136261 ^ salt
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 100000) / 100000
}

function positionFor(fragment, diagnosis) {
  const [originX, originY] = regions[diagnosis] ?? [50, 50]
  const angle = seed(fragment.id, 17) * Math.PI * 2
  const distance = Math.sqrt(seed(fragment.id, 31)) * 22
  return {
    x: Math.max(5, Math.min(95, originX + Math.cos(angle) * distance)),
    y: Math.max(8, Math.min(92, originY + Math.sin(angle) * distance)),
    delay: `${-(seed(fragment.id, 47) * 7).toFixed(2)}s`,
    duration: `${(5 + seed(fragment.id, 59) * 4).toFixed(2)}s`,
  }
}

function starClasses(fragment) {
  const classes = ['sky-star', `sky-${fragment.status}`]
  if (fragment.status === 'settled' && fragment.layer === 'happened') classes.push('sky-kept')
  if ((fragment.returnCount ?? 0) >= 1) classes.push('sky-returned')
  return classes.join(' ')
}

export default function Sky() {
  const [stars, setStars] = useState([])
  const [whisper, setWhisper] = useState(null)
  const whisperTimer = useRef(null)

  useEffect(() => {
    async function load() {
      const [spirals, fragments] = await Promise.all([listSpirals(), listAllFragments()])
      const diagnosisBySpiral = new Map(spirals.map((spiral) => [spiral.id, spiral.diagnosis]))
      setStars(fragments.map((fragment) => ({ ...fragment, diagnosis: diagnosisBySpiral.get(fragment.spiralId) ?? 'replay' })))
    }
    load().catch((error) => console.error('Unable to load the night sky.', error))
    return () => clearTimeout(whisperTimer.current)
  }, [])

  function reveal(fragment) {
    setWhisper(fragment)
    clearTimeout(whisperTimer.current)
    whisperTimer.current = setTimeout(() => setWhisper(null), 4600)
  }

  return (
    <main className="sky-page">
      <header className="sky-brand"><a href="#/">Untangle</a></header>
      <p className="sky-copy">Every light is a thought you set down.</p>
      <section className="sky-field" aria-label="Your thought sky">
        {stars.map((fragment) => {
          const position = positionFor(fragment, fragment.diagnosis)
          return <button className={starClasses(fragment)} key={fragment.id} type="button" style={{ '--x': `${position.x}%`, '--y': `${position.y}%`, '--delay': position.delay, '--duration': position.duration }} onClick={() => reveal(fragment)} aria-label={`Reveal thought: ${fragment.text}`}><i /></button>
        })}
      </section>
      {whisper && <a className="sky-whisper" key={whisper.id} href={`#/spiral/${whisper.spiralId}`}>{whisper.text}</a>}
    </main>
  )
}
