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

RUN test -d node_modules/zod && echo "zod present" || (echo "zod missing" && ls -la node_modules && exit 1)


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

# If your API imports runtime JS from shared/dist, copy it too
COPY --from=build /repo/packages/shared/dist ./packages/shared/dist
COPY --from=build /repo/packages/shared/package.json ./packages/shared/package.json

# Install production deps for API only
RUN corepack enable \
  && pnpm install --prod --frozen-lockfile

EXPOSE 8080
CMD ["node", "dist/server.js"]
