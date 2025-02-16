const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

// DeFi Program IDs
const knownDeFiPrograms = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN', // Raydium
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', //Raydium
  'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8', // Orca
  'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby', // Saber
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', //Metro
  'E6YoRP3adE5XYneSseLee15wJshDxCsmyD2WtLvAmfLi', // Mev Bot
];

const signature = '3bNuZekCkZrAps7MPx3mfRGvHgZyVoK3CHT325x4UrNbSxvdHXYYk3YB3F4Sav7Vyyw9snLG3tutd4nUTTGdXbZh';

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

    console.log(tx.transaction.message.instructions);

    // Find a known DeFi program instruction (top-level) with a valid IDL.
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

    // Filter top-level instructions to those belonging to the dynamic program.
    const filteredIxs = tx.transaction.message.instructions.filter((ix) => {
      return ix.programId.toString() === dynamicProgramId;
    });

    if (filteredIxs.length === 0) {
      console.error('No instructions from the dynamic program were found in this transaction.');
      return;
    }

    // Decode each top-level instruction using the instruction parser.
    filteredIxs.forEach((ix, index) => {
      const ixData = ix.data; // assumed to be a base58 encoded string
      try {
        const decoded = instructionParser.parseInstructions(ixData);
        console.log(`Decoded top-level instruction ${index}:`, decoded);
      } catch (err) {
        console.error(`Error decoding top-level instruction ${index}:`, err);
      }
    });

    // Optionally, if you need to process inner instructions, apply the same filter:
    if (tx.meta && tx.meta.innerInstructions) {
      tx.meta.innerInstructions.forEach((inner, innerIdx) => {
        inner.instructions.forEach((ix, ixIdx) => {
          const innerProgramId = ix.programId.toString();
          if (!knownDeFiPrograms.includes(innerProgramId)) return;
          try {
            const decoded = instructionParser.parseInstructions(ix.data);
            console.log(`Decoded inner instruction [${innerIdx}][${ixIdx}]:`, decoded);
          } catch (err) {
            console.error(`Error decoding inner instruction [${innerIdx}][${ixIdx}]:`, err);
          }
        });
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
