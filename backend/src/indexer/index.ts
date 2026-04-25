import { publicClient } from '../blockchain/client.js'
import { db } from '../db/client.js'
import { env } from '../config/index.js'
import { indexVaultEvents }       from './vault.js'
import { indexDistributorEvents } from './distributor.js'
import { indexVeFBKEvents }       from './veFBK.js'
import { indexGovernorEvents }    from './governor.js'

const CHUNK_SIZE = 2000n // Blocs par batch

async function getLastIndexedBlock(): Promise<bigint> {
  const state = await db.indexerState.findUnique({ where: { id: 'singleton' } })
  return state ? state.lastBlock : env.START_BLOCK
}

async function saveLastIndexedBlock(block: bigint) {
  await db.indexerState.upsert({
    where:  { id: 'singleton' },
    update: { lastBlock: block },
    create: { id: 'singleton', lastBlock: block },
  })
}

async function indexRange(fromBlock: bigint, toBlock: bigint) {
  console.log(`📦 Indexation blocs ${fromBlock} → ${toBlock}`)
  await Promise.all([
    indexVaultEvents(fromBlock, toBlock),
    indexDistributorEvents(fromBlock, toBlock),
    indexVeFBKEvents(fromBlock, toBlock),
    indexGovernorEvents(fromBlock, toBlock),
  ])
  await saveLastIndexedBlock(toBlock)
}

async function runIndexer() {
  console.log('🔍 FinBank Indexer démarré')
  console.log(`   Network  : ${env.NETWORK}`)
  console.log(`   RPC      : ${env.RPC_URL.slice(0, 40)}...`)
  console.log(`   Polling  : ${env.POLL_INTERVAL_MS}ms`)

  // Rattrape les blocs manqués depuis le dernier arrêt
  const lastIndexed = await getLastIndexedBlock()
  const currentBlock = await publicClient.getBlockNumber()

  if (lastIndexed < currentBlock) {
    console.log(`\n⏩ Rattrapage depuis le bloc ${lastIndexed} (${currentBlock - lastIndexed} blocs)`)
    let from = lastIndexed + 1n
    while (from <= currentBlock) {
      const to = from + CHUNK_SIZE - 1n < currentBlock ? from + CHUNK_SIZE - 1n : currentBlock
      await indexRange(from, to)
      from = to + 1n
    }
    console.log('✅ Rattrapage terminé\n')
  }

  // Boucle de polling en temps réel
  while (true) {
    await new Promise(r => setTimeout(r, env.POLL_INTERVAL_MS))

    try {
      const latest = await publicClient.getBlockNumber()
      const last   = await getLastIndexedBlock()

      if (latest > last) {
        const from = last + 1n
        const to   = latest
        await indexRange(from, to)
      }
    } catch (err) {
      console.error('❌ Erreur indexeur:', err)
    }
  }
}

runIndexer().catch(console.error)
