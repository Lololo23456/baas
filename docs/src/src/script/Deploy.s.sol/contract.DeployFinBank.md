# DeployFinBank
**Inherits:**
Script


## State Variables
### EURC_BASE

```solidity
address constant EURC_BASE = 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42
```


### MORPHO_BASE

```solidity
address constant MORPHO_BASE = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
```


### EAS_BASE

```solidity
address constant EAS_BASE = 0x4200000000000000000000000000000000000021
```


### KYC_SCHEMA

```solidity
bytes32 constant KYC_SCHEMA = bytes32(0)
```


### TREASURY

```solidity
address constant TREASURY = address(0)
```


### FEE_BPS

```solidity
uint256 constant FEE_BPS = 1_500
```


### INITIAL_ATTESTOR

```solidity
address constant INITIAL_ATTESTOR = address(0)
```


### EURC_MARKET

```solidity
MarketParams EURC_MARKET = MarketParams({
    loanToken: EURC_BASE,
    collateralToken: address(0), // Supply-only market
    oracle: address(0), // Pas d'oracle nécessaire pour supply-only
    irm: address(0), // IRM du marché (à récupérer sur morpho.xyz)
    lltv: 0 // LLTV (à récupérer sur morpho.xyz)
})
```


## Functions
### run


```solidity
function run() external;
```

