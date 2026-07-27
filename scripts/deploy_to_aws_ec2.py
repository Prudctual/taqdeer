import paramiko
import os
import sys
import tarfile
import time

KEY_FILE = os.path.expanduser("~/Downloads/aws_key.pem")
USER = "ubuntu"
PORT = 22
REMOTE_DIR = "/home/ubuntu/taqdeer"
TAR_FILE = "taqdeer_aws_deploy.tar.gz"

def log(msg):
    print(f"🚀 [AWS EC2 Deployer] {msg}", flush=True)

def create_archive():
    log("جاري ضغط ملفات المشروع للنقل إلى سيرفر AWS EC2...")
    ignore_dirs = {".git", ".next", "node_modules", ".venv", "__pycache__"}
    
    with tarfile.open(TAR_FILE, "w:gz") as tar:
        for root, dirs, files in os.walk("."):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            for file in files:
                filepath = os.path.join(root, file)
                if file == TAR_FILE or file.endswith(".log"):
                    continue
                arcname = os.path.relpath(filepath, ".")
                tar.add(filepath, arcname=arcname)
    log(f"تم إنشاء الأرشيف: {os.path.getsize(TAR_FILE)} بايت")

def deploy(host_ip):
    if not os.path.exists(KEY_FILE):
        log(f"⚠️ لم يتم العثور على ملف المفتاح {KEY_FILE}")
        return

    os.chmod(KEY_FILE, 0o400)
    create_archive()
    
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    log(f"الاتصال بسيرفر AWS EC2 على {host_ip}...")
    ssh.connect(host_ip, port=PORT, username=USER, pkey=key, timeout=30)
    log("✅ تم الاتصال بنجاح بسيرفر AWS EC2!")
    
    sftp = ssh.open_sftp()
    ssh.exec_command(f"mkdir -p {REMOTE_DIR}")
    
    log(f"رفع ملفات المشروع إلى السيرفر...")
    sftp.put(TAR_FILE, f"{REMOTE_DIR}/{TAR_FILE}")
    sftp.close()
    
    def run_remote(cmd, title):
        log(f"تشغيل على AWS: {title}...")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if exit_status != 0:
            print(f"⚠️ Error ({exit_status}): {err[:300]}")
        else:
            print(f"✅ Success: {out[:200]}")
        return exit_status, out, err

    run_remote(f"cd {REMOTE_DIR} && tar -xzf {TAR_FILE} && rm -f {TAR_FILE}", "فك ضغط الكود")

    # Install packages, node, bun, python, pm2
    setup_script = """
    sudo apt-get update -y
    sudo apt-get install -y curl python3 python3-pip python3-venv sqlite3 build-essential libcap2-bin
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    if ! command -v bun &> /dev/null; then
        curl -fsSL https://bun.sh/install | bash
    fi
    
    export PATH="$HOME/.bun/bin:$PATH"
    
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
    fi
    
    # Allow node to bind to port 80 without root
    sudo setcap 'cap_net_bind_service=+ep' $(which node) || true
    """
    run_remote(f"bash -c '{setup_script}'", "تثبيت البيئة وتجهيز السيرفر")

    build_script = f"""
    export PATH="$HOME/.bun/bin:$PATH"
    cd {REMOTE_DIR}
    bun install
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install pandas numpy scipy scikit-learn
    python3 scripts/build_historic_standings.py
    python3 scripts/build_2026_season_standings.py
    bun run build
    """
    run_remote(f"bash -c '{build_script}'", "تثبيت الحزم وبناء النماذج والموقع")

    start_script = f"""
    export PATH="$HOME/.bun/bin:$PATH"
    cd {REMOTE_DIR}
    pm2 delete taqdeer-web || true
    pm2 delete taqdeer-sync || true
    pm2 start "bun run start --port 80" --name "taqdeer-web"
    pm2 start "python3 scripts/auto_runner.py" --name "taqdeer-sync"
    pm2 save
    sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu || true
    """
    run_remote(f"bash -c '{start_script}'", "تشغيل التطبيق والمزامنة المستمرة 24/7 عبر PM2")

    log(f"🎉 تم النشر الكامل بنجاح على AWS EC2! يمكنك تصفح الموقع الآن على: http://{host_ip}")
    ssh.close()
    
    if os.path.exists(TAR_FILE):
        os.remove(TAR_FILE)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        deploy(sys.argv[1])
    else:
        print("Usage: python3 deploy_to_aws_ec2.py <PUBLIC_IP>")
