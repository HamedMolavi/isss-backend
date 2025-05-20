###################################################################### Stage 1: Build and obfuscate
FROM node:18.16.0-slim as builder

WORKDIR /app

# Install required tools
RUN npm install -g typescript@5.1.6 javascript-obfuscator@4.1.1

# Copy source code
COPY . .

# Compile TypeScript
RUN tsc

# Obfuscate compiled JavaScript
RUN javascript-obfuscator ./build --output ./obfuscated

###################################################################### Stage 2: Runtime only (lighter image)
FROM node:18.16.0-alpine as runtime

WORKDIR /isss-backend

RUN apk update && apk add --no-cache make gcc g++ python3
    # && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy obfuscated code
COPY --from=builder /app/obfuscated ./src

# Copy any other necessary files
COPY --from=builder /app/security ./security

EXPOSE 3000

CMD [ "node", "./src/server.js" ]