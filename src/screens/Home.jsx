import { useEffect, useState } from 'react'
import { disconnectEngine, hasEngineKey, saveEngineKey, validateEngineKey } from '../agent/engine'
import { listSpirals } from '../db/spirals'
import { removePasscode, setPasscode, verifyPasscode } from '../privacy/passcode'

function touchedAt(timestamp) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp))
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5zM12 14v2" /></svg>
}

function EngineIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8M9 3v4m6-4v4M7 9h10v9H7zM10 13h4M5 13H3m18 0h-2M8 18v3m8-3v3" /></svg>
}

function PlugIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v6m8-6v6M6 9h12v3a6 6 0 0 1-6 6v3m0 0h-3m3 0h3" /></svg>
}

function UnplugIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M8 3v6m8-6v3M6 9h8v3a6 6 0 0 1-2 4.6M12 21h-3m3 0h3" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
}

function MemoryVial({ diagnosis, state }) {
  const kind = ['replay', 'projection', 'rumination', 'deliberation'].includes(diagnosis) ? diagnosis : 'waiting'
  return <span className={`memory-vial vial-${kind} ${state === 'settled' ? 'vial-settled' : 'vial-open'}`} aria-hidden="true"><span className="vial-cork" /><span className="vial-glass"><span className="vial-content"><i /><i /><i /></span></span></span>
}

export default function Home({ hasLocalPasscode, onPasscodeSet, onPasscodeRemoved, openEngine }) {
  const [spirals, setSpirals] = useState([])
  const [lockMode, setLockMode] = useState(null)
  const [currentPasscode, setCurrentPasscode] = useState('')
  const [nextPasscode, setNextPasscode] = useState('')
  const [lockError, setLockError] = useState('')
  const [engineOpen, setEngineOpen] = useState(openEngine)
  const [engineLive, setEngineLive] = useState(() => hasEngineKey())
  const [engineKey, setEngineKey] = useState('')
  const [engineError, setEngineError] = useState('')
  const [isSavingEngine, setIsSavingEngine] = useState(false)

  useEffect(() => {
    listSpirals().then(setSpirals).catch((error) => console.error('Unable to load spiral library.', error))
  }, [])

  useEffect(() => {
    if (openEngine) setEngineOpen(true)
  }, [openEngine])

  function closeLockDialog() {
    setLockMode(null)
    setCurrentPasscode('')
    setNextPasscode('')
    setLockError('')
  }

  async function saveLock(event) {
    event.preventDefault()
    if (lockMode === 'setup') {
      if (!/^\d{4,6}$/.test(nextPasscode)) return setLockError('Choose a 4–6 digit passcode.')
      await setPasscode(nextPasscode)
      onPasscodeSet()
      return closeLockDialog()
    }
    if (!await verifyPasscode(currentPasscode)) return setLockError('That passcode is not right.')
    if (lockMode === 'change') {
      if (!/^\d{4,6}$/.test(nextPasscode)) return setLockError('Choose a new 4–6 digit passcode.')
      await setPasscode(nextPasscode)
      return closeLockDialog()
    }
    removePasscode()
    onPasscodeRemoved()
    closeLockDialog()
  }

  async function connectEngine(event) {
    event.preventDefault()
    if (!engineKey.trim()) return setEngineError('Paste an API key first.')
    setIsSavingEngine(true)
    setEngineError('')
    try {
      const result = await validateEngineKey(engineKey.trim())
      if (!result.valid) return setEngineError(result.message)
      saveEngineKey(engineKey.trim())
      setEngineLive(true)
      setEngineKey('')
      setEngineOpen(false)
      if (window.location.hash === '#/connect') window.location.hash = '#/'
    } catch (error) {
      console.error('Unable to validate engine key.', error)
      setEngineError('Unable to reach the engine. Try again.')
    } finally {
      setIsSavingEngine(false)
    }
  }

  function disconnect() {
    disconnectEngine()
    setEngineLive(hasEngineKey())
  }

  const lockTitle = lockMode === 'change' ? 'Change passcode' : lockMode === 'remove' ? 'Remove lock' : 'Lock this space'
  return (
    <main className="page home-page">
      <div className="shell">
        <header className="brand home-brand"><span className="brand-mark"><a href="#/">Untangle</a><span>spiral library</span></span><button className="privacy-icon-button lock-action" type="button" onClick={() => setLockMode(hasLocalPasscode ? 'manage' : 'setup')} aria-label={hasLocalPasscode ? 'Passcode settings' : 'Lock this space'} title={hasLocalPasscode ? 'Passcode settings' : 'Lock this space'}><LockIcon /></button></header>
        <section className="home-hero">
          <p className="eyebrow">YOUR LIBRARY</p>
          {spirals.length === 0 ? <><h1>Nothing is waiting to be sorted.</h1><p className="subtle">Something looping? Pour it in.</p></> : <><h1>Thoughts you have held still.</h1><p className="subtle">Return to any map exactly where you left it.</p></>}
          <a className="button primary" href="#/new">Start a spiral</a>
          <button className="engine-status" type="button" onClick={() => setEngineOpen((open) => !open)} aria-expanded={engineOpen}><EngineIcon /><span>engine: {engineLive ? 'live' : 'demo examples'}</span></button>
          {engineOpen && <section className="engine-panel"><div className="engine-panel-header"><div><EngineIcon /><strong>{engineLive ? 'Engine connected' : 'Connect the engine'}</strong></div><button className="privacy-icon-button engine-close" type="button" onClick={() => setEngineOpen(false)} aria-label="Close engine panel" title="Close engine panel"><CloseIcon /></button></div>{engineLive ? <button className="privacy-icon-button engine-action-icon" type="button" onClick={disconnect} aria-label="Disconnect engine" title="Disconnect engine"><UnplugIcon /></button> : <form onSubmit={connectEngine}><label htmlFor="engine-key">OpenAI API key</label><input id="engine-key" className="engine-key-input" type="password" autoComplete="off" value={engineKey} onChange={(event) => { setEngineKey(event.target.value); setEngineError('') }} /><p>Stays in this browser only; sent only to OpenAI.</p><div className="engine-actions"><button className="privacy-icon-button engine-action-icon engine-connect" type="submit" disabled={isSavingEngine} aria-label={isSavingEngine ? 'Checking engine key' : 'Connect engine'} title={isSavingEngine ? 'Checking engine key' : 'Connect engine'}><PlugIcon /></button><button className="privacy-icon-button engine-action-icon" type="button" onClick={() => setEngineOpen(false)} aria-label="Cancel" title="Cancel"><CloseIcon /></button></div>{engineError && <p className="form-error">{engineError}</p>}</form>}</section>}
        </section>
        {spirals.length > 0 && <><section className="memory-shelf" aria-label="Your saved spirals">{spirals.map((spiral) => <article className="memory-vial-card" key={spiral.id}><a className="memory-vial-link" href={`#/spiral/${spiral.id}`} aria-label={`${spiral.title}, ${spiral.diagnosis || 'waiting'}, ${spiral.state}`}><MemoryVial diagnosis={spiral.diagnosis} state={spiral.state} /><span className="memory-vial-label"><strong>{spiral.title}</strong><small>{touchedAt(spiral.updatedAt)}</small></span></a></article>)}</section><a className="look-up-link" href="#/sky">Look up</a></>}
      </div>
      {lockMode && <div className="lock-overlay"><section className="lock-dialog" role="dialog" aria-modal="true" aria-labelledby="lock-dialog-title">{lockMode === 'manage' ? <><p className="eyebrow">PRIVATE SPACE</p><h2 id="lock-dialog-title">Passcode settings</h2><p className="subtle">Your lock is active on this browser.</p><div className="lock-choice-actions"><button className="button primary" type="button" onClick={() => setLockMode('change')}>Change passcode</button><button className="button ghost" type="button" onClick={() => setLockMode('remove')}>Remove lock</button><button className="modal-cancel" type="button" onClick={closeLockDialog}>Cancel</button></div></> : <><p className="eyebrow">PRIVATE SPACE</p><h2 id="lock-dialog-title">{lockTitle}</h2><p className="subtle">{lockMode === 'remove' ? 'Enter your current passcode to remove the lock.' : lockMode === 'change' ? 'Enter your current code, then choose a new one.' : 'Choose a 4–6 digit passcode for this browser.'}</p><form className="lock-setup" onSubmit={saveLock}>{lockMode !== 'setup' && <><label htmlFor="current-passcode">Current passcode</label><input id="current-passcode" className="passcode-input" inputMode="numeric" autoComplete="current-password" maxLength="6" type="password" value={currentPasscode} onChange={(event) => { setCurrentPasscode(event.target.value.replace(/\D/g, '')); setLockError('') }} autoFocus /></>}{lockMode !== 'remove' && <><label htmlFor="next-passcode">{lockMode === 'change' ? 'New passcode' : 'Passcode'}</label><input id="next-passcode" className="passcode-input" inputMode="numeric" autoComplete="new-password" maxLength="6" type="password" value={nextPasscode} onChange={(event) => { setNextPasscode(event.target.value.replace(/\D/g, '')); setLockError('') }} autoFocus={lockMode === 'setup'} /></>}<div className="lock-actions"><button className="button primary" type="submit">{lockTitle}</button><button className="button ghost" type="button" onClick={closeLockDialog}>Cancel</button></div>{lockMode === 'setup' && <p className="subtle">Forgotten passcodes can only be reset by erasing saved spirals.</p>}{lockError && <p className="form-error">{lockError}</p>}</form></>}</section></div>}
    </main>
  )
}
