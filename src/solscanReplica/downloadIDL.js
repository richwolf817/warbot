const fs = require('fs');
const anchor = require('@project-serum/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');

// Create a connection with a session hash for debugging purposes.
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

// Determine the wallet path: use ANCHOR_WALLET env variable if set, otherwise use a default path.
const walletPath = process.env.ANCHOR_WALLET || '/Users/richardwolf/.config/solana/id.json';

// Load the wallet keypair from the file.
const walletKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));
const wallet = new anchor.Wallet(walletKeypair);

// Create an Anchor provider using the connection and the loaded wallet.
const provider = new anchor.AnchorProvider(connection, wallet, {});
anchor.setProvider(provider);

// Define the program ID for which to fetch the IDL.
const programId = new PublicKey('JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo');

async function fetchIdl(programId) {
  try {
    // Use Anchor's built-in method to fetch the on-chain IDL.
    const idl = await anchor.Program.fetchIdl(programId, provider);
    console.log('Fetched IDL:', idl);
  } catch (err) {
    console.error('Error fetching IDL:', err);
  }
}

fetchIdl(programId).catch(console.error);
