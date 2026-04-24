// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// VeFBK - Vote-Escrowed FBK ($veFBK)
// Modele inspire de Curve Finance veCRV.
//
// Mecanisme :
//   Tu deposes des $FBK et les bloques pour une duree (1 semaine a 4 ans).
//   Tu recois du $veFBK proportionnel a : montant * duree_restante / duree_max
//   Le $veFBK decroit lineairement jusqu'a 0 a l'expiration du lock.
//   Le $veFBK est non-transferable — c'est un poids de vote, pas un token.
//
// Exemple :
//   Lock 1000 FBK pour 4 ans  -> 1000 veFBK au moment du lock
//   Lock 1000 FBK pour 2 ans  ->  500 veFBK au moment du lock
//   Apres 1 an (sur 2 ans)    ->  250 veFBK (decroit lineairement)
//   A l'expiration             ->    0 veFBK, retrait possible
//
// Pouvoirs du $veFBK :
//   - Vote DAO (FinBankGovernor)
//   - Part majoree du yield de tresorerie (FBKDistributor)

interface IFBK {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract VeFBK {

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant WEEK             = 7 * 86400;
    uint256 public constant MAX_LOCK_DURATION = 4 * 365 * 86400; // 4 ans en secondes
    uint256 public constant MIN_LOCK_DURATION = WEEK;             // 1 semaine minimum

    // ── Types ─────────────────────────────────────────────────────────────────

    struct LockedBalance {
        uint128 amount;  // Montant de $FBK bloques
        uint64  end;     // Timestamp d'expiration du lock (arrondi a la semaine)
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    IFBK public immutable fbk;

    mapping(address => LockedBalance) public locked;

    // Total de $FBK bloques dans le contrat
    uint256 public totalLocked;

    // ── Errors ────────────────────────────────────────────────────────────────

    error ZeroAmount();
    error ZeroAddress();
    error LockTooShort(uint256 duration, uint256 minimum);
    error LockTooLong(uint256 duration, uint256 maximum);
    error LockAlreadyExists();
    error NoLockFound();
    error LockNotExpired(uint256 unlockTime);
    error LockExpired();
    error NewEndNotLater(uint256 current, uint256 proposed);

    // ── Events ────────────────────────────────────────────────────────────────

    event LockCreated(address indexed user, uint256 amount, uint256 unlockTime);
    event LockIncreased(address indexed user, uint256 addedAmount, uint256 newTotal);
    event LockExtended(address indexed user, uint256 oldEnd, uint256 newEnd);
    event Withdrawn(address indexed user, uint256 amount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address _fbk) {
        if (_fbk == address(0)) revert ZeroAddress();
        fbk = IFBK(_fbk);
    }

    // ── Lock ──────────────────────────────────────────────────────────────────

    // Cree un nouveau lock : depose amount $FBK, expires dans lockDuration secondes.
    // lockDuration est arrondi a la semaine inferieure pour simplifier le calcul.
    function createLock(uint256 amount, uint256 lockDuration) external {
        if (amount == 0) revert ZeroAmount();
        if (lockDuration < MIN_LOCK_DURATION) revert LockTooShort(lockDuration, MIN_LOCK_DURATION);
        if (lockDuration > MAX_LOCK_DURATION) revert LockTooLong(lockDuration, MAX_LOCK_DURATION);
        if (locked[msg.sender].amount > 0) revert LockAlreadyExists();

        // Arrondi a la semaine (comme Curve) pour des expirations propres
        uint64 unlockTime = uint64(_roundToWeek(block.timestamp + lockDuration));

        locked[msg.sender] = LockedBalance({
            amount: uint128(amount),
            end:    unlockTime
        });
        totalLocked += amount;

        fbk.transferFrom(msg.sender, address(this), amount);

        emit LockCreated(msg.sender, amount, unlockTime);
    }

    // Ajoute des $FBK a un lock existant sans changer la date d'expiration.
    function increaseAmount(uint256 additionalAmount) external {
        if (additionalAmount == 0) revert ZeroAmount();

        LockedBalance storage lock = locked[msg.sender];
        if (lock.amount == 0) revert NoLockFound();
        if (block.timestamp >= lock.end) revert LockExpired();

        lock.amount  += uint128(additionalAmount);
        totalLocked  += additionalAmount;

        fbk.transferFrom(msg.sender, address(this), additionalAmount);

        emit LockIncreased(msg.sender, additionalAmount, lock.amount);
    }

    // Prolonge la duree du lock sans changer le montant.
    // newUnlockTime doit etre plus loin que l'expiration actuelle.
    function extendLock(uint256 newUnlockTime) external {
        LockedBalance storage lock = locked[msg.sender];
        if (lock.amount == 0) revert NoLockFound();
        if (block.timestamp >= lock.end) revert LockExpired();

        uint64 roundedNewEnd = uint64(_roundToWeek(newUnlockTime));

        if (roundedNewEnd <= lock.end)
            revert NewEndNotLater(lock.end, roundedNewEnd);
        if (roundedNewEnd > _roundToWeek(block.timestamp + MAX_LOCK_DURATION))
            revert LockTooLong(roundedNewEnd - block.timestamp, MAX_LOCK_DURATION);

        uint64 oldEnd = lock.end;
        lock.end = roundedNewEnd;

        emit LockExtended(msg.sender, oldEnd, roundedNewEnd);
    }

    // ── Withdraw ──────────────────────────────────────────────────────────────

    // Retire les $FBK une fois le lock expire.
    // Censure-resistance : aucune condition supplementaire hors expiration.
    function withdraw() external {
        LockedBalance memory lock = locked[msg.sender];
        if (lock.amount == 0) revert NoLockFound();
        if (block.timestamp < lock.end) revert LockNotExpired(lock.end);

        uint256 amount = lock.amount;
        delete locked[msg.sender];
        totalLocked -= amount;

        fbk.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // ── View : Solde veFBK ────────────────────────────────────────────────────

    // Retourne le solde veFBK actuel d'un utilisateur.
    // Decroit lineairement : veFBK = amount * (end - now) / MAX_LOCK_DURATION
    // Retourne 0 si le lock est expire ou inexistant.
    function balanceOf(address user) public view returns (uint256) {
        LockedBalance memory lock = locked[user];
        return _veBalance(lock, block.timestamp);
    }

    // Retourne le solde veFBK a un timestamp donne (pour les snapshots de vote).
    function balanceOfAt(address user, uint256 timestamp) external view returns (uint256) {
        LockedBalance memory lock = locked[user];
        return _veBalance(lock, timestamp);
    }

    // Total de veFBK en circulation a l'instant present.
    // Note : calcul approximatif sans checkpoints — suffisant pour la V1.
    // La V2 utilisera des checkpoints pour les requetes historiques on-chain.
    function totalSupply() external view returns (uint256 total) {
        // Non implementable efficacement sans iterer tous les locks.
        // Retourner le total locked comme approximation (surestimation de veFBK).
        // Le FinBankGovernor utilisera balanceOf() par utilisateur.
        return totalLocked;
    }

    // Duree restante du lock d'un utilisateur (en secondes).
    function remainingLockDuration(address user) external view returns (uint256) {
        LockedBalance memory lock = locked[user];
        if (lock.end <= block.timestamp) return 0;
        return lock.end - block.timestamp;
    }

    // True si le lock d'un utilisateur est expire (ou inexistant).
    function isExpired(address user) external view returns (bool) {
        return block.timestamp >= locked[user].end;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _veBalance(LockedBalance memory lock, uint256 timestamp) internal pure returns (uint256) {
        if (lock.amount == 0)         return 0;
        if (timestamp >= lock.end)    return 0;

        uint256 timeRemaining = lock.end - timestamp;
        // veFBK = amount * timeRemaining / MAX_LOCK_DURATION
        return (uint256(lock.amount) * timeRemaining) / MAX_LOCK_DURATION;
    }

    // Arrondi d'un timestamp a la semaine inferieure (comme Curve).
    function _roundToWeek(uint256 timestamp) internal pure returns (uint256) {
        return (timestamp / WEEK) * WEEK;
    }
}
