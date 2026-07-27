import subprocess
import base64
import json
import os

def log(msg):
    print(f"📦 [GitHub API Pusher] {msg}")

def push_file_via_api(filepath):
    token = subprocess.check_output(["gh", "auth", "token"]).decode("utf-8").strip()
    if not os.path.exists(filepath):
        return
    
    with open(filepath, "rb") as f:
        content = base64.b64encode(f.read()).decode("utf-8")
        
    url = f"https://api.github.com/repos/Prudctual/taqdeer/contents/{filepath}"
    
    # Check if file exists to get sha
    sha = None
    try:
        check_res = subprocess.check_output(
            ["curl", "-s", "-H", f"Authorization: token {token}", url]
        )
        data = json.loads(check_res)
        if "sha" in data:
            sha = data["sha"]
    except Exception:
        pass
        
    payload = {
        "message": f"add/update {filepath}",
        "content": content,
        "branch": "main"
    }
    if sha:
        payload["sha"] = sha
        
    res = subprocess.check_output([
        "curl", "-s", "-X", "PUT",
        "-H", f"Authorization: token {token}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload),
        url
    ]).decode("utf-8")
    
    log(f"Pushed {filepath} -> {res[:100]}")

def main():
    files = [
        "render.yaml",
        "Dockerfile",
        "Dockerfile.cron",
        "package.json",
        "README.md",
        "scripts/auto_runner.py",
        "scripts/build_2026_season_standings.py",
        "scripts/build_historic_standings.py",
        "src/app/leagues/[id]/page.tsx",
        "src/app/page.tsx",
        "src/lib/queries.ts"
    ]
    for f in files:
        push_file_via_api(f)

if __name__ == "__main__":
    main()
