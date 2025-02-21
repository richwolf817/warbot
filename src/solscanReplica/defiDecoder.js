const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');
const { tokenIndexing } = require('./tokenIndex');

const knownDeFiPrograms = [
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  'RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  'OrcaWXYk8k9uZhYszx7bHpRhP28u3tQkbXX1ovA7bR8',
  'SaberwzqU3dR2WtG3RhfGr3mbdoRXMu66nfrq4h6bHby',
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  '6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma',
];

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

/**
 * Processes a DeFi transaction signature by parsing the inner instructions,
 * indexing tokens using the parent token and inner instruction details,
 * and returning the DeFi transaction data.
 *
 * @param {string} signature - The transaction signature.
 * @param {string} parentToken - The parent token passed from tokenHistory.js.
 * @returns {object|null} - An object containing DeFi transaction data or null if an error occurs.
 */
async function defiTransaction(signature, parentToken) {
  try {
    // Fetch the transaction details.
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
      console.error('Transaction not found for signature:', signature);
      return null;
    }

    // Determine the dynamic DeFi program ID by checking top-level and inner instructions.
    let dynamicProgramId;
    let idlItem = null;
    const instructions = tx.transaction.message.instructions;
    for (let ixIndex = 0; ixIndex < instructions.length; ixIndex++) {
      const topIx = instructions[ixIndex];
      const programIdsToCheck = [topIx.programId.toString()];
      if (tx.meta && tx.meta.innerInstructions) {
        const innerGroup = tx.meta.innerInstructions.find((item) => item.index === ixIndex);
        if (innerGroup) {
          innerGroup.instructions.forEach((innerIx) => {
            programIdsToCheck.push(innerIx.programId.toString());
          });
        }
      }
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
      return null;
    }
    console.log('Using program ID:', dynamicProgramId);

    // Initialize the parser with the fetched IDL.
    const parser = new SolanaFMParser(idlItem, dynamicProgramId);
    const instructionParser = parser.createParser(ParserType.INSTRUCTION);
    if (!instructionParser || !checkIfInstructionParser(instructionParser)) {
      console.error('Failed to create a valid instruction parser');
      return null;
    }

    console.log('Inner Instructions:', JSON.stringify(tx.meta.innerInstructions, null, 2));

    // Search inner instructions for "transfer" type instructions.
    const transferInstructions = [];
    if (tx.meta && tx.meta.innerInstructions) {
      tx.meta.innerInstructions.forEach((innerGroup) => {
        innerGroup.instructions.forEach((ix) => {
          if (ix.programId.toString() === dynamicProgramId) {
            try {
              const decoded = instructionParser.parseInstructions(ix.data);
              if (decoded && decoded.name === 'transfer') {
                transferInstructions.push(decoded);
              }
            } catch (err) {
              console.error('Error decoding inner instruction:', err);
            }
          }
        });
      });
    }

    // Ensure we have at least two transfer instructions.
    if (transferInstructions.length < 2) {
      console.error('Not enough transfer instructions found.');
      return null;
    }

    // Label the transfers as TransferOut (sender) and TransferIn (receiver).
    const transferOutIx = transferInstructions[0];
    const transferInIx = transferInstructions[1];

    // Extract pool addresses:
    // For TransferOut, assume the pool address is the source (sender).
    // For TransferIn, assume the pool address is the destination (receiver).
    const transferOutAddress = transferOutIx.accounts ? transferOutIx.accounts.source : 'Unknown';
    const transferInAddress = transferInIx.accounts ? transferInIx.accounts.destination : 'Unknown';

    // Use tokenIndexing with the respective pool address, the parent token, and the decoded instruction details.
    const transferOutData = await tokenIndexing(transferOutAddress, parentToken, transferOutIx);
    const transferInData = await tokenIndexing(transferInAddress, parentToken, transferInIx);

    // Extract the transfer amounts from each instruction.
    const transferOutAmount = transferOutIx.args && transferOutIx.args.amount;
    const transferInAmount = transferInIx.args && transferInIx.args.amount;

    console.log(`Transfer Out amount: ${transferOutAmount}, Transfer In amount: ${transferInAmount}`);

    // Return the defi transaction data.
    return {
      signature,
      dynamicProgramId,
      transferOutAddress,
      transferInAddress,
      transferOutAmount,
      transferInAmount,
      transferOutData,
      transferInData,
    };
  } catch (err) {
    console.error('Error in defiTransaction:', err);
    return null;
  }
}

module.exports = {
  defiTransaction,
};
