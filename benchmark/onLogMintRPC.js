const { Connection, PublicKey } = require('@solana/web3.js');

const RAYDIUM_PUBLIC_KEY = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

const raydium = new PublicKey(RAYDIUM_PUBLIC_KEY);
const connection = new Connection(`http://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

async function main(connection, mintAddress) {
  console.log('Monitoring logs for program:', mintAddress.toString());
  connection.onLogs(
    mintAddress,
    async ({ logs, err, signature }) => {
      if (err) return;

      if (logs && logs.some((log) => log.includes('initialize2'))) {
        console.log("Signature for 'initialize2':", signature);
        const logTriggerTime = Math.floor(Date.now() / 1000);
        await fetchRaydiumAccounts(signature, connection, logTriggerTime);
      }
    },
    'finalized',
  );
}

async function fetchRaydiumAccounts(txId, connection, logTriggerTime) {
  const tx = await connection.getParsedTransaction(txId, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });

  if (!tx || !tx.blockTime) {
    console.log(`No valid block time for transaction: ${txId}`);
    return;
  }

  const accounts = tx?.transaction.message.instructions.find(
    (ix) => ix.programId.toBase58() === RAYDIUM_PUBLIC_KEY,
  )?.accounts;

  if (!accounts) {
    console.log('No accounts found in the transaction.');
    return;
  }

  const tokenAIndex = 8;
  const tokenBIndex = 9;

  const tokenAAccount = accounts[tokenAIndex]?.toBase58();
  const tokenBAccount = accounts[tokenBIndex]?.toBase58();

  if (!tokenAAccount || !tokenBAccount) {
    console.log('Token accounts not found.');
    return;
  }

  console.log('New LP Found');
  console.log(generateExplorerUrl(txId));
  console.table([
    { Token: 'A', 'Account Public Key': tokenAAccount },
    { Token: 'B', 'Account Public Key': tokenBAccount },
  ]);

  console.log(`Transaction Time: ${new Date(tx.blockTime * 1000).toISOString()}`);
  console.log(`Log Trigger Time: ${new Date(logTriggerTime * 1000).toISOString()}`);
  console.log(`Time Difference: ${logTriggerTime - tx.blockTime} seconds`);
}

function generateExplorerUrl(txId) {
  return `https://solscan.io/tx/${txId}`;
}

main(connection, raydium).catch(console.error);
