# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @easyfinderai/shared build
RUN echo "DEBUG_SHARED_DIST_V2" && ls -la /repo/packages/shared/dist && echo "----" && ls -la /repo/packages/shared/dist/*.d.ts || true
RUN pnpm --filter @easyfinderai/api build

# after your build + deploy step:
RUN pnpm --filter @easyfinderai/api deploy --prod /out

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# prod deps from pnpm deploy output
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules

# ✅ compiled app from the real build output
COPY --from=build /repo/apps/api/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
