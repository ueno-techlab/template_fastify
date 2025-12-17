import { Type, type Static } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const EnvSchema = Type.Object({
  NODE_ENV: Type.Union(
    [
      Type.Literal('development'),
      Type.Literal('production'),
      Type.Literal('test'),
    ],
    { default: 'development' }
  ),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  DATABASE_URL: Type.String(),
  JWT_SECRET: Type.String({ minLength: 32 }),
  JWT_EXPIRES_IN: Type.String({ default: '24h' }),
  LOG_LEVEL: Type.String({ default: 'info' }),
  LOG_DIR: Type.String({ default: './logs' }),
  LOG_PRETTY: Type.String({ default: 'false' }),
  LOG_MAX_SIZE: Type.String({ default: '10M' }),
  LOG_MAX_AGE_DAYS: Type.String({ default: '30' }),
  PRISMA_LOG_LEVEL: Type.String({ default: '' }),
})

export type Env = Static<typeof EnvSchema>

export const loadEnv = (): Env => {
  const raw = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
    HOST: process.env.HOST || '0.0.0.0',
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_DIR: process.env.LOG_DIR || './logs',
    LOG_PRETTY: process.env.LOG_PRETTY || 'false',
    LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '10M',
    LOG_MAX_AGE_DAYS: process.env.LOG_MAX_AGE_DAYS || '30',
    PRISMA_LOG_LEVEL: process.env.PRISMA_LOG_LEVEL || '',
  }

  if (!Value.Check(EnvSchema, raw)) {
    const errors = [...Value.Errors(EnvSchema, raw)]
    console.error('Environment variable validation failed:')
    errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`))
    process.exit(1)
  }

  return raw as Env
}

export const env = loadEnv()
