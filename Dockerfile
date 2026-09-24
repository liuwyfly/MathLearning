# syntax=docker/dockerfile:1
# Multi-stage build for Fastify TypeScript app

ARG NODE_VERSION=ht-repo-registry.cn-heyuan.cr.aliyuncs.com/ht-elite/node:24-alpine3.24

# npm registry mirror; override with --build-arg NPM_REGISTRY=... when needed
ARG NPM_REGISTRY=https://registry.npmmirror.com

# ====================
# Stage 1: Build
# ====================
FROM ${NODE_VERSION} AS builder

ARG NPM_REGISTRY

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY}

# Copy source, generate Prisma client and build
COPY . .
RUN npx prisma generate && npm run build:ts

# ====================
# Stage 2: Production
# ====================
FROM ${NODE_VERSION} AS production

ARG NPM_REGISTRY

# Alpine apk mirror; override with --build-arg APK_MIRROR=... when needed
ARG APK_MIRROR=https://mirrors.aliyun.com

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --registry=${NPM_REGISTRY} && npm cache clean --force

# Configure container timezone to Asia/Shanghai
RUN sed -i "s|https://dl-cdn.alpinelinux.org|${APK_MIRROR}|g" /etc/apk/repositories && \
  apk add --no-cache tzdata && \
  ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
  echo "Asia/Shanghai" > /etc/timezone
ENV TZ=Asia/Shanghai

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy entrypoint for Docker Secrets support
COPY docker-entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
  chmod +x /usr/local/bin/docker-entrypoint.sh

# Use non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001

USER fastify

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

EXPOSE 3000

ENV FASTIFY_ADDRESS=0.0.0.0
ENV FASTIFY_PORT=3000
ENV NODE_ENV=production

# Healthcheck: respects FASTIFY_ROUTE_PREFIX (e.g. /auth-serv) at runtime
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000' + (process.env.FASTIFY_ROUTE_PREFIX || '') + '/ping', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"


CMD ["sh", "-c", "exec npx fastify start -l \"${FASTIFY_LOG_LEVEL:-info}\" dist/app.js"]
