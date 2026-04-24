# FinBankVault

## State Variables
### WAD

```solidity
uint256 public constant WAD = 1e18
```


### MAX_FEE_BPS

```solidity
uint256 public constant MAX_FEE_BPS = 3_000
```


### BPS_BASE

```solidity
uint256 public constant BPS_BASE = 10_000
```


### name

```solidity
string public name = "FinBank EURC Vault"
```


### symbol

```solidity
string public symbol = "fbEURC"
```


### decimals

```solidity
uint8 public decimals = 6
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


### asset

```solidity
IERC20 public immutable asset
```


### morpho

```solidity
IMorpho public immutable morpho
```


### marketParams

```solidity
MarketParams public marketParams
```


### easChecker

```solidity
EASChecker public immutable easChecker
```


### owner

```solidity
address public owner
```


### treasury

```solidity
address public treasury
```


### feeBps

```solidity
uint256 public feeBps
```


### lastTotalAssets

```solidity
uint256 public lastTotalAssets
```


## Functions
### constructor


```solidity
constructor(
    address _asset,
    address _morpho,
    MarketParams memory _market,
    address _checker,
    address _treasury,
    uint256 _feeBps
) ;
```

### onlyOwner


```solidity
modifier onlyOwner() ;
```

### assetAddress


```solidity
function assetAddress() external view returns (address);
```

### totalAssets


```solidity
function totalAssets() public view returns (uint256);
```

### convertToShares


```solidity
function convertToShares(uint256 assets) public view returns (uint256);
```

### convertToAssets


```solidity
function convertToAssets(uint256 shares) public view returns (uint256);
```

### maxDeposit


```solidity
function maxDeposit(address user) external view returns (uint256);
```

### maxWithdraw


```solidity
function maxWithdraw(address user) external view returns (uint256);
```

### previewDeposit


```solidity
function previewDeposit(uint256 assets) public view returns (uint256);
```

### previewRedeem


```solidity
function previewRedeem(uint256 shares) public view returns (uint256);
```

### deposit


```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares);
```

### redeem


```solidity
function redeem(uint256 shares, address receiver, address owner_) external returns (uint256 assets);
```

### _accrueFees


```solidity
function _accrueFees() internal;
```

### setFee


```solidity
function setFee(uint256 newFeeBps) external onlyOwner;
```

### setTreasury


```solidity
function setTreasury(address newTreasury) external onlyOwner;
```

### migrateMarket


```solidity
function migrateMarket(MarketParams memory newMarket) external onlyOwner;
```

### transferOwnership


```solidity
function transferOwnership(address newOwner) external onlyOwner;
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

### _mint


```solidity
function _mint(address to, uint256 shares) internal;
```

### _burn


```solidity
function _burn(address from, uint256 shares) internal;
```

### _morphoAssetsOf


```solidity
function _morphoAssetsOf(address user) internal view returns (uint256);
```

### _marketId


```solidity
function _marketId(MarketParams memory params) internal pure returns (bytes32);
```

## Events
### Deposit

```solidity
event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
```

### Withdraw

```solidity
event Withdraw(
    address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares
);
```

### FeesAccrued

```solidity
event FeesAccrued(uint256 yieldGenerated, uint256 feeAssets, uint256 feeShares);
```

### FeeUpdated

```solidity
event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
```

### TreasuryUpdated

```solidity
event TreasuryUpdated(address oldTreasury, address newTreasury);
```

### MarketUpdated

```solidity
event MarketUpdated(bytes32 oldMarketId, bytes32 newMarketId);
```

### Transfer

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
```

### Approval

```solidity
event Approval(address indexed owner, address indexed spender, uint256 value);
```

## Errors
### NotOwner

```solidity
error NotOwner();
```

### NotAuthorized

```solidity
error NotAuthorized(address user);
```

### ZeroAmount

```solidity
error ZeroAmount();
```

### ExceedsBalance

```solidity
error ExceedsBalance(uint256 requested, uint256 available);
```

### FeeTooHigh

```solidity
error FeeTooHigh(uint256 feeBps, uint256 maxFeeBps);
```

### ZeroShares

```solidity
error ZeroShares();
```

### ZeroAssets

```solidity
error ZeroAssets();
```

