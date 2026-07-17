import { db } from './db'
import { createId, now } from './ids'

export async function createEntry({ spiralId, rawText, source }) {
  const createdAt = now()
  const entry = { id: createId(), spiralId, rawText, source, createdAt }
  await db.transaction('rw', db.entries, db.spirals, async () => {
    if (!await db.spirals.get(spiralId)) throw new Error('Cannot add an entry to a missing spiral.')
    await db.entries.add(entry)
    await db.spirals.update(spiralId, { updatedAt: createdAt })
  })
  return entry
}

export function getEntry(id) {
  return db.entries.get(id)
}

export function listEntries(spiralId) {
  return db.entries.where('spiralId').equals(spiralId).sortBy('createdAt')
}

export async function updateEntry(id, changes) {
  return db.transaction('rw', db.entries, db.spirals, async () => {
    const entry = await db.entries.get(id)
    if (!entry) return undefined
    await db.entries.update(id, changes)
    await db.spirals.update(entry.spiralId, { updatedAt: now() })
    return db.entries.get(id)
  })
}

export async function deleteEntry(id) {
  await db.transaction('rw', db.entries, db.fragments, db.spirals, async () => {
    const entry = await db.entries.get(id)
    if (!entry) return
    await db.fragments.filter((fragment) => fragment.entryId === id).delete()
    await db.entries.delete(id)
    await db.spirals.update(entry.spiralId, { updatedAt: now() })
  })
}
