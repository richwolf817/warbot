✅ Steps to Verify After Reboot
Once your AMI is deployed, verify that everything persists:

1️⃣ Check CPU Governor:

sh
Copy
Edit
cat /sys/devices/system/cpu/cpu\*/cpufreq/scaling_governor
Expected output: performance
2️⃣ Check Networking Settings:

sh
Copy
Edit
sysctl -a | grep net.core
sysctl -a | grep tcp_congestion_control
Expected output: net.ipv4.tcp_congestion_control = bbr
3️⃣ Check NVMe Disk Settings:

sh
Copy
Edit
lsblk -o NAME,SCHED,RQ-SIZE
Expected output: noop scheduler
4️⃣ Check NUMA Balancing:

sh
Copy
Edit
sysctl -a | grep numa
sysctl -a | grep zone_reclaim_mode
Expected output: kernel.numa_balancing = 1
