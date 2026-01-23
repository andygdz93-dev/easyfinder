# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /repo

# Corepack so Fly uses the pnpm version you pin
RUN corepack enable

# 1) Copy workspace manifests first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

# 2) Install all workspace deps (this is the missing step on Fly)
RUN pnpm install --frozen-lockfile


# 3) Copy the rest of the repo
COPY . .

# 4) Build shared first (needs zod), then api
RUN pnpm --filter @easyfinderai/shared build
RUN pnpm --filter @easyfinderai/api build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only what API needs at runtime
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json

# Copy node_modules required at runtime.
# (This is simplest & reliable. Can optimize later with pnpm deploy/prune.)
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/dist ./node_modules/@easyfinderai/shared/dist
COPY --from=build /repo/packages/shared/package.json ./node_modules/@easyfinderai/shared/package.json

EXPOSE 8080
CMD ["node", "dist/server.js"]
