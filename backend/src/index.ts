// Point d'entrée principal — lance l'indexeur ET l'API dans le même process.
// En production, on peut les séparer (deux services distincts).

import { publicClient } from './blockchain/client.js'
import { db } from './db/client.js'
import { env } from './config/index.js'
import { indexVaultEvents }       from './indexer/vault.js'
import { indexDistributorEvents } from './indexer/distributor.js'
import { indexVeFBKEvents }       from './indexer/veFBK.js'
import { indexGovernorEvents }    from './indexer/governor.js'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { userRoutes }     from './api/routes/user.js'
import { vaultRoutes }    from './api/routes/vault.js'
import { proposalRoutes } from './api/routes/proposals.js'

const CHUNK_SIZE = 2000n

async function getLastIndexedBlock() {
  const state = await db.indexerState.findUnique({ where: { id: 'singleton' } })
  return state ? state.lastBlock : env.START_BLOCK
}

async function saveLastBlock(block: bigint) {
  await db.indexerState.upsert({
    where:  { id: 'singleton' },
    update: { lastBlock: block },
    create: { id: 'singleton', lastBlock: block },
  })
}

async function indexRange(from: bigint, to: bigint) {
  console.log(`📦 Blocs ${from} → ${to}`)
  await Promise.all([
    indexVaultEvents(from, to),
    indexDistributorEvents(from, to),
    indexVeFBKEvents(from, to),
    indexGovernorEvents(from, to),
  ])
  await saveLastBlock(to)
}

async function main() {
  // ── API ───────────────────────────────────────────────────────────────────
  const app = Fastify({ logger: false })

  // Restrict CORS to the frontend domain in production.
  // FRONTEND_URL env var should be set to https://finbank.app (or Vercel URL during dev).
  const corsOrigin = env.FRONTEND_URL ?? true // true = all origins (dev only)
  await app.register(cors, { origin: corsOrigin })
  app.get('/health', async () => ({ status: 'ok', network: env.NETWORK }))
  await app.register(userRoutes)
  await app.register(vaultRoutes)
  await app.register(proposalRoutes)
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' })
  console.log(`🚀 API   → http://localhost:${env.API_PORT}`)

  // ── Indexeur — rattrapage initial ─────────────────────────────────────────
  const lastIndexed  = await getLastIndexedBlock()
  const currentBlock = await publicClient.getBlockNumber()

  if (lastIndexed < currentBlock) {
    console.log(`⏩ Rattrapage ${lastIndexed} → ${currentBlock}`)
    let from = lastIndexed + 1n
    while (from <= currentBlock) {
      const to = from + CHUNK_SIZE - 1n < currentBlock ? from + CHUNK_SIZE - 1n : currentBlock
      await indexRange(from, to)
      from = to + 1n
    }
    console.log('✅ Rattrapage terminé')
  }

  // ── Indexeur — polling temps réel ─────────────────────────────────────────
  console.log(`🔍 Indexeur → polling toutes les ${env.POLL_INTERVAL_MS}ms`)
  while (true) {
    await new Promise(r => setTimeout(r, env.POLL_INTERVAL_MS))
    try {
      const latest = await publicClient.getBlockNumber()
      const last   = await getLastIndexedBlock()
      if (latest > last) await indexRange(last + 1n, latest)
    } catch (err) {
      console.error('❌', err)
    }
  }
}

main().catch(console.error)
