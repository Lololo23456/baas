// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// Morpho Blue — Interface minimale pour FinBank
// Source officielle : https://github.com/morpho-org/morpho-blue
// ─────────────────────────────────────────────────────────────────────────────

type Id is bytes32;

/// @notice Paramètres qui définissent un marché Morpho Blue de manière unique.
/// @dev L'Id du marché = keccak256(abi.encode(MarketParams))
struct MarketParams {
    address loanToken;       // Token prêté/emprunté (ex: EURC)
    address collateralToken; // Token de collatéral (address(0) pour supply-only)
    address oracle;          // Oracle de prix
    address irm;             // Interest Rate Model
    uint256 lltv;            // Loan-to-Value liquidation threshold (en WAD, 1e18 = 100%)
}

/// @notice Position d'un utilisateur sur un marché.
struct Position {
    uint256 supplyShares; // Parts de liquidité déposée (accrues avec les intérêts)
    uint128 borrowShares; // Parts d'emprunt (non utilisé pour FinBank en V1)
    uint128 collateral;   // Collatéral déposé (non utilisé pour FinBank en V1)
}

/// @notice État global d'un marché Morpho Blue.
struct Market {
    uint128 totalSupplyAssets; // Total d'assets déposés (incluant intérêts)
    uint128 totalSupplyShares; // Total de shares émises
    uint128 totalBorrowAssets; // Total d'assets empruntés
    uint128 totalBorrowShares; // Total de shares d'emprunt
    uint128 lastUpdate;        // Timestamp de la dernière mise à jour
    uint128 fee;               // Frais du protocole Morpho (en WAD)
}

interface IMorpho {
    /// @notice Dépose des assets dans un marché Morpho Blue.
    /// @param marketParams Paramètres du marché cible.
    /// @param assets Montant d'assets à déposer (0 si on spécifie shares).
    /// @param shares Montant de shares à recevoir (0 si on spécifie assets).
    /// @param onBehalf Adresse qui recevra les shares.
    /// @param data Données de callback (vide si pas de callback).
    /// @return assetsDeposited Montant réel d'assets déposés.
    /// @return sharesReceived Montant de shares reçues.
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsDeposited, uint256 sharesReceived);

    /// @notice Retire des assets d'un marché Morpho Blue.
    /// @param marketParams Paramètres du marché.
    /// @param assets Montant d'assets à retirer (0 si on spécifie shares).
    /// @param shares Montant de shares à brûler (0 si on spécifie assets).
    /// @param onBehalf Adresse dont on brûle les shares.
    /// @param receiver Adresse qui reçoit les assets retirés.
    /// @return assetsWithdrawn Montant réel d'assets retirés.
    /// @return sharesBurned Montant de shares brûlées.
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesBurned);

    /// @notice Retourne la position d'une adresse sur un marché.
    function position(Id id, address user) external view returns (Position memory p);

    /// @notice Retourne l'état global d'un marché.
    function market(Id id) external view returns (Market memory m);

    /// @notice Accrues les intérêts d'un marché (mise à jour manuelle).
    function accrueInterest(MarketParams memory marketParams) external;
}
