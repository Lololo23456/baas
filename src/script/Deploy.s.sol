// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// Script de déploiement FinBank — Base Mainnet / Base Sepolia
//
// Ordre de déploiement :
//   1. CoinbaseEASChecker — vérificateur KYC via Coinbase Verifications (EAS)
//   2. FBKToken           — token de gouvernance $FBK (deployer = minter temporaire)
//   3. FinBankVault       — vault ERC-4626 sur Morpho Blue
//   4. VeFBK              — staking vote-escrowed (modèle Curve)
//   5. FBKDistributor     — distribution $FBK aux déposants
//   6. FinBankGovernor    — gouvernance on-chain avec timelock
//
// Post-déploiement (appelé dans ce script) :
//   - fbk.setMinter(distributor)       — Fair Launch : seul le distributor peut minter
//   - vault.setDistributor(distributor) — connecte le vault au distributor
//   - checker.transferOwnership(Safe)  — (décommenté avant mainnet)
//   - vault.transferOwnership(Safe)    — (décommenté avant mainnet)
//   - fbk.transferOwnership(governor)  — (décommenté avant mainnet)
//
// Usage Base Sepolia (testnet) :
//   forge script src/script/Deploy.s.sol \
//     --rpc-url $BASE_SEPOLIA_RPC_URL \
//     --private-key $DEPLOYER_PK \
//     --broadcast
//
// Usage Base Mainnet :
//   forge script src/script/Deploy.s.sol \
//     --rpc-url $BASE_RPC_URL \
//     --private-key $DEPLOYER_PK \
//     --broadcast \
//     --verify \
//     --etherscan-api-key $BASESCAN_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

import "forge-std/Script.sol";
import {FinBankVault}         from "../FinBankVault.sol";
import {FBKToken}             from "../FBKToken.sol";
import {VeFBK}                from "../VeFBK.sol";
import {FBKDistributor}       from "../FBKDistributor.sol";
import {FinBankGovernor}      from "../FinBankGovernor.sol";
import {CoinbaseEASChecker}   from "../utils/CoinbaseEASChecker.sol";
import {EASChecker}           from "../utils/EASChecker.sol";
import {MarketParams}         from "../interfaces/IMorpho.sol";
import {MockERC20}            from "../mocks/MockERC20.sol";
import {MockMorpho}           from "../mocks/MockMorpho.sol";

contract DeployFinBank is Script {

    // ── Adresses Base Mainnet ─────────────────────────────────────────────────

    address constant EURC_MAINNET   = 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42;
    address constant MORPHO_MAINNET = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
    address constant EAS_MAINNET    = 0x4200000000000000000000000000000000000021;

    // Coinbase Verifications — Base Mainnet (github.com/coinbase/verifications)
    address constant CB_INDEXER_MAINNET  = 0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C;
    address constant CB_ATTESTER_MAINNET = 0x357458739F90461b99789350868CD7CF330Dd7EE;
    bytes32 constant CB_SCHEMA_MAINNET   = 0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9;

    // ── Adresses Base Sepolia ─────────────────────────────────────────────────
    // Sur Sepolia : MockERC20 + MockMorpho déployés par ce script.
    // EAS est à la même adresse sur Sepolia et Mainnet.

    address constant EAS_SEPOLIA = 0x4200000000000000000000000000000000000021;

    // Coinbase Verifications — Base Sepolia
    address constant CB_INDEXER_SEPOLIA  = 0xd147a19c3B085Fb9B0c15D2EAAFC6CB086ea849B;
    address constant CB_ATTESTER_SEPOLIA = 0xB5644397a9733f86Cacd928478B29b4cD6041C45;
    bytes32 constant CB_SCHEMA_SEPOLIA   = 0x2f34a2ffe5f87b2f45fbc7c784896b768d77261e2f24f77341ae43751c765a69;

    // ── Paramètres FinBank ────────────────────────────────────────────────────

    // Adresse de la trésorerie DAO (multisig Gnosis Safe — à créer avant mainnet).
    address constant TREASURY = address(0); // TODO: adresse du Safe

    // Protocol fee initiale : 15%.
    uint256 constant FEE_BPS = 1_500;

    // ── Paramètres de gouvernance ─────────────────────────────────────────────
    // Base produit ~1 bloc toutes les 2 secondes.

    // Délai entre la création d'une proposition et l'ouverture du vote (~4h sur Base).
    uint256 constant VOTING_DELAY     = 7_200;

    // Durée de la fenêtre de vote (~7 jours sur Base).
    uint256 constant VOTING_PERIOD    = 302_400;

    // Délai de timelock avant exécution (2 jours).
    uint256 constant TIMELOCK_DELAY   = 2 * 86_400;

    // Quorum : 4% du totalLocked veFBK.
    uint256 constant QUORUM_BPS       = 400;

    // Minimum de veFBK pour soumettre une proposition.
    uint256 constant PROPOSAL_THRESHOLD = 10_000e18;

    // ── Paramètres FBKDistributor ─────────────────────────────────────────────

    // Taux initial de distribution : ~3.15M FBK/an (~10% du supply la première année).
    // Ajustable par la DAO via setRewardRate().
    uint256 constant INITIAL_REWARD_RATE = 0.1e18; // 0.1 FBK/seconde

    // ── Marché Morpho Blue ────────────────────────────────────────────────────
    // Vérifier les params exacts sur morpho.xyz/base avant le déploiement mainnet.
    // Sur Sepolia : laisser à zéro et utiliser un marché de test.

    function _eurcMarket(address eurc) internal pure returns (MarketParams memory) {
        return MarketParams({
            loanToken:       eurc,
            collateralToken: address(0), // Supply-only market
            oracle:          address(0), // TODO: oracle mainnet
            irm:             address(0), // TODO: IRM mainnet (recuperer sur morpho.xyz)
            lltv:            0           // TODO: LLTV mainnet
        });
    }

    // ── Deploy ────────────────────────────────────────────────────────────────

    function run() external {
        uint256 deployerPK = vm.envUint("DEPLOYER_PK");
        address deployer   = vm.addr(deployerPK);

        // Détection réseau via chainId (Base Mainnet = 8453, Base Sepolia = 84532)
        bool isMainnet = block.chainid == 8453;

        address eas = EAS_MAINNET; // même adresse sur Sepolia et Mainnet

        console.log("=== FinBank Full Deployment ===");
        console.log("Deployer :", deployer);
        console.log("Network  :", isMainnet ? "Base Mainnet" : "Base Sepolia (testnet)");
        console.log("ChainId  :", block.chainid);
        console.log("");

        vm.startBroadcast(deployerPK);

        // ── Mocks Sepolia (EURC + Morpho) ─────────────────────────────────────
        address eurc;
        address morpho;

        if (isMainnet) {
            eurc   = EURC_MAINNET;
            morpho = MORPHO_MAINNET;
            console.log("EURC     :", eurc);
            console.log("Morpho   :", morpho);
        } else {
            // Déploie un faux EURC (6 décimales comme le vrai) et un faux Morpho.
            MockERC20  mockEurc   = new MockERC20("USD Coin (Mock)", "EURC", 6);
            MockMorpho mockMorpho = new MockMorpho();
            eurc   = address(mockEurc);
            morpho = address(mockMorpho);

            // Minte 1 000 000 EURC au deployer pour les tests.
            mockEurc.mint(deployer, 1_000_000 * 1e6);

            console.log("MockERC20 (EURC) :", eurc);
            console.log("MockMorpho       :", morpho);
            console.log("Minted 1 000 000 MockEURC to deployer");
        }
        console.log("");

        // ── 1. EASChecker (Sepolia) / CoinbaseEASChecker (Mainnet) ───────────
        // Sepolia : EASChecker avec allowlist + selfRegister() — pour tests sans KYC réel.
        // Mainnet : CoinbaseEASChecker via Coinbase Verifications (coinbase.com/onchain-verify).
        address checker;
        if (isMainnet) {
            CoinbaseEASChecker cbChecker = new CoinbaseEASChecker(
                eas,
                CB_INDEXER_MAINNET,
                CB_ATTESTER_MAINNET,
                CB_SCHEMA_MAINNET
            );
            checker = address(cbChecker);
            console.log("1. CoinbaseEASChecker:", checker);
            console.log("   Indexer           :", CB_INDEXER_MAINNET);
            console.log("   Attester          :", CB_ATTESTER_MAINNET);
        } else {
            // Schema factice sur Sepolia — la vérif EAS est bypassed via selfRegister()
            EASChecker easChecker = new EASChecker(eas, bytes32(uint256(1)));
            checker = address(easChecker);
            console.log("1. EASChecker (Sepolia, allowlist mode):", checker);
            console.log("   Tip: call selfRegister() to get KYC access on testnet");
        }

        // ── 2. FBKToken ───────────────────────────────────────────────────────
        // Le deployer est minter temporaire — sera remplacé par FBKDistributor.
        FBKToken fbk = new FBKToken(deployer);
        console.log("2. FBKToken        :", address(fbk));

        // ── 3. FinBankVault ───────────────────────────────────────────────────
        address effectiveTreasury = TREASURY != address(0) ? TREASURY : deployer;
        FinBankVault vault = new FinBankVault(
            eurc,
            morpho,
            _eurcMarket(eurc),
            address(checker),
            effectiveTreasury,
            FEE_BPS
        );
        console.log("3. FinBankVault    :", address(vault));

        // ── 4. VeFBK ─────────────────────────────────────────────────────────
        VeFBK veFBK = new VeFBK(address(fbk));
        console.log("4. VeFBK           :", address(veFBK));

        // ── 5. FBKDistributor ─────────────────────────────────────────────────
        FBKDistributor distributor = new FBKDistributor(
            address(fbk),
            address(vault),
            INITIAL_REWARD_RATE
        );
        console.log("5. FBKDistributor  :", address(distributor));

        // ── 6. FinBankGovernor ────────────────────────────────────────────────
        FinBankGovernor governor = new FinBankGovernor(
            address(veFBK),
            VOTING_DELAY,
            VOTING_PERIOD,
            TIMELOCK_DELAY,
            QUORUM_BPS,
            PROPOSAL_THRESHOLD
        );
        console.log("6. FinBankGovernor :", address(governor));

        // ── Connexions post-déploiement ───────────────────────────────────────

        // Fair Launch : le FBKDistributor devient le seul minter autorisé.
        fbk.setMinter(address(distributor));
        console.log("\nMinter set to FBKDistributor (Fair Launch)");

        // Le Vault notifie le Distributor à chaque dépôt/retrait.
        vault.setDistributor(address(distributor));
        console.log("Distributor connected to Vault");

        // ── Transfert de ownership vers la DAO ───────────────────────────────
        // DECOMMENTER avant mainnet, après vérification du Safe.
        //
        // checker.transferOwnership(address(governor));
        // vault.transferOwnership(address(governor));
        // fbk.transferOwnership(address(governor));
        // distributor.transferOwnership(address(governor));
        //
        // NOTE : transférer directement vers le Governor (pas le Safe) permet
        // à la DAO de tout contrôler on-chain. Garder le Safe comme backup
        // via une première proposition DAO si nécessaire.

        vm.stopBroadcast();

        // ── Résumé final ──────────────────────────────────────────────────────

        console.log("\n=== Deployment Summary ===");
        console.log("Network              :", isMainnet ? "Base Mainnet" : "Base Sepolia");
        console.log("EURC                 :", eurc);
        console.log("Morpho               :", morpho);
        console.log("EASChecker/Coinbase  :", checker);
        console.log("FBKToken        :", address(fbk));
        console.log("FinBankVault    :", address(vault));
        console.log("VeFBK           :", address(veFBK));
        console.log("FBKDistributor  :", address(distributor));
        console.log("FinBankGovernor :", address(governor));
        console.log("Treasury        :", effectiveTreasury);
        console.log("Fee             : 15%");
        console.log("Reward rate     : 0.1 FBK/sec (~3.15M FBK/an)");

        console.log("\n=== Checklist avant mainnet ===");
        console.log("[ ] Configurer le Gnosis Safe (TREASURY)");
        console.log("[ ] Verifier coinbase.com/onchain-verify fonctionne sur mainnet");
        console.log("[ ] Decommmenter les transferOwnership() et redeployer");
        console.log("[ ] Verifier les contrats sur Basescan");
        console.log("[ ] Audit externe complet");
        console.log("[ ] Note: users doivent aller sur coinbase.com/onchain-verify avant de deposer");
    }
}
