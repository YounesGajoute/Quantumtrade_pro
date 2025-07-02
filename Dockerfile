FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Expose port
EXPOSE 3000

# Start the application in development mode
CMD ["pnpm", "dev"] 