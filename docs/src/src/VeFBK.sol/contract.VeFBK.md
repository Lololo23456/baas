# VeFBK

## State Variables
### WEEK

```solidity
uint256 public constant WEEK = 7 * 86400
```


### MAX_LOCK_DURATION

```solidity
uint256 public constant MAX_LOCK_DURATION = 4 * 365 * 86400
```


### MIN_LOCK_DURATION

```solidity
uint256 public constant MIN_LOCK_DURATION = WEEK
```


### fbk

```solidity
IFBK public immutable fbk
```


### locked

```solidity
mapping(address => LockedBalance) public locked
```


### totalLocked

```solidity
uint256 public totalLocked
```


## Functions
### constructor


```solidity
constructor(address _fbk) ;
```

### createLock


```solidity
function createLock(uint256 amount, uint256 lockDuration) external;
```

### increaseAmount


```solidity
function increaseAmount(uint256 additionalAmount) external;
```

### extendLock


```solidity
function extendLock(uint256 newUnlockTime) external;
```

### withdraw


```solidity
function withdraw() external;
```

### balanceOf


```solidity
function balanceOf(address user) public view returns (uint256);
```

### balanceOfAt


```solidity
function balanceOfAt(address user, uint256 timestamp) external view returns (uint256);
```

### totalSupply


```solidity
function totalSupply() external view returns (uint256 total);
```

### remainingLockDuration


```solidity
function remainingLockDuration(address user) external view returns (uint256);
```

### isExpired


```solidity
function isExpired(address user) external view returns (bool);
```

### _veBalance


```solidity
function _veBalance(LockedBalance memory lock, uint256 timestamp) internal pure returns (uint256);
```

### _roundToWeek


```solidity
function _roundToWeek(uint256 timestamp) internal pure returns (uint256);
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

## Errors
### ZeroAmount

```solidity
error ZeroAmount();
```

### ZeroAddress

```solidity
error ZeroAddress();
```

### LockTooShort

```solidity
error LockTooShort(uint256 duration, uint256 minimum);
```

### LockTooLong

```solidity
error LockTooLong(uint256 duration, uint256 maximum);
```

### LockAlreadyExists

```solidity
error LockAlreadyExists();
```

### NoLockFound

```solidity
error NoLockFound();
```

### LockNotExpired

```solidity
error LockNotExpired(uint256 unlockTime);
```

### LockExpired

```solidity
error LockExpired();
```

### NewEndNotLater

```solidity
error NewEndNotLater(uint256 current, uint256 proposed);
```

## Structs
### LockedBalance

```solidity
struct LockedBalance {
    uint128 amount; // Montant de $FBK bloques
    uint64 end; // Timestamp d'expiration du lock (arrondi a la semaine)
}
```

