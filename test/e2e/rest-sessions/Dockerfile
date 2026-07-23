FROM node:20-slim
RUN apt-get update && apt-get install -y git jq curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.30.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["pnpm", "exec", "tsx", "test/e2e/rest-sessions/entrypoint.ts"]
