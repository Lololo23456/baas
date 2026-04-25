import { parseAbiItem } from 'viem'
import { publicClient, getBlockTimestamp } from '../blockchain/client.js'
import { CONTRACTS } from '../config/index.js'
import { db } from '../db/client.js'

export async function indexVaultEvents(fromBlock: bigint, toBlock: bigint) {
  const [deposits, withdrawals] = await Promise.all([
    publicClient.getLogs({
      address:   CONTRACTS.vault,
      event:     parseAbiItem('event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares)'),
      fromBlock,
      toBlock,
    }),
    publicClient.getLogs({
      address:   CONTRACTS.vault,
      event:     parseAbiItem('event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'),
      fromBlock,
      toBlock,
    }),
  ])

  for (const log of deposits) {
    if (!log.args.caller || !log.args.owner || log.args.assets === undefined || log.args.shares === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.deposit.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        caller:      log.args.caller,
        owner:       log.args.owner,
        assets:      log.args.assets!.toString(),
        shares:      log.args.shares!.toString(),
      },
    })
  }

  for (const log of withdrawals) {
    if (!log.args.caller || !log.args.receiver || !log.args.owner || log.args.assets === undefined || log.args.shares === undefined) continue
    const timestamp = await getBlockTimestamp(log.blockNumber)
    await db.withdrawal.upsert({
      where:  { txHash: log.transactionHash },
      update: {},
      create: {
        txHash:      log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp,
        caller:      log.args.caller,
        receiver:    log.args.receiver,
        owner:       log.args.owner,
        assets:      log.args.assets!.toString(),
        shares:      log.args.shares!.toString(),
      },
    })
  }

  if (deposits.length > 0 || withdrawals.length > 0) {
    console.log(`  Vault: +${deposits.length} dépôts, +${withdrawals.length} retraits`)
  }
}
