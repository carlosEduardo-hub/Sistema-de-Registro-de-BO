import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema/index.ts'
import { env } from '../env.ts'

const isServerless = Boolean(process.env.VERCEL)
const isLocalDb =
  env.DATABASE_URL.includes('localhost') ||
  env.DATABASE_URL.includes('127.0.0.1') ||
  env.DATABASE_URL.includes('@db:')

// Neon / serverless: poucas conexões + sem prepared statements.
export const sql = postgres(
  env.DATABASE_URL,
  isServerless
    ? { max: 1, prepare: false, ssl: 'require' }
    : isLocalDb
      ? { max: 10 }
      : { max: 10, ssl: 'require' },
)

export const db = drizzle(sql, {
  schema,
  casing: 'snake_case',
})