const { Connection, PublicKey } = require('@solana/web3.js');

const PUMP_FUN_KEY = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'; // Pump.fun Program ID
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

const pumpFun = new PublicKey(PUMP_FUN_KEY);
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

async function main(connection, programId) {
  console.log('Monitoring transactions for Pump.fun:', programId.toString());

  connection.onLogs(
    programId,
    async ({ logs, err, signature }) => {
      if (err) return;

      // Process only transactions that include a "Program log: Instruction: Create" message.
      if (logs.some((log) => log.includes('Program log: Instruction: Create'))) {
        try {
          // Retrieve the fully parsed transaction by its signature.
          // We pass maxSupportedTransactionVersion: 0 to support transactions with version 0.
          const tx = await connection.getParsedTransaction(signature, {
            commitment: 'finalized',
            maxSupportedTransactionVersion: 0,
          });
          if (tx && tx.meta && tx.transaction) {
            console.log(tx.transaction.message);
            // Extract all account keys from the transaction's message.
            const accounts = tx.transaction.message.accountKeys.map((keyObj) => keyObj.pubkey.toString());
            console.log('Signature:', signature);
            console.table(accounts);
            console.log('##########################################################################################');
          }
        } catch (error) {
          console.error('Failed to get parsed transaction for signature:', signature, error);
        }
      }
    },
    'finalized',
  );
}

main(connection, pumpFun).catch(console.error);
