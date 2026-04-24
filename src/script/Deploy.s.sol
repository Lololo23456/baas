// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// Script de déploiement FinBank — Base Mainnet
//
// Usage :
//   forge script script/Deploy.s.sol \
//     --rpc-url $BASE_RPC_URL \
//     --private-key $DEPLOYER_PK \
//     --broadcast \
//     --verify \
//     --etherscan-api-key $BASESCAN_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

import "forge-std/Script.sol";
import {FinBankVault} from "../FinBankVault.sol";
import {EASChecker} from "../utils/EASChecker.sol";
import {MarketParams} from "../interfaces/IMorpho.sol";

contract DeployFinBank is Script {

    // ── Adresses Base Mainnet ─────────────────────────────────────────────────

    address constant EURC_BASE    = 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42;
    address constant MORPHO_BASE  = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
    address constant EAS_BASE     = 0x4200000000000000000000000000000000000021;

    // ── Paramètres FinBank ────────────────────────────────────────────────────

    // Schema UID pour les attestations KYC FinBank
    // À créer via app.eas.eth avant le déploiement
    // Format : (bool kycPassed, bool amlClear, uint8 tier)
    bytes32 constant KYC_SCHEMA = bytes32(0); // TODO: remplacer après création du schema

    // Adresse de la trésorerie DAO (multisig Gnosis Safe)
    address constant TREASURY = address(0); // TODO: remplacer par l'adresse du Safe

    // Protocol fee initiale : 15%
    uint256 constant FEE_BPS = 1_500;

    // Premier Attestor agréé (ex: Synaps)
    address constant INITIAL_ATTESTOR = address(0); // TODO: adresse Synaps

    // Marché Morpho Blue EURC (à vérifier sur morpho.xyz/base)
    // Ces params doivent correspondre EXACTEMENT au marché existant sur Base
    MarketParams EURC_MARKET = MarketParams({
        loanToken:       EURC_BASE,
        collateralToken: address(0),  // Supply-only market
        oracle:          address(0),  // Pas d'oracle nécessaire pour supply-only
        irm:             address(0),  // IRM du marché (à récupérer sur morpho.xyz)
        lltv:            0            // LLTV (à récupérer sur morpho.xyz)
    });

    // ── Deploy ────────────────────────────────────────────────────────────────

    function run() external {
        uint256 deployerPK = vm.envUint("DEPLOYER_PK");
        address deployer   = vm.addr(deployerPK);

        console.log("=== FinBank Deployment ===");
        console.log("Deployer  :", deployer);
        console.log("Network   : Base Mainnet");
        console.log("EURC      :", EURC_BASE);
        console.log("Morpho    :", MORPHO_BASE);
        console.log("EAS       :", EAS_BASE);

        vm.startBroadcast(deployerPK);

        // 1. Déploiement EASChecker
        EASChecker checker = new EASChecker(EAS_BASE, KYC_SCHEMA);
        console.log("EASChecker deployed :", address(checker));

        // 2. Ajout du premier Attestor
        if (INITIAL_ATTESTOR != address(0)) {
            checker.approveAttestor(INITIAL_ATTESTOR);
            console.log("Attestor approved   :", INITIAL_ATTESTOR);
        }

        // 3. Déploiement du Vault
        FinBankVault vault = new FinBankVault(
            EURC_BASE,
            MORPHO_BASE,
            EURC_MARKET,
            address(checker),
            TREASURY,
            FEE_BPS
        );
        console.log("FinBankVault deployed:", address(vault));

        // 4. Transfert du ownership vers la DAO (multisig)
        //    NE PAS faire ça avant de vérifier que le Safe est bien configuré
        // vault.transferOwnership(TREASURY);
        // checker.transferOwnership(TREASURY);

        vm.stopBroadcast();

        console.log("\n=== Summary ===");
        console.log("EASChecker :", address(checker));
        console.log("Vault      :", address(vault));
        console.log("Treasury   :", TREASURY);
        console.log("Fee        : 15%");
        console.log("\nNext steps:");
        console.log("1. Create KYC schema on app.eas.eth");
        console.log("2. Update KYC_SCHEMA constant and redeploy");
        console.log("3. Configure Gnosis Safe as owner");
        console.log("4. Call transferOwnership() on both contracts");
        console.log("5. Verify contracts on Basescan");
    }
}
