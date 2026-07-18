import test from 'node:test'
import assert from 'node:assert/strict'
import { demoAgentFallback } from './agentFallbacks.js'

test('demo diagnosis covers rumination and deliberation', () => {
  assert.equal(demoAgentFallback('diagnose', { rawText: 'Why do I always ruin good friendships?' }).diagnosis, 'rumination')
  assert.equal(demoAgentFallback('diagnose', { rawText: 'Should I take the safe role or the learning role?' }).diagnosis, 'deliberation')
})

test('demo decompositions populate both new diagnosis types', () => {
  const rumination = demoAgentFallback('decompose', { diagnosis: 'rumination' })
  const deliberation = demoAgentFallback('decompose', { diagnosis: 'deliberation' })
  assert.ok(rumination.fragments.length >= 4)
  assert.equal(deliberation.nodes[0].kind, 'trigger')
  assert.ok(deliberation.nodes.slice(1).every((node) => node.kind === 'fear' && node.probability && node.evidence))
})
