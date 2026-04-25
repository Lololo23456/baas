import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { env } from '../config/index.js'

const chain = env.NETWORK === 'mainnet' ? base : baseSepolia

export const publicClient = createPublicClient({
  chain,
  transport: http(env.RPC_URL),
})

export async function getBlockTimestamp(blockNumber: bigint): Promise<Date> {
  const block = await publicClient.getBlock({ blockNumber })
  return new Date(Number(block.timestamp) * 1000)
}
