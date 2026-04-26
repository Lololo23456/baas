// Contract addresses — Base Sepolia (3ème déploiement — adresses broadcast réelles)
// Source de vérité : broadcast/Deploy.s.sol/84532/run-latest.json
export const CONTRACTS = {
  VAULT:       '0x552138ef55e32b656fe303ccdd5b388dfb7bff9b' as const,
  FBK_TOKEN:   '0xc6d0dd119aca3cb99c7c20d18fb9aee8bb44548e' as const,
  DISTRIBUTOR: '0xa2823df3f7c9c0735e1ff4f8f4a06dd33b34e0b7' as const,
  VE_FBK:      '0x6089374304d838f5aaf1fa16f6919b2a95a2e231' as const,
  GOVERNOR:    '0xb183d6aa4e1a21d9b0961119438c1eaf2a5898e0' as const,
  EAS_CHECKER: '0x51210B5837521f1254F88Bcd77D4BBEB2b0254c0' as const,
  MOCK_EURC:   '0x35ba4bd0c7b54a96ba9beea965eeb50c57cc6501' as const,
  MOCK_MORPHO: '0xedac18110f28fdf3276fb15b7d429721d67c0515' as const,
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
