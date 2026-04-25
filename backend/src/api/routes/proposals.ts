import { FastifyInstance } from 'fastify'
import { db } from '../../db/client.js'
import { governor } from '../../blockchain/contracts.js'
import { isAddress } from 'viem'

const PROPOSAL_STATES = [
  'Pending', 'Active', 'Defeated', 'Succeeded', 'Queued', 'Executed', 'Canceled'
] as const

export async function proposalRoutes(app: FastifyInstance) {

  // GET /proposals — liste des propositions
  app.get('/proposals', async (req) => {
    const query = req.query as { state?: string; limit?: string }
    const limit = Math.min(parseInt(query.limit ?? '20'), 100)

    const proposals = await db.proposal.findMany({
      orderBy: { blockNumber: 'desc' },
      take:    limit,
      include: { votes: { select: { voter: true, voteType: true, weight: true } } },
    })

    // Enrichit avec l'état on-chain actuel
    const enriched = await Promise.all(
      proposals.map(async (p) => {
        let onChainState: string
        try {
          const stateIndex = await governor.read.getState([BigInt(p.proposalId)])
          onChainState = PROPOSAL_STATES[stateIndex] ?? 'Unknown'
        } catch {
          onChainState = p.executed ? 'Executed' : p.canceled ? 'Canceled' : 'Unknown'
        }

        return {
          ...p,
          state:       onChainState,
          voteCount:   p.votes.length,
          votes:       undefined, // retiré du listing, disponible dans /proposals/:id
        }
      })
    )

    const filtered = query.state
      ? enriched.filter(p => p.state.toLowerCase() === query.state!.toLowerCase())
      : enriched

    return { proposals: filtered }
  })

  // GET /proposals/:id — détail d'une proposition
  app.get<{ Params: { id: string } }>('/proposals/:id', async (req, reply) => {
    const { id } = req.params

    const proposal = await db.proposal.findUnique({
      where:   { proposalId: id },
      include: { votes: { orderBy: { blockNumber: 'asc' } } },
    })

    if (!proposal) return reply.status(404).send({ error: 'Proposition introuvable' })

    // État on-chain en temps réel
    let state: string
    let quorumVotes: string = '0'
    try {
      const stateIndex = await governor.read.getState([BigInt(id)])
      state = PROPOSAL_STATES[stateIndex] ?? 'Unknown'
      const qv = await governor.read.quorumVotes()
      quorumVotes = qv.toString()
    } catch {
      state = proposal.executed ? 'Executed' : proposal.canceled ? 'Canceled' : 'Unknown'
    }

    const totalVotes = BigInt(proposal.forVotes) + BigInt(proposal.againstVotes) + BigInt(proposal.abstainVotes)

    return {
      ...proposal,
      state,
      quorumVotes,
      totalVotes: totalVotes.toString(),
    }
  })
}
