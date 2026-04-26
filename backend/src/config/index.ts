import { config } from 'dotenv'
import { z } from 'zod'

config()

const envSchema = z.object({
  NETWORK:               z.enum(['sepolia', 'mainnet']).default('sepolia'),
  RPC_URL:               z.string().url(),
  DATABASE_URL:          z.string(),
  API_PORT:              z.coerce.number().default(3001),
  VAULT_ADDRESS:         z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  FBK_TOKEN_ADDRESS:     z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  VE_FBK_ADDRESS:        z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  FBK_DISTRIBUTOR_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  GOVERNOR_ADDRESS:      z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  EAS_CHECKER_ADDRESS:   z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  START_BLOCK:           z.coerce.bigint().default(0n),
  POLL_INTERVAL_MS:      z.coerce.number().default(5000),
  // CORS : URL du frontend (ex: https://finbank.app). Laisser vide en dev local.
  FRONTEND_URL:          z.string().url().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides :')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

export const CONTRACTS = {
  vault:       env.VAULT_ADDRESS       as `0x${string}`,
  fbkToken:    env.FBK_TOKEN_ADDRESS   as `0x${string}`,
  veFBK:       env.VE_FBK_ADDRESS      as `0x${string}`,
  distributor: env.FBK_DISTRIBUTOR_ADDRESS as `0x${string}`,
  governor:    env.GOVERNOR_ADDRESS    as `0x${string}`,
  easChecker:  env.EAS_CHECKER_ADDRESS as `0x${string}`,
}
