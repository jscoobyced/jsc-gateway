import proxy from '@fastify/http-proxy'
import { FastifyPluginAsync } from 'fastify'
import { env } from '../config/env.js'
import { routes } from '../config/routes.js'

export const proxyPlugin: FastifyPluginAsync = async (fastify) => {
  for (const route of routes) {
    fastify.register(async (instance) => {
      // Auth hook
      if (route.auth) {
        instance.addHook('preHandler', instance.authenticate)

        if (route.requiredScopes) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          instance.addHook('preHandler', async (request: any, reply: any) => {
            const scopes = request.user?.scope || []

            const hasAllScopes = route.requiredScopes!.every((s) =>
              scopes.includes(s),
            )

            if (!hasAllScopes) {
              return reply.code(403).send({ error: 'Forbidden' })
            }
          })
        }
      }

      // Proxy registration
      instance.register(proxy, {
        upstream: route.target,
        prefix: route.prefix,
        rewritePrefix: '',
        http2: false,
        websocket: env.ENABLE_WEBSOCKET_PROXY,

        replyOptions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rewriteRequestHeaders: (req: any, headers: any) => {
            if (req.user) {
              headers['x-user-id'] = req.user.sub
              headers['x-user-role'] = req.user.role || ''
              headers['x-user-scope'] = (req.user.scope || []).join(' ')
            }
            return headers
          },
        },
      })
    })
  }
}
