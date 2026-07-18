import { useState } from 'react'
import { deleteSpiral } from '../db/spirals'

export default function EraseSpiral({ spiralId }) {
  const [confirming, setConfirming] = useState(false)
  const [isErasing, setIsErasing] = useState(false)

  async function erase() {
    setIsErasing(true)
    try {
      await deleteSpiral(spiralId)
      window.location.hash = '#/'
    } catch (error) {
      console.error('Unable to erase spiral.', error)
      setIsErasing(false)
    }
  }

  if (!confirming) return <button className="erase-action" type="button" onClick={() => setConfirming(true)}>Erase this spiral</button>

  return <span className="erase-confirm"><span>Erase this spiral and everything in it?</span><button type="button" onClick={erase} disabled={isErasing}>{isErasing ? 'Erasing…' : 'Erase it'}</button><button type="button" onClick={() => setConfirming(false)} disabled={isErasing}>Keep it</button></span>
}
