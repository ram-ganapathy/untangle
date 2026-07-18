export const safetyResult = Object.freeze({
  safety: true,
  message: 'This sounds heavier than something to map. You deserve a person right now, not a diagram.',
  action: 'show_resources',
})

const safetySignals = [
  /\b(suicide|suicidal|self[- ]?harm|overdose)\b/i,
  /\b(kill|killing|end|take)\s+(myself|my life)\b/i,
  /\b(don't|do not)\s+(want to|want)\s+(live|be here)\b/i,
  /\b(cut|hurt)\s+myself\b/i,
  /\b(kill|hurt|shoot|stab)\s+(him|her|them|someone|everybody)\b/i,
  /\bI am in (an )?acute crisis\b/i,
]

export function hasSafetySignal(text) {
  return typeof text === 'string' && safetySignals.some((signal) => signal.test(text))
}

export function safetyResponse() {
  return { ...safetyResult }
}
