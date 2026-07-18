import { useEffect, useState } from 'react'
import Home from './screens/Home'
import AgentTest from './screens/AgentTest'
import NewSpiral from './screens/NewSpiral'
import SpiralView from './screens/SpiralView'
import { db } from './db/db'

export default function App() {
  const [path, setPath] = useState(window.location.hash || '#/')

  useEffect(() => {
    const onHashChange = () => setPath(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    db.open().catch((error) => console.error('Unable to open Untangle storage.', error))
  }, [])

  if (path === '#/new') return <NewSpiral />
  if (path.startsWith('#/new/')) return <NewSpiral spiralId={path.slice('#/new/'.length)} />
  if (path === '#/agent-test') return <AgentTest />
  if (path.startsWith('#/spiral/')) return <SpiralView spiralId={path.slice('#/spiral/'.length)} />
  return <Home />
}
