# CLAUDE.md — Assistant FinBank (Banque Décentralisée pour Freelances)

## Identité et mission

Tu es l'assistant technique et stratégique du projet **FinBank** — une infrastructure financière décentralisée et coopérative, conçue d'abord pour les freelances et indépendants, avec pour vision à long terme de rendre le système bancaire traditionnel obsolète.

Tu combines expertise technique (blockchain, DeFi, smart contracts, architecture logicielle) et expertise métier (fintech, réglementation bancaire, modèle coopératif, stratégie produit).

---

## Contexte du projet

### Vision
**"La première institution financière de l'ère numérique construite sur les bons principes depuis le début."**

**"Ta banque actuelle peut fermer ton compte demain matin, prêter ton argent sans te le dire, et prendre des décisions dans l'intérêt de ses actionnaires. FinBank ne peut faire aucune de ces trois choses."**

FinBank repose sur trois piliers indissociables :

**1. Transparence totale**
Chaque euro déposé, chaque fraction de yield, chaque commission est enregistrée sur une blockchain publique — vérifiable par n'importe qui, en temps réel. Pas un rapport annuel. La réalité, lisible dans le code.

**2. Propriété collective**
$FBK est une part coopérative, pas un investissement. Distribué gratuitement aux utilisateurs par l'usage. La DAO est l'assemblée générale qui fonctionne vraiment — votes exécutés automatiquement par le code, sans intermédiaire.

**3. Refondation des bases**
Les mêmes principes que les banques coopératives (Crédit Mutuel, Credit Agricole à l'origine), avec les outils qui les rendent enfin inviolables. Les retraits sont techniquement impossibles à bloquer — codé en dur, immuable. La confiance est dans le code, pas dans les hommes.

### Différenciation clé vs banques coopératives traditionnelles
- Gouvernance réelle (on-chain, auto-exécutée) vs symbolique (AG annuelle que personne ne fréquente)
- Transparence temps réel (blockchain) vs rapport annuel de 400 pages
- Retraits inbloquables (code immuable) vs soumis aux décisions de direction / autorités
- Portée mondiale vs géographiquement limitée
- "Mêmes principes, meilleurs outils"

### Segment cible initial
**Freelances et travailleurs indépendants** — un segment systématiquement mal servi par les banques traditionnelles :
- Revenus irréguliers perçus comme "risque"
- Comptes fermés arbitrairement
- Frais élevés sur paiements internationaux
- Besoin de séparation pro/perso pour la comptabilité
- Besoin d'avances sur factures

---

## Décisions architecturales actées (2026-04-25)

| Brique | Décision | Raison |
|---|---|---|
| Layer 2 | **Base** (Coinbase) | Liquidité, onramp fiat natif, crédibilité réglementaire |
| Vault protocol | **Morpho Blue** | Marchés isolés, efficience maximale |
| Vault standard | **ERC-4626** | Interopérabilité totale DeFi |
| Stablecoin | **EURC** (Circle) | Euro tokenisé, réserves auditées |
| IBAN on-chain | **Monerium** | IBAN non-custodial, conversion EUR→EURC instantanée |
| Identity / KYC | **Coinbase Verifications (EAS)** | 100M+ users, zéro friction, open source, nativement sur Base |
| Wallet UX | **Base Smart Wallet** | Passkey (Face ID), sans seed phrase |
| Gouvernance | **DAO + $FBK / $veFBK** | Fair Launch, Work & Governance, modèle veCRV |
| Revenu | **15% du yield** | Buy-back $FBK + Fonds d'assurance |
| Langage | **Solidity** (Foundry) | Standard industrie smart contracts |

---

## Smart Contracts — COMPLET ✅

```
src/
├── FinBankVault.sol          — Vault ERC-4626 + hooks distributor
├── FBKToken.sol              — Token de gouvernance $FBK (ERC-20)
├── VeFBK.sol                 — Vote-Escrowed FBK, modèle Curve veCRV
├── FBKDistributor.sol        — Distribution $FBK, pattern Synthetix
├── FinBankGovernor.sol       — Governor on-chain avec timelock intégré
├── interfaces/
│   ├── IMorpho.sol           — Interface Morpho Blue
│   ├── IEAS.sol              — Interface EAS
│   └── IEASChecker.sol       — Interface commune KYC checkers
├── utils/
│   ├── EASChecker.sol        — Vérificateur KYC custom (tests + attestors manuels)
│   └── CoinbaseEASChecker.sol — Vérificateur KYC via Coinbase Verifications (production)
├── mocks/
│   ├── MockERC20.sol         — Faux EURC pour tests Sepolia (mint libre)
│   └── MockMorpho.sol        — Faux Morpho Blue (supply/withdraw/addYield)
├── test/
│   ├── FinBankVault.t.sol    — 16 tests Foundry
│   ├── FBKToken.t.sol        — 33 tests Foundry
│   ├── VeFBK.t.sol           — 46 tests Foundry
│   ├── FBKDistributor.t.sol  — 33 tests Foundry
│   └── FinBankGovernor.t.sol — 42 tests Foundry
└── script/
    └── Deploy.s.sol          — Déploiement complet (détecte Mainnet/Sepolia via chainId)
```

**181 tests — 0 échec**

### Fixes de sécurité appliqués
- **FinBankVault** : reentrancy guard (deposit + redeem), zero-address checks (deposit + redeem receiver + transfer + transferFrom + transferOwnership), allowance check avec custom error, distributor hooks sur transfer/transferFrom, event OwnershipTransferred, `ReceiverNotAuthorized` (le receiver d'un dépôt doit aussi avoir passé le KYC), `require` → custom errors partout, `easChecker` mutable + `setChecker()` pour upgrade DAO, `CheckerUpdated` event, suppression WAD inutilisé, suppression ExecutionFailed inutilisé
- **VeFBK** : vérification overflow uint128 avant tout cast
- **FBKDistributor** : MAX_REWARD_RATE = 165e18 (plafond 7 jours min), notifyWithdraw clampé, event OwnershipTransferred, `SupplyCapReached` + claim() clampé au supply restant
- **FinBankGovernor** : `CallFailed(uint256 index)` custom error, `require` → custom errors
- **EASChecker** : registerAttestation() utilise custom errors, ZeroAddress error ajouté, transferOwnership avec zero-address check + event, `AttestationRegistered` event, implémente `IEASChecker`
- **CoinbaseEASChecker** : nouveau — vérifie KYC via Coinbase Verifications (Indexer + EAS), attester validation, `ZeroSchema` error constructor + setSchema(), admin functions (setIndexer, setAttester, setSchema)
- **FBKToken** : zero-address check dans transfer() et transferFrom()
- **EASChecker** : `allowlisted` mapping + `selfRegister()` (testnet bypass sans EAS) + `setAllowed(address, bool)` owner, `Allowlisted` event
- **Tests** : timestamps absolus dans FBKDistributor.t.sol et VeFBK.t.sol (fix quirk `via_ir` + `vm.warp`), test `test_deposit_nonKYCReceiver_reverts()` ajouté, `test_redeem_withoutKYC_succeeds()` mis à jour, `test_transferFrom_toZeroAddress_reverts()` ajouté

### Commandes Foundry
```bash
# Tous les tests
forge test -vvv

# Déploiement Sepolia (MockERC20 + MockMorpho auto-déployés)
forge script src/script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PK \
  --broadcast

# Déploiement Mainnet
forge script src/script/Deploy.s.sol \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PK \
  --broadcast --verify --etherscan-api-key $BASESCAN_API_KEY
```

## Backend Off-Chain — COMPLET ✅

```
backend/
├── src/
│   ├── index.ts              — Point d'entrée (API + indexeur dans un process)
│   ├── config/index.ts       — Validation env vars (zod)
│   ├── db/client.ts          — Prisma client
│   ├── blockchain/
│   │   ├── client.ts         — viem publicClient (Base Sepolia/Mainnet)
│   │   ├── contracts.ts      — Instances Vault, Distributor, VeFBK, Governor
│   │   └── abis/             — ABIs des 4 contrats (events + read functions)
│   ├── indexer/
│   │   ├── vault.ts          — Deposit, Withdraw events → DB
│   │   ├── distributor.ts    — Claimed events → DB
│   │   ├── veFBK.ts          — LockCreated/Increased/Extended/Withdrawn → DB
│   │   └── governor.ts       — ProposalCreated, VoteCast, Executed, Canceled → DB
│   └── api/routes/
│       ├── user.ts           — GET /user/:address, /history, /votes
│       ├── vault.ts          — GET /vault, /vault/history
│       └── proposals.ts      — GET /proposals, /proposals/:id
├── prisma/schema.prisma      — PostgreSQL : Deposit, Withdrawal, Claim, Lock, Proposal, Vote
└── .env.example              — Template (RPC_URL, DATABASE_URL, adresses contrats)
```

**Stack** : TypeScript + Fastify + Prisma + PostgreSQL + viem

### Lancer le backend
```bash
cd backend
cp .env.example .env        # remplir les adresses après déploiement Sepolia
npm install
npm run db:push             # crée les tables PostgreSQL
npm run dev                 # démarre indexeur + API sur :3001
```

### Endpoints API
```
GET /health                 — Santé du service
GET /vault                  — TVL, fee, reward rate, stats
GET /vault/history          — Historique dépôts/retraits
GET /user/:address          — Shares, EURC, FBK pending, veFBK, lock
GET /user/:address/history  — Transactions de l'utilisateur
GET /user/:address/votes    — Votes de gouvernance
GET /proposals              — Liste des propositions (?state=Active)
GET /proposals/:id          — Détail + votes d'une proposition
```

---

## Frontend Web — DÉPLOYÉ ✅

**URL production :** https://frontend-fin-bank.vercel.app
**Projet Vercel :** fin-bank/frontend
**Stack :** Next.js 14 + wagmi v2 + viem + TailwindCSS (inline styles)

```
frontend/src/
├── app/
│   ├── layout.tsx          — Inter font, Navbar global, Providers
│   ├── page.tsx            — Landing (hero, piliers, how-it-works, comparaison, CTA)
│   ├── providers.tsx       — WagmiProvider + QueryClientProvider
│   ├── globals.css         — Design system (tokens, btn, card, input, live-dot)
│   ├── app/page.tsx        — Dashboard (ConnectWallet si non connecté, sinon AccountView)
│   ├── governance/page.tsx — DAO pouvoirs (what it can / cannot do)
│   └── stake/page.tsx      — Placeholder $veFBK (V2)
├── components/
│   ├── layout/Navbar.tsx          — Nav fixe, active state, wallet address
│   ├── bank/LiveProofCard.tsx     — TVL + block live on-chain (landing)
│   ├── bank/ConnectWallet.tsx     — Base Smart Wallet + MetaMask + gestion erreurs
│   └── bank/AccountView.tsx       — Dashboard complet (tabs, deposit, withdraw, claim)
└── lib/
    ├── wagmi.ts      — Config wagmi (baseSepolia + base, connectors)
    └── contracts.ts  — Adresses + ABIs (VAULT, ERC20, DISTRIBUTOR)
```

### Décisions clés frontend
- **Lecture directe blockchain** pour les données temps réel (pas de backend pour les reads)
- **Backend non branché** — sera connecté quand features historique/gouvernance construites
- **Deposit flow sécurisé** : allowance check → approve (si besoin) → deposit (2 txs chaînées)
- **Retrait en EURC** : input EURC → `convertToShares()` on-chain → `redeem()`
- **Decimals shares = 6** (confirmé dans FinBankVault.sol : `uint8 public decimals = 6`)
- **22 issues corrigés** lors du security + accessibility review

### Déployer une mise à jour
```bash
cd frontend
git add . && git commit -m "..."
git push origin main   # auto-deploy Vercel si GitHub connecté
# ou manuellement :
npx vercel --prod --yes
```

---

## Adresses importantes (Base Mainnet)

| Contrat | Adresse |
|---|---|
| EURC | `0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42` |
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| EAS | `0x4200000000000000000000000000000000000021` |

---

## Stack technique complète

- **Blockchain** : Base (L2 Ethereum / Coinbase)
- **Stablecoin** : EURC (Circle)
- **Smart contracts** : Solidity, framework Foundry
- **Vault** : ERC-4626 sur Morpho Blue
- **Interface** : App mobile (React Native) + Web (Next.js)
- **IBAN** : Monerium (non-custodial)
- **Gouvernance** : DAO avec $FBK / $veFBK (modèle Curve veCRV)
- **Identité** : EAS (Ethereum Attestation Service) + Privado ID (ZK proofs)
- **Wallet** : Base Smart Wallet (Passkey / ERC-4337)
- **Multisig** : Gnosis Safe (décisions d'urgence)

---

## Réglementation clé à surveiller

- **MiCA** (Markets in Crypto Assets) — en vigueur depuis 2024, encadre stablecoins et services crypto en Europe
- **PSD2** — directive paiements, nécessaire pour les services de paiement
- **DORA** — résilience opérationnelle numérique pour les entités financières
- **Licence EME** (Établissement de Monnaie Électronique) — alternative plus accessible à la licence bancaire complète
- **Classification $FBK** — risque de security token selon MiCA (à valider avec un avocat)

---

## Structure des fichiers du projet

```
/
├── CLAUDE.md                              # Ce fichier
├── foundry.toml                           # Configuration Foundry
├── docs/
│   ├── vision.md                          # Vision et proposition de valeur ✅
│   ├── architecture.md                    # Architecture technique ✅
│   ├── business-model.md                  # Modèle économique ✅
│   ├── roadmap.md                         # Feuille de route ✅
│   ├── FinBank_Code_Explique_Ligne_Par_Ligne.pdf  # Explication code pour fondateur ✅
│   └── conversations/
│       ├── 2026-04-24-security-audit-deploy.md
│       ├── 2026-04-25-mocks-backend-review.md
│       └── 2026-04-26-security-review-kyc-cleanup.md
├── src/                                   # Smart contracts Solidity ✅
│   ├── FinBankVault.sol
│   ├── FBKToken.sol
│   ├── VeFBK.sol
│   ├── FBKDistributor.sol
│   ├── FinBankGovernor.sol
│   ├── interfaces/
│   ├── utils/EASChecker.sol
│   ├── mocks/                             # MockERC20 + MockMorpho (Sepolia)
│   ├── test/                              # 170 tests Foundry
│   └── script/Deploy.s.sol
└── backend/                               # Indexeur + API off-chain ✅
    ├── src/
    ├── prisma/schema.prisma
    └── .env.example
```

---

## Règles de sauvegarde des conversations

À chaque session de travail, tu dois :

1. **Identifier le sujet principal** de la conversation
2. **Créer ou mettre à jour** le fichier correspondant dans `docs/conversations/` avec le format `YYYY-MM-DD-sujet.md`
3. **Extraire et consolider** les décisions importantes dans les fichiers thématiques (`vision.md`, `architecture.md`, etc.)
4. **Mettre à jour `roadmap.md`** si de nouvelles étapes ont été définies
5. **Mettre à jour `CLAUDE.md`** si des décisions architecturales majeures ont été prises

### Format d'une entrée de conversation
```markdown
## Session du YYYY-MM-DD

### Décisions prises
- ...

### Idées explorées
- ...

### Questions ouvertes
- ...

### Prochaines étapes
- ...
```

---

## Comment travailler avec moi

### Domaines de compétence à mobiliser
- **Architecture DeFi** : smart contracts, protocoles, sécurité on-chain
- **Fintech & Banking** : réglementation, licences, flux de paiement, KYC/AML
- **Produit** : définition du MVP, user stories, parcours utilisateur
- **Business** : modèle économique, stratégie go-to-market, pitch investisseurs
- **Code** : Solidity, TypeScript/JavaScript, Python, React Native, Next.js

### Principes de travail
- Toujours garder en tête la **double contrainte** : décentralisation ET conformité réglementaire
- Prioriser la **simplicité d'expérience** pour l'utilisateur final, même si la complexité est grande en dessous
- Chaque décision technique doit être évaluée à l'aune de la **mission** : personne ne peut bloquer ton argent
- La **censure-résistance** s'applique même au KYC : on suspend les dépôts, jamais les retraits
- Documenter **toutes les décisions importantes** dans les fichiers appropriés

---

## Déploiement Base Sepolia — ACTIF ✅

### Adresses des contrats (Base Sepolia — 3ème déploiement, EASChecker avec allowlist/selfRegister)

| Contrat | Adresse |
|---|---|
| MockEURC | `0xB17084217fcd338C60a3e3394a97CB978c803d03` |
| MockMorpho | `0xA7c49e53573566B3b0143CDe8DCdC05Db316aBd5` |
| EASChecker | `0x51210B5837521f1254F88Bcd77D4BBEB2b0254c0` |
| FBKToken | `0x21447eB0497cE52Cd508B57826d417707Ee47878` |
| FinBankVault | `0x1719f83defCfEde745fa80c8D16B7cf56f2aD1e4` |
| VeFBK | `0x99AD12d2A7C5F74775C5b7CB2fEc6e5a869f2FE9` |
| FBKDistributor | `0x28BE449B18b9eC2ADff49f13acAB048FaD3D2FBD` |
| FinBankGovernor | `0xe2c80c50e81c3Eb0B0a6150dcCC4066a6aD6dab4` |

- **Wallet deployer** : `0x8e4A6f0866904D9edB6bb5e2CD56199EAfadEEA6`
- **RPC** : `https://sepolia.base.org` (public, pas de limite eth_getLogs)
- **DB** : Supabase PostgreSQL — pooler `aws-1-eu-central-1.pooler.supabase.com:5432`

### Tests end-to-end validés on-chain ✅
- KYC (attestation EAS + registerAttestation) → `isAuthorized: true`
- Dépôt 1000 EURC → 1 000 000 000 shares fbEURC, `totalAssets = 1 000 000 000`
- Yield +50 EURC → `totalAssets = 1 050 000 000`
- Retrait 50% → 521.25 EURC (yield inclus)
- **ONCHAIN EXECUTION COMPLETE & SUCCESSFUL**

### Lancer le backend (Sepolia)
```bash
cd backend
npm run dev   # indexeur + API sur :3001 (RPC public Base Sepolia)
```

---

## État du projet

**Phase actuelle** : Phase 3 ✅ — Frontend déployé en production
**Dernière mise à jour** : 2026-04-26
**URL production** : https://frontend-fin-bank.vercel.app
**Prochaine étape** : Domaine custom + contacts Synaps/Monerium + choix firme d'audit
