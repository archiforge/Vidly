# syntax=docker/dockerfile:1

# ---- Install all dependencies (cached until a manifest or the lockfile changes) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/client/package.json apps/client/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- Build the client bundle and the server bundle ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- Production dependencies of the server only ----
# Starts from `deps` so the reinstall is served from the shared npm cache, not the network.
FROM deps AS prod-deps
RUN --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev --workspace @vidly/server --prefer-offline --no-audit --no-fund \
  && mkdir -p apps/server/node_modules

# ---- Runtime image: the API, which also serves the built admin portal ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3900
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/client/dist ./apps/client/dist

USER node
EXPOSE 3900
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3900/api/health > /dev/null || exit 1
CMD ["node", "apps/server/dist/index.js"]
