# Attestation

```solidity
struct Attestation {
bytes32 uid; // Identifiant unique de l'attestation
bytes32 schema; // Schema UID (définit la structure des données)
uint64 time; // Timestamp de création
uint64 expirationTime; // Timestamp d'expiration (0 = pas d'expiration)
uint64 revocationTime; // Timestamp de révocation (0 = non révoquée)
bytes32 refUID; // Référence à une autre attestation (optionnel)
address recipient; // Adresse attestée (le wallet du freelance)
address attester; // Adresse de l'Attestor (prestataire KYC agréé)
bool revocable; // L'attestation peut-elle être révoquée ?
bytes data; // Données encodées selon le schema
}
```

