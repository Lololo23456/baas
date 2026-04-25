# Architecture Technique — FinBank

> Dernière mise à jour : 2026-04-25

---

## Principe directeur

**La technologie n'est pas le projet. La technologie rend le projet possible.**

Chaque choix architectural sert l'un des trois piliers de la vision :
- **Transparence totale** → blockchain publique, code open-source, tout vérifiable en temps réel
- **Propriété collective** → $FBK distribué par usage, DAO auto-exécutante, profits aux membres
- **Refondation des bases** → retraits techniquement inbloquables, réserves vérifiables, confiance dans le code pas dans les hommes

---

## Vue d'ensemble

FinBank est un protocole financier décentralisé construit sur Base (L2 Ethereum). Il combine cinq modules indépendants et interconnectés :

1. **Le Vault** — ERC-4626 sur Morpho Blue, cœur du système
2. **La couche Fiat ↔ On-chain** — Monerium + EURC
3. **L'Identity Layer** — EAS + Privado ID (KYC sans honeypot)
4. **Le Wallet** — Base Smart Wallet (Passkey, sans seed phrase)
5. **La Gouvernance** — DAO + $FBK / $veFBK

---

## Module 1 — Le Vault (cœur du système)

```
User EURC ──deposit──► FinBankVault (ERC-4626) ──supply──► Morpho Blue (EURC market)
                                                                    │
                                                    yield ◄──────────┘
                                                      │
                                      ┌───────────────┴───────────────┐
                                   ~85%                            ~15%
                               déposants                       treasury DAO
                                                                    │
                                                   ┌────────────────┴────────────────┐
                                              Buy-back $FBK                  Fonds d'assurance
```

### Protocole sous-jacent : Morpho Blue
- Marchés isolés : chaque pool a son propre périmètre de risque (pas de contamination croisée)
- Meilleure efficience du capital que Aave seul
- Déployé sur Base — adresse : `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb`

### Standard : ERC-4626
- Vault tokenisé interopérable — share token : **fbEURC** (6 décimales)
- Interopérabilité totale avec l'écosystème DeFi
- Permet à d'autres protocoles de composer avec FinBank
- Facilite les intégrations futures (agrégateurs, wallets, crédit on-chain)

### Stratégie d'allocation

**V1 — Allocation unique (bas risque)**
- Un seul marché Morpho Blue : pool EURC à bas risque
- Simplicité maximale, surface d'attaque minimale
- Yield prévisible et stable pour les membres

**V2 — Allocation multi-protocoles (gouvernance)**
- Interface de gouvernance déjà prévue dans l'architecture V1 (`migrateMarket()`)
- La DAO vote sur la répartition entre plusieurs marchés Morpho
- Possibilité d'ouvrir vers d'autres protocoles (Aave v4, etc.)

### Protocol Fee
- **15% du yield** prélevé automatiquement sous forme de shares mintées à la trésorerie
- Mécanisme : `_accrueFees()` calculé à chaque interaction (deposit/withdraw)
- Plafond absolu : 30% (codé en dur dans le contrat)
- Paramètre ajustable par vote DAO uniquement

### Propriété de censure-résistance
- Les **dépôts** requièrent une attestation KYC valide
- Les **retraits** ne requièrent JAMAIS de KYC — personne ne peut bloquer l'accès aux fonds
- Seul cas de blocage résiduel : Morpho Blue lui-même en pause (risque tiers assumé)

---

## Module 2 — Couche Fiat ↔ On-chain

```
Client (SEPA) ──virement IBAN──► Monerium ──conversion instantanée──► EURC on-chain (Base)
                                                                            │
                                                                   Wallet Base du freelance
                                                                            │
                                                             Vault ERC-4626 (dépôt auto)
```

### Fournisseur IBAN : Monerium
- IBAN non-custodial européen (zone SEPA complète)
- Conversion EUR fiat → EURC on-chain en quelques secondes
- L'utilisateur détient les clés — Monerium ne peut pas bloquer l'accès
- Adresse IBAN liée à l'adresse wallet Base de l'utilisateur

### Stablecoin : EURC (Circle)
- Euro tokenisé — 1 EURC = 1 EUR garanti par réserve auditée
- Adresse sur Base : `0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42`
- Choisi pour la liquidité sur Base et l'intégration native Coinbase

### Onramp complémentaire
- Coinbase : EUR → EURC directement sur Base (pour les utilisateurs crypto-natifs)

---

## Module 3 — Identity Layer ("Agnostic Identity Layer")

```
Attestor agréé (Synaps, Fractal ID...)
    │
    └──KYC vérifié──► Attestation EAS on-chain sur Base
                            │
                    Privado ID génère ZK proof
                            │
              FinBankVault vérifie le proof (via EASChecker)
                            │
                   Dépôt autorisé ✓
```

### EAS (Ethereum Attestation Service)
- Registre d'attestations on-chain sur Base : `0x4200000000000000000000000000000000000021`
- Schema KYC FinBank : `abi.encode(bool kycPassed, bool amlClear, uint8 tier)` — UID à créer sur app.eas.eth
- Les Attestors agréés émettent des attestations signées sur l'identité des membres

### Privado ID
- Génère des preuves ZK (Zero-Knowledge) à partir des attestations EAS
- Prouve "cet utilisateur a passé le KYC" sans révéler qui il est
- Souveraineté : l'utilisateur contrôle ses credentials, pas la DAO

### EASChecker (contrat déployé)
- Gère le registre des Attestors agréés (ajout/révocation par vote DAO)
- Vérification : schema correct + attester agréé + non révoqué + non expiré
- Appelé par FinBankVault avant chaque dépôt

### Propriétés clés
- **Agnostic** : n'importe quel Attestor agréé peut être ajouté/retiré par vote DAO
- **Privacy-preserving** : le contrat vérifie la conformité sans connaître l'identité
- **Pas de honeypot** : FinBank DAO ne détient aucune donnée personnelle → risque RGPD quasi nul
- **Conformité MiCA/AML** : traçabilité assurée par les Attestors, pas par FinBank directement

---

## Module 4 — Wallet (UX)

### Base Smart Wallet
- Authentification par **Passkey** (biométrie / Face ID) — zéro seed phrase
- Type : Smart Contract Wallet (ERC-4337 Account Abstraction)
- Récupération sociale possible (sans phrase secrète à perdre)
- Gas sponsoring possible — l'utilisateur ne paye pas de gas sur Base
- Cible : freelances non-crypto-natifs — UX identique à une app bancaire classique

---

## Module 5 — Gouvernance coopérative

### Token $FBK — La part coopérative

$FBK n'est pas un investissement spéculatif. C'est l'équivalent numérique d'une part coopérative : il confère la co-propriété du protocole à ceux qui l'utilisent.

- **Fair Launch** : pas de pré-vente VC — distribution exclusive par usage du protocole
- Distribution basée sur : volume de yield généré × ancienneté sur le protocole
- Chaque freelance utilisateur devient progressivement co-propriétaire
- Les profits de trésorerie (15% du yield) financent le buy-back & burn $FBK — enrichissent les membres, pas des actionnaires extérieurs

### Mécanisme $veFBK (vote-escrowed, modèle Curve veCRV)
- Lock $FBK pour une durée déterminée → obtention de $veFBK
- Plus le lock est long, plus le $veFBK obtenu est important
- $veFBK donne : pouvoir de vote proportionnel + part majorée du yield de trésorerie
- ⚠️ Risque "Curve Wars" à adresser : mécanisme anti-concentration à prévoir

### La DAO — L'assemblée générale qui fonctionne vraiment

La DAO est l'équivalent d'une assemblée générale de coopérative — mais avec une différence fondamentale : les décisions sont exécutées automatiquement par le code, sans intermédiaire.

Dans une coopérative traditionnelle, les membres votent mais la direction décide réellement. Dans FinBank, le vote est l'exécution.

**Pouvoirs de la DAO :**
- Allocation du Vault : ajouter/retirer des marchés Morpho (`migrateMarket()`)
- Registre des Attestors KYC (`approveAttestor()` / `revokeAttestor()`)
- Paramètres de frais : 0-30% du yield (`setFee()`)
- Trésorerie : adresse du Safe (`setTreasury()`)
- Répartition Buy-back vs fonds d'assurance
- Auto-amendable : les paramètres du Governor lui-même ne peuvent être changés que par vote DAO

### Ce que la DAO ne peut PAS faire

**Les retraits ne peuvent jamais être bloqués.** Cette propriété est codée en dur dans le smart contract, immuable. Même si la DAO le votait, le code l'interdirait. C'est la garantie fondamentale : personne — ni la DAO, ni une autorité extérieure passant par la DAO — ne peut bloquer l'accès d'un membre à ses fonds.

### Multisig (urgences techniques uniquement)
- Gnosis Safe pour les actions critiques nécessitant une réponse rapide
- Périmètre limité : pause du vault en cas d'exploit d'un protocole tiers
- Ne peut pas modifier les paramètres core (frais, Attestors, marchés) — ce sont des pouvoirs DAO exclusifs

---

## Smart Contracts — État V1

### Fichiers écrits

```
src/
├── FinBankVault.sol          (490 lignes) — Vault ERC-4626 principal + hooks distributor
├── FBKToken.sol              (160 lignes) — Token de gouvernance $FBK
├── VeFBK.sol                 (210 lignes) — Vote-Escrowed FBK (modèle Curve veCRV)
├── FBKDistributor.sol        (165 lignes) — Distribution $FBK (pattern Synthetix StakingRewards)
├── FinBankGovernor.sol       (270 lignes) — Governor on-chain (cycle complet + timelock)
├── interfaces/
│   ├── IMorpho.sol           (79 lignes)  — Interface Morpho Blue
│   └── IEAS.sol              (34 lignes)  — Interface EAS
├── utils/
│   └── EASChecker.sol        (151 lignes) — Vérificateur d'attestations KYC
├── test/
│   ├── FinBankVault.t.sol    (423 lignes) — 15 tests Foundry (Vault)
│   ├── FBKToken.t.sol        (250 lignes) — 33 tests Foundry (Token)
│   ├── VeFBK.t.sol           (320 lignes) — 46 tests Foundry (veFBK)
│   ├── FBKDistributor.t.sol  (280 lignes) — 33 tests Foundry (Distributor)
│   └── FinBankGovernor.t.sol (420 lignes) — 42 tests Foundry (Governor)
└── script/
    └── Deploy.s.sol          (110 lignes) — Script de déploiement Base mainnet
```

**Total : 169 tests — 0 échec**

### Tests FinBankVault couverts (15)
- Dépôt avec KYC valide ✓
- Dépôt sans KYC → revert ✓
- Dépôt montant zéro → revert ✓
- Dépôts multiples (proportionnalité des shares) ✓
- Retrait complet ✓
- Retrait sans KYC (censure-résistance) ✓
- Retrait au-delà du solde → revert ✓
- Accrual des fees sur yield ✓
- Fee à 15% (précision) ✓
- setFee() onlyOwner ✓
- setFee() plafond 30% → revert ✓
- setTreasury() onlyOwner ✓
- Prix des shares augmente avec le yield ✓
- Scénario complet freelance (dépôt → yield → retrait avec profit) ✓
- Migration de marché ✓

### Tests FBKToken couverts (33)
- Déploiement : owner, minter, supply initiale zéro ✓
- Déploiement avec minter adresse zéro → revert ✓
- Constantes (name, symbol, decimals, MAX_SUPPLY) ✓
- mint() par le minter → succès ✓
- mint() par non-minter → revert NotMinter ✓
- mint() par owner (DAO) → revert NotMinter ✓
- mint() dépassant le cap 100M → revert CapExceeded ✓
- mint() exactement au cap → succès ✓
- mint() vers adresse zéro → revert ZeroAddress ✓
- mint() émet event Transfer(0x0 → to) ✓
- burn() propres tokens ✓
- burn() dépassant le solde → revert ✓
- burnFrom() avec allowance (buy-back DAO) ✓
- burnFrom() avec allowance infinie → pas de décrément ✓
- burnFrom() allowance insuffisante → revert ✓
- transfer() standard ERC-20 ✓
- transfer() solde insuffisant → revert ✓
- transferFrom() avec approval ✓
- transferFrom() allowance insuffisante → revert ✓
- approve() émet event Approval ✓
- remainingMintable() diminue avec les mints ✓
- supplyEmittedBps() = 0 au départ ✓
- supplyEmittedBps() = 1000 après 10% de mint ✓
- supplyEmittedBps() = 10000 après mint complet ✓
- setMinter() par owner → succès ✓
- setMinter() par non-owner → revert NotOwner ✓
- setMinter() vers adresse zéro → revert ZeroAddress ✓
- setMinter() émet event MinterUpdated ✓
- transferOwnership() par owner → succès ✓
- transferOwnership() par non-owner → revert NotOwner ✓
- transferOwnership() vers adresse zéro → revert ZeroAddress ✓
- Scénario Fair Launch complet (mint 3 freelances + buy-back & burn) ✓

### Tests VeFBK couverts (46)
- Déploiement : fbk address, totalLocked zéro ✓
- Déploiement avec adresse zéro → revert ✓
- createLock() succès : montant, end, totalLocked, transfert FBK ✓
- createLock() arrondi à la semaine ✓
- createLock() montant zéro → revert ZeroAmount ✓
- createLock() durée trop courte → revert LockTooShort ✓
- createLock() durée trop longue → revert LockTooLong ✓
- createLock() durée min exacte → succès ✓
- createLock() durée max exacte → succès ✓
- createLock() lock déjà existant → revert LockAlreadyExists ✓
- createLock() émet event LockCreated ✓
- increaseAmount() succès : montant, totalLocked, transfert ✓
- increaseAmount() montant zéro → revert ZeroAmount ✓
- increaseAmount() sans lock → revert NoLockFound ✓
- increaseAmount() lock expiré → revert LockExpired ✓
- increaseAmount() émet event LockIncreased ✓
- extendLock() succès : nouvel end arrondi à la semaine ✓
- extendLock() sans lock → revert NoLockFound ✓
- extendLock() lock expiré → revert LockExpired ✓
- extendLock() date non ultérieure → revert NewEndNotLater ✓
- extendLock() trop long → revert ✓
- extendLock() émet event LockExtended ✓
- withdraw() après expiration : solde, totalLocked, remboursement FBK ✓
- withdraw() sans lock → revert NoLockFound ✓
- withdraw() avant expiration → revert LockNotExpired ✓
- withdraw() exactement à l'expiration → succès ✓
- withdraw() émet event Withdrawn ✓
- balanceOf() sans lock → 0 ✓
- balanceOf() lock expiré → 0 ✓
- balanceOf() lock max 4 ans → proche du montant ✓
- balanceOf() lock 2 ans → ~50% du montant ✓
- balanceOf() décroît avec le temps ✓
- balanceOf() = 0 à l'expiration ✓
- balanceOfAt() timestamp futur → balance inférieure ✓
- balanceOfAt() après expiration → 0 ✓
- remainingLockDuration() lock actif → > 0 ✓
- remainingLockDuration() après expiration → 0 ✓
- remainingLockDuration() sans lock → 0 ✓
- isExpired() lock actif → false ✓
- isExpired() après expiration → true ✓
- isExpired() sans lock → true ✓
- totalLocked() avec plusieurs utilisateurs ✓
- totalLocked() diminue après withdraw ✓
- Scénario complet : lock → increaseAmount → extendLock → withdraw ✓
- Non-transférable : Bob ne peut pas avoir de veFBK sans créer un lock ✓

### Tests FBKDistributor couverts (33)
- Déploiement : fbk, vault, owner, rewardRate, immutables ✓
- Déploiement avec adresse zéro fbk/vault → revert ✓
- notifyDeposit() onlyVault → revert si appelé directement ✓
- notifyDeposit() met à jour userShares et totalShares ✓
- notifyDeposit() plusieurs utilisateurs → totalShares cumulé ✓
- notifyDeposit() émet event SharesUpdated ✓
- notifyWithdraw() onlyVault → revert si appelé directement ✓
- notifyWithdraw() décrémente userShares et totalShares ✓
- notifyWithdraw() émet event SharesUpdated ✓
- earned() = 0 avant tout dépôt ✓
- earned() s'accumule proportionnellement au temps ✓
- earned() proportionnel aux shares (Alice 25% / Bob 75%) ✓
- earned() = 0 si rewardRate = 0 ✓
- earned() préservé après retrait partiel ✓
- earned() cesse après retrait total ✓
- claim() minte le montant exact sur FBKToken ✓
- claim() remet pendingReward à 0 ✓
- claim() incrémente totalDistributed ✓
- claim() sans reward → revert NothingToClaim ✓
- claim() émet event Claimed ✓
- claim() peut être appelé plusieurs fois ✓
- setRewardRate() onlyOwner → revert sinon ✓
- setRewardRate() met à jour le taux ✓
- setRewardRate() préserve les rewards déjà accumulées ✓
- setRewardRate() émet event RewardRateUpdated ✓
- remainingMintable() = cap complet au départ ✓
- remainingMintable() diminue après claim() ✓
- transferOwnership() succès ✓
- transferOwnership() non-owner → revert ✓
- transferOwnership() adresse zéro → revert ✓
- Scénario : deux utilisateurs avec dépôts décalés → proportionnalité correcte ✓
- Scénario : changement de taux en cours de route → rewards segmentées ✓

### Couplage FinBankVault ↔ FBKDistributor
- `FinBankVault.setDistributor(address)` — configure le distributor (onlyOwner)
- `deposit()` appelle `distributor.notifyDeposit(receiver, shares)` si distributor != address(0)
- `redeem()` appelle `distributor.notifyWithdraw(owner_, shares)` si distributor != address(0)
- Le distributor est le seul `minter` sur FBKToken — garantit le Fair Launch

### Tests FinBankGovernor couverts (42)
- Déploiement : veFBK, paramètres, adresse zéro, période zéro, quorum > 100% → revert ✓
- propose() : succès, id incrémenté, en dessous du threshold → revert ✓
- propose() : cibles vides → revert, arrays mismatch → revert ✓
- propose() : voteStart / voteEnd calculés correctement ✓
- getState() : Pending → Active → Succeeded → Queued → Executed ✓
- getState() : Defeated si quorum non atteint ✓
- getState() : Defeated si majorité Against ✓
- getState() : Canceled après cancel() ✓
- castVote() : revert si pas Active, revert si double vote ✓
- castVote() : poids For/Against/Abstain proportionnel au veFBK ✓
- castVote() : poids 0 si aucun veFBK ✓
- castVote() : émet event VoteCast ✓
- queue() : revert si pas Succeeded, émet event, eta = now + timelockDelay ✓
- execute() : revert avant expiry du timelock ✓
- execute() : appelle le contrat cible, émet event ✓
- execute() : revert si pas Queued ✓
- cancel() : succès par le proposant, émet event ✓
- cancel() : revert si non-proposant, si déjà exécuté, si déjà annulé ✓
- quorumVotes() : proportionnel au totalLocked ✓
- setVotingDelay/Period/TimelockDelay/QuorumBps/ProposalThreshold : onlyGovernance → revert ✓
- Gouvernance auto-amendable : proposition → vote → exécution → paramètre modifié ✓
- Scénario complet : Pending → Active → vote → Succeeded → Queued → Executed ✓

### Architecture governance
- Pouvoir de vote : `veFBK.balanceOfAt(user, snapshotTimestamp)` — snapshot au moment du propose()
- Quorum : `totalLocked * quorumBps / 10000` (4% par défaut)
- Timelock intégré : pas de contrat séparé, délai géré dans le Governor
- Auto-amendable : les paramètres ne peuvent être modifiés que par proposition DAO exécutée (`onlyGovernance`)

### État complet des smart contracts — TOUS écrits et testés
- [x] FinBankVault.sol — Vault ERC-4626 sur Morpho Blue
- [x] FBKToken.sol — Token de gouvernance $FBK (100M cap, Fair Launch)
- [x] VeFBK.sol — Staking vote-escrowed (modèle Curve veCRV)
- [x] FBKDistributor.sol — Distribution $FBK proportionnelle aux dépôts
- [x] FinBankGovernor.sol — Governor on-chain complet avec timelock

### Décisions de conception FBKToken
- **Cap 100M immuable** : codé en dur dans `MAX_SUPPLY`, aucune fonction pour le modifier
- **Minter unique** : seul le `FBKDistributor` peut minter → Fair Launch garanti
- **burnFrom()** : la trésorerie DAO approuve les rachats via allowance standard ERC-20
- **supplyEmittedBps()** : indicateur de progression du Fair Launch (0 → 10000 bps)
- **setMinter()** : permet de déployer un Distributor V2 sans changer le token

### Commandes Foundry
```bash
# Setup
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install foundry-rs/forge-std
cp .env.example .env

# Tests
forge test --match-contract FinBankVaultTest -vvv

# Déploiement testnet
forge script src/script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast

# Déploiement mainnet
forge script src/script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --verify
```

---

## Adresses importantes (Base Mainnet)

| Contrat | Adresse |
|---|---|
| EURC | `0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42` |
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| EAS | `0x4200000000000000000000000000000000000021` |
| FinBankVault | *À déployer* |
| EASChecker | *À déployer* |
| $FBK Token | *À déployer* |

---

## Questions ouvertes

- Comment gérer la conformité MiCA avec une architecture DAO ? (validation juridique requise)
- Paramètres exacts du marché Morpho Blue EURC sur Base (récupérer sur morpho.xyz)
- Schema UID EAS à créer sur app.eas.eth avant le déploiement
- Mécanisme anti-concentration du pouvoir pour $veFBK
- Quel niveau de décentralisation pour la V1 vs vision long terme ?

---

## Prochaines étapes

- [x] Choisir le Layer 2 → Base
- [x] Définir le Vault : Morpho Blue + ERC-4626 + stratégie V1/V2
- [x] Écrire FinBankVault.sol + EASChecker.sol + tests Foundry
- [x] Définir la couche KYC/AML on-chain → Agnostic Identity Layer (EAS + Privado ID)
- [x] Spécifier le token de gouvernance → $FBK / $veFBK (Work & Governance, Fair Launch)
- [x] Définir le flywheel complet
- [x] Écrire FBKToken.sol (100M cap, Fair Launch, burn) + 33 tests
- [x] Écrire VeFBK.sol (lock $FBK → $veFBK, modèle Curve veCRV) + 46 tests
- [x] Installer Foundry en local et faire passer les 94 tests
- [ ] Récupérer les paramètres du marché Morpho Blue EURC sur Base
- [ ] Créer le schema KYC sur app.eas.eth
- [ ] Déployer sur Base Sepolia (testnet)
- [ ] Définir le schéma d'architecture global (diagramme visuel)
