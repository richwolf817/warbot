const { clusterApiUrl, Connection, PublicKey } = require('@solana/web3.js');
const { BorshCoder, EventParser } = require('@coral-xyz/anchor');
const JupiterIDL = require('./idl/jupiter.json');

const parseJupiterEvents = async () => {
  // Use the provided Jupiter transaction signature
  const txSignature = '5zgvxQjV6BisU8SfahqasBZGfXy5HJ3YxYseMBG7VbR4iypDdtdymvE1jmEMG7G39bdVBaHhLYUHUejSTtuZEpEj';

  // Jupiter program ID (from the Jupiter aggregator)
  const JupiterProgram = new PublicKey('JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo');

  // Use the original connection approach (mainnet-beta via clusterApiUrl)
  const connection = new Connection(clusterApiUrl('mainnet-beta'));

  // Fetch the parsed transaction with log messages
  const transaction = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
  if (!transaction || !transaction.meta || !transaction.meta.logMessages) {
    console.error('No log messages found in the transaction');
    return;
  }

  try {
    // Instantiate the EventParser with the Jupiter program and its IDL
    const eventParser = new EventParser(JupiterProgram, new BorshCoder(JupiterIDL));
    const events = eventParser.parseLogs(transaction.meta.logMessages);

    // Iterate over each event and log its data
    events.forEach((event, index) => {
      console.log(`Event ${index}:`, event);
      console.log('--------- Jupiter Event Data ------------');
      console.log(JSON.stringify(event.data, null, 2));
    });
  } catch (e) {
    console.error('Error parsing Jupiter events:', e);
  }
};

parseJupiterEvents();
