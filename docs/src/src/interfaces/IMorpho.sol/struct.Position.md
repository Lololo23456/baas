# Position

```solidity
struct Position {
uint256 supplyShares; // Parts de liquidité déposée (accrues avec les intérêts)
uint128 borrowShares; // Parts d'emprunt (non utilisé pour FinBank en V1)
uint128 collateral; // Collatéral déposé (non utilisé pour FinBank en V1)
}
```

