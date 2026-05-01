// POST /api/monerium/token
// Échange le code OAuth contre un access_token via PKCE (pas de client_secret).
// Monerium utilise PKCE pour les applications OAuth publiques.

import { NextRequest, NextResponse } from 'next/server'

const MONERIUM_API = process.env.MONERIUM_API_URL ?? 'https://api.monerium.dev'

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri, codeVerifier } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }
    if (!codeVerifier || typeof codeVerifier !== 'string') {
      return NextResponse.json({ error: 'Missing code_verifier' }, { status: 400 })
    }

    const clientId = process.env.MONERIUM_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    // Échanger le code + code_verifier contre un access_token (PKCE, pas de client_secret)
    const tokenRes = await fetch(`${MONERIUM_API}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[monerium/token]', err)
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 401 })
    }

    const { access_token } = await tokenRes.json()

    // Récupérer le profil (IBAN + comptes)
    const profileRes = await fetch(`${MONERIUM_API}/api/profile`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Profile fetch failed' }, { status: 502 })
    }

    const profile = await profileRes.json()

    return NextResponse.json({ profile, access_token })
  } catch (err) {
    console.error('[monerium/token]', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
