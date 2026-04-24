# MarketParams

```solidity
struct MarketParams {
address loanToken; // Token prêté/emprunté (ex: EURC)
address collateralToken; // Token de collatéral (address(0) pour supply-only)
address oracle; // Oracle de prix
address irm; // Interest Rate Model
uint256 lltv; // Loan-to-Value liquidation threshold (en WAD, 1e18 = 100%)
}
```

