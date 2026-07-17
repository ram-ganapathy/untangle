import Dexie from 'dexie'

export const db = new Dexie('untangle')

db.version(1).stores({
  spirals: 'id, updatedAt, state',
  entries: 'id, spiralId, createdAt',
  fragments: 'id, spiralId, status',
})
