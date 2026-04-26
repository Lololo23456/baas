# Session du 2026-04-26 — Security Review, KYC Debug & Frontend Cleanup

## Décisions prises

- **KYC testnet flow supprimé du frontend** : L'UI d'enregistrement d'attestation (input UID + bouton "Verify") est retirée de `AccountView.tsx`. En production, le KYC sera géré automatiquement par Synaps → aucun geste manuel requis de l'utilisateur.
- **Compliance fix FinBankVault** : `deposit()` vérifie maintenant que le `receiver` (pas seulement le `msg.sender`) a un KYC valide. Nouvelle custom error `ReceiverNotAuthorized(address receiver)`.
- **FinBankGovernor** : `require(success, "...")` remplacé par `if (!success) revert CallFailed(i)` — custom errors cohérentes.
- **FBKDistributor** : `claim()` clampé au supply restant avec `SupplyCapReached()` — plus de revert sur mint dépassant le cap.
- **EASChecker** : Event `AttestationRegistered` ajouté pour la traçabilité on-chain des enregistrements KYC.
- **CORS backend** : Restreint à `FRONTEND_URL` en production via `env.FRONTEND_URL ?? true`.
- **Vercel monorepo** : `vercel.json` créé à la racine pour pointer les build commands sur `frontend/`.
- **170 tests, 0 échec** (ajout de `test_deposit_nonKYCReceiver_reverts()`, mise à jour de `test_redeem_withoutKYC_succeeds()`).

## Bugs diagnostiqués

### "Execution reverted" — cause 1 : KYC non enregistré
- Wallet `0x68CD...7735` n'avait pas appelé `registerAttestation()`.
- Fix : script Foundry `TestnetAttest.s.sol` pour que le deployer crée l'attestation EAS et la lie au wallet cible.
- Attestation créée : `0x63ac28a5...` pour `0x68CD...7735` — valide on-chain.

### "Execution reverted" — cause 2 : 0 ETH pour le gas
- Même avec une attestation valide, le wallet avait 0 ETH sur Base Sepolia.
- Gas insuffisant pour toute transaction (ERC-4337 user operation).
- **Décision** : Ce problème disparaîtra en production (Synaps gère l'onboarding, le wallet aura de l'ETH). Skip pour l'instant.

### `$DEPLOYER_PK not set` dans le terminal
- Fix : `source /Users/loic/Desktop/BAAS/.env` avant de lancer forge script.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/FinBankVault.sol` | `ReceiverNotAuthorized`, `require` → custom errors, receiver KYC check |
| `src/FinBankGovernor.sol` | `CallFailed(uint256 index)`, `require` → custom errors |
| `src/FBKDistributor.sol` | `SupplyCapReached`, claim() clampé au supply restant |
| `src/utils/EASChecker.sol` | Event `AttestationRegistered` |
| `src/test/FinBankVault.t.sol` | `test_deposit_nonKYCReceiver_reverts()`, fix `test_redeem_withoutKYC_succeeds()` |
| `src/script/TestnetAttest.s.sol` | Nouveau script : création attestation EAS pour testnet |
| `backend/src/index.ts` | CORS `FRONTEND_URL ?? true` |
| `backend/src/config/index.ts` | `FRONTEND_URL` env var optionnelle |
| `frontend/vercel.json` | Fix monorepo Vercel |
| `frontend/src/lib/wagmi.ts` | RPC depuis env vars |
| `frontend/src/lib/contracts.ts` | Supprimé `registerAttestation` de `EAS_CHECKER_ABI` |
| `frontend/src/components/bank/AccountView.tsx` | Supprimé UI testnet KYC (input UID), remplacé par info card propre |
| `frontend/src/app/layout.tsx` | Metadata twitter/robots |
| `frontend/src/components/bank/ConnectWallet.tsx` | Fix overlap navbar |
| `frontend/src/app/providers.tsx` | Supprimé `refetchInterval` global |

## Questions ouvertes

- Quel domaine acheter ? `finbank.app` ou `finbank.xyz`
- Quelle firme d'audit ? (Spearbit recommandé, aussi Code4rena/Sherlock)
- Timeline contact Synaps et Monerium ?

## Prochaines étapes

1. **Immédiat** : Domaine custom + configurer Vercel
2. **Court terme** : Emails Synaps + Monerium (contenu à définir)
3. **Frontend V1.5** : Onglet historique, interface gouvernance, responsive mobile
4. **Audit** : Choisir firme, préparer invariants + fuzz tests
5. **Mainnet** : Après audit clean
