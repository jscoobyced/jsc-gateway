import 'fastify'
import type { preHandlerHookHandler } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preHandlerHookHandler
  }

  interface FastifyRequest {
    user?: {
      sub: string
      scope?: string[]
      role?: string
      [key: string]: unknown
    }
  }
}
