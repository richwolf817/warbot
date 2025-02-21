const { Connection, PublicKey } = require('@solana/web3.js');

const tokenAddress = 'AWHWFPnHixG6SR7mH41sjtv1iGaCgr9UuVBBD7PmDP41';
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

async function fetchAccountInfo() {
  try {
    if (tokenAddress === 'Not Found') return { symbol: 'Unknown', name: 'Unknown' };

    const tokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));

    if (tokenAccountInfo.value && tokenAccountInfo.value.data.parsed) {
      const { info } = tokenAccountInfo.value.data.parsed;
      console.log(info);
    }
  } catch (err) {
    console.log('Error fetching token metadata for:', tokenAddress);
  }
  return { symbol: 'Unknown', name: 'Unknown' };
}

async function fetchTokenMetadata() {
  try {
    // Create a PublicKey from the token address (mint)
    const mintPublicKey = new PublicKey(tokenAddress);

    // The Metaplex Token Metadata program ID (this is constant for mainnet)
    const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

    // Derive the metadata PDA for this mint using the standard seeds:
    // ['metadata', metadata_program_id, mint_id]
    const [metadataPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mintPublicKey.toBuffer()],
      METADATA_PROGRAM_ID,
    );

    console.log('Metadata PDA:', metadataPDA.toBase58());

    // Load the metadata account using the mpl-token-metadata library.
    const metadataAccount = await Metadata.load(connection, metadataPDA);

    // Extract the token name from the metadata.
    const tokenName = metadataAccount.data.data.name;
    console.log('Token Name:', tokenName);

    return tokenName;
  } catch (err) {
    console.log('Error fetching token metadata for:', tokenAddress, err);
    return null;
  }
}

fetchAccountInfo();

fetchTokenMetadata();
