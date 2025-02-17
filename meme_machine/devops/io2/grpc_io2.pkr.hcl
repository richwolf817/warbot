variable "aws_region" {
  default = "us-east-1"
}

variable "instance_type" {
  default = "r6a.8xlarge"  # Best for low latency & high network throughput
}

variable "ami_name" {
  default = "solana-grpc-rpc-io2"
}

variable "ami_owner" {
  default = "137112412989" # Amazon Linux 2023 AMI Owner
}

source "amazon-ebs" "solana_grpc" {
  region        = var.aws_region
  instance_type = var.instance_type
  ami_name      = var.ami_name

  source_ami_filter {
    filters = {
      name                = "al2023-ami-*-kernel-6.1-x86_64"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = [var.ami_owner]
    most_recent = true
  }

  ssh_username = "ec2-user"

  # Increase the root volume size (from default ~8GB to 50GB)
  launch_block_device_mappings {
    device_name           = "/dev/xvda"
    volume_size           = 50
    volume_type           = "io2"
    delete_on_termination = true
    iops                  = 10000
  }

}

build {
  sources = ["source.amazon-ebs.solana_grpc"]

  provisioner "shell" {
    inline = [
        # Update System & Install Essential Packages
        "sudo dnf update -y",

        # Install essential packages
        "sudo dnf install -y curl --allowerasing",
        "sudo dnf install -y wget nano jq tmux htop net-tools iotop iftop unzip tar git gcc-c++ make numactl gcc gcc-c++ make python3-devel protobuf protobuf-devel",

        # Install Solana CLI (v2.1.13) via Anza
        "sh -c \"$(curl -sSfL https://release.anza.xyz/v2.1.13/install)\"",

        # Ensure Solana CLI is in PATH immediately
        "source ~/.bash_profile",

        # Verify Solana installation
        "solana --version",

        # Generate new validator keypair (if not exists)
        "mkdir -p ~/solana && chmod 700 ~/solana",
        "[ -f ~/solana/validator-keypair.json ] || solana-keygen new --outfile ~/solana/validator-keypair.json --no-bip39-passphrase",

        # Extract public key from the generated keypair
        "VALIDATOR_PUBKEY=$(solana-keygen pubkey ~/solana/validator-keypair.json)",

        # ---------------------------------------------------------------------
        # Apply OS Tuning for Solana Validator:
        # Set network and VM parameters for optimal performance
        "cat <<'EOF' | sudo tee /etc/sysctl.d/60-solana.conf",
        "net.core.rmem_max = 134217728",
        "net.core.rmem_default = 134217728",
        "net.core.wmem_max = 134217728",
        "net.core.wmem_default = 134217728",
        "net.ipv4.tcp_rmem = 4096 87380 134217728",
        "net.ipv4.tcp_wmem = 4096 65536 134217728",
        "vm.max_map_count = 1000000",
        "EOF",
        "sudo sysctl --system",
        # ---------------------------------------------------------------------

        # Create the startup script for the Agave RPC node with updated paths
        "cat <<'EOF' > /home/ec2-user/validator.sh",
        "#!/bin/bash",
        "exec agave-validator \\",
        "    --identity /home/ec2-user/solana/validator-keypair.json \\",
        "    --known-validator 5D1fNXzvv5NjV1ysLjirC4WY92RNsVH18vjmcszZd8on \\",
        "    --known-validator dDzy5SR3AXdYWVqbDEkVFdvSPCtS9ihF5kJkHCtXoFs \\",
        "    --known-validator eoKpUABi59aT4rR9HGS3LcMecfut9x7zJyodWWP43YQ \\",
        "    --known-validator 7XSY3MrYnK8vq693Rju17bbPkCN3Z7KvvfvJx4kdrsSY \\",
        "    --known-validator Ft5fbkqNa76vnsjYNwjDZUXoTWpP7VYm3mtsaQckQADN \\",
        "    --known-validator 9QxCLckBiJc783jnMvXZubK4wH86Eqqvashtrwvcsgkv \\",
        "    --only-known-rpc \\",
        "    --full-rpc-api \\",
        "    --no-voting \\",
        "    --ledger /home/ec2-user/solana/ledger \\",
        "    --accounts /home/ec2-user/solana/accounts \\",
        "    --log /home/ec2-user/solana-rpc.log \\",
        "    --rpc-port 8899 \\",
        "    --rpc-bind-address 0.0.0.0 \\",
        "    --private-rpc \\",
        "    --dynamic-port-range 8000-8020 \\",
        "    --entrypoint entrypoint.testnet.solana.com:8001 \\",
        "    --entrypoint entrypoint2.testnet.solana.com:8001 \\",
        "    --entrypoint entrypoint3.testnet.solana.com:8001 \\",
        "    --expected-genesis-hash 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY \\",
        "    --wal-recovery-mode skip_any_corrupted_record \\",
        "    --limit-ledger-size",
        "EOF",

        # Make the validator script executable
        "chmod +x /home/ec2-user/validator.sh",

        # Create the systemd service file
        "cat <<'EOF' | sudo tee /etc/systemd/system/solana-rpc.service",
        "[Unit]",
        "Description=Agave RPC Node",
        "After=network.target",
        "",
        "[Service]",
        "User=ec2-user",
        "WorkingDirectory=/home/ec2-user",
        "ExecStart=/bin/bash -c 'source /home/ec2-user/.bash_profile && /home/ec2-user/validator.sh >> /home/ec2-user/solana-rpc.log 2>&1'",
        "Restart=always",
        "LimitNOFILE=1048576",
        "StandardOutput=journal",
        "StandardError=journal",
        "",
        "[Install]",
        "WantedBy=multi-user.target",
        "EOF",

        # Apply systemd changes
        "echo 'Reloading systemd daemon and enabling the service...'",
        "sudo chmod +x /home/ec2-user/validator.sh",
        "sudo systemctl daemon-reload",
        "sudo systemctl enable solana-rpc.service",
        "sudo systemctl restart solana-rpc.service"

        # Install Rust (For Solana Development & CLI)
        "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
        "source $HOME/.cargo/env",
        "rustc --version",

        # Remove old Node.js version
        "sudo dnf remove -y nodejs",

        # Install Node.js for gRPC & Web3.js Support
        "curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -",
        "sudo dnf install -y nodejs",

        # Fix NPM Global Install Permissions
        "mkdir -p $HOME/.npm-global",
        "npm config set prefix '$HOME/.npm-global'",

        # Update PATH for NPM
        "export PATH=\"$HOME/.npm-global/bin:$PATH\"",
        "echo 'export PATH=\"$HOME/.npm-global/bin:$PATH\"' >> ~/.bashrc",

        # Verify Node.js & NPM Installation
        "node -v",
        "npm -v",

        # Install Solana Web3.js & gRPC Libraries
        "npm install -g @solana/web3.js @solana/rpc-core @grpc/grpc-js",

        # Additional gRPC tools
        "npm install -g grpc-tools node-gyp",
    ]
  }
}
