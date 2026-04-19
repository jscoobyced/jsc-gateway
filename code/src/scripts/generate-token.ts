import { readFileSync } from 'fs'
import { JWK, SignJWT } from 'jose'
import { env } from '../config/env.js'

const keyDir = new URL('../..', import.meta.url)
const privateKeyPath = new URL(env.JWT_PRIVATE_KEY_PATH, keyDir)
const privateKey = JSON.parse(readFileSync(privateKeyPath, 'utf8')) as JWK

const [, , subArg, scopeArg] = process.argv
const sub = subArg
const scope = scopeArg
  ? scopeArg
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  : []

const main = async () => {
  const token = await new SignJWT({
    sub,
    scope,
  })
    .setProtectedHeader({ alg: env.JWT_ALGORITHM, kid: 'key-1' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setExpirationTime('15m')
    .sign(privateKey)

  console.log('Subject:', sub)
  console.log('Scope:', scope.join(' '))
  console.log('Generated JWT:', token)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
