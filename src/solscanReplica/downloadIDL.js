const { Connection, PublicKey } = require('@solana/web3.js');

const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

const programId = new PublicKey('JUP2jxvXaqu7NQY1GmNF4m1vodw12LVXYxbFL2uJvfo');

async function fetchIdl(programId) {
  const accountInfo = await connection.getAccountInfo(programId);
  if (!accountInfo) {
    throw new Error('Program ID not found on the blockchain.');
  }

  // Extract IDL from the program (if stored on-chain)
  const idlBuffer = accountInfo.data;
  const idlJson = JSON.parse(idlBuffer.toString());

  console.log('Fetched IDL:', idlJson);
}

fetchIdl(programId).catch(console.error);
