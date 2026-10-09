import { createRequire } from "module";
const require = createRequire(import.meta.url);
const keytar = require("C:/Users/9ytshade/Desktop/Genlayer Intelligent Contracts/proofpay/node_modules/keytar");
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from "fs";
import path from "path";

const RPC_ENDPOINT = "https://studio.genlayer.com/api";

async function main() {
  console.log("=== Deploying ChainSettle v1.2.0 to Studionet ===");

  const deployerPk = await keytar.getPassword("genlayer-cli", "account:proofpay-deployer");
  if (!deployerPk) throw new Error("Deployer private key not found in keytar");
  const deployer = createAccount(deployerPk);
  console.log(`Deployer: ${deployer.address}`);

  const client = createClient({
    chain: studionet,
    endpoint: RPC_ENDPOINT,
    account: deployer,
  });

  const contractPath = path.resolve(process.cwd(), "../contracts/chainsettle.py");
  const contractCode = fs.readFileSync(contractPath, "utf-8");
  console.log(`Read contract code (${contractCode.length} bytes) from ${contractPath}`);

  console.log("Broadcasting deploy transaction...");
  const txHash = await client.deployContract({
    code: contractCode,
    args: [],
  });

  console.log(`Deploy Transaction Hash: ${txHash}`);
  console.log("Waiting for Studionet consensus finalization...");

  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    retries: 150,
    interval: 5000,
  });

  console.log("Receipt status:", receipt.status);
  console.log("Full receipt:", JSON.stringify(receipt, null, 2));

  const contractAddress =
    receipt.contractAddress ||
    receipt.data?.contract_address ||
    receipt.data?.address ||
    (receipt.data && typeof receipt.data === "string" ? receipt.data : null);

  console.log(`\n======================================================`);
  console.log(`  DEPLOYED CONTRACT ADDRESS: ${contractAddress}`);
  console.log(`  DEPLOYMENT TX HASH:        ${txHash}`);
  console.log(`======================================================`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
