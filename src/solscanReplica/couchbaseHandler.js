const couchbase = require('couchbase');

let cluster, bucket, collection;

/**
 * 🔌 Connect to Couchbase (Singleton)
 */
async function connectToCouchbase() {
  if (cluster) return; // Prevent multiple connections

  try {
    console.log('🔗 Connecting to Couchbase...');
    cluster = await couchbase.connect('couchbase://127.0.0.1', {
      username: 'Administrator',
      password: 'password',
    });

    bucket = cluster.bucket('solana_tokens');
    collection = bucket.defaultCollection();

    console.log('✅ Connected to Couchbase.');
  } catch (error) {
    console.error('❌ Couchbase Connection Error:', error);
  }
}

/**
 * 🔧 Ensures the bucket and required indexes exist.
 */
async function setupDatabase() {
  try {
    await connectToCouchbase();
    console.log('🔍 Checking database setup...');

    // Ensure Primary Index
    await cluster.query(`CREATE PRIMARY INDEX ON solana_tokens;`).catch(() => {});
    // Index for faster queries by parentToken and type
    await cluster.query(`CREATE INDEX idx_tokens ON solana_tokens (parentToken, type);`).catch(() => {});

    console.log('✅ Database setup complete.');
  } catch (error) {
    console.error('❌ Error ensuring database setup:', error);
  }
}

/**
 * 📝 Insert a new Solana token entry
 */
async function insertToken(primaryToken, parentToken, type, instructions) {
  try {
    await connectToCouchbase();

    const doc = {
      primaryToken,
      parentToken,
      type,
      instructions,
      timestamp: new Date().toISOString(),
    };

    await collection.upsert(primaryToken, doc);
    console.log('✅ Inserted token:', primaryToken);
  } catch (error) {
    console.error('❌ Error inserting document:', error);
  }
}

/**
 * 🔍 Fetch a token by primaryToken (Solana Mint Address)
 */
async function getTokenByPrimary(primaryToken) {
  try {
    await connectToCouchbase();
    const result = await collection.get(primaryToken);
    console.log('🔎 Token Data:', result.content);
    return result.content;
  } catch (error) {
    console.error('❌ Error retrieving document:', error);
    return null;
  }
}

/**
 * 🔎 Query tokens by parentToken & type
 */
async function scanTokens(parentToken, type) {
  try {
    await connectToCouchbase();
    const query = `SELECT * FROM solana_tokens WHERE parentToken = $1 AND type = $2`;
    const result = await cluster.query(query, { parameters: [parentToken, type] });

    console.log(`🔎 Found ${result.rows.length} matching tokens:`);
    console.table(result.rows);
    return result.rows;
  } catch (error) {
    console.error('❌ Error scanning documents:', error);
    return [];
  }
}

// 📦 Export functions for use in other files
module.exports = {
  setupDatabase,
  insertToken,
  getTokenByPrimary,
  scanTokens,
};
