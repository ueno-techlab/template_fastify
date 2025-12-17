import { PrismaClient, type Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { createPrismaLogger } from '../config/logger.js'

const NODE_ENV = process.env.NODE_ENV || 'development'
const PRISMA_LOG_LEVEL = process.env.PRISMA_LOG_LEVEL || ''

/**
 * 環境別Prismaログレベル設定
 */
function getPrismaLogConfig(): Prisma.LogLevel[] | undefined {
  if (NODE_ENV === 'test') {
    return undefined // テストではログ無効
  }

  if (PRISMA_LOG_LEVEL) {
    return PRISMA_LOG_LEVEL.split(',').map((l) =>
      l.trim()
    ) as Prisma.LogLevel[]
  }

  // デフォルト
  return NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn']
}

/**
 * Prismaプラグイン
 */
const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const logLevels = getPrismaLogConfig()

  // PostgreSQLアダプターの作成
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  const prisma = new PrismaClient({
    adapter,
    log: logLevels?.map((level) => ({
      emit: 'event',
      level,
    })),
  })

  // Prisma専用ロガー（開発環境のみ）
  const queryLogger = createPrismaLogger()

  // イベントリスナー登録
  // Note: Driver adapters使用時はイベントエミッター機能が制限される
  if (queryLogger && logLevels && typeof (prisma as any).$on === 'function') {
    if (logLevels.includes('query')) {
      try {
        (prisma as any).$on('query', (e: Prisma.QueryEvent) => {
          queryLogger.debug(
            {
              query: e.query,
              params: e.params,
              duration: `${e.duration}ms`,
              target: e.target,
            },
            'Prisma Query'
          )
        })
      } catch (err) {
        fastify.log.warn('Query event logging not available with driver adapter')
      }
    }

    if (logLevels.includes('error')) {
      try {
        (prisma as any).$on('error', (e: Prisma.LogEvent) => {
          fastify.log.error(
            {
              message: e.message,
              target: e.target,
              timestamp: e.timestamp,
            },
            'Prisma Error'
          )
        })
      } catch (err) {
        // Silently ignore if not supported
      }
    }

    if (logLevels.includes('warn')) {
      try {
        (prisma as any).$on('warn', (e: Prisma.LogEvent) => {
          fastify.log.warn(
            {
              message: e.message,
              target: e.target,
              timestamp: e.timestamp,
            },
            'Prisma Warning'
          )
        })
      } catch (err) {
        // Silently ignore if not supported
      }
    }
  }

  // Fastifyにデコレート
  fastify.decorate('prisma', prisma)

  // シャットダウン時のクリーンアップ
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Closing Prisma connection...')
    await instance.prisma.$disconnect()
  })
}

export default fp(prismaPlugin, {
  name: 'prisma',
})
