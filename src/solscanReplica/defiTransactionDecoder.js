const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

const signature = 'dYpVRwfeR1iQF1rE7q26e3FM8AU8ecKoQ6AaabxkV6SqaaJvkyjBPuNLvsYHpuLEtCEiaeEw46MonupHysT3h6N';
/**
 * processRaydiumSwap extracts inner instruction details specific to a Raydium swap.
 * It iterates over inner instructions and, using a simple heuristic,
 * returns the second token transfer amount as expect_amount_out.
 *
 * @param {Object} tx - The parsed transaction object.
 * @returns {Object} An object with expect_amount_out (if found).
 */
function processRaydiumSwap(tx) {
  const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const swapDetails = { expect_amount_out: null };
  let transferCount = 0;

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
          transferCount++;
          // Only record the second token transfer as expect_amount_out.
          if (transferCount === 2) {
            swapDetails.expect_amount_out = parseFloat(ix.parsed.info.amount);
            break;
          }
        }
      }
      if (transferCount === 2) break;
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
