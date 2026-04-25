import { getContract } from 'viem'
import { publicClient } from './client.js'
import { CONTRACTS } from '../config/index.js'
import { vaultAbi }       from './abis/vault.js'
import { distributorAbi } from './abis/distributor.js'
import { veFBKAbi }       from './abis/veFBK.js'
import { governorAbi }    from './abis/governor.js'

export const vault = getContract({
  address: CONTRACTS.vault,
  abi:     vaultAbi,
  client:  publicClient,
})

export const distributor = getContract({
  address: CONTRACTS.distributor,
  abi:     distributorAbi,
  client:  publicClient,
})

export const veFBK = getContract({
  address: CONTRACTS.veFBK,
  abi:     veFBKAbi,
  client:  publicClient,
})

export const governor = getContract({
  address: CONTRACTS.governor,
  abi:     governorAbi,
  client:  publicClient,
})
