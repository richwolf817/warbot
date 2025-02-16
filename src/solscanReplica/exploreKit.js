const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

const programId = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const signature = '4XQZckrFKjaLHM68kJH7dpSPo2TCfMkwjYhLdcNRu5QdJTjAEehsS5UMaZKDXADD46d8v4XnuyuvLV36rNRTKhn7';

// Create a connection to mainnet-beta
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

(async () => {
  try {
    // Fetch the IDL for the Jupiter program.
    const idlItem = await getProgramIdl(programId);
    if (!idlItem) {
      console.error('Failed to fetch the IDL for program:', programId);
      return;
    }

    // Initialize the parser with the fetched IDL.
    const parser = new SolanaFMParser(idlItem, programId);
    const instructionParser = parser.createParser(ParserType.INSTRUCTION);

    if (!instructionParser || !checkIfInstructionParser(instructionParser)) {
      console.error('Failed to create a valid instruction parser');
      return;
    }

    // Fetch the transaction using the provided signature.
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
      console.error('Transaction not found for signature:', txSignature);
      return;
    }

    // Filter the transaction's instructions to those belonging to the Jupiter program.
    const jupiterIxs = tx.transaction.message.instructions.filter((ix) => {
      // For parsed transactions, programId is an object with a toString() method.
      return ix.programId.toString() === programId;
    });

    if (jupiterIxs.length === 0) {
      console.error('No instructions from the Jupiter program were found in this transaction.');
      return;
    }

    // For each Jupiter instruction, use the instruction parser to decode the instruction data.
    jupiterIxs.forEach((ix, index) => {
      const ixData = ix.data; // assumed to be a base58 encoded string
      try {
        const decoded = instructionParser.parseInstructions(ixData);
        console.log(`Decoded instruction ${index}:`, decoded);
      } catch (err) {
        console.error(`Error decoding instruction ${index}:`, err);
      }
    });
  } catch (err) {
    console.error('Error:', err);
  }
})();
