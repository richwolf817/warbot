const { clusterApiUrl, Connection, PublicKey } = require('@solana/web3.js');
const { BorshCoder, EventParser } = require('@coral-xyz/anchor');
const IDL = require('./idl/raydium2.json');

const signature = '2zw9kZaF6ADLj8UYmpWGsGJ35CpBBP1dCSXUqp3NdDAqpDNcfyZBHr6N1tWgqRvyd1ZyafSZRAwi5syf3mD4Ta87';
const programId = new PublicKey('RaydFzxP1ch9DHcBZ7hL7ZjYr7rcGFwFwTjFzWBfZzN');

// Create a connection to mainnet-beta
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

const parseEvents = async () => {
  const transaction = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

  if (!transaction || !transaction.meta || !transaction.meta.logMessages) {
    console.error('No log messages found in the transaction');
    return;
  }

  console.log(transaction.meta.logMessages);

  const eventParser = new EventParser(programId, new BorshCoder(IDL));
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
