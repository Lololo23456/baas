# Session du 2026-04-26 — Frontend MVP + Security Review + Déploiement Vercel

## Contexte

Continuation de la Phase 3 Frontend. La session précédente avait posé les bases (globals.css, Navbar, LiveProofCard). Cette session complète l'intégralité du frontend MVP et le déploie en production.

---

## Décisions prises

### Architecture frontend finale
- **Lecture directe blockchain** (wagmi/viem) pour toutes les données temps réel — pas de passage par le backend pour les reads
- **Backend non branché intentionnellement** — sera connecté uniquement quand les features qui en ont besoin seront construites (historique, gouvernance)
- **Déploiement Vercel** séparé du backend — frontend 100% statique + appels RPC

### Design system
- Thème : blanc/navy (#0F172A), Inter 400/500/600/700, arrondi généreux
- Les trois piliers sont *démontrés* dans l'UI, pas juste mentionnés :
  - Pilier I → LiveProofCard avec données on-chain vérifiables en temps réel
  - Pilier II → $FBK claimable visible dans le dashboard
  - Pilier III → Garantie de retrait visible, liste DAO can never do

### Flux deposit sécurisé
- Pattern : `allowance check → approve (si besoin) → waitForReceipt → deposit → waitForReceipt`
- Allowance skippée si déjà suffisante (1 signature au lieu de 2)
- Machine à états : `idle → approving → depositing → success | error`
- Retrait en EURC (pas en shares internes) : `EURC input → convertToShares() → redeem()`

---

## Pages construites

| Page | Description |
|---|---|
| `/` | Landing : hero manifeste + LiveProofCard live, trois piliers, how-it-works, tableau comparatif, CTA dark |
| `/app` | Connect wallet → Dashboard (solde, deposit/withdraw, claim $FBK, tab On-chain) |
| `/governance` | Ce que la DAO peut/ne peut jamais faire |
| `/stake` | Placeholder $veFBK (V2) |

## Composants créés

| Composant | Rôle |
|---|---|
| `LiveProofCard` | Données on-chain live (TVL, block, fee) sur la landing |
| `AccountView` | Dashboard complet avec modals |
| `ConnectWallet` | Écran de connexion (Base Smart Wallet + MetaMask) |
| `Navbar` | Navigation fixe avec état connecté/déconnecté |

---

## Security review — 22 issues corrigés

### Critiques
1. Deposit flow incomplet (approve sans deposit)
2. `parseUnits` sur input non validé → `safeParseUnits()`
3. Retrait en shares internes → input EURC + `convertToShares`

### Hauts
4. `isConfirming` partagé deposit/withdraw → machines à états séparées
5. Zéro gestion d'erreur → `extractError()` + états error/retry
6. Allowance non vérifiée → skip approve si déjà suffisant
7. `txConfirmed` non resetté à la réouverture → `openModal()` reset tout
8. Decimals shares incorrects (9 au lieu de 6)
9. Pas de cap montant vs balance → guards `eurcBalance` + `maxWithdraw`
10. Claim $FBK absent

### Moyens / Accessibilité
11. ConnectWallet sans gestion d'erreur
12. ConnectWallet sans feedback "Connecting…"
13. ConnectWallet sans message si aucun wallet détecté
14. retry=3 RPC → retry: 1, retryDelay: 2000
15. `useBlockNumber({ watch: true })` trop agressif → capé à 12s
16. `!!userShares` vs `userShares !== undefined` (0n falsy)
17. `<nav>` sans `aria-label`
18. Erreurs sans `role="alert" aria-live="polite"`
19. Inputs sans `autoFocus` à l'ouverture des modals
20. Touche Escape ne fermait pas les modals
21. `<th>` sans `scope="col"` / `scope="row"`
22. `<th>` pour les row headers du tableau comparatif

---

## Déploiement

- **URL production :** https://frontend-fin-bank.vercel.app
- **Projet Vercel :** fin-bank/frontend
- **Build :** 38s, 0 erreur, 0 warning TypeScript
- **Déploiement :** via Vercel CLI (`npx vercel --prod --yes`)
- **Auto-deploy :** à connecter via Vercel → GitHub `Lololo23456/baas`

---

## Ce qui n'est pas encore fait

| Feature | Dépend de |
|---|---|
| Historique transactions | Brancher backend `/user/:address/history` |
| Gouvernance voting UI | Brancher backend `/proposals` |
| KYC onboarding flow | Accord commercial Synaps/Fractal ID |
| IBAN display | Accord commercial Monerium |
| Mobile responsive | Priorité basse |
| Skeletons loading | Priorité basse |
| Logo définitif | Design |
| Domaine custom | Achat domaine |

---

## Prochaines étapes

1. **Connecter GitHub → Vercel** pour auto-deploy sur chaque push
2. **Domaine custom** (finbank.xyz ou finbank.app)
3. **Contacter Synaps + Monerium** (accord commercial = déblocage KYC/IBAN)
4. **Choisir firme d'audit** (Trail of Bits, Spearbit, Code4rena)
