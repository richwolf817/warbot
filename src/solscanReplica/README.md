# Token History CLI

Token History CLI is a command-line tool for fetching and processing transaction histories for a given token mint on the Solana blockchain. It retrieves transaction signatures via the Solana RPC, processes them using a custom decoder, and displays the results in a user-friendly format.

## Features

- **Fetch Transactions:** Retrieves all transaction signatures for a specified token mint using pagination.
- **Real-time Updates:** Uses spinners and progress bars to provide feedback during long-running operations.
- **Flexible Output:** Displays results in a CLI table or as JSON output.
- **CLI Options:** Supports various command-line options to filter or limit the transactions processed.

## Prerequisites

- **Node.js:** v20.x or later
- **Yarn:** (Optional, but recommended for dependency management)
- **Solana Access:** Proper configuration in `connection.js` to connect to the Solana network.

## Installation

Clone the repository and install dependencies using Yarn.

    git clone <repository-url>
    cd <repository-directory>
    yarn install

> Note: This CLI uses dynamic imports to load ESM modules like Chalk and Ora. Ensure you're running Node.js v20.x or later.

## Usage

Run the CLI by providing a token mint as the first argument along with optional flags.

    node tokenHistory.js <mint-token> [options]

### Options

- **-s**  
  Process a single transaction (useful for testing).

- **-r <number>**  
  Limit processing to the first `<number>` transactions.

- **-o**  
  Output results in a formatted CLI table.

### Examples

- **Process all transactions for a given mint token:**

  node tokenHistory.js <mint-token>

- **Process only the first 10 transactions and output as a table:**

  node tokenHistory.js <mint-token> -r 10 -o

- **Process a single transaction:**

  node tokenHistory.js <mint-token> -s

## File Structure

- **tokenHistory.js**  
  Main CLI script that:

  - Parses command-line arguments.
  - Dynamically imports ESM modules (e.g., Chalk, Ora).
  - Fetches transaction signatures.
  - Processes transactions using `defiTransaction`.
  - Displays output using either a table or JSON.

- **connection.js**  
  Contains the connection logic for accessing the Solana network.

- **defiDecoder.js**  
  Exports the `defiTransaction` function, which processes individual transactions.

## Troubleshooting

- **ESM Import Errors:**  
  If you encounter errors like `ERR_REQUIRE_ESM`, ensure your Node.js version is up-to-date and that you're running the code wrapped in an async IIFE to support dynamic imports.

- **Missing Mint Token:**  
  The CLI will exit with an error if no mint token is provided. Ensure you pass a valid token mint as the first argument.

## License

This project is licensed under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! If you encounter any issues or have improvements, please open an issue or submit a pull request.
