#!/bin/bash

set -e

echo "🚀 Setting system-wide open file descriptor limits..."

# Increase limits for ec2-user and root
echo "Updating /etc/security/limits.conf..."
sudo tee -a /etc/security/limits.conf <<EOF
ec2-user soft nofile 1000000
ec2-user hard nofile 1000000
root soft nofile 1000000
root hard nofile 1000000
EOF

# Enable limits in PAM
echo "Updating PAM limits..."
sudo tee -a /etc/pam.d/common-session <<EOF
session required pam_limits.so
EOF

sudo tee -a /etc/pam.d/common-session-noninteractive <<EOF
session required pam_limits.so
EOF

# Update system-wide limits
echo "Updating systemd limits..."
sudo sed -i 's/^#DefaultLimitNOFILE=.*/DefaultLimitNOFILE=1000000/' /etc/systemd/system.conf
sudo sed -i 's/^#DefaultLimitNPROC=.*/DefaultLimitNPROC=1000000/' /etc/systemd/system.conf
sudo sed -i 's/^#DefaultLimitNOFILE=.*/DefaultLimitNOFILE=1000000/' /etc/systemd/user.conf
sudo sed -i 's/^#DefaultLimitNPROC=.*/DefaultLimitNPROC=1000000/' /etc/systemd/user.conf

# Apply changes
echo "Reloading system limits..."
sudo systemctl daemon-reexec
sudo systemctl daemon-reload

echo "✅ System limits updated successfully!"

# Verify changes
echo "Verifying limits..."
echo "Expected: 1000000"
echo "Soft limit: $(ulimit -Sn)"
echo "Hard limit: $(ulimit -Hn)"

# Restart system to fully apply changes
echo "🔄 Rebooting system in 5 seconds to apply changes..."
sleep 5
sudo reboot
