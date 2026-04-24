// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// FBKDistributor — Distribution de $FBK aux deposants du Vault
//
// Mecanisme (pattern Synthetix StakingRewards) :
//   Chaque deposant accumule des $FBK proportionnellement a ses shares fbEURC
//   et au temps ecoule. Le taux de distribution (FBK/seconde) est ajustable par la DAO.
//
//   rewardPerShare() = rewardPerShareStored
//                    + (maintenant - lastUpdate) * rewardRate * 1e18 / totalShares
//
//   earned(user) = userShares * (rewardPerShare() - userRewardPerSharePaid) / 1e18
//                + pendingReward
//
// Couplage Vault :
//   Le FinBankVault appelle notifyDeposit() / notifyWithdraw() a chaque interaction.
//   Le FBKDistributor est le seul minter autorise sur FBKToken.

interface IFBKToken {
    function mint(address to, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function MAX_SUPPLY() external view returns (uint256);
}

contract FBKDistributor {

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 private constant PRECISION = 1e18;

    // ── Storage ───────────────────────────────────────────────────────────────

    IFBKToken public immutable fbk;

    // Seul le Vault peut appeler notifyDeposit / notifyWithdraw.
    address public immutable vault;

    // DAO / multisig — peut modifier le taux et transferer le ownership.
    address public owner;

    // FBK emis par seconde (ajustable par la DAO).
    uint256 public rewardRate;

    // Accumulateur global (* PRECISION).
    uint256 public rewardPerShareStored;

    // Timestamp du dernier update de l'accumulateur.
    uint256 public lastUpdateTime;

    // Total de shares fbEURC traces par le distributor.
    uint256 public totalShares;

    // Total de $FBK distribues depuis le deploiement.
    uint256 public totalDistributed;

    // Shares fbEURC par utilisateur (miroir du Vault, pousse par les hooks).
    mapping(address => uint256) public userShares;

    // Valeur de l'accumulateur au dernier checkpoint de l'utilisateur.
    mapping(address => uint256) public userRewardPerSharePaid;

    // Recompenses accumulees mais non encore reclames.
    mapping(address => uint256) public pendingReward;

    // ── Errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error NotVault();
    error ZeroAddress();
    error NothingToClaim();

    // ── Events ────────────────────────────────────────────────────────────────

    event RewardRateUpdated(uint256 oldRate, uint256 newRate);
    event Claimed(address indexed user, uint256 amount);
    event SharesUpdated(address indexed user, uint256 userShares, uint256 totalShares);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _fbk, address _vault, uint256 _rewardRate) {
        if (_fbk   == address(0)) revert ZeroAddress();
        if (_vault == address(0)) revert ZeroAddress();

        fbk        = IFBKToken(_fbk);
        vault      = _vault;
        owner      = msg.sender;
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    // Met a jour l'accumulateur global et, si user != address(0), son checkpoint.
    modifier updateReward(address user) {
        rewardPerShareStored = rewardPerShare();
        lastUpdateTime       = block.timestamp;
        if (user != address(0)) {
            pendingReward[user]          = earned(user);
            userRewardPerSharePaid[user] = rewardPerShareStored;
        }
        _;
    }

    // ── View ──────────────────────────────────────────────────────────────────

    // Valeur courante de l'accumulateur global.
    function rewardPerShare() public view returns (uint256) {
        if (totalShares == 0) return rewardPerShareStored;
        uint256 timeDelta = block.timestamp - lastUpdateTime;
        return rewardPerShareStored + (timeDelta * rewardRate * PRECISION) / totalShares;
    }

    // Recompenses accumulees par un utilisateur (claimees + en attente).
    function earned(address user) public view returns (uint256) {
        return (userShares[user] * (rewardPerShare() - userRewardPerSharePaid[user])) / PRECISION
               + pendingReward[user];
    }

    // FBK encore mintables avant d'atteindre le cap de 100M.
    function remainingMintable() external view returns (uint256) {
        return fbk.MAX_SUPPLY() - fbk.totalSupply();
    }

    // ── Vault Hooks ───────────────────────────────────────────────────────────

    // Appele par le Vault apres chaque depot. Incremente les shares de l'utilisateur.
    function notifyDeposit(address user, uint256 shares) external onlyVault updateReward(user) {
        userShares[user] += shares;
        totalShares      += shares;
        emit SharesUpdated(user, userShares[user], totalShares);
    }

    // Appele par le Vault apres chaque retrait. Decremente les shares de l'utilisateur.
    function notifyWithdraw(address user, uint256 shares) external onlyVault updateReward(user) {
        userShares[user] -= shares;
        totalShares      -= shares;
        emit SharesUpdated(user, userShares[user], totalShares);
    }

    // ── Claim ─────────────────────────────────────────────────────────────────

    // Reclame les $FBK accumules. Les minte directement vers l'appelant.
    function claim() external updateReward(msg.sender) {
        uint256 reward = pendingReward[msg.sender];
        if (reward == 0) revert NothingToClaim();

        pendingReward[msg.sender] = 0;
        totalDistributed         += reward;

        fbk.mint(msg.sender, reward);
        emit Claimed(msg.sender, reward);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    // Met a jour le taux de distribution. L'accumulateur est mis a jour avant le changement.
    function setRewardRate(uint256 newRate) external onlyOwner updateReward(address(0)) {
        emit RewardRateUpdated(rewardRate, newRate);
        rewardRate = newRate;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
