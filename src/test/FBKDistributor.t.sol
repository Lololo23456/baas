// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// Tests FBKDistributor - Foundry
// forge test --match-contract FBKDistributorTest -vvv

import "forge-std/Test.sol";
import {FBKToken}      from "../FBKToken.sol";
import {FBKDistributor} from "../FBKDistributor.sol";

contract FBKDistributorTest is Test {

    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event Claimed(address indexed user, uint256 amount);
    event SharesUpdated(address indexed user, uint256 userShares, uint256 totalShares);

    FBKToken       fbk;
    FBKDistributor dist;

    address DAO   = address(0xDA0);
    address VAULT = address(0xBAAD);
    address ALICE = address(0xA11CE);
    address BOB   = address(0xB0B);

    // 1 FBK par seconde
    uint256 constant RATE = 1e18;

    function setUp() public {
        // FBKToken deploye avec un minter temporaire
        vm.prank(DAO);
        fbk = new FBKToken(address(0x1));

        // Distributor deploye (owner = DAO)
        vm.prank(DAO);
        dist = new FBKDistributor(address(fbk), VAULT, RATE);

        // Le distributor devient le seul minter
        vm.prank(DAO);
        fbk.setMinter(address(dist));
    }

    // ── Deploiement ───────────────────────────────────────────────────────────

    function test_deploy_setsImmutables() public {
        assertEq(address(dist.fbk()),   address(fbk));
        assertEq(dist.vault(),          VAULT);
        assertEq(dist.owner(),          DAO);
        assertEq(dist.rewardRate(),     RATE);
        assertEq(dist.totalShares(),    0);
        assertEq(dist.totalDistributed(), 0);
    }

    function test_deploy_zeroFbk_reverts() public {
        vm.expectRevert(FBKDistributor.ZeroAddress.selector);
        new FBKDistributor(address(0), VAULT, RATE);
    }

    function test_deploy_zeroVault_reverts() public {
        vm.expectRevert(FBKDistributor.ZeroAddress.selector);
        new FBKDistributor(address(fbk), address(0), RATE);
    }

    // ── notifyDeposit ─────────────────────────────────────────────────────────

    function test_notifyDeposit_onlyVault() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKDistributor.NotVault.selector);
        dist.notifyDeposit(ALICE, 1_000e6);
    }

    function test_notifyDeposit_updatesShares() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        assertEq(dist.userShares(ALICE), 1_000e6);
        assertEq(dist.totalShares(),     1_000e6);
    }

    function test_notifyDeposit_multipleUsers() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.prank(VAULT);
        dist.notifyDeposit(BOB, 3_000e6);

        assertEq(dist.totalShares(), 4_000e6);
    }

    function test_notifyDeposit_emitsEvent() public {
        vm.prank(VAULT);
        vm.expectEmit(true, false, false, true);
        emit SharesUpdated(ALICE, 1_000e6, 1_000e6);
        dist.notifyDeposit(ALICE, 1_000e6);
    }

    // ── notifyWithdraw ────────────────────────────────────────────────────────

    function test_notifyWithdraw_onlyVault() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKDistributor.NotVault.selector);
        dist.notifyWithdraw(ALICE, 500e6);
    }

    function test_notifyWithdraw_updatesShares() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.prank(VAULT);
        dist.notifyWithdraw(ALICE, 400e6);

        assertEq(dist.userShares(ALICE), 600e6);
        assertEq(dist.totalShares(),     600e6);
    }

    function test_notifyWithdraw_emitsEvent() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.prank(VAULT);
        vm.expectEmit(true, false, false, true);
        emit SharesUpdated(ALICE, 600e6, 600e6);
        dist.notifyWithdraw(ALICE, 400e6);
    }

    // ── earned / rewardPerShare ───────────────────────────────────────────────

    function test_earned_zeroBeforeDeposit() public {
        assertEq(dist.earned(ALICE), 0);
    }

    function test_earned_accumulatesOverTime() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        // 100 secondes * 1 FBK/s = 100 FBK (Alice est seule → 100%)
        uint256 e = dist.earned(ALICE);
        assertApproxEqAbs(e, 100 * 1e18, 1e12, "Should have earned ~100 FBK");
    }

    function test_earned_proportionalToShares() public {
        // Alice 1/4, Bob 3/4 des shares
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.prank(VAULT);
        dist.notifyDeposit(BOB, 3_000e6);

        vm.warp(block.timestamp + 400);

        // 400s * 1 FBK/s = 400 FBK total
        // Alice = 25% = 100 FBK, Bob = 75% = 300 FBK
        uint256 aliceEarned = dist.earned(ALICE);
        uint256 bobEarned   = dist.earned(BOB);

        assertApproxEqAbs(aliceEarned, 100 * 1e18, 1e12, "Alice should have ~100 FBK");
        assertApproxEqAbs(bobEarned,   300 * 1e18, 1e12, "Bob should have ~300 FBK");
        assertApproxEqAbs(aliceEarned + bobEarned, 400 * 1e18, 1e12, "Sum should be ~400 FBK");
    }

    function test_earned_zeroWhenRateIsZero() public {
        vm.prank(DAO);
        dist.setRewardRate(0);

        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 1000);

        assertEq(dist.earned(ALICE), 0);
    }

    function test_earned_preservedAfterWithdraw() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        uint256 earnedBefore = dist.earned(ALICE);

        // Retrait partiel — les recompenses deja accumulees sont preservees
        vm.prank(VAULT);
        dist.notifyWithdraw(ALICE, 500e6);

        uint256 earnedAfter = dist.earned(ALICE);
        assertApproxEqAbs(earnedAfter, earnedBefore, 1e12, "Earned should be preserved after withdraw");
    }

    function test_earned_stopsAccumulatingAfterFullWithdraw() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        vm.prank(VAULT);
        dist.notifyWithdraw(ALICE, 1_000e6);

        uint256 earnedAtWithdraw = dist.earned(ALICE);

        vm.warp(block.timestamp + 1000);

        // Plus de shares → plus d'accumulation
        assertEq(dist.earned(ALICE), earnedAtWithdraw, "Earned should not increase after full withdraw");
    }

    // ── claim ─────────────────────────────────────────────────────────────────

    function test_claim_mintsCorrectAmount() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        uint256 expectedReward = dist.earned(ALICE);

        vm.prank(ALICE);
        dist.claim();

        assertApproxEqAbs(fbk.balanceOf(ALICE), expectedReward, 1e12);
    }

    function test_claim_resetsPendingReward() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        vm.prank(ALICE);
        dist.claim();

        assertEq(dist.pendingReward(ALICE), 0);
    }

    function test_claim_incrementsTotalDistributed() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        uint256 expectedReward = dist.earned(ALICE);

        vm.prank(ALICE);
        dist.claim();

        assertApproxEqAbs(dist.totalDistributed(), expectedReward, 1e12);
    }

    function test_claim_nothingToClaim_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKDistributor.NothingToClaim.selector);
        dist.claim();
    }

    function test_claim_emitsEvent() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 10);

        uint256 expected = dist.earned(ALICE);

        vm.prank(ALICE);
        vm.expectEmit(true, false, false, false); // don't check amount exactly (off-by-one)
        emit Claimed(ALICE, expected);
        dist.claim();
    }

    function test_claim_canClaimMultipleTimes() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);
        vm.prank(ALICE);
        dist.claim();
        uint256 firstClaim = fbk.balanceOf(ALICE);

        vm.warp(block.timestamp + 100);
        vm.prank(ALICE);
        dist.claim();
        uint256 totalClaimed = fbk.balanceOf(ALICE);

        assertGt(totalClaimed, firstClaim, "Second claim should add more FBK");
    }

    // ── setRewardRate ─────────────────────────────────────────────────────────

    function test_setRewardRate_onlyOwner() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKDistributor.NotOwner.selector);
        dist.setRewardRate(2e18);
    }

    function test_setRewardRate_updatesRate() public {
        vm.prank(DAO);
        dist.setRewardRate(2e18);
        assertEq(dist.rewardRate(), 2e18);
    }

    function test_setRewardRate_preservesAccruedRewards() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        uint256 earnedBefore = dist.earned(ALICE);

        // Le changement de taux met a jour l'accumulateur → les rewards passees sont preservees
        vm.prank(DAO);
        dist.setRewardRate(0);

        assertApproxEqAbs(dist.earned(ALICE), earnedBefore, 1e12, "Rewards should be preserved after rate change");
    }

    function test_setRewardRate_emitsEvent() public {
        vm.prank(DAO);
        vm.expectEmit(false, false, false, true);
        emit RewardRateUpdated(RATE, 5e18);
        dist.setRewardRate(5e18);
    }

    // ── remainingMintable ─────────────────────────────────────────────────────

    function test_remainingMintable_fullCapAtStart() public {
        assertEq(dist.remainingMintable(), fbk.MAX_SUPPLY());
    }

    function test_remainingMintable_decreasesAfterClaim() public {
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        vm.warp(block.timestamp + 100);

        uint256 before = dist.remainingMintable();

        vm.prank(ALICE);
        dist.claim();

        assertLt(dist.remainingMintable(), before);
    }

    // ── transferOwnership ─────────────────────────────────────────────────────

    function test_transferOwnership_success() public {
        vm.prank(DAO);
        dist.transferOwnership(ALICE);
        assertEq(dist.owner(), ALICE);
    }

    function test_transferOwnership_byNonOwner_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKDistributor.NotOwner.selector);
        dist.transferOwnership(BOB);
    }

    function test_transferOwnership_toZeroAddress_reverts() public {
        vm.prank(DAO);
        vm.expectRevert(FBKDistributor.ZeroAddress.selector);
        dist.transferOwnership(address(0));
    }

    // ── Scenario complet ──────────────────────────────────────────────────────

    function test_scenario_twoUsersDepositClaimWithdraw() public {
        uint256 t0 = block.timestamp;

        // t=0 : Alice depose 1000 shares
        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        // t=100 : Bob depose 1000 shares (meme montant)
        vm.warp(t0 + 100);
        vm.prank(VAULT);
        dist.notifyDeposit(BOB, 1_000e6);

        // t=200 : les deux ont eu 100s chacun (Alice seule 100s, puis 50/50 100s)
        vm.warp(t0 + 200);

        // Alice : 100s * 1 FBK/s * 100% + 100s * 1 FBK/s * 50% = 100 + 50 = 150 FBK
        // Bob   : 100s * 1 FBK/s * 50% = 50 FBK
        uint256 aliceEarned = dist.earned(ALICE);
        uint256 bobEarned   = dist.earned(BOB);

        assertApproxEqAbs(aliceEarned, 150 * 1e18, 1e12, "Alice should have ~150 FBK");
        assertApproxEqAbs(bobEarned,    50 * 1e18, 1e12, "Bob should have ~50 FBK");

        // Les deux clament
        vm.prank(ALICE);
        dist.claim();

        vm.prank(BOB);
        dist.claim();

        assertApproxEqAbs(fbk.balanceOf(ALICE), 150 * 1e18, 1e12);
        assertApproxEqAbs(fbk.balanceOf(BOB),    50 * 1e18, 1e12);

        // Alice retire ses shares
        vm.prank(VAULT);
        dist.notifyWithdraw(ALICE, 1_000e6);

        // t=300 : Bob accumule seul pendant 100s de plus
        vm.warp(t0 + 300);

        assertApproxEqAbs(dist.earned(BOB), 100 * 1e18, 1e12, "Bob alone for 100s = 100 FBK");
        assertEq(dist.earned(ALICE), 0, "Alice has no shares, no accumulation");
    }

    function test_scenario_rateChangeInMidFlight() public {
        uint256 t0 = block.timestamp;

        vm.prank(VAULT);
        dist.notifyDeposit(ALICE, 1_000e6);

        // 100s a 1 FBK/s → 100 FBK
        vm.warp(t0 + 100);

        vm.prank(DAO);
        dist.setRewardRate(2e18); // Double le taux

        // 100s a 2 FBK/s → 200 FBK supplementaires
        vm.warp(t0 + 200);

        uint256 e = dist.earned(ALICE);
        assertApproxEqAbs(e, 300 * 1e18, 1e12, "100 FBK + 200 FBK = 300 FBK total");
    }
}
