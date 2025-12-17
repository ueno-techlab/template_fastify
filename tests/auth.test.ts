import { test, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

import { buildApp } from '../src/app.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // テストユーザー作成（他のテストファイルと重複しないメールアドレスを使用）
  const hashedPassword = await bcrypt.hash('password123', 10)
  await app.prisma.user.create({
    data: {
      email: 'auth-test@example.com',
      password: hashedPassword,
      name: 'Auth Test User',
    },
  })
})

afterAll(async () => {
  await app.close()
})

test('POST /auth/login - success', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: 'auth-test@example.com',
      password: 'password123',
    },
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body).toHaveProperty('accessToken')
  expect(typeof body.accessToken).toBe('string')
})

test('POST /auth/login - invalid credentials', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: 'auth-test@example.com',
      password: 'wrongpassword',
    },
  })

  expect(response.statusCode).toBe(401)
  expect(response.json()).toEqual({ error: 'Invalid credentials' })
})

test('POST /auth/login - validation error', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: 'invalid-email',
      password: '123', // too short
    },
  })

  expect(response.statusCode).toBe(400)
})
