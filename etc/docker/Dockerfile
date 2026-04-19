ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS builder

# Install dependencies
RUN apk update && apk upgrade

# Install corepack and set yarn to stable version
RUN corepack enable
RUN yarn set version classic

WORKDIR /app

# Build frontend
COPY code/ ./

RUN yarn --cwd code install
RUN yarn --cwd code build

# Production image
FROM node:${NODE_VERSION}

COPY --from=builder /app/dist /app/
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/.env.example /app/.env
COPY code/config/routes.example.json /app/config/routes.json
RUN mkdir -p /app/config/keys

EXPOSE 3000

WORKDIR /app
CMD ["node", "server.js"]