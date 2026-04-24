# Session du 2026-04-24 — Exploration initiale & Architecture complète

## Contexte
Session fondatrice du projet. On est passé de l'idée brute à une architecture technique complète, des smart contracts écrits, et un modèle économique défini.

---

## Décisions prises

### Vision & Positionnement
- **Option B choisie** : protocole natif (smart contracts + DAO), pas une surcouche marketing sur une banque existante
- **Vision** : attaquer le fond du problème bancaire (lenteur + contrôle arbitraire), pas juste créer une meilleure interface
- **Approche** : fusionner DeFi (décentralisation, censure-résistance) + modèle coopératif (gouvernance éthique et transparente)
- **Segment cible initial** : freelances et travailleurs indépendants — mal servis par les banques traditionnelles, tech-savvy, prêts à adopter
- **Nom de travail** : FinBank (à confirmer)

### Stack Technique — tout acté
| Brique | Décision |
|---|---|
| Layer 2 | **Base** (Coinbase) |
| Vault protocol | **Morpho Blue** (marchés isolés) |
| Vault standard | **ERC-4626** |
| Stablecoin | **EURC** (Circle) |
| IBAN on-chain | **Monerium** (non-custodial) |
| Identity / KYC | **EAS + Privado ID** (ZK proofs, Attestors agréés) |
| Wallet UX | **Base Smart Wallet** (Passkey, sans seed phrase) |
| Gouvernance | **DAO + $FBK / $veFBK** (Fair Launch, Work & Governance) |
| Revenu | **15% du yield** → Buy-back $FBK + Fonds d'assurance |
| Langage smart contracts | **Solidity** (Foundry) |

### Modèle économique
- Pas de frais de tenue de compte, pas de frais de transaction
- Revenu = spread sur le yield Morpho Blue (15% prélevé automatiquement)
- Buy-back & Burn $FBK + fonds d'assurance avec les revenus du protocole
- Token $FBK distribué par usage (Fair Launch, pas de VC pre-sale)

### Smart Contracts — V1 écrits
- `src/FinBankVault.sol` — Vault ERC-4626 sur Morpho Blue (474 lignes)
- `src/utils/EASChecker.sol` — Vérificateur d'attestations KYC (151 lignes)
- `src/interfaces/IMorpho.sol` — Interface Morpho Blue
- `src/interfaces/IEAS.sol` — Interface EAS
- `src/test/FinBankVault.t.sol` — 12 tests Foundry
- `src/script/Deploy.s.sol` — Script de déploiement Base mainnet
- `foundry.toml` + `.env.example`

### Go-to-Market (ébauche)
- France en premier, architecture SEPA dès le départ
- 3 canaux : communauté avant produit (Twitter/LinkedIn), partenariats plateformes freelance (Malt, Comet, Deel), referral on-chain $FBK
- Ne PAS cibler les crypto-natifs en premier (trop volatils, pas sticky)

---

## Idées explorées

- Monerium (IBAN on-chain), Gnosis Pay (carte Visa connectée à wallet), Aave (épargne DeFi) comme inspirations techniques existantes
- Layer 2 Ethereum (Arbitrum, Base) pour réduire les frais de gas → Base choisi
- EURC (Circle) comme stablecoin EUR
- DAO pour la gouvernance coopérative
- Licence EME comme étape réglementaire réaliste avant licence bancaire complète
- MiCA comme cadre réglementaire européen à respecter
- Mécanisme veCRV (Curve) comme inspiration pour $veFBK
- Risque "Curve Wars" sur la concentration du pouvoir à surveiller

---

## Questions ouvertes

- Comment gérer la conformité MiCA avec une architecture DAO ? (à creuser avec un avocat spécialisé)
- Nom définitif du projet ?
- Adresse multisig Gnosis Safe pour la trésorerie DAO
- Paramètres exacts du marché Morpho Blue EURC sur Base (à récupérer sur morpho.xyz)
- Schema UID EAS à créer sur app.eas.eth avant le déploiement
- Mécanisme anti-concentration du pouvoir pour $veFBK (à spécifier dans les contrats de gouvernance)
- Contrats $FBK et $veFBK à écrire (prochaine étape)

---

## Prochaines étapes

- [ ] Installer Foundry en local et lancer les tests (`forge test`)
- [ ] Écrire les contrats $FBK (token ERC-20) et $veFBK (staking + vote)
- [ ] Créer le schema KYC sur app.eas.eth
- [ ] Identifier les paramètres du marché Morpho Blue EURC sur Base
- [ ] Déployer sur Base Sepolia (testnet) pour les premiers tests on-chain
- [ ] Analyse concurrentielle approfondie (Revolut Business, Qonto, Shine, Monerium)
- [ ] Analyse réglementaire détaillée (MiCA, licence EME, PSD2)
- [ ] Définir la stratégie go-to-market en détail
