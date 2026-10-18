FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Dev stage ----
FROM base AS dev
COPY . .
RUN sed -i 's/\r$//' entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "entrypoint.sh"]

# ---- Build stage ----
FROM base AS builder
COPY . .
RUN rm -rf dist && npm run build

# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]