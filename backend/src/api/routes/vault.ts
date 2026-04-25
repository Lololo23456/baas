import { FastifyInstance } from 'fastify'
import { db } from '../../db/client.js'
import { vault, distributor, veFBK } from '../../blockchain/contracts.js'

const SECONDS_PER_YEAR = 365n * 24n * 3600n

export async function vaultRoutes(app: FastifyInstance) {

  // GET /vault — stats globales du protocole
  app.get('/vault', async () => {
    const [
      totalAssets,
      totalSupply,
      feeBps,
      rewardRate,
      totalDistributed,
      totalLocked,
    ] = await Promise.all([
      vault.read.totalAssets(),
      vault.read.totalSupply(),
      vault.read.feeBps(),
      distributor.read.rewardRate(),
      distributor.read.totalDistributed(),
      veFBK.read.totalLocked(),
    ])

    // APY approximatif : (yield annuel / TVL) * (1 - fee%)
    // Pour l'instant on expose le rewardRate FBK — l'APY EURC dépend des taux Morpho
    const rewardRatePerYear = rewardRate * SECONDS_PER_YEAR

    // Compte les déposants uniques depuis la DB
    const uniqueDepositors = await db.deposit.findMany({
      distinct: ['owner'],
      select:   { owner: true },
    })

    return {
      tvl: {
        assets:      totalAssets.toString(),    // EURC (6 décimales)
        totalShares: totalSupply.toString(),
      },
      fee: {
        bps:         feeBps.toString(),
        percent:     (Number(feeBps) / 100).toFixed(2),
      },
      rewards: {
        rewardRatePerSecond: rewardRate.toString(),
        rewardRatePerYear:   rewardRatePerYear.toString(),
        totalDistributed:    totalDistributed.toString(),
      },
      governance: {
        totalVeFBKLocked: totalLocked.toString(),
      },
      stats: {
        uniqueDepositors: uniqueDepositors.length,
      },
    }
  })

  // GET /vault/history — historique de l'activité du vault
  app.get('/vault/history', async (req) => {
    const query = req.query as { limit?: string }
    const limit = Math.min(parseInt(query.limit ?? '100'), 500)

    const [deposits, withdrawals] = await Promise.all([
      db.deposit.findMany({
        orderBy: { blockNumber: 'desc' },
        take:    limit,
      }),
      db.withdrawal.findMany({
        orderBy: { blockNumber: 'desc' },
        take:    limit,
      }),
    ])

    const history = [
      ...deposits.map(d => ({ type: 'deposit', ...d })),
      ...withdrawals.map(w => ({ type: 'withdrawal', ...w })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)

    return { history }
  })
}
