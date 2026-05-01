// POST /api/monerium/order
// Crée un ordre de paiement Monerium : EURe → virement SEPA vers un IBAN.
// L'utilisateur signe le message d'ordre côté client, le token est envoyé en corps de requête.

import { NextRequest, NextResponse } from 'next/server'

const MONERIUM_API     = process.env.MONERIUM_API_URL      ?? 'https://api.monerium.dev'
const MONERIUM_CHAIN   = process.env.MONERIUM_CHAIN        ?? 'base'
const MONERIUM_NETWORK = process.env.MONERIUM_NETWORK      ?? 'sepolia'

export async function POST(req: NextRequest) {
  try {
    const {
      access_token,
      address,
      signature,
      message,
      amount,
      iban,
      beneficiaryName,
      country,
    } = await req.json()

    if (!access_token || !address || !signature || !message || !amount || !iban) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const orderRes = await fetch(`${MONERIUM_API}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        kind:      'redeem',
        amount,
        signature,
        address,
        chain:     MONERIUM_CHAIN,
        network:   MONERIUM_NETWORK,
        counterpart: {
          kind: 'iban',
          identifier: {
            standard: 'iban',
            iban,
          },
          details: {
            name:    beneficiaryName || 'Bénéficiaire',
            country: country        || 'FR',
          },
        },
        message,
      }),
    })

    if (!orderRes.ok) {
      const err = await orderRes.text()
      console.error('[monerium/order]', err)
      return NextResponse.json({ error: 'Order creation failed', detail: err }, { status: orderRes.status })
    }

    const order = await orderRes.json()
    return NextResponse.json({ order })
  } catch (err) {
    console.error('[monerium/order]', err)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}
