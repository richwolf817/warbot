sudo docker pull c29r3/solana-snapshot-finder:latest && \
sudo docker run -it --rm \
-v /home/ec2-user/solana/ledger:/solana/snapshot \
--user $(id -u ec2-user):$(id -g ec2-user) \
c29r3/solana-snapshot-finder:latest \
--snapshot_path /solana/snapshot