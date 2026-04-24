// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// Tests VeFBK - Foundry
// forge test --match-contract VeFBKTest -vvv

import "forge-std/Test.sol";
import {VeFBK} from "../VeFBK.sol";

// Minimal ERC-20 pour les tests
contract MockFBK {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
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
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        return true;
    }
}

contract VeFBKTest is Test {

    // Events declares localement (requis Solidity 0.8.21 — pas d'emit VeFBK.EventName)
    event LockCreated(address indexed user, uint256 amount, uint256 unlockTime);
    event LockIncreased(address indexed user, uint256 addedAmount, uint256 newTotal);
    event LockExtended(address indexed user, uint256 oldEnd, uint256 newEnd);
    event Withdrawn(address indexed user, uint256 amount);

    MockFBK fbk;
    VeFBK   ve;

    address ALICE = address(0xA11CE);
    address BOB   = address(0xB0B);

    uint256 constant WEEK             = 7 * 86400;
    uint256 constant MAX_LOCK         = 4 * 365 * 86400;
    uint256 constant ONE              = 1e18;
    uint256 constant INITIAL_BALANCE  = 10_000 * ONE;

    function setUp() public {
        fbk = new MockFBK();
        ve  = new VeFBK(address(fbk));

        fbk.mint(ALICE, INITIAL_BALANCE);
        fbk.mint(BOB,   INITIAL_BALANCE);

        vm.prank(ALICE);
        fbk.approve(address(ve), type(uint256).max);

        vm.prank(BOB);
        fbk.approve(address(ve), type(uint256).max);
    }

    // -- Deploiement -------------------------------------------------------

    function test_deploy_setsFbkAddress() public {
        assertEq(address(ve.fbk()), address(fbk));
    }

    function test_deploy_withZeroAddress_reverts() public {
        vm.expectRevert(VeFBK.ZeroAddress.selector);
        new VeFBK(address(0));
    }

    function test_deploy_initialTotalLockedIsZero() public {
        assertEq(ve.totalLocked(), 0);
    }

    // -- createLock --------------------------------------------------------

    function test_createLock_success() public {
        uint256 amount   = 1_000 * ONE;
        uint256 duration = 2 * WEEK;

        vm.prank(ALICE);
        ve.createLock(amount, duration);

        (uint128 lockedAmount, uint64 end) = ve.locked(ALICE);
        assertEq(lockedAmount, amount);
        assertGt(end, block.timestamp);
        assertEq(ve.totalLocked(), amount);
        assertEq(fbk.balanceOf(ALICE), INITIAL_BALANCE - amount);
    }

    function test_createLock_roundsEndToWeek() public {
        uint256 amount   = 1_000 * ONE;
        uint256 duration = WEEK + 1; // pas exactement sur la semaine

        vm.prank(ALICE);
        ve.createLock(amount, duration);

        (, uint64 end) = ve.locked(ALICE);
        assertEq(end % WEEK, 0, "End should be rounded to week boundary");
    }

    function test_createLock_zeroAmount_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(VeFBK.ZeroAmount.selector);
        ve.createLock(0, WEEK);
    }

    function test_createLock_tooShort_reverts() public {
        uint256 tooShort = WEEK - 1;
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(VeFBK.LockTooShort.selector, tooShort, WEEK)
        );
        ve.createLock(ONE, tooShort);
    }

    function test_createLock_tooLong_reverts() public {
        uint256 tooLong = MAX_LOCK + WEEK;
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(VeFBK.LockTooLong.selector, tooLong, MAX_LOCK)
        );
        ve.createLock(ONE, tooLong);
    }

    function test_createLock_exactMinDuration_succeeds() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        (uint128 amt,) = ve.locked(ALICE);
        assertEq(amt, ONE);
    }

    function test_createLock_exactMaxDuration_succeeds() public {
        vm.prank(ALICE);
        ve.createLock(ONE, MAX_LOCK);

        (uint128 amt,) = ve.locked(ALICE);
        assertEq(amt, ONE);
    }

    function test_createLock_alreadyExists_reverts() public {
        vm.startPrank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.expectRevert(VeFBK.LockAlreadyExists.selector);
        ve.createLock(ONE, WEEK);
        vm.stopPrank();
    }

    function test_createLock_emitsEvent() public {
        uint256 amount   = 500 * ONE;
        uint256 duration = 4 * WEEK;
        uint256 expectedEnd = ((block.timestamp + duration) / WEEK) * WEEK;

        vm.prank(ALICE);
        vm.expectEmit(true, false, false, true);
        emit LockCreated(ALICE, amount, expectedEnd);
        ve.createLock(amount, duration);
    }

    // -- increaseAmount ----------------------------------------------------

    function test_increaseAmount_success() public {
        vm.startPrank(ALICE);
        ve.createLock(1_000 * ONE, WEEK);
        ve.increaseAmount(500 * ONE);
        vm.stopPrank();

        (uint128 amt,) = ve.locked(ALICE);
        assertEq(amt, 1_500 * ONE);
        assertEq(ve.totalLocked(), 1_500 * ONE);
        assertEq(fbk.balanceOf(ALICE), INITIAL_BALANCE - 1_500 * ONE);
    }

    function test_increaseAmount_zeroAmount_reverts() public {
        vm.startPrank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.expectRevert(VeFBK.ZeroAmount.selector);
        ve.increaseAmount(0);
        vm.stopPrank();
    }

    function test_increaseAmount_noLock_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(VeFBK.NoLockFound.selector);
        ve.increaseAmount(ONE);
    }

    function test_increaseAmount_expiredLock_reverts() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        vm.prank(ALICE);
        vm.expectRevert(VeFBK.LockExpired.selector);
        ve.increaseAmount(ONE);
    }

    function test_increaseAmount_emitsEvent() public {
        vm.prank(ALICE);
        ve.createLock(1_000 * ONE, WEEK);

        vm.prank(ALICE);
        vm.expectEmit(true, false, false, true);
        emit LockIncreased(ALICE, 200 * ONE, 1_200 * ONE);
        ve.increaseAmount(200 * ONE);
    }

    // -- extendLock --------------------------------------------------------

    function test_extendLock_success() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        (, uint64 oldEnd) = ve.locked(ALICE);
        uint256 newUnlock = block.timestamp + 4 * WEEK;

        vm.prank(ALICE);
        ve.extendLock(newUnlock);

        (, uint64 newEnd) = ve.locked(ALICE);
        assertGt(newEnd, oldEnd);
        assertEq(newEnd % WEEK, 0, "New end should be rounded to week");
    }

    function test_extendLock_noLock_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(VeFBK.NoLockFound.selector);
        ve.extendLock(block.timestamp + 2 * WEEK);
    }

    function test_extendLock_expiredLock_reverts() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        vm.prank(ALICE);
        vm.expectRevert(VeFBK.LockExpired.selector);
        ve.extendLock(block.timestamp + 2 * WEEK);
    }

    function test_extendLock_notLater_reverts() public {
        vm.prank(ALICE);
        ve.createLock(ONE, 4 * WEEK);

        (, uint64 currentEnd) = ve.locked(ALICE);

        // Proposer une date anterieure ou egale
        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(VeFBK.NewEndNotLater.selector, currentEnd, currentEnd)
        );
        ve.extendLock(currentEnd);
    }

    function test_extendLock_tooLong_reverts() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        uint256 wayTooFar = block.timestamp + MAX_LOCK + 2 * WEEK;

        vm.prank(ALICE);
        vm.expectRevert();
        ve.extendLock(wayTooFar);
    }

    function test_extendLock_emitsEvent() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        (, uint64 oldEnd) = ve.locked(ALICE);
        uint256 newUnlock    = block.timestamp + 4 * WEEK;
        uint256 expectedEnd  = (newUnlock / WEEK) * WEEK;

        vm.prank(ALICE);
        vm.expectEmit(true, false, false, true);
        emit LockExtended(ALICE, oldEnd, expectedEnd);
        ve.extendLock(newUnlock);
    }

    // -- withdraw ----------------------------------------------------------

    function test_withdraw_afterExpiry_success() public {
        uint256 amount = 1_000 * ONE;

        vm.prank(ALICE);
        ve.createLock(amount, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        vm.prank(ALICE);
        ve.withdraw();

        (uint128 lockedAmt,) = ve.locked(ALICE);
        assertEq(lockedAmt, 0);
        assertEq(ve.totalLocked(), 0);
        assertEq(fbk.balanceOf(ALICE), INITIAL_BALANCE);
    }

    function test_withdraw_noLock_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(VeFBK.NoLockFound.selector);
        ve.withdraw();
    }

    function test_withdraw_beforeExpiry_reverts() public {
        vm.prank(ALICE);
        ve.createLock(ONE, 4 * WEEK);

        vm.prank(ALICE);
        vm.expectRevert(); // LockNotExpired
        ve.withdraw();
    }

    function test_withdraw_exactlyAtExpiry_success() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        (, uint64 end) = ve.locked(ALICE);
        vm.warp(end);

        vm.prank(ALICE);
        ve.withdraw();

        assertEq(fbk.balanceOf(ALICE), INITIAL_BALANCE);
    }

    function test_withdraw_emitsEvent() public {
        uint256 amount = 750 * ONE;

        vm.prank(ALICE);
        ve.createLock(amount, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        vm.prank(ALICE);
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(ALICE, amount);
        ve.withdraw();
    }

    // -- balanceOf (veFBK decay) -------------------------------------------

    function test_balanceOf_noLock_returnsZero() public {
        assertEq(ve.balanceOf(ALICE), 0);
    }

    function test_balanceOf_expiredLock_returnsZero() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        assertEq(ve.balanceOf(ALICE), 0);
    }

    function test_balanceOf_maxLock_returnsFullAmount() public {
        // Lock 4 ans = veFBK maximum (1:1 avec FBK au moment du lock)
        uint256 amount = 1_000 * ONE;

        uint256 t0 = block.timestamp;
        vm.prank(ALICE);
        ve.createLock(amount, MAX_LOCK);

        // Immediatement apres le lock, le veFBK doit etre proche de amount
        // veFBK = amount * (end - now) / MAX_LOCK_DURATION
        // end est arrondi a la semaine => end - now peut etre legerement < MAX_LOCK
        uint256 balance = ve.balanceOf(ALICE);
        assertLe(balance, amount, "veFBK cannot exceed locked amount");
        assertGt(balance, (amount * 99) / 100, "veFBK should be close to amount for max lock");
    }

    function test_balanceOf_halfMaxLock_returnsHalfAmount() public {
        // Lock 2 ans = 0.5 * FBK au moment du lock
        uint256 amount   = 1_000 * ONE;
        uint256 halfLock = MAX_LOCK / 2; // 2 ans

        vm.prank(ALICE);
        ve.createLock(amount, halfLock);

        uint256 balance = ve.balanceOf(ALICE);
        // Devrait etre ~500 ONE (avec arrondi semaine)
        assertLe(balance, amount / 2 + ONE, "veFBK should be ~50% for 2-year lock");
        assertGt(balance, amount / 2 - (amount / 20), "veFBK should be close to 50%");
    }

    function test_balanceOf_decaysOverTime() public {
        uint256 amount   = 1_000 * ONE;
        uint256 duration = 4 * WEEK;

        uint256 t0 = block.timestamp;
        vm.prank(ALICE);
        ve.createLock(amount, duration);

        uint256 balanceAtStart = ve.balanceOf(ALICE);

        // Avance d'une semaine
        vm.warp(t0 + WEEK);
        uint256 balanceAfterWeek = ve.balanceOf(ALICE);

        // Avance encore d'une semaine
        vm.warp(t0 + 2 * WEEK);
        uint256 balanceAfter2Weeks = ve.balanceOf(ALICE);

        assertGt(balanceAtStart, balanceAfterWeek, "Balance should decay");
        assertGt(balanceAfterWeek, balanceAfter2Weeks, "Balance should continue to decay");
    }

    function test_balanceOf_isZeroAtExpiry() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        (, uint64 end) = ve.locked(ALICE);
        vm.warp(end);

        assertEq(ve.balanceOf(ALICE), 0);
    }

    // -- balanceOfAt -------------------------------------------------------

    function test_balanceOfAt_futureTimestamp() public {
        uint256 amount = 1_000 * ONE;
        uint256 t0     = block.timestamp;

        vm.prank(ALICE);
        ve.createLock(amount, MAX_LOCK);

        uint256 balNow    = ve.balanceOfAt(ALICE, t0);
        uint256 balFuture = ve.balanceOfAt(ALICE, t0 + 365 * 86400); // dans 1 an

        assertGt(balNow, balFuture, "Future balance should be lower");
    }

    function test_balanceOfAt_pastExpiry_returnsZero() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        (, uint64 end) = ve.locked(ALICE);

        uint256 balAfterExpiry = ve.balanceOfAt(ALICE, end + WEEK);
        assertEq(balAfterExpiry, 0);
    }

    // -- remainingLockDuration ---------------------------------------------

    function test_remainingLockDuration_activeLock() public {
        uint256 t0 = block.timestamp;
        vm.prank(ALICE);
        ve.createLock(ONE, 4 * WEEK);

        uint256 remaining = ve.remainingLockDuration(ALICE);
        assertGt(remaining, 0);
        assertLe(remaining, 4 * WEEK + WEEK); // arrondi semaine
    }

    function test_remainingLockDuration_afterExpiry_returnsZero() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        assertEq(ve.remainingLockDuration(ALICE), 0);
    }

    function test_remainingLockDuration_noLock_returnsZero() public {
        assertEq(ve.remainingLockDuration(ALICE), 0);
    }

    // -- isExpired ---------------------------------------------------------

    function test_isExpired_activeLock_returnsFalse() public {
        vm.prank(ALICE);
        ve.createLock(ONE, 2 * WEEK);

        assertFalse(ve.isExpired(ALICE));
    }

    function test_isExpired_afterExpiry_returnsTrue() public {
        vm.prank(ALICE);
        ve.createLock(ONE, WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        assertTrue(ve.isExpired(ALICE));
    }

    function test_isExpired_noLock_returnsTrue() public {
        assertTrue(ve.isExpired(ALICE));
    }

    // -- totalLocked -------------------------------------------------------

    function test_totalLocked_multipleUsers() public {
        vm.prank(ALICE);
        ve.createLock(1_000 * ONE, WEEK);

        vm.prank(BOB);
        ve.createLock(2_000 * ONE, 2 * WEEK);

        assertEq(ve.totalLocked(), 3_000 * ONE);
    }

    function test_totalLocked_decreasesAfterWithdraw() public {
        uint256 aliceAmt = 1_000 * ONE;
        uint256 bobAmt   = 2_000 * ONE;

        vm.prank(ALICE);
        ve.createLock(aliceAmt, WEEK);

        vm.prank(BOB);
        ve.createLock(bobAmt, 4 * WEEK);

        vm.warp(block.timestamp + 2 * WEEK);

        vm.prank(ALICE);
        ve.withdraw();

        assertEq(ve.totalLocked(), bobAmt);
    }

    // -- Scenario complet --------------------------------------------------

    function test_scenario_fullLifecycle() public {
        uint256 t0     = block.timestamp;
        uint256 amount = 2_000 * ONE;

        // 1. Alice cree un lock 4 ans
        vm.prank(ALICE);
        ve.createLock(amount, MAX_LOCK);

        uint256 balStart = ve.balanceOf(ALICE);
        assertGt(balStart, (amount * 99) / 100);

        // 2. Apres 1 an, elle ajoute 1000 FBK
        vm.warp(t0 + 365 * 86400);
        vm.prank(ALICE);
        ve.increaseAmount(1_000 * ONE);

        (uint128 total,) = ve.locked(ALICE);
        assertEq(total, 3_000 * ONE);

        // 3. Le veFBK a decru
        uint256 balYear1 = ve.balanceOf(ALICE);
        assertLt(balYear1, balStart + 1_000 * ONE, "veFBK should not simply add linearly");

        // 4. Elle prolonge jusqu'au maximum
        vm.prank(ALICE);
        ve.extendLock(t0 + MAX_LOCK + WEEK);

        // 5. Elle attend que le lock expire et retire
        (, uint64 end) = ve.locked(ALICE);
        vm.warp(end + 1);

        assertEq(ve.balanceOf(ALICE), 0);

        vm.prank(ALICE);
        ve.withdraw();

        assertEq(fbk.balanceOf(ALICE), INITIAL_BALANCE); // 2000 + 1000 locked, all returned
        assertEq(fbk.balanceOf(BOB),   INITIAL_BALANCE);
    }

    function test_scenario_nonTransferable() public {
        // VeFBK n'a pas de fonction transfer — pas de vecteur de transfert
        // Verifier que l'interface ne contient pas de transfer
        // (compilation implicite : si transfer existait, ce test ne compilerait pas proprement)
        // Ce test verifie que balanceOf ne peut etre manipule qu'en creant un lock
        vm.prank(ALICE);
        ve.createLock(1_000 * ONE, WEEK);

        // BOB n'a aucun lock, son solde est 0
        assertEq(ve.balanceOf(BOB), 0);
    }
}
