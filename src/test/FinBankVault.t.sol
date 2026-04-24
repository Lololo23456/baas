// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// Tests FinBankVault — Foundry (forge test)
//
// Pour lancer : forge test --match-contract FinBankVaultTest -vvv
// ─────────────────────────────────────────────────────────────────────────────

import "forge-std/Test.sol";
import {FinBankVault} from "../FinBankVault.sol";
import {EASChecker} from "../utils/EASChecker.sol";
import {MarketParams} from "../interfaces/IMorpho.sol";

// ── Mocks ─────────────────────────────────────────────────────────────────────

/// @dev EURC simulé pour les tests.
contract MockEURC {
    string public name     = "Mock EURC";
    string public symbol   = "EURC";
    uint8  public decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function mint(address to, uint256 amount) external {
        balanceOf[to]  += amount;
        totalSupply    += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        return true;
    }
}

/// @dev Morpho Blue simulé : stocke les dépôts et simule le yield.
contract MockMorpho {
    mapping(address => uint256) public deposited;
    uint256 public yieldRate = 0; // Yield additionnel à simuler

    function supply(
        MarketParams memory,
        uint256 assets,
        uint256,
        address onBehalf,
        bytes memory
    ) external returns (uint256, uint256) {
        deposited[onBehalf] += assets;
        return (assets, assets);
    }

    function withdraw(
        MarketParams memory,
        uint256 assets,
        uint256,
        address onBehalf,
        address receiver
    ) external returns (uint256, uint256) {
        deposited[onBehalf] -= assets;
        // Simule le transfert vers le receiver
        // (dans les vrais tests, on mock le transfert EURC aussi)
        return (assets, assets);
    }

    /// @dev Simule l'accrual de yield (appeler depuis les tests).
    function simulateYield(address vault, uint256 additionalAssets) external {
        deposited[vault] += additionalAssets;
    }

    // Morpho position / market views (simplifiées)
    function position(bytes32, address user) external view returns (uint256, uint128, uint128) {
        return (deposited[user], 0, 0);
    }

    function market(bytes32) external view returns (
        uint128, uint128, uint128, uint128, uint128, uint128
    ) {
        return (1e18, 1e18, 0, 0, uint128(block.timestamp), 0);
    }

    function accrueInterest(MarketParams memory) external {}
}

/// @dev EAS simulé : stocke des attestations factices.
contract MockEAS {
    struct MockAttestation {
        bytes32 uid;
        bytes32 schema;
        uint64  time;
        uint64  expirationTime;
        uint64  revocationTime;
        bytes32 refUID;
        address recipient;
        address attester;
        bool    revocable;
        bytes   data;
    }

    mapping(bytes32 => MockAttestation) public attestations;

    function createAttestation(
        bytes32 uid,
        bytes32 schema,
        address recipient,
        address attester
    ) external {
        attestations[uid] = MockAttestation({
            uid:            uid,
            schema:         schema,
            time:           uint64(block.timestamp),
            expirationTime: 0,
            revocationTime: 0,
            refUID:         bytes32(0),
            recipient:      recipient,
            attester:       attester,
            revocable:      true,
            data:           abi.encode(true, true, 1) // kycPassed, amlClear, tier
        });
    }

    function revokeAttestation(bytes32 uid) external {
        attestations[uid].revocationTime = uint64(block.timestamp);
    }

    function getAttestation(bytes32 uid) external view returns (MockAttestation memory) {
        return attestations[uid];
    }

    function isAttestationValid(bytes32 uid) external view returns (bool) {
        return attestations[uid].revocationTime == 0;
    }
}

// ── Test Contract ─────────────────────────────────────────────────────────────

contract FinBankVaultTest is Test {
    MockEURC    eurc;
    MockMorpho  morpho;
    MockEAS     eas;
    EASChecker  checker;
    FinBankVault vault;

    address DAO      = address(0xDA0);
    address TREASURY = address(0x7EA5);
    address ATTESTOR = address(0xA77E570);

    address ALICE    = address(0xA11CE);  // Freelance avec KYC valide
    address BOB      = address(0xB0B);    // Freelance avec KYC valide
    address CHARLIE  = address(0xC);      // Freelance SANS KYC

    bytes32 constant KYC_SCHEMA     = keccak256("finbank.kyc.v1");
    bytes32 constant ALICE_ATT_UID  = keccak256("alice_attestation");
    bytes32 constant BOB_ATT_UID    = keccak256("bob_attestation");

    uint256 constant FEE_BPS = 1_500; // 15%

    function setUp() public {
        // Deploy mocks
        eurc   = new MockEURC();
        morpho = new MockMorpho();
        eas    = new MockEAS();

        // Deploy EASChecker
        checker = new EASChecker(address(eas), KYC_SCHEMA);
        checker.approveAttestor(ATTESTOR);

        // Crée les attestations pour Alice et Bob
        eas.createAttestation(ALICE_ATT_UID, KYC_SCHEMA, ALICE, ATTESTOR);
        eas.createAttestation(BOB_ATT_UID,   KYC_SCHEMA, BOB,   ATTESTOR);

        // Alice et Bob enregistrent leurs attestations
        vm.prank(ALICE);
        checker.registerAttestation(ALICE_ATT_UID);
        vm.prank(BOB);
        checker.registerAttestation(BOB_ATT_UID);

        // Deploy Vault
        MarketParams memory market = MarketParams({
            loanToken:       address(eurc),
            collateralToken: address(0),
            oracle:          address(0),
            irm:             address(0),
            lltv:            0
        });

        vault = new FinBankVault(
            address(eurc),
            address(morpho),
            market,
            address(checker),
            TREASURY,
            FEE_BPS
        );

        // Mint EURC aux utilisateurs
        eurc.mint(ALICE,   1_000_000e6);  // 1M EURC
        eurc.mint(BOB,     500_000e6);    // 500k EURC
        eurc.mint(CHARLIE, 100_000e6);    // 100k EURC (mais sans KYC)

        // Approbation du vault pour dépenser les EURC
        vm.prank(ALICE);
        eurc.approve(address(vault), type(uint256).max);
        vm.prank(BOB);
        eurc.approve(address(vault), type(uint256).max);
        vm.prank(CHARLIE);
        eurc.approve(address(vault), type(uint256).max);
    }

    // ── Tests : Dépôt ─────────────────────────────────────────────────────────

    function test_deposit_withValidKYC() public {
        uint256 depositAmount = 100_000e6;

        vm.prank(ALICE);
        uint256 shares = vault.deposit(depositAmount, ALICE);

        // Premier dépôt : 1 share = 1 asset
        assertEq(shares, depositAmount, "Shares should equal assets on first deposit");
        assertEq(vault.balanceOf(ALICE), depositAmount, "Alice should have shares");
        assertEq(vault.totalSupply(), depositAmount, "Total supply should match");
        assertEq(vault.totalAssets(), depositAmount, "Total assets should match deposit");
    }

    function test_deposit_withoutKYC_reverts() public {
        vm.prank(CHARLIE);
        vm.expectRevert(abi.encodeWithSelector(FinBankVault.NotAuthorized.selector, CHARLIE));
        vault.deposit(10_000e6, CHARLIE);
    }

    function test_deposit_zeroAmount_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankVault.ZeroAmount.selector);
        vault.deposit(0, ALICE);
    }

    function test_multipleDepositors() public {
        vm.prank(ALICE);
        vault.deposit(100_000e6, ALICE);

        vm.prank(BOB);
        vault.deposit(100_000e6, BOB);

        assertEq(vault.totalAssets(), 200_000e6, "Total assets should be 200k");
        // Shares équitables : chacun a 50% du vault
        assertEq(vault.balanceOf(ALICE), vault.balanceOf(BOB), "Equal shares for equal deposits");
    }

    // ── Tests : Retrait ───────────────────────────────────────────────────────

    function test_redeem_fullBalance() public {
        uint256 depositAmount = 100_000e6;

        vm.prank(ALICE);
        uint256 shares = vault.deposit(depositAmount, ALICE);

        // Mock : le vault a les EURC après retrait de Morpho
        eurc.mint(address(vault), depositAmount);

        vm.prank(ALICE);
        uint256 assets = vault.redeem(shares, ALICE, ALICE);

        assertEq(assets, depositAmount, "Should receive full deposit back");
        assertEq(vault.balanceOf(ALICE), 0, "Alice should have no shares left");
    }

    function test_redeem_withoutKYC_succeeds() public {
        // Charlie n'a pas de KYC mais si il avait des shares, il devrait pouvoir retirer
        // Simule: on lui donne des shares directement (cas migration)
        vm.prank(ALICE);
        vault.deposit(100_000e6, CHARLIE); // Alice dépose pour Charlie

        eurc.mint(address(vault), 100_000e6);

        // Charlie PEUT retirer même sans KYC — censure-résistance
        uint256 charlieShares = vault.balanceOf(CHARLIE);
        vm.prank(CHARLIE);
        uint256 assets = vault.redeem(charlieShares, CHARLIE, CHARLIE);

        assertGt(assets, 0, "Charlie should receive assets despite no KYC");
    }

    function test_redeem_exceedsBalance_reverts() public {
        vm.prank(ALICE);
        vault.deposit(100_000e6, ALICE);

        uint256 aliceShares = vault.balanceOf(ALICE);
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(FinBankVault.ExceedsBalance.selector, aliceShares + 1, aliceShares)
        );
        vault.redeem(aliceShares + 1, ALICE, ALICE);
    }

    // ── Tests : Fee Accrual ───────────────────────────────────────────────────

    function test_feeAccrual_onYield() public {
        vm.prank(ALICE);
        vault.deposit(100_000e6, ALICE);

        uint256 initialTreasuryShares = vault.balanceOf(TREASURY);

        // Simule 1000 EURC de yield générés par Morpho
        // (Dans un vrai test fork, on avancerait le temps)
        // Ici on mint directement au vault pour simuler le yield
        eurc.mint(address(vault), 1_000e6);

        // Le prochain dépôt déclenche l'accrual des fees
        eurc.mint(BOB, 1_000e6);
        eurc.approve(address(vault), type(uint256).max);
        vm.prank(BOB);
        vault.deposit(1_000e6, BOB);

        uint256 finalTreasuryShares = vault.balanceOf(TREASURY);
        assertGt(finalTreasuryShares, initialTreasuryShares, "Treasury should have received fee shares");
    }

    function test_feeAccrual_15percent() public {
        vm.prank(ALICE);
        vault.deposit(100_000e6, ALICE);

        // Yield = 1000 EURC → fee = 150 EURC
        eurc.mint(address(vault), 1_000e6);

        // Déclenche l'accrual
        vm.prank(BOB);
        vault.deposit(1_000e6, BOB);

        // La trésorerie doit avoir des shares valant ~150 EURC (15% de 1000)
        uint256 treasuryAssets = vault.convertToAssets(vault.balanceOf(TREASURY));

        // Tolérance de 1% pour les arrondis
        assertApproxEqRel(treasuryAssets, 150e6, 0.01e18, "Treasury should have ~150 EURC worth of shares");
    }

    // ── Tests : Gouvernance ───────────────────────────────────────────────────

    function test_setFee_onlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankVault.NotOwner.selector);
        vault.setFee(2_000);
    }

    function test_setFee_tooHigh_reverts() public {
        vm.expectRevert(
            abi.encodeWithSelector(FinBankVault.FeeTooHigh.selector, 4_000, vault.MAX_FEE_BPS())
        );
        vault.setFee(4_000); // > 30%
    }

    function test_setFee_success() public {
        vault.setFee(2_000); // 20%
        assertEq(vault.feeBps(), 2_000);
    }

    function test_setTreasury_onlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankVault.NotOwner.selector);
        vault.setTreasury(address(0x999));
    }

    // ── Tests : Scénario complet ──────────────────────────────────────────────

    function test_fullScenario_freelanceJourney() public {
        // 1. Alice (freelance) dépose sa paie du mois
        vm.prank(ALICE);
        vault.deposit(5_000e6, ALICE);

        assertEq(vault.totalAssets(), 5_000e6);
        assertGt(vault.balanceOf(ALICE), 0);

        // 2. Le mois suivant, Morpho génère du yield (2% mensuel ~ 100 EURC)
        eurc.mint(address(vault), 100e6);

        // 3. Bob rejoint FinBank et dépose (déclenche l'accrual de fees)
        vm.prank(BOB);
        vault.deposit(5_000e6, BOB);

        // 4. La trésorerie a reçu des fees
        assertGt(vault.balanceOf(TREASURY), 0, "Treasury received fees");

        // 5. Alice retire tout (sans vérification KYC — censure-résistance)
        eurc.mint(address(vault), 5_100e6); // Simule le retrait Morpho
        uint256 aliceShares = vault.balanceOf(ALICE);
        vm.prank(ALICE);
        uint256 aliceReceived = vault.redeem(aliceShares, ALICE, ALICE);

        // Alice reçoit plus que ce qu'elle a déposé (yield)
        assertGt(aliceReceived, 5_000e6, "Alice should receive more than deposited (yield)");
    }

    // ── Tests : Share Dilution check ──────────────────────────────────────────

    function test_sharePrice_increasesWithYield() public {
        vm.prank(ALICE);
        vault.deposit(100_000e6, ALICE);

        uint256 sharePriceBefore = vault.convertToAssets(1e6); // Prix d'1 share

        // Yield
        eurc.mint(address(vault), 5_000e6);

        uint256 sharePriceAfter = vault.convertToAssets(1e6);

        assertGt(sharePriceAfter, sharePriceBefore, "Share price should increase with yield");
    }
}
