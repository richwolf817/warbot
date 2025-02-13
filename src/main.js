const { Connection, PublicKey } = require("@solana/web3.js");
const { writeToDynamo } = require("./dynamoHandler");
const { fork } = require("child_process");

const PUMP_KEYWORD = "pump";
const RAYDIUM_PUBLIC_KEY = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const SESSION_HASH = "QNDEMO" + Math.ceil(Math.random() * 1e9);

const raydium = new PublicKey(RAYDIUM_PUBLIC_KEY);
const connection = new Connection(
  `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE`,
  {
    wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE`,
    httpHeaders: { "x-session-hash": SESSION_HASH },
  }
);

/**
 * Spawns a new child process that will track the specified token.
 * This process will monitor logs, run trading algorithms,
 * and write relevant data to DynamoDB.
 */
function spawnTokenTracker(tokenAddress) {
  console.log(`Spawning tracker for token: ${tokenAddress}`);
  const tracker = fork("./tokenTracker.js");

  // Pass the token address to the child process.
  tracker.send({ tokenAddress });

  // Optionally, listen for messages from the child for logging.
  tracker.on("message", (msg) => {
    console.log(`Tracker update for ${tokenAddress}: `, msg);
  });

  tracker.on("exit", (code) => {
    console.log(`Tracker for token ${tokenAddress} exited with code ${code}`);
  });
}

/**
 * Monitors logs from a given program (here Raydium) and checks for liquidity pool creation.
 * If a new LP is found and one of its token accounts includes the "pump" keyword, we spawn a tracker.
 */
async function main(connection, mintAddress) {
  console.log("Monitoring logs for program:", mintAddress.toString());
  connection.onLogs(
    mintAddress,
    async ({ logs, err, signature }) => {
      if (err) return;

      // In this example, we assume that the "initialize2" log indicates a new LP.
      if (logs && logs.some((log) => log.includes("initialize2"))) {
        console.log("Signature for 'initialize2':", signature);
        const tokenAccounts = await fetchTokenAccounts(signature, connection);
        if (!tokenAccounts) return;

        const { tokenAAccount, tokenBAccount } = tokenAccounts;

        console.log("New LP Found");
        console.log(generateExplorerUrl(signature));
        console.table([
          { Token: "A", "Account Public Key": tokenAAccount },
          { Token: "B", "Account Public Key": tokenBAccount },
        ]);

        // Kick Off Spawn if "pump" Migration detected
        if (tokenAAccount.toLowerCase().includes(PUMP_KEYWORD)) {
          console.log("Pump Migration Detected:", tokenAAccount);
          spawnTokenTracker(tokenAAccount);
        }
        if (tokenBAccount.toLowerCase().includes(PUMP_KEYWORD)) {
          console.log("Pump Migration Detected:", tokenBAccount);
          spawnTokenTracker(tokenBAccount);
        }
      }
    },
    "finalized"
  );
}

/**
 * Fetches the token accounts from the transaction that triggered the log.
 */
async function fetchTokenAccounts(txId, connection) {
  const tx = await connection.getParsedTransaction(txId, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  const accounts = tx?.transaction.message.instructions.find(
    (ix) => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY
  )?.accounts;

  if (!accounts) {
    console.log("No accounts found in the transaction.");
    return null;
  }

  // Adjust these indices if needed.
  const tokenAIndex = 8;
  const tokenBIndex = 9;

  const tokenAAccount = accounts[tokenAIndex]?.toBase58();
  const tokenBAccount = accounts[tokenBIndex]?.toBase58();

  if (!tokenAAccount || !tokenBAccount) {
    console.log("Token accounts not found.");
    return null;
  }
  return { tokenAAccount, tokenBAccount };
}

function generateExplorerUrl(txId) {
  return `https://solscan.io/tx/${txId}`;
}

// Start monitoring using the Raydium program.
main(connection, raydium).catch(console.error);
