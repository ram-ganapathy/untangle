import assert from 'node:assert/strict'
import test from 'node:test'
import { canTransitionFragment, fragmentStatuses, transitionFragment } from './fragmentLifecycle.js'

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

test('terminal and skipped lifecycle transitions are rejected', () => {
  assert.equal(canTransitionFragment(fragment, fragmentStatuses.settled), false)
  assert.throws(() => transitionFragment(fragment, fragmentStatuses.settled))
  assert.throws(() => transitionFragment({ ...fragment, status: fragmentStatuses.settled }, fragmentStatuses.lifted))
})
