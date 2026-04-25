import { parseAbiItem } from 'viem'
import { publicClient, getBlockTimestamp } from '../blockchain/client.js'
import { CONTRACTS } from '../config/index.js'
import { db } from '../db/client.js'

export async function indexDistributorEvents(fromBlock: bigint, toBlock: bigint) {
  const claims = await publicClient.getLogs({
    address:   CONTRACTS.distributor,
    event:     parseAbiItem('event Claimed(address indexed user, uint256 amount)'),
    fromBlock,
    toBlock,
  })

  for (const log of claims) {
    if (!log.args.user || log.args.amount === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.claim.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        user:        log.args.user,
        amount:      log.args.amount.toString(),
      },
    })
  }

  if (claims.length > 0) {
    console.log(`  Distributor: +${claims.length} claims`)
  }
}
