# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile

RUN rm -rf /repo/packages/shared/dist /repo/packages/shared/*.tsbuildinfo || true
RUN pnpm --filter @easyfinderai/shared build
RUN sh -lc '\
echo "DEBUG_SHARED_BEGIN"; \
echo "HAS_SHARED_DIST_INDEX_DTS=$(test -f /repo/packages/shared/dist/index.d.ts && echo yes || echo no)"; \
echo "--- shared dist files ---"; ls -1 /repo/packages/shared/dist || true; \
echo "--- api node_modules shared package.json ---"; \
cat /repo/apps/api/node_modules/@easyfinderai/shared/package.json 2>/dev/null || echo "MISSING: api node_modules shared package.json"; \
echo "--- has api node_modules shared dist/index.d.ts ---"; \
echo "HAS_API_NODEMODULES_SHARED_DTS=$(test -f /repo/apps/api/node_modules/@easyfinderai/shared/dist/index.d.ts && echo yes || echo no)"; \
echo "DEBUG_SHARED_END"; \
exit 1'
RUN pnpm --filter @easyfinderai/api build

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
