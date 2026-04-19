import { readFileSync } from 'fs'
import { env } from './env.js'

export type RouteConfig = {
  prefix: string
  target: string
  auth: boolean
  requiredScopes?: string[]
}
const routesPath = new URL(env.ROUTES_CONFIG, import.meta.url)
const routesFile = readFileSync(routesPath, 'utf8')

export const routes: RouteConfig[] = JSON.parse(routesFile).routes
