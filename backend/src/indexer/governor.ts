import { parseAbiItem } from 'viem'
import { publicClient, getBlockTimestamp } from '../blockchain/client.js'
import { CONTRACTS } from '../config/index.js'
import { db } from '../db/client.js'

const VOTE_TYPE = ['AGAINST', 'FOR', 'ABSTAIN'] as const

export async function indexGovernorEvents(fromBlock: bigint, toBlock: bigint) {
  const [proposed, voted, executed, canceled] = await Promise.all([
    publicClient.getLogs({
      address:   CONTRACTS.governor,
      event:     parseAbiItem('event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address[] targets, uint256[] values, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)'),
      fromBlock, toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.governor,
      event:     parseAbiItem('event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 voteType, uint256 weight)'),
      fromBlock, toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.governor,
      event:     parseAbiItem('event ProposalExecuted(uint256 indexed proposalId)'),
      fromBlock, toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.governor,
      event:     parseAbiItem('event ProposalCanceled(uint256 indexed proposalId)'),
      fromBlock, toBlock,
    }),
  ])

  for (const log of proposed) {
    if (!log.args.proposalId || !log.args.proposer) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.proposal.upsert({
      where:  { proposalId: log.args.proposalId.toString() },
      update: {},
      create: {
        proposalId:  log.args.proposalId.toString(),
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        proposer:    log.args.proposer,
        description: log.args.description ?? '',
        voteStart:   log.args.voteStart?.toString() ?? '0',
        voteEnd:     log.args.voteEnd?.toString() ?? '0',
        targets:     (log.args.targets ?? []) as string[],
        calldatas:   (log.args.calldatas ?? []).map(c => c.toString()),
      },
    })
  }

  for (const log of voted) {
    if (!log.args.voter || !log.args.proposalId || log.args.voteType === undefined) continue
    const voteTypeIndex = log.args.voteType as 0 | 1 | 2
    const voteType = VOTE_TYPE[voteTypeIndex]
    const timestamp = await getBlockTimestamp(log.blockNumber)

    await db.vote.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        proposalId:  log.args.proposalId.toString(),
        voter:       log.args.voter,
        voteType,
        weight:      log.args.weight?.toString() ?? '0',
      },
    })

    // Met à jour les compteurs de votes sur la proposition (String BigInt addition manuelle)
    const weight = BigInt(log.args.weight?.toString() ?? '0')
    const current = await db.proposal.findUnique({
      where:  { proposalId: log.args.proposalId.toString() },
      select: { forVotes: true, againstVotes: true, abstainVotes: true },
    })
    if (current) {
      const updateData = voteType === 'FOR'
        ? { forVotes:     (BigInt(current.forVotes)     + weight).toString() }
        : voteType === 'AGAINST'
          ? { againstVotes: (BigInt(current.againstVotes) + weight).toString() }
          : { abstainVotes: (BigInt(current.abstainVotes) + weight).toString() }
      await db.proposal.update({
        where: { proposalId: log.args.proposalId.toString() },
        data:  updateData,
      }).catch(() => {})
    }
  }

  for (const log of executed) {
    if (!log.args.proposalId) continue
    await db.proposal.update({
      where:  { proposalId: log.args.proposalId.toString() },
      data:   { executed: true },
    }).catch(() => {})
  }

  for (const log of canceled) {
    if (!log.args.proposalId) continue
    await db.proposal.update({
      where:  { proposalId: log.args.proposalId.toString() },
      data:   { canceled: true },
    }).catch(() => {})
  }

  const total = proposed.length + voted.length + executed.length + canceled.length
  if (total > 0) {
    console.log(`  Governor: +${proposed.length} proposals, +${voted.length} votes`)
  }
}
