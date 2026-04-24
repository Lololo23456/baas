// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// Ethereum Attestation Service (EAS) — Interface minimale pour FinBank
// Source officielle : https://github.com/ethereum-attestation-service/eas-contracts
// Déployé sur Base : 0x4200000000000000000000000000000000000021
// ─────────────────────────────────────────────────────────────────────────────

/// @notice Une attestation EAS complète.
struct Attestation {
    bytes32 uid;             // Identifiant unique de l'attestation
    bytes32 schema;          // Schema UID (définit la structure des données)
    uint64  time;            // Timestamp de création
    uint64  expirationTime;  // Timestamp d'expiration (0 = pas d'expiration)
    uint64  revocationTime;  // Timestamp de révocation (0 = non révoquée)
    bytes32 refUID;          // Référence à une autre attestation (optionnel)
    address recipient;       // Adresse attestée (le wallet du freelance)
    address attester;        // Adresse de l'Attestor (prestataire KYC agréé)
    bool    revocable;       // L'attestation peut-elle être révoquée ?
    bytes   data;            // Données encodées selon le schema
}

interface IEAS {
    /// @notice Retourne une attestation par son UID.
    /// @param uid L'identifiant unique de l'attestation.
    /// @return L'attestation complète.
    function getAttestation(bytes32 uid) external view returns (Attestation memory);

    /// @notice Vérifie si une attestation est valide (existe et non révoquée).
    /// @param uid L'identifiant unique de l'attestation.
    /// @return true si l'attestation est valide.
    function isAttestationValid(bytes32 uid) external view returns (bool);
}
