import paramiko
import os
import tarfile
import time

HOST = "107.175.230.41"
PORT = 2222
USER = "root"
PASS = "j7PZ2Z9Sy12gv4yMBs"
REMOTE_DIR = "/root/taqdeer"
TAR_FILE = "taqdeer_deploy.tar.gz"

def log(msg):
    print(f"🚀 [VPS Deployer] {msg}", flush=True)

def create_archive():
    log("جاري ضغط ملفات المشروع للاستعداد للنقل إلى السيرفر...")
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
    log(f"تم إنشاء الأرشيف بنجاح: {os.path.getsize(TAR_FILE)} بايت")

def deploy():
    create_archive()
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    log(f"الاتصال بالسيرفر {HOST}...")
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    log("✅ تم الاتصال بالسيرفر بنجاح!")
    
    sftp = ssh.open_sftp()
    
    # Create remote directory
    ssh.exec_command(f"mkdir -p {REMOTE_DIR}")
    
    log(f"رفع ملف الأرشيف إلى {REMOTE_DIR}/{TAR_FILE}...")
    sftp.put(TAR_FILE, f"{REMOTE_DIR}/{TAR_FILE}")
    sftp.close()
    
    # Helper to execute remote command and stream output
    def run_remote(cmd, title):
        log(f"تشغيل على السيرفر: {title} ({cmd})...")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if exit_status != 0:
            print(f"⚠️ Error output:\n{err}")
        else:
            print(f"Output:\n{out[:300]}")
        return exit_status, out, err

    # Extract archive
    run_remote(f"cd {REMOTE_DIR} && tar -xzf {TAR_FILE} && rm -f {TAR_FILE}", "فك ضغط المشروع")

    # Install Node.js, Bun, Python3, PM2 if needed
    install_script = """
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y > /dev/null 2>&1
    apt-get install -y curl python3 python3-pip python3-venv build-essential sqlite3 > /dev/null 2>&1
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
        apt-get install -y nodejs > /dev/null 2>&1
    fi
    
    if ! command -v bun &> /dev/null; then
        curl -fsSL https://bun.sh/install | bash > /dev/null 2>&1
        export PATH="$HOME/.bun/bin:$PATH"
    fi
    
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2 > /dev/null 2>&1
    fi
    """
    run_remote(f"bash -c '{install_script}'", "تثبيت Node.js و Bun و Python3 و PM2 على السيرفر")

    # Setup environment and dependencies on remote VPS
    setup_cmd = f"""
    export PATH="$HOME/.bun/bin:$PATH"
    cd {REMOTE_DIR}
    bun install
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install pandas numpy scipy scikit-learn sqlite3 || .venv/bin/pip install pandas numpy scipy scikit-learn
    python3 scripts/build_historic_standings.py
    python3 scripts/build_2026_season_standings.py
    bun run build
    """
    run_remote(f"bash -c '{setup_cmd}'", "تثبيت الحزم وبناء المشروع على السيرفر")

    # Start 24/7 Services with PM2 on remote VPS
    pm2_cmd = f"""
    export PATH="$HOME/.bun/bin:$PATH"
    cd {REMOTE_DIR}
    pm2 delete taqdeer-web || true
    pm2 delete taqdeer-sync || true
    pm2 start "bun run start --port 80" --name "taqdeer-web"
    pm2 start "python3 scripts/auto_runner.py" --name "taqdeer-sync"
    pm2 save
    pm2 startup || true
    """
    run_remote(f"bash -c '{pm2_cmd}'", "تشغيل التطبيق ومخدم المزامنة المستمرة 24/7 عبر PM2")

    log("🎉 تم النشر الكامل والتثبيت بنجاح على السيرفر 107.175.230.41!")
    ssh.close()
    
    # Remove local tar
    if os.path.exists(TAR_FILE):
        os.remove(TAR_FILE)

if __name__ == "__main__":
    deploy()
