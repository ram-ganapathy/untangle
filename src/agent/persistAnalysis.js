import { createFragments } from '../db/fragments'
import { updateSpiral } from '../db/spirals'
import { callAgent } from './callAgent'
import { demoAgentFallback } from '../demo/agentFallbacks'

export function agentFragments(result, spiralId, entryId) {
  const items = result.fragments ?? result.nodes ?? result.new_fragments ?? []
  return items.map(({ text, layer, kind, probability, evidence, pattern, note }) => {
    const fragment = { spiralId, entryId, text }
    if (layer !== undefined) fragment.layer = layer
    if (kind !== undefined) fragment.kind = kind
    if (probability !== undefined) fragment.probability = probability
    if (evidence !== undefined) fragment.evidence = evidence
    if (pattern !== undefined) fragment.pattern = pattern
    if (note !== undefined) fragment.note = note
    return fragment
  })
}

function closingCard(result) {
  if (result.keep?.text) return { closingText: result.keep.text, closingType: 'keep' }
  if (result.anchor?.text) return { closingText: result.anchor.text, closingType: 'anchor' }
  return {}
}

export async function analyzeAndPersistSpiral(spiral, entries) {
  if (!entries.length) throw new Error('Cannot untangle a spiral without an entry.')
  const rawText = entries.map((entry) => entry.rawText).join('\n\n')
  const diagnosisResult = await callAgent('diagnose', { rawText })
  if (diagnosisResult.safety) {
    const updatedSpiral = await updateSpiral(spiral.id, { safety: true, diagnosis: null })
    return { ...diagnosisResult, spiral: updatedSpiral }
  }
  const diagnosis = diagnosisResult.diagnosis ?? 'replay'
  let decomposition = await callAgent('decompose', { rawText, diagnosis })
  if (decomposition.safety) {
    const updatedSpiral = await updateSpiral(spiral.id, { safety: true, diagnosis: null })
    return { ...decomposition, spiral: updatedSpiral }
  }
  const decompositionFailed = Boolean(decomposition.error)
  if (decompositionFailed) {
    console.error('Untangle decomposition returned an error; using demo fallback.', decomposition.error)
    decomposition = demoAgentFallback('decompose', { rawText, diagnosis })
  }
  const updatedSpiral = await updateSpiral(spiral.id, {
    diagnosis,
    title: diagnosisResult.headline || spiral.title,
    state: 'open',
    engineFallback: Boolean(diagnosisResult.__untangleFallback || decomposition.__untangleFallback || decompositionFailed),
    demoEngine: Boolean(diagnosisResult.__untangleDemo || decomposition.__untangleDemo),
    ...closingCard(decomposition),
  })
  // A decomposition of several entries belongs to its latest dump for return-visit diffs.
  const fragments = agentFragments(decomposition, spiral.id, entries.at(-1).id)
  if (fragments.length) await createFragments(fragments)
  return { spiral: updatedSpiral, diagnosis, decomposition }
}
