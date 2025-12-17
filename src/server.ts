import type { FastifyInstance } from 'fastify'
import { buildApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './config/logger.js'

let app: FastifyInstance | null = null

async function start() {
  try {
    app = await buildApp()

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    })

    app.log.info(
      {
        port: env.PORT,
        host: env.HOST,
        environment: env.NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
      },
      '🚀 サーバーが正常に起動しました'
    )

    app.log.info(
      `📖 APIドキュメント: http://localhost:${env.PORT}/docs`
    )
  } catch (err) {
    // アプリケーション起動に失敗した場合
    if (app) {
      app.log.fatal({ err }, '❌ サーバーの起動に失敗しました')
    } else {
      // ロガーが初期化される前のエラー
      logger.fatal({ err }, '❌ サーバーの起動に失敗しました')
    }
    process.exit(1)
  }
}

// グレースフルシャットダウン処理
async function shutdown(signal: string) {
  if (app) {
    app.log.info({ signal }, '⏹️  シャットダウンシグナルを受信しました。サーバーを正常終了します...')

    try {
      await app.close()
      app.log.info('✅ サーバーを正常に終了しました')
      process.exit(0)
    } catch (err) {
      app.log.error({ err }, '❌ サーバー終了中にエラーが発生しました')
      process.exit(1)
    }
  } else {
    // アプリが初期化されていない場合
    console.log(`⏹️  ${signal}を受信しました。終了します...`)
    process.exit(0)
  }
}

// シグナルハンドリング
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start()
