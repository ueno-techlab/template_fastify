import type { PrismaClient } from '@prisma/client'
import type { preHandlerHookHandler } from 'fastify'

export interface JwtPayload {
  userId: number
  email: string
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: any // PrismaClient with $extends support
    authenticate: preHandlerHookHandler
  }

  interface FastifyRequest {
    user: JwtPayload
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}
