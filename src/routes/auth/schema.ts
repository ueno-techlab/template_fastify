import { Type, type Static } from '@sinclair/typebox'

export const LoginRequest = Type.Object(
  {
    email: Type.String({ format: 'email' }),
    password: Type.String({ minLength: 8 }),
  },
  {
    $id: 'LoginRequest',
    title: 'Login Request',
    description: 'Login credentials',
  }
)

export const LoginResponse = Type.Object(
  {
    accessToken: Type.String(),
  },
  {
    $id: 'LoginResponse',
    title: 'Login Response',
    description: 'JWT access token',
  }
)

export const ErrorResponse = Type.Object(
  {
    error: Type.String(),
  },
  {
    $id: 'ErrorResponse',
    title: 'Error Response',
    description: 'Error message',
  }
)

export type LoginRequestType = Static<typeof LoginRequest>
export type LoginResponseType = Static<typeof LoginResponse>
export type ErrorResponseType = Static<typeof ErrorResponse>
