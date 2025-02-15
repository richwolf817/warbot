const { Connection, PublicKey } = require('@solana/web3.js');
const bs58 = require('bs58'); // Make sure to install via: npm install bs58

const PUMP_FUN_KEY = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'; // Pump.fun Program ID
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

const pumpFun = new PublicKey(PUMP_FUN_KEY);
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=0ee98967-0ece-4dec-ac93-482f0e64d5a2`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

/**
 * Parses a Pump.fun create instruction.
 *
 * There appear to be (at least) two formats:
 *
 *  1. The “small” fixed‑layout instruction (129 bytes) with:
 *      - 8 bytes discriminator
 *      - 32 bytes mint public key
 *      - 32 bytes bondingCurve public key
 *      - 32 bytes user public key
 *      - 16 bytes name (fixed, null-padded)
 *      - 9 bytes symbol (fixed, null-padded)
 *
 *  2. A longer instruction that uses length‑prefixed strings (Anchor style)
 *     with the order: name, symbol, uri, mint, bondingCurve, user.
 */
function parseCreateInstruction(data) {
  console.log('Total data length:', data.length);

  // Case 1: Fixed layout (129 bytes)
  if (data.length === 129) {
    let offset = 8; // skip the 8-byte discriminator

    // For the fixed layout, we assume the fields come in this order:
    // mint (32), bondingCurve (32), user (32), name (16), symbol (9)
    if (offset + 32 * 3 + 16 + 9 !== data.length) {
      console.error('Fixed layout size mismatch.');
      return null;
    }

    const mint = bs58.encode(data.slice(offset, offset + 32));
    offset += 32;

    const bondingCurve = bs58.encode(data.slice(offset, offset + 32));
    offset += 32;

    const user = bs58.encode(data.slice(offset, offset + 32));
    offset += 32;

    const nameBuf = data.slice(offset, offset + 16);
    const name = nameBuf.toString('utf8').replace(/\0/g, '');
    offset += 16;

    const symbolBuf = data.slice(offset, offset + 9);
    const symbol = symbolBuf.toString('utf8').replace(/\0/g, '');
    offset += 9;

    const parsedData = { mint, bondingCurve, user, name, symbol };
    console.log('Parsed fixed layout data successfully:', parsedData);
    return parsedData;
  }
  // Case 2: Length‑prefixed (Anchor style) layout
  else {
    if (data.length < 8) {
      console.error('Invalid instruction: Data too short.');
      return null;
    }

    let offset = 8; // skip discriminator
    let parsedData = {};

    // Expected fields with their types (string fields have a u32 length prefix)
    const fields = [
      ['name', 'string'],
      ['symbol', 'string'],
      ['uri', 'string'],
      ['mint', 'publicKey'],
      ['bondingCurve', 'publicKey'],
      ['user', 'publicKey'],
    ];

    try {
      fields.forEach(([fieldName, fieldType]) => {
        if (offset >= data.length) {
          throw new Error(`Offset ${offset} exceeds data length ${data.length} at field '${fieldName}'`);
        }

        console.log(`Reading field: ${fieldName} at offset: ${offset}`);

        if (fieldType === 'string') {
          if (offset + 4 > data.length) throw new Error(`Insufficient data for string length field '${fieldName}'`);

          const length = data.readUInt32LE(offset);
          offset += 4;

          console.log(`  -> ${fieldName} length: ${length}`);

          if (length > data.length - offset) {
            throw new Error(`Invalid string length ${length} for field '${fieldName}', possible corrupted data`);
          }

          const value = data.toString('utf8', offset, offset + length);
          offset += length;
          parsedData[fieldName] = value;
        } else if (fieldType === 'publicKey') {
          if (offset + 32 > data.length) throw new Error(`Insufficient data for publicKey field '${fieldName}'`);

          const value = bs58.encode(data.slice(offset, offset + 32));
          offset += 32;
          parsedData[fieldName] = value;
        }
      });

      console.log('Parsed variable-length data successfully:', parsedData);
      return parsedData;
    } catch (err) {
      console.error('Error parsing create instruction:', err.message);
      console.log('Data Buffer:', data);
      return null;
    }
  }
}

async function main(connection, programId) {
  console.log('Monitoring logs for Pump.fun:', programId.toString());

  connection.onLogs(
    programId,
    async ({ logs, err, signature }) => {
      if (err) return;

      if (logs.some((log) => log.includes('Program log: Instruction: Create'))) {
        logs.forEach((log) => {
          if (log.startsWith('Program data:')) {
            try {
              const encodedData = log.split(': ')[1];
              // Use Node's built-in base64 decoding.
              const decodedData = Buffer.from(encodedData, 'base64');

              if (decodedData.length < 8) {
                console.error('Invalid instruction data: too short.');
                return;
              }

              const parsedData = parseCreateInstruction(decodedData);
              if (parsedData) {
                console.log('Signature:', signature);
                console.table(parsedData);
                console.log(
                  '##########################################################################################',
                );
              }
            } catch (error) {
              console.error('Failed to decode log:', log, error);
            }
          }
        });
      }
    },
    'finalized',
  );
}

main(connection, pumpFun).catch(console.error);
