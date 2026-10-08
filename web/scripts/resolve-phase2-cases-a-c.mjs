import { createRequire } from "module";
const require = createRequire(import.meta.url);
const keytar = require("C:/Users/9ytshade/Desktop/Genlayer Intelligent Contracts/proofpay/node_modules/keytar");
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from "fs";

const CONTRACT_ADDRESS = "0xD94f893C237551ca887991f0725aa96fc746B86F";
const RPC_ENDPOINT = "https://studio.genlayer.com/api";

async function main() {
  console.log("===============================================================");
  console.log("  Resolving Phase 2: Case A (#7) and Case C (#9)");
  console.log("===============================================================");

  const deployerPk = await keytar.getPassword("genlayer-cli", "account:proofpay-deployer");
  if (!deployerPk) throw new Error("Deployer private key not found in keytar");
  const deployer = createAccount(deployerPk);
  console.log(`[ACCOUNT] Client / Creator: ${deployer.address}\n`);

  const clientDeployer = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: deployer,
  });

  async function execWrite(name, functionName, args) {
    console.log(`--> [TX START] ${name} (${functionName})...`);
    const hash = await clientDeployer.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value: 0n,
    });
    console.log(`    Hash: ${hash}`);
    console.log(`    Waiting for Studionet validator consensus...`);
    const receipt = await clientDeployer.waitForTransactionReceipt({
      hash,
      retries: 120,
      interval: 5000,
    });
    console.log(`    Status: ${receipt.status} (Finalized)`);
    return { hash, receipt };
  }

  // 1. Resolve Case A: cancel_unaccepted_agreement on #7
  console.log("\n--- EXECUTING CASE A RESOLUTION (#7) ---");
  const cancelRes = await execWrite(
    "Cancel Unaccepted Bounty #7",
    "cancel_unaccepted_agreement",
    [7n]
  );

  const agreement7 = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [7n],
  });
  console.log(`Agreement #7 Status: ${agreement7.status}`);
  console.log(`Agreement #7 Client Refund: ${agreement7.client_refund} wei`);
  console.log(`Agreement #7 Worker Payout: ${agreement7.worker_payout} wei`);

  // 2. Resolve Case C: approve_delivery on #9
  console.log("\n--- EXECUTING CASE C RESOLUTION (#9) ---");
  const approveRes = await execWrite(
    "Creator Sovereign Override Approve #9",
    "approve_delivery",
    [9n]
  );

  const agreement9 = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [9n],
  });
  console.log(`Agreement #9 Status: ${agreement9.status}`);
  console.log(`Agreement #9 Audit Status: ${agreement9.audit_status}`);
  console.log(`Agreement #9 Client Refund: ${agreement9.client_refund} wei`);
  console.log(`Agreement #9 Worker Payout: ${agreement9.worker_payout} wei`);

  const result = {
    caseA: {
      agreementId: 7,
      cancelTx: cancelRes.hash,
      status: agreement7.status,
      clientRefund: agreement7.client_refund.toString(),
      workerPayout: agreement7.worker_payout.toString(),
    },
    caseC: {
      agreementId: 9,
      approveTx: approveRes.hash,
      status: agreement9.status,
      auditStatus: agreement9.audit_status,
      clientRefund: agreement9.client_refund.toString(),
      workerPayout: agreement9.worker_payout.toString(),
    },
  };

  fs.writeFileSync(
    "scripts/phase2-ac-results.json",
    JSON.stringify(result, null, 2),
    "utf8"
  );
  console.log("\nSuccessfully saved results to scripts/phase2-ac-results.json");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
