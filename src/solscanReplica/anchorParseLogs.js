const { clusterApiUrl, Connection, PublicKey } = require('@solana/web3.js');
const { BorshCoder, EventParser } = require('@coral-xyz/anchor');
const PumpFunIDL = require('./idl/pumpfun.json');

const parseEvents = async () => {
  const signature = '4XQZckrFKjaLHM68kJH7dpSPo2TCfMkwjYhLdcNRu5QdJTjAEehsS5UMaZKDXADD46d8v4XnuyuvLV36rNRTKhn7';
  const PumpFunProgram = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
  const connection = new Connection(clusterApiUrl('mainnet-beta'));
  const transaction = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

  if (!transaction || !transaction.meta || !transaction.meta.logMessages) {
    console.error('No log messages found in the transaction');
    return;
  }

  const eventParser = new EventParser(PumpFunProgram, new BorshCoder(PumpFunIDL));
  const events = eventParser.parseLogs(transaction.meta.logMessages);

  for (let event of events) {
    console.log('--------- Trade Event Data ------------');
    console.log(
      `solAmount: ${event.data.solAmount}\ntokenAmount: ${event.data.tokenAmount}\ntype: ${
        event.data.isBuy ? 'buy' : 'sell'
      }\nmint: ${event.data.mint}\ntrader: ${event.data.user}\n`,
    );
  }
};

parseEvents();
