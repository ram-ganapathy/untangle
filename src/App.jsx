import { useEffect, useState } from 'react'
import Home from './screens/Home'
import NewSpiral from './screens/NewSpiral'
import SpiralView from './screens/SpiralView'
import { db } from './db/db'

const routes = {
  '#/new': NewSpiral,
  '#/spiral': SpiralView,
}

export default function App() {
  const [path, setPath] = useState(window.location.hash || '#/')

  useEffect(() => {
    const onHashChange = () => setPath(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    // Open on startup so the Untangle tables exist before any spiral is created.
    db.open().catch((error) => console.error('Unable to open Untangle storage.', error))
  }, [])

  const Screen = routes[path] || Home
  return <Screen />
}
