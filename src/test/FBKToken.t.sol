// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// Tests FBKToken - Foundry
// forge test --match-contract FBKTokenTest -vvv

import "forge-std/Test.sol";
import {FBKToken} from "../FBKToken.sol";

contract FBKTokenTest is Test {

    // Declare events locally for vm.expectEmit (required by Solidity 0.8.21)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    FBKToken token;

    address DAO       = address(0xDA0);
    address MINTER    = address(0x111);
    address ALICE     = address(0xA11CE);
    address BOB       = address(0xB0B);
    address TREASURY  = address(0x7EA5);

    uint256 constant ONE_FBK    = 1e18;
    uint256 constant MAX_SUPPLY = 100_000_000 * 1e18;

    function setUp() public {
        vm.prank(DAO);
        token = new FBKToken(MINTER);
    }

    // -- Deploiement -----------------------------------------------------------

    function test_deploy_setsOwnerAndMinter() public {
        assertEq(token.owner(),  DAO,    "Owner should be DAO");
        assertEq(token.minter(), MINTER, "Minter should be FBKDistributor");
    }

    function test_deploy_initialSupplyIsZero() public {
        assertEq(token.totalSupply(),       0,          "Initial supply should be zero");
        assertEq(token.remainingMintable(), MAX_SUPPLY, "Full cap should be available");
    }

    function test_deploy_withZeroMinter_reverts() public {
        vm.expectRevert(FBKToken.ZeroAddress.selector);
        new FBKToken(address(0));
    }

    function test_constants() public {
        assertEq(token.name(),       "FinBank Governance Token");
        assertEq(token.symbol(),     "FBK");
        assertEq(token.decimals(),   18);
        assertEq(token.MAX_SUPPLY(), MAX_SUPPLY);
    }

    // -- Mint ------------------------------------------------------------------

    function test_mint_byMinter_succeeds() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        assertEq(token.balanceOf(ALICE), 1_000 * ONE_FBK, "Alice should have tokens");
        assertEq(token.totalSupply(),    1_000 * ONE_FBK, "Total supply should increase");
    }

    function test_mint_byNonMinter_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKToken.NotMinter.selector);
        token.mint(ALICE, ONE_FBK);
    }

    function test_mint_byOwner_reverts() public {
        vm.prank(DAO);
        vm.expectRevert(FBKToken.NotMinter.selector);
        token.mint(ALICE, ONE_FBK);
    }

    function test_mint_exceedsCap_reverts() public {
        vm.prank(MINTER);
        vm.expectRevert(
            abi.encodeWithSelector(FBKToken.CapExceeded.selector, MAX_SUPPLY + 1, MAX_SUPPLY)
        );
        token.mint(ALICE, MAX_SUPPLY + 1);
    }

    function test_mint_exactlyCap_succeeds() public {
        vm.prank(MINTER);
        token.mint(ALICE, MAX_SUPPLY);

        assertEq(token.totalSupply(),       MAX_SUPPLY, "Total supply should equal cap");
        assertEq(token.remainingMintable(), 0,          "Nothing should remain mintable");
    }

    function test_mint_toZeroAddress_reverts() public {
        vm.prank(MINTER);
        vm.expectRevert(FBKToken.ZeroAddress.selector);
        token.mint(address(0), ONE_FBK);
    }

    function test_mint_emitsTransferFromZero() public {
        vm.prank(MINTER);
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), ALICE, 500 * ONE_FBK);
        token.mint(ALICE, 500 * ONE_FBK);
    }

    // -- Burn ------------------------------------------------------------------

    function test_burn_ownTokens_succeeds() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.burn(400 * ONE_FBK);

        assertEq(token.balanceOf(ALICE), 600 * ONE_FBK, "Alice should have 600 left");
        assertEq(token.totalSupply(),    600 * ONE_FBK, "Supply should decrease");
    }

    function test_burn_exceedsBalance_reverts() public {
        vm.prank(MINTER);
        token.mint(ALICE, 100 * ONE_FBK);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(FBKToken.InsufficientBalance.selector, 101 * ONE_FBK, 100 * ONE_FBK)
        );
        token.burn(101 * ONE_FBK);
    }

    function test_burnFrom_withAllowance_succeeds() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.approve(TREASURY, 300 * ONE_FBK);

        vm.prank(TREASURY);
        token.burnFrom(ALICE, 300 * ONE_FBK);

        assertEq(token.balanceOf(ALICE),            700 * ONE_FBK, "Alice should have 700 left");
        assertEq(token.totalSupply(),               700 * ONE_FBK, "Supply should decrease");
        assertEq(token.allowance(ALICE, TREASURY),  0,             "Allowance should be consumed");
    }

    function test_burnFrom_infiniteAllowance_doesNotDecrement() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.approve(TREASURY, type(uint256).max);

        vm.prank(TREASURY);
        token.burnFrom(ALICE, 500 * ONE_FBK);

        assertEq(token.allowance(ALICE, TREASURY), type(uint256).max, "Infinite allowance should not decrement");
    }

    function test_burnFrom_insufficientAllowance_reverts() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.approve(TREASURY, 100 * ONE_FBK);

        vm.prank(TREASURY);
        vm.expectRevert(
            abi.encodeWithSelector(FBKToken.InsufficientAllowance.selector, 200 * ONE_FBK, 100 * ONE_FBK)
        );
        token.burnFrom(ALICE, 200 * ONE_FBK);
    }

    // -- ERC-20 Transfer -------------------------------------------------------

    function test_transfer_succeeds() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.transfer(BOB, 250 * ONE_FBK);

        assertEq(token.balanceOf(ALICE), 750 * ONE_FBK);
        assertEq(token.balanceOf(BOB),   250 * ONE_FBK);
        assertEq(token.totalSupply(),    1_000 * ONE_FBK, "Supply unchanged after transfer");
    }

    function test_transfer_insufficientBalance_reverts() public {
        vm.prank(MINTER);
        token.mint(ALICE, 100 * ONE_FBK);

        vm.prank(ALICE);
        vm.expectRevert(
            abi.encodeWithSelector(FBKToken.InsufficientBalance.selector, 101 * ONE_FBK, 100 * ONE_FBK)
        );
        token.transfer(BOB, 101 * ONE_FBK);
    }

    function test_transferFrom_withApproval_succeeds() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.approve(BOB, 500 * ONE_FBK);

        vm.prank(BOB);
        token.transferFrom(ALICE, TREASURY, 300 * ONE_FBK);

        assertEq(token.balanceOf(ALICE),     700 * ONE_FBK);
        assertEq(token.balanceOf(TREASURY),  300 * ONE_FBK);
        assertEq(token.allowance(ALICE, BOB), 200 * ONE_FBK, "Allowance should decrease");
    }

    function test_transferFrom_insufficientAllowance_reverts() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.approve(BOB, 100 * ONE_FBK);

        vm.prank(BOB);
        vm.expectRevert(
            abi.encodeWithSelector(FBKToken.InsufficientAllowance.selector, 200 * ONE_FBK, 100 * ONE_FBK)
        );
        token.transferFrom(ALICE, TREASURY, 200 * ONE_FBK);
    }

    function test_transferFrom_toZeroAddress_reverts() public {
        vm.prank(MINTER);
        token.mint(ALICE, 1_000 * ONE_FBK);

        vm.prank(ALICE);
        token.approve(BOB, 500 * ONE_FBK);

        vm.prank(BOB);
        vm.expectRevert(FBKToken.ZeroAddress.selector);
        token.transferFrom(ALICE, address(0), 100 * ONE_FBK);
    }

    function test_approve_emitsApprovalEvent() public {
        vm.prank(ALICE);
        vm.expectEmit(true, true, false, true);
        emit Approval(ALICE, BOB, 500 * ONE_FBK);
        token.approve(BOB, 500 * ONE_FBK);
    }

    // -- View Helpers ----------------------------------------------------------

    function test_remainingMintable_decreasesWithMint() public {
        vm.prank(MINTER);
        token.mint(ALICE, 10_000_000 * ONE_FBK);

        assertEq(token.remainingMintable(), 90_000_000 * ONE_FBK, "90M should remain");
    }

    function test_supplyEmittedBps_isZeroInitially() public {
        assertEq(token.supplyEmittedBps(), 0);
    }

    function test_supplyEmittedBps_afterMint() public {
        vm.prank(MINTER);
        token.mint(ALICE, 10_000_000 * ONE_FBK);

        assertEq(token.supplyEmittedBps(), 1_000, "Should be 10% = 1000 bps");
    }

    function test_supplyEmittedBps_afterFullMint() public {
        vm.prank(MINTER);
        token.mint(ALICE, MAX_SUPPLY);

        assertEq(token.supplyEmittedBps(), 10_000, "Should be 100% = 10000 bps");
    }

    // -- Admin -----------------------------------------------------------------

    function test_setMinter_byOwner_succeeds() public {
        address newDistributor = address(0x222);

        vm.prank(DAO);
        token.setMinter(newDistributor);

        assertEq(token.minter(), newDistributor, "Minter should be updated");
    }

    function test_setMinter_byNonOwner_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKToken.NotOwner.selector);
        token.setMinter(address(0x222));
    }

    function test_setMinter_toZeroAddress_reverts() public {
        vm.prank(DAO);
        vm.expectRevert(FBKToken.ZeroAddress.selector);
        token.setMinter(address(0));
    }

    function test_setMinter_emitsMinterUpdatedEvent() public {
        address newDistributor = address(0x222);
        vm.prank(DAO);
        vm.expectEmit(true, true, false, false);
        emit MinterUpdated(MINTER, newDistributor);
        token.setMinter(newDistributor);
    }

    function test_transferOwnership_byOwner_succeeds() public {
        address newDAO = address(0x999);
        vm.prank(DAO);
        token.transferOwnership(newDAO);

        assertEq(token.owner(), newDAO, "Owner should be updated");
    }

    function test_transferOwnership_byNonOwner_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FBKToken.NotOwner.selector);
        token.transferOwnership(address(0x999));
    }

    function test_transferOwnership_toZeroAddress_reverts() public {
        vm.prank(DAO);
        vm.expectRevert(FBKToken.ZeroAddress.selector);
        token.transferOwnership(address(0));
    }

    // -- Scenario : Fair Launch ------------------------------------------------

    function test_fairLaunch_scenario() public {
        vm.startPrank(MINTER);
        token.mint(ALICE,         5_000 * ONE_FBK);
        token.mint(BOB,           2_000 * ONE_FBK);
        token.mint(address(0xC),    500 * ONE_FBK);
        vm.stopPrank();

        assertEq(token.totalSupply(), 7_500 * ONE_FBK);

        // Treasury does buy-back & burn via Alice's approval
        vm.prank(ALICE);
        token.approve(TREASURY, 1_000 * ONE_FBK);

        vm.prank(TREASURY);
        token.burnFrom(ALICE, 1_000 * ONE_FBK);

        assertEq(token.totalSupply(),    6_500 * ONE_FBK, "Supply should decrease after buyback burn");
        assertEq(token.balanceOf(ALICE), 4_000 * ONE_FBK, "Alice has fewer tokens after burn");
    }
}
