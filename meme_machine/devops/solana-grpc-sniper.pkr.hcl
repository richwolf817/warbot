variable "aws_region" {
  default = "us-east-1"
}

variable "instance_type" {
  default = "c6i.4xlarge"  # Fastest for low latency
}

variable "ami_name" {
  default = "solana-grpc-rpc-sniper"
}

variable "ami_owner" {
  default = "099720109477" # Canonical Ubuntu AMIs
}

source "amazon-ebs" "solana_grpc" {
  region                  = var.aws_region
  instance_type           = var.instance_type
  ami_name                = var.ami_name
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners                = [var.ami_owner]
    most_recent           = true
  }
  ssh_username            = "ubuntu"
  launch_block_device_mappings {
    device_name           = "/dev/nvme0n1"
    volume_size           = 1024
    volume_type           = "gp3"
    delete_on_termination = true
  }
}

build {
  sources = ["source.amazon-ebs.solana_grpc"]

  provisioner "shell" {
    inline = [
      # System Optimizations
      "sudo apt update && sudo apt upgrade -y",
      "sudo apt install -y curl jq build-essential tmux htop net-tools iotop iftop unzip",

      # Enable High-Performance Networking
      "sudo sysctl -w net.core.rmem_max=16777216",
      "sudo sysctl -w net.core.wmem_max=16777216",
      "sudo sysctl -w net.ipv4.tcp_window_scaling=1",
      "sudo sysctl -w net.ipv4.tcp_slow_start_after_idle=0",
      "sudo sysctl -w net.ipv4.tcp_congestion_control=bbr",
      "sudo sysctl -p",

      # Install Solana CLI
      "sh -c \"$(curl -sSfL https://release.solana.com/stable/install)\"",
      "export PATH=\"$HOME/.local/share/solana/install/active_release/bin:$PATH\"",
      "solana --version",

      # Setup Ledger Storage
      "mkdir -p ~/solana/ledger",

      # Start Validator with Optimized RPC & gRPC Config
      "solana-validator \\",
      "--identity ~/solana/validator-keypair.json \\",
      "--ledger ~/solana/ledger \\",
      "--rpc-port 8899 \\",
      "--full-rpc-api \\",
      "--enable-rpc-transaction-history \\",
      "--private-rpc \\",
      "--log ~/solana/validator.log \\",
      "--rpc-bind-address 0.0.0.0 \\",
      "--rpc-allow-pubsub-accounts \"Your Public Key\" \\",
      "--rpc-max-request-body-size 1000000000 \\",
      "--rpc-send-batch-size 1000 \\",
      "--wal-recovery-mode skip_any_corrupt_record \\",
      "--accounts-db-skip-shrink \\",
      "--no-snapshot-fetch \\",
      "--limit-ledger-size &",

      # Install Node.js for gRPC & Web3.js Support
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
      "sudo apt install -y nodejs",
      "node -v",

      # Install Solana Web3.js & gRPC Libraries
      "npm install -g @solana/web3.js @solana/rpc-core grpc @grpc/grpc-js",
      
      # Open Firewall for Ultra-Fast Access
      "sudo ufw allow 8899/tcp",
      "sudo ufw allow 8900/tcp",
      "sudo ufw allow 22/tcp",
      "sudo ufw --force enable"
    ]
  }

  # Enable SSH for remote debugging
  provisioner "file" {
    source      = "ssh_key.pub"
    destination = "/home/ubuntu/.ssh/authorized_keys"
  }
}
