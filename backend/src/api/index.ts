import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from '../config/index.js'
import { userRoutes }     from './routes/user.js'
import { vaultRoutes }    from './routes/vault.js'
import { proposalRoutes } from './routes/proposals.js'

async function startApi() {
  const app = Fastify({ logger: { level: 'warn' } })

  await app.register(cors, { origin: true })

  // Health check
  app.get('/health', async () => ({
    status:  'ok',
    network: env.NETWORK,
    time:    new Date().toISOString(),
  }))

  // Routes
  await app.register(userRoutes)
  await app.register(vaultRoutes)
  await app.register(proposalRoutes)

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' })
  console.log(`🚀 API FinBank démarrée sur http://localhost:${env.API_PORT}`)
  console.log(`   GET /health`)
  console.log(`   GET /vault`)
  console.log(`   GET /vault/history`)
  console.log(`   GET /user/:address`)
  console.log(`   GET /user/:address/history`)
  console.log(`   GET /user/:address/votes`)
  console.log(`   GET /proposals`)
  console.log(`   GET /proposals/:id`)
}

startApi().catch(console.error)
