import { Type } from '@sinclair/typebox'
import type { FastifyPluginAsync } from 'fastify'

import { ErrorResponse } from '../auth/schema.js'
import { listUsersHandler, createUserHandler, getMeHandler } from './handler.js'
import {
  UserResponse,
  CreateUserRequest,
  type CreateUserRequestType,
} from './schema.js'

const usersRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    {
      preHandler: app.authenticate,
      schema: {
        response: {
          200: Type.Array(UserResponse),
        },
        security: [{ bearerAuth: [] }],
        tags: ['Users'],
        description: 'List all users',
      },
    },
    listUsersHandler
  )

  app.post<{ Body: CreateUserRequestType }>(
    '/',
    {
      preHandler: app.authenticate,
      schema: {
        body: CreateUserRequest,
        response: {
          200: UserResponse,
          409: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
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
