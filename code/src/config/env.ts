import { config } from 'dotenv'

config({ quiet: true })

export const env = {
  PORT: Number(process.env.PORT || 3000),
  JWT_ISSUER: process.env.JWT_ISSUER!,
  JWT_AUDIENCE: process.env.JWT_AUDIENCE!,
  JWKS_URL: process.env.JWKS_URL!,
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'RS256',
  JWT_PUBLIC_KEY_PATH:
    process.env.JWT_PUBLIC_KEY_PATH ||
    `${process.env.APP_ROOT || process.cwd()}/config/keys/public.jwks.json`,
  JWT_PRIVATE_KEY_PATH:
    process.env.JWT_PRIVATE_KEY_PATH ||
    `${process.env.APP_ROOT || process.cwd()}/config/keys/private.jwks.json`,
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 100),
  RATE_LIMIT_TIME_WINDOW: Number(process.env.RATE_LIMIT_TIME_WINDOW || 60000),
  ROUTES_CONFIG:
    process.env.ROUTES_CONFIG ||
    `${process.env.APP_ROOT || process.cwd()}/config/routes.json`,
  ENABLE_WEBSOCKET_PROXY: process.env.ENABLE_WEBSOCKET_PROXY === 'true',
  APP_ROOT: process.env.APP_ROOT || process.cwd(),
}
