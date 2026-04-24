# Architecture Technique — FinBank

> Dernière mise à jour : 2026-04-24

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

## Module 5 — Gouvernance

### Token $FBK
- Token de gouvernance FinBank
- **Fair Launch** : pas de pré-vente VC — distribution par usage du protocole
- Distribution basée sur : volume de yield généré + ancienneté sur le protocole
- Chaque freelance utilisateur devient progressivement co-propriétaire

### Mécanisme $veFBK (vote-escrowed, modèle Curve veCRV)
- Lock $FBK pour une durée déterminée → obtention de $veFBK
- Plus le lock est long, plus le $veFBK obtenu est important
- $veFBK donne : pouvoir de vote proportionnel + part majorée du yield de trésorerie
- ⚠️ Risque "Curve Wars" à adresser : mécanisme anti-concentration à prévoir

### Pouvoirs de la DAO
- Allocation du Vault : ajouter/retirer des marchés Morpho (`migrateMarket()`)
- Registre des Attestors KYC (`approveAttestor()` / `revokeAttestor()`)
- Paramètres de frais : 0-30% du yield (`setFee()`)
- Trésorerie : adresse du Safe (`setTreasury()`)
- Répartition Buy-back vs fonds d'assurance

### Multisig (urgences)
- Gnosis Safe pour les actions critiques nécessitant une réponse rapide
- Pause du vault en cas d'exploit d'un protocole tiers

---

## Smart Contracts — État V1

### Fichiers écrits

```
src/
├── FinBankVault.sol          (474 lignes) — Vault ERC-4626 principal
├── interfaces/
│   ├── IMorpho.sol           (79 lignes)  — Interface Morpho Blue
│   └── IEAS.sol              (34 lignes)  — Interface EAS
├── utils/
│   └── EASChecker.sol        (151 lignes) — Vérificateur d'attestations KYC
├── test/
│   └── FinBankVault.t.sol    (423 lignes) — 12 tests Foundry
└── script/
    └── Deploy.s.sol          (110 lignes) — Script de déploiement Base mainnet
```

### Tests couverts
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
- Prix des shares augmente avec le yield ✓

### Contrats restants à écrire
- [ ] `FBKToken.sol` — ERC-20 token de gouvernance $FBK
- [ ] `VeFBK.sol` — Staking + vote-escrowed ($veFBK)
- [ ] `FBKDistributor.sol` — Distribution $FBK par usage (yield généré + ancienneté)
- [ ] `FinBankGovernor.sol` — Governor on-chain (OpenZeppelin Governor ou équivalent)

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
| $FBK Token | *À écrire + déployer* |

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
- [ ] Écrire FBKToken.sol + VeFBK.sol + FBKDistributor.sol
- [ ] Installer Foundry en local et faire passer les tests
- [ ] Récupérer les paramètres du marché Morpho Blue EURC sur Base
- [ ] Créer le schema KYC sur app.eas.eth
- [ ] Déployer sur Base Sepolia (testnet)
- [ ] Définir le schéma d'architecture global (diagramme visuel)
