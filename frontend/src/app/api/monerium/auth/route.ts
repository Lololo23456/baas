// POST /api/monerium/auth
// Authentifie un wallet via signature (sans OAuth redirect).
// Échange une signature de wallet contre un access_token + profil Monerium.

import { NextRequest, NextResponse } from 'next/server'

const MONERIUM_API   = process.env.MONERIUM_API_URL   ?? 'https://api.monerium.dev'
const GRANT_TYPE     = 'urn:monerium:params:oauth:grant-type:wallet-sign'
const AUTH_MESSAGE   = 'I hereby declare that I am the address owner.'

export async function POST(req: NextRequest) {
  try {
    const { address, signature } = await req.json()

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 })
    }
    if (!signature || typeof signature !== 'string') {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    const clientId = process.env.MONERIUM_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const tokenRes = await fetch(`${MONERIUM_API}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: GRANT_TYPE,
        client_id:  clientId,
        address,
        signature,
        message:    AUTH_MESSAGE,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[monerium/auth] token error:', err)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const { access_token } = await tokenRes.json()

    const profileRes = await fetch(`${MONERIUM_API}/api/profile`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileRes.ok) {
      console.error('[monerium/auth] profile error:', await profileRes.text())
      return NextResponse.json({ error: 'Profile fetch failed' }, { status: 502 })
    }

    const profile = await profileRes.json()

    return NextResponse.json({ access_token, profile })
  } catch (err) {
    console.error('[monerium/auth]', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
