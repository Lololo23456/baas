# Market

```solidity
struct Market {
uint128 totalSupplyAssets; // Total d'assets déposés (incluant intérêts)
uint128 totalSupplyShares; // Total de shares émises
uint128 totalBorrowAssets; // Total d'assets empruntés
uint128 totalBorrowShares; // Total de shares d'emprunt
uint128 lastUpdate; // Timestamp de la dernière mise à jour
uint128 fee; // Frais du protocole Morpho (en WAD)
}
```

