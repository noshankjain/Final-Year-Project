FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY .env.example ./.env.example

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
