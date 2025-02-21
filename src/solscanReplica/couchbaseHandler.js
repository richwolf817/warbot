const couchbase = require('couchbase');

class CouchbaseHandler {
  constructor() {
    this.cluster = new couchbase.Cluster('couchbase://127.0.0.1', {
      username: 'Administrator', // Update with your Couchbase credentials
      password: 'password',
    });

    this.bucketName = 'solana_tokens'; // Bucket name
    this.bucket = this.cluster.bucket(this.bucketName);
    this.collection = this.bucket.defaultCollection();
  }

  /**
   * 🔧 Ensures the bucket and required indexes exist.
   */
  async setupDatabase() {
    try {
      console.log('🔍 Checking database setup...');

      // Ensure Primary Index
      await this.cluster.query(`CREATE PRIMARY INDEX ON ${this.bucketName};`).catch(() => {});
      // Index for faster queries by parentToken and type
      await this.cluster.query(`CREATE INDEX idx_tokens ON ${this.bucketName} (parentToken, type);`).catch(() => {});

      console.log('✅ Database setup complete.');
    } catch (error) {
      console.error('❌ Error ensuring database setup:', error);
    }
  }

  /**
   * 📝 Insert a new Solana token entry
   * @param {string} primaryToken - The main identifier (e.g., token mint address)
   * @param {string} parentToken - The parent token (if applicable)
   * @param {string} type - Token type (e.g., SPL, NFT, Wrapped)
   * @param {Array} instructions - Array of transaction instructions
   */
  async insertToken(primaryToken, parentToken, type, instructions) {
    const doc = {
      primaryToken,
      parentToken,
      type,
      instructions,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.collection.upsert(primaryToken, doc);
      console.log('✅ Inserted token:', primaryToken);
    } catch (error) {
      console.error('❌ Error inserting document:', error);
    }
  }

  /**
   * 🔍 Fetch a token by primaryToken (Solana Mint Address)
   * @param {string} primaryToken
   */
  async getTokenByPrimary(primaryToken) {
    try {
      const result = await this.collection.get(primaryToken);
      console.log('🔎 Token Data:', result.content);
      return result.content;
    } catch (error) {
      console.error('❌ Error retrieving document:', error);
      return null;
    }
  }

  /**
   * 🔎 Query tokens by parentToken & type
   * @param {string} parentToken
   * @param {string} type
   */
  async scanTokens(parentToken, type) {
    const query = `SELECT * FROM ${this.bucketName} WHERE parentToken = $1 AND type = $2`;
    const options = { parameters: [parentToken, type] };

    try {
      const result = await this.cluster.query(query, options);
      console.log(`🔎 Found ${result.rows.length} matching tokens:`);
      console.table(result.rows);
      return result.rows;
    } catch (error) {
      console.error('❌ Error scanning documents:', error);
      return [];
    }
  }
}

// Export an instance of CouchbaseHandler to be used in other files
const couchbaseHandler = new CouchbaseHandler();
module.exports = couchbaseHandler;
