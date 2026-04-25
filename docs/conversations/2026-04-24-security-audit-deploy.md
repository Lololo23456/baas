# Session du 2026-04-24 — Audit de sécurité + Deploy.s.sol

## Decisions prises

### Audit de sécurité (appliqué en session)

**FinBankVault.sol**
- Reentrancy guard (`uint256 private _locked = 1` + modifier `nonReentrant`) appliqué à `deposit()` et `redeem()`
- Zero-address check sur `receiver` dans `deposit()`
- Zero-address check sur `newTreasury` dans `setTreasury()`
- `setDistributor()` émet maintenant `DistributorUpdated`
- `transfer()` et `transferFrom()` appellent `_notifyTransfer()` → synchronise le Distributor lors de transferts directs de shares (évite une désynchronisation silencieuse)

**VeFBK.sol**
- Vérification overflow uint128 avant cast : `if (amount > type(uint128).max) revert AmountTooLarge(...)` dans `createLock()` et `increaseAmount()`

**FBKDistributor.sol**
- `MAX_REWARD_RATE = 165e18` — plafond qui empêche d'épuiser 100M FBK en moins de 7 jours
- `RewardRateTooHigh` error + check dans `setRewardRate()`
- `notifyWithdraw()` — soustraction clampée à 0 (clamped subtract) au lieu de revert en cas de désynchronisation

### Deploy.s.sol — réécriture complète

Ordre de déploiement :
1. `EASChecker` (KYC)
2. `FBKToken` (deployer = minter temporaire)
3. `FinBankVault`
4. `VeFBK`
5. `FBKDistributor`
6. `FinBankGovernor`

Post-déploiement automatique dans le script :
- `fbk.setMinter(address(distributor))` → Fair Launch garanti
- `vault.setDistributor(address(distributor))` → vault connecté

Paramètres de gouvernance choisis (mainnet) :
- `VOTING_DELAY` : 7 200 blocs (~4h sur Base)
- `VOTING_PERIOD` : 302 400 blocs (~7 jours)
- `TIMELOCK_DELAY` : 172 800 secondes (2 jours)
- `QUORUM_BPS` : 400 (4% du totalLocked)
- `PROPOSAL_THRESHOLD` : 10 000 veFBK

Taux initial distributor : `0.1 FBK/seconde` (~3.15M FBK/an ≈ 10% du supply en Y1), ajustable par DAO.

Le script détecte le réseau via `block.chainid` (8453 = mainnet, 84532 = Sepolia) et utilise les bonnes adresses automatiquement.

## État final des tests
- **15 tests FinBankVault** : passants
- **33 tests FBKToken** : passants
- **46 tests VeFBK** : passants
- **33 tests FBKDistributor** : passants
- **42 tests FinBankGovernor** : passants
- **TOTAL : 169 tests — 0 échec**

## Fichiers modifiés

- `src/FinBankVault.sol` — sécurisé (reentrancy guard, zero-address checks, transfer hooks)
- `src/VeFBK.sol` — sécurisé (overflow check uint128)
- `src/FBKDistributor.sol` — sécurisé (MAX_REWARD_RATE, notifyWithdraw safe)
- `src/script/Deploy.s.sol` — réécrit complet (tous les 5 contrats + connexions)
- `CLAUDE.md` — mis à jour

## Checklist avant déploiement Sepolia

- [ ] Avoir `DEPLOYER_PK` dans l'environnement (`export DEPLOYER_PK=0x...`)
- [ ] Avoir `BASE_SEPOLIA_RPC_URL` (ex: via Alchemy ou Infura)
- [ ] Optionnel : `EURC_ADDRESS` si Circle a un EURC Sepolia, sinon déployer un MockERC20
- [ ] Lancer : `forge script src/script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast`

## Checklist avant mainnet

- [ ] Créer le schéma KYC sur app.eas.eth → mettre à jour `KYC_SCHEMA`
- [ ] Configurer le Gnosis Safe → mettre à jour `TREASURY`
- [ ] Approuver les Attestors KYC (Synaps, Fractal ID) → `INITIAL_ATTESTOR`
- [ ] Décommenter les `transferOwnership()` dans Deploy.s.sol
- [ ] Audit externe complet
- [ ] Vérification des contrats sur Basescan (`--verify --etherscan-api-key`)
