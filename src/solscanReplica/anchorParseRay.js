const { PublicKey, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { SolanaParser } = require('@debridge-finance/solana-transaction-parser');
const RaydiumIDL = require('./idl/raydium.json');

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2', {
  wsEndpoint: 'wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2',
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

const txParser = new SolanaParser([
  {
    idl: RaydiumIDL,
    programId: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  },
]);

async function main() {
  try {
    const parsed = await txParser.parseTransaction(
      connection,
      '3bSaEg71kkWDPtG94mn9bY8k2D7mABaqrQqL4F5JvzAEwukjqqwkjGhHBCb9fS5wVe1AG1J8i76ScKTZ59VGgJzt',
      false,
    );

    console.log(parsed);

    const tokenSwapIx = parsed && parsed.find((pix) => pix.name === 'swap');

    console.log(tokenSwapIx);
  } catch (error) {
    console.error(error);
  }
}

main();
