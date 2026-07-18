import { demoAgentFallback } from '../demo/agentFallbacks'
import { buildAgentInput, systemContext } from './prompts'
import { hasSafetySignal, safetyResponse } from './safety'

const endpoint = 'https://api.openai.com/v1/responses'

function apiKey() {
  return import.meta.env.VITE_OPENAI_API_KEY || window.localStorage.getItem('untangle.apiKey') || ''
}

function stripFences(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function outputText(response) {
  if (response.output_text) return response.output_text
  return (response.output ?? []).flatMap((item) => item.content ?? [])
    .filter((content) => content.type === 'output_text' || content.type === 'text')
    .map((content) => content.text).join('\n')
}

async function request(input, key) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-5.6-luna', reasoning: { effort: 'high' }, instructions: systemContext, input }),
  })
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status}).`)
  return outputText(await response.json())
}

function demoFallback(operation, payload, didFail = false) {
  const result = demoAgentFallback(operation, payload)
  if (didFail) Object.defineProperty(result, '__untangleFallback', { value: true, enumerable: false })
  return result
}

export async function callAgent(operation, payload) {
  if (hasSafetySignal(payload?.rawText)) return safetyResponse()
  try {
    const key = apiKey().trim()
    if (!key) return demoFallback(operation, payload)
    return JSON.parse(stripFences(await request(buildAgentInput(operation, payload), key)))
  } catch (firstError) {
    try {
      const key = apiKey().trim()
      if (!key) return demoFallback(operation, payload)
      return JSON.parse(stripFences(await request(buildAgentInput(operation, payload, true), key)))
    } catch (secondError) {
      console.error('Untangle agent failed; using demo fallback.', secondError, firstError)
      return demoFallback(operation, payload, true)
    }
  }
}
