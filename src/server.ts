import { buildApp } from './app.js'
import { env } from './config/env.js'

async function start() {
  try {
    const app = await buildApp()

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    })

    app.log.info(
      {
        port: env.PORT,
        host: env.HOST,
        environment: env.NODE_ENV,
        docs: `http://localhost:${env.PORT}/docs`,
      },
      'Server is running'
    )
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

// シグナルハンドリング
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

start()
