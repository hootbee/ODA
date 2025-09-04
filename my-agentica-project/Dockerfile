# Stage 1: Build the TypeScript application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /app

# Copy built files and production dependencies from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Expose port 3001
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
