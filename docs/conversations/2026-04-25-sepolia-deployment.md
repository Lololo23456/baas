# Session du 2026-04-25 — Déploiement Base Sepolia + Tests End-to-End

## Décisions prises

### Infrastructure testnet
- **RPC** : RPC public Base Sepolia `https://sepolia.base.org` (pas Alchemy — free tier trop restrictif sur eth_getLogs)
- **Alchemy** conservé pour les clés API futures mais RPC public utilisé pour l'indexeur
- **Base de données** : Supabase (PostgreSQL managé) avec connection pooler port 5432 (session mode)
  - URL pooler : `aws-1-eu-central-1.pooler.supabase.com:5432` (pas port 6543 — transaction mode incompatible Prisma)
- **Wallet de test** : `0x8e4A6f0866904D9edB6bb5e2CD56199EAfadEEA6` (0.01 ETH Sepolia via Superchain Faucet)

### Contrats déployés sur Base Sepolia (2ème déploiement — bug MockMorpho corrigé)

| Contrat | Adresse Sepolia |
|---|---|
| MockEURC | `0x914bD84678ABc7ace192ba0f27Ac7a5e5920e218` |
| MockMorpho | `0xcf235aA8485bddCCB8d276a8AC97bD78521974ca` |
| EASChecker | `0x7E069926A4cf1D6EaF6FA8823c91B356CDCC1b03` |
| FBKToken | `0x9B0a0f72D836AcD51DAD8efE31aa667569090F18` |
| FinBankVault | `0x5C763aA7536BF5D67155553BD709Ca66187CDfDd` |
| VeFBK | `0x977f97eb4d637BE63fFec069329673358acF4A6F` |
| FBKDistributor | `0xeba8C8720cc1fA0AC51bE9F618ebEe9d1ecFBc3f` |
| FinBankGovernor | `0x1aE5609aff8bA236ba601E7554135F35f3ab88F0` |

- Treasury = adresse deployer (`0x8e4A6f0866904D9edB6bb5e2CD56199EAfadEEA6`)
- Fee = 15%, Reward rate = 0.1 FBK/sec
- MockEURC : 1 000 000 mintés au deployer

### Bug MockMorpho corrigé
- `position()` retournait `bytes memory` au lieu de `Position memory` → `totalAssets()` renvoyait 5 au lieu de 1000000000
- `market()` même bug
- Ajout surcharge `addYield(address loanToken, uint256 amount)` pour TestFlow
- Fix : changer les types de retour pour matcher l'interface IMorpho

### Tests End-to-End réussis ✅

Résultats du `TestFlow.s.sol` exécuté sur Base Sepolia :
```
1-4. KYC OK - deployer deja autorise
     isAuthorized: true
5.   Solde EURC deployer: 1 010 000 EURC
     Vault approuve pour depenser EURC
6.   Shares fbEURC recues: 1 000 000 000
     totalAssets avant: 0
     totalAssets apres: 1 000 000 000   ← CORRECT (1000 EURC en 6 dec)
7.   totalAssets avec yield: 1 050 000 000  ← yield de 50 EURC bien pris en compte
     Yield genere: 50 000 000 EURC (6 dec)
8.   Valeur shares: 1 050 000 000  ← chaque share vaut plus qu'au dépôt ✓
9.   Shares brulee: 500 000 000
     EURC recu: 521 250 000  ← 521.25 EURC (include yield proportionnel)
     Solde EURC apres retrait: 1 009 471 EURC
10.  FBK en attente: 0 FBK (normal - pas de temps écoulé)
11.  Pas assez de FBK pour le lock (normal)
=== TEST FLOW COMPLETE ===
ONCHAIN EXECUTION COMPLETE & SUCCESSFUL.
```

Validé on-chain : https://sepolia.basescan.org/address/0x5C763aA7536BF5D67155553BD709Ca66187CDfDd

### Note sur la procédure KYC manuelle
Le KYC (attest + registerAttestation) doit être fait en deux transactions séparées via cast send, car l'UID d'attestation EAS dépend du block.timestamp et est imprévisible dans les forge scripts :
```bash
# 1. Créer l'attestation
cast send $EAS "attest((bytes32,(address,uint64,bool,bytes32,bytes,uint256)))" \
  "(schemaUID, (wallet, 0, true, 0x0, data, 0))" --private-key $PK

# 2. Extraire l'UID depuis le receipt, puis enregistrer
cast send $EAS_CHECKER "registerAttestation(bytes32)" $ATTESTATION_UID --private-key $PK
```

### Backend opérationnel
- API sur `http://localhost:3001`
- Indexeur en polling toutes les 5 secondes sur `https://sepolia.base.org`
- DB Supabase synchronisée
- `GET /vault` retourne données on-chain en temps réel ✅

## État après session

- **Phase 2 COMPLETE** : contrats déployés, backend fonctionnel, tests end-to-end réussis on-chain
- Frontend (Phase 3) : prochaine étape

## Prochaines étapes

1. Phase 3 : Frontend Next.js 14 + wagmi + viem + TailwindCSS + shadcn/ui
   - Landing page
   - Dashboard (dépôts, yield, FBK)
   - Flux KYC (onboarding)
   - Gouvernance DAO
   - Staking veFBK
2. Phase 4 : KYC Synaps + IBAN Monerium (partenaires commerciaux)
