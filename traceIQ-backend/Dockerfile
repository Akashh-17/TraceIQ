# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# bcrypt uses native C bindings — needs compiler toolchain
RUN apk add --no-cache python3 make g++

# Install all deps (devDeps needed for tsc + prisma generate)
COPY package*.json ./
RUN npm ci

# Generate Prisma client before compiling (types depend on it)
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript
COPY tsconfig.json .
COPY src ./src
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Still need build tools for bcrypt native binding
RUN apk add --no-cache python3 make g++

# Full install so prisma CLI is available for `prisma migrate deploy`
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Run pending DB migrations then start the API server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
