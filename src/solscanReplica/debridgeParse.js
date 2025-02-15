// singleTransactionParser.js

const { Connection, PublicKey } = require('@solana/web3.js');
const { SolanaParser } = require('@debridge-finance/solana-transaction-parser');
const JupiterIdl = require('./idl/jupiter.json');

// RPC endpoint (you can change this as needed)
const rpcUrl = 'https://jupiter.genesysgo.net';
const connection = new Connection(rpcUrl, 'confirmed');

// Jupiter program ID on Solana
const programId = new PublicKey('JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo');

// Initialize the parser with the Jupiter IDL and program ID
const parser = new SolanaParser([{ idl: JupiterIdl, programId }]);

// The transaction signature you want to parse
const txSignature = '5zgvxQjV6BisU8SfahqasBZGfXy5HJ3YxYseMBG7VbR4iypDdtdymvE1jmEMG7G39bdVBaHhLYUHUejSTtuZEpEj';

async function parseSingleTransaction() {
  try {
    // Fetch the transaction details from the RPC.
    // Note: getTransaction returns a confirmed transaction object.
    const tx = await connection.getTransaction(txSignature, { commitment: 'confirmed' });
    if (!tx) {
      throw new Error('Transaction not found');
    }

    // Use the parser's "parse" method on the fetched transaction object.
    const parsedInstructions = parser.parse(tx);
    console.log('Parsed Transaction Instructions:');
    console.log(parsedInstructions);

    // Optionally, find a specific instruction by its name (e.g., "tokenSwap")
    const tokenSwapInstruction = parsedInstructions.find((instr) => instr.name === 'tokenSwap');
    if (tokenSwapInstruction) {
      console.log('\nFound tokenSwap Instruction:');
      console.log(tokenSwapInstruction);
    } else {
      console.log('\nNo tokenSwap instruction found in this transaction.');
    }
  } catch (error) {
    console.error('Error parsing transaction:', error);
  }
}

// Execute the function
parseSingleTransaction();
