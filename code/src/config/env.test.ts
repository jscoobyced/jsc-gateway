import { afterEach, describe, expect, it, jest } from '@jest/globals'

const originalEnv = { ...process.env }

const loadEnvModule = async (overrides: NodeJS.ProcessEnv = {}) => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    ...overrides,
  }

  const config = jest.fn()
  jest.unstable_mockModule('dotenv', () => ({ config }))

  const { env } = await import('./env.js')

  return { config, env }
}

afterEach(() => {
  process.env = { ...originalEnv }
  jest.restoreAllMocks()
})

describe('env config', () => {
  it('uses the documented defaults', async () => {
    const { config, env } = await loadEnvModule({
      PORT: undefined,
      JWT_ALGORITHM: undefined,
      JWT_TOKEN_EXPIRY: undefined,
      RATE_LIMIT_MAX: undefined,
      RATE_LIMIT_TIME_WINDOW: undefined,
      ROUTES_CONFIG: undefined,
      APP_ROOT: undefined,
      ENABLE_WEBSOCKET_PROXY: undefined,
    })

    expect(config).toHaveBeenCalledWith({ quiet: true })
    expect(env.PORT).toBe(3000)
    expect(env.JWT_ALGORITHM).toBe('RS256')
    expect(env.JWT_TOKEN_EXPIRY).toBe('15m')
    expect(env.RATE_LIMIT_MAX).toBe(100)
    expect(env.RATE_LIMIT_TIME_WINDOW).toBe(60000)
    expect(env.ENABLE_WEBSOCKET_PROXY).toBe(false)
    expect(env.APP_ROOT).toBe(process.cwd())
    expect(env.JWT_PUBLIC_KEY_PATH).toContain('/config/keys/public.jwks.json')
    expect(env.JWT_PRIVATE_KEY_PATH).toContain('/config/keys/private.jwks.json')
    expect(env.ROUTES_CONFIG).toContain('/config/routes.example.json')
  })

  it('prefers explicit environment overrides', async () => {
    const { env } = await loadEnvModule({
      APP_ROOT: '/tmp/jsc-gateway',
      PORT: '8081',
      JWT_ISSUER: 'issuer',
      JWT_AUDIENCE: 'audience',
      JWKS_URL: 'https://example.test/jwks.json',
      JWT_ALGORITHM: 'ES256',
      JWT_TOKEN_EXPIRY: '1h',
      JWT_PUBLIC_KEY_PATH: '/keys/public.json',
      JWT_PRIVATE_KEY_PATH: '/keys/private.json',
      RATE_LIMIT_MAX: '12',
      RATE_LIMIT_TIME_WINDOW: '3456',
      ROUTES_CONFIG: '/tmp/routes.json',
      ENABLE_WEBSOCKET_PROXY: 'true',
    })

    expect(env.PORT).toBe(8081)
    expect(env.JWT_ISSUER).toBe('issuer')
    expect(env.JWT_AUDIENCE).toBe('audience')
    expect(env.JWKS_URL).toBe('https://example.test/jwks.json')
    expect(env.JWT_ALGORITHM).toBe('ES256')
    expect(env.JWT_TOKEN_EXPIRY).toBe('1h')
    expect(env.JWT_PUBLIC_KEY_PATH).toBe('/keys/public.json')
    expect(env.JWT_PRIVATE_KEY_PATH).toBe('/keys/private.json')
    expect(env.RATE_LIMIT_MAX).toBe(12)
    expect(env.RATE_LIMIT_TIME_WINDOW).toBe(3456)
    expect(env.ROUTES_CONFIG).toBe('/tmp/routes.json')
    expect(env.ENABLE_WEBSOCKET_PROXY).toBe(true)
    expect(env.APP_ROOT).toBe('/tmp/jsc-gateway')
  })
})
