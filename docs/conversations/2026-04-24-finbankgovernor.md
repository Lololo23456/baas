# Session du 2026-04-24 — FinBankGovernor.sol

## Decisions prises

### Architecture FinBankGovernor
- **Cycle de vie complet** : propose → votingDelay → Active → vote → Succeeded → queue → timelockDelay → execute
- **Pouvoir de vote** : `veFBK.balanceOfAt(user, snapshotTimestamp)` — snapshot au moment du propose()
- **Quorum** : `totalLocked * quorumBps / 10000` (4% par defaut, ajustable par DAO)
- **Timelock integre** : delai de securite gere dans le Governor lui-meme (pas de contrat separe)
- **Auto-amendable** : les parametres (delay, period, quorum, threshold) ne peuvent etre modifies que par proposition DAO executee (`onlyGovernance`)
- **Cancel** : le proposant peut annuler avant l'execution
- **View functions** : `getProposalTiming()` et `getProposalVotes()` pour acceder aux champs sans stack too deep

### Bug via_ir et solution
- L'erreur "stack too deep" sur le helper `_getProposalCore` a necessite `via_ir = true`
- `via_ir` causait des regressions dans FBKDistributor et VeFBK tests
- Solution : supprimer `via_ir`, ajouter des view functions ciblees au Governor (`getProposalTiming`, `getProposalVotes`), réécrire les tests pour les utiliser

### Etat final des tests
- **15 tests FinBankVault** : passants
- **33 tests FBKToken** : passants
- **46 tests VeFBK** : passants
- **33 tests FBKDistributor** : passants
- **42 tests FinBankGovernor** : passants
- **TOTAL : 169 tests — 0 echec**

## Fichiers crees/modifies

- `src/FinBankGovernor.sol` — cree (270 lignes)
- `src/test/FinBankGovernor.t.sol` — cree (420 lignes, 42 tests)
- `docs/architecture.md` — mis a jour (complet)
- `CLAUDE.md` — mis a jour (complet)

## Architecture des smart contracts — COMPLETE

Tous les contrats V1 sont ecrits et testes :
1. `FinBankVault.sol` — Vault ERC-4626 sur Morpho Blue
2. `FBKToken.sol` — Token de gouvernance $FBK (100M cap, Fair Launch)
3. `VeFBK.sol` — Staking vote-escrowed (modele Curve veCRV)
4. `FBKDistributor.sol` — Distribution $FBK proportionnelle aux depots
5. `FinBankGovernor.sol` — Governor on-chain complet avec timelock

## Prochaines etapes

1. Mettre a jour `Deploy.s.sol` pour inclure les 3 nouveaux contrats
2. Deployer sur Base Sepolia
3. Audit de securite externe avant mainnet
