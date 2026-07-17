import diagnosisRubric from '../../agent/diagnosis-rubric.md?raw'
import outputSchemas from '../../agent/output-schemas.md?raw'
import toneConstitution from '../../agent/tone-constitution.md?raw'

export const systemContext = [diagnosisRubric, outputSchemas, toneConstitution].join('\n\n')

export function buildAgentInput(operation, payload, retry = false) {
  const correction = retry
    ? '\nYour last output was invalid JSON. Respond with ONLY the JSON object.'
    : ''
  return `Operation: ${operation}\nPayload: ${JSON.stringify(payload)}\nUse the output schema for this operation.${correction}`
}
