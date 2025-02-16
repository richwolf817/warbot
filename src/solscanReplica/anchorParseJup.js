const { clusterApiUrl, Connection, PublicKey } = require('@solana/web3.js');
const { sha256 } = require('@noble/hashes/sha256');
const { bs58 } = require('@coral-xyz/anchor/dist/cjs/utils/bytes');
const borsh = require('@coral-xyz/borsh');

const main = async () => {
  // REPLACE with a valid Raydium swap transaction signature from mainnet-beta.
  const signature = '3bSaEg71kkWDPtG94mn9bY8k2D7mABaqrQqL4F5JvzAEwukjqqwkjGhHBCb9fS5wVe1AG1J8i76ScKTZ59VGgJzt';

  let transaction;
  try {
    // Note: We’re not providing any extra options here.
    transaction = await connection.getParsedTransaction(signature);
  } catch (err) {
    console.error('Error fetching transaction:', err);
    return;
  }

  if (!transaction) {
    console.error('Transaction not found');
    return;
  }

  // Target Raydium AMM program ID (example; verify with current Raydium docs)
  const RaydiumProgram = new PublicKey('RVKd61ztZW9aFPf53S3fjGnGww7PdpE4kKSeXZ8nxGD');

  // Filter instructions that belong to the Raydium program.
  const raydiumIxs = transaction.transaction.message.instructions.filter((ix) => ix.programId.equals(RaydiumProgram));

  if (raydiumIxs.length === 0) {
    console.error('No Raydium instructions found in this transaction');
    return;
  }

  // For demonstration, assume that a Raydium swap instruction uses a discriminator.
  // (This is a guess based on PumpFun’s approach. Adjust as needed.)
  const swapDiscriminator = Buffer.from(sha256('global:swap').slice(0, 8));

  // Filter for instructions whose first 8 bytes match the assumed swap discriminator.
  const swapIxs = raydiumIxs.filter((ix) => {
    if (typeof ix.data !== 'string') return false;
    const dataBuffer = bs58.decode(ix.data);
    if (dataBuffer.length < 8) return false;
    const discriminator = dataBuffer.subarray(0, 8);
    return discriminator.equals(swapDiscriminator);
  });

  if (swapIxs.length === 0) {
    console.error('No swap instructions matching the discriminator were found.');
    return;
  }

  // Define a swap schema.
  // (This is just an example: here we assume the instruction encodes an 8-byte discriminator,
  // an 8-byte u64 for the input token amount, and an 8-byte u64 for the minimum output token amount.)
  const swapSchema = borsh.struct([borsh.u64('discriminator'), borsh.u64('amountIn'), borsh.u64('minAmountOut')]);

  // Process each matching swap instruction.
  for (let ix of swapIxs) {
    const ixDataArray = bs58.decode(ix.data);
    let decodedData;
    try {
      decodedData = swapSchema.decode(ixDataArray);
    } catch (error) {
      console.error('Failed to decode swap instruction data:', error);
      continue;
    }
    const amountIn = decodedData.amountIn.toString();
    const minAmountOut = decodedData.minAmountOut.toString();

    console.log('--------- Raydium Swap Data ------------');
    console.log(`Amount In: ${amountIn}`);
    console.log(`Minimum Amount Out: ${minAmountOut}`);

    // List all accounts involved in the instruction.
    console.log('Accounts involved:');
    ix.accounts.forEach((acc, idx) => {
      console.log(`  Index ${idx}: ${acc.toBase58 ? acc.toBase58() : acc}`);
    });
    console.log('\n');
  }
};

main();
