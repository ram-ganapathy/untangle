import { useState } from 'react'
import { deleteSpiral } from '../db/spirals'

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg>
}

export default function EraseSpiral({ spiralId, onErased }) {
  const [confirming, setConfirming] = useState(false)
  const [isErasing, setIsErasing] = useState(false)

  async function erase() {
    setIsErasing(true)
    try {
      await deleteSpiral(spiralId)
      if (onErased) onErased(spiralId)
      else window.location.hash = '#/'
    } catch (error) {
      console.error('Unable to erase spiral.', error)
      setIsErasing(false)
    }
  }

  if (!confirming) return <button className="privacy-icon-button erase-action" type="button" onClick={() => setConfirming(true)} aria-label="Erase this spiral" title="Erase this spiral"><TrashIcon /></button>

  return <span className="erase-confirm"><span>Erase this spiral and everything in it?</span><button type="button" onClick={erase} disabled={isErasing}>{isErasing ? 'Erasing…' : 'Erase it'}</button><button type="button" onClick={() => setConfirming(false)} disabled={isErasing}>Keep it</button></span>
}
