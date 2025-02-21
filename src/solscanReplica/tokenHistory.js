const fs = require('fs');
const { parse } = require('json2csv');
const { Connection, PublicKey } = require('@solana/web3.js');

// --- CONFIGURATION ---
const SOLANA_RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Token mint to verify
const tokenMint = new PublicKey('BfDpV7aCQti9Q92gHe7cuSFnPZ5gVtA6WbCx8SrfK94n');

(async () => {
  async function getTransactionsForAddress(address) {
    try {
      console.log('⏳ Fetching transactions...');

      const ma = mintAccount instanceof PublicKey ? mintAccount : new PublicKey(mintAccount);
      const tx = await connection.getSignaturesForAddress(matchMedia, {
        limit: 1000,
      });
      // Extract signature strings
      const signatures = signaturesInfo.map((tx) => tx.signature);

      // Ensure we have valid signatures before making the request
      if (signatures.length === 0) {
        console.log('⚠️ No transactions found for this address.');
        return [];
      }

      return transactions;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
    }
  }

  getTransactionsForAddress(tokenMint);
})();
