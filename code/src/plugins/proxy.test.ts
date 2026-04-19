import { describe, expect, it, jest } from '@jest/globals'

type RouteConfig = {
  prefix: string
  target: string
  auth: boolean
  requiredScopes?: string[]
}

type HookRegistration = {
  name: string
  handler: (
    _request: Record<string, unknown>,
    _reply: {
      code: (_status: number) => unknown
      send?: (_body: unknown) => unknown
    },
  ) => Promise<unknown>
}

type NestedRegistration = {
  plugin: unknown
  options: {
    prefix: string
    replyOptions: {
      rewriteRequestHeaders: (
        _request: { user?: { sub?: string; role?: string; scope?: string[] } },
        _headers: Record<string, string>,
      ) => Record<string, string>
    }
    target: string
    upstream: string
    websocket: boolean
  }
}

const loadProxyPlugin = async (routes: RouteConfig[], websocket: boolean) => {
  jest.resetModules()

  const proxy = jest.fn()

  jest.unstable_mockModule('@fastify/http-proxy', () => ({
    default: proxy,
  }))

  jest.unstable_mockModule('../config/env.js', () => ({
    env: { ENABLE_WEBSOCKET_PROXY: websocket },
  }))

  jest.unstable_mockModule('../config/routes.js', () => ({
    routes,
  }))

  const { proxyPlugin } = await import('./proxy.js')

  return { proxy, proxyPlugin }
}

describe('proxyPlugin', () => {
  it('registers auth hooks and injects user headers for protected routes', async () => {
    const route = {
      auth: true,
      prefix: '/secure',
      requiredScopes: ['read:my-api'],
      target: 'http://upstream.test',
    }
    const { proxy, proxyPlugin } = await loadProxyPlugin([route], true)
    const hookRegistrations: HookRegistration[] = []
    const nestedRegistrations: NestedRegistration[] = []
    const authenticate = jest.fn()

    const fastify = {
      register: jest.fn(
        async (plugin: (_instance: unknown) => Promise<void>) => {
          const instance = {
            addHook: jest.fn(
              (name: string, handler: HookRegistration['handler']) => {
                hookRegistrations.push({ handler, name })
              },
            ),
            authenticate,
            register: jest.fn(
              (
                registeredPlugin: unknown,
                options: NestedRegistration['options'],
              ) => {
                nestedRegistrations.push({ options, plugin: registeredPlugin })
              },
            ),
          }

          await plugin(instance)
        },
      ),
    }

    await proxyPlugin(fastify as never, {})

    expect(fastify.register).toHaveBeenCalledTimes(1)
    expect(hookRegistrations).toHaveLength(2)
    expect(hookRegistrations[0]).toEqual({
      handler: authenticate,
      name: 'preHandler',
    })
    expect(nestedRegistrations).toHaveLength(1)
    expect(nestedRegistrations[0]?.plugin).toBe(proxy)
    expect(nestedRegistrations[0]?.options).toEqual(
      expect.objectContaining({
        prefix: '/secure',
        upstream: 'http://upstream.test',
        websocket: true,
      }),
    )

    const rewrittenHeaders =
      nestedRegistrations[0]?.options.replyOptions.rewriteRequestHeaders(
        {
          user: {
            role: 'admin',
            scope: ['read:my-api'],
            sub: 'user-1',
          },
        },
        {},
      )

    expect(rewrittenHeaders).toEqual({
      'x-user-id': 'user-1',
      'x-user-role': 'admin',
      'x-user-scope': 'read:my-api',
    })

    const forbiddenReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }

    await hookRegistrations[1]!.handler(
      {
        user: {
          scope: ['different:scope'],
        },
      },
      forbiddenReply,
    )

    expect(forbiddenReply.code).toHaveBeenCalledWith(403)
    expect(forbiddenReply.send).toHaveBeenCalledWith({ error: 'Forbidden' })

    const allowedReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }

    await hookRegistrations[1]!.handler(
      {
        user: {
          scope: ['read:my-api'],
        },
      },
      allowedReply,
    )

    expect(allowedReply.code).not.toHaveBeenCalled()
    expect(allowedReply.send).not.toHaveBeenCalled()
  })

  it('skips auth hooks for public routes and preserves existing headers', async () => {
    const route = {
      auth: false,
      prefix: '/public',
      target: 'http://public.test',
    }
    const { proxy, proxyPlugin } = await loadProxyPlugin([route], false)
    const hookRegistrations: HookRegistration[] = []
    const nestedRegistrations: NestedRegistration[] = []

    const fastify = {
      register: jest.fn(
        async (plugin: (_instance: unknown) => Promise<void>) => {
          const instance = {
            addHook: jest.fn(
              (name: string, handler: HookRegistration['handler']) => {
                hookRegistrations.push({ handler, name })
              },
            ),
            authenticate: jest.fn(),
            register: jest.fn(
              (
                registeredPlugin: unknown,
                options: NestedRegistration['options'],
              ) => {
                nestedRegistrations.push({ options, plugin: registeredPlugin })
              },
            ),
          }

          await plugin(instance)
        },
      ),
    }

    await proxyPlugin(fastify as never, {})

    expect(fastify.register).toHaveBeenCalledTimes(1)
    expect(hookRegistrations).toHaveLength(0)
    expect(nestedRegistrations).toHaveLength(1)
    expect(nestedRegistrations[0]?.plugin).toBe(proxy)

    const headers =
      nestedRegistrations[0]?.options.replyOptions.rewriteRequestHeaders(
        {},
        { existing: 'value' },
      )

    expect(headers).toEqual({ existing: 'value' })
    expect(nestedRegistrations[0]?.options.websocket).toBe(false)
  })
})
