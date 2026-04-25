import { parseAbiItem } from 'viem'
import { publicClient, getBlockTimestamp } from '../blockchain/client.js'
import { CONTRACTS } from '../config/index.js'
import { db } from '../db/client.js'

export async function indexVeFBKEvents(fromBlock: bigint, toBlock: bigint) {
  const [created, increased, extended, withdrawn] = await Promise.all([
    publicClient.getLogs({
      address:   CONTRACTS.veFBK,
      event:     parseAbiItem('event LockCreated(address indexed user, uint256 amount, uint256 unlockTime)'),
      fromBlock, toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.veFBK,
      event:     parseAbiItem('event LockIncreased(address indexed user, uint256 addedAmount, uint256 newTotal)'),
      fromBlock, toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.veFBK,
      event:     parseAbiItem('event LockExtended(address indexed user, uint256 oldEnd, uint256 newEnd)'),
      fromBlock, toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.veFBK,
      event:     parseAbiItem('event Withdrawn(address indexed user, uint256 amount)'),
      fromBlock, toBlock,
    }),
  ])

  for (const log of created) {
    if (!log.args.user || log.args.amount === undefined || log.args.unlockTime === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.lock.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        user:        log.args.user,
        amount:      log.args.amount.toString(),
        unlockTime:  new Date(Number(log.args.unlockTime) * 1000),
        eventType:   'CREATED',
      },
    })
  }

  for (const log of increased) {
    if (!log.args.user || log.args.addedAmount === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.lock.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        user:        log.args.user,
        amount:      log.args.addedAmount.toString(),
        unlockTime:  new Date(0),
        eventType:   'INCREASED',
      },
    })
  }

  for (const log of extended) {
    if (!log.args.user || log.args.newEnd === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.lock.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        user:        log.args.user,
        amount:      '0',
        unlockTime:  new Date(Number(log.args.newEnd) * 1000),
        eventType:   'EXTENDED',
      },
    })
  }

  for (const log of withdrawn) {
    if (!log.args.user || log.args.amount === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.lock.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        user:        log.args.user,
        amount:      log.args.amount.toString(),
        unlockTime:  new Date(0),
        eventType:   'WITHDRAWN',
      },
    })
  }

  const total = created.length + increased.length + extended.length + withdrawn.length
  if (total > 0) {
    console.log(`  VeFBK: +${total} lock events`)
  }
}
