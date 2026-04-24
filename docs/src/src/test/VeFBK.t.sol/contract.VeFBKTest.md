# VeFBKTest
**Inherits:**
Test


## State Variables
### fbk

```solidity
MockFBK fbk
```


### ve

```solidity
VeFBK ve
```


### ALICE

```solidity
address ALICE = address(0xA11CE)
```


### BOB

```solidity
address BOB = address(0xB0B)
```


### WEEK

```solidity
uint256 constant WEEK = 7 * 86400
```


### MAX_LOCK

```solidity
uint256 constant MAX_LOCK = 4 * 365 * 86400
```


### ONE

```solidity
uint256 constant ONE = 1e18
```


### INITIAL_BALANCE

```solidity
uint256 constant INITIAL_BALANCE = 10_000 * ONE
```


## Functions
### setUp


```solidity
function setUp() public;
```

### test_deploy_setsFbkAddress


```solidity
function test_deploy_setsFbkAddress() public;
```

### test_deploy_withZeroAddress_reverts


```solidity
function test_deploy_withZeroAddress_reverts() public;
```

### test_deploy_initialTotalLockedIsZero


```solidity
function test_deploy_initialTotalLockedIsZero() public;
```

### test_createLock_success


```solidity
function test_createLock_success() public;
```

### test_createLock_roundsEndToWeek


```solidity
function test_createLock_roundsEndToWeek() public;
```

### test_createLock_zeroAmount_reverts


```solidity
function test_createLock_zeroAmount_reverts() public;
```

### test_createLock_tooShort_reverts


```solidity
function test_createLock_tooShort_reverts() public;
```

### test_createLock_tooLong_reverts


```solidity
function test_createLock_tooLong_reverts() public;
```

### test_createLock_exactMinDuration_succeeds


```solidity
function test_createLock_exactMinDuration_succeeds() public;
```

### test_createLock_exactMaxDuration_succeeds


```solidity
function test_createLock_exactMaxDuration_succeeds() public;
```

### test_createLock_alreadyExists_reverts


```solidity
function test_createLock_alreadyExists_reverts() public;
```

### test_createLock_emitsEvent


```solidity
function test_createLock_emitsEvent() public;
```

### test_increaseAmount_success


```solidity
function test_increaseAmount_success() public;
```

### test_increaseAmount_zeroAmount_reverts


```solidity
function test_increaseAmount_zeroAmount_reverts() public;
```

### test_increaseAmount_noLock_reverts


```solidity
function test_increaseAmount_noLock_reverts() public;
```

### test_increaseAmount_expiredLock_reverts


```solidity
function test_increaseAmount_expiredLock_reverts() public;
```

### test_increaseAmount_emitsEvent


```solidity
function test_increaseAmount_emitsEvent() public;
```

### test_extendLock_success


```solidity
function test_extendLock_success() public;
```

### test_extendLock_noLock_reverts


```solidity
function test_extendLock_noLock_reverts() public;
```

### test_extendLock_expiredLock_reverts


```solidity
function test_extendLock_expiredLock_reverts() public;
```

### test_extendLock_notLater_reverts


```solidity
function test_extendLock_notLater_reverts() public;
```

### test_extendLock_tooLong_reverts


```solidity
function test_extendLock_tooLong_reverts() public;
```

### test_extendLock_emitsEvent


```solidity
function test_extendLock_emitsEvent() public;
```

### test_withdraw_afterExpiry_success


```solidity
function test_withdraw_afterExpiry_success() public;
```

### test_withdraw_noLock_reverts


```solidity
function test_withdraw_noLock_reverts() public;
```

### test_withdraw_beforeExpiry_reverts


```solidity
function test_withdraw_beforeExpiry_reverts() public;
```

### test_withdraw_exactlyAtExpiry_success


```solidity
function test_withdraw_exactlyAtExpiry_success() public;
```

### test_withdraw_emitsEvent


```solidity
function test_withdraw_emitsEvent() public;
```

### test_balanceOf_noLock_returnsZero


```solidity
function test_balanceOf_noLock_returnsZero() public;
```

### test_balanceOf_expiredLock_returnsZero


```solidity
function test_balanceOf_expiredLock_returnsZero() public;
```

### test_balanceOf_maxLock_returnsFullAmount


```solidity
function test_balanceOf_maxLock_returnsFullAmount() public;
```

### test_balanceOf_halfMaxLock_returnsHalfAmount


```solidity
function test_balanceOf_halfMaxLock_returnsHalfAmount() public;
```

### test_balanceOf_decaysOverTime


```solidity
function test_balanceOf_decaysOverTime() public;
```

### test_balanceOf_isZeroAtExpiry


```solidity
function test_balanceOf_isZeroAtExpiry() public;
```

### test_balanceOfAt_futureTimestamp


```solidity
function test_balanceOfAt_futureTimestamp() public;
```

### test_balanceOfAt_pastExpiry_returnsZero


```solidity
function test_balanceOfAt_pastExpiry_returnsZero() public;
```

### test_remainingLockDuration_activeLock


```solidity
function test_remainingLockDuration_activeLock() public;
```

### test_remainingLockDuration_afterExpiry_returnsZero


```solidity
function test_remainingLockDuration_afterExpiry_returnsZero() public;
```

### test_remainingLockDuration_noLock_returnsZero


```solidity
function test_remainingLockDuration_noLock_returnsZero() public;
```

### test_isExpired_activeLock_returnsFalse


```solidity
function test_isExpired_activeLock_returnsFalse() public;
```

### test_isExpired_afterExpiry_returnsTrue


```solidity
function test_isExpired_afterExpiry_returnsTrue() public;
```

### test_isExpired_noLock_returnsTrue


```solidity
function test_isExpired_noLock_returnsTrue() public;
```

### test_totalLocked_multipleUsers


```solidity
function test_totalLocked_multipleUsers() public;
```

### test_totalLocked_decreasesAfterWithdraw


```solidity
function test_totalLocked_decreasesAfterWithdraw() public;
```

### test_scenario_fullLifecycle


```solidity
function test_scenario_fullLifecycle() public;
```

### test_scenario_nonTransferable


```solidity
function test_scenario_nonTransferable() public;
```

## Events
### LockCreated

```solidity
event LockCreated(address indexed user, uint256 amount, uint256 unlockTime);
```

### LockIncreased

```solidity
event LockIncreased(address indexed user, uint256 addedAmount, uint256 newTotal);
```

### LockExtended

```solidity
event LockExtended(address indexed user, uint256 oldEnd, uint256 newEnd);
```

### Withdrawn

```solidity
event Withdrawn(address indexed user, uint256 amount);
```

