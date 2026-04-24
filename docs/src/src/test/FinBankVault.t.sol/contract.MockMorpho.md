# MockMorpho

## State Variables
### deposited

```solidity
mapping(address => uint256) public deposited
```


### yieldRate

```solidity
uint256 public yieldRate = 0
```


## Functions
### supply


```solidity
function supply(MarketParams memory params, uint256 assets, uint256, address onBehalf, bytes memory)
    external
    returns (uint256, uint256);
```

### withdraw


```solidity
function withdraw(MarketParams memory params, uint256 assets, uint256, address onBehalf, address receiver)
    external
    returns (uint256, uint256);
```

### simulateYield


```solidity
function simulateYield(address vault, uint256 additionalAssets) external;
```

### position


```solidity
function position(bytes32, address user) external view returns (uint256, uint128, uint128);
```

### market


```solidity
function market(bytes32) external view returns (uint128, uint128, uint128, uint128, uint128, uint128);
```

### accrueInterest


```solidity
function accrueInterest(MarketParams memory) external;
```

