import { useState } from 'react'
import { db } from '../db/db'
import { eraseSavedSpiralsAndPasscode, verifyPasscode } from '../privacy/passcode'

export default function UnlockScreen({ onUnlock, onReset }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [eraseText, setEraseText] = useState('')

  async function unlock(event) {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(passcode)) return setError('Enter your 4–6 digit passcode.')
    if (await verifyPasscode(passcode)) return onUnlock()
    setError('That passcode is not right.')
    setPasscode('')
  }

  async function resetSpace(event) {
    event.preventDefault()
    if (eraseText !== 'ERASE') return setError('Type ERASE to continue.')
    await eraseSavedSpiralsAndPasscode(db)
    onReset()
  }

  return <main className="page lock-page"><div className="shell"><header className="brand"><span>Untangle</span><span>private space</span></header><section className="lock-card"><p className="eyebrow">THIS SPACE IS LOCKED</p><h1>Welcome back.</h1><p className="subtle">Enter your passcode to see your saved spirals.</p><form onSubmit={unlock}><input className="passcode-input" aria-label="Passcode" inputMode="numeric" autoComplete="current-password" maxLength="6" pattern="[0-9]*" type="password" value={passcode} onChange={(event) => { setPasscode(event.target.value.replace(/\D/g, '')); setError('') }} /><button className="button primary" type="submit">Unlock</button></form>{!isResetting ? <button className="forgot-passcode" type="button" onClick={() => { setIsResetting(true); setError('') }}>Forgot your passcode?</button> : <form className="forgot-form" onSubmit={resetSpace}><p className="subtle">This erases every saved spiral from this browser. Type <strong>ERASE</strong> to continue.</p><input className="passcode-input" aria-label="Confirm erase" autoComplete="off" value={eraseText} onChange={(event) => { setEraseText(event.target.value); setError('') }} /><div className="lock-actions"><button className="button primary" type="submit">Erase saved spirals</button><button className="button ghost" type="button" onClick={() => { setIsResetting(false); setEraseText(''); setError('') }}>Cancel</button></div></form>}{error && <p className="form-error">{error}</p>}</section></div></main>
}
