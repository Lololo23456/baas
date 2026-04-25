import { FastifyInstance } from 'fastify'
import { db } from '../../db/client.js'
import { vault, distributor, veFBK } from '../../blockchain/contracts.js'
import { isAddress } from 'viem'

export async function userRoutes(app: FastifyInstance) {

  // GET /user/:address — portefeuille complet
  app.get<{ Params: { address: string } }>('/user/:address', async (req, reply) => {
    const { address } = req.params
    if (!isAddress(address)) return reply.status(400).send({ error: 'Adresse invalide' })

    const addr = address as `0x${string}` // isAddress() garantit le format

    // Lecture on-chain en parallèle (données temps réel)
    const [shares, pendingFBK, veFBKBalance, lockData] = await Promise.all([
      vault.read.balanceOf([addr]),
      distributor.read.earned([addr]),
      veFBK.read.balanceOf([addr]),
      veFBK.read.locked([addr]),
    ])

    // Convertit les shares en EURC
    const assetsEurc = shares > 0n
      ? await vault.read.convertToAssets([shares])
      : 0n

    return {
      address,
      vault: {
        shares:     shares.toString(),
        assetsEurc: assetsEurc.toString(),
      },
      rewards: {
        pendingFBK: pendingFBK.toString(),
      },
      governance: {
        veFBKBalance: veFBKBalance.toString(),
        lock: {
          amount:     lockData[0].toString(),
          unlockTime: lockData[1] > 0n
            ? new Date(Number(lockData[1]) * 1000).toISOString()
            : null,
        },
      },
    }
  })

  // GET /user/:address/history — historique des transactions
  app.get<{ Params: { address: string } }>('/user/:address/history', async (req, reply) => {
    const { address } = req.params
    if (!isAddress(address)) return reply.status(400).send({ error: 'Adresse invalide' })

    const addr = address.toLowerCase()

    const [deposits, withdrawals, claims, locks] = await Promise.all([
      db.deposit.findMany({
        where:   { owner: { equals: addr, mode: 'insensitive' } },
        orderBy: { blockNumber: 'desc' },
        take:    50,
      }),
      db.withdrawal.findMany({
        where:   { owner: { equals: addr, mode: 'insensitive' } },
        orderBy: { blockNumber: 'desc' },
        take:    50,
      }),
      db.claim.findMany({
        where:   { user: { equals: addr, mode: 'insensitive' } },
        orderBy: { blockNumber: 'desc' },
        take:    50,
      }),
      db.lock.findMany({
        where:   { user: { equals: addr, mode: 'insensitive' } },
        orderBy: { blockNumber: 'desc' },
        take:    50,
      }),
    ])

    // Fusionne et trie par timestamp décroissant
    const history = [
      ...deposits.map(d => ({ type: 'deposit',    ...d })),
      ...withdrawals.map(w => ({ type: 'withdrawal', ...w })),
      ...claims.map(c => ({ type: 'claim',       ...c })),
      ...locks.map(l => ({ type: 'lock',         ...l })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return { address, history }
  })

  // GET /user/:address/votes — votes de gouvernance
  app.get<{ Params: { address: string } }>('/user/:address/votes', async (req, reply) => {
    const { address } = req.params
    if (!isAddress(address)) return reply.status(400).send({ error: 'Adresse invalide' })

    const votes = await db.vote.findMany({
      where:   { voter: { equals: address.toLowerCase(), mode: 'insensitive' } },
      include: { proposal: { select: { description: true, proposalId: true } } },
      orderBy: { blockNumber: 'desc' },
    })

    return { address, votes }
  })
}
