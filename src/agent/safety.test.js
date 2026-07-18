import assert from 'node:assert/strict'
import test from 'node:test'
import { hasSafetySignal, safetyResponse } from './safety.js'

test('safety rail detects self-harm and harm-to-others signals', () => {
  assert.equal(hasSafetySignal('I keep thinking about killing myself.'), true)
  assert.equal(hasSafetySignal('I want to hurt them tonight.'), true)
  assert.equal(hasSafetySignal('I am worried I will miss Friday’s deadline.'), false)
})

test('safety rail returns the constitution response exactly', () => {
  assert.deepEqual(safetyResponse(), {
    safety: true,
    message: 'This sounds heavier than something to map. You deserve a person right now, not a diagram.',
    action: 'show_resources',
  })
})
