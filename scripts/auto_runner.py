import time
import subprocess
import datetime
import os
import sys

INTERVAL_SECONDS = 3600  # المزامنة كل ساعة تلقائياً 24/7

def log(msg):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] 🤖 Taqdeer 24/7 Auto-Sync: {msg}", flush=True)

def run_pipeline():
    log("🚀 جاري مزامنة نتائج المباريات وتدريب نماذج التنبؤ تلقائياً...")
    try:
        res = subprocess.run(["bun", "run", "pipeline"], capture_output=True, text=True, check=True)
        log("✅ اكتملت المزامنة وتحديث النماذج بنجاح!")
    except Exception as e:
        log(f"⚠️ خطأ أثناء المزامنة: {e}")

def main():
    log("🌟 بدأت خدمة المزامنة المستمرة 24/7 لتطبيق «تقدير» (محدث كل ساعة)...")
    
    # Run once immediately on start
    run_pipeline()
    
    while True:
        log(f"⏳ الانتظار للمزامنة القادمة بعد ساعة واحدة ({INTERVAL_SECONDS} ثانية)...")
        time.sleep(INTERVAL_SECONDS)
        run_pipeline()

if __name__ == "__main__":
    main()
