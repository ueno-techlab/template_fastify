import type { FastifyPluginAsync } from 'fastify'

import { loginHandler } from './handler.js'
import { LoginRequest, LoginResponse, ErrorResponse } from './schema.js'

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/login',
    {
      schema: {
        body: LoginRequest,
        response: {
          200: LoginResponse,
          401: ErrorResponse,
        },
        tags: ['Auth'],
        description: 'User login',
      },
    },
    loginHandler
  )
}

export default authRoutes
