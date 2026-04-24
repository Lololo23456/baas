# FinBankVaultTest
**Inherits:**
Test


## State Variables
### eurc

```solidity
MockEURC eurc
```


### morpho

```solidity
MockMorpho morpho
```


### eas

```solidity
MockEAS eas
```


### checker

```solidity
EASChecker checker
```


### vault

```solidity
FinBankVault vault
```


### DAO

```solidity
address DAO = address(0xDA0)
```


### TREASURY

```solidity
address TREASURY = address(0x7EA5)
```


### ATTESTOR

```solidity
address ATTESTOR = address(0xA77E570)
```


### ALICE

```solidity
address ALICE = address(0xA11CE)
```


### BOB

```solidity
address BOB = address(0xB0B)
```


### CHARLIE

```solidity
address CHARLIE = address(0xC)
```


### KYC_SCHEMA

```solidity
bytes32 constant KYC_SCHEMA = keccak256("finbank.kyc.v1")
```


### ALICE_ATT_UID

```solidity
bytes32 constant ALICE_ATT_UID = keccak256("alice_attestation")
```


### BOB_ATT_UID

```solidity
bytes32 constant BOB_ATT_UID = keccak256("bob_attestation")
```


### FEE_BPS

```solidity
uint256 constant FEE_BPS = 1_500
```


## Functions
### setUp


```solidity
function setUp() public;
```

### test_deposit_withValidKYC


```solidity
function test_deposit_withValidKYC() public;
```

### test_deposit_withoutKYC_reverts


```solidity
function test_deposit_withoutKYC_reverts() public;
```

### test_deposit_zeroAmount_reverts


```solidity
function test_deposit_zeroAmount_reverts() public;
```

### test_multipleDepositors


```solidity
function test_multipleDepositors() public;
```

### test_redeem_fullBalance


```solidity
function test_redeem_fullBalance() public;
```

### test_redeem_withoutKYC_succeeds


```solidity
function test_redeem_withoutKYC_succeeds() public;
```

### test_redeem_exceedsBalance_reverts


```solidity
function test_redeem_exceedsBalance_reverts() public;
```

### test_feeAccrual_onYield


```solidity
function test_feeAccrual_onYield() public;
```

### test_feeAccrual_15percent


```solidity
function test_feeAccrual_15percent() public;
```

### test_setFee_onlyOwner


```solidity
function test_setFee_onlyOwner() public;
```

### test_setFee_tooHigh_reverts


```solidity
function test_setFee_tooHigh_reverts() public;
```

### test_setFee_success


```solidity
function test_setFee_success() public;
```

### test_setTreasury_onlyOwner


```solidity
function test_setTreasury_onlyOwner() public;
```

### test_fullScenario_freelanceJourney


```solidity
function test_fullScenario_freelanceJourney() public;
```

### test_sharePrice_increasesWithYield


```solidity
function test_sharePrice_increasesWithYield() public;
```

