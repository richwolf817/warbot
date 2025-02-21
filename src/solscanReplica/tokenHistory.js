const { PublicKey } = require('@solana/web3.js');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const connection = require('./connection');
const { defiTransaction } = require('./defiDecoder');

// Get the mint token from CLI arguments.
const mintArg = process.argv[2];
if (!mintArg) {
  console.error(chalk.red('❌ Please provide a mint token as an argument.'));
  process.exit(1);
}

let tokenMint;
try {
  tokenMint = new PublicKey(mintArg);
} catch (err) {
  console.error(chalk.red('❌ Invalid mint token provided.'));
  process.exit(1);
}

/**
 * Fetch all transactions for an address using pagination.
 * Loops until no further transactions are found.
 *
 * @param {PublicKey} address - The address to fetch transactions for.
 * @returns {Array} Array of transaction signature objects.
 */
async function getTransactionsForAddress(address) {
  let allSignatures = [];
  let before = undefined;
  const spinner = ora(chalk.blue('⏳ Fetching transactions...')).start();

  while (true) {
    const options = { limit: 1000 };
    if (before) options.before = before;

    spinner.text = chalk.blue(`⏳ Fetched ${allSignatures.length} transactions so far...`);

    let signaturesInfo;
    try {
      signaturesInfo = await connection.getSignaturesForAddress(address, options);
    } catch (error) {
      spinner.fail(chalk.red('❌ Error fetching transactions.'));
      console.error(chalk.red(error));
      break;
    }

    if (signaturesInfo.length === 0) {
      spinner.succeed(chalk.green(`✅ Completed. Total transactions fetched: ${allSignatures.length}`));
      break;
    }

    allSignatures.push(...signaturesInfo);
    before = signaturesInfo[signaturesInfo.length - 1].signature;
  }

  return allSignatures;
}

(async () => {
  console.log(chalk.green(`🔎 Looking up transactions for mint token: ${tokenMint.toString()}`));

  const transactions = await getTransactionsForAddress(tokenMint);

  if (!transactions || transactions.length === 0) {
    console.log(chalk.yellow('⚠️ No transactions found.'));
  } else {
    console.log(chalk.green(`✅ Fetched ${transactions.length} transactions.`));

    // Create a progress bar for processing transactions.
    const progressBar = new cliProgress.SingleBar({
      format: 'Processing [{bar}] {percentage}% | {value}/{total} transactions',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });
    progressBar.start(transactions.length, 0);

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      try {
        // Process each transaction by calling defiTransaction.
        await defiTransaction(tx.signature, tokenMint.toString());
      } catch (err) {
        console.error(chalk.red(`❌ Error processing transaction ${tx.signature}:`), err);
      }
      progressBar.update(i + 1);
    }
    progressBar.stop();

    console.log(chalk.green('✅ All transactions processed.'));
  }
})();
