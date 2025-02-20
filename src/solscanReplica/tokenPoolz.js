const { Connection, PublicKey } = require('@solana/web3.js');

const RAYDIUM_PUBLIC_KEY = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

const mintToken = new PublicKey('4MpXgiYj9nEvN1xZYZ4qgB6zq5r2JMRy54WaQu5fpump');
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

/**
 * Main function:
 * - Fetches recent signatures for the given program address.
 * - For each signature, retrieves the parsed transaction.
 * - Searches for the "initialize2" log message.
 * - If found, calls fetchRaydiumAccounts to process the transaction.
 */
async function main(connection, programPubkey) {
  console.log('Searching for recent transactions for program:', programPubkey.toString());

  // Fetch up to 100 recent signatures for the program.
  const signatures = await connection.getSignaturesForAddress(programPubkey, { limit: 1000 });
  console.log(`Found ${signatures.length} signatures.`);

  for (const sigInfo of signatures) {
    if (sigInfo.err) {
      console.log(`Skipping signature ${sigInfo.signature} due to error:`, sigInfo.err);
      continue;
    }

    console.log(`Processing signature: ${sigInfo.signature}`);
    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      console.log(`Transaction ${sigInfo.signature} not found or not confirmed yet.`);
      continue;
    }

    const logs = tx.meta && tx.meta.logMessages ? tx.meta.logMessages : [];
    if (logs.some((log) => log.includes('initialize2'))) {
      console.log("Found 'initialize2' in transaction logs for signature:", sigInfo.signature);
      await fetchRaydiumAccounts(sigInfo.signature, connection);
    }
  }
}

/**
 * Fetches and processes the Raydium accounts from a transaction identified by txId.
 * Extracts relevant account addresses from the Raydium instruction and then queries
 * token metadata for some of these addresses.
 */
async function fetchRaydiumAccounts(txId, connection) {
  const tx = await connection.getParsedTransaction(txId, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!tx) {
    console.log('Transaction not found or not confirmed yet:', txId);
    return;
  }

  const instructions = tx.transaction.message.instructions;
  const raydiumInstruction = instructions.find((ix) => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY);

  if (!raydiumInstruction || !raydiumInstruction.accounts) {
    console.log('No relevant accounts found in the transaction.');
    return;
  }

  const accounts = raydiumInstruction.accounts.map((acc) => acc.toBase58());
  console.log('Accounts:', accounts);

  // Indices based on the instruction layout (placeholders, update as needed)
  const marketIndexA = 4;
  const marketIndexB = 5;
  const tokenAIndex = 8;
  const tokenBIndex = 9;
  const liquidityPoolIndex1 = 10;
  const liquidityPoolIndex2 = 11;

  const marketAddressA = accounts[marketIndexA] || 'Not Found';
  const marketAddressB = accounts[marketIndexB] || 'Not Found';
  const tokenAAccount = accounts[tokenAIndex] || 'Not Found';
  const tokenBAccount = accounts[tokenBIndex] || 'Not Found';
  const liquidityPoolAddress1 = accounts[liquidityPoolIndex1] || 'Not Found';
  const liquidityPoolAddress2 = accounts[liquidityPoolIndex2] || 'Not Found';

  const tokenAInfo = await fetchTokenMetadata(tokenAAccount, connection);
  const tokenBInfo = await fetchTokenMetadata(tokenBAccount, connection);

  console.log('New Raydium Market Found');
  console.log(generateExplorerUrl(txId));
  console.table([
    { Market: 'Raydium Market', 'Account Public Key': marketAddressA },
    { Market: 'Raydium Market', 'Account Public Key': marketAddressB },
    { Token: 'A', 'Account Public Key': tokenAAccount, Symbol: tokenAInfo.symbol },
    { Token: 'B', 'Account Public Key': tokenBAccount, Symbol: tokenBInfo.symbol },
    { Pool: 'Liquidity Pool 1', 'Account Public Key': liquidityPoolAddress1 },
    { Pool: 'Liquidity Pool 2', 'Account Public Key': liquidityPoolAddress2 },
  ]);
}

/**
 * Fetch token metadata for the given mint address.
 * Uses getParsedAccountInfo to extract token symbol and name.
 */
async function fetchTokenMetadata(mintAddress, connection) {
  try {
    if (mintAddress === 'Not Found') return { symbol: 'Unknown', name: 'Unknown' };

    const tokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));

    if (tokenAccountInfo.value && tokenAccountInfo.value.data.parsed) {
      const { info } = tokenAccountInfo.value.data.parsed;
      return {
        symbol: info.symbol || 'Unknown',
        name: info.name || 'Unknown',
      };
    }
  } catch (err) {
    console.log('Error fetching token metadata for:', mintAddress);
  }
  return { symbol: 'Unknown', name: 'Unknown' };
}

/**
 * Generates an explorer URL for the given transaction ID.
 */
function generateExplorerUrl(txId) {
  return `https://solscan.io/tx/${txId}`;
}

// Start by searching for recent transactions on the Raydium program.
main(connection, mintToken).catch(console.error);
