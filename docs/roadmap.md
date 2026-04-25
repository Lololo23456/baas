# Roadmap — FinBank

> Dernière mise à jour : 2026-04-25

---

## Phase 0 — Cadrage ✅ COMPLÈTE

- [x] Vision, positionnement, segment cible (freelances)
- [x] Architecture technique complète
- [x] Modèle économique (yield-based, protocol fee 15%)
- [x] Token $FBK / $veFBK (Fair Launch, modèle veCRV)

---

## Phase 1 — Smart Contracts & Backend ✅ COMPLÈTE

### Smart Contracts (169 tests — 0 échec)
- [x] `EASChecker.sol` — Vérificateur KYC on-chain
- [x] `FBKToken.sol` — ERC-20 token de gouvernance
- [x] `VeFBK.sol` — Vote-escrowed staking (modèle Curve)
- [x] `FBKDistributor.sol` — Distribution $FBK (pattern Synthetix)
- [x] `FinBankVault.sol` — Vault ERC-4626 sur Morpho Blue
- [x] `FinBankGovernor.sol` — Gouvernance on-chain avec timelock
- [x] Audit de sécurité interne (reentrancy, overflow, access control)
- [x] Ultra-review & bug fixes (zero-address checks, events manquants, timestamps via_ir)
- [x] Script de déploiement (`Deploy.s.sol`) — détecte Mainnet/Sepolia
- [x] Mocks Sepolia (`MockERC20`, `MockMorpho`)

### Backend Off-Chain
- [x] Indexeur d'événements (Vault, Distributor, VeFBK, Governor)
- [x] API REST (Fastify + Prisma + PostgreSQL + viem)
- [x] Schéma DB complet (Deposit, Withdrawal, Claim, Lock, Proposal, Vote)

---

## Phase 2 — Sepolia & Tests End-to-End ✅ COMPLÈTE
**Objectif** : Valider le flux complet sur testnet avant tout engagement mainnet

### Infrastructure ✅
- [x] Compte Alchemy créé → RPC public Base Sepolia utilisé (`https://sepolia.base.org`)
- [x] Wallet de test `0x8e4A6f0866904D9edB6bb5e2CD56199EAfadEEA6` + 0.01 ETH Sepolia
- [x] `forge script Deploy.s.sol --rpc-url ... --broadcast` → 8 contrats déployés
- [x] `backend/.env` rempli avec les adresses déployées
- [x] Supabase PostgreSQL → `npm run db:push` ✅
- [x] Indexeur + API opérationnels : `npm run dev` → `http://localhost:3001`
- [x] Bug MockMorpho corrigé (position/market retournaient bytes memory au lieu de structs)

### Tests Fonctionnels ✅ (flux complet validé on-chain)
- [x] Enregistrer une attestation KYC (mock Attestor) → `isAuthorized: true`
- [x] Déposer des MockEURC → recevoir des fbEURC (`totalAssets: 1 000 000 000`)
- [x] Simuler du yield via `addYield()` sur MockMorpho → `totalAssets: 1 050 000 000`
- [x] Vérifier que `totalAssets()` augmente correctement
- [x] Vérifier la valeur des shares (inclut le yield)
- [x] Retirer 50% des shares → EURC reçu avec yield proportionnel
- [x] FBK claim testé (0 car pas de temps écoulé — comportement attendu)
- [x] Script `TestFlow.s.sol` exécuté on-chain avec `ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`

**Vault Sepolia** : https://sepolia.basescan.org/address/0x5C763aA7536BF5D67155553BD709Ca66187CDfDd

---

## Phase 3 — Frontend Web MVP
**Objectif** : Interface utilisable par un non-technicien
**Durée estimée** : 3-4 semaines
**Stack** : Next.js 14 + wagmi + viem + TailwindCSS + shadcn/ui

### Pages
- [ ] `/` — Landing page (proposition de valeur)
- [ ] `/app` — Dashboard principal
  - Solde EURC déposé + yield en temps réel
  - $FBK claimables
  - Boutons Déposer / Retirer
- [ ] `/onboarding` — Flux KYC
  - Connexion wallet (Base Smart Wallet / MetaMask)
  - Redirection vers Attestor
  - Appel `registerAttestation()`
- [ ] `/governance` — Propositions DAO
  - Liste des votes actifs
  - Interface de vote
  - Création de proposition
- [ ] `/stake` — VeFBK
  - Créer/prolonger un lock
  - Visualisation du veFBK décroissant

### Intégrations
- [ ] Connexion Base Smart Wallet (Passkey, Face ID)
- [ ] Lecture temps réel via l'API backend
- [ ] Transactions on-chain via wagmi
- [ ] Notifications toast (dépôt confirmé, claim disponible...)

---

## Phase 4 — KYC Pipeline & IBAN
**Objectif** : Flux complet de l'euro réel au yield DeFi
**Durée estimée** : 4-6 semaines (dépend des partenaires)

### KYC (Synaps ou Fractal ID)
- [ ] Accord commercial avec un Attestor agréé
- [ ] Intégration API Synaps → webhook → création attestation EAS
- [ ] Appeler `checker.approveAttestor()` via vote DAO
- [ ] Test end-to-end : vrai utilisateur → KYC → attestation EAS → dépôt

### IBAN (Monerium)
- [ ] Accord commercial Monerium
- [ ] Intégration API : créer IBAN lié à un wallet
- [ ] Flux EUR → EURC → dépôt automatique dans le Vault
- [ ] Flux retrait Vault → EURC → EUR → compte bancaire

### Schéma KYC EAS
- [ ] Créer le schéma sur app.eas.eth : `(bool kycPassed, bool amlClear, uint8 tier)`
- [ ] Mettre à jour `KYC_SCHEMA` dans `Deploy.s.sol`

---

## Phase 5 — Audit Externe & Mainnet
**Objectif** : Lancement sécurisé sur Base Mainnet
**Durée estimée** : 6-8 semaines (audit = 4-6 semaines)

### Pré-audit
- [ ] Documenter tous les invariants du protocole
- [ ] Fuzz testing Foundry (invariant tests)
- [ ] Sélectionner un auditeur (Code4rena, Sherlock, Cantina, ou firme privée)

### Audit
- [ ] Soumettre les 6 contrats + tests
- [ ] Corriger tous les findings (Critical + High obligatoires)
- [ ] Re-audit si changements significatifs

### Déploiement Mainnet
- [ ] Créer le Gnosis Safe (trésorerie DAO multisig)
- [ ] Configurer les signataires du Safe (3/5 ou 4/7)
- [ ] `forge script Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --verify`
- [ ] Décommenter les `transferOwnership()` dans `Deploy.s.sol`
- [ ] Vérifier les 6 contrats sur Basescan
- [ ] Configurer le Gnosis Safe comme `TREASURY`

### Lancement
- [ ] Waitlist ≥ 500 freelances
- [ ] Partenariat pilote (Malt, Comet, ou autre plateforme freelance)
- [ ] Mécanisme referral $FBK
- [ ] Annonce publique

---

## Phase 6 — Croissance & Gouvernance Décentralisée
**Objectif** : 10 000 utilisateurs, gouvernance réellement active

- [ ] Premier vote DAO on-chain (ajout Attestor ou changement fee)
- [ ] Ouverture vers d'autres marchés Morpho Blue (multi-stratégie)
- [ ] App mobile React Native (Base Smart Wallet + Passkey)
- [ ] 10 000 utilisateurs déposants actifs
- [ ] $FBK listé sur un DEX (Aerodrome ou Uniswap V3 sur Base)

---

## Phase 7 — Produits Financiers Avancés & Licence
**Objectif** : Devenir une vraie banque coopérative

- [ ] Dossier licence EME (Établissement de Monnaie Électronique)
- [ ] Avances sur factures (crédit on-chain collatéralisé par factures)
- [ ] Frais de change multi-devises (EURC, USDC, autres)
- [ ] API B2B (entreprises qui paient leurs freelances via FinBank)
- [ ] Extension hors France (zone SEPA complète)
- [ ] Décentralisation complète (pas de multisig owner, tout par vote DAO)

---

## Résumé visuel

```
Aujourd'hui
    │
    ▼
Phase 2 ── Sepolia + tests end-to-end          (~2 semaines)
    │
    ▼
Phase 3 ── Frontend web MVP                    (~4 semaines)
    │
    ▼
Phase 4 ── KYC Synaps + IBAN Monerium          (~6 semaines)
    │
    ▼
Phase 5 ── Audit externe + Mainnet             (~8 semaines)
    │
    ▼
Phase 6 ── Croissance + app mobile             (continu)
    │
    ▼
Phase 7 ── Licence EME + produits avancés      (long terme)
```

**De Sepolia au Mainnet : environ 4-5 mois si tout va bien.**
