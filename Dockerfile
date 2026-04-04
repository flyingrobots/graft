FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifests and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY bin/ bin/
COPY src/ src/

# The project being analyzed is mounted at /workspace
VOLUME /workspace

# Set working directory to the mounted project
WORKDIR /workspace

# Set NODE_PATH so imports resolve from /app/node_modules even when
# working directory is /workspace (which may have its own node_modules
# from a different platform).
ENV NODE_PATH=/app/node_modules

# MCP stdio transport — no TTY needed
ENTRYPOINT ["node", "--import", "/app/node_modules/tsx/dist/esm/index.mjs", "/app/bin/graft.js"]
