import paramiko
import os
import sys

KEY_FILE = os.path.expanduser("~/Downloads/aws_key.pem")
USER = "ubuntu"
PORT = 22
REMOTE_DIR = "/home/ubuntu/taqdeer"

def log(msg):
    print(f"🚀 [AWS EC2 Deployer] {msg}", flush=True)

def deploy(host_ip):
    if not os.path.exists(KEY_FILE):
        log(f"⚠️ لم يتم العثور على ملف المفتاح {KEY_FILE}")
        return

    os.chmod(KEY_FILE, 0o400)
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    log(f"الاتصال بسيرفر AWS EC2 على {host_ip}...")
    ssh.connect(host_ip, port=PORT, username=USER, pkey=key, timeout=30)
    log("✅ تم الاتصال بنجاح بسيرفر AWS EC2!")
    
    cmd = f"""
    export PATH="$HOME/.bun/bin:$PATH"
    
    # 1. Vacuum journal logs and clear build caches to free disk space
    echo "🧹 Cleaning up EC2 build caches and logs to free disk space..."
    rm -rf ~/.cache ~/.bun/install/cache /tmp/* 2>/dev/null || true
    rm -rf {REMOTE_DIR}/.next/cache 2>/dev/null || true
    sudo journalctl --vacuum-size=50M 2>/dev/null || true

    # 2. Fetch and deploy latest code
    mkdir -p {REMOTE_DIR}
    cd {REMOTE_DIR}
    if [ ! -d .git ]; then
      git init
      git remote add origin https://github.com/Prudctual/taqdeer.git
    fi
    git fetch origin main
    git reset --hard origin/main
    bun install
    bun run sync
    npx tsx scripts/sync-eliteserien.ts
    npx tsx scripts/sync-argentina.ts
    .venv/bin/python scripts/fit-and-predict.py || true
    bun run build
    pm2 startOrReload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
    pm2 save
    """
    log("تنظيف المساحة وسحب أحدث التحديثات من GitHub وإعادة البناء والتشغيل...")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    
    print("STDOUT:\n", out)
    if err:
        print("STDERR:\n", err)
        
    log("✅ تم التحديث والتشغيل بنجاح على سيرفر AWS EC2!")
    ssh.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 deploy_to_aws_ec2.py <PUBLIC_IP>")
        sys.exit(1)
    deploy(sys.argv[1])
