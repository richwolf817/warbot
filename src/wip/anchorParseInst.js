const { clusterApiUrl, Connection, PublicKey } = require('@solana/web3.js');
const { sha256 } = require('@noble/hashes/sha256');
const { bs58 } = require('@coral-xyz/anchor/dist/cjs/utils/bytes');
const borsh = require('@coral-xyz/borsh');

const main = async () => {
  const signature = '4XQZckrFKjaLHM68kJH7dpSPo2TCfMkwjYhLdcNRu5QdJTjAEehsS5UMaZKDXADD46d8v4XnuyuvLV36rNRTKhn7';
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  const transaction = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

  if (!transaction) {
    console.error('Transaction not found');
    return;
  }

  // Target program ID
  const PumpFunProgram = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

  // Filter instructions that belong to the PumpFun program.
  const pumpIxs = transaction.transaction.message.instructions.filter((ix) => ix.programId.equals(PumpFunProgram));

  // Create the discriminators for 'buy' and 'sell'.
  const buyDiscriminator = Buffer.from(sha256('global:buy').slice(0, 8));
  const sellDiscriminator = Buffer.from(sha256('global:sell').slice(0, 8));

  // Filter for instructions whose first 8 bytes (discriminator) match buy or sell.
  const buySellIxs = pumpIxs.filter((ix) => {
    if (typeof ix.data !== 'string') return false;
    const dataBuffer = bs58.decode(ix.data);
    const discriminator = dataBuffer.subarray(0, 8);
    return discriminator.equals(buyDiscriminator) || discriminator.equals(sellDiscriminator);
  });

  // Define the trade schema.
  const tradeSchema = borsh.struct([borsh.u64('discriminator'), borsh.u64('amount'), borsh.u64('solAmount')]);

  // Process each matching instruction.
  for (let ix of buySellIxs) {
    const ixDataArray = bs58.decode(ix.data);
    const decodedData = tradeSchema.decode(ixDataArray);
    const discriminatorBytes = ixDataArray.subarray(0, 8);
    const type = discriminatorBytes.equals(buyDiscriminator) ? 'buy' : 'sell';
    const tokenAmount = decodedData.amount.toString();

    // Adjust account indices as needed for your program.
    const mint = ix.accounts[2].toBase58();
    const trader = ix.accounts[6].toBase58();

    // Use the bonding curve account (assumed at index 3) to calculate the SOL amount.
    const bondingCurve = ix.accounts[3];
    const accountKeys = transaction.transaction.message.accountKeys;
    const index = accountKeys.findIndex((keyObj) => keyObj.pubkey.equals(bondingCurve));
    if (index === -1) {
      console.error('Bonding curve account not found in account keys');
      continue;
    }
    const preBalances = transaction.meta.preBalances || [];
    const postBalances = transaction.meta.postBalances || [];
    const solAmount = Math.abs(preBalances[index] - postBalances[index]);

    console.log('--------- Trade Data ------------');
    console.log(`solAmount: ${solAmount}`);
    console.log(`tokenAmount: ${tokenAmount}`);
    console.log(`type: ${type}`);
    console.log(`mint: ${mint}`);
    console.log(`trader: ${trader}\n`);
  }
};

main();
