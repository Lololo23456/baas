export const vaultAbi = [
  // Events
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      { name: 'caller',  type: 'address', indexed: true  },
      { name: 'owner',   type: 'address', indexed: true  },
      { name: 'assets',  type: 'uint256', indexed: false },
      { name: 'shares',  type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'caller',   type: 'address', indexed: true  },
      { name: 'receiver', type: 'address', indexed: true  },
      { name: 'owner',    type: 'address', indexed: true  },
      { name: 'assets',   type: 'uint256', indexed: false },
      { name: 'shares',   type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FeesAccrued',
    inputs: [
      { name: 'yieldGenerated', type: 'uint256', indexed: false },
      { name: 'feeAssets',      type: 'uint256', indexed: false },
      { name: 'feeShares',      type: 'uint256', indexed: false },
    ],
  },
  // Read functions
  {
    type: 'function',
    name: 'totalAssets',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'convertToAssets',
    stateMutability: 'view',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'feeBps',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const
