# MockEAS

## State Variables
### attestations

```solidity
mapping(bytes32 => MockAttestation) public attestations
```


## Functions
### createAttestation


```solidity
function createAttestation(bytes32 uid, bytes32 schema, address recipient, address attester) external;
```

### revokeAttestation


```solidity
function revokeAttestation(bytes32 uid) external;
```

### getAttestation


```solidity
function getAttestation(bytes32 uid) external view returns (MockAttestation memory);
```

### isAttestationValid


```solidity
function isAttestationValid(bytes32 uid) external view returns (bool);
```

## Structs
### MockAttestation

```solidity
struct MockAttestation {
    bytes32 uid;
    bytes32 schema;
    uint64 time;
    uint64 expirationTime;
    uint64 revocationTime;
    bytes32 refUID;
    address recipient;
    address attester;
    bool revocable;
    bytes data;
}
```

