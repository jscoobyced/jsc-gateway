import { buildApp } from './app.js'
import { env } from './config/env.js'

const app = buildApp()

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`Gateway running on port ${env.PORT}`)
  })
  .catch((err: Error) => {
    app.log.error(err)
    process.exit(1)
  })
