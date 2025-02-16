const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

// DeFi Program IDs
const knownDeFiPrograms = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN', // Raydium
  'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8', // Orca
  'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby', // Saber
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
  'Gy4r2wzguhhqqRRhcQV2wU6maxCLEtAR9zNSQt3iBPQP',
];

const signature = '3Gjt5nRdfKLBky8uxaWXmdwftYss5kFgEhe9TwYjMSRG1LeNfgXuVM2BaNjCne3dSHYNXyLNXVLdJpbta9fcfF8Z';

// Create a connection to mainnet-beta
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

(async () => {
  try {
    // Fetch the transaction using the provided signature.
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
      console.error('Transaction not found for signature:', signature);
      return;
    }

    // Loop through instructions and look for one from a known DeFi program.
    let dynamicProgramId;
    let idlItem = null;
    for (const ix of tx.transaction.message.instructions) {
      const currentProgramId = ix.programId.toString();
      if (!knownDeFiPrograms.includes(currentProgramId)) continue;
      idlItem = await getProgramIdl(currentProgramId);
      if (idlItem) {
        dynamicProgramId = currentProgramId;
        break;
      }
    }

    if (!dynamicProgramId) {
      console.error('No instructions from known DeFi programs with a valid IDL were found in this transaction.');
      return;
    }

    console.log('Using program ID:', dynamicProgramId);

    // Initialize the parser with the fetched IDL.
    const parser = new SolanaFMParser(idlItem, dynamicProgramId);
    const instructionParser = parser.createParser(ParserType.INSTRUCTION);

    if (!instructionParser || !checkIfInstructionParser(instructionParser)) {
      console.error('Failed to create a valid instruction parser');
      return;
    }

    // Filter the transaction's instructions to those belonging to the dynamic program.
    const filteredIxs = tx.transaction.message.instructions.filter((ix) => {
      return ix.programId.toString() === dynamicProgramId;
    });

    if (filteredIxs.length === 0) {
      console.error('No instructions from the dynamic program were found in this transaction.');
      return;
    }

    // Decode each instruction using the instruction parser.
    filteredIxs.forEach((ix, index) => {
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
