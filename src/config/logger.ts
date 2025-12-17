import path from 'node:path'
import pino, { type Logger, type LoggerOptions } from 'pino'
import type { DestinationStream } from 'pino'

const NODE_ENV = process.env.NODE_ENV || 'development'
const LOG_LEVEL =
  process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug')
const LOG_DIR = process.env.LOG_DIR || './logs'
const LOG_PRETTY = process.env.LOG_PRETTY === 'true'

/**
 * Pino基本設定（環境別）
 */
function getBaseLoggerOptions(): LoggerOptions {
  return {
    level: LOG_LEVEL,

    // タイムスタンプをISO 8601形式で出力
    timestamp: pino.stdTimeFunctions.isoTime,

    // 機密情報のマスキング
    redact: {
      paths: [
        // リクエストヘッダー
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',

        // レスポンスヘッダー
        'res.headers["set-cookie"]',

        // ボディ内の機密フィールド
        'req.body.password',
        'req.body.token',
        'req.body.accessToken',
        'req.body.refreshToken',
        'req.body.apiKey',
        'req.body.secret',

        // Prismaクエリパラメータ（本番環境のみ）
        ...(NODE_ENV === 'production' ? ['prisma.params'] : []),
      ],
      censor: '[REDACTED]',
    },

    // カスタムシリアライザー（リクエスト/レスポンスの整形）
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          path: req.routeOptions?.url || req.url,
          parameters: req.params,
          query: req.query,
          // ヘッダーは必要最小限のみ
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type'],
          },
          remoteAddress: req.ip,
        }
      },

      res(res: any) {
        return {
          statusCode: res.statusCode,
          headers: {
            'content-type': res.getHeader('content-type'),
          },
        }
      },

      err(err: any) {
        return {
          type: err.constructor.name,
          message: err.message,
          stack: err.stack,
          code: err.code,
          statusCode: err.statusCode,
          validation: err.validation, // Fastify validation errors
        }
      },
    },
  }
}

/**
 * 開発環境用トランスポート（pino-pretty + ファイル出力）
 */
function getDevelopmentTransport() {
  const targets: any[] = []

  // コンソール出力（pino-pretty）
  if (LOG_PRETTY) {
    targets.push({
      target: 'pino-pretty',
      level: LOG_LEVEL,
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    })
  }

  // 全ログをファイル出力（pino-roll）
  targets.push({
    target: 'pino-roll',
    level: 'debug',
    options: {
      file: path.join(LOG_DIR, '%Y-%m-%d-app.log'),
      frequency: 'daily',
      size: process.env.LOG_MAX_SIZE || '10M',
      mkdir: true,
    },
  })

  // エラーログを分離
  targets.push({
    target: 'pino-roll',
    level: 'error',
    options: {
      file: path.join(LOG_DIR, '%Y-%m-%d-error.log'),
      frequency: 'daily',
      size: process.env.LOG_MAX_SIZE || '10M',
      mkdir: true,
    },
  })

  return pino.transport({ targets })
}

/**
 * 本番環境用トランスポート（JSON形式 + ファイルローテーション）
 */
function getProductionTransport() {
  const targets: any[] = []

  // 標準出力（JSON形式）- ログ集約ツール用
  targets.push({
    target: 'pino/file',
    level: 'info',
    options: { destination: 1 }, // stdout
  })

  // 全ログをファイル出力
  targets.push({
    target: 'pino-roll',
    level: 'info',
    options: {
      file: path.join(LOG_DIR, '%Y-%m-%d-app.log'),
      frequency: 'daily',
      size: process.env.LOG_MAX_SIZE || '10M',
      mkdir: true,
      maxAge: parseInt(process.env.LOG_MAX_AGE_DAYS || '30', 10),
    },
  })

  // エラーログを分離
  targets.push({
    target: 'pino-roll',
    level: 'error',
    options: {
      file: path.join(LOG_DIR, '%Y-%m-%d-error.log'),
      frequency: 'daily',
      size: process.env.LOG_MAX_SIZE || '10M',
      mkdir: true,
      maxAge: parseInt(process.env.LOG_MAX_AGE_DAYS || '30', 10),
    },
  })

  return pino.transport({ targets })
}

/**
 * テスト環境用トランスポート（ログを抑制）
 */
function getTestTransport() {
  // テストではログを最小限に
  return pino.transport({
    target: 'pino/file',
    options: { destination: '/dev/null' }, // ログを破棄
  })
}

/**
 * 環境別トランスポート選択
 */
function getTransport(): DestinationStream {
  switch (NODE_ENV) {
    case 'test':
      return getTestTransport()
    case 'production':
      return getProductionTransport()
    case 'development':
    default:
      return getDevelopmentTransport()
  }
}

/**
 * メインロガーインスタンスを作成
 */
export function createLogger(): Logger {
  const baseOptions = getBaseLoggerOptions()
  const transport = getTransport()

  return pino(baseOptions, transport)
}

/**
 * Prisma用ロガー（SQLクエリ専用）
 */
export function createPrismaLogger(): Logger | null {
  // 本番環境ではSQLログを出力しない
  if (NODE_ENV === 'production') {
    return null
  }

  // テスト環境ではSQLログを抑制
  if (NODE_ENV === 'test') {
    return null
  }

  const queryLogger = pino(
    {
      level: 'debug',
      base: { context: 'prisma' },
    },
    pino.transport({
      targets: [
        // コンソール出力
        {
          target: 'pino-pretty',
          level: 'debug',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            messageFormat: '[PRISMA] {msg}',
          },
        },
        // ファイル出力
        {
          target: 'pino-roll',
          level: 'debug',
          options: {
            file: path.join(LOG_DIR, '%Y-%m-%d-query.log'),
            frequency: 'daily',
            size: '10M',
            mkdir: true,
          },
        },
      ],
    })
  )

  return queryLogger
}

// デフォルトエクスポート
export const logger = createLogger()

/**
 * Fastify用のロガー設定を取得
 * Fastifyはロガーインスタンスではなく設定オブジェクトを期待する
 */
export function getFastifyLoggerConfig() {
  return {
    ...getBaseLoggerOptions(),
    stream: getTransport(),
  }
}
