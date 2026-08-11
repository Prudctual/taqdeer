// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
const HOME = process.env.HOME || os.homedir() || "/home/ubuntu";
const ROOT = process.env.TAQDEER_ROOT || path.join(HOME, "taqdeer");
const BUN_BIN = process.env.BUN_BIN || path.join(HOME, ".bun/bin/bun");
const PATH_ENV = `${path.dirname(BUN_BIN)}:/usr/local/bin:/usr/bin:/bin`;

module.exports = {
  apps: [
    {
      name: "taqdeer-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: ROOT,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        PATH: PATH_ENV,
      },
    },
    {
      name: "taqdeer-auto-sync",
      script: ".venv/bin/python",
      args: "scripts/mlops_pipeline.py",
      cwd: ROOT,
      env: {
        PYTHONUNBUFFERED: "1",
        // PM2 لا يرث login shell — بدون هذا المسار يفشل العفريت بـ FileNotFoundError: bun
        PATH: PATH_ENV,
      },
    },
    {
      name: "taqdeer-telegram",
      script: "scripts/telegram-bot.ts",
      interpreter: BUN_BIN,
      cwd: ROOT,
      env: {
        PATH: PATH_ENV,
      },
    },
    {
      name: "taqdeer-enrich",
      script: ".venv/bin/python",
      args: "scripts/enrichment/run_enrichment.py",
      cwd: ROOT,
      env: {
        PYTHONUNBUFFERED: "1",
        PATH: PATH_ENV,
        DATABASE_URL: "file:./data/taqdeer.db",
        TAQDEER_ENRICH_CACHE: `${ROOT}/data/enrich-cache`,
        TAQDEER_ENRICH_LOCK: `${ROOT}/data/enrich.lock`,
      },
    },
    {
      name: "taqdeer-live",
      script: ".venv/bin/python",
      args: "scripts/live-poll.py",
      cwd: ROOT,
      env: {
        PYTHONUNBUFFERED: "1",
        PATH: PATH_ENV,
      },
    },
  ],
};
