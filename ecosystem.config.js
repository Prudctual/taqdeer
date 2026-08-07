module.exports = {
  apps: [
    {
      name: "taqdeer-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/home/ubuntu/taqdeer",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        PATH: "/home/ubuntu/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      },
    },
    {
      name: "taqdeer-auto-sync",
      script: ".venv/bin/python",
      args: "scripts/mlops_pipeline.py",
      cwd: "/home/ubuntu/taqdeer",
      env: {
        PYTHONUNBUFFERED: "1",
        // PM2 لا يرث login shell — بدون هذا المسار يفشل العفريت بـ FileNotFoundError: bun
        PATH: "/home/ubuntu/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      },
    },
    {
      name: "taqdeer-telegram",
      script: "scripts/telegram-bot.ts",
      interpreter: "/home/ubuntu/.bun/bin/bun",
      cwd: "/home/ubuntu/taqdeer",
      env: {
        PATH: "/home/ubuntu/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      },
    },
    {
      name: "taqdeer-enrich",
      script: ".venv/bin/python",
      args: "scripts/enrichment/run_enrichment.py",
      cwd: "/home/ubuntu/taqdeer",
      env: {
        PYTHONUNBUFFERED: "1",
        PATH: "/home/ubuntu/.bun/bin:/usr/local/bin:/usr/bin:/bin",
        DATABASE_URL: "file:./data/taqdeer.db",
        TAQDEER_ENRICH_CACHE: "/home/ubuntu/taqdeer/data/enrich-cache",
        TAQDEER_ENRICH_LOCK: "/home/ubuntu/taqdeer/data/enrich.lock",
      },
    },
  ],
};
