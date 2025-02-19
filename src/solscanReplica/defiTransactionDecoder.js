const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

/**
 * processRaydiumSwap extracts inner instruction details specific to a Raydium swap.
 * It iterates over inner instructions and, using a simple heuristic,
 * assigns the first encountered token transfer's amount as the SOL input and the second as the token output.
 *
 * @param {Object} tx - The parsed transaction object.
 * @returns {Object} An object with solInput and tokenOutput amounts (if found).
 */
function processRaydiumSwap(tx) {
  const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const swapDetails = { solInput: null, tokenOutput: null };

  if (tx.meta && tx.meta.innerInstructions) {
    for (const innerGroup of tx.meta.innerInstructions) {
      for (const ix of innerGroup.instructions) {
        if (
          ix.programId.toString() === tokenProgramId &&
          ix.parsed &&
          ix.parsed.type === 'transfer' &&
          ix.parsed.info &&
          ix.parsed.info.amount
        ) {
          // Using a simple heuristic: first transfer is SOL input, second is token output.
          if (swapDetails.solInput === null) {
            swapDetails.solInput = parseInt(ix.parsed.info.amount, 10);
          } else if (swapDetails.tokenOutput === null) {
            swapDetails.tokenOutput = parseInt(ix.parsed.info.amount, 10);
          }
        }
      }
    }
  }
  return swapDetails;
}

/**
 * Array mapping of known DeFi programs. Each object has:
 * - programId: The program's public key.
 * - process: An optional custom processing function.
 */
const knownDeFiPrograms = [
  { programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', process: null }, // Jupiter
  { programId: 'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN', process: null }, // Raydium (alternate)
  { programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', process: processRaydiumSwap }, // Raydium with custom processing
  { programId: 'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8', process: null }, // Orca
  { programId: 'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby', process: null }, // Saber
  { programId: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', process: null }, // Pump.fun
  { programId: '6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma', process: null }, // OXY
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

    // Combined detection: For each top-level instruction, check its programId and any inner instruction programIds.
    let dynamicProgramId;
    let idlItem = null;
    let customProcessor = null;
    const instructions = tx.transaction.message.instructions;

    for (let ixIndex = 0; ixIndex < instructions.length; ixIndex++) {
      const topIx = instructions[ixIndex];
      // Build an array of program IDs: top-level plus any inner instructions for this index.
      const programIdsToCheck = [topIx.programId.toString()];

      if (tx.meta && tx.meta.innerInstructions) {
        const innerGroup = tx.meta.innerInstructions.find((item) => item.index === ixIndex);
        if (innerGroup) {
          innerGroup.instructions.forEach((innerIx) => {
            programIdsToCheck.push(innerIx.programId.toString());
          });
        }
      }

      // Check each program ID against our knownDeFiPrograms array.
      for (const pid of programIdsToCheck) {
        const entry = knownDeFiPrograms.find((item) => item.programId === pid);
        if (entry) {
          idlItem = await getProgramIdl(pid);
          if (idlItem) {
            dynamicProgramId = pid;
            customProcessor = entry.process;
            break;
          }
        }
      }
      if (dynamicProgramId) break;
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

    // Decode top-level instructions belonging to the dynamic program.
    instructions.forEach((ix, index) => {
      if (ix.programId.toString() === dynamicProgramId) {
        try {
          const decoded = instructionParser.parseInstructions(ix.data);
          console.log(`Decoded top-level instruction ${index}:`, decoded);
        } catch (err) {
          console.error(`Error decoding top-level instruction ${index}:`, err);
        }
      }
    });

    // Decode inner instructions for the dynamic program.
    if (tx.meta && tx.meta.innerInstructions) {
      tx.meta.innerInstructions.forEach((inner, innerIdx) => {
        inner.instructions.forEach((ix, ixIdx) => {
          if (ix.programId.toString() === dynamicProgramId) {
            try {
              const decoded = instructionParser.parseInstructions(ix.data);
              console.log(`Decoded inner instruction [${innerIdx}][${ixIdx}]:`, decoded);
            } catch (err) {
              console.error(`Error decoding inner instruction [${innerIdx}][${ixIdx}]:`, err);
            }
          }
        });
      });
    }

    // If the detected program has an associated processing function, run it.
    if (typeof customProcessor === 'function') {
      const details = customProcessor(tx);
      console.log('Custom processing details:', details);
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
