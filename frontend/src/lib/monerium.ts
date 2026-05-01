// Types et helpers partagés pour l'intégration Monerium.
// La session est stockée en localStorage (partagé entre onglets et entre popup et fenêtre parente).

export type MoneriumAccount = {
  id: string
  address: string
  chain: string
  network: string
  iban?: string
  bic?: string
  currency: string
}

export type MoneriumProfile = {
  id: string
  accounts?: MoneriumAccount[]
}

export type MoneriumSession = {
  profile: MoneriumProfile
  access_token: string
}

const SESSION_KEY = 'monerium_session'
const STATE_KEY   = 'monerium_oauth_state'

export function getSession(): MoneriumSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveSession(s: MoneriumSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

// State CSRF — stocké en sessionStorage (propre à l'onglet courant)
export function saveOAuthState(state: string): void {
  sessionStorage.setItem(STATE_KEY, state)
}

export function popOAuthState(): string | null {
  const state = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  return state
}

// PKCE — Proof Key for Code Exchange (Monerium n'utilise pas de client_secret)
const VERIFIER_KEY = 'monerium_pkce_verifier'

function base64url(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = base64url(array)

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64url(new Uint8Array(digest))

  return { verifier, challenge }
}

export function savePKCEVerifier(verifier: string): void {
  sessionStorage.setItem(VERIFIER_KEY, verifier)
}

export function popPKCEVerifier(): string | null {
  const v = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  return v
}

// Constantes env (public)
export const MONERIUM_BASE_URL = process.env.NEXT_PUBLIC_MONERIUM_BASE_URL ?? 'https://api.monerium.dev'
export const MONERIUM_CLIENT_ID = process.env.NEXT_PUBLIC_MONERIUM_CLIENT_ID ?? ''
export const MONERIUM_CHAIN   = process.env.NEXT_PUBLIC_MONERIUM_CHAIN   ?? 'base'
export const MONERIUM_NETWORK = process.env.NEXT_PUBLIC_MONERIUM_NETWORK ?? 'sepolia'

export const AUTH_MESSAGE = 'I hereby declare that I am the address owner.'

// Construit le message d'ordre SEPA signable
export function buildOrderMessage(amount: string, iban: string): string {
  return `Send EUR ${amount} to ${iban} at ${new Date().toUTCString()}`
}

// Valide un IBAN basiquement
export function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return /^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/.test(clean) && clean.length >= 15 && clean.length <= 34
}
