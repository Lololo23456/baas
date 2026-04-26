// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// UpgradeChecker — Déploie un nouvel EASChecker (avec allowlist/selfRegister)
//                  et met à jour le FinBankVault via setChecker().
//
// Utilisation :
//   forge script src/script/UpgradeChecker.s.sol \
//     --rpc-url $BASE_SEPOLIA_RPC_URL \
//     --private-key $DEPLOYER_PK \
//     --broadcast
// ─────────────────────────────────────────────────────────────────────────────

import "forge-std/Script.sol";
import {EASChecker}  from "../utils/EASChecker.sol";
import {FinBankVault} from "../FinBankVault.sol";

contract UpgradeChecker is Script {

    // ── Adresses Sepolia (ne pas modifier) ───────────────────────────────────

    address constant EAS_SEPOLIA     = 0x4200000000000000000000000000000000000021;
    bytes32 constant KYC_SCHEMA      = bytes32(uint256(1)); // schema factice pour Sepolia

    // Vault déployé (2ème déploiement corrigé)
    address constant VAULT           = 0x5C763aA7536BF5D67155553BD709Ca66187CDfDd;

    function run() external {
        vm.startBroadcast();

        // 1. Déploie le nouveau EASChecker avec allowlist/selfRegister
        EASChecker newChecker = new EASChecker(EAS_SEPOLIA, KYC_SCHEMA);
        console.log("New EASChecker deployed at:", address(newChecker));

        // 2. Met à jour le Vault pour pointer vers ce nouveau checker
        FinBankVault(VAULT).setChecker(address(newChecker));
        console.log("Vault checker updated to:", address(newChecker));

        vm.stopBroadcast();
    }
}
