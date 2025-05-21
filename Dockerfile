# Use Node.js LTS version as base
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
# RUN pnpm install

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 4242

# Start the server
CMD ["node", "src/server.js"]
