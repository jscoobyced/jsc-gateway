import { exportJWK, generateKeyPair } from 'jose'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const keysDir = resolve(currentDir, '../..')
const publicKeyPath = resolve(keysDir, env.JWT_PUBLIC_KEY_PATH)
const privateKeyPath = resolve(keysDir, env.JWT_PRIVATE_KEY_PATH)
const algorithm = env.JWT_ALGORITHM || 'RS512'

async function main() {
  const { publicKey, privateKey } = await generateKeyPair(algorithm, {
    extractable: true,
  })

  const publicJwk = await exportJWK(publicKey)
  const privateJwk = await exportJWK(privateKey)

  publicJwk.use = 'sig'
  publicJwk.alg = algorithm
  publicJwk.kid = 'key-1'

  privateJwk.use = 'sig'
  privateJwk.alg = algorithm
  privateJwk.kid = 'key-1'

  await mkdir(dirname(publicKeyPath), { recursive: true })
  await writeFile(publicKeyPath, JSON.stringify({ keys: [publicJwk] }, null, 2))
  await writeFile(privateKeyPath, JSON.stringify(privateJwk, null, 2))

  console.log(`Public JWKS written to: ${publicKeyPath}`)
  console.log(`Private JWK written to: ${privateKeyPath}`)
}

main().catch((error: unknown) => {
  console.error('Failed to generate keys:', error)
  process.exit(1)
})
