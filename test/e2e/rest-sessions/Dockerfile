FROM node:22-slim
RUN apt-get update && apt-get install -y git jq curl && rm -rf /var/lib/apt/lists/*
RUN git config --global user.email "test@graft.local" && git config --global user.name "Graft Test"
ENV GIT_AUTHOR_NAME="Graft E2E"
ENV GIT_AUTHOR_EMAIL="e2e@graft.local"
ENV GIT_COMMITTER_NAME="Graft E2E"
ENV GIT_COMMITTER_EMAIL="e2e@graft.local"
RUN npm install -g pnpm@10.30.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["pnpm", "exec", "tsx", "test/e2e/rest-sessions/entrypoint.ts"]
