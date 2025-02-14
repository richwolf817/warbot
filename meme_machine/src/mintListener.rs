use solana_client::{
    pubsub_client::PubsubClient,
    rpc_client::RpcClient,
    rpc_config::RpcTransactionLogsFilter,
};
use solana_sdk::{
    commitment_config::CommitmentConfig,
    pubkey::Pubkey,
};
use solana_transaction_status::UiTransactionEncoding;
use serde_json::Value;
use std::error::Error;
use std::str::FromStr;

fn main() -> Result<(), Box<dyn Error>> {
    // Raydium program public key.
    const RAYDIUM_PUBLIC_KEY: &str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
    let raydium_program_id = Pubkey::from_str(RAYDIUM_PUBLIC_KEY)?;

    // Helius RPC configuration.
    let api_key = "YOUR_API_KEY_HERE";
    let ws_url = format!("wss://mainnet.helius-rpc.com/?api-key={}", api_key);
    let http_url = format!("https://mainnet.helius-rpc.com/?api-key={}", api_key);

    let rpc_client = RpcClient::new_with_commitment(http_url, CommitmentConfig::confirmed());

    // Subscribe to logs mentioning the Raydium program.
    let (_client, receiver) = PubsubClient::logs_subscribe(
        &ws_url,
        RpcTransactionLogsFilter::Mentions(vec![raydium_program_id.to_string()]),
        CommitmentConfig::confirmed(),
    )?;

    println!("Subscribed to Raydium logs...");

    // Listen for incoming log notifications.
    for log_notification in receiver {
        let log_info = log_notification.value;
        if log_info.logs.iter().any(|log| log.contains("initialize2")) {
            println!("New token mint detected in transaction: {}", log_info.signature);
            // Process the transaction details.
            process_raydium_transaction(&log_info.signature, &rpc_client, &raydium_program_id)?;
        }
    }

    Ok(())
}

/// Process a Raydium transaction by fetching its details and extracting the token accounts.
fn process_raydium_transaction(
    signature: &str,
    rpc_client: &RpcClient,
    raydium_program_id: &Pubkey,
) -> Result<(), Box<dyn Error>> {
    let tx_details = rpc_client.get_transaction(signature, UiTransactionEncoding::JsonParsed)?;
    let tx_json: Value = serde_json::to_value(tx_details)?;

    if let Some(instructions) = tx_json["transaction"]["message"]["instructions"].as_array() {
        // Find the instruction that belongs to the Raydium program.
        if let Some(instruction) = instructions.iter().find(|ix| {
            ix.get("programId")
                .and_then(|p| p.as_str())
                .map(|s| s == raydium_program_id.to_string())
                .unwrap_or(false)
        }) {
            if let Some(accounts) = instruction.get("accounts").and_then(|acc| acc.as_array()) {
                if accounts.len() > 9 {
                    let token_a_account = accounts[8].as_str().unwrap_or("N/A");
                    let token_b_account = accounts[9].as_str().unwrap_or("N/A");

                    println!("New LP Found:");
                    println!("Explorer URL: https://explorer.solana.com/tx/{}", signature);
                    println!("Token A Account: {}", token_a_account);
                    println!("Token B Account: {}", token_b_account);
                } else {
                    println!("Not enough accounts in the Raydium instruction.");
                }
            } else {
                println!("No accounts found in the Raydium instruction.");
            }
        } else {
            println!("No Raydium instruction found in the transaction.");
        }
    } else {
        println!("No instructions found in the transaction message.");
    }
    Ok(())
}