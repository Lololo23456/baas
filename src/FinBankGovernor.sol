// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// FinBankGovernor — Gouvernance on-chain FinBank
//
// Mecanisme :
//   Le pouvoir de vote est le solde $veFBK au moment du snapshot (proposalId).
//   Une proposition passe si : quorum atteint ET majorite Pour.
//
// Cycle de vie d'une proposition :
//   1. propose()  — cree la proposition, snapshot du veFBK
//   2. [votingDelay] — periode de reflexion avant ouverture du vote
//   3. [votingPeriod] — fenetre de vote (For / Against / Abstain)
//   4. [timelockDelay] — delai de securite avant execution
//   5. execute()  — execute les appels on-chain si la proposition a passe
//   6. cancel()   — annulation possible par le proposant (si pas encore executee)
//
// Parametres (ajustables par la DAO elle-meme) :
//   - votingDelay   : delai entre la creation et l'ouverture du vote (en blocs)
//   - votingPeriod  : duree du vote (en blocs)
//   - timelockDelay : delai entre la fin du vote et l'execution (en secondes)
//   - quorumBps     : quorum minimum en basis points du totalSupply veFBK
//   - proposalThreshold : veFBK minimum pour soumettre une proposition

interface IVeFBK {
    function balanceOf(address user) external view returns (uint256);
    function balanceOfAt(address user, uint256 timestamp) external view returns (uint256);
    function totalLocked() external view returns (uint256);
}

contract FinBankGovernor {

    // ── Types ─────────────────────────────────────────────────────────────────

    enum ProposalState {
        Pending,   // Cree, en attente du votingDelay
        Active,    // Vote ouvert
        Defeated,  // Quorum non atteint ou majorite Pour insuffisante
        Succeeded, // Vote passe, en attente du timelock
        Queued,    // Dans le timelock, en attente d'execution
        Executed,  // Execute
        Canceled   // Annule
    }

    enum VoteType { Against, For, Abstain }

    struct Proposal {
        uint256 id;
        address proposer;
        uint256 snapshotTimestamp; // Timestamp du snapshot veFBK
        uint256 voteStart;         // Bloc d'ouverture du vote
        uint256 voteEnd;           // Bloc de cloture du vote
        uint256 timelockEta;       // Timestamp d'execution possible (0 si pas encore queue)
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool    executed;
        bool    canceled;
        // Appels on-chain a executer
        address[] targets;
        uint256[] values;
        bytes[]   calldatas;
        string    description;
    }

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant BPS_BASE = 10_000;

    // ── Storage ───────────────────────────────────────────────────────────────

    IVeFBK public immutable veFBK;

    // Parametres de gouvernance (modifiables par proposition uniquement)
    uint256 public votingDelay;        // En blocs
    uint256 public votingPeriod;       // En blocs
    uint256 public timelockDelay;      // En secondes
    uint256 public quorumBps;          // Basis points du totalLocked veFBK
    uint256 public proposalThreshold;  // veFBK minimum pour proposer

    uint256 public proposalCount;

    mapping(uint256 => Proposal)                        public proposals;
    mapping(uint256 => mapping(address => bool))        public hasVoted;
    mapping(uint256 => mapping(address => VoteType))    public voteChoice;

    // ── Errors ────────────────────────────────────────────────────────────────

    error BelowProposalThreshold(uint256 balance, uint256 threshold);
    error ProposalNotActive(uint256 proposalId, ProposalState state);
    error AlreadyVoted(address voter, uint256 proposalId);
    error ProposalNotSucceeded(uint256 proposalId, ProposalState state);
    error ProposalNotQueued(uint256 proposalId, ProposalState state);
    error TimelockNotExpired(uint256 eta, uint256 now_);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error ProposalAlreadyCanceled(uint256 proposalId);
    error NotProposer(address caller, address proposer);
    error ArrayLengthMismatch();
    error InvalidParameter();
    error OnlyGovernance();

    // ── Events ────────────────────────────────────────────────────────────────

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
        VoteType        voteType,
        uint256         weight
    );
    event ProposalQueued(uint256 indexed proposalId, uint256 eta);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event VotingDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event TimelockDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event QuorumUpdated(uint256 oldBps, uint256 newBps);
    event ProposalThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _veFBK,
        uint256 _votingDelay,    // En blocs (ex: 1 bloc ~ attente minimale)
        uint256 _votingPeriod,   // En blocs (ex: 45818 ~ 1 semaine sur Base)
        uint256 _timelockDelay,  // En secondes (ex: 2 * 86400 = 2 jours)
        uint256 _quorumBps,      // Ex: 400 = 4% du totalLocked
        uint256 _proposalThreshold // Ex: 10_000e18 = 10 000 veFBK minimum
    ) {
        if (_veFBK == address(0))  revert InvalidParameter();
        if (_votingPeriod == 0)    revert InvalidParameter();
        if (_quorumBps > BPS_BASE) revert InvalidParameter();

        veFBK              = IVeFBK(_veFBK);
        votingDelay        = _votingDelay;
        votingPeriod       = _votingPeriod;
        timelockDelay      = _timelockDelay;
        quorumBps          = _quorumBps;
        proposalThreshold  = _proposalThreshold;
    }

    // ── Propose ───────────────────────────────────────────────────────────────

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[]   memory calldatas,
        string    memory description
    ) external returns (uint256 proposalId) {
        if (targets.length != values.length || targets.length != calldatas.length)
            revert ArrayLengthMismatch();
        if (targets.length == 0)
            revert InvalidParameter();

        uint256 proposerBalance = veFBK.balanceOf(msg.sender);
        if (proposerBalance < proposalThreshold)
            revert BelowProposalThreshold(proposerBalance, proposalThreshold);

        proposalId = ++proposalCount;
        uint256 voteStart = block.number + votingDelay;
        uint256 voteEnd   = voteStart + votingPeriod;

        Proposal storage p = proposals[proposalId];
        p.id                = proposalId;
        p.proposer          = msg.sender;
        p.snapshotTimestamp = block.timestamp;
        p.voteStart         = voteStart;
        p.voteEnd           = voteEnd;
        p.targets           = targets;
        p.values            = values;
        p.calldatas         = calldatas;
        p.description       = description;

        emit ProposalCreated(proposalId, msg.sender, targets, values, calldatas, voteStart, voteEnd, description);
    }

    // ── Vote ──────────────────────────────────────────────────────────────────

    function castVote(uint256 proposalId, VoteType voteType) external {
        ProposalState state = getState(proposalId);
        if (state != ProposalState.Active)
            revert ProposalNotActive(proposalId, state);
        if (hasVoted[proposalId][msg.sender])
            revert AlreadyVoted(msg.sender, proposalId);

        Proposal storage p = proposals[proposalId];

        // Poids = solde veFBK au moment du snapshot de la proposition
        uint256 weight = veFBK.balanceOfAt(msg.sender, p.snapshotTimestamp);

        hasVoted[proposalId][msg.sender]  = true;
        voteChoice[proposalId][msg.sender] = voteType;

        if (voteType == VoteType.For)         p.forVotes     += weight;
        else if (voteType == VoteType.Against) p.againstVotes += weight;
        else                                   p.abstainVotes += weight;

        emit VoteCast(msg.sender, proposalId, voteType, weight);
    }

    // ── Queue ─────────────────────────────────────────────────────────────────

    // Place une proposition reussie dans le timelock.
    function queue(uint256 proposalId) external {
        ProposalState state = getState(proposalId);
        if (state != ProposalState.Succeeded)
            revert ProposalNotSucceeded(proposalId, state);

        uint256 eta = block.timestamp + timelockDelay;
        proposals[proposalId].timelockEta = eta;

        emit ProposalQueued(proposalId, eta);
    }

    // ── Execute ───────────────────────────────────────────────────────────────

    function execute(uint256 proposalId) external {
        ProposalState state = getState(proposalId);
        if (state != ProposalState.Queued)
            revert ProposalNotQueued(proposalId, state);

        Proposal storage p = proposals[proposalId];
        if (block.timestamp < p.timelockEta)
            revert TimelockNotExpired(p.timelockEta, block.timestamp);

        p.executed = true;

        for (uint256 i = 0; i < p.targets.length; i++) {
            (bool success,) = p.targets[i].call{value: p.values[i]}(p.calldatas[i]);
            require(success, "FinBankGovernor: call failed");
        }

        emit ProposalExecuted(proposalId);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    // Le proposant peut annuler avant l'execution.
    function cancel(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.executed)  revert ProposalAlreadyExecuted(proposalId);
        if (p.canceled)  revert ProposalAlreadyCanceled(proposalId);
        if (msg.sender != p.proposer) revert NotProposer(msg.sender, p.proposer);

        p.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function getState(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "FinBankGovernor: unknown proposal");

        if (p.canceled)  return ProposalState.Canceled;
        if (p.executed)  return ProposalState.Executed;

        if (block.number <= p.voteStart) return ProposalState.Pending;
        if (block.number <= p.voteEnd)   return ProposalState.Active;

        // Vote termine : evaluer le resultat
        if (!_quorumReached(p) || !_voteSucceeded(p)) return ProposalState.Defeated;

        // Passe : dans le timelock ou en attente de queue
        if (p.timelockEta == 0) return ProposalState.Succeeded;
        return ProposalState.Queued;
    }

    function quorumVotes() public view returns (uint256) {
        return (veFBK.totalLocked() * quorumBps) / BPS_BASE;
    }

    // Retourne les timestamps et blocs cles d'une proposition.
    function getProposalTiming(uint256 proposalId) external view returns (
        uint256 snapshotTimestamp,
        uint256 voteStart,
        uint256 voteEnd,
        uint256 timelockEta
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.snapshotTimestamp, p.voteStart, p.voteEnd, p.timelockEta);
    }

    // Retourne les compteurs de votes d'une proposition.
    function getProposalVotes(uint256 proposalId) external view returns (
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    ) {
        Proposal storage p = proposals[proposalId];
        return (p.forVotes, p.againstVotes, p.abstainVotes);
    }

    // ── Governance Parameters (self-amendment) ────────────────────────────────

    // Ces fonctions ne peuvent etre appelees que par le governor lui-meme
    // (via une proposition executee). Pattern standard OpenZeppelin Governor.

    modifier onlyGovernance() {
        if (msg.sender != address(this)) revert OnlyGovernance();
        _;
    }

    function setVotingDelay(uint256 newDelay) external onlyGovernance {
        emit VotingDelayUpdated(votingDelay, newDelay);
        votingDelay = newDelay;
    }

    function setVotingPeriod(uint256 newPeriod) external onlyGovernance {
        if (newPeriod == 0) revert InvalidParameter();
        emit VotingPeriodUpdated(votingPeriod, newPeriod);
        votingPeriod = newPeriod;
    }

    function setTimelockDelay(uint256 newDelay) external onlyGovernance {
        emit TimelockDelayUpdated(timelockDelay, newDelay);
        timelockDelay = newDelay;
    }

    function setQuorumBps(uint256 newBps) external onlyGovernance {
        if (newBps > BPS_BASE) revert InvalidParameter();
        emit QuorumUpdated(quorumBps, newBps);
        quorumBps = newBps;
    }

    function setProposalThreshold(uint256 newThreshold) external onlyGovernance {
        emit ProposalThresholdUpdated(proposalThreshold, newThreshold);
        proposalThreshold = newThreshold;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _quorumReached(Proposal storage p) internal view returns (bool) {
        uint256 totalVotes = p.forVotes + p.againstVotes + p.abstainVotes;
        return totalVotes >= quorumVotes();
    }

    function _voteSucceeded(Proposal storage p) internal view returns (bool) {
        return p.forVotes > p.againstVotes;
    }
}
