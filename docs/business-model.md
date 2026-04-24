# Modèle Économique — FinBank

> Dernière mise à jour : 2026-04-24

---

## Principe directeur

Le modèle économique de FinBank est **aligné avec les intérêts des membres** — pas construit contre eux comme dans le système bancaire traditionnel.

Formule clé : **FinBank ne gagne de l'argent que si les membres en gagnent.**

Les revenus viennent du yield généré par les fonds des membres, pas de frais sur leurs transactions.

---

## Source de revenus principale — Protocol Fee sur le Yield

Le Vault ERC-4626 génère du yield en déposant les EURC des membres dans Morpho Blue.

```
Yield brut généré par Morpho Blue
    │
    ├── ~85% → directement aux déposants (freelances)
    └── ~15% → trésorerie DAO (protocol fee)
                    │
        ┌───────────┴───────────┐
   Buy-back $FBK          Fonds d'assurance
  (pression acheteuse)   (couverture exploits)
```

**Exemple illustratif (APY Morpho Blue : 4% sur EURC)**

| | Montant pour 10 000 € déposés |
|---|---|
| Yield brut annuel | ~400 € |
| Freelance reçoit (~85%) | ~340 € |
| DAO capture (~15%) | ~60 € |

**Ce que le freelance ne paye pas**
- Pas de frais de tenue de compte
- Pas de frais de virement entrant/sortant
- Pas de commissions sur les paiements SEPA
- Pas d'abonnement mensuel

### Paramètres de la fee
- Taux initial : **15%** (codé dans le contrat de déploiement)
- Plafond absolu : **30%** (codé en dur dans `FinBankVault.sol`)
- Modification : vote DAO uniquement, via `setFee()`

---

## Utilisation des revenus du protocole

La répartition exacte est votée par la DAO ($veFBK). Les deux usages prévus :

**Buy-back & Burn $FBK**
La DAO rachète du $FBK sur le marché et brûle les tokens rachetés. Cela crée une pression acheteuse proportionnelle à la croissance du protocole et réduit la supply circulante — alignant la valeur du token avec la croissance des dépôts.

**Fonds d'assurance**
Réserve de sécurité pour couvrir les utilisateurs en cas d'exploit sur un protocole tiers (Morpho Blue, par exemple). Donne confiance aux membres et réduit le risque résiduel lié aux smart contracts tiers.

---

## Token $FBK — Mécanique économique

### Distribution (Fair Launch)
- Pas de pré-vente à des VCs
- Distribué aux utilisateurs actifs selon : volume de yield généré × ancienneté
- Plus tu utilises FinBank, plus tu accumules $FBK → plus tu es propriétaire

### $veFBK (vote-escrowed)
- Lock $FBK → $veFBK
- Avantages : droit de vote sur la DAO + part majorée du yield de trésorerie
- Modèle Curve veCRV adapté

### Flywheel du token
```
Croissance des dépôts
    → Plus de yield généré
    → Plus de Buy-back $FBK
    → Valeur du protocole augmente
    → Attractivité accrue pour les nouveaux freelances
    → Croissance des dépôts (...)
```

---

## Revenus secondaires (V2+)

Ces revenus ne sont pas prioritaires pour le MVP mais font partie de la vision.

**Frais de change (V2)**
Petit spread sur les conversions EUR ↔ USD ou autres devises — bien en dessous des banques traditionnelles (objectif : <0,5% vs 2-5% en banque).

**Avances sur factures (V2)**
Protocole de crédit on-chain : un freelance peut emprunter contre ses futures recettes, basé sur son historique de revenus on-chain. Le vault ERC-4626 (share fbEURC) sert de collatéral. Taux déterminé par le marché, pas par un comité de crédit.

**Intégrations B2B (V2)**
Entreprises qui paient leurs freelances via FinBank. API pour les plateformes de mise en relation (Malt, Comet, Deel) — paiement instantané EURC directement dans le wallet du freelance sans SEPA.

---

## Ce que FinBank ne fera jamais

- Pas de frais cachés
- Pas de vente de données utilisateurs
- Pas de publicité
- Pas de profit sur les difficultés des clients (pas de découverts à 20%)
- Pas de fermeture de compte arbitraire

---

## Stratégie Go-to-Market

### Marché cible initial
France en premier (4M+ freelances), avec architecture SEPA dès le départ pour couvrir toute l'Europe.

### 3 canaux d'acquisition

**1. Communauté avant produit**
Construire une audience autour du problème (pas de la solution) avant le lancement. Twitter/X, LinkedIn — threads sur les fermetures de comptes arbitraires, témoignages de freelances. Les premiers followers sont les premiers utilisateurs.

**2. Partenariats avec les plateformes freelance**
Malt, Comet (France), Toptal, Deel (international) — intégration FinBank comme option de paiement préférée. Proposition de valeur côté plateforme : les freelances reçoivent plus vite et génèrent du yield sur leurs fonds.

**3. Referral on-chain $FBK**
Mécanisme de referral encodé dans le protocole : inviter un freelance → les deux reçoivent des $FBK bonus. Pas de cash brûlé en acquisition — de la gouvernance future distribuée à une communauté alignée.

### Ce qu'on ne fait pas
- Pas de ciblage des crypto-natifs en premier (volatils, pas sticky, chasseurs de rendement)
- Pas de publicité payante au lancement
- Pas de démarche bancaire classique (pas de démarchage téléphonique)

---

## Questions ouvertes

- Modélisation des revenus pour 10k / 100k / 1M utilisateurs déposants
- Répartition Buy-back vs fonds d'assurance (à voter par la DAO)
- Prix exact de revient de l'onramp Monerium (frais de conversion EUR→EURC)
- Risque de classification $FBK comme security token selon MiCA (à valider avec un avocat)
