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
    return PRISMA_LOG_LEVEL.split(',').map((l) => l.trim()) as Prisma.LogLevel[]
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
  // PrismaPgはpg poolを使用するため、pg.Pool optionsを渡せる
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })

  // Prisma専用ロガー（開発環境のみ）
  const queryLogger = createPrismaLogger()

  // PrismaClientの作成（event-based loggingを有効化）
  const prismaBase = new PrismaClient({
    adapter,
    log: logLevels?.map((level) => ({
      emit: 'event',
      level,
    })),
  })

  // イベントベースのロギングを試行（Driver Adapterでも動作する可能性）
  if (queryLogger && logLevels?.includes('query')) {
    try {
      // Driver Adapterでは$onの型定義がneverになるため、型アサーションで回避
      const prismaWithEvents = prismaBase as any
      if (typeof prismaWithEvents.$on === 'function') {
        prismaWithEvents.$on('query', (e: Prisma.QueryEvent) => {
          // クエリを整形（エスケープなしで読みやすく）
          const formattedQuery = e.query
            .replace(/"/g, '') // ダブルクォートを削除
            .replace(/\s+/g, ' ') // 複数の空白を1つに
            .trim()

          // パラメータをパースして読みやすく
          let formattedParams: any
          try {
            formattedParams = JSON.parse(e.params)
          } catch {
            formattedParams = e.params
          }

          // SQLとパラメータを別々のフィールドとして記録（読みやすさ優先）
          queryLogger.info(
            `SQL: ${formattedQuery} | Params: ${JSON.stringify(formattedParams)} | Duration: ${e.duration}ms`
          )
        })
        fastify.log.info('Prisma $on query event listener registered')
      } else {
        fastify.log.warn('$on method not available (driver adapter limitation)')
      }
    } catch (err) {
      fastify.log.warn({ err }, 'Failed to register $on query listener')
    }
  }

  // クエリログ用の拡張を有効にするか（$onが動作しない場合のバックアップ）
  const shouldExtend = queryLogger && logLevels?.includes('query')

  const prisma = shouldExtend
    ? prismaBase.$extends({
        query: {
          $allModels: {
            async $allOperations({ operation, model, args, query }) {
              const start = Date.now()
              const result = await query(args)
              const duration = Date.now() - start

              if (queryLogger) {
                queryLogger.debug(
                  {
                    model,
                    operation,
                    args,
                    duration: `${duration}ms`,
                  },
                  'Prisma Query'
                )
              }

              return result
            },
          },
        },
      })
    : prismaBase

  // Fastifyにデコレート
  fastify.decorate('prisma', prisma as any)

  // シャットダウン時のクリーンアップ
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Closing Prisma connection...')
    await (prismaBase as any).$disconnect()
  })
}

export default fp(prismaPlugin, {
  name: 'prisma',
})
