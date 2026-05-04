const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function foundryId(length = 16): string {
  const bytes = new Uint8Array(length)
  const random = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto)
  if (random) {
    random(bytes)
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
  }
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}
