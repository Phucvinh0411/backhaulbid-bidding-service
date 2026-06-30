# ============================================
# Dockerfile for Node.js Bidding Service
# ============================================

FROM node:20-alpine
WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Build project
RUN npm run build

# Prune devDependencies to keep the runtime small
RUN npm prune --production

EXPOSE 3000

CMD ["node", "dist/main.js"]
