import { useEffect, useState } from 'react'
import { listEntries } from '../db/entries'
import './EntrySediment.css'

function entryDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
}

function VoiceIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Zm-5 7a5 5 0 0 0 10 0m-5 5v4m-3 0h6" /></svg>
}

export default function EntrySediment({ spiralId }) {
  const [entries, setEntries] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
    listEntries(spiralId)
      .then(setEntries)
      .catch((error) => console.error('Unable to load original entries.', error))
  }, [spiralId])

  if (!entries.length) return null

  return (
    <section className="entry-sediment">
      <button className="entry-sediment-toggle subtle" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>What you poured in · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}</button>
      {isOpen && <div className="entry-sediment-list">{entries.map((entry) => <article className="entry-sediment-item" key={entry.id}><p className="entry-sediment-meta"><time dateTime={new Date(entry.createdAt).toISOString()}>{entryDate(entry.createdAt)}</time>{entry.source === 'voice' && <span className="entry-sediment-source"><VoiceIcon />voice note</span>}</p><blockquote className="entry-preview">{entry.rawText}</blockquote></article>)}</div>}
    </section>
  )
}
