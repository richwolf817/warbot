#!/bin/bash

# Create and apply system tuning for Solana Validator
cat <<EOF | sudo tee /etc/sysctl.d/60-solana.conf
net.core.rmem_max = 134217728
net.core.rmem_default = 134217728
net.core.wmem_max = 134217728
net.core.wmem_default = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
vm.max_map_count = 1000000
EOF

# Apply the system settings
sudo sysctl --system