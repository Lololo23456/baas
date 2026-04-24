# Session du 2026-04-24 — FBKDistributor.sol

## Decisions prises

### Architecture FBKDistributor
- **Pattern Synthetix StakingRewards** : accumulateur `rewardPerShareStored` mis a jour a chaque interaction
- **Couplage Vault** : le Vault appelle `notifyDeposit()` / `notifyWithdraw()` via une interface optionnelle
- **Distributor = minter** : le FBKDistributor est le seul autorise a minter des $FBK (Fair Launch garanti)
- **rewardRate ajustable** : la DAO peut modifier le taux FBK/seconde via `setRewardRate()`
- **V1 — proportionnel aux shares** : la ponderation par anciennete ($veFBK) est reportee en V2

### Formule de distribution
```
rewardPerShare() = rewardPerShareStored
                 + (now - lastUpdateTime) * rewardRate * 1e18 / totalShares

earned(user) = userShares * (rewardPerShare() - userRewardPerSharePaid) / 1e18
             + pendingReward
```

### Modifications FinBankVault.sol
- Ajout de l'interface `IFBKDistributor` (notifyDeposit / notifyWithdraw)
- Ajout du storage `address public distributor`
- Ajout de `setDistributor(address)` onlyOwner
- Hook dans `deposit()` apres le mint de shares
- Hook dans `redeem()` apres le burn de shares
- Les hooks sont silencieux si `distributor == address(0)` → aucun impact sur les tests existants

### Etat des tests
- **15 tests FinBankVault** : tous passants
- **33 tests FBKToken** : tous passants
- **46 tests VeFBK** : tous passants
- **33 tests FBKDistributor** : tous passants
- **Total : 127 tests — 0 echec**

## Fichiers crees/modifies

- `src/FBKDistributor.sol` — cree (165 lignes)
- `src/test/FBKDistributor.t.sol` — cree (280 lignes, 33 tests)
- `src/FinBankVault.sol` — modifie (ajout interface + hooks + setDistributor)
- `docs/architecture.md` — mis a jour
- `CLAUDE.md` — mis a jour

## Prochaines etapes

1. `FinBankGovernor.sol` — votes on-chain avec $veFBK comme pouvoir de vote
2. Deploiement sur Base Sepolia (tous les contrats)
3. Audit de securite externe avant mainnet
