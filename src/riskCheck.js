const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID, getMint, getLargestAccounts } = require('@solana/spl-token');

// Define connection
const connection = new Connection('https://api.mainnet-beta.solana.com');

// Token Mint Address (Replace with the token you want to check)
const tokenMintAddress = new PublicKey('TOKEN_MINT_ADDRESS_HERE');

async function checkTokenDetails() {
  try {
    // Fetch mint details
    const mintInfo = await getMint(connection, tokenMintAddress);

    // Check if mint and freeze authorities are disabled (null)
    const isMintAuthDisabled = mintInfo.mintAuthority === null;
    const isFreezeAuthDisabled = mintInfo.freezeAuthority === null;

    console.log('Mint Auth Disabled:', isMintAuthDisabled);
    console.log('Freeze Auth Disabled:', isFreezeAuthDisabled);

    // Fetch the largest token holders
    const largestAccounts = await getLargestAccounts(connection, tokenMintAddress);
    const totalSupply = Number(mintInfo.supply);

    if (largestAccounts.value.length === 0) {
      console.log('No holders found for this token.');
      return;
    }

    // Calculate top 10 holders percentage
    const topHolders = largestAccounts.value.slice(0, 10);
    const topHoldersTotal = topHolders.reduce((sum, acc) => sum + Number(acc.uiAmount), 0);
    const topHoldersPercentage = (topHoldersTotal / totalSupply) * 100;

    console.log('Top 10 Holders Total:', topHoldersTotal);
    console.log('Top 10 Holders % of Supply:', topHoldersPercentage.toFixed(2), '%');
    console.log('Top 10 Holders < 15%:', topHoldersPercentage < 15);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTokenDetails();
