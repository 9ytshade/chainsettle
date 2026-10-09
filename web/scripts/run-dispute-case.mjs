import { createRequire } from "module";
const require = createRequire(import.meta.url);
const keytar = require("C:/Users/9ytshade/Desktop/Genlayer Intelligent Contracts/proofpay/node_modules/keytar");
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from "fs";

const CONTRACT_ADDRESS = "0x29a246a021F02D9A0b1f18a7DCc695d7Ee7643E5";
const RPC_ENDPOINT = "https://studio.genlayer.com/api";

async function main() {
  console.log("===============================================================");
  console.log("  LIFECYCLE CASE D: Dispute Court Escalation & BPS Adjudication");
  console.log("===============================================================\n");

  const deployerPk = await keytar.getPassword("genlayer-cli", "account:proofpay-deployer");
  const deployer = createAccount(deployerPk);
  const builderPk =
    process.env.BUILDER_PRIVATE_KEY ||
    "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const builder = createAccount(builderPk);

  const clientDeployer = createClient({ chain: studionet, endpoint: RPC_ENDPOINT, account: deployer });
  const clientBuilder = createClient({ chain: studionet, endpoint: RPC_ENDPOINT, account: builder });

  async function execWrite(client, name, functionName, args, value = 0n) {
    console.log(`--> [TX START] ${name}...`);
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      value,
    });
    console.log(`    Hash: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash, retries: 150, interval: 5000 });
    console.log(`    Status: ${receipt.status} (Finalized)`);
    return { hash, receipt };
  }

  // 1. Create Agreement #5
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400 * 7);
  const review = BigInt(86400 * 3);
  const txCreate = await execWrite(
    clientDeployer,
    "Create Agreement #5 for Dispute Court Case",
    "create_agreement",
    [
      "0x0000000000000000000000000000000000000000",
      "Case D: Disputed Milestone & Micro-Arbitration",
      "Milestone involving disputed delivery scope to test on-chain small-claims court and continuous Basis Points.",
      "1. Architecture specification documented in README\n2. Production smart contract deployed and verified",
      deadline,
      review,
    ],
    10000000000000000n // 0.01 GEN
  );

  const count = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement_count",
    args: [],
  });
  const agreementId = BigInt(count);
  console.log(`    Created Agreement ID: #${agreementId}`);

  // 2. Builder claims
  const txClaim = await execWrite(
    clientBuilder,
    `Builder Claim Agreement #${agreementId}`,
    "claim_agreement",
    [agreementId]
  );

  // 3. Builder delivers
  const txDeliver = await execWrite(
    clientBuilder,
    `Builder Submit Deliverable #${agreementId}`,
    "submit_delivery",
    [
      agreementId,
      "https://github.com/9ytshade/proofpay/commit/e83e87d2d8f92987b7008a213ebca76ab133c8c2",
      "https://proofpay-gamma.vercel.app/",
      "Deliverable submitted with README specification and live HTTPS frontend.",
      "README.md",
    ]
  );

  // 4. Client raises formal dispute grievance
  console.log(`--> [DISPUTE] Client raising dispute on Agreement #${agreementId}...`);
  const txDispute = await execWrite(
    clientDeployer,
    `Client Raise Dispute on #${agreementId}`,
    "raise_dispute",
    [
      agreementId,
      "The README architecture was partially delivered, but the contract criteria verification is contested.",
    ]
  );

  // 5. Builder files counter-defense with defense window waiver
  console.log(`--> [DEFENSE] Builder submitting dispute defense rebuttal on Agreement #${agreementId}...`);
  const txDefense = await execWrite(
    clientBuilder,
    `Builder Submit Dispute Defense on #${agreementId}`,
    "submit_dispute_defense",
    [
      agreementId,
      "The README architecture was delivered completely per specifications. Pinned commit e83e87d2 proves full milestone adherence.",
      true, // waive_remaining_time
    ]
  );

  // 6. GenLayer Validator Jury Adjudicates Dispute
  console.log(`--> [COURTROOM] Invoking adjudicate_dispute(#${agreementId}) on GenLayer validator magistrates...`);
  const txAdjudicate = await execWrite(
    clientDeployer,
    `Adjudicate Dispute #${agreementId} via GenLayer AI Magistrates`,
    "adjudicate_dispute",
    [agreementId]
  );

  // 7. Inspect Ruling and Final State
  const agreementFinal = await clientDeployer.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_agreement",
    args: [agreementId],
  });
  console.log(`\n=======================================================`);
  console.log(`  VERDICT FINALIZED ON STUDIONET!`);
  console.log(`=======================================================`);
  console.log(`Final Agreement Status: ${agreementFinal.status}`);
  console.log(`Worker Payout:          ${agreementFinal.worker_payout} wei`);
  console.log(`Client Refund:          ${agreementFinal.client_refund} wei`);
  console.log(`Ruling ID:              #${agreementFinal.ruling_id}`);

  if (agreementFinal.ruling_id > 0) {
    const ruling = await clientDeployer.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_ruling",
      args: [agreementFinal.ruling_id],
    });
    console.log(`Ruling Verdict:         ${ruling.verdict}`);
    console.log(`Worker Basis Points:    ${ruling.worker_basis_points} BPS (${ruling.worker_percentage_display})`);
    console.log(`Criteria Results:       ${ruling.criteria_results}`);
    console.log(`Calculation Breakdown:  ${ruling.calculation_breakdown}`);
    console.log(`Consensus Reasoning:    ${ruling.reasoning}`);
  }

  const resultData = {
    agreementId: Number(agreementId),
    createTx: txCreate.hash,
    claimTx: txClaim.hash,
    deliverTx: txDeliver.hash,
    disputeTx: txDispute.hash,
    defenseTx: txDefense.hash,
    adjudicateTx: txAdjudicate.hash,
    finalStatus: agreementFinal.status,
    workerPayout: agreementFinal.worker_payout.toString(),
    clientRefund: agreementFinal.client_refund.toString(),
    rulingId: Number(agreementFinal.ruling_id),
  };

  fs.writeFileSync("scripts/dispute-case-results.json", JSON.stringify(resultData, null, 2), "utf8");
}

main().catch(console.error);
