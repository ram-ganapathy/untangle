const keyName = 'untangle.apiKey'

export function hasEngineKey() {
  return Boolean(import.meta.env.VITE_OPENAI_API_KEY || window.localStorage.getItem(keyName))
}

export async function validateEngineKey(key) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (response.status === 401) return { valid: false, message: "That key doesn't work." }
  if (!response.ok) return { valid: false, message: 'Unable to reach the engine. Try again.' }
  return { valid: true }
}

export function saveEngineKey(key) {
  window.localStorage.setItem(keyName, key)
}

export function disconnectEngine() {
  window.localStorage.removeItem(keyName)
}
