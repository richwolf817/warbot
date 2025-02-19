const { Connection, PublicKey } = require('@solana/web3.js');

const TOKEN_PUBLIC_KEY = '4h26eponcR8jc3N3EuQZ72ZCpurpGoszvFgGiekTpump';
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

const tokenAccount = new PublicKey(TOKEN_PUBLIC_KEY);
const connection = new Connection('http://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

async function main(connection, accountPubkey) {
  console.log('Monitoring account changes for:', accountPubkey.toBase58());

  // Subscribe to account change events.
  connection.onAccountChange(
    accountPubkey,
    async (accountInfo, context) => {
      const changeTriggerTime = Math.floor(Date.now() / 1000);
      console.log(
        `Account change detected at slot ${context.slot} at ${new Date(changeTriggerTime * 1000).toISOString()}`,
      );

      // Because onAccountChange does not provide a signature,
      // we use getSignaturesForAddress to retrieve recent signatures.
      const sigs = await connection.getSignaturesForAddress(accountPubkey, { limit: 1 });
      if (sigs.length === 0) {
        console.log('No signature found in the history for this account change.');
        return;
      }

      const signature = sigs[0].signature;
      console.log('Latest signature from history:', signature);

      // Fetch transaction details to get the block time.
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx || !tx.blockTime) {
        console.log(`No valid block time available for transaction: ${signature}`);
        return;
      }

      console.log(`Transaction block time: ${new Date(tx.blockTime * 1000).toISOString()}`);
      console.log(
        `Time difference: ${changeTriggerTime - tx.blockTime} seconds (account change trigger vs transaction)`,
      );

      // Optionally, log some of the updated account data.
      console.log('Updated Account Data (raw bytes):', accountInfo.data);
    },
    'finalized',
  );
}

main(connection, tokenAccount).catch(console.error);
