import Fastify, { type FastifyInstance } from 'fastify'

import { env } from './config/env.js'
import { getFastifyLoggerConfig } from './config/logger.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: getFastifyLoggerConfig(), // Pinoロガー設定を注入

    // リクエストID生成設定
    requestIdHeader: 'x-request-id', // クライアントからのIDを優先
    requestIdLogLabel: 'reqId',
    genReqId: (req) => {
      // x-request-idヘッダーがあればそれを使用、なければ自動生成
      return req.headers['x-request-id']?.toString() || generateRequestId()
    },

    // リクエスト/レスポンスの自動ログ
    disableRequestLogging: false,

    // Body/Queryの最大サイズ（大きすぎるとログが肥大化）
    bodyLimit: 1048576, // 1MB
  })

  // Swagger（OpenAPI）設定
  await app.register(import('@fastify/swagger'), {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Fastify API',
        description: 'API documentation for Fastify template',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  })

  // CORS設定
  await app.register(import('@fastify/cors'), {
    origin: env.NODE_ENV === 'development' ? '*' : false, // 開発環境では全許可
    credentials: true,
  })

  // プラグイン登録
  await app.register(import('./plugins/prisma.js'))
  await app.register(import('./plugins/jwt.js'))

  // ルート登録
  await app.register(import('./routes/auth/index.js'), { prefix: '/auth' })
  await app.register(import('./routes/users/index.js'), { prefix: '/users' })

  // ヘルスチェック
  app.get('/health', async () => ({ status: 'ok' }))

  // グローバルエラーハンドラー
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error(
      {
        err: error,
        req: request,
      },
      '未処理のエラーが発生しました'
    )

    // エラーレスポンス
    reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
      ...(env.NODE_ENV === 'development' && { stack: error.stack }),
    })
  })

  // Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    request.log.warn({ req: request }, 'ルートが見つかりませんでした')
    reply.status(404).send({ error: 'Not Found', statusCode: 404 })
  })

  return app
}

/**
 * リクエストID生成（UUIDv4簡易版）
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
