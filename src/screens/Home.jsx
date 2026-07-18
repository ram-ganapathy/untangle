import { useEffect, useState } from 'react'
import { listSpirals } from '../db/spirals'
import { setPasscode } from '../privacy/passcode'

function touchedAt(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
}

export default function Home({ onPasscodeSet }) {
  const [spirals, setSpirals] = useState([])
  const [isSettingLock, setIsSettingLock] = useState(false)
  const [passcode, setPasscodeValue] = useState('')
  const [lockError, setLockError] = useState('')

  useEffect(() => {
    listSpirals().then(setSpirals).catch((error) => console.error('Unable to load spiral library.', error))
  }, [])

  async function lockSpace(event) {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(passcode)) return setLockError('Choose a 4–6 digit passcode.')
    await setPasscode(passcode)
    onPasscodeSet()
    setIsSettingLock(false)
    setPasscodeValue('')
  }

  return (
    <main className="page home-page">
      <div className="shell">
        <header className="brand"><a href="#/">Untangle</a><span>spiral library</span></header>
        <section className="home-hero">
        <p className="eyebrow">YOUR LIBRARY</p>
        {spirals.length === 0 ? <><h1>Nothing is waiting to be sorted.</h1><p className="subtle">Something looping? Pour it in.</p></> : <><h1>Thoughts you have held still.</h1><p className="subtle">Return to any map exactly where you left it.</p></>}
        <a className="button primary" href="#/new">Start a spiral</a>
        {!isSettingLock ? <button className="lock-action" type="button" onClick={() => setIsSettingLock(true)}>Lock this space</button> : <form className="lock-setup" onSubmit={lockSpace}><label htmlFor="new-passcode">Set a 4–6 digit passcode</label><input id="new-passcode" className="passcode-input" inputMode="numeric" autoComplete="new-password" maxLength="6" pattern="[0-9]*" type="password" value={passcode} onChange={(event) => { setPasscodeValue(event.target.value.replace(/\D/g, '')); setLockError('') }} /><button className="button primary" type="submit">Lock this space</button><p className="subtle">There is no passcode reset. Resetting it means clearing Untangle’s local site data, including saved spirals.</p>{lockError && <p className="form-error">{lockError}</p>}</form>}
        </section>
        {spirals.length > 0 && <section className="spiral-library">{spirals.map((spiral) => <a className="spiral-row" href={`#/spiral/${spiral.id}`} key={spiral.id}><span><strong>{spiral.title}</strong><small>{touchedAt(spiral.updatedAt)}</small></span><span className="library-meta"><em>{spiral.diagnosis || 'waiting'}</em><b>{spiral.state}</b></span></a>)}</section>}
      </div>
    </main>
  )
}
