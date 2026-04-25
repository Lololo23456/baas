// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// TestFlow.s.sol — Test end-to-end complet sur Base Sepolia
//
// Simule le flux d'un utilisateur FinBank :
//   1. Approuve le deployer comme Attestor KYC (mock)
//   2. Crée une attestation EAS (mock — schema bytes32(0))
//   3. Enregistre l'attestation dans EASChecker
//   4. Approuve le Vault à dépenser des MockEURC
//   5. Dépose 1000 EURC → reçoit des fbEURC shares
//   6. Simule du yield (+50 EURC) via MockMorpho.addYield()
//   7. Vérifie que totalAssets() a augmenté
//   8. Retire 500 EURC (redeem la moitié des shares)
//   9. Claim $FBK accumulés
//  10. Lock 100 $FBK dans VeFBK (1 an)
// ─────────────────────────────────────────────────────────────────────────────

import "forge-std/Script.sol";
import {IEAS, Attestation} from "../interfaces/IEAS.sol";

interface IEASChecker {
    function approveAttestor(address attestor) external;
    function registerAttestation(bytes32 attestationUID) external;
    function isAuthorized(address user) external view returns (bool);
    function kycSchema() external view returns (bytes32);
}

interface IVault {
    function deposit(uint256 assets, address receiver) external returns (uint256);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);
    function balanceOf(address user) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
}

interface IMockEURC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address user) external view returns (uint256);
}

interface IMockMorpho {
    function addYield(address eurc, uint256 amount) external;
}

interface IDistributor {
    function earned(address user) external view returns (uint256);
    function claim() external;
}

interface IVeFBK {
    function createLock(uint256 amount, uint256 lockDuration) external;
    function balanceOf(address user) external view returns (uint256);
}

interface IFBKToken {
    function balanceOf(address user) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// Interface minimale EAS pour créer une attestation
interface IEASAttest {
    struct AttestationRequestData {
        address recipient;
        uint64  expirationTime;
        bool    revocable;
        bytes32 refUID;
        bytes   data;
        uint256 value;
    }
    struct AttestationRequest {
        bytes32 schema;
        AttestationRequestData data;
    }
    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}

interface ISchemaRegistry {
    function register(string calldata schema, address resolver, bool revocable) external returns (bytes32);
}

interface IEASCheckerAdmin {
    function approveAttestor(address attestor) external;
    function updateSchema(bytes32 newSchema) external;
    function registerAttestation(bytes32 attestationUID) external;
    function isAuthorized(address user) external view returns (bool);
}

contract TestFlow is Script {

    // ── Adresses déployées sur Base Sepolia ───────────────────────────────────
    address constant MOCK_EURC      = 0x914bD84678ABc7ace192ba0f27Ac7a5e5920e218;
    address constant MOCK_MORPHO    = 0xcf235aA8485bddCCB8d276a8AC97bD78521974ca;
    address constant EAS_CHECKER    = 0x7E069926A4cf1D6EaF6FA8823c91B356CDCC1b03;
    address constant FBK_TOKEN      = 0x9B0a0f72D836AcD51DAD8efE31aa667569090F18;
    address constant VAULT          = 0x5C763aA7536BF5D67155553BD709Ca66187CDfDd;
    address constant VE_FBK         = 0x977f97eb4d637BE63fFec069329673358acF4A6F;
    address constant DISTRIBUTOR    = 0xeba8C8720cc1fA0AC51bE9F618ebEe9d1ecFBc3f;
    address constant EAS            = 0x4200000000000000000000000000000000000021;
    address constant EAS_REGISTRY   = 0x4200000000000000000000000000000000000020;

    function run() external {
        uint256 deployerPK = vm.envUint("DEPLOYER_PK");
        address deployer   = vm.addr(deployerPK);

        console.log("=== FinBank End-to-End Test Flow ===");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPK);

        // ── 1-4. KYC (idempotent — skip si déjà autorisé) ────────────────────
        bool authorized = IEASCheckerAdmin(EAS_CHECKER).isAuthorized(deployer);
        if (!authorized) {
            console.log("1. KYC non configure - voir setup_kyc.sh pour les etapes manuelles");
            console.log("   Deployer non autorise. Arreter le script ici.");
            vm.stopBroadcast();
            return;
        }
        console.log("1-4. KYC OK - deployer deja autorise");
        console.log("   isAuthorized:", authorized);

        // ── 5. Mint + Approve EURC ────────────────────────────────────────────
        console.log("5. Mint 10 000 MockEURC supplementaires...");
        IMockEURC(MOCK_EURC).mint(deployer, 10_000 * 1e6);
        uint256 eurcBalance = IMockEURC(MOCK_EURC).balanceOf(deployer);
        console.log("   Solde EURC deployer:", eurcBalance / 1e6, "EURC");

        IMockEURC(MOCK_EURC).approve(VAULT, type(uint256).max);
        console.log("   Vault approuve pour depenser EURC");

        // ── 6. Dépôt 1000 EURC → fbEURC ──────────────────────────────────────
        console.log("6. Depot de 1000 EURC dans le Vault...");
        uint256 depositAmount = 1_000 * 1e6; // 1000 EURC
        uint256 totalBefore   = IVault(VAULT).totalAssets();
        uint256 sharesReceived = IVault(VAULT).deposit(depositAmount, deployer);
        uint256 totalAfter    = IVault(VAULT).totalAssets();
        console.log("   Shares fbEURC recues:", sharesReceived);
        console.log("   totalAssets avant:", totalBefore);
        console.log("   totalAssets apres:", totalAfter);

        // ── 7. Simule du yield via MockMorpho ─────────────────────────────────
        console.log("7. Simulation yield +50 EURC via MockMorpho...");
        uint256 yieldAmount = 50 * 1e6;
        IMockEURC(MOCK_EURC).approve(MOCK_MORPHO, yieldAmount);
        IMockMorpho(MOCK_MORPHO).addYield(MOCK_EURC, yieldAmount);
        uint256 totalWithYield = IVault(VAULT).totalAssets();
        console.log("   totalAssets avec yield:", totalWithYield);
        console.log("   Yield genere:", totalWithYield - totalAfter, "EURC (6 dec)");

        // ── 8. Vérifie la valeur des shares ───────────────────────────────────
        console.log("8. Verification valeur des shares...");
        uint256 sharesValue = IVault(VAULT).convertToAssets(sharesReceived);
        console.log("   Valeur shares (EURC 6 dec):", sharesValue);

        // ── 9. Retrait 50% des shares ─────────────────────────────────────────
        console.log("9. Retrait de 50% des shares...");
        uint256 sharesToRedeem = sharesReceived / 2;
        uint256 eurcBefore     = IMockEURC(MOCK_EURC).balanceOf(deployer);
        uint256 assetsReturned = IVault(VAULT).redeem(sharesToRedeem, deployer, deployer);
        uint256 eurcAfter      = IMockEURC(MOCK_EURC).balanceOf(deployer);
        console.log("   Shares brulee:", sharesToRedeem);
        console.log("   EURC recu:", assetsReturned);
        console.log("   Solde EURC apres retrait:", eurcAfter / 1e6, "EURC");

        // ── 10. Claim $FBK ────────────────────────────────────────────────────
        console.log("10. Claim $FBK accumules...");
        uint256 pendingFBK = IDistributor(DISTRIBUTOR).earned(deployer);
        console.log("   FBK en attente:", pendingFBK / 1e18, "FBK");
        if (pendingFBK > 0) {
            IDistributor(DISTRIBUTOR).claim();
            uint256 fbkBalance = IFBKToken(FBK_TOKEN).balanceOf(deployer);
            console.log("   FBK recu:", fbkBalance / 1e18, "FBK");
        } else {
            console.log("   (0 FBK - normal si pas de temps ecoule)");
        }

        // ── 11. Lock $FBK dans VeFBK ──────────────────────────────────────────
        console.log("11. Lock $FBK dans VeFBK (1 an)...");
        uint256 fbkBalance = IFBKToken(FBK_TOKEN).balanceOf(deployer);
        if (fbkBalance >= 100e18) {
            IFBKToken(FBK_TOKEN).approve(VE_FBK, 100e18);
            IVeFBK(VE_FBK).createLock(100e18, 365 * 86400);
            uint256 veFBKBalance = IVeFBK(VE_FBK).balanceOf(deployer);
            console.log("    veFBK obtenu:", veFBKBalance / 1e18);
        } else {
            console.log("    Pas assez de FBK pour le lock (normal si 0 sec ecoule)");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== TEST FLOW COMPLETE ===");
        console.log("Verifier les transactions sur :");
        console.log("https://sepolia.basescan.org/address/0x5C763aA7536BF5D67155553BD709Ca66187CDfDd");
    }
}
