const fs = require('fs');
const anchor = require('@project-serum/anchor');
const { PublicKey, Keypair } = require('@solana/web3.js');
const connection = require('./solanaWeb');

// Determine the wallet path: use ANCHOR_WALLET env variable if set, otherwise use a default path.
const walletPath = process.env.ANCHOR_WALLET || '/Users/richardwolf/.config/solana/id.json';

// Load the wallet keypair from the file.
const walletKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));
const wallet = new anchor.Wallet(walletKeypair);

// Create an Anchor provider using the shared connection and the loaded wallet.
const provider = new anchor.AnchorProvider(connection, wallet, {});
anchor.setProvider(provider);

/**
 * Fetches the on-chain IDL for the given program ID.
 *
 * @param {PublicKey} programId - The program ID for which to fetch the IDL.
 * @returns {Promise<Object>} - The fetched IDL.
 */
async function fetchIdl(programId) {
  try {
    // Use Anchor's built-in method to fetch the on-chain IDL.
    const idl = await anchor.Program.fetchIdl(programId, provider);
    console.log('Fetched IDL:', idl);
    return idl;
  } catch (err) {
    console.error('Error fetching IDL:', err);
    throw err;
  }
}

module.exports = {
  fetchIdl,
};
