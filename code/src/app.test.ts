import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals'
import type { FastifyInstance } from 'fastify'

type SilentLogger = {
  child: () => SilentLogger
  debug: () => void
  error: () => void
  fatal: () => void
  info: () => void
  trace: () => void
  warn: () => void
}

const buildSilentLogger = (): SilentLogger => {
  const logger: SilentLogger = {
    child: () => logger,
    debug: () => undefined,
    error: () => undefined,
    fatal: () => undefined,
    info: () => undefined,
    trace: () => undefined,
    warn: () => undefined,
  }

  return logger
}

const pinoMock = Object.assign(
  jest.fn(() => buildSilentLogger()),
  {
    destination: jest.fn(),
    stdSerializers: {
      err: (value: unknown) => value,
    },
    symbols: {
      serializersSym: Symbol.for('pino.serializersSym'),
    },
  },
)

jest.mock('pino', () => pinoMock)

process.env.APP_ROOT = process.cwd()
process.env.JWT_ISSUER ??= 'test-issuer'
process.env.JWT_AUDIENCE ??= 'test-audience'
process.env.JWKS_URL ??= 'http://localhost/.well-known/jwks.json'

describe('buildApp', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    const { buildApp } = await import('./app.js')
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns ok from the health endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

  it('returns the public jwks endpoint payload', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/.well-known/jwks.json',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      keys: expect.any(Array),
    })
  })
})
