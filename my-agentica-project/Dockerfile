# Stage 1: Build the TypeScript application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (includes puppeteer)
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine

WORKDIR /app

# 🧩 Puppeteer runtime dependencies (chromium + fonts)
RUN apk add --no-cache \
    chromium nss freetype harfbuzz ttf-freefont ca-certificates udev dumb-init

# Puppeteer config (skip chromium download)
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 비root 사용자 추가 (sandbox 문제 해결)
RUN addgroup -S pptr && adduser -S -G pptr pptr
RUN mkdir -p /home/pptr/Downloads && chown -R pptr:pptr /home/pptr

# Copy build artifacts and node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

RUN chown -R pptr:pptr /app

USER pptr

# Expose port
EXPOSE 3001

# Start command
CMD ["npm", "start"]