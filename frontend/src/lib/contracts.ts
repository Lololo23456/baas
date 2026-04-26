// Contract addresses — Base Sepolia (3ème déploiement — EASChecker avec allowlist/selfRegister)
export const CONTRACTS = {
  VAULT:       '0x1719f83defCfEde745fa80c8D16B7cf56f2aD1e4' as const,
  FBK_TOKEN:   '0x21447eB0497cE52Cd508B57826d417707Ee47878' as const,
  DISTRIBUTOR: '0x28BE449B18b9eC2ADff49f13acAB048FaD3D2FBD' as const,
  VE_FBK:      '0x99AD12d2A7C5F74775C5b7CB2fEc6e5a869f2FE9' as const,
  GOVERNOR:    '0xe2c80c50e81c3Eb0B0a6150dcCC4066a6aD6dab4' as const,
  EAS_CHECKER: '0x51210B5837521f1254F88Bcd77D4BBEB2b0254c0' as const,
  MOCK_EURC:   '0xB17084217fcd338C60a3e3394a97CB978c803d03' as const,
  MOCK_MORPHO: '0xA7c49e53573566B3b0143CDe8DCdC05Db316aBd5' as const,
}

export const BASESCAN_URL = 'https://sepolia.basescan.org'

export const VAULT_ABI = [
  {
    name: 'totalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'convertToShares',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets',   type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    name: 'redeem',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'shares',   type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner',    type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
] as const

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    // Testnet only — MockERC20 mint libre, pas de contrôle d'accès
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export const DISTRIBUTOR_ABI = [
  {
    name: 'earned',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const

export const EAS_CHECKER_ABI = [
  {
    name: 'isAuthorized',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    // Testnet only — s'auto-enregistre dans l'allowlist sans EAS attestation
    name: 'selfRegister',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const
