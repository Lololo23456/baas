// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// FBKToken - Token de gouvernance FinBank ($FBK)
//
// Proprietes fondamentales :
//   - Supply cappee a 100 000 000 $FBK (jamais modifiable)
//   - Minting exclusivement par le FBKDistributor -> Fair Launch garanti
//   - Burning pour le mecanisme buy-back & burn de la DAO
//   - Ownership transferable a la DAO on-chain (FinBankGovernor)

contract FBKToken {

    // ── Constants ─────────────────────────────────────────────────────────────

    string  public constant name     = "FinBank Governance Token";
    string  public constant symbol   = "FBK";
    uint8   public constant decimals = 18;

    // Cap absolu et definitif de la supply — jamais modifiable.
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;

    // ── Storage ───────────────────────────────────────────────────────────────

    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // DAO / multisig — peut changer le minter et transferer l'ownership.
    address public owner;

    // Seule adresse autorisee a minter (FBKDistributor).
    address public minter;

    // ── Errors ────────────────────────────────────────────────────────────────

    error NotOwner();
    error NotMinter();
    error ZeroAddress();
    error CapExceeded(uint256 requested, uint256 available);
    error InsufficientBalance(uint256 requested, uint256 available);
    error InsufficientAllowance(uint256 requested, uint256 allowed);

    // ── Events ────────────────────────────────────────────────────────────────

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _minter) {
        if (_minter == address(0)) revert ZeroAddress();
        owner  = msg.sender;
        minter = _minter;
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    // ── ERC-20 Standard ───────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount)
            revert InsufficientBalance(amount, balanceOf[msg.sender]);

        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance(amount, allowed);
        if (balanceOf[from] < amount) revert InsufficientBalance(amount, balanceOf[from]);

        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }

        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // ── Mint ──────────────────────────────────────────────────────────────────

    // Minte des $FBK vers une adresse. Reserve au FBKDistributor.
    // Le cap de 100M est absolu - aucune derogation possible.
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert ZeroAddress();
        uint256 available = MAX_SUPPLY - totalSupply;
        if (amount > available) revert CapExceeded(amount, available);

        totalSupply   += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    // ── Burn ──────────────────────────────────────────────────────────────────

    // Brule ses propres tokens.
    function burn(uint256 amount) external {
        if (balanceOf[msg.sender] < amount)
            revert InsufficientBalance(amount, balanceOf[msg.sender]);

        balanceOf[msg.sender] -= amount;
        totalSupply           -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    // Brule des tokens depuis une adresse via allowance.
    // Utilise par la tresorerie DAO pour le mecanisme buy-back & burn.
    function burnFrom(address from, uint256 amount) external {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < amount) revert InsufficientAllowance(amount, allowed);
        if (balanceOf[from] < amount) revert InsufficientBalance(amount, balanceOf[from]);

        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }

        balanceOf[from] -= amount;
        totalSupply     -= amount;
        emit Transfer(from, address(0), amount);
    }

    // ── View Helpers ──────────────────────────────────────────────────────────

    // Supply encore mintable avant d'atteindre le cap de 100M.
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply;
    }

    // Pourcentage de la supply emise (en basis points, 10000 = 100%).
    function supplyEmittedBps() external view returns (uint256) {
        if (totalSupply == 0) return 0;
        return (totalSupply * 10_000) / MAX_SUPPLY;
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    // Met a jour le FBKDistributor (vote DAO requis).
    // Permet de deployer un Distributor V2 sans changer le token.
    function setMinter(address newMinter) external onlyOwner {
        if (newMinter == address(0)) revert ZeroAddress();
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }

    // Transfere le ownership vers la DAO on-chain (FinBankGovernor).
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
