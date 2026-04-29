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

### Adresses des contrats (Base Sepolia — 3ème déploiement réel, source: broadcast/Deploy.s.sol/84532/run-latest.json)

| Contrat | Adresse |
|---|---|
| MockEURC | `0x35ba4bd0c7b54a96ba9beea965eeb50c57cc6501` |
| MockMorpho | `0xedac18110f28fdf3276fb15b7d429721d67c0515` |
| EASChecker | `0x51210B5837521f1254F88Bcd77D4BBEB2b0254c0` |
| FBKToken | `0xc6d0dd119aca3cb99c7c20d18fb9aee8bb44548e` |
| FinBankVault | `0x552138ef55e32b656fe303ccdd5b388dfb7bff9b` |
| VeFBK | `0x6089374304d838f5aaf1fa16f6919b2a95a2e231` |
| FBKDistributor | `0xa2823df3f7c9c0735e1ff4f8f4a06dd33b34e0b7` |
| FinBankGovernor | `0xb183d6aa4e1a21d9b0961119438c1eaf2a5898e0` |

> ⚠️ ATTENTION : les adresses dans les `console.log` de `forge script` sont des adresses de **simulation**, pas les adresses réelles broadcastées. Toujours lire le fichier `broadcast/Deploy.s.sol/84532/run-latest.json` comme source de vérité.

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
**URL production** : https://www.fin-bank.xyz
**Domaine custom** : fin-bank.xyz ✅ (ancienne URL Vercel redirige)

---

## Décisions stratégiques actées (2026-04-26)

### KYC
- **Synaps abandonné** (n'existe plus)
- **Solution retenue : Coinbase Verifications via EAS** — open source, 0 donnée stockée, 100M+ users déjà vérifiés, nativement sur Base
- `CoinbaseEASChecker.sol` déjà déployé et opérationnel sur Sepolia

### Structure légale
- Fondateur basé en **Belgique** → structure à créer : **BV** (Besloten Vennootschap / SRL belge)
- Pas encore créée — à faire avant signature d'accords commerciaux
- Régulateur belge crypto : **FSMA**

### Partenaires
- **Monerium** (IBAN non-custodial, pont SEPA ↔ stablecoin euro) : formulaire de contact envoyé le 2026-04-26. En attente de réponse (délai typique 5-7 jours ouvrables)
  - ⚠️ Monerium émet **EURe** (pas EURC) — décision d'architecture à prendre : accepter EURe dans le Vault, ou swap auto EURe → EURC via DEX
- **Audit externe** : à sélectionner (Code4rena pour commencer, Spearbit si budget dispo)

---

## Prochaines étapes (ordre de priorité)

### Court terme (maintenant → 4 semaines)
1. **Attendre réponse Monerium** — relancer par email direct si rien sous 7 jours ouvrables
2. **Créer la BV belge** — notaire requis, compter 2-4 semaines et ~1500€
3. **Sélectionner firme d'audit** — Code4rena (compétitif, public) ou Spearbit (privé)
4. **10 beta users** — freelances du réseau perso, tests sur Sepolia avec faux euros

### Moyen terme (1-3 mois)
5. **Intégration Monerium** — selon leur réponse, adapter le Vault (EURe ou swap)
6. **Audit externe** — lancer le processus
7. **Décision EURe vs EURC** — après discussion Monerium

### Long terme (post-audit)
8. **Mainnet Base** — cap TVL initial, whitelist fermée
9. **Enregistrement FSMA** (PSAV) — avec la BV belge créée
