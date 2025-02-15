const { Connection, PublicKey, SystemInstruction } = require('@solana/web3.js');

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});
async function getHumanReadableTransaction(signature) {
  try {
    console.log(`Fetching transaction: ${signature}...`);

    const tx = await connection.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      console.log('Transaction not found.');
      return;
    }

    console.log('\n=== Transaction Details ===');
    console.log(`🔹 Block Time: ${new Date(tx.blockTime * 1000).toISOString()}`);
    console.log(`🔹 Recent Blockhash: ${tx.transaction.message.recentBlockhash}`);
    console.log(`🔹 Fee Payer: ${tx.transaction.message.accountKeys[0].pubkey.toString()}`);
    console.log(`🔹 Fee: ${tx.meta.fee / 1_000_000_000} SOL`);
    console.log(`🔹 Success: ${tx.meta.err ? '❌ Failed' : '✅ Success'}`);

    console.log('\n=== Accounts Used ===');
    tx.transaction.message.accountKeys.forEach((key, index) => {
      console.log(`  [${index}] ${key.pubkey.toString()} (Signer: ${key.signer}, Writable: ${key.writable})`);
    });

    console.log('\n=== Instructions ===');

    for (let [index, ix] of tx.transaction.message.instructions.entries()) {
      console.log(`\n🔹 Instruction ${index + 1}:`);
      console.log(`   Program ID: ${ix.programId.toString()}`);

      if (ix.programId.toString() === '11111111111111111111111111111111') {
        console.log('   ➡️ System Transfer Detected');
        try {
          const transferInfo = SystemInstruction.decodeTransfer(ix);
          console.log(`   - From: ${transferInfo.fromPubkey.toString()}`);
          console.log(`   - To: ${transferInfo.toPubkey.toString()}`);
          console.log(`   - Amount: ${transferInfo.lamports / 1_000_000_000} SOL`);
        } catch (e) {
          console.log('   ⚠️ Error decoding transfer:', e.message);
        }
      } else if (ix.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        console.log('   🏦 SPL Token Transfer Detected');
        if (ix.parsed) {
          console.log(`   - From: ${ix.parsed.info.source}`);
          console.log(`   - To: ${ix.parsed.info.destination}`);
          console.log(`   - Token Amount: ${ix.parsed.info.amount}`);
        }
      } else if (ix.programId.toString() === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
        console.log('   💱 Jupiter Swap Detected');
        if (ix.parsed) {
          console.log(`   - Input Mint: ${ix.parsed.info.inputMint}`);
          console.log(`   - Output Mint: ${ix.parsed.info.outputMint}`);
          console.log(`   - Amount: ${ix.parsed.info.inputAmount} → ${ix.parsed.info.outputAmount}`);
        }
      } else if (ix.programId.toString() === '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P') {
        console.log('   🚀 Pump.fun Transaction Detected');
        console.log(`   - Raw Data: ${ix.data}`);
      } else {
        console.log('   ⚠️ Unknown Program Interaction');
        console.log(`   - Raw Data: ${ix.data}`);
      }
    }

    console.log('\n=== End of Transaction ===');
  } catch (error) {
    console.error('❌ Error fetching transaction:', error.message);
  }
}

// Run with a sample transaction
const sampleSignature = 'Z8czb1RprvwtF83UGX6s7Hyb8fB9Ku1NFL9NQF1KbJ85KGrLFzKViFarrSrio9NxJQXfdUuujeFLohY63BxpD2K'; // Replace with a real transaction
getHumanReadableTransaction(sampleSignature);
