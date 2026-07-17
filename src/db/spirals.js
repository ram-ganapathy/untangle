import { db } from './db'
import { createId, now } from './ids'

export async function createSpiral({ title, diagnosis, state = 'open' }) {
  const createdAt = now()
  const spiral = { id: createId(), title, diagnosis, state, createdAt, updatedAt: createdAt }
  await db.spirals.add(spiral)
  return spiral
}

export async function createSpiralWithEntry({ spiral: spiralValues, entry: entryValues }) {
  const createdAt = now()
  const spiral = {
    id: createId(),
    ...spiralValues,
    state: spiralValues.state ?? 'open',
    createdAt,
    updatedAt: createdAt,
  }
  const entry = { id: createId(), ...entryValues, spiralId: spiral.id, createdAt }

  await db.transaction('rw', db.spirals, db.entries, async () => {
    await db.spirals.add(spiral)
    await db.entries.add(entry)
  })
  return { spiral, entry }
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
