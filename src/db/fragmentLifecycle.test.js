import assert from 'node:assert/strict'
import test from 'node:test'
import { canTransitionFragment, fragmentStatuses, returnFragment, transitionFragment } from './fragmentLifecycle.js'

const fragment = { id: 'fragment-1', status: fragmentStatuses.swirling, resolvedAt: null }

test('a fragment moves from swirling to lifted without resolving', () => {
  const lifted = transitionFragment(fragment, fragmentStatuses.lifted, '2026-07-17T00:00:00.000Z')

  assert.equal(lifted.status, fragmentStatuses.lifted)
  assert.equal(lifted.resolvedAt, null)
  assert.equal(fragment.status, fragmentStatuses.swirling)
})

test('a lifted fragment can settle or release and records its resolution time', () => {
  const lifted = transitionFragment(fragment, fragmentStatuses.lifted)
  const timestamp = '2026-07-17T00:00:00.000Z'

  assert.deepEqual(
    transitionFragment(lifted, fragmentStatuses.settled, timestamp),
    { ...lifted, status: fragmentStatuses.settled, resolvedAt: timestamp },
  )
  assert.equal(transitionFragment(lifted, fragmentStatuses.released, timestamp).status, fragmentStatuses.released)
})

test('a lifted fragment can return to swirling without changing its return count', () => {
  const lifted = { ...fragment, status: fragmentStatuses.lifted, returnCount: 3 }
  const swirling = transitionFragment(lifted, fragmentStatuses.swirling)

  assert.deepEqual(swirling, { ...lifted, status: fragmentStatuses.swirling, resolvedAt: null })
})

test('terminal and skipped lifecycle transitions are rejected', () => {
  assert.equal(canTransitionFragment(fragment, fragmentStatuses.settled), false)
  assert.throws(() => transitionFragment(fragment, fragmentStatuses.settled))
  assert.throws(() => transitionFragment({ ...fragment, status: fragmentStatuses.settled }, fragmentStatuses.lifted))
})

test('a resolved fragment can return to play with a cleared resolution and incremented count', () => {
  const returned = returnFragment({
    ...fragment,
    status: fragmentStatuses.released,
    returnCount: 1,
    resolvedAt: '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(returned, {
    ...fragment,
    status: fragmentStatuses.swirling,
    returnCount: 2,
    resolvedAt: null,
  })
  assert.throws(() => returnFragment(fragment))
})
