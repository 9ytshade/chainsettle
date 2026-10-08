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
  console.log("  ChainSettle v1.2.0: Studionet Live Lifecycle Verification");
  console.log("===============================================================");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Network:  GenLayer Studionet (Chain 61999)\n`);

  // 1. Setup Deployer Account
  const deployerPk = await keytar.getPassword("genlayer-cli", "account:proofpay-deployer");
  if (!deployerPk) throw new Error("Deployer private key not found in keytar");
  const deployer = createAccount(deployerPk);
  console.log(`[ACCOUNT] Client / Creator: ${deployer.address}`);

  // 2. Setup Dedicated Builder Account
  // Reads from environment variable or generates clean test key
  const builderPk =
    process.env.BUILDER_PRIVATE_KEY ||
    "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const builder = createAccount(builderPk);
  console.log(`[ACCOUNT] Contractor / Builder: ${builder.address}\n`);

  const clientDeployer = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: deployer,
  });

  const clientBuilder = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: builder,
  });

  const executionLog = {
    timestamp: new Date().toISOString(),
    contract: CONTRACT_ADDRESS,
    deployer: deployer.address,
    builder: builder.address,
    cases: [],
  };

  // Helper function to send and wait
  async function execWrite(client, name, functionName, args, value = 0n) {
    console.log(`--> [TX START] ${name} (${functionName})...`);
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
    });
    console.log(`    Hash: ${hash}`);
    console.log(`    Waiting for Studionet validator consensus...`);
    const receipt = await client.waitForTransactionReceipt({
      hash,
      retries: 120,
      interval: 5000,
    });
    console.log(`    Status: ${receipt.status} (Finalized)`);
    return { hash, receipt };
  }

  // -------------------------------------------------------------
  // LIFECYCLE CASE A: Cancellation & 100% Escrow Refund
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("  LIFECYCLE CASE A: Create Bounty -> Client Cancellation -> 100% Refund");
  console.log("=======================================================");

  const deadlineA = BigInt(Math.floor(Date.now() / 1000) + 86400 * 5);
  const reviewA = BigInt(86400 * 2);

  const createA = await execWrite(
    clientDeployer,
    "Create Bounty for Cancellation Test",
    "create_agreement",
    [
      "0x0000000000000000000000000000000000000000",
      "Case A: Client Cancellation Test Escrow",
      "Bounty created to verify instant client cancellation and 100% escrow refund before claim.",
      "1. Repository contains verified architecture\n2. Documentation provides instructions",
      deadlineA,
      reviewA,
    ],
    10000000000000000n // 0.01 GEN
  );

  const countAfterA = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement_count",
    args: [],
  });
  const caseAId = BigInt(countAfterA);
  console.log(`    Created Agreement ID: #${caseAId}`);

  // Now cancel it
  const cancelA = await execWrite(
    clientDeployer,
    `Cancel Agreement #${caseAId}`,
    "cancel_unaccepted_agreement",
    [caseAId],
    0n
  );

  const agreementA = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [caseAId],
  });
  console.log(`    Final Status: ${agreementA.status}`);
  console.log(`    Client Refund: ${agreementA.client_refund} wei`);
  console.log(`    Worker Payout: ${agreementA.worker_payout} wei`);

  executionLog.cases.push({
    name: "Case A: Cancellation & Refund",
    agreementId: Number(caseAId),
    createTx: createA.hash,
    cancelTx: cancelA.hash,
    status: agreementA.status,
    clientRefund: agreementA.client_refund.toString(),
  });

  // -------------------------------------------------------------
  // LIFECYCLE CASE B: Claim -> Submit Delivery -> Run Initial AI Audit
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("  LIFECYCLE CASE B: Open Bounty -> Claim -> Deliver -> Autonomous AI Audit");
  console.log("=======================================================");

  const deadlineB = BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);
  const reviewB = BigInt(86400 * 3);

  const createB = await execWrite(
    clientDeployer,
    "Create Open Bounty for Verification",
    "create_agreement",
    [
      "0x0000000000000000000000000000000000000000",
      "Case B: Autonomous AI Audit & Delivery Verification",
      "Verify that GenLayer validators execute initial AI audit on commit-pinned evidence and live deployment.",
      "1. The codebase contains README documentation\n2. The application loads over public HTTPS without errors",
      deadlineB,
      reviewB,
    ],
    10000000000000000n // 0.01 GEN
  );

  const countAfterB = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement_count",
    args: [],
  });
  const caseBId = BigInt(countAfterB);
  console.log(`    Created Agreement ID: #${caseBId}`);

  // Builder claims bounty
  const claimB = await execWrite(
    clientBuilder,
    `Builder Claim Bounty #${caseBId}`,
    "claim_agreement",
    [caseBId],
    0n
  );

  // Builder submits deliverable
  const submitB = await execWrite(
    clientBuilder,
    `Builder Submit Delivery #${caseBId}`,
    "submit_delivery",
    [
      caseBId,
      "https://github.com/9ytshade/proofpay/commit/e83e87d2d8f92987b7008a213ebca76ab133c8c2",
      "https://proofpay-gamma.vercel.app/",
      "Full delivery containing commit-pinned README and live HTTPS deployment.",
      "README.md",
    ],
    0n
  );

  // Trigger initial AI verification
  console.log(`--> [AI AUDIT] Invoking verify_delivery(#${caseBId}) on Studionet validators...`);
  const verifyB = await execWrite(
    clientDeployer,
    `Autonomous AI Audit verify_delivery(#${caseBId})`,
    "verify_delivery",
    [caseBId],
    0n
  );

  const agreementB = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [caseBId],
  });
  console.log(`    Final Status: ${agreementB.status}`);
  console.log(`    Audit Status: ${agreementB.audit_status}`);
  console.log(`    Worker Payout: ${agreementB.worker_payout} wei`);
  console.log(`    Client Refund: ${agreementB.client_refund} wei`);
  if (agreementB.audit_report) {
    console.log(`    Audit Report:\n${agreementB.audit_report}`);
  }

  executionLog.cases.push({
    name: "Case B: Autonomous AI Audit",
    agreementId: Number(caseBId),
    createTx: createB.hash,
    claimTx: claimB.hash,
    submitTx: submitB.hash,
    verifyTx: verifyB.hash,
    status: agreementB.status,
    auditStatus: agreementB.audit_status,
    auditReport: agreementB.audit_report,
    workerPayout: agreementB.worker_payout.toString(),
  });

  // -------------------------------------------------------------
  // LIFECYCLE CASE C: Deficient Audit -> Creator Sovereign Override
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log("  LIFECYCLE CASE C: Deficient Audit -> Creator Sovereign Override");
  console.log("=======================================================");

  const deadlineC = BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);
  const reviewC = BigInt(86400 * 3);

  const createC = await execWrite(
    clientDeployer,
    "Create Bounty with Missing Requirement",
    "create_agreement",
    [
      "0x0000000000000000000000000000000000000000",
      "Case C: Deficient Audit and Creator Override",
      "Milestone testing validator pause when acceptance criteria fail, followed by creator sovereign override.",
      "1. Repository contains file contracts/nonexistent_verification_file.py\n2. File defines STRICT_AUDIT_PASS_TOKEN",
      deadlineC,
      reviewC,
    ],
    10000000000000000n // 0.01 GEN
  );

  const countAfterC = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement_count",
    args: [],
  });
  const caseCId = BigInt(countAfterC);
  console.log(`    Created Agreement ID: #${caseCId}`);

  // Builder claims
  const claimC = await execWrite(
    clientBuilder,
    `Builder Claim Bounty #${caseCId}`,
    "claim_agreement",
    [caseCId],
    0n
  );

  // Builder submits evidence without the nonexistent file
  const submitC = await execWrite(
    clientBuilder,
    `Builder Submit Evidence #${caseCId}`,
    "submit_delivery",
    [
      caseCId,
      "https://github.com/9ytshade/proofpay/commit/e83e87d2d8f92987b7008a213ebca76ab133c8c2",
      "https://proofpay-gamma.vercel.app/",
      "Deliberate submission lacking the requested verification file.",
      "README.md",
    ],
    0n
  );

  // Initial AI Audit (should detect missing file and flag deficient)
  console.log(`--> [AI AUDIT] Invoking verify_delivery(#${caseCId})...`);
  const verifyC = await execWrite(
    clientDeployer,
    `Autonomous AI Audit verify_delivery(#${caseCId})`,
    "verify_delivery",
    [caseCId],
    0n
  );

  const agreementCAfterAudit = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [caseCId],
  });
  console.log(`    Audit Status: ${agreementCAfterAudit.audit_status}`);
  console.log(`    Agreement Status: ${agreementCAfterAudit.status}`);

  // Creator exercises Sovereign Override to disburse 100% escrow
  console.log(`--> [SOVEREIGN OVERRIDE] Creator approving full payout despite deficient audit...`);
  const overrideC = await execWrite(
    clientDeployer,
    `Sovereign Override Approve #${caseCId}`,
    "approve_delivery",
    [caseCId],
    0n
  );

  const agreementCFinal = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [caseCId],
  });
  console.log(`    Final Status: ${agreementCFinal.status}`);
  console.log(`    Worker Payout: ${agreementCFinal.worker_payout} wei`);
  console.log(`    Client Refund: ${agreementCFinal.client_refund} wei`);

  executionLog.cases.push({
    name: "Case C: Deficient Audit & Sovereign Override",
    agreementId: Number(caseCId),
    createTx: createC.hash,
    claimTx: claimC.hash,
    submitTx: submitC.hash,
    verifyTx: verifyC.hash,
    overrideTx: overrideC.hash,
    status: agreementCFinal.status,
    workerPayout: agreementCFinal.worker_payout.toString(),
  });

  // Save log file
  fs.writeFileSync(
    "scripts/studionet-execution-results.json",
    JSON.stringify(executionLog, null, 2),
    "utf8"
  );
  console.log("\n=======================================================");
  console.log("  ALL SCENARIOS EXECUTED & CONFIRMED ON STUDIONET!");
  console.log("=======================================================");
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
