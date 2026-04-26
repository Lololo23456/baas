// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// FinBankVault — Le cœur du protocole FinBank
//
// Un vault ERC-4626 qui dépose les fonds dans Morpho Blue et reverse le yield
// aux déposants, après prélèvement d'une protocol fee pour la DAO.
//
// Architecture :
//   User EURC ──deposit──► FinBankVault ──supply──► Morpho Blue (EURC market)
//                                                          │
//                                          yield ◄─────────┘
//                                            │
//                              ┌─────────────┴─────────────┐
//                              │                           │
//                           ~85%                        ~15%
//                        déposants                   treasury DAO
//
// Propriétés clés :
//   - Censure-résistance : les retraits ne peuvent jamais être bloqués
//     (sauf si Morpho Blue lui-même est en pause — risque résiduel assumé)
//   - Accès KYC : seuls les wallets avec attestation EAS valide peuvent déposer
//   - Gouvernance : les paramètres clés sont modifiables par la DAO uniquement
//   - Upgradeable : prévu pour une migration vers V2 via un mécanisme de migration
// ─────────────────────────────────────────────────────────────────────────────

import {IMorpho, MarketParams, Id} from "./interfaces/IMorpho.sol";
import {IEASChecker} from "./interfaces/IEASChecker.sol";

// Interface minimale du FBKDistributor — appele a chaque depot/retrait.
interface IFBKDistributor {
    function notifyDeposit(address user, uint256 shares) external;
    function notifyWithdraw(address user, uint256 shares) external;
}

// Interface ERC-20 minimale (EURC)
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ─────────────────────────────────────────────────────────────────────────────
// FinBankVault
// ─────────────────────────────────────────────────────────────────────────────

contract FinBankVault {

    // ── Constantes ────────────────────────────────────────────────────────────

    uint256 public constant MAX_FEE_BPS = 3_000; // 30% — plafond absolu
    uint256 public constant BPS_BASE    = 10_000;

    // Adresses connues sur Base (mainnet)
    // EURC  : 0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42
    // Morpho: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb

    // ── Erreurs ───────────────────────────────────────────────────────────────

    error NotOwner();
    error NotAuthorized(address user);      // Pas d'attestation KYC valide
    error ZeroAmount();
    error ZeroAddress();
    error Reentrancy();
    error ExceedsBalance(uint256 requested, uint256 available);
    error FeeTooHigh(uint256 feeBps, uint256 maxFeeBps);
    error ZeroShares();
    error ZeroAssets();
    error ReceiverNotAuthorized(address receiver); // KYC manquant sur le receveur des shares

    // ── Events ────────────────────────────────────────────────────────────────

    event Deposit(
        address indexed caller,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event FeesAccrued(uint256 yieldGenerated, uint256 feeAssets, uint256 feeShares);
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event MarketUpdated(bytes32 oldMarketId, bytes32 newMarketId);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event CheckerUpdated(address indexed oldChecker, address indexed newChecker);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ── ERC-4626 / ERC-20 Storage ─────────────────────────────────────────────

    // @notice Nom du token de vault (share token).
    string public name   = "FinBank EURC Vault";

    // @notice Symbole du token de vault.
    string public symbol = "fbEURC";

    // @notice Décimales du share token (identique à EURC = 6).
    uint8  public decimals = 6;

    // @notice Supply totale de shares en circulation.
    uint256 public totalSupply;

    // @notice Solde de shares par adresse.
    mapping(address => uint256) public balanceOf;

    // @notice Allowances ERC-20 (pour les transferts de shares).
    mapping(address => mapping(address => uint256)) public allowance;

    // ── Protocol Storage ──────────────────────────────────────────────────────

    // @notice Token sous-jacent : EURC sur Base.
    IERC20 public immutable asset;

    // @notice Contrat Morpho Blue sur Base.
    IMorpho public immutable morpho;

    // @notice Paramètres du marché Morpho Blue actif.
    MarketParams public marketParams;

    // @notice Vérificateur KYC — implémente IEASChecker (EASChecker ou CoinbaseEASChecker).
    // @dev Mutable : la DAO peut changer de provider KYC sans redéployer le Vault.
    IEASChecker public easChecker;

    // @notice DAO / multisig propriétaire du protocole.
    address public owner;

    // @notice Adresse de la trésorerie DAO (reçoit les fees sous forme de shares).
    address public treasury;

    // @notice Protocol fee en basis points (ex: 1500 = 15%).
    uint256 public feeBps;

    // @notice Total d'assets sous gestion au dernier checkpoint (pour calculer le yield).
    uint256 public lastTotalAssets;

    // @notice Distributor de $FBK — notifie les depots/retraits pour le calcul des recompenses.
    // @dev Optionnel : si address(0), les hooks sont silencieux.
    address public distributor;

    // Reentrancy guard (1 = unlocked, 2 = locked).
    uint256 private _locked = 1;

    // ── Constructor ───────────────────────────────────────────────────────────

    // @param _asset     Adresse de l'EURC sur Base.
    // @param _morpho    Adresse du contrat Morpho Blue sur Base.
    // @param _market    Paramètres du marché Morpho Blue cible.
    // @param _checker   Adresse du contrat EASChecker.
    // @param _treasury  Adresse initiale de la trésorerie DAO.
    // @param _feeBps    Protocol fee initiale (ex: 1500 pour 15%).
    constructor(
        address _asset,
        address _morpho,
        MarketParams memory _market,
        address _checker,
        address _treasury,
        uint256 _feeBps
    ) {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh(_feeBps, MAX_FEE_BPS);
        if (_asset    == address(0)) revert ZeroAddress();
        if (_morpho   == address(0)) revert ZeroAddress();
        if (_checker  == address(0)) revert ZeroAddress(); // [MEDIUM-2]
        if (_treasury == address(0)) revert ZeroAddress();

        asset       = IERC20(_asset);
        morpho      = IMorpho(_morpho);
        marketParams = _market;
        easChecker  = IEASChecker(_checker);
        treasury    = _treasury;
        feeBps      = _feeBps;
        owner       = msg.sender;

        // Approve Morpho pour dépenser les EURC du vault (max allowance)
        IERC20(_asset).approve(_morpho, type(uint256).max);
    }

    // ── Modifiers ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    // ── ERC-4626 Core ─────────────────────────────────────────────────────────

    // @notice Retourne l'adresse du token sous-jacent (EURC).
    function assetAddress() external view returns (address) {
        return address(asset);
    }

    // @notice Retourne le total d'EURC sous gestion dans le vault.
    // @dev Inclut les assets déposés dans Morpho Blue + le yield accumulé.
    //      Cette valeur augmente en temps réel grâce aux intérêts Morpho.
    function totalAssets() public view returns (uint256) {
        // Assets EURC détenus directement par le vault (normalement 0 ou résidu)
        uint256 directBalance = asset.balanceOf(address(this));

        // Assets déposés dans Morpho Blue (en shares → conversion en assets)
        uint256 morphoAssets = _morphoAssetsOf(address(this));

        return directBalance + morphoAssets;
    }

    // @notice Convertit un montant d'assets en shares (arrondi vers le bas).
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply;
        if (supply == 0) return assets; // Premier dépôt : 1 share = 1 asset
        return (assets * supply) / totalAssets();
    }

    // @notice Convertit un montant de shares en assets (arrondi vers le bas).
    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply;
        if (supply == 0) return shares;
        return (shares * totalAssets()) / supply;
    }

    // @notice Maximum déposable par un utilisateur.
    // @dev Retourne 0 si le wallet n'a pas d'attestation KYC valide.
    function maxDeposit(address user) external view returns (uint256) {
        if (!easChecker.isAuthorized(user)) return 0;
        return type(uint256).max;
    }

    // @notice Maximum retiable par un utilisateur (basé sur ses shares).
    // @dev Toujours disponible — censure-résistance garantie.
    function maxWithdraw(address user) external view returns (uint256) {
        return convertToAssets(balanceOf[user]);
    }

    // @notice Prévisualise le nombre de shares reçues pour un dépôt.
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return convertToShares(assets);
    }

    // @notice Prévisualise le nombre d'assets reçus pour un retrait de shares.
    function previewRedeem(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    // ── Deposit ───────────────────────────────────────────────────────────────

    // @notice Dépose des EURC dans le vault et reçoit des shares (fbEURC).
    // @dev Nécessite une attestation KYC valide via EASChecker.
    //      Les EURC sont immédiatement déposés dans Morpho Blue.
    // @param assets  Montant d'EURC à déposer.
    // @param receiver Adresse qui recevra les shares (généralement msg.sender).
    // @return shares Nombre de shares fbEURC émises.
    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        // 1. Vérification KYC — bloque les dépôts sans attestation valide
        //    (les retraits ne sont jamais bloqués — voir withdraw())
        if (!easChecker.isAuthorized(msg.sender)) revert NotAuthorized(msg.sender);
        // Si le receveur des shares est différent du deposant, il doit aussi être KYC.
        // Cela évite qu'un wallet KYC dépose pour un wallet non-KYC (conformité réglementaire).
        if (receiver != msg.sender && !easChecker.isAuthorized(receiver))
            revert ReceiverNotAuthorized(receiver);

        // 2. Accrue les fees sur le yield généré depuis le dernier checkpoint
        _accrueFees();

        // 3. Calcule les shares APRÈS l'accrual des fees
        shares = previewDeposit(assets);
        if (shares == 0) revert ZeroShares();

        // 4. Transfert des EURC du user vers le vault
        asset.transferFrom(msg.sender, address(this), assets);

        // 5. Dépôt dans Morpho Blue
        morpho.supply(marketParams, assets, 0, address(this), "");

        // 6. Mint des shares au receiver
        _mint(receiver, shares);

        // 7. Notifie le distributor $FBK (si configure)
        if (distributor != address(0)) {
            IFBKDistributor(distributor).notifyDeposit(receiver, shares);
        }

        // 8. Met à jour le checkpoint
        lastTotalAssets = totalAssets();

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    // ── Withdraw ──────────────────────────────────────────────────────────────

    // @notice Retire des EURC en brûlant des shares.
    // @dev CENSURE-RÉSISTANCE : aucune vérification KYC sur les retraits.
    //      Si l'attestation d'un user expire, il peut toujours récupérer ses fonds.
    // @param shares   Nombre de shares fbEURC à brûler.
    // @param receiver Adresse qui recevra les EURC.
    // @param owner_   Adresse dont on brûle les shares.
    // @return assets  Montant d'EURC retirés.
    function redeem(
        uint256 shares,
        address receiver,
        address owner_
    ) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();
        if (shares > balanceOf[owner_]) revert ExceedsBalance(shares, balanceOf[owner_]);

        // Vérifie les allowances si l'appelant n'est pas le propriétaire des shares
        if (msg.sender != owner_) {
            uint256 allowed = allowance[owner_][msg.sender];
            if (allowed == type(uint256).max) {
                // infinite approval — pas de déduction
            } else if (allowed < shares) {
                revert ExceedsBalance(shares, allowed);
            } else {
                allowance[owner_][msg.sender] = allowed - shares;
            }
        }

        // 1. Accrue les fees
        _accrueFees();

        // 2. Calcule les assets à retirer
        assets = previewRedeem(shares);
        if (assets == 0) revert ZeroAssets();

        // 3. Brûle les shares
        _burn(owner_, shares);

        // 4. Notifie le distributor $FBK (si configure)
        if (distributor != address(0)) {
            IFBKDistributor(distributor).notifyWithdraw(owner_, shares);
        }

        // 5. Retire les assets de Morpho Blue vers le vault
        morpho.withdraw(marketParams, assets, 0, address(this), address(this));

        // 6. Transfère les EURC au receiver
        asset.transfer(receiver, assets);

        // 7. Met à jour le checkpoint
        lastTotalAssets = totalAssets();

        emit Withdraw(msg.sender, receiver, owner_, assets, shares);
    }

    // ── Fee Accrual ───────────────────────────────────────────────────────────

    // @notice Calcule et prélève les fees sur le yield généré.
    // @dev Les fees sont prélevées sous forme de shares mintées à la trésorerie.
    //      Cela évite tout mouvement d'EURC — pas de retrait partiel de Morpho.
    //      Mécanisme identique à Yearn v3 / ERC-4626 fee standard.
    function _accrueFees() internal {
        uint256 currentAssets = totalAssets();

        // Pas de yield à prélever si les assets n'ont pas augmenté
        if (currentAssets <= lastTotalAssets) {
            lastTotalAssets = currentAssets;
            return;
        }

        // Calcule le yield brut depuis le dernier checkpoint
        uint256 yieldGenerated = currentAssets - lastTotalAssets;

        // Calcule les assets dus à la trésorerie
        uint256 feeAssets = (yieldGenerated * feeBps) / BPS_BASE;
        if (feeAssets == 0) return;

        // Convertit les fee assets en shares (dilue légèrement les déposants)
        // Calcul : shares = feeAssets * totalSupply / (currentAssets - feeAssets)
        //          pour que les shares mintées représentent exactement feeAssets
        uint256 feeShares;
        uint256 supply = totalSupply;
        if (supply == 0) {
            feeShares = feeAssets;
        } else {
            // On mint des shares représentant feeAssets SANS changer totalAssets
            feeShares = (feeAssets * supply) / (currentAssets - feeAssets);
        }

        if (feeShares == 0) return;

        // Mint les shares à la trésorerie
        _mint(treasury, feeShares);

        emit FeesAccrued(yieldGenerated, feeAssets, feeShares);
    }

    // ── Governance ────────────────────────────────────────────────────────────

    // @notice Met à jour la protocol fee. Vote DAO requis.
    // @param newFeeBps Nouvelle fee en basis points (max 30%).
    function setFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        _accrueFees(); // Accrue avec l'ancienne fee avant de changer
        emit FeeUpdated(feeBps, newFeeBps);
        feeBps = newFeeBps;
        lastTotalAssets = totalAssets();
    }

    // @notice Met à jour l'adresse de la trésorerie.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    // @notice Migre vers un nouveau marché Morpho Blue.
    // @dev Retire tous les fonds du marché actuel et les redépose dans le nouveau.
    //      Vote DAO obligatoire. Slippage possible pendant la migration.
    // @param newMarket Paramètres du nouveau marché Morpho Blue.
    function migrateMarket(MarketParams memory newMarket) external onlyOwner {
        // Accrues les fees avant la migration
        _accrueFees();

        // Retire tous les assets du marché actuel
        uint256 currentAssets = _morphoAssetsOf(address(this));
        if (currentAssets > 0) {
            morpho.withdraw(marketParams, currentAssets, 0, address(this), address(this));
        }

        bytes32 oldId = _marketId(marketParams);
        marketParams  = newMarket;

        // Redépose dans le nouveau marché
        uint256 balance = asset.balanceOf(address(this));
        if (balance > 0) {
            morpho.supply(newMarket, balance, 0, address(this), "");
        }

        lastTotalAssets = totalAssets();
        emit MarketUpdated(oldId, _marketId(newMarket));
    }

    // @notice Met à jour le contrat vérificateur KYC (vote DAO requis).
    // @dev Permet de changer de provider KYC (ex: migrer vers Coinbase Verifications)
    //      sans redéployer le Vault. L'ancien checker est remplacé instantanément.
    function setChecker(address newChecker) external onlyOwner {
        if (newChecker == address(0)) revert ZeroAddress();
        emit CheckerUpdated(address(easChecker), newChecker);
        easChecker = IEASChecker(newChecker);
    }

    // @notice Configure le FBKDistributor (vote DAO requis).
    // @dev Passer address(0) pour desactiver les hooks de distribution.
    function setDistributor(address newDistributor) external onlyOwner {
        emit DistributorUpdated(distributor, newDistributor);
        distributor = newDistributor;
    }

    // @notice Transfert du ownership vers la DAO on-chain.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ── ERC-20 Standard ───────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        if (balanceOf[msg.sender] < amount)
            revert ExceedsBalance(amount, balanceOf[msg.sender]);
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        emit Transfer(msg.sender, to, amount);
        _notifyTransfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (to == address(0)) revert ZeroAddress();
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert ExceedsBalance(amount, allowed);
            allowance[from][msg.sender] = allowed - amount;
        }
        if (balanceOf[from] < amount)
            revert ExceedsBalance(amount, balanceOf[from]);
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);
        _notifyTransfer(from, to, amount);
        return true;
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────

    // Synchronise le distributor lors d'un transfert direct de shares.
    function _notifyTransfer(address from, address to, uint256 shares) internal {
        address d = distributor;
        if (d == address(0)) return;
        IFBKDistributor(d).notifyWithdraw(from, shares);
        IFBKDistributor(d).notifyDeposit(to, shares);
    }

    function _mint(address to, uint256 shares) internal {
        totalSupply   += shares;
        balanceOf[to] += shares;
        emit Transfer(address(0), to, shares);
    }

    function _burn(address from, uint256 shares) internal {
        balanceOf[from] -= shares;
        totalSupply     -= shares;
        emit Transfer(from, address(0), shares);
    }

    // @notice Retourne les assets Morpho Blue détenus par une adresse.
    // @dev Convertit les supplyShares en assets en utilisant le taux du marché.
    function _morphoAssetsOf(address user) internal view returns (uint256) {
        Id id = Id.wrap(_marketId(marketParams));

        // Position de l'utilisateur (en shares)
        (uint256 supplyShares,,) = abi.decode(
            abi.encode(morpho.position(id, user)),
            (uint256, uint128, uint128)
        );

        if (supplyShares == 0) return 0;

        // État du marché (pour convertir shares → assets)
        (uint128 totalSupplyAssets, uint128 totalSupplyShares,,,,) = abi.decode(
            abi.encode(morpho.market(id)),
            (uint128, uint128, uint128, uint128, uint128, uint128)
        );

        if (totalSupplyShares == 0) return 0;

        // Conversion : assets = shares * totalSupplyAssets / totalSupplyShares
        return (supplyShares * uint256(totalSupplyAssets)) / uint256(totalSupplyShares);
    }

    // @notice Calcule l'Id d'un marché Morpho Blue (keccak256 des params).
    function _marketId(MarketParams memory params) internal pure returns (bytes32) {
        return keccak256(abi.encode(params));
    }
}
