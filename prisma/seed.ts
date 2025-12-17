import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

// 環境変数を読み込み
dotenv.config()

// PostgreSQL アダプターを作成
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

// PrismaClient を初期化
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // 既存の admin ユーザーを確認
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  })

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists. Skipping seed.')
    return
  }

  // パスワードをハッシュ化
  const hashedPassword = await bcrypt.hash('Test_1234', 10)

  // 管理者ユーザーを作成
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Administrator',
    },
  })

  console.log('✅ Admin user created:')
  console.log(`   Email: ${adminUser.email}`)
  console.log(`   Name: ${adminUser.name}`)
  console.log(`   ID: ${adminUser.id}`)
  console.log('\n🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
