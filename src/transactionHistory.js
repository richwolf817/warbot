const { Connection, PublicKey } = require('@solana/web3.js');
const Table = require('cli-table3'); // Install with: npm install cli-table3

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});
// List of known DeFi program IDs
const knownDeFiPrograms = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN', // Raydium
  'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8', // Orca
  'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby', // Saber
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
];

// Function to fetch transactions for a mint
const fetchTransactionsForMint = async (mintAddress) => {
  const mintPubkey = new PublicKey(mintAddress);

  console.log(`\n🔍 Fetching transactions for mint: ${mintAddress}...`);
  const signatures = await connection.getSignaturesForAddress(mintPubkey, {
    limit: 50, // Adjust for more transactions
  });

  console.log(`✅ Found ${signatures.length} transactions.`);
  return signatures.map((sig) => sig.signature);
};

// Function to fetch and decode transaction details
const fetchTransactionDetails = async (signature) => {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return null;

    // Extract general transaction data
    return {
      signature,
      blockTime: new Date(tx.blockTime * 1000).toISOString(),
      fee: tx.meta.fee / 1_000_000_000, // Convert lamports to SOL
      instructions: tx.transaction.message.instructions,
      accounts: tx.transaction.message.accountKeys.map((key) => key.pubkey.toString()),
    };
  } catch (error) {
    console.error(`❌ Error fetching transaction ${signature}:`, error.message);
    return null;
  }
};

// Function to identify DeFi transactions
const extractDeFiTransactions = (tx) => {
  if (!tx) return null;

  const defiActions = [];
  for (const ix of tx.instructions) {
    const programId = ix.programId.toString();
    if (knownDeFiPrograms.includes(programId)) {
      let details = ix.parsed ? ix.parsed.info : { rawData: ix.data };
      defiActions.push({
        signature: tx.signature,
        blockTime: tx.blockTime,
        fee: tx.fee,
        program: programId,
        details,
      });
    }
  }

  return defiActions.length > 0 ? defiActions : null;
};

// Function to display tables
const displayTables = (allTx, defiTx) => {
  console.log('\n📜 ALL TRANSACTIONS');
  const allTable = new Table({
    head: ['Signature', 'Block Time', 'Fee (SOL)', 'Accounts'],
  });
  allTx.forEach((tx) => allTable.push([tx.signature, tx.blockTime, tx.fee, tx.accounts.join('\n')]));
  console.log(allTable.toString());

  console.log('\n💱 DEFI TRANSACTIONS');
  const defiTable = new Table({
    head: ['Signature', 'Block Time', 'Fee (SOL)', 'DeFi Program', 'Details'],
  });
  defiTx.forEach((tx) =>
    defiTable.push([tx.signature, tx.blockTime, tx.fee, tx.program, JSON.stringify(tx.details, null, 2)]),
  );
  console.log(defiTable.toString());
};

// Main function
const trackDeFiTransactionsForMint = async (mintAddress) => {
  const signatures = await fetchTransactionsForMint(mintAddress);

  const allTransactions = [];
  const defiTransactions = [];

  for (const signature of signatures) {
    const tx = await fetchTransactionDetails(signature);
    if (!tx) continue;

    allTransactions.push(tx);

    const defiTx = extractDeFiTransactions(tx);
    if (defiTx) defiTransactions.push(...defiTx);
  }

  displayTables(allTransactions, defiTransactions);
};

// Run it for a specific mint
const mintAddress = 'Hn5SV8sUanvhLvFFKUPwMVN32jQNLTQRMkWep4AKpump'; // Replace with the token mint address
trackDeFiTransactionsForMint(mintAddress);
