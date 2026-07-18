import { useEffect, useState } from 'react'
import Home from './screens/Home'
import AgentTest from './screens/AgentTest'
import CareScreen from './screens/CareScreen'
import NewSpiral from './screens/NewSpiral'
import SpiralView from './screens/SpiralView'
import { db } from './db/db'
import { hasPasscode } from './privacy/passcode'
import UnlockScreen from './screens/UnlockScreen'

export default function App() {
  const [path, setPath] = useState(window.location.hash || '#/')
  const [isLocked, setIsLocked] = useState(() => hasPasscode())

  useEffect(() => {
    const onHashChange = () => setPath(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    db.open().catch((error) => console.error('Unable to open Untangle storage.', error))
  }, [])

  if (isLocked) return <UnlockScreen onUnlock={() => setIsLocked(false)} />
  if (path === '#/new') return <NewSpiral />
  if (path.startsWith('#/new/')) return <NewSpiral spiralId={path.slice('#/new/'.length)} />
  if (path === '#/agent-test') return <AgentTest />
  if (path.startsWith('#/care/')) return <CareScreen />
  if (path.startsWith('#/spiral/')) return <SpiralView spiralId={path.slice('#/spiral/'.length)} />
  return <Home onPasscodeSet={() => setIsLocked(false)} />
}
