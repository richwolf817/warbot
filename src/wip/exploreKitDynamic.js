const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

// DeFi Program IDs
const knownDeFiPrograms = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN', // Raydium
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
  'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8', // Orca
  'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby', // Saber
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
  '6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma',
];

const signature = '3v2ruc7w7N2o6GnJBRrL7N4Nvc7cphXHRoThp1EjeMRbqabxxksWSmH5wen9nBTsoRJ59kKiYmu3DWkGK7u7hks8';

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

    // Combined detection: for each top-level instruction, check its programId as well as any inner instruction programIds.
    let dynamicProgramId;
    let idlItem = null;
    const instructions = tx.transaction.message.instructions;

    for (let ixIndex = 0; ixIndex < instructions.length; ixIndex++) {
      const topIx = instructions[ixIndex];
      // Start with the top-level programId...
      const programIdsToCheck = [topIx.programId.toString()];

      // ...and add inner instruction programIds (if any) associated with this top-level index.
      if (tx.meta && tx.meta.innerInstructions) {
        const innerGroup = tx.meta.innerInstructions.find((item) => item.index === ixIndex);
        if (innerGroup) {
          innerGroup.instructions.forEach((innerIx) => {
            programIdsToCheck.push(innerIx.programId.toString());
          });
        }
      }

      // Check each programId for a known DeFi program with a valid IDL.
      for (const pid of programIdsToCheck) {
        if (knownDeFiPrograms.includes(pid)) {
          idlItem = await getProgramIdl(pid);
          if (idlItem) {
            dynamicProgramId = pid;
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

    // Decode top-level instructions from the dynamic program.
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

    // Decode inner instructions belonging to the dynamic program.
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
  } catch (err) {
    console.error('Error:', err);
  }
})();
