const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaFMParser, checkIfInstructionParser, ParserType } = require('@solanafm/explorer-kit');
const { getProgramIdl } = require('@solanafm/explorer-kit-idls');

const TOKEN = '4MpXgiYj9nEvN1xZYZ4qgB6zq5r2JMRy54WaQu5fpump';
const signature = 'CZmTpPMMwkfsQ82jnJBEGttsQrcpdDvyA8uzGByGsuy7tLbyznMK5bbjE97VMRVqWtUmue2rttwvY88yETDafUh';

// Known DeFi program IDs (each entry is now just a string for simplicity)
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

(async () => {
  try {
    // Fetch the transaction.
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
      console.error('Transaction not found for signature:', signature);
      return;
    }

    // Determine the dynamic DeFi program ID by checking both top-level and inner instructions.
    let dynamicProgramId;
    let idlItem = null;
    const instructions = tx.transaction.message.instructions;
    for (let ixIndex = 0; ixIndex < instructions.length; ixIndex++) {
      const topIx = instructions[ixIndex];
      // Gather program IDs from the top-level instruction and its corresponding inner instructions.
      const programIdsToCheck = [topIx.programId.toString()];
      if (tx.meta && tx.meta.innerInstructions) {
        const innerGroup = tx.meta.innerInstructions.find((item) => item.index === ixIndex);
        if (innerGroup) {
          innerGroup.instructions.forEach((innerIx) => {
            programIdsToCheck.push(innerIx.programId.toString());
          });
        }
      }
      // Check if any program ID is in our known list.
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

    // The first transfer is from Sol-TOKEN Pool 1 (SOL amount) and the second is from Pool 2 (TOKEN amount).
    const solTransfer = transferInstructions[0];
    const tokenTransfer = transferInstructions[1];

    // Extract the amounts (assumes the decoded instruction has an `args.amount` property).
    const solAmount = solTransfer.args && solTransfer.args.amount;
    const tokenAmount = tokenTransfer.args && tokenTransfer.args.amount;

    // Extract pool addresses – assuming they are available in the decoded instruction's accounts.
    // For the SOL transfer, we assume the pool address is the destination.
    // For the TOKEN transfer, we assume the pool address is the source.
    const pool1Address = solTransfer.accounts ? solTransfer.accounts.destination : 'Unknown';
    const pool2Address = tokenTransfer.accounts ? tokenTransfer.accounts.source : 'Unknown';

    console.log('DefiProgram(Sol-TOKEN) Pool 1 Address:', pool1Address);
    console.log('DefiProgram(Sol-TOKEN) Pool 2 Address:', pool2Address);
    console.log(`Swapping SOL amount: ${solAmount}, TOKEN amount: ${tokenAmount}`);
  } catch (err) {
    console.error('Error:', err);
  }
})();
