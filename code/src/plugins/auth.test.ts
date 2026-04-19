import { afterEach, describe, expect, it, jest } from '@jest/globals'
import type { FastifyReply, FastifyRequest } from 'fastify'

type AuthenticatedRequest = FastifyRequest & {
  user?: {
    sub: string
    scope?: string[]
    role?: string
  }
}

const buildReply = () => ({
  code: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
})

const loadAuthPlugin = async (
  verifyImplementation: () => Promise<{ payload: Record<string, unknown> }>,
) => {
  jest.resetModules()
  process.env.JWT_ISSUER = 'issuer'
  process.env.JWT_AUDIENCE = 'audience'
  process.env.JWKS_URL = 'https://example.test/.well-known/jwks.json'

  const createRemoteJWKSet = jest.fn(() => 'jwks')
  const jwtVerify = jest.fn(verifyImplementation)

  await jest.unstable_mockModule('jose', () => ({
    createRemoteJWKSet,
    jwtVerify,
  }))

  const { authPlugin } = await import('./auth.js')

  let authenticate: unknown

  const fastify = {
    decorate: jest.fn((name: string, value: unknown) => {
      if (name === 'authenticate') {
        authenticate = value
      }
    }),
  }

  await authPlugin(fastify as never)

  if (!authenticate) {
    throw new Error('authenticate decorator was not registered')
  }

  return {
    authenticate: authenticate as (
      _request: FastifyRequest,
      _reply: FastifyReply,
    ) => Promise<void>,
    createRemoteJWKSet,
    jwtVerify,
  }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('authPlugin', () => {
  it('rejects requests without a bearer token', async () => {
    const { authenticate } = await loadAuthPlugin(async () => ({
      payload: { sub: 'user-1' },
    }))
    const reply = buildReply()

    await authenticate({ headers: {} } as FastifyRequest, reply as never)

    expect(reply.code).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith({ error: 'Missing token' })
  })

  it('rejects invalid tokens', async () => {
    const { authenticate, createRemoteJWKSet, jwtVerify } =
      await loadAuthPlugin(async () => {
        throw new Error('invalid token')
      })
    const reply = buildReply()

    await authenticate(
      {
        headers: { authorization: 'Bearer bad-token' },
      } as FastifyRequest,
      reply as never,
    )

    expect(createRemoteJWKSet as jest.Mock).toHaveBeenCalledWith(
      expect.any(URL),
    )
    expect(jwtVerify as jest.Mock).toHaveBeenCalledWith('bad-token', 'jwks', {
      audience: 'audience',
      issuer: 'issuer',
    })
    expect(reply.code).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid token' })
  })

  it('rejects payloads without a string subject', async () => {
    const { authenticate } = await loadAuthPlugin(async () => ({
      payload: { sub: 123 },
    }))
    const reply = buildReply()

    await authenticate(
      {
        headers: { authorization: 'Bearer token' },
      } as FastifyRequest,
      reply as never,
    )

    expect(reply.code).toHaveBeenCalledWith(401)
    expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid token' })
  })

  it('parses a string scope and role for valid tokens', async () => {
    const { authenticate } = await loadAuthPlugin(async () => ({
      payload: { sub: 'user-1', scope: 'read write', role: 'admin' },
    }))
    const reply = buildReply()
    const request = {
      headers: { authorization: 'Bearer good-token' },
    } as AuthenticatedRequest

    await authenticate(request, reply as never)

    expect(reply.code).not.toHaveBeenCalled()
    expect(request.user).toEqual({
      role: 'admin',
      scope: ['read', 'write'],
      sub: 'user-1',
    })
  })

  it('filters array scopes and omits invalid optional fields', async () => {
    const { authenticate } = await loadAuthPlugin(async () => ({
      payload: {
        sub: 'user-2',
        scope: ['read', 42, 'write'],
        role: 99,
      },
    }))
    const reply = buildReply()
    const request = {
      headers: { authorization: 'Bearer array-token' },
    } as AuthenticatedRequest

    await authenticate(request, reply as never)

    expect(reply.code).not.toHaveBeenCalled()
    expect(request.user).toEqual({
      role: undefined,
      scope: ['read', 'write'],
      sub: 'user-2',
    })
  })

  it('leaves scope undefined when the payload scope is not a string or array', async () => {
    const { authenticate } = await loadAuthPlugin(async () => ({
      payload: {
        sub: 'user-3',
        scope: 999,
      },
    }))
    const reply = buildReply()
    const request = {
      headers: { authorization: 'Bearer another-token' },
    } as AuthenticatedRequest

    await authenticate(request, reply as never)

    expect(reply.code).not.toHaveBeenCalled()
    expect(request.user).toEqual({
      scope: undefined,
      role: undefined,
      sub: 'user-3',
    })
  })
})
