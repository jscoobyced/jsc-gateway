import rateLimit from '@fastify/rate-limit'
import fp from 'fastify-plugin'
import { env } from '../config/env.js'

export const rateLimitPlugin = fp(async (fastify) => {
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
  })
})
