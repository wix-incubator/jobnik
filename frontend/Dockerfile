FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies and build
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------
# Final stage: serve via Node.js
# ---------------------------
FROM node:18-alpine

# Install a static file server
RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy built files
COPY --from=build /app/dist .

# Expose default serve port
EXPOSE 3000

# Start the app
CMD ["serve", "-s", ".", "-l", "3000"]
