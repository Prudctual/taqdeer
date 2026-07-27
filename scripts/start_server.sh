#!/bin/bash
echo "🚀 Starting Taqdeer 24/7 Auto-Sync Daemon..."
python3 scripts/auto_runner.py &

echo "🌐 Starting Taqdeer Next.js Server on port 10000..."
bun run start --port 10000
