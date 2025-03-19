(async () => {
  // Import modules. Dynamic import is used for ESM modules (chalk & ora).
  const { PublicKey } = require('@solana/web3.js');
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const cliProgress = require('cli-progress');
  const Table = require('cli-table3');
  const minimist = require('minimist');
  const connection = require('./solanaWeb');
  const { defiTransaction } = require('./defiDecoder');

  // Parse CLI arguments
  const argv = minimist(process.argv.slice(2));
  const mintArg = argv._[0];
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

  // CLI options: -s for single, -r for record limit, -o for table output.
  const singleMode = argv.s || false;
  const recordLimit = argv.r ? parseInt(argv.r, 10) : null;
  const outputTable = argv.o || false;

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
      // Set pagination marker.
      before = signaturesInfo[signaturesInfo.length - 1].signature;
    }

    return allSignatures;
  }

  console.log(chalk.green(`🔎 Looking up transactions for mint token: ${tokenMint.toString()}`));
  const transactions = await getTransactionsForAddress(tokenMint);

  if (!transactions || transactions.length === 0) {
    console.log(chalk.yellow('⚠️ No transactions found.'));
    return;
  }

  console.log(chalk.green(`✅ Fetched ${transactions.length} transactions.`));

  // Determine the transactions to process based on CLI options.
  let transactionsToProcess = transactions;
  if (singleMode) {
    transactionsToProcess = transactions.slice(0, 1);
    console.log(chalk.blue('🕹 Processing in single mode (1 transaction)...'));
  } else if (recordLimit && recordLimit > 0) {
    transactionsToProcess = transactions.slice(0, recordLimit);
    console.log(chalk.blue(`🕹 Processing first ${recordLimit} transactions...`));
  } else {
    console.log(chalk.blue('🕹 Processing all transactions...'));
  }

  // Create a progress bar for processing transactions.
  const progressBar = new cliProgress.SingleBar({
    format: chalk.cyan('Processing [{bar}] {percentage}% | {value}/{total} transactions'),
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
  });
  progressBar.start(transactionsToProcess.length, 0);

  // Array to store results of defiTransaction.
  const results = [];

  // Process each transaction.
  for (let i = 0; i < transactionsToProcess.length; i++) {
    const tx = transactionsToProcess[i];
    try {
      const result = await defiTransaction(tx.signature, tokenMint.toString());
      results.push({ signature: tx.signature, result });
    } catch (err) {
      console.error(chalk.red(`❌ Error processing transaction ${tx.signature}:`), err);
      results.push({ signature: tx.signature, result: 'Error' });
    }
    progressBar.update(i + 1);
  }
  progressBar.stop();
  console.log(chalk.green('✅ All transactions processed.'));

  // Output results as a CLI table if -o flag is provided.
  if (outputTable) {
    const table = new Table({
      head: [chalk.yellow('Index'), chalk.yellow('Signature'), chalk.yellow('Output')],
      colWidths: [8, 60, 30],
    });
    results.forEach((item, index) => {
      table.push([index + 1, item.signature, JSON.stringify(item.result)]);
    });
    console.log(table.toString());
  } else {
    // Otherwise, print a simple summary.
    console.log(chalk.cyan('Processed transaction outputs:'), results);
  }
})();
