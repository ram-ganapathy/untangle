const replayFragments = [
  { id: 'demo-f1', text: 'You said the timeline felt too aggressive', layer: 'happened', pattern: null, note: 'Those words were said out loud.' },
  { id: 'demo-f2', text: 'They paused before responding', layer: 'happened', pattern: null, note: 'A pause happened; its meaning is separate.' },
  { id: 'demo-f3', text: 'They think you missed the bigger picture', layer: 'added', pattern: 'mind-reading', note: 'Their thoughts are not directly observable here.' },
  { id: 'demo-f4', text: 'Everyone noticed you stumble', layer: 'added', pattern: 'spotlight effect', note: 'This turns a brief moment into a shared verdict.' },
]

const projectionNodes = [
  { id: 'demo-n1', kind: 'trigger', probability: 100, text: 'You are behind on a deliverable', evidence: 'This is the part that has already happened.' },
  { id: 'demo-n2', kind: 'fear', probability: 55, text: 'Your manager will be unhappy', pattern: 'catastrophising', evidence: 'Possible, but a heads-up often changes what follows.' },
  { id: 'demo-n3', kind: 'fear', probability: 12, text: 'It will damage your review', pattern: 'catastrophising', evidence: 'One delay rarely becomes a review without a wider pattern.' },
  { id: 'demo-n4', kind: 'fear', probability: 2, text: 'You will lose your job', pattern: 'catastrophising', evidence: 'That outcome would require several additional steps.' },
]

const ruminationFragments = [
  { id: 'demo-r1', text: 'You keep asking why you always ruin good friendships', layer: 'added', pattern: 'global label', note: 'A painful pattern question is not proof of a fixed identity.' },
  { id: 'demo-r2', text: 'You did not reply for two days', layer: 'happened', pattern: null, note: 'This is one concrete part of the story that can be checked.' },
  { id: 'demo-r3', text: 'You should have known they needed space', layer: 'added', pattern: 'fortune-telling', note: 'Wanting a different past does not prove you could predict it.' },
  { id: 'demo-r4', text: 'They have not said the friendship is over', layer: 'happened', pattern: null, note: 'The future of the friendship is still not an observable fact.' },
]

const deliberationNodes = [
  { id: 'demo-d1', kind: 'trigger', probability: 100, text: 'You are choosing between the safer offer and the learning role', evidence: 'Both offers are available to you today.' },
  { id: 'demo-d2', kind: 'fear', probability: 54, text: 'The lower-paid role could make money feel tight', pattern: 'fortune-telling', evidence: 'The pay difference is known; the day-to-day impact still needs a budget.' },
  { id: 'demo-d3', kind: 'fear', probability: 36, text: 'The safer offer could leave you under-challenged', pattern: 'fortune-telling', evidence: 'That depends on the actual work and support, not the title alone.' },
  { id: 'demo-d4', kind: 'fear', probability: 18, text: 'Either choice could close every other path', pattern: 'catastrophising', evidence: 'A first role shapes options, but it does not make all later changes impossible.' },
]

export function demoAgentFallback(operation, payload = {}) {
  const diagnosis = payload.diagnosis ?? 'replay'
  switch (operation) {
    case 'diagnose': {
      const rawText = payload.rawText?.toLowerCase() ?? ''
      if (/should i\b[\s\S]*\bor\b/.test(rawText)) {
        return { diagnosis: 'deliberation', confidence: 0.78, headline: 'The choice between two paths', secondary: null }
      }
      if (/why do i always|if only|should have/.test(rawText)) {
        return { diagnosis: 'rumination', confidence: 0.78, headline: 'The loop around the past', secondary: null }
      }
      if (/what if|\bwill\b|going to|fired|\blose\b/.test(rawText)) {
        return { diagnosis: 'projection', confidence: 0.76, headline: 'The feared future chain', secondary: null }
      }
      return { diagnosis: 'replay', confidence: 0.76, headline: 'The Tuesday meeting replay', secondary: null }
    }
    case 'decompose':
      if (diagnosis === 'projection') return { headline: 'The missed deadline spiral', nodes: projectionNodes, anchor: { text: 'Message your manager with a revised date.' } }
      if (diagnosis === 'rumination') return { headline: 'The loop around the past', fragments: ruminationFragments, keep: { text: 'Ask what repair is possible in this friendship today.' } }
      if (diagnosis === 'deliberation') return { headline: 'The choice between two paths', nodes: deliberationNodes, anchor: { text: 'Ask each manager about the first ninety days today.' } }
      return { headline: 'The Tuesday meeting replay', fragments: replayFragments, keep: { text: 'Ask for ten minutes if it still nags tomorrow.' } }
    case 'diff': {
      const existing = payload.fragments ?? []
      const returning = existing.find((fragment) => ['settled', 'released'].includes(fragment.status)) ?? existing[0]
      const projection = existing.some((fragment) => fragment.kind)
      return {
        new_fragments: projection
          ? [{ text: 'Your manager will think this is a pattern', kind: 'fear', probability: 28, pattern: 'catastrophising', evidence: 'This adds another possible step, not a certainty.' }]
          : [
              { text: 'You replayed the pause again this morning', layer: 'happened', pattern: null, note: 'The replay itself is observable in this new entry.' },
              { text: 'The pause proves they were disappointed', layer: 'added', pattern: 'interpretation', note: 'This gives one ambiguous moment a fixed meaning.' },
            ],
        returning: returning ? [{ existingId: returning.id, similarityNote: 'A familiar thread returned in new wording.' }] : [],
        shift: 'The same thread returned with one new turn.',
      }
    }
    case 'pattern_scan': return { patterns: [] }
    default: return { error: `Unknown operation: ${operation}` }
  }
}
