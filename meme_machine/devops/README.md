# Ensuring Service is working

    systemctl status solana-rpc.service
    journalctl -u solana-rpc.service -f

# Apply OS Tuning for Solana Validator:

# Set network, file, and VM parameters for optimal performance

    cat <<'EOF' | sudo tee /etc/sysctl.d/60-solana.conf
    net.core.rmem_max = 134217728
    net.core.rmem_default = 134217728
    net.core.wmem_max = 134217728
    net.core.wmem_default = 134217728
    net.ipv4.tcp_rmem = 4096 87380 134217728
    net.ipv4.tcp_wmem = 4096 65536 134217728
    net.core.somaxconn = 1024
    net.ipv4.tcp_syncookies = 1
    net.ipv4.tcp_max_syn_backlog = 4096
    net.ipv4.tcp_fin_timeout = 15
    fs.file-max = 1000000
    vm.max_map_count = 1000000
    EOF
    sudo sysctl --system

    # ---------------------------------------------------------------------

      # Install firewalld and configure firewall
      "sudo dnf install -y firewalld",
      "sudo systemctl enable --now firewalld",
      "sudo firewall-cmd --permanent --add-port=8899/tcp",
      "sudo firewall-cmd --permanent --add-port=8900/tcp",
      "sudo firewall-cmd --permanent --add-port=22/tcp",
      "sudo firewall-cmd --permanent --add-port=8000-8020/tcp",   # Open dynamic port range
      "sudo firewall-cmd --reload",
