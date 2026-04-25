// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {MarketParams, Id, Position, Market} from "../interfaces/IMorpho.sol";

// MockMorpho — Simule Morpho Blue pour les tests Sepolia.
//
// Comportement :
//   supply()   → prend les tokens, les garde, incrémente la position
//   withdraw() → rend les tokens + yield simulé
//   addYield() → le testeur peut injecter du yield pour simuler des intérêts
//
// Ne pas utiliser en production.

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MockMorpho {

    // Dépôts par (marketId, user) en assets
    mapping(bytes32 => mapping(address => uint256)) public deposits;

    // Yield injecté par marché (pour les tests)
    mapping(bytes32 => uint256) public yieldPool;

    // Pour simuler les shares Morpho : on utilise un ratio 1:1 simplifié
    // totalSupplyAssets et totalSupplyShares par marché
    mapping(bytes32 => uint256) public totalSupplyAssets;
    mapping(bytes32 => uint256) public totalSupplyShares;

    function _id(MarketParams memory params) internal pure returns (bytes32) {
        return keccak256(abi.encode(params));
    }

    // Dépose des assets dans le marché.
    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256, // shares — ignoré dans le mock
        address onBehalf,
        bytes memory // data — ignoré
    ) external returns (uint256 assetsSupplied, uint256 sharesSupplied) {
        bytes32 id = _id(marketParams);
        address token = marketParams.loanToken;

        IERC20(token).transferFrom(msg.sender, address(this), assets);

        deposits[id][onBehalf]  += assets;
        totalSupplyAssets[id]   += assets;
        totalSupplyShares[id]   += assets; // ratio 1:1 initial

        return (assets, assets);
    }

    // Retire des assets du marché.
    function withdraw(
        MarketParams memory marketParams,
        uint256 assets,
        uint256, // shares — ignoré
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn) {
        bytes32 id = _id(marketParams);
        address token = marketParams.loanToken;

        // Calcule la part de yield due à cet utilisateur
        uint256 userDeposit = deposits[id][onBehalf];
        uint256 totalDeposits = totalSupplyAssets[id];
        uint256 userYield = 0;
        if (totalDeposits > 0 && yieldPool[id] > 0) {
            userYield = (yieldPool[id] * userDeposit) / totalDeposits;
        }

        uint256 totalOwed = userDeposit + userYield;
        require(assets <= totalOwed, "MockMorpho: insufficient balance");

        deposits[id][onBehalf]  -= assets > userDeposit ? userDeposit : assets;
        totalSupplyAssets[id]   = totalSupplyAssets[id] > assets ? totalSupplyAssets[id] - assets : 0;
        totalSupplyShares[id]   = totalSupplyShares[id] > assets ? totalSupplyShares[id] - assets : 0;
        if (userYield > 0) yieldPool[id] -= userYield;

        IERC20(token).transfer(receiver, assets);

        return (assets, assets);
    }

    // Simule la position d'un utilisateur (shares, borrowShares, collateral).
    function position(Id id, address user) external view returns (Position memory) {
        bytes32 raw = Id.unwrap(id);
        return Position({
            supplyShares: deposits[raw][user],
            borrowShares: 0,
            collateral:   0
        });
    }

    // Retourne l'état du marché.
    function market(Id id) external view returns (Market memory) {
        bytes32 raw = Id.unwrap(id);
        return Market({
            totalSupplyAssets: uint128(totalSupplyAssets[raw]),
            totalSupplyShares: uint128(totalSupplyShares[raw]),
            totalBorrowAssets: 0,
            totalBorrowShares: 0,
            lastUpdate:        uint128(block.timestamp),
            fee:               0
        });
    }

    // ── Test helpers ──────────────────────────────────────────────────────────

    // Injecte du yield dans un marché (simule des intérêts Morpho).
    function addYield(MarketParams memory marketParams, uint256 amount) external {
        bytes32 id = _id(marketParams);
        address token = marketParams.loanToken;
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        yieldPool[id]          += amount;
        totalSupplyAssets[id]  += amount;
    }

    // Surcharge simplifiée pour les tests : injecte du yield sur le marché
    // {loanToken, 0, 0, 0, 0} (params Sepolia/testnet).
    function addYield(address loanToken, uint256 amount) external {
        MarketParams memory params = MarketParams({
            loanToken:       loanToken,
            collateralToken: address(0),
            oracle:          address(0),
            irm:             address(0),
            lltv:            0
        });
        bytes32 id = _id(params);
        IERC20(loanToken).transferFrom(msg.sender, address(this), amount);
        yieldPool[id]          += amount;
        totalSupplyAssets[id]  += amount;
    }

    // Retourne le total d'assets d'un déposant (dépôt + sa part de yield).
    function assetsOf(MarketParams memory marketParams, address user) external view returns (uint256) {
        bytes32 id = _id(marketParams);
        uint256 userDeposit   = deposits[id][user];
        uint256 totalDeposits = totalSupplyAssets[id];
        if (totalDeposits == 0) return 0;
        uint256 userYield = (yieldPool[id] * userDeposit) / totalDeposits;
        return userDeposit + userYield;
    }
}
