FROM node:20-slim

# Install Python3, pip, curl, sqlite3 and build tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Copy dependency manifests
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Create virtualenv and install python dependencies
RUN python3 -m venv /app/.venv
ENV PATH="/app/.venv/bin:${PATH}"
RUN pip install pandas numpy scipy scikit-learn

# Copy application files
COPY . .

# Make start script executable
RUN chmod +x scripts/start_server.sh

# Build SQLite databases and standings
RUN python3 scripts/build_historic_standings.py
RUN python3 scripts/build_2026_season_standings.py

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN bun run build

EXPOSE 10000

ENV PORT 10000
ENV NODE_ENV production
ENV PYTHONPATH python

CMD ["bash", "scripts/start_server.sh"]
