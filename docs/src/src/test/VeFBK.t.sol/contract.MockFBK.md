# MockFBK

## State Variables
### balanceOf

```solidity
mapping(address => uint256) public balanceOf
```


### allowance

```solidity
mapping(address => mapping(address => uint256)) public allowance
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

