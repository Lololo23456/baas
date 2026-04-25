// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IEAS, Attestation} from "../interfaces/IEAS.sol";

// ─────────────────────────────────────────────────────────────────────────────
// EASChecker — Vérificateur d'attestations KYC pour FinBank
//
// Ce contrat est la "porte d'entrée" du Vault.
// Il vérifie qu'un wallet possède une attestation KYC valide émise par un
// Attestor agréé par la DAO, avant d'autoriser tout dépôt.
//
// Propriétés :
//   - Agnostique : n'importe quel Attestor agréé peut émettre des attestations
//   - Privacy-preserving : on vérifie la conformité, pas l'identité
//   - Gouverné : la liste des Attestors est gérée par la DAO (owner)
// ─────────────────────────────────────────────────────────────────────────────

contract EASChecker {
    // ── Erreurs ───────────────────────────────────────────────────────────────
    error NotOwner();
    error ZeroAddress();
    error AttestorAlreadyApproved(address attestor);
    error AttestorNotFound(address attestor);
    error NoValidAttestation(address user);

    // ── Events ────────────────────────────────────────────────────────────────
    event AttestorApproved(address indexed attestor);
    event AttestorRevoked(address indexed attestor);
    event SchemaUpdated(bytes32 newSchema);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Storage ───────────────────────────────────────────────────────────────

    // @notice Contrat EAS déployé sur Base.
    IEAS public immutable eas;

    // @notice Schema UID qui définit la structure d'une attestation KYC FinBank.
    // @dev Format attendu dans `data` : abi.encode(bool kycPassed, bool amlClear, uint8 tier)
    bytes32 public kycSchema;

    // @notice DAO / multisig qui administre le registre des Attestors.
    address public owner;

    // @notice Attestors agréés par la DAO.
    // @dev mapping(attestorAddress => isApproved)
    mapping(address => bool) public approvedAttestors;

    // @notice Attestation active par wallet.
    // @dev Le wallet soumet son attestation UID une seule fois lors de l'onboarding.
    mapping(address => bytes32) public userAttestationUID;

    // ── Constructor ───────────────────────────────────────────────────────────

    // @param _eas Adresse du contrat EAS sur Base.
    // @param _kycSchema Schema UID pour les attestations KYC FinBank.
    constructor(address _eas, bytes32 _kycSchema) {
        eas    = IEAS(_eas);
        kycSchema = _kycSchema;
        owner  = msg.sender;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Gouvernance (DAO) ─────────────────────────────────────────────────────

    // @notice Ajoute un Attestor agréé. Appelable uniquement par la DAO.
    function approveAttestor(address attestor) external onlyOwner {
        if (approvedAttestors[attestor]) revert AttestorAlreadyApproved(attestor);
        approvedAttestors[attestor] = true;
        emit AttestorApproved(attestor);
    }

    // @notice Révoque un Attestor. Les attestations existantes de cet Attestor
    //         deviennent immédiatement invalides — les dépôts sont bloqués,
    //         mais les retraits restent possibles (censure-résistance).
    function revokeAttestor(address attestor) external onlyOwner {
        if (!approvedAttestors[attestor]) revert AttestorNotFound(attestor);
        approvedAttestors[attestor] = false;
        emit AttestorRevoked(attestor);
    }

    // @notice Met à jour le schema KYC. Vote DAO requis.
    function updateSchema(bytes32 newSchema) external onlyOwner {
        kycSchema = newSchema;
        emit SchemaUpdated(newSchema);
    }

    // @notice Transfert de ownership vers la DAO (multisig ou gouvernance on-chain).
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── Onboarding ────────────────────────────────────────────────────────────

    // @notice Enregistre l'attestation KYC d'un utilisateur.
    // @dev L'utilisateur appelle cette fonction une fois avec l'UID de son attestation.
    //      L'attestation doit être émise par un Attestor agréé et viser son adresse.
    // @param attestationUID UID de l'attestation EAS obtenue via l'Attestor.
    function registerAttestation(bytes32 attestationUID) external {
        Attestation memory att = eas.getAttestation(attestationUID);

        if (att.recipient != msg.sender)          revert NoValidAttestation(msg.sender);
        if (!approvedAttestors[att.attester])     revert NoValidAttestation(msg.sender);
        if (att.schema != kycSchema)              revert NoValidAttestation(msg.sender);
        if (att.revocationTime != 0)              revert NoValidAttestation(msg.sender);
        if (att.expirationTime != 0 && att.expirationTime <= block.timestamp)
                                                  revert NoValidAttestation(msg.sender);

        userAttestationUID[msg.sender] = attestationUID;
    }

    // ── Vérification (appelée par le Vault) ───────────────────────────────────

    // @notice Vérifie si un wallet est autorisé à déposer dans le Vault.
    // @dev Vérifie que l'attestation enregistrée est toujours valide.
    //      Cette fonction est appelée par FinBankVault avant chaque dépôt.
    // @param user Adresse du wallet à vérifier.
    // @return true si le wallet peut déposer.
    function isAuthorized(address user) external view returns (bool) {
        bytes32 uid = userAttestationUID[user];

        // Pas d'attestation enregistrée
        if (uid == bytes32(0)) return false;

        // Récupère l'attestation depuis EAS
        Attestation memory att = eas.getAttestation(uid);

        // Vérifie toutes les conditions (peut avoir changé depuis l'enregistrement)
        if (att.recipient != user)                   return false;
        if (!approvedAttestors[att.attester])        return false;
        if (att.schema != kycSchema)                 return false;
        if (att.revocationTime != 0)                 return false;
        if (att.expirationTime != 0 && att.expirationTime <= block.timestamp) return false;

        return true;
    }
}
