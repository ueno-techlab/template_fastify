import fastifyJwt from '@fastify/jwt'
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify'
import fp from 'fastify-plugin'

import { env } from '../config/env.js'

const jwtPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  })

  const authenticate: preHandlerHookHandler = async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  }

  app.decorate('authenticate', authenticate)
}

export default fp(jwtPlugin, {
  name: 'jwt',
  dependencies: ['prisma'],
})
