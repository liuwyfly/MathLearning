#!/bin/bash
set -e

# init-swarm.sh
# Run this on the FIRST manager node (node-1) to initialize the Docker Swarm.
# After execution, copy the generated 'join-command.sh' to other nodes and run it there.

PRIMARY_IP=""

# Try to auto-detect a reasonable private IP
for ip in $(hostname -I 2>/dev/null || true); do
  # Pick the first RFC1918 private IP
  if [[ "$ip" =~ ^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.) ]]; then
    PRIMARY_IP="$ip"
    break
  fi
done

if [ -z "$PRIMARY_IP" ]; then
  echo "Could not auto-detect a private IP address."
  echo "Please set it manually, e.g.:"
  echo "  export PRIMARY_IP=192.168.1.11"
  echo "Then re-run this script."
  exit 1
fi

echo "Using primary IP: $PRIMARY_IP"
echo "Initializing Docker Swarm..."
docker swarm init --advertise-addr "$PRIMARY_IP"

echo ""
echo "Generating join-command.sh for worker/manager nodes..."
JOIN_TOKEN=$(docker swarm join-token -q manager)
JOIN_CMD="docker swarm join --token $JOIN_TOKEN $PRIMARY_IP:2377"

cat > join-command.sh <<EOF
#!/bin/bash
# Run this script on the other nodes to join the Swarm as managers
$JOIN_CMD
EOF

chmod +x join-command.sh

echo ""
echo "=========================================="
echo "Swarm initialized successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy 'join-command.sh' to node-2 and node-3."
echo "2. On each node, run: ./join-command.sh"
echo "3. Back on this node, verify with: docker node ls"
echo ""
