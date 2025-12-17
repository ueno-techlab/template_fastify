import bcrypt from 'bcrypt'
import type { FastifyRequest, FastifyReply } from 'fastify'

import type { JwtPayload } from '../../types/fastify.js'
import type { LoginRequestType, LoginResponseType } from './schema.js'

export const loginHandler = async (
  request: FastifyRequest<{ Body: LoginRequestType }>,
  reply: FastifyReply
): Promise<LoginResponseType> => {
  const { email, password } = request.body

  request.log.info({ email }, 'Login attempt')

  // ユーザー検索
  const user = await request.server.prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    request.log.warn({ email }, 'User not found')
    return reply.code(401).send({ error: 'Invalid credentials' })
  }

  // パスワード検証
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    request.log.warn({ email }, 'Invalid password')
    return reply.code(401).send({ error: 'Invalid credentials' })
  }

  // JWT生成
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
  }

  const token = request.server.jwt.sign(payload)

  request.log.info({ userId: user.id }, 'Login successful')

  return { accessToken: token }
}
