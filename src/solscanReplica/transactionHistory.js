const { Connection, PublicKey } = require('@solana/web3.js');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

// DeFi Program IDs
const knownDeFiPrograms = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN', // Raydium
  'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8', // Orca
  'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby', // Saber
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
];

/**
 * Fetches ALL transactions for a given mint address.
 * Uses pagination to ensure no transactions are missed.
 */
const fetchAllTransactionsForMint = async (mintAddress) => {
  const mintPubkey = new PublicKey(mintAddress);
  let allSignatures = [];
  let lastSignature = null;

  console.log(`\n🔍 Fetching all transactions for mint: ${mintAddress}...`);

  while (true) {
    const options = { limit: 1 };
    if (lastSignature) options.before = lastSignature;

    const signatures = await connection.getSignaturesForAddress(mintPubkey, options);
    if (signatures.length === 0) break; // Stop when no more transactions

    allSignatures.push(...signatures.map((sig) => sig.signature));
    lastSignature = signatures[signatures.length - 1].signature;

    console.log(`✅ Fetched ${allSignatures.length} transactions...`);
    if (signatures.length < 1000) break; // Stop if we fetched less than the limit
  }

  console.log(`✅ Total transactions fetched: ${allSignatures.length}`);
  return allSignatures;
};

/**
 * Fetches full transaction details for a given signature.
 */
const fetchTransactionDetails = async (signature) => {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return null;

    return {
      signature,
      blockTime: new Date(tx.blockTime * 1000).toISOString(),
      fee: tx.meta.fee / 1_000_000_000, // Convert lamports to SOL
      instructions: tx.transaction.message.instructions,
      accounts: tx.transaction.message.accountKeys.map((key) => key.pubkey.toString()),
      preBalances: tx.meta.preBalances,
      postBalances: tx.meta.postBalances,
    };
  } catch (error) {
    console.error(`❌ Error fetching transaction ${signature}:`, error.message);
    return null;
  }
};

/**
 * Extracts DeFi transactions from a given transaction.
 */
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

/**
 * Extracts Token Transfers (SOL & SPL Tokens).
 */
const extractTransfers = (tx) => {
  if (!tx) return null;
  const transfers = [];

  console.log('instructions', tx.instructions);
  for (const ix of tx.instructions) {
    if (ix.parsed && ix.parsed.type === 'transfer') {
      transfers.push({
        signature: tx.signature,
        blockTime: tx.blockTime,
        from: ix.parsed.info.source,
        to: ix.parsed.info.destination,
        amount: ix.parsed.info.amount / 1_000_000_000, // Convert lamports to SOL
        token: ix.parsed.info.mint || 'SOL',
      });
    }
  }

  return transfers.length > 0 ? transfers : null;
};

/**
 * Saves data to CSV format.
 */
const saveToCSV = (filename, headers, data) => {
  const filePath = path.join(__dirname, filename);
  const csvContent = [headers.join(','), ...data.map((row) => headers.map((h) => row[h]).join(','))].join('\n');
  fs.writeFileSync(filePath, csvContent);
  console.log(`📄 Saved: ${filename}`);
};

/**
 * Displays tables and saves CSV files.
 */
const displayAndSaveTables = (allTx, transfers, defiTx) => {
  saveToCSV('transactions.csv', ['signature', 'blockTime', 'fee', 'accounts'], allTx);

  saveToCSV('transfers.csv', ['signature', 'blockTime', 'from', 'to', 'amount', 'token'], transfers);

  saveToCSV('defi_transactions.csv', ['signature', 'blockTime', 'fee', 'program', 'details'], defiTx);
};

/**
 * Main function that tracks transactions, transfers, and DeFi activity for a given mint.
 */
const trackTransactionsForMint = async (mintAddress) => {
  const signatures = await fetchAllTransactionsForMint(mintAddress);
  const allTransactions = [];
  const transfers = [];
  const defiTransactions = [];

  for (const signature of signatures) {
    const tx = await fetchTransactionDetails(signature);
    if (!tx) continue;

    allTransactions.push(tx);
    const transferData = extractTransfers(tx);
    if (transferData) transfers.push(...transferData);

    const defiTx = extractDeFiTransactions(tx);
    if (defiTx) defiTransactions.push(...defiTx);
  }

  displayAndSaveTables(allTransactions, transfers, defiTransactions);
};

// Run for a specific mint
const mintAddress = 'Hn5SV8sUanvhLvFFKUPwMVN32jQNLTQRMkWep4AKpump';
trackTransactionsForMint(mintAddress);
