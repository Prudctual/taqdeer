import paramiko
import os
import sys
import time

USER = "root"
PORT = 22
REMOTE_DIR = "/root/taqdeer"

def log(msg):
    print(f"🚀 [VPS Deployer] {msg}", flush=True)

def deploy(host_ip, password):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    log(f"Connecting to VPS at {host_ip}...")
    try:
        ssh.connect(host_ip, port=PORT, username=USER, password=password, timeout=30)
        log("✅ Connected successfully to the VPS!")
    except Exception as e:
        log(f"❌ Failed to connect: {e}")
        return
    
    cmd = f"""
    export PATH="$HOME/.bun/bin:$PATH"
    
    # 1. Clear build caches to free disk space
    echo "🧹 Cleaning up VPS build caches and logs to free disk space..."
    rm -rf ~/.cache ~/.bun/install/cache 2>/dev/null || true
    rm -rf {REMOTE_DIR}/.next/cache 2>/dev/null || true

    # 2. Fetch and deploy latest code
    mkdir -p {REMOTE_DIR}
    git config --global --add safe.directory {REMOTE_DIR}
    cd {REMOTE_DIR}
    if [ ! -d .git ]; then
      git init
    fi
    git remote remove origin 2>/dev/null || true
    git remote add origin https://github.com/Prudctual/taqdeer.git
    git fetch origin main
    git reset --hard origin/main
    
    # Run sync and build
    bun install || true
    bun run sync
    if [ -f .venv/bin/python ]; then
        .venv/bin/python scripts/fit-and-predict.py || true
    fi
    bun run build
    
    # Start or reload pm2
    pm2 startOrReload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
    pm2 save
    """
    
    log("Cleaning space, pulling latest updates from GitHub, rebuilding and starting...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Print the output in real-time or wait for it to finish
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    print("STDOUT:\n", out)
    if err:
        print("STDERR:\n", err)
        
    if exit_status == 0:
        log("✅ Update and deployment completed successfully on the VPS!")
    else:
        log(f"❌ Deployment failed with exit status {exit_status}")
        
    ssh.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 deploy_to_vps.py <PUBLIC_IP> <PASSWORD>")
        sys.exit(1)
    deploy(sys.argv[1], sys.argv[2])
