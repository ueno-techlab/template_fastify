import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsync } from 'fastify'

import { ErrorResponse } from '../auth/schema.js'
import { listUsersHandler, createUserHandler, getMeHandler } from './handler.js'
import { UserResponse, CreateUserRequest } from './schema.js'

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    {
      schema: {
        response: {
          200: Type.Array(UserResponse),
        },
        tags: ['Users'],
        description: 'List all users',
      },
    },
    listUsersHandler
  )

  app.post(
    '/',
    {
      schema: {
        body: CreateUserRequest,
        response: {
          200: UserResponse,
          409: ErrorResponse,
        },
        tags: ['Users'],
        description: 'Create a new user',
      },
    },
    createUserHandler
  )

  app.get(
    '/me',
    {
      preHandler: app.authenticate,
      schema: {
        response: {
          200: UserResponse,
        },
        security: [{ bearerAuth: [] }],
        tags: ['Users'],
        description: 'Get current user',
      },
    },
    getMeHandler
  )
}

export default usersRoutes
