export const veFBKAbi = [
  {
    type: 'event',
    name: 'LockCreated',
    inputs: [
      { name: 'user',       type: 'address', indexed: true  },
      { name: 'amount',     type: 'uint256', indexed: false },
      { name: 'unlockTime', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LockIncreased',
    inputs: [
      { name: 'user',        type: 'address', indexed: true  },
      { name: 'addedAmount', type: 'uint256', indexed: false },
      { name: 'newTotal',    type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LockExtended',
    inputs: [
      { name: 'user',   type: 'address', indexed: true  },
      { name: 'oldEnd', type: 'uint256', indexed: false },
      { name: 'newEnd', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'user',   type: 'address', indexed: true  },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'locked',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint128' },
      { name: 'end',    type: 'uint64'  },
    ],
  },
  {
    type: 'function',
    name: 'totalLocked',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const
