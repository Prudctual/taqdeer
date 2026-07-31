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
      },
    },
    {
      name: "taqdeer-auto-sync",
      script: ".venv/bin/python",
      args: "scripts/mlops_pipeline.py",
      cwd: "/home/ubuntu/taqdeer",
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
    {
      name: "taqdeer-telegram",
      script: "scripts/telegram-bot.ts",
      interpreter: "bun",
      cwd: "/home/ubuntu/taqdeer",
    },
  ],
};
