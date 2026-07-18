const storageKey = 'untangle.passcode'

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

async function digest(passcode, salt) {
  const value = new TextEncoder().encode(`${salt}:${passcode}`)
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', value)))
}

export function hasPasscode() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey))
    return Boolean(saved?.salt && saved?.hash)
  } catch {
    return false
  }
}

export async function setPasscode(passcode) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)))
  const hash = await digest(passcode, salt)
  window.localStorage.setItem(storageKey, JSON.stringify({ salt, hash }))
}

export async function verifyPasscode(passcode) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey))
    return Boolean(saved?.salt && saved.hash && (await digest(passcode, saved.salt)) === saved.hash)
  } catch {
    return false
  }
}
