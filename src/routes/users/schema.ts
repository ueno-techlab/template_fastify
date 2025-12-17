import { Type, type Static } from '@sinclair/typebox'

export const UserResponse = Type.Object(
  {
    id: Type.Number(),
    email: Type.String({ format: 'email' }),
    name: Type.Union([Type.String(), Type.Null()]),
    createdAt: Type.String({ format: 'date-time' }),
  },
  {
    $id: 'UserResponse',
    title: 'User Response',
    description: 'User information',
  }
)

export const CreateUserRequest = Type.Object(
  {
    email: Type.String({ format: 'email' }),
    password: Type.String({ minLength: 8 }),
    name: Type.Optional(Type.String()),
  },
  {
    $id: 'CreateUserRequest',
    title: 'Create User Request',
    description: 'User registration data',
  }
)

export type UserResponseType = Static<typeof UserResponse>
export type CreateUserRequestType = Static<typeof CreateUserRequest>
