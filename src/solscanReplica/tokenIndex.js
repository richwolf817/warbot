// tokenIndexing.js
const { PublicKey } = require('@solana/web3.js');
const { Metadata } = require('@metaplex-foundation/mpl-token-metadata');
const couchbaseHandler = require('./couchbaseHandler');
const connection = require('./solanaWeb');

/**
 * Index a token by fetching its account info and metadata,
 * then storing the combined data in the Couchbase database.
 *
 * @param {string} tokenAddress - The token's address.
 * @param {string} parentAddress - The parent address.
 * @param {object} instructionMeta - Metadata from Solana instructions.
 * @returns {object} - The token data (from the database or freshly indexed).
 */
async function tokenIndexing(tokenAddress, parentAddress, instructionMeta) {
  // 1. Check if token exists in the Couchbase database.
  const existingToken = await couchbaseHandler.getTokenByPrimary(tokenAddress);
  if (existingToken) {
    console.log(`Token ${tokenAddress} already exists in the database.`);
    return existingToken;
  }

  // 2. Retrieve token account info from Solana.
  let tokenAccountData;
  try {
    if (tokenAddress === 'Not Found') {
      return { symbol: 'Unknown', name: 'Unknown' };
    }
    const tokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
    if (tokenAccountInfo.value && tokenAccountInfo.value.data && tokenAccountInfo.value.data.parsed) {
      tokenAccountData = tokenAccountInfo.value.data.parsed.info;
      console.log('Token account info:', tokenAccountData);
    } else {
      console.error(`Unable to parse token account info for ${tokenAddress}`);
      return { symbol: 'Unknown', name: 'Unknown' };
    }
  } catch (err) {
    console.error(`Error fetching token account info for ${tokenAddress}:`, err);
    return { symbol: 'Unknown', name: 'Unknown' };
  }

  // 3. Get token metadata from the mint address.
  let tokenMetadata = null;
  try {
    const mintPubkey = new PublicKey(tokenAccountData.mint);
    const tokenmetaPubkey = await Metadata.getPDA(mintPubkey);
    tokenMetadata = await Metadata.load(connection, tokenmetaPubkey);
  } catch (err) {
    console.error(`Error fetching token metadata for mint ${tokenAccountData.mint}:`, err);
  }

  // 4. Construct the token object with the combined data.
  const tokenData = {
    tokenAddress,
    parentAddress,
    instructionMeta,
    mint: tokenAccountData.mint,
    owner: tokenAccountData.owner,
    metadata: tokenMetadata ? tokenMetadata.data : null,
    indexedAt: new Date().toISOString(),
  };

  // 5. Save the token data to Couchbase.
  try {
    await couchbaseHandler.insertToken(tokenData);
    console.log(`Token ${tokenAddress} successfully saved to the database.`);
  } catch (err) {
    console.error(`Error saving token ${tokenAddress} to the database:`, err);
  }

  return tokenData;
}

/**
 * Retrieve a token's data from the Couchbase database.
 *
 * @param {string} tokenAddress - The token's address.
 * @returns {object|null} - The token data if found, or null on error.
 */
async function readToken(tokenAddress) {
  try {
    return await couchbaseHandler.getTokenByPrimary(tokenAddress);
  } catch (err) {
    console.error(`Error reading token ${tokenAddress} from the database:`, err);
    return null;
  }
}

module.exports = {
  tokenIndexing,
  readToken,
};
