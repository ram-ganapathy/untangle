import { useEffect, useState } from 'react'
import { listSpirals } from '../db/spirals'
import { setPasscode } from '../privacy/passcode'
import EraseSpiral from './EraseSpiral'

function touchedAt(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5zM12 14v2" /></svg>
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

  function removeSpiral(spiralId) {
    setSpirals((current) => current.filter((spiral) => spiral.id !== spiralId))
  }

  function cancelLock() {
    setIsSettingLock(false)
    setPasscodeValue('')
    setLockError('')
  }

  return (
    <main className="page home-page">
      <div className="shell">
        <header className="brand home-brand"><span className="brand-mark"><a href="#/">Untangle</a><span>spiral library</span></span>{!isSettingLock && <button className="privacy-icon-button lock-action" type="button" onClick={() => setIsSettingLock(true)} aria-label="Lock this space" title="Lock this space"><LockIcon /></button>}</header>
        <section className="home-hero">
        <p className="eyebrow">YOUR LIBRARY</p>
        {spirals.length === 0 ? <><h1>Nothing is waiting to be sorted.</h1><p className="subtle">Something looping? Pour it in.</p></> : <><h1>Thoughts you have held still.</h1><p className="subtle">Return to any map exactly where you left it.</p></>}
        <a className="button primary" href="#/new">Start a spiral</a>
        </section>
        {spirals.length > 0 && <section className="spiral-library">{spirals.map((spiral) => <div className="spiral-row" key={spiral.id}><a className="spiral-row-link" href={`#/spiral/${spiral.id}`}><span><strong>{spiral.title}</strong><small>{touchedAt(spiral.updatedAt)}</small></span><span className="library-meta"><em>{spiral.diagnosis || 'waiting'}</em><b>{spiral.state}</b></span></a><EraseSpiral spiralId={spiral.id} onErased={removeSpiral} /></div>)}</section>}
      </div>
      {isSettingLock && <div className="lock-overlay"><section className="lock-dialog" role="dialog" aria-modal="true" aria-labelledby="lock-dialog-title"><p className="eyebrow">PRIVATE SPACE</p><h2 id="lock-dialog-title">Lock this space</h2><p className="subtle">Choose a 4–6 digit passcode for this browser.</p><form className="lock-setup" onSubmit={lockSpace}><label htmlFor="new-passcode">Passcode</label><input id="new-passcode" className="passcode-input" inputMode="numeric" autoComplete="new-password" maxLength="6" pattern="[0-9]*" type="password" value={passcode} onChange={(event) => { setPasscodeValue(event.target.value.replace(/\D/g, '')); setLockError('') }} autoFocus /><div className="lock-actions"><button className="button primary" type="submit">Lock this space</button><button className="button ghost" type="button" onClick={cancelLock}>Cancel</button></div><p className="subtle">There is no passcode reset. Resetting it means clearing Untangle’s local site data, including saved spirals.</p>{lockError && <p className="form-error">{lockError}</p>}</form></section></div>}
    </main>
  )
}
