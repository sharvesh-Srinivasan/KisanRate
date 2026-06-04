# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first so layer is cached unless deps change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -S kisanrate && adduser -S kisanrate -G kisanrate

WORKDIR /app

# Copy only production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove any local .env (runtime env should come from docker-compose / k8s secrets)
RUN rm -f .env

USER kisanrate

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "index.js"]
