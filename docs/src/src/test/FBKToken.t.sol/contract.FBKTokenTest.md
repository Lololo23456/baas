# FBKTokenTest
**Inherits:**
Test


## State Variables
### token

```solidity
FBKToken token
```


### DAO

```solidity
address DAO = address(0xDA0)
```


### MINTER

```solidity
address MINTER = address(0x111)
```


### ALICE

```solidity
address ALICE = address(0xA11CE)
```


### BOB

```solidity
address BOB = address(0xB0B)
```


### TREASURY

```solidity
address TREASURY = address(0x7EA5)
```


### ONE_FBK

```solidity
uint256 constant ONE_FBK = 1e18
```


### MAX_SUPPLY

```solidity
uint256 constant MAX_SUPPLY = 100_000_000 * 1e18
```


## Functions
### setUp


```solidity
function setUp() public;
```

### test_deploy_setsOwnerAndMinter


```solidity
function test_deploy_setsOwnerAndMinter() public;
```

### test_deploy_initialSupplyIsZero


```solidity
function test_deploy_initialSupplyIsZero() public;
```

### test_deploy_withZeroMinter_reverts


```solidity
function test_deploy_withZeroMinter_reverts() public;
```

### test_constants


```solidity
function test_constants() public;
```

### test_mint_byMinter_succeeds


```solidity
function test_mint_byMinter_succeeds() public;
```

### test_mint_byNonMinter_reverts


```solidity
function test_mint_byNonMinter_reverts() public;
```

### test_mint_byOwner_reverts


```solidity
function test_mint_byOwner_reverts() public;
```

### test_mint_exceedsCap_reverts


```solidity
function test_mint_exceedsCap_reverts() public;
```

### test_mint_exactlyCap_succeeds


```solidity
function test_mint_exactlyCap_succeeds() public;
```

### test_mint_toZeroAddress_reverts


```solidity
function test_mint_toZeroAddress_reverts() public;
```

### test_mint_emitsTransferFromZero


```solidity
function test_mint_emitsTransferFromZero() public;
```

### test_burn_ownTokens_succeeds


```solidity
function test_burn_ownTokens_succeeds() public;
```

### test_burn_exceedsBalance_reverts


```solidity
function test_burn_exceedsBalance_reverts() public;
```

### test_burnFrom_withAllowance_succeeds


```solidity
function test_burnFrom_withAllowance_succeeds() public;
```

### test_burnFrom_infiniteAllowance_doesNotDecrement


```solidity
function test_burnFrom_infiniteAllowance_doesNotDecrement() public;
```

### test_burnFrom_insufficientAllowance_reverts


```solidity
function test_burnFrom_insufficientAllowance_reverts() public;
```

### test_transfer_succeeds


```solidity
function test_transfer_succeeds() public;
```

### test_transfer_insufficientBalance_reverts


```solidity
function test_transfer_insufficientBalance_reverts() public;
```

### test_transferFrom_withApproval_succeeds


```solidity
function test_transferFrom_withApproval_succeeds() public;
```

### test_transferFrom_insufficientAllowance_reverts


```solidity
function test_transferFrom_insufficientAllowance_reverts() public;
```

### test_approve_emitsApprovalEvent


```solidity
function test_approve_emitsApprovalEvent() public;
```

### test_remainingMintable_decreasesWithMint


```solidity
function test_remainingMintable_decreasesWithMint() public;
```

### test_supplyEmittedBps_isZeroInitially


```solidity
function test_supplyEmittedBps_isZeroInitially() public;
```

### test_supplyEmittedBps_afterMint


```solidity
function test_supplyEmittedBps_afterMint() public;
```

### test_supplyEmittedBps_afterFullMint


```solidity
function test_supplyEmittedBps_afterFullMint() public;
```

### test_setMinter_byOwner_succeeds


```solidity
function test_setMinter_byOwner_succeeds() public;
```

### test_setMinter_byNonOwner_reverts


```solidity
function test_setMinter_byNonOwner_reverts() public;
```

### test_setMinter_toZeroAddress_reverts


```solidity
function test_setMinter_toZeroAddress_reverts() public;
```

### test_setMinter_emitsMinterUpdatedEvent


```solidity
function test_setMinter_emitsMinterUpdatedEvent() public;
```

### test_transferOwnership_byOwner_succeeds


```solidity
function test_transferOwnership_byOwner_succeeds() public;
```

### test_transferOwnership_byNonOwner_reverts


```solidity
function test_transferOwnership_byNonOwner_reverts() public;
```

### test_transferOwnership_toZeroAddress_reverts


```solidity
function test_transferOwnership_toZeroAddress_reverts() public;
```

### test_fairLaunch_scenario


```solidity
function test_fairLaunch_scenario() public;
```

## Events
### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
```

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 value);
```

### MinterUpdated

```solidity
event MinterUpdated(address indexed oldMinter, address indexed newMinter);
```

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
```

