# EASChecker

## State Variables
### eas

```solidity
IEAS public immutable eas
```


### kycSchema

```solidity
bytes32 public kycSchema
```


### owner

```solidity
address public owner
```


### approvedAttestors

```solidity
mapping(address => bool) public approvedAttestors
```


### userAttestationUID

```solidity
mapping(address => bytes32) public userAttestationUID
```


## Functions
### constructor


```solidity
constructor(address _eas, bytes32 _kycSchema) ;
```

### onlyOwner


```solidity
modifier onlyOwner() ;
```

### approveAttestor


```solidity
function approveAttestor(address attestor) external onlyOwner;
```

### revokeAttestor


```solidity
function revokeAttestor(address attestor) external onlyOwner;
```

### updateSchema


```solidity
function updateSchema(bytes32 newSchema) external onlyOwner;
```

### transferOwnership


```solidity
function transferOwnership(address newOwner) external onlyOwner;
```

### registerAttestation


```solidity
function registerAttestation(bytes32 attestationUID) external;
```

### isAuthorized


```solidity
function isAuthorized(address user) external view returns (bool);
```

## Events
### AttestorApproved

```solidity
event AttestorApproved(address indexed attestor);
```

### AttestorRevoked

```solidity
event AttestorRevoked(address indexed attestor);
```

### SchemaUpdated

```solidity
event SchemaUpdated(bytes32 newSchema);
```

## Errors
### NotOwner

```solidity
error NotOwner();
```

### AttestorAlreadyApproved

```solidity
error AttestorAlreadyApproved(address attestor);
```

### AttestorNotFound

```solidity
error AttestorNotFound(address attestor);
```

### NoValidAttestation

```solidity
error NoValidAttestation(address user);
```

