// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// Tests FinBankGovernor - Foundry
// forge test --match-contract FinBankGovernorTest -vvv

import "forge-std/Test.sol";
import {FinBankGovernor} from "../FinBankGovernor.sol";
import {VeFBK}           from "../VeFBK.sol";

// FBK minimal pour VeFBK
contract MockFBKGov {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from]             -= amount;
        balanceOf[to]               += amount;
        return true;
    }
}

// Cible simple pour tester l'execution des propositions
contract MockTarget {
    uint256 public value;
    bool    public called;

    function setValue(uint256 newValue) external {
        value  = newValue;
        called = true;
    }
}

contract FinBankGovernorTest is Test {

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        bytes[]   calldatas,
        uint256   voteStart,
        uint256   voteEnd,
        string    description
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        FinBankGovernor.VoteType voteType,
        uint256                  weight
    );
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);

    MockFBKGov      fbk;
    VeFBK           ve;
    FinBankGovernor gov;
    MockTarget      target;

    address ALICE = address(0xA11CE);
    address BOB   = address(0xB0B);
    address CAROL = address(0xCA401);

    // Parametres de gouvernance (petits pour faciliter les tests)
    uint256 constant VOTING_DELAY     = 1;      // 1 bloc
    uint256 constant VOTING_PERIOD    = 10;     // 10 blocs
    uint256 constant TIMELOCK_DELAY   = 100;    // 100 secondes
    uint256 constant QUORUM_BPS       = 400;    // 4% du totalLocked
    uint256 constant THRESHOLD        = 1e18;   // 1 veFBK minimum
    uint256 constant WEEK             = 7 * 86400;
    uint256 constant MAX_LOCK         = 4 * 365 * 86400;

    function setUp() public {
        fbk    = new MockFBKGov();
        ve     = new VeFBK(address(fbk));
        gov    = new FinBankGovernor(address(ve), VOTING_DELAY, VOTING_PERIOD, TIMELOCK_DELAY, QUORUM_BPS, THRESHOLD);
        target = new MockTarget();

        // Donne des FBK a Alice et Bob, et ils creent des locks maximaux
        fbk.mint(ALICE, 100_000e18);
        fbk.mint(BOB,   50_000e18);
        fbk.mint(CAROL, 10_000e18);

        vm.startPrank(ALICE);
        fbk.approve(address(ve), type(uint256).max);
        ve.createLock(100_000e18, MAX_LOCK);
        vm.stopPrank();

        vm.startPrank(BOB);
        fbk.approve(address(ve), type(uint256).max);
        ve.createLock(50_000e18, MAX_LOCK);
        vm.stopPrank();

        vm.startPrank(CAROL);
        fbk.approve(address(ve), type(uint256).max);
        ve.createLock(10_000e18, MAX_LOCK);
        vm.stopPrank();
    }

    // Helper : cree une proposition simple (appel setValue sur MockTarget)
    function _makeProposal() internal returns (
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas
    ) {
        targets   = new address[](1);
        values    = new uint256[](1);
        calldatas = new bytes[](1);
        targets[0]   = address(target);
        values[0]    = 0;
        calldatas[0] = abi.encodeWithSelector(MockTarget.setValue.selector, 42);
    }

    // Helper : cree une proposition et la fait passer jusqu'a Succeeded
    function _createPassedProposal() internal returns (uint256 proposalId) {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();

        vm.prank(ALICE);
        proposalId = gov.propose(targets, values, calldatas, "Set value to 42");

        // Avance au-dela du votingDelay
        vm.roll(block.number + VOTING_DELAY + 1);

        // Alice et Bob votent Pour (largement quorum)
        vm.prank(ALICE);
        gov.castVote(proposalId, FinBankGovernor.VoteType.For);

        vm.prank(BOB);
        gov.castVote(proposalId, FinBankGovernor.VoteType.For);

        // Fin du vote
        vm.roll(block.number + VOTING_PERIOD + 1);
    }

    // ── Deploiement ───────────────────────────────────────────────────────────

    function test_deploy_setsParameters() public {
        assertEq(address(gov.veFBK()),    address(ve));
        assertEq(gov.votingDelay(),       VOTING_DELAY);
        assertEq(gov.votingPeriod(),      VOTING_PERIOD);
        assertEq(gov.timelockDelay(),     TIMELOCK_DELAY);
        assertEq(gov.quorumBps(),         QUORUM_BPS);
        assertEq(gov.proposalThreshold(), THRESHOLD);
        assertEq(gov.proposalCount(),     0);
    }

    function test_deploy_zeroVeFBK_reverts() public {
        vm.expectRevert(FinBankGovernor.InvalidParameter.selector);
        new FinBankGovernor(address(0), 1, 10, 100, 400, THRESHOLD);
    }

    function test_deploy_zeroPeriod_reverts() public {
        vm.expectRevert(FinBankGovernor.InvalidParameter.selector);
        new FinBankGovernor(address(ve), 1, 0, 100, 400, THRESHOLD);
    }

    function test_deploy_quorumAbove100pct_reverts() public {
        vm.expectRevert(FinBankGovernor.InvalidParameter.selector);
        new FinBankGovernor(address(ve), 1, 10, 100, 10_001, THRESHOLD);
    }

    // ── propose ───────────────────────────────────────────────────────────────

    function test_propose_success() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();

        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test proposal");

        assertEq(id, 1);
        assertEq(gov.proposalCount(), 1);

        assertEq(id, 1);
        (uint256 snapshotTs,,,) = gov.getProposalTiming(id);
        assertGt(snapshotTs, 0, "Snapshot should be set");
    }

    function test_propose_belowThreshold_reverts() public {
        // CAROL a 10_000 FBK locks max → veFBK > threshold
        // Pour tester sous le threshold, on deploie un gov avec un threshold enorme
        FinBankGovernor bigThresholdGov = new FinBankGovernor(
            address(ve), VOTING_DELAY, VOTING_PERIOD, TIMELOCK_DELAY, QUORUM_BPS, 200_000e18
        );

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();

        vm.prank(CAROL);
        vm.expectRevert(); // BelowProposalThreshold
        bigThresholdGov.propose(targets, values, calldatas, "Should fail");
    }

    function test_propose_emptyTargets_reverts() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.InvalidParameter.selector);
        gov.propose(new address[](0), new uint256[](0), new bytes[](0), "Empty");
    }

    function test_propose_arrayMismatch_reverts() public {
        address[] memory targets   = new address[](1);
        uint256[] memory values    = new uint256[](2); // mismatch
        bytes[]   memory calldatas = new bytes[](1);

        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.ArrayLengthMismatch.selector);
        gov.propose(targets, values, calldatas, "Mismatch");
    }

    function test_propose_setsCorrectVoteWindow() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();

        uint256 blockBefore = block.number;
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        (uint256 snapshotTs, uint256 voteStart, uint256 voteEnd,) = gov.getProposalTiming(id);
        assertEq(voteStart,   blockBefore + VOTING_DELAY);
        assertEq(voteEnd,     blockBefore + VOTING_DELAY + VOTING_PERIOD);
        assertEq(snapshotTs,  block.timestamp);
    }

    // ── getState ──────────────────────────────────────────────────────────────

    function test_state_pendingAfterPropose() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Pending));
    }

    function test_state_activeAfterVotingDelay() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + VOTING_DELAY + 1);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Active));
    }

    function test_state_succeededAfterVotePasses() public {
        uint256 id = _createPassedProposal();
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Succeeded));
    }

    function test_state_defeatedIfQuorumNotReached() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();

        // Governor avec quorum enorme (impossible a atteindre)
        FinBankGovernor strictGov = new FinBankGovernor(
            address(ve), VOTING_DELAY, VOTING_PERIOD, TIMELOCK_DELAY, 9_000, THRESHOLD
        );

        vm.prank(ALICE);
        uint256 id = strictGov.propose(targets, values, calldatas, "Hard quorum");

        vm.roll(block.number + VOTING_DELAY + 1);
        vm.prank(ALICE);
        strictGov.castVote(id, FinBankGovernor.VoteType.For);

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint8(strictGov.getState(id)), uint8(FinBankGovernor.ProposalState.Defeated));
    }

    function test_state_defeatedIfMajorityAgainst() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Fails");

        vm.roll(block.number + VOTING_DELAY + 1);

        // Alice vote Against, Bob vote For — Alice a 2x les shares de Bob → defeated
        vm.prank(ALICE);
        gov.castVote(id, FinBankGovernor.VoteType.Against);
        vm.prank(BOB);
        gov.castVote(id, FinBankGovernor.VoteType.For);

        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Defeated));
    }

    function test_state_queuedAfterQueue() public {
        uint256 id = _createPassedProposal();
        gov.queue(id);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Queued));
    }

    function test_state_executedAfterExecute() public {
        uint256 id = _createPassedProposal();
        gov.queue(id);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        gov.execute(id);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Executed));
    }

    function test_state_canceledAfterCancel() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.prank(ALICE);
        gov.cancel(id);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Canceled));
    }

    // ── castVote ──────────────────────────────────────────────────────────────

    function test_castVote_notActive_reverts() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        // Encore en Pending
        vm.prank(ALICE);
        vm.expectRevert();
        gov.castVote(id, FinBankGovernor.VoteType.For);
    }

    function test_castVote_doubleVote_reverts() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + VOTING_DELAY + 1);

        vm.prank(ALICE);
        gov.castVote(id, FinBankGovernor.VoteType.For);

        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(FinBankGovernor.AlreadyVoted.selector, ALICE, id));
        gov.castVote(id, FinBankGovernor.VoteType.For);
    }

    function test_castVote_weightsCorrect() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + VOTING_DELAY + 1);

        vm.prank(ALICE);
        gov.castVote(id, FinBankGovernor.VoteType.For);
        vm.prank(BOB);
        gov.castVote(id, FinBankGovernor.VoteType.Against);
        vm.prank(CAROL);
        gov.castVote(id, FinBankGovernor.VoteType.Abstain);

        (uint256 forVotes, uint256 againstVotes, uint256 abstainVotes) = gov.getProposalVotes(id);

        assertGt(forVotes,     0, "Alice's For votes should be > 0");
        assertGt(againstVotes, 0, "Bob's Against votes should be > 0");
        assertGt(abstainVotes, 0, "Carol's Abstain votes should be > 0");
        assertGt(forVotes, againstVotes, "Alice has more veFBK than Bob");
    }

    function test_castVote_emitsEvent() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + VOTING_DELAY + 1);

        uint256 expectedWeight = ve.balanceOf(ALICE);

        vm.prank(ALICE);
        vm.expectEmit(true, true, false, false); // Ne verifie pas le poids exact (peut varier)
        emit VoteCast(ALICE, id, FinBankGovernor.VoteType.For, expectedWeight);
        gov.castVote(id, FinBankGovernor.VoteType.For);
    }

    function test_castVote_noVeFBK_hasZeroWeight() public {
        address STRANGER = address(0x5555);

        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.roll(block.number + VOTING_DELAY + 1);

        // STRANGER vote mais n'a aucun veFBK → poids 0
        vm.prank(STRANGER);
        gov.castVote(id, FinBankGovernor.VoteType.For);

        assertTrue(gov.hasVoted(id, STRANGER));
        (uint256 forVotes,,) = gov.getProposalVotes(id);
        assertEq(forVotes, 0, "Zero veFBK = zero weight");
    }

    // ── queue ─────────────────────────────────────────────────────────────────

    function test_queue_onlyIfSucceeded() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.expectRevert(); // NotSucceeded — encore Pending
        gov.queue(id);
    }

    function test_queue_setsTimelockEta() public {
        uint256 id = _createPassedProposal();

        uint256 expectedEta = block.timestamp + TIMELOCK_DELAY;
        gov.queue(id);

        (,,, uint256 timelockEta) = gov.getProposalTiming(id);
        assertEq(timelockEta, expectedEta);
    }

    function test_queue_emitsEvent() public {
        uint256 id = _createPassedProposal();
        uint256 expectedEta = block.timestamp + TIMELOCK_DELAY;

        vm.expectEmit(true, false, false, true);
        emit ProposalQueued(id, expectedEta);
        gov.queue(id);
    }

    // ── execute ───────────────────────────────────────────────────────────────

    function test_execute_beforeTimelock_reverts() public {
        uint256 id = _createPassedProposal();
        gov.queue(id);

        // Avance mais pas assez
        vm.warp(block.timestamp + TIMELOCK_DELAY - 1);

        vm.expectRevert(); // TimelockNotExpired
        gov.execute(id);
    }

    function test_execute_afterTimelock_callsTarget() public {
        uint256 id = _createPassedProposal();
        gov.queue(id);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);

        assertFalse(target.called());
        gov.execute(id);

        assertTrue(target.called(),     "Target should have been called");
        assertEq(target.value(), 42,    "Target value should be 42");
    }

    function test_execute_emitsEvent() public {
        uint256 id = _createPassedProposal();
        gov.queue(id);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);

        vm.expectEmit(true, false, false, false);
        emit ProposalExecuted(id);
        gov.execute(id);
    }

    function test_execute_notQueued_reverts() public {
        uint256 id = _createPassedProposal();

        // Pas encore queue
        vm.expectRevert();
        gov.execute(id);
    }

    // ── cancel ────────────────────────────────────────────────────────────────

    function test_cancel_byProposer_success() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.prank(ALICE);
        gov.cancel(id);

        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Canceled));
    }

    function test_cancel_byNonProposer_reverts() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.prank(BOB);
        vm.expectRevert(abi.encodeWithSelector(FinBankGovernor.NotProposer.selector, BOB, ALICE));
        gov.cancel(id);
    }

    function test_cancel_executedProposal_reverts() public {
        uint256 id = _createPassedProposal();
        gov.queue(id);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        gov.execute(id);

        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(FinBankGovernor.ProposalAlreadyExecuted.selector, id));
        gov.cancel(id);
    }

    function test_cancel_alreadyCanceled_reverts() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.prank(ALICE);
        gov.cancel(id);

        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSelector(FinBankGovernor.ProposalAlreadyCanceled.selector, id));
        gov.cancel(id);
    }

    function test_cancel_emitsEvent() public {
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();
        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Test");

        vm.prank(ALICE);
        vm.expectEmit(true, false, false, false);
        emit ProposalCanceled(id);
        gov.cancel(id);
    }

    // ── quorumVotes ───────────────────────────────────────────────────────────

    function test_quorumVotes_isProportionalToTotalLocked() public {
        uint256 total      = ve.totalLocked();
        uint256 expected   = (total * QUORUM_BPS) / 10_000;
        assertEq(gov.quorumVotes(), expected);
    }

    // ── Governance parameters (onlyGovernance) ────────────────────────────────

    function test_setVotingDelay_onlyGovernance() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.OnlyGovernance.selector);
        gov.setVotingDelay(5);
    }

    function test_setVotingPeriod_onlyGovernance() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.OnlyGovernance.selector);
        gov.setVotingPeriod(20);
    }

    function test_setTimelockDelay_onlyGovernance() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.OnlyGovernance.selector);
        gov.setTimelockDelay(200);
    }

    function test_setQuorumBps_onlyGovernance() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.OnlyGovernance.selector);
        gov.setQuorumBps(500);
    }

    function test_setProposalThreshold_onlyGovernance() public {
        vm.prank(ALICE);
        vm.expectRevert(FinBankGovernor.OnlyGovernance.selector);
        gov.setProposalThreshold(5e18);
    }

    function test_governance_canUpdateOwnParameters() public {
        // Propose un appel a setVotingDelay sur le governor lui-meme
        address[] memory targets   = new address[](1);
        uint256[] memory values    = new uint256[](1);
        bytes[]   memory calldatas = new bytes[](1);

        targets[0]   = address(gov);
        values[0]    = 0;
        calldatas[0] = abi.encodeWithSelector(FinBankGovernor.setVotingDelay.selector, 5);

        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Update votingDelay to 5");

        vm.roll(block.number + VOTING_DELAY + 1);
        vm.prank(ALICE);
        gov.castVote(id, FinBankGovernor.VoteType.For);
        vm.prank(BOB);
        gov.castVote(id, FinBankGovernor.VoteType.For);

        vm.roll(block.number + VOTING_PERIOD + 1);
        gov.queue(id);
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        gov.execute(id);

        assertEq(gov.votingDelay(), 5, "Voting delay should be updated via governance");
    }

    // ── Scenario complet ──────────────────────────────────────────────────────

    function test_scenario_fullLifecycle() public {
        // 1. Alice propose
        (address[] memory targets, uint256[] memory values, bytes[] memory calldatas) = _makeProposal();

        vm.prank(ALICE);
        uint256 id = gov.propose(targets, values, calldatas, "Set target value to 42");

        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Pending));

        // 2. Attente du votingDelay
        vm.roll(block.number + VOTING_DELAY + 1);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Active));

        // 3. Votes
        vm.prank(ALICE);
        gov.castVote(id, FinBankGovernor.VoteType.For);

        vm.prank(BOB);
        gov.castVote(id, FinBankGovernor.VoteType.For);

        vm.prank(CAROL);
        gov.castVote(id, FinBankGovernor.VoteType.Abstain);

        // 4. Fin du vote
        vm.roll(block.number + VOTING_PERIOD + 1);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Succeeded));

        // 5. Queue dans le timelock
        gov.queue(id);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Queued));

        // 6. Attente du timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);

        // 7. Execution
        gov.execute(id);
        assertEq(uint8(gov.getState(id)), uint8(FinBankGovernor.ProposalState.Executed));

        // 8. Verification de l'effet
        assertTrue(target.called());
        assertEq(target.value(), 42);
    }

}
