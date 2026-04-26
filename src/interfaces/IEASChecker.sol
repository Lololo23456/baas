// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// IEASChecker — Interface commune pour tous les vérificateurs KYC FinBank
//
// Implémentée par :
//   - EASChecker.sol          (attestations manuelles — tests / custom attestors)
//   - CoinbaseEASChecker.sol  (Coinbase Verifications — production)
//
// Le Vault utilise cette interface pour rester agnostique du provider KYC.
// La DAO peut changer le checker via vault.setChecker() sans redeployer le Vault.
// ─────────────────────────────────────────────────────────────────────────────

interface IEASChecker {
    /// @notice Vérifie si un wallet est autorisé à déposer dans le Vault.
    /// @param user Adresse du wallet à vérifier.
    /// @return true si le wallet possède un KYC valide et peut déposer.
    function isAuthorized(address user) external view returns (bool);
}
