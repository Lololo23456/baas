# FBKToken

## State Variables
### name

```solidity
string public constant name = "FinBank Governance Token"
```


### symbol

```solidity
string public constant symbol = "FBK"
```


### decimals

```solidity
uint8 public constant decimals = 18
```


### MAX_SUPPLY

```solidity
uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18
```


### totalSupply

```solidity
uint256 public totalSupply
```


### balanceOf

```solidity
mapping(address => uint256) public balanceOf
```


### allowance

```solidity
mapping(address => mapping(address => uint256)) public allowance
```


### owner

```solidity
address public owner
```


### minter

```solidity
address public minter
```


## Functions
### constructor


```solidity
constructor(address _minter) ;
```

### onlyOwner


```solidity
modifier onlyOwner() ;
```

### onlyMinter


```solidity
modifier onlyMinter() ;
```

### transfer


```solidity
function transfer(address to, uint256 amount) external returns (bool);
```

### approve


```solidity
function approve(address spender, uint256 amount) external returns (bool);
```

### transferFrom


```solidity
function transferFrom(address from, address to, uint256 amount) external returns (bool);
```

### mint


```solidity
function mint(address to, uint256 amount) external onlyMinter;
```

### burn


```solidity
function burn(uint256 amount) external;
```

### burnFrom


```solidity
function burnFrom(address from, uint256 amount) external;
```

### remainingMintable


```solidity
function remainingMintable() external view returns (uint256);
```

### supplyEmittedBps


```solidity
function supplyEmittedBps() external view returns (uint256);
```

### setMinter


```solidity
function setMinter(address newMinter) external onlyOwner;
```

### transferOwnership


```solidity
function transferOwnership(address newOwner) external onlyOwner;
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

## Errors
### NotOwner

```solidity
error NotOwner();
```

### NotMinter

```solidity
error NotMinter();
```

### ZeroAddress

```solidity
error ZeroAddress();
```

### CapExceeded

```solidity
error CapExceeded(uint256 requested, uint256 available);
```

### InsufficientBalance

```solidity
error InsufficientBalance(uint256 requested, uint256 available);
```

### InsufficientAllowance

```solidity
error InsufficientAllowance(uint256 requested, uint256 allowed);
```

