# Use Node.js 18 with Alpine for smaller image size
FROM node:18-alpine

# Install Chromium and necessary dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium (we just installed it)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create downloads directory and set permissions
RUN mkdir -p downloads && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (optional, for health checks)
EXPOSE 3000

# Command to run the application
CMD ["node", "index.js"]