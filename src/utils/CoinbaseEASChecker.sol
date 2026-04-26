// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// CoinbaseEASChecker — Vérificateur KYC via Coinbase Verifications
//
// Utilise le système d'attestations on-chain de Coinbase (Coinbase Verifications)
// basé sur EAS (Ethereum Attestation Service) déployé sur Base.
//
// Avantages vs EASChecker classique :
//   - Zéro friction : pas de registerAttestation() manuel
//   - 100M+ utilisateurs Coinbase déjà vérifiés KYC
//   - Open source : github.com/coinbase/verifications
//   - Nativement sur Base : cohérent avec notre stack
//
// Flow :
//   1. L'utilisateur va sur coinbase.com/onchain-verify une seule fois
//   2. Coinbase crée une attestation EAS on-chain pour son wallet
//   3. Notre Vault interroge le Coinbase Indexer pour vérifier le statut
//   4. Aucune action requise de notre côté — tout est on-chain
//
// Adresses clés (Base Mainnet) :
//   EAS      : 0x4200000000000000000000000000000000000021 (predeploy)
//   Indexer  : 0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C
//   Attester : 0x357458739F90461b99789350868CD7CF330Dd7EE
//   Schema   : 0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9
//
// Adresses clés (Base Sepolia) :
//   EAS      : 0x4200000000000000000000000000000000000021 (predeploy)
//   Indexer  : 0xd147a19c3B085Fb9B0c15D2EAAFC6CB086ea849B
//   Attester : 0xB5644397a9733f86Cacd928478B29b4cD6041C45
//   Schema   : 0x2f34a2ffe5f87b2f45fbc7c784896b768d77261e2f24f77341ae43751c765a69
// ─────────────────────────────────────────────────────────────────────────────

import {IEAS, Attestation} from "../interfaces/IEAS.sol";
import {IEASChecker}       from "../interfaces/IEASChecker.sol";

/// @dev Interface minimale du Coinbase Attestation Indexer.
interface ICoinbaseIndexer {
    /// @notice Retourne l'UID de l'attestation la plus récente pour un recipient + schema.
    /// @param recipient Adresse du wallet vérifié.
    /// @param schemaUid UID du schéma EAS (ex: "Verified Account").
    /// @return UID de l'attestation, ou bytes32(0) si absente.
    function getAttestationUid(address recipient, bytes32 schemaUid) external view returns (bytes32);
}

contract CoinbaseEASChecker is IEASChecker {

    // ── Errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAddress();
    error ZeroSchema();  // Schema UID ne peut pas être bytes32(0)

    // ── Events ────────────────────────────────────────────────────────────────

    event IndexerUpdated(address indexed oldIndexer, address indexed newIndexer);
    event AttesterUpdated(address indexed oldAttester, address indexed newAttester);
    event SchemaUpdated(bytes32 oldSchema, bytes32 newSchema);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Storage ───────────────────────────────────────────────────────────────

    /// @notice Contrat EAS (predeploy Base : 0x4200...0021).
    IEAS public immutable eas;

    /// @notice Coinbase Attestation Indexer — indexe les attestations par (recipient, schema).
    ICoinbaseIndexer public indexer;

    /// @notice Adresse de l'attester Coinbase — toutes les attestations sont émises de là.
    /// @dev Permet de vérifier l'origine de l'attestation (protection anti-usurpation).
    address public coinbaseAttester;

    /// @notice Schema UID "Verified Account" de Coinbase Verifications.
    /// @dev Mainnet : 0xf8b0...0de9 | Sepolia : 0x2f34...5a69
    bytes32 public verifiedAccountSchema;

    /// @notice DAO / multisig — peut mettre à jour l'indexer, l'attester ou le schema.
    address public owner;

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────

    /// @param _eas                   Adresse EAS (0x4200...0021 sur Base).
    /// @param _indexer               Adresse du Coinbase Indexer.
    /// @param _coinbaseAttester      Adresse de l'attester Coinbase officiel.
    /// @param _verifiedAccountSchema Schema UID "Verified Account" de Coinbase.
    constructor(
        address _eas,
        address _indexer,
        address _coinbaseAttester,
        bytes32 _verifiedAccountSchema
    ) {
        if (_eas              == address(0)) revert ZeroAddress();
        if (_indexer          == address(0)) revert ZeroAddress();
        if (_coinbaseAttester == address(0)) revert ZeroAddress();
        if (_verifiedAccountSchema == bytes32(0)) revert ZeroSchema(); // [LOW-1]

        eas                   = IEAS(_eas);
        indexer               = ICoinbaseIndexer(_indexer);
        coinbaseAttester      = _coinbaseAttester;
        verifiedAccountSchema = _verifiedAccountSchema;
        owner                 = msg.sender;
    }

    // ── IEASChecker ───────────────────────────────────────────────────────────

    /// @notice Vérifie si un wallet a complété le KYC via Coinbase Verifications.
    /// @dev Interroge le Coinbase Indexer, récupère l'attestation depuis EAS, et valide :
    ///      - L'attestation existe (uid != 0)
    ///      - Elle cible bien ce wallet (recipient == user)
    ///      - Elle a été émise par Coinbase (attester == coinbaseAttester)
    ///      - Elle n'est pas expirée
    ///      - Elle n'est pas révoquée
    /// @param user Adresse du wallet à vérifier.
    /// @return true si le wallet est autorisé à déposer.
    function isAuthorized(address user) external view returns (bool) {
        // 1. Récupère l'UID via le Coinbase Indexer
        bytes32 uid = indexer.getAttestationUid(user, verifiedAccountSchema);
        if (uid == bytes32(0)) return false;

        // 2. Récupère l'attestation complète depuis EAS
        Attestation memory att = eas.getAttestation(uid);

        // 3. Validation complète
        if (att.uid       == bytes32(0))         return false; // N'existe pas
        if (att.recipient != user)               return false; // Mauvais destinataire
        if (att.attester  != coinbaseAttester)   return false; // Pas émis par Coinbase
        if (att.schema    != verifiedAccountSchema) return false; // Mauvais schema
        if (att.revocationTime != 0)             return false; // Révoquée
        if (att.expirationTime != 0 && att.expirationTime <= block.timestamp) return false; // Expirée

        return true;
    }

    // ── Admin (DAO) ───────────────────────────────────────────────────────────

    /// @notice Met à jour l'adresse du Coinbase Indexer.
    /// @dev Utile si Coinbase déploie une nouvelle version de l'indexer.
    function setIndexer(address _indexer) external onlyOwner {
        if (_indexer == address(0)) revert ZeroAddress();
        emit IndexerUpdated(address(indexer), _indexer);
        indexer = ICoinbaseIndexer(_indexer);
    }

    /// @notice Met à jour l'adresse de l'attester Coinbase.
    function setAttester(address _attester) external onlyOwner {
        if (_attester == address(0)) revert ZeroAddress();
        emit AttesterUpdated(coinbaseAttester, _attester);
        coinbaseAttester = _attester;
    }

    /// @notice Met à jour le schema UID (si Coinbase publie un nouveau schema).
    function setSchema(bytes32 _schema) external onlyOwner {
        if (_schema == bytes32(0)) revert ZeroSchema(); // [MEDIUM-1]
        emit SchemaUpdated(verifiedAccountSchema, _schema);
        verifiedAccountSchema = _schema;
    }

    /// @notice Transfert de ownership vers la DAO.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
