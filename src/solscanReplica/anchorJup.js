// singleTransactionParser.js

// Use the new Anchor package
const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const idl = require('./idl/jupiter.json');

// ----------------------------------------------------------------------------
// Set up the RPC connection with a session hash header for Helius
// ----------------------------------------------------------------------------
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

// For read-only operations, create a dummy wallet.
const dummyWallet = new anchor.Wallet(Keypair.generate());

// Create an AnchorProvider with the connection and dummy wallet.
const provider = new anchor.AnchorProvider(connection, dummyWallet, {
  commitment: 'confirmed',
});
anchor.setProvider(provider);

// ----------------------------------------------------------------------------
// Create the Program instance using the Jupiter IDL and program ID
// ----------------------------------------------------------------------------

// Jupiter program ID on Solana (from the Jupiter aggregator)
const programId = new PublicKey('JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo');

// Create the Anchor Program instance.
const program = new anchor.Program(idl, programId, provider);

// ----------------------------------------------------------------------------
// Transaction Parsing: Fetch and decode a Jupiter transaction
// ----------------------------------------------------------------------------

// Jupiter transaction signature (found via Solana Explorer or scans)
const txSignature = '5zgvxQjV6BisU8SfahqasBZGfXy5HJ3YxYseMBG7VbR4iypDdtdymvE1jmEMG7G39bdVBaHhLYUHUejSTtuZEpEj';

async function parseJupiterTransaction() {
  try {
    // Fetch the transaction details from the RPC
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
    });
    if (!tx) {
      console.error('Transaction not found');
      return;
    }
    console.log('Fetched Transaction:', tx);

    // Extract instructions and account keys from the transaction message
    const instructions = tx.transaction.message.instructions;
    const accountKeys = tx.transaction.message.accountKeys;

    // Filter for instructions that belong to the Jupiter program
    const jupiterInstructions = instructions.filter((ix) => {
      const ixProgramId = accountKeys[ix.programIdIndex];
      return ixProgramId.equals(programId);
    });
    console.log(`Found ${jupiterInstructions.length} instruction(s) for the Jupiter program.\n`);

    // Iterate over each Jupiter instruction and attempt to decode it.
    for (let i = 0; i < jupiterInstructions.length; i++) {
      const ix = jupiterInstructions[i];

      // Convert the base64-encoded instruction data into a Buffer
      const dataBuffer = Buffer.from(ix.data, 'base64');

      // Extract the observed discriminator (first 8 bytes) as a hex string
      const observedDisc = dataBuffer.slice(0, 8).toString('hex');
      console.log(`Instruction ${i}:`);
      console.log(`Observed Discriminator: ${observedDisc}`);

      try {
        // Decode the instruction using Anchor's coder.
        const decoded = program.coder.instruction.decode(dataBuffer);
        console.dir(decoded, { depth: null });
      } catch (error) {
        console.error(`Error decoding instruction ${i}:`, error);
        console.log(`Raw data (hex): ${dataBuffer.toString('hex')}`);
      }
      console.log('-------------------------------------\n');
    }
  } catch (err) {
    console.error('Error fetching or parsing transaction:', err);
  }
}

// Execute the transaction parser
parseJupiterTransaction();
