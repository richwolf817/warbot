const { Connection, PublicKey } = require('@solana/web3.js');

// Replace with your private RPC node URL
const RPC_URL = 'https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2';

// Replace with a valid SPL Token account address
const TOKEN_ACCOUNT_ADDRESS = 'GV4QXTCyjnMGVi8Sf1fuJi152PU1AZExACDAS1syNLmG';

async function testRpc() {
  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    // Fetch token account details
    console.log('\nFetching Token Account Details...');
    const tokenAccountInfo = await connection.getAccountInfo(new PublicKey(TOKEN_ACCOUNT_ADDRESS));

    if (!tokenAccountInfo) {
      console.log('Token account not found or invalid.');
      return;
    }

    console.log('Token Account Address:', TOKEN_ACCOUNT_ADDRESS);
    console.log('Token Account Lamports:', tokenAccountInfo.lamports);
    console.log('Token Account Data Length:', tokenAccountInfo.data.length);
    console.log('Owner Program:', tokenAccountInfo.owner.toBase58());
  } catch (error) {
    console.error('Error connecting to RPC:', error);
  }
}

// Run the test
testRpc();
