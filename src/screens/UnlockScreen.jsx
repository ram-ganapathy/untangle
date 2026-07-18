import { useState } from 'react'
import { verifyPasscode } from '../privacy/passcode'

export default function UnlockScreen({ onUnlock }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  async function unlock(event) {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(passcode)) return setError('Enter your 4–6 digit passcode.')
    if (await verifyPasscode(passcode)) return onUnlock()
    setError('That passcode is not right.')
    setPasscode('')
  }

  return <main className="page lock-page"><div className="shell"><header className="brand"><span>Untangle</span><span>private space</span></header><section className="lock-card"><p className="eyebrow">THIS SPACE IS LOCKED</p><h1>Welcome back.</h1><p className="subtle">Enter your passcode to see your saved spirals.</p><form onSubmit={unlock}><input className="passcode-input" aria-label="Passcode" inputMode="numeric" autoComplete="current-password" maxLength="6" pattern="[0-9]*" type="password" value={passcode} onChange={(event) => { setPasscode(event.target.value.replace(/\D/g, '')); setError('') }} /><button className="button primary" type="submit">Unlock</button></form>{error && <p className="form-error">{error}</p>}</section></div></main>
}
