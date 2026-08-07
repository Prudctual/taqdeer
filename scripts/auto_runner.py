import time
import subprocess
import datetime
import json
import os
import shutil
import urllib.request
from pathlib import Path

INTERVAL_SECONDS = 3600  # المزامنة كل ساعة تلقائياً 24/7
ROOT = Path(__file__).resolve().parent.parent


def log(msg):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] 🤖 Taqdeer 24/7 Auto-Sync: {msg}", flush=True)


def _load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _ensure_path() -> None:
    extras = [
        str(Path.home() / ".bun" / "bin"),
        "/usr/local/bin",
        "/home/ubuntu/.bun/bin",
    ]
    path = os.environ.get("PATH", "")
    for p in extras:
        if p and p not in path and Path(p).exists():
            path = f"{p}:{path}"
    os.environ["PATH"] = path


def resolve_bun() -> str:
    found = shutil.which("bun")
    if found:
        return found
    for candidate in (
        Path.home() / ".bun" / "bin" / "bun",
        Path("/home/ubuntu/.bun/bin/bun"),
        Path("/usr/local/bin/bun"),
    ):
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError("bun غير موجود في PATH")


def notify_failure(step: str, detail: str) -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        log("⚠️ لا إعدادات Telegram — الفشل مسجل في اللوج فقط")
        return
    text = f"🚨 تقدير: فشل {step}\n{detail[:600]}"
    try:
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=json.dumps({"chat_id": chat_id, "text": text}).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:  # noqa: BLE001
        log(f"⚠️ تعذر إرسال إشعار Telegram: {e}")


def run_pipeline():
    log("🚀 جاري مزامنة نتائج المباريات وتدريب نماذج التنبؤ تلقائياً...")
    try:
        bun = resolve_bun()
        subprocess.run(
            [bun, "run", "pipeline"],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=True,
            env={**os.environ},
        )
        log("✅ اكتملت المزامنة وتحديث النماذج بنجاح!")
    except subprocess.CalledProcessError as e:
        tail = (e.stderr or e.stdout or "")[-600:]
        log(f"⚠️ خطأ أثناء المزامنة: {tail}")
        notify_failure("المزامنة/التدريب (pipeline)", tail)
    except Exception as e:  # noqa: BLE001
        log(f"⚠️ خطأ أثناء المزامنة: {e}")
        notify_failure("المزامنة/التدريب (pipeline)", str(e))


def main():
    _load_env_file()
    _ensure_path()
    log("🌟 بدأت خدمة المزامنة المستمرة 24/7 لتطبيق «تقدير» (محدث كل ساعة)...")
    run_pipeline()
    while True:
        log(f"⏳ الانتظار للمزامنة القادمة بعد ساعة واحدة ({INTERVAL_SECONDS} ثانية)...")
        time.sleep(INTERVAL_SECONDS)
        run_pipeline()


if __name__ == "__main__":
    main()
