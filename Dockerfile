# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /repo

RUN corepack enable

# Put pnpm store INSIDE the repo so it can be copied between stages
ENV PNPM_STORE_PATH=/repo/.pnpm-store

# Cache-buster (optional but recommended to defeat Depot cache)
ARG CACHEBUST=1
RUN echo "cachebust=$CACHEBUST"

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN mkdir -p apps/api packages/shared
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# Force pnpm to use the in-repo store
RUN pnpm config set store-dir ${PNPM_STORE_PATH}

RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /repo

RUN corepack enable
ENV PNPM_STORE_PATH=/repo/.pnpm-store

# Copy node_modules + pnpm store from deps stage
COPY --from=deps /repo/node_modules /repo/node_modules
COPY --from=deps /repo/.pnpm-store /repo/.pnpm-store
COPY --from=deps /repo/pnpm-lock.yaml /repo/pnpm-lock.yaml
COPY --from=deps /repo/package.json /repo/package.json
COPY --from=deps /repo/pnpm-workspace.yaml /repo/pnpm-workspace.yaml
COPY --from=deps /repo/apps/api/package.json /repo/apps/api/package.json
COPY --from=deps /repo/packages/shared/package.json /repo/packages/shared/package.json

# Copy source
COPY . .

# Build shared then api
RUN pnpm --filter @easyfinderai/shared build
RUN pnpm --filter @easyfinderai/api build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules

# Ensure shared workspace package is present at runtime
COPY --from=build /repo/packages/shared/dist ./node_modules/@easyfinderai/shared/dist
COPY --from=build /repo/packages/shared/package.json ./node_modules/@easyfinderai/shared/package.json

EXPOSE 8080
CMD ["node", "dist/index.js"]