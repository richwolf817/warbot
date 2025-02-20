const { Connection, PublicKey } = require('@solana/web3.js');

// Create a connection to mainnet-beta using Helius
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

// Replace with the token mint address you are searching for
const mintToken = new PublicKey('4MpXgiYj9nEvN1xZYZ4qgB6zq5r2JMRy54WaQu5fpump'); // Example token
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL mint address

// Raydium AMM program (ensure this is the correct program ID for the liquidity pools you are targeting)
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey('RVKd61ztZW9qCkrG4ByE8nwx9kp7JBLYrJrV5EfpKkq');

async function findSolPools(mintToken) {
  try {
    // Add a filter for the expected account size.
    // For Raydium V4 liquidity pool state, the size is often 424 bytes.
    const filters = [{ dataSize: 424 }];
    const accounts = await connection.getProgramAccounts(RAYDIUM_AMM_PROGRAM_ID, {
      commitment: 'confirmed',
      filters, // Remove or adjust if necessary
    });

    console.log(`Fetched ${accounts.length} accounts with filter:`, filters);
    const pools = [];

    for (const account of accounts) {
      const data = account.account.data;
      if (data.length < 100) continue; // Skip if data is too small to be a pool

      // Extract the base and quote mint addresses from the binary data.
      // These offsets assume that the account structure starts with an 8-byte discriminator,
      // followed by the base mint (32 bytes) and quote mint (32 bytes).
      const baseMint = new PublicKey(data.slice(8, 40));
      const quoteMint = new PublicKey(data.slice(40, 72));

      console.log(
        'Pool account:',
        account.pubkey.toBase58(),
        'Base:',
        baseMint.toBase58(),
        'Quote:',
        quoteMint.toBase58(),
      );

      // Check if SOL is paired with the given mint token
      if (
        (baseMint.equals(SOL_MINT) && quoteMint.equals(mintToken)) ||
        (quoteMint.equals(SOL_MINT) && baseMint.equals(mintToken))
      ) {
        pools.push({
          poolAddress: account.pubkey.toBase58(),
          baseMint: baseMint.toBase58(),
          quoteMint: quoteMint.toBase58(),
        });
      }
    }

    if (pools.length === 0) {
      console.log('No SOL pools found for this token.');
    } else {
      console.log('Found SOL pools:', pools);
    }
  } catch (error) {
    console.error('Error fetching pools:', error);
  }
}

// Run the function
findSolPools(mintToken);
