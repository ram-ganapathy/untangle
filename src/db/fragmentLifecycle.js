export const fragmentStatuses = Object.freeze({
  swirling: 'swirling',
  lifted: 'lifted',
  settled: 'settled',
  released: 'released',
})

const transitions = Object.freeze({
  [fragmentStatuses.swirling]: [fragmentStatuses.lifted],
  [fragmentStatuses.lifted]: [fragmentStatuses.settled, fragmentStatuses.released],
  [fragmentStatuses.settled]: [],
  [fragmentStatuses.released]: [],
})

export function canTransitionFragment(fragment, nextStatus) {
  return transitions[fragment.status]?.includes(nextStatus) ?? false
}

export function transitionFragment(fragment, nextStatus, resolvedAt) {
  if (!canTransitionFragment(fragment, nextStatus)) {
    throw new Error(`Cannot transition fragment from ${fragment.status} to ${nextStatus}.`)
  }

  return {
    ...fragment,
    status: nextStatus,
    // `lifted` is persisted because every user action in the lifecycle is durable.
    resolvedAt: [fragmentStatuses.settled, fragmentStatuses.released].includes(nextStatus)
      ? resolvedAt
      : null,
  }
}
