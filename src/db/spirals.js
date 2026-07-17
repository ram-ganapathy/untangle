import { db } from './db'
import { createId, now } from './ids'

export async function createSpiral({ title, diagnosis, state = 'open' }) {
  const createdAt = now()
  const spiral = { id: createId(), title, diagnosis, state, createdAt, updatedAt: createdAt }
  await db.spirals.add(spiral)
  return spiral
}

export function getSpiral(id) {
  return db.spirals.get(id)
}

export function listSpirals() {
  return db.spirals.orderBy('updatedAt').reverse().toArray()
}

export async function updateSpiral(id, changes) {
  const updatedAt = now()
  await db.spirals.update(id, { ...changes, updatedAt })
  return db.spirals.get(id)
}

export async function deleteSpiral(id) {
  await db.transaction('rw', db.spirals, db.entries, db.fragments, async () => {
    await db.entries.where('spiralId').equals(id).delete()
    await db.fragments.where('spiralId').equals(id).delete()
    await db.spirals.delete(id)
  })
}
