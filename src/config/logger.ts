import pino, { type Logger, type LoggerOptions } from 'pino'
import type { DestinationStream } from 'pino'
import { createStream } from 'rotating-file-stream'

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
 * ローテーション用ストリームを作成
 * rotating-file-streamでは、ファイル名をジェネレータ関数で生成する
 */
function createRotatingStream(baseFilename: string) {
  const maxSize = process.env.LOG_MAX_SIZE || '10M'
  const maxAge = parseInt(process.env.LOG_MAX_AGE_DAYS || '30', 10)

  // ファイル名から拡張子を分離（例: "app.log" -> { name: "app", ext: ".log" }）
  const extIndex = baseFilename.lastIndexOf('.')
  const name = extIndex > 0 ? baseFilename.substring(0, extIndex) : baseFilename
  const ext = extIndex > 0 ? baseFilename.substring(extIndex) : ''

  return createStream(
    (time: Date | number | null) => {
      if (!time) {
        // 現在のファイル名
        return `${name}${ext}`
      }

      // ローテーション後のファイル名: yyyy-mm-dd.name.log
      const date = time instanceof Date ? time : new Date(time)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}.${name}${ext}`
    },
    {
      interval: '1d', // 毎日ローテーション
      path: LOG_DIR,
      size: maxSize as `${number}${'M' | 'B' | 'K' | 'G'}`,
      maxFiles: maxAge, // 保持する日数
      compress: 'gzip', // 古いログを圧縮
    }
  )
}

/**
 * メインロガーインスタンスを作成
 */
export function createLogger(): Logger {
  const baseOptions = getBaseLoggerOptions()
  const transport = getTransport()

  // テスト環境ではファイル出力しない
  if (NODE_ENV === 'test') {
    return pino(baseOptions, transport)
  }

  // 全ログ用のローテーションストリーム
  const appLogStream = createRotatingStream('app.log')

  // エラーログ用のローテーションストリーム
  const errorLogStream = createRotatingStream('error.log')

  // マルチストリームを作成（コンソール + ファイル）
  const streams = [
    { stream: transport }, // コンソール出力
    { stream: appLogStream }, // 全ログをファイルに
  ]

  // エラーログは別ファイルにも出力
  const logger = pino(baseOptions, pino.multistream(streams))

  // エラーレベル以上のログを別ファイルに出力
  const errorLogger = pino({ level: 'error' }, errorLogStream)

  // 元のロガーをラップしてエラーログを2箇所に出力
  const originalError = logger.error.bind(logger)
  const originalFatal = logger.fatal.bind(logger)

  logger.error = (obj: any, msg?: string, ...args: any[]) => {
    originalError(obj, msg, ...args)
    errorLogger.error(obj, msg, ...args)
  }

  logger.fatal = (obj: any, msg?: string, ...args: any[]) => {
    originalFatal(obj, msg, ...args)
    errorLogger.fatal(obj, msg, ...args)
  }

  return logger
}

/**
 * Fastify用のロガー設定を取得
 * Fastifyが期待する形式でロガーを提供
 */
export function getFastifyLoggerConfig() {
  const baseOptions = getBaseLoggerOptions()

  // テスト環境ではファイル出力しない
  if (NODE_ENV === 'test') {
    return {
      ...baseOptions,
      stream: getTransport(),
    }
  }

  // 全ログ用のローテーションストリーム
  const appLogStream = createRotatingStream('app.log')

  // エラーログ用のローテーションストリーム
  const errorLogStream = createRotatingStream('error.log')

  // マルチストリームを作成（コンソール + ファイル）
  const streams = [
    { stream: getTransport() }, // コンソール出力
    { stream: appLogStream }, // 全ログをファイルに
  ]

  // エラーログ専用のロガーを作成（Fastifyのロガーとは別）
  const errorLogger = pino({ level: 'error' }, errorLogStream)

  // Fastifyに渡す設定オブジェクト
  const loggerConfig: any = {
    ...baseOptions,
    stream: pino.multistream(streams),
  }

  // エラーログを別ファイルにも出力するためのフック
  // これはFastifyがロガーを作成した後に呼ばれる
  loggerConfig.serializers = {
    ...baseOptions.serializers,
    err(err: any) {
      // 元のシリアライザーを呼ぶ
      const serialized = baseOptions.serializers?.err?.(err) || {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
      }
      // エラーログを別ファイルにも記録
      errorLogger.error(serialized)
      return serialized
    },
  }

  return loggerConfig
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

  // クエリログ用のローテーションストリーム
  const queryLogStream = createRotatingStream('query.log')

  // pino-prettyを使用する場合は、app.logにPrismaログを統合
  // これにより、ログが確実にファイルに書き込まれる
  const queryLogger = pino(
    {
      level: 'debug',
      base: { context: 'prisma' },
    },
    queryLogStream
  )

  return queryLogger
}

// デフォルトエクスポート
export const logger = createLogger()
