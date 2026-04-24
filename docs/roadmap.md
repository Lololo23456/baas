# Roadmap — FinBank

> Dernière mise à jour : 2026-04-24

---

## Phase 0 — Cadrage ✅ (complétée)
**Objectif** : Valider la vision, définir l'architecture et le modèle économique

- [x] Explorer la vision et le positionnement
- [x] Identifier le segment cible (freelances & indépendants)
- [x] Choisir le Layer 2 → **Base**
- [x] Définir l'architecture technique complète (5 modules)
- [x] Définir le modèle économique (yield-based, protocol fee 15%)
- [x] Définir le token $FBK / $veFBK (Fair Launch, Work & Governance)
- [x] Définir le flywheel complet
- [ ] Analyse concurrentielle approfondie (Revolut Business, Qonto, Shine, Monerium)
- [ ] Analyse réglementaire (MiCA, EME, PSD2) — validation juridique requise

---

## Phase 1 — Smart Contracts & Testnet (en cours)
**Objectif** : Avoir un protocole fonctionnel sur Base Sepolia, testé et auditable

### Smart Contracts

**V1 — Écrits**
- [x] `FinBankVault.sol` — Vault ERC-4626 sur Morpho Blue
- [x] `EASChecker.sol` — Vérificateur d'attestations KYC
- [x] `IMorpho.sol` + `IEAS.sol` — Interfaces
- [x] `FinBankVault.t.sol` — 12 tests Foundry
- [x] `Deploy.s.sol` — Script de déploiement

**À écrire**
- [ ] `FBKToken.sol` — ERC-20 token de gouvernance $FBK
- [ ] `VeFBK.sol` — Staking + vote-escrowed ($veFBK, modèle Curve)
- [ ] `FBKDistributor.sol` — Distribution $FBK par usage (yield + ancienneté)
- [ ] `FinBankGovernor.sol` — Governor on-chain

### Infrastructure

- [ ] Installer Foundry en local, faire passer les 12 tests existants
- [ ] Récupérer les paramètres du marché Morpho Blue EURC sur Base (morpho.xyz)
- [ ] Créer le schema KYC sur app.eas.eth
- [ ] Configurer le Gnosis Safe (trésorerie DAO)
- [ ] Déployer sur Base Sepolia (testnet)
- [ ] Tests on-chain sur Sepolia avec faux EURC et faux Morpho
- [ ] Audit de sécurité (externe — avant tout déploiement mainnet)

---

## Phase 2 — MVP Mainnet
**Objectif** : Lancer pour les 100 premiers freelances, collecter des retours réels

### Pré-requis
- [ ] Audit de sécurité passé
- [ ] Premier Attestor agréé contractuellement (ex: Synaps)
- [ ] Intégration Monerium (IBAN non-custodial) — accord commercial
- [ ] Contrats déployés sur Base mainnet et vérifiés sur Basescan

### Produit
- [ ] App mobile React Native (Base Smart Wallet + Passkey)
- [ ] Interface de dépôt/retrait EURC
- [ ] Dashboard yield en temps réel
- [ ] Onboarding KYC via Attestor
- [ ] Réception de paiements via IBAN Monerium

### Go-to-market
- [ ] Waitlist / communauté (500 freelances minimum avant lancement)
- [ ] Partenariat pilote avec 1 plateforme freelance (Malt ou Comet)
- [ ] Mécanisme de referral $FBK

---

## Phase 3 — Croissance & Gouvernance
**Objectif** : Décentraliser la gouvernance, atteindre la masse critique

- [ ] Lancement token $FBK (Fair Launch par usage)
- [ ] Activation du mécanisme $veFBK
- [ ] Premier vote DAO (paramètre de fee ou ajout d'un Attestor)
- [ ] Ouverture vers d'autres marchés Morpho Blue (vote DAO)
- [ ] 10 000 utilisateurs actifs déposants
- [ ] Couverture médiatique crypto + freelance

---

## Phase 4 — Licence & Produits financiers avancés
**Objectif** : Obtenir la licence EME, lancer le crédit et les produits V2

- [ ] Dossier de licence EME (Établissement de Monnaie Électronique)
- [ ] Protocole d'avances sur factures (crédit on-chain)
- [ ] Frais de change multi-devises
- [ ] API B2B (entreprises qui paient leurs freelances via FinBank)
- [ ] Extension hors France (zone SEPA complète)

---

## Phase 5 — Vision long terme
**Objectif** : Infrastructure financière universelle, gouvernée par ses membres

- Décentralisation complète de la gouvernance (pas de multisig owner)
- Services bancaires complets reconstruits on-chain (épargne, crédit, assurance)
- Ouverture à d'autres segments au-delà des freelances
- Interopérabilité avec d'autres protocoles DeFi majeurs
