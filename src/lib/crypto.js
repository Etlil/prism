// End-to-end encryption for journal entries, built on the browser's built-in
// WebCrypto — no library, nothing to keep updated.
//
// The shape is an "envelope":
//
//   journal text  --encrypted by-->  data key (random, never leaves the browser)
//   data key      --wrapped by-->    passphrase key   (PBKDF2 of the passphrase)
//   data key      --wrapped by-->    recovery key     (PBKDF2 of the recovery code)
//
// Only the two wrapped copies of the data key are stored on the server. The
// passphrase and recovery code are never sent anywhere, so the server — and
// anyone reading the database — holds nothing that can open the journal.
//
// NOTE: crypto.subtle only exists in a secure context. localhost counts, so dev
// works; a deployed build must be served over https or none of this runs.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// OWASP's floor for PBKDF2-HMAC-SHA256. High on purpose: it is what makes
// guessing a weak passphrase slow.
const PBKDF2_ITERATIONS = 310000

// Marks a value as ciphertext, so entries written before encryption was turned
// on are still readable instead of coming out as garbage.
const PREFIX = 'enc:v1:'

const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n))

// Turns a human secret (passphrase or recovery code) into an AES key. The salt
// makes the same passphrase derive a different key for every account, so one
// precomputed table can't attack everybody.
async function deriveWrappingKey(secret, salt) {
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, [
    'deriveKey',
  ])

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

// extractable: true because this key has to be wrapped. The unwrapped copies
// handed back by unwrapDataKey are NOT extractable — once it's in memory
// there's no reason for anything to be able to read the raw bytes out again.
export async function generateDataKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function wrapDataKey(dataKey, secret) {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const wrappingKey = await deriveWrappingKey(secret, salt)
  const wrapped = await crypto.subtle.wrapKey('raw', dataKey, wrappingKey, {
    name: 'AES-GCM',
    iv,
  })

  return { salt: toB64(salt), iv: toB64(iv), key: toB64(wrapped) }
}

// Throws if the secret is wrong — AES-GCM authenticates, so a bad passphrase
// fails loudly rather than returning junk. Callers treat the throw as
// "wrong passphrase".
export async function unwrapDataKey({ salt, iv, key }, secret) {
  const wrappingKey = await deriveWrappingKey(secret, fromB64(salt))

  return crypto.subtle.unwrapKey(
    'raw',
    fromB64(key),
    wrappingKey,
    { name: 'AES-GCM', iv: fromB64(iv) },
    { name: 'AES-GCM', length: 256 },
    // Extractable, because the key has to be cached so a page reload doesn't
    // need the password again — the password isn't recoverable from a restored
    // Supabase session.
    true,
    ['encrypt', 'decrypt'],
  )
}

// Used to park the key where a reload can pick it up. The exported bytes never
// go to the server — only into this browser's own storage.
export async function exportKeyB64(key) {
  return toB64(await crypto.subtle.exportKey('raw', key))
}

export async function importKeyB64(text) {
  return crypto.subtle.importKey('raw', fromB64(text), { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export async function encryptText(dataKey, text) {
  // Empty stays empty: encrypting '' would still produce a blob, which makes
  // "has this day been written in?" checks awkward everywhere else.
  if (!text) return text ?? ''

  const iv = randomBytes(12)
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dataKey,
    encoder.encode(text),
  )

  // A fresh iv per message is required by GCM — reusing one with the same key
  // breaks the cipher outright.
  return `${PREFIX}${toB64(iv)}:${toB64(cipher)}`
}

export async function decryptText(dataKey, value) {
  // Written before encryption was switched on — hand it back as-is.
  if (!isEncrypted(value)) return value ?? ''

  // Base64 never contains ':', so splitting on it is safe.
  const [, , ivB64, cipherB64] = value.split(':')

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(ivB64) },
    dataKey,
    fromB64(cipherB64),
  )

  return decoder.decode(plain)
}

// 20 random bytes rendered in a 32-character alphabet — about 100 bits, far
// beyond guessing. I, L, O and U are left out so the code can be copied off a
// screen without 1/I or 0/O confusion.
//
// 256 divides by 32 exactly, so the modulo introduces no bias toward the
// earlier letters.
export function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'
  const code = [...randomBytes(20)].map((b) => alphabet[b % 32]).join('')
  return code.match(/.{1,5}/g).join('-')
}

// Accepts it typed back with or without the dashes, in any case.
export function normalizeRecoveryCode(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}
