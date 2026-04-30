FROM node:22-alpine AS deps

WORKDIR /app

# Git is required by Graft tests and runtime repo inspection.
RUN apk add --no-cache git

# Install the package-manager version declared by package.json.
RUN corepack enable && corepack prepare pnpm@10.30.0 --activate

# Copy package manifests and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

FROM deps AS build

WORKDIR /app
COPY . .
RUN pnpm build

FROM build AS test

ENV CI=1
ENV GRAFT_TEST_CONTAINER=1
ENV NO_COLOR=1

CMD ["pnpm", "test"]

FROM deps AS runtime

WORKDIR /app

COPY bin/ bin/
COPY package.json ./
COPY --from=build /app/dist dist/
RUN pnpm prune --prod

# The project being analyzed is mounted at /workspace
VOLUME /workspace

# Run as non-root to avoid root-owned files on Linux bind mounts.
# node:22-alpine provides the 'node' user (uid 1000).
USER node

# Set working directory to the mounted project
WORKDIR /workspace

# Set NODE_PATH so imports resolve from /app/node_modules even when
# working directory is /workspace (which may have its own node_modules
# from a different platform).
ENV NODE_PATH=/app/node_modules

# MCP stdio transport — no TTY needed
ENTRYPOINT ["node", "/app/bin/graft.js"]
