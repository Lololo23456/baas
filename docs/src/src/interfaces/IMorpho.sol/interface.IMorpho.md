# IMorpho

## Functions
### supply


```solidity
function supply(
    MarketParams memory marketParams,
    uint256 assets,
    uint256 shares,
    address onBehalf,
    bytes memory data
) external returns (uint256 assetsDeposited, uint256 sharesReceived);
```

### withdraw


```solidity
function withdraw(
    MarketParams memory marketParams,
    uint256 assets,
    uint256 shares,
    address onBehalf,
    address receiver
) external returns (uint256 assetsWithdrawn, uint256 sharesBurned);
```

### position


```solidity
function position(Id id, address user) external view returns (Position memory p);
```

### market


```solidity
function market(Id id) external view returns (Market memory m);
```

### accrueInterest


```solidity
function accrueInterest(MarketParams memory marketParams) external;
```

