import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { beforeAll } from 'vitest'

beforeAll(async () => {
  // テストDB初期化
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    })
  } catch (error) {
    console.error('Failed to run migrations:', error)
  }

  // テストデータをクリーンアップ
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  const prisma = new PrismaClient({ adapter })

  try {
    await prisma.user.deleteMany()
  } catch (error) {
    console.error('Failed to clean test data:', error)
  } finally {
    await prisma.$disconnect()
  }
})
