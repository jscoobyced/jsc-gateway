import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from '../config/env.js'

const JWKS = createRemoteJWKSet(new URL(env.JWKS_URL))

export const authPlugin = fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = request.headers.authorization

      if (!auth?.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Missing token' })
        return
      }

      const token = auth.split(' ')[1]

      try {
        const { payload } = await jwtVerify(token, JWKS, {
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE,
        })

        if (typeof payload.sub !== 'string') {
          reply.code(401).send({ error: 'Invalid token' })
          return
        }

        request.user = {
          ...payload,
          sub: payload.sub,
          scope: Array.isArray(payload.scope)
            ? payload.scope.filter(
                (value): value is string => typeof value === 'string',
              )
            : typeof payload.scope === 'string'
              ? payload.scope.split(' ')
              : undefined,
          role: typeof payload.role === 'string' ? payload.role : undefined,
        }
      } catch {
        reply.code(401).send({ error: 'Invalid token' })
        return
      }
    },
  )
})
