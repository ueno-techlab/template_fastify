import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { beforeAll, afterEach } from 'vitest'

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
})

afterEach(async () => {
  // テストデータクリア
  const prisma = new PrismaClient()
  try {
    await prisma.user.deleteMany()
  } finally {
    await prisma.$disconnect()
  }
})
