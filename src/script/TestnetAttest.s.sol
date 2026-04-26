// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// ─────────────────────────────────────────────────────────────────────────────
// TestnetAttest — Script de KYC testnet pour FinBank Sepolia
//
// Usage :
//   forge script src/script/TestnetAttest.s.sol \
//     --rpc-url $BASE_SEPOLIA_RPC_URL \
//     --private-key $DEPLOYER_PK \
//     --broadcast \
//     --sig "run(address)" <WALLET_ADDRESS>
//
// Ce que ça fait :
//   1. Crée une attestation EAS (kycPassed=true, amlClear=true, tier=1)
//      depuis le deployer (attestor agréé) vers le wallet cible
//   2. Affiche l'attestation UID → à coller dans l'interface "Vérifier mon compte"
// ─────────────────────────────────────────────────────────────────────────────

import "forge-std/Script.sol";

interface IEAS {
    struct AttestationRequestData {
        address recipient;
        uint64  expirationTime;
        bool    revocable;
        bytes32 refUID;
        bytes   data;
        uint256 value;
    }
    struct AttestationRequest {
        bytes32                schema;
        AttestationRequestData data;
    }
    function attest(AttestationRequest calldata request) external payable returns (bytes32);
}

contract TestnetAttest is Script {
    // Adresses Base Sepolia
    address constant EAS        = 0x4200000000000000000000000000000000000021;
    address constant EAS_CHECKER = 0x7E069926A4cf1D6EaF6FA8823c91B356CDCC1b03;

    // Schema KYC FinBank déjà enregistré sur Sepolia
    bytes32 constant KYC_SCHEMA = 0x8e3fcc4eec08f17a5655bdb07d4a9fb55e961420591855e383bed48885d4e9da;

    function run(address targetWallet) external {
        require(targetWallet != address(0), "Target wallet required");

        vm.startBroadcast(vm.envUint("DEPLOYER_PK"));

        bytes32 uid = IEAS(EAS).attest(
            IEAS.AttestationRequest({
                schema: KYC_SCHEMA,
                data: IEAS.AttestationRequestData({
                    recipient:      targetWallet,
                    expirationTime: 0,         // Pas d'expiration
                    revocable:      true,
                    refUID:         bytes32(0),
                    data:           abi.encode(true, true, uint8(1)), // kycPassed, amlClear, tier=1
                    value:          0
                })
            })
        );

        vm.stopBroadcast();

        console.log("=================================================");
        console.log("Attestation KYC creee pour :", targetWallet);
        console.log("Attestation UID :");
        console.logBytes32(uid);
        console.log("=================================================");
        console.log("Prochaine etape : dans l'app FinBank,");
        console.log("clique sur 'Verifier mon compte' et colle cet UID.");
        console.log("=================================================");
    }
}
