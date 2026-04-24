# MockEURC

## State Variables
### name

```solidity
string public name = "Mock EURC"
```


### symbol

```solidity
string public symbol = "EURC"
```


### decimals

```solidity
uint8 public decimals = 6
```


### balanceOf

```solidity
mapping(address => uint256) public balanceOf
```


### allowance

```solidity
mapping(address => mapping(address => uint256)) public allowance
```


### totalSupply

```solidity
uint256 public totalSupply
```


## Functions
### mint


```solidity
function mint(address to, uint256 amount) external;
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

