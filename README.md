# JSC Gateway

JSC Gateway is a Fastify and TypeScript reverse proxy that sits in front of one or more upstream services. It validates JWT bearer tokens, enforces scope-based access rules, applies rate limits, optionally proxies WebSocket traffic, and forwards authenticated user context to downstream applications.

> **Package manager rule:** always use **Yarn** in this project. Do **not** use npm.

## What the application does

This gateway is designed to:

- validate JWTs against a JWKS endpoint
- enforce issuer and audience checks
- restrict access by required scopes per route
- proxy HTTP requests to upstream targets
- optionally proxy WebSocket traffic
- forward identity information to upstream services through headers
- expose a health endpoint and a public JWKS endpoint

When authentication succeeds, the gateway forwards these headers to the upstream service:

- `x-user-id`
- `x-user-role`
- `x-user-scope`

## Main endpoints exposed by the gateway

- `GET /health` returns `{ "status": "ok" }`
- `GET /.well-known/jwks.json` returns the public JWKS loaded from disk
- proxied routes are defined by the file referenced in `ROUTES_CONFIG`
- an example route file lives in `config/routes.example.json`

## Tech stack

- TypeScript
- Fastify
- jose
- @fastify/http-proxy
- @fastify/rate-limit

## Project structure

- `src/app.ts` builds and wires the Fastify application
- `src/server.ts` starts the HTTP server
- `src/plugins/auth.ts` validates JWTs and decorates the request
- `src/plugins/proxy.ts` registers the proxy routes and scope checks
- `src/plugins/rateLimit.ts` applies rate limiting
- `src/config/env.ts` loads and parses environment variables
- `src/config/routes.ts` loads the route definitions from `process.env.ROUTES_CONFIG`
- `src/scripts/generate-keys.ts` generates the public and private key files
- `src/scripts/generate-token.ts` creates JWTs for testing

## Prerequisites

- Node.js 20 or newer
- Yarn

## Getting started

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

3. Use the reference route file in the config folder, or copy it for your own setup:

   ```bash
   cp config/routes.example.json config/routes.json
   ```

4. Update the values in `.env`.

5. Start the gateway in development mode:

   ```bash
   yarn dev
   ```

## Available Yarn scripts

| Command                                       | Description                                  |
| --------------------------------------------- | -------------------------------------------- |
| `yarn dev`                                    | Run the gateway in watch mode                |
| `yarn build`                                  | Compile TypeScript into `dist/`              |
| `yarn start`                                  | Run the compiled application                 |
| `yarn lint`                                   | Run ESLint                                   |
| `yarn format`                                 | Format the codebase                          |
| `yarn generate-keys`                          | Generate the public and private signing keys |
| `yarn generate-token <sub> "<scope1,scope2>"` | Generate a test JWT                          |

## Environment variables

The application reads its runtime configuration from `.env` through `src/config/env.ts`.

| Variable                 | Required | Description                                                     | Example / Default                             |
| ------------------------ | -------- | --------------------------------------------------------------- | --------------------------------------------- |
| `PORT`                   | No       | Port used by the gateway                                        | `3000`                                        |
| `JWT_ISSUER`             | Yes      | Issuer that incoming tokens must match                          | `http://localhost:3000`                       |
| `JWT_AUDIENCE`           | Yes      | Audience that incoming tokens must match                        | `my-api`                                      |
| `JWKS_URL`               | Yes      | URL used by the auth plugin to fetch public signing keys        | `http://localhost:3000/.well-known/jwks.json` |
| `JWT_ALGORITHM`          | No       | JWT signing algorithm used for generated tokens                 | `RS512`                                       |
| `JWT_PUBLIC_KEY_PATH`    | No       | Path to the public JWKS file, relative to the project root      | `config/keys/public.jwks.json`                |
| `JWT_PRIVATE_KEY_PATH`   | No       | Path to the private key JSON file, relative to the project root | `config/keys/private.jwks.json`               |
| `RATE_LIMIT_MAX`         | No       | Max requests allowed in the rate-limit window                   | `100`                                         |
| `RATE_LIMIT_TIME_WINDOW` | No       | Rate-limit window in milliseconds                               | `60000`                                       |
| `ROUTES_CONFIG`          | No       | Path to the route definition file used by the proxy loader      | `../../config/routes.example.json`            |
| `ENABLE_WEBSOCKET_PROXY` | No       | Enables WebSocket proxy support when set to `true`              | `true` or `false`                             |

## Routes configuration

The reference file `config/routes.example.json` shows how upstream services should be configured. You can use it directly or copy it to another file in the `config/` directory and point `ROUTES_CONFIG` to that file.

Example:

```json
{
  "routes": [
    {
      "prefix": "/api",
      "target": "http://192.168.1.111:8080",
      "auth": true,
      "requiredScopes": ["read:my-api"]
    }
  ]
}
```

Each route object supports these fields:

| Field            | Type     | Description                                   |
| ---------------- | -------- | --------------------------------------------- |
| `prefix`         | string   | URL prefix handled by the gateway             |
| `target`         | string   | Upstream service base URL                     |
| `auth`           | boolean  | Whether the route requires JWT authentication |
| `requiredScopes` | string[] | List of scopes the token must contain         |

### Route behavior

- if `auth` is `true`, the request must include an Authorization bearer token
- if `requiredScopes` is set, the token must contain all listed scopes
- matching requests are proxied to the configured `target`

## Generating the public and private keys

The gateway includes a helper script for generating signing keys.

Run:

```bash
yarn generate-keys
```

What it does:

- creates an RSA key pair
- writes the public JWKS to the path defined by `JWT_PUBLIC_KEY_PATH`
- writes the private key JSON to the path defined by `JWT_PRIVATE_KEY_PATH`

With the current configuration, the generated files are typically stored under `config/keys/`.

## Generating test tokens

Use the token helper script to create a signed JWT for local testing.

Syntax:

```bash
yarn generate-token <subject> "<scope1,scope2>"
```

Examples:

```bash
yarn generate-token alice "read:my-api,admin"
```

The script:

- loads the private key from `JWT_PRIVATE_KEY_PATH`
- signs a JWT using `JWT_ALGORITHM`
- sets the configured issuer and audience
- prints the generated token to the terminal

Use the token in requests like this:

```http
Authorization: Bearer <your-token>
```

## Development workflow

A typical local workflow is:

1. install dependencies with Yarn
2. configure `.env`
3. run `yarn generate-keys`
4. start the gateway with `yarn dev`
5. create a token with `yarn generate-token alice "read:my-api,admin"`
6. call the protected routes using the generated bearer token

## License

MIT
