const { Connection, PublicKey } = require('@solana/web3.js');
const { Raydium } = require('@raydium-io/raydium-sdk-v2');
const { LIQUIDITY_STATE_LAYOUT_V4 } = require('@raydium-io/raydium-sdk');

// Replace with your actual values:
const NEW_MINT_ADDRESS = 'vBtTYBQuqPR2NvKgcoVjYoZ8HW5dftGkVvyUdkTpump';
const USDC_MINT = 'So11111111111111111111111111111111111111112';

const API_KEY = '0ee98967-0ece-4dec-ac93-482f0e64d5a2';
const SESSION_HASH = 'QNDEMO' + Math.ceil(Math.random() * 1e9);

// Setup the connection using Helius RPC
const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${API_KEY}`, {
  wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=${API_KEY}`,
  httpHeaders: { 'x-session-hash': SESSION_HASH },
});

async function main() {
  // Initialize Raydium SDK (this loads pool info, token lists, etc.)
  const raydium = await Raydium.load({ connection });

  // Create PublicKey objects for the mints.
  let newMint, usdcMint;
  try {
    newMint = new PublicKey(NEW_MINT_ADDRESS);
    usdcMint = new PublicKey(USDC_MINT);
  } catch (error) {
    console.error('Invalid public key input for the new mint or USDC mint:', error);
    return;
  }

  console.log('Fetching pool info for new mint:', newMint.toBase58(), 'and USDC mint:', usdcMint.toBase58());

  // Fetch pool list for the pair using Raydium's API.
  let poolList;
  try {
    poolList = await raydium.api.fetchPoolByMints({
      mint1: NEW_MINT_ADDRESS,
      mint2: USDC_MINT,
    });
  } catch (error) {
    console.error('Error fetching pool list:', error);
    return;
  }

  if (!poolList || poolList.length === 0) {
    console.error('No pool found for this token pair.');
    return;
  }

  // For demonstration, pick the first pool from the list.
  console.log('Pool Info', poolList.data[0]);
  const poolInfo = poolList.data[0];

  // Extract the liquidity pool account (ammId) and the price oracle (pythOracle) if available.
  let liquidityPoolPubkey;
  try {
    liquidityPoolPubkey = new PublicKey(poolInfo.id);
  } catch (error) {
    console.error('Invalid liquidity pool public key from pool info:', poolInfo.ammId);
    return;
  }
  console.log('Liquidity Pool Account:', liquidityPoolPubkey.toBase58());

  // Subscribe to liquidity pool account changes.
  const lpSubscriptionId = connection.onAccountChange(
    liquidityPoolPubkey,
    async (accountInfo, context) => {
      console.log('----- Raw Account Info -----');
      console.log('Lamports:', accountInfo.lamports);
      console.log('Owner:', accountInfo.owner.toBase58());
      console.log('Rent Epoch:', accountInfo.rentEpoch);
      console.log('Slot:', context.slot);

      // Ensure the data is in a Buffer. (We requested "base64" encoding below.)
      const rawData = Buffer.from(accountInfo.data, 'base64');

      console.log('----- Decoding with LIQUIDITY_STATE_LAYOUT_V4 -----');
      try {
        const decodedState = LIQUIDITY_STATE_LAYOUT_V4.decode(rawData);
        //console.log('Decoded Liquidity Pool State:');
        //console.dir(decodedState, { depth: null });

        // Now, get a more user-friendly price value using on-chain vault balances.
        const { baseBalance, quoteBalance, price } = await getPoolPrice(decodedState);
        console.log(`Base Vault Balance: ${baseBalance}`);
        console.log(`Quote Vault Balance: ${quoteBalance}`);
        console.log(`Computed Pool Price (quote/base): ${price}`);

        // If you wish to extract other values, convert BN fields similarly:
        const minSize = convertBNToDecimal(decodedState.minSize, 0); // assuming minSize is in atomic units without decimals
        console.log(`Min Size: ${minSize}`);

        // For cumulative swap amounts, you might do:
        const swapBaseIn = convertBNToDecimal(decodedState.swapBaseInAmount, decodedState.baseDecimal.toNumber());
        const swapQuoteOut = convertBNToDecimal(decodedState.swapQuoteOutAmount, decodedState.quoteDecimal.toNumber());
        console.log(`Cumulative Swap Base In: ${swapBaseIn}`);
        console.log(`Cumulative Swap Quote Out: ${swapQuoteOut}`);
      } catch (err) {
        console.error('Error decoding liquidity pool state:', err);
      }
    },
    { commitment: 'finalized', encoding: 'base64' },
  );
  console.log('Liquidity Pool Subscription ID:', lpSubscriptionId);
}

// Utility: Convert a BN value to a JavaScript number with decimals adjustment.
function convertBNToDecimal(bn, decimals) {
  // For safety, use toString() and then convert:
  const raw = bn.toString();
  return Number(raw) / Math.pow(10, decimals);
}

// Example: Fetch on-chain vault balances and compute a pool price.
async function getPoolPrice(decodedState) {
  // Extract token decimals (they are stored as BN in the decoded state)
  const baseDecimals = decodedState.baseDecimal.toNumber();
  const quoteDecimals = decodedState.quoteDecimal.toNumber();

  // The vaults are stored as PublicKey objects in the decoded state.
  const baseVault = decodedState.baseVault;
  const quoteVault = decodedState.quoteVault;

  // Fetch token account balances for the vaults:
  const baseBalanceRes = await connection.getTokenAccountBalance(baseVault);
  const quoteBalanceRes = await connection.getTokenAccountBalance(quoteVault);

  // Convert amounts (they are strings in the response) into numbers, adjusting for decimals:
  const baseBalance = Number(baseBalanceRes.value.amount) / Math.pow(10, baseDecimals);
  const quoteBalance = Number(quoteBalanceRes.value.amount) / Math.pow(10, quoteDecimals);

  // Compute a simple price as Quote per Base:
  const price = quoteBalance / baseBalance;
  return { baseBalance, quoteBalance, price };
}

main().catch(console.error);
