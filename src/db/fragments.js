import { db } from './db'
import { fragmentStatuses, returnFragment as reviveFragment, transitionFragment } from './fragmentLifecycle'
import { createId, now } from './ids'

const nullableFields = ['entryId', 'layer', 'kind', 'probability', 'evidence', 'pattern', 'note']

function makeFragment(values) {
  const createdAt = now()
  return {
    id: createId(),
    ...Object.fromEntries(nullableFields.map((field) => [field, null])),
    ...values,
    status: fragmentStatuses.swirling,
    returnCount: 0,
    createdAt,
    resolvedAt: null,
  }
}

export async function createFragment(values) {
  const fragment = makeFragment(values)
  await db.transaction('rw', db.fragments, db.spirals, async () => {
    if (!await db.spirals.get(fragment.spiralId)) throw new Error('Cannot add a fragment to a missing spiral.')
    await db.fragments.add(fragment)
    await db.spirals.update(fragment.spiralId, { updatedAt: fragment.createdAt })
  })
  return fragment
}

export async function createFragments(values) {
  const fragments = values.map(makeFragment)
  const spiralId = fragments[0]?.spiralId
  if (!spiralId || fragments.some((fragment) => fragment.spiralId !== spiralId)) {
    throw new Error('Fragments must belong to one spiral.')
  }

  await db.transaction('rw', db.fragments, db.spirals, async () => {
    if (!await db.spirals.get(spiralId)) throw new Error('Cannot add fragments to a missing spiral.')
    await db.fragments.bulkAdd(fragments)
    await db.spirals.update(spiralId, { updatedAt: now() })
  })
  return fragments
}

export function getFragment(id) {
  return db.fragments.get(id)
}

export function listFragments(spiralId) {
  return db.fragments.where('spiralId').equals(spiralId).sortBy('createdAt')
}

export function listAllFragments() {
  return db.fragments.toArray()
}

export async function updateFragment(id, changes) {
  return db.transaction('rw', db.fragments, db.spirals, async () => {
    const fragment = await db.fragments.get(id)
    if (!fragment) return undefined
    await db.fragments.update(id, changes)
    await db.spirals.update(fragment.spiralId, { updatedAt: now() })
    return db.fragments.get(id)
  })
}

export async function deleteFragment(id) {
  await db.transaction('rw', db.fragments, db.spirals, async () => {
    const fragment = await db.fragments.get(id)
    if (!fragment) return
    await db.fragments.delete(id)
    await db.spirals.update(fragment.spiralId, { updatedAt: now() })
  })
}

export async function transitionFragmentStatus(id, nextStatus) {
  return db.transaction('rw', db.fragments, db.spirals, async () => {
    const fragment = await db.fragments.get(id)
    if (!fragment) throw new Error('Cannot transition a missing fragment.')

    const updated = transitionFragment(fragment, nextStatus, now())
    await db.fragments.put(updated)
    await db.spirals.update(fragment.spiralId, { updatedAt: now() })
    return updated
  })
}

export async function returnFragment(id) {
  return db.transaction('rw', db.fragments, db.spirals, async () => {
    const fragment = await db.fragments.get(id)
    if (!fragment) throw new Error('Cannot return a missing fragment.')
    const returned = reviveFragment(fragment)
    await db.fragments.put(returned)
    await db.spirals.update(fragment.spiralId, { updatedAt: now() })
    return returned
  })
}
