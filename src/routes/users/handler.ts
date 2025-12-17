import bcrypt from 'bcrypt'
import type { User } from '@prisma/client'
import type { FastifyRequest, FastifyReply } from 'fastify'

import type { CreateUserRequestType, UserResponseType } from './schema.js'

export const toUserResponse = (user: User): UserResponseType => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt.toISOString(),
})

export const listUsersHandler = async (
  request: FastifyRequest
): Promise<UserResponseType[]> => {
  request.log.info('Listing all users')

  const users = await request.server.prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })

  request.log.debug({ count: users.length }, 'Users retrieved')

  return users.map(toUserResponse)
}

export const createUserHandler = async (
  request: FastifyRequest<{ Body: CreateUserRequestType }>,
  reply: FastifyReply
): Promise<UserResponseType> => {
  const { email, password, name } = request.body

  request.log.info({ email }, 'Creating new user')

  // 既存ユーザーチェック
  const existing = await request.server.prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    request.log.warn({ email }, 'Email already exists')
    return reply.code(409).send({ error: 'Email already exists' })
  }

  // パスワードハッシュ化
  const hashedPassword = await bcrypt.hash(password, 10)

  // ユーザー作成
  const user = await request.server.prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  })

  request.log.info({ userId: user.id }, 'User created successfully')

  return toUserResponse(user)
}

export const getMeHandler = async (
  request: FastifyRequest
): Promise<UserResponseType> => {
  const userId = request.user.userId

  request.log.info({ userId }, 'Fetching current user')

  const user = await request.server.prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    request.log.error({ userId }, 'User not found')
    throw new Error('User not found')
  }

  request.log.debug({ userId }, 'User retrieved')

  return toUserResponse(user)
}
