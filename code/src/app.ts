import Fastify from 'fastify'
import type { JWK } from 'jose'
import { readFileSync } from 'node:fs'
import { env } from './config/env.js'
import { authPlugin } from './plugins/auth.js'
import { proxyPlugin } from './plugins/proxy.js'
import { rateLimitPlugin } from './plugins/rateLimit.js'

const keyDir = new URL('../', import.meta.url)
const publicJwks = JSON.parse(
  readFileSync(new URL(env.JWT_PUBLIC_KEY_PATH, keyDir), 'utf8'),
) as { keys: JWK[] }

const [publicJwk] = publicJwks.keys

export const buildApp = (): ReturnType<typeof Fastify> => {
  const app = Fastify({
    logger: true,
  })

  app.register(rateLimitPlugin)
  app.register(authPlugin)
  app.register(proxyPlugin)

  app.get('/health', async () => {
    return { status: 'ok' }
  })

  app.get('/.well-known/jwks.json', async () => {
    return {
      keys: publicJwk ? [publicJwk] : [],
    }
  })

  return app
}
