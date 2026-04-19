import { afterEach, describe, expect, it, jest } from '@jest/globals'

const flushPromises = async () =>
  new Promise((resolve) => {
    setImmediate(resolve)
  })

const importServerModule = async (listenImpl: () => Promise<void>) => {
  jest.resetModules()

  const listen = jest.fn(listenImpl)
  const app = {
    listen,
    log: {
      error: jest.fn(),
    },
  }

  const buildApp = jest.fn(() => app)
  const consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {})
  const processExit = jest
    .spyOn(process, 'exit')
    .mockImplementation((() => undefined) as never)

  jest.unstable_mockModule('./app.js', () => ({
    buildApp,
  }))

  jest.unstable_mockModule('./config/env.js', () => ({
    env: { PORT: 4321 },
  }))

  await import('./server.js')
  await flushPromises()

  return { app, buildApp, consoleLog, listen, processExit }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('server bootstrap', () => {
  it('starts the gateway and logs the listening port', async () => {
    const { buildApp, consoleLog, listen, processExit } =
      await importServerModule(async () => undefined)

    expect(buildApp).toHaveBeenCalledTimes(1)
    expect(listen as jest.Mock).toHaveBeenCalledWith({
      host: '0.0.0.0',
      port: 4321,
    })
    expect(consoleLog).toHaveBeenCalledWith('Gateway running on port 4321')
    expect(processExit).not.toHaveBeenCalled()
  })

  it('logs startup failures and exits with status 1', async () => {
    const startupError = new Error('failed to start')
    const { app, consoleLog, processExit } = await importServerModule(
      async () => {
        throw startupError
      },
    )

    expect(app.log.error).toHaveBeenCalledWith(startupError)
    expect(processExit).toHaveBeenCalledWith(1)
    expect(consoleLog).not.toHaveBeenCalled()
  })
})
