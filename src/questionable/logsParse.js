const { Connection, PublicKey } = require('@solana/web3.js');

const API_KEY = '0ee98967-0ece-4dec-ac93-482f0e64d5a2';
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

// Setup the connection using Helius RPC
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${API_KEY}`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=${API_KEY}`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

// Replace with your specific mint token's public key
const RAYDIUM_PUBLIC_KEY = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const MINT_TOKEN_PUBLIC_KEY = new PublicKey('vBtTYBQuqPR2NvKgcoVjYoZ8HW5dftGkVvyUdkTpump');

let eventCount = 0;

// Subscribe to logs that mention this mint token
connection.onLogs(
  RAYDIUM_PUBLIC_KEY,
  async ({ logs, err, signature }) => {
    if (err) return;

    eventCount++;
    console.log(eventCount);
    /*
    // In this example, we assume that the "initialize2" log indicates a new LP.
    if (logs && logs.some((log) => log.includes('vBtTYBQuqPR2NvKgcoVjYoZ8HW5dftGkVvyUdkTpump'))) {
      logs.forEach((logLine, idx) => {
        // Parse a SwapEvent log line
        if (logLine.includes('SwapEvent')) {
          // Example log:
          // "Program log: SwapEvent { dex: RaydiumSwap, amount_in: 19989629978, amount_out: 20936335 }"
          const swapEventRegex =
            /SwapEvent\s*\{\s*dex:\s*([A-Za-z0-9]+),\s*amount_in:\s*(\d+),\s*amount_out:\s*(\d+)\s*\}/;
          const match = swapEventRegex.exec(logLine);
          if (match) {
            const dex = match[1];
            const amountIn = match[2];
            const amountOut = match[3];
            console.log('-> SwapEvent detected:');
            console.log(`   Dex: ${dex}`);
            console.log(`   Amount In (raw): ${amountIn}`);
            console.log(`   Amount Out (raw): ${amountOut}`);

            // Here you could convert these raw amounts using token decimals
            // For example, if amountIn is in atomic units and token has 6 decimals:
            // const humanReadableAmountIn = Number(amountIn) / Math.pow(10, 6);
            // console.log(`   Amount In (readable): ${humanReadableAmountIn}`);
          }
        }

        // Optionally, parse other lines (e.g., balance details) with similar regex.
        // For example, for a line like:
        // "Program log: before_source_balance: 19995904818, before_destination_balance: 0, amount_in: 19989629978, expect_amount_out: 20889403, min_return: 19615150"
        if (logLine.includes('before_source_balance')) {
          const balanceRegex =
            /before_source_balance:\s*(\d+),\s*before_destination_balance:\s*(\d+),\s*amount_in:\s*(\d+),\s*expect_amount_out:\s*(\d+),\s*min_return:\s*(\d+)/;
          const balanceMatch = balanceRegex.exec(logLine);
          if (balanceMatch) {
            const beforeSource = balanceMatch[1];
            const beforeDest = balanceMatch[2];
            const amountIn = balanceMatch[3];
            const expectedOut = balanceMatch[4];
            const minReturn = balanceMatch[5];
            console.log('-> Balance Details:');
            console.log(`   Before Source Balance: ${beforeSource}`);
            console.log(`   Before Destination Balance: ${beforeDest}`);
            console.log(`   Amount In: ${amountIn}`);
            console.log(`   Expected Out: ${expectedOut}`);
            console.log(`   Min Return: ${minReturn}`);
          }
        }
      });
    }
      */
  },

  'finalized',
);

console.log('onLogs subscription for mint token initiated.');
