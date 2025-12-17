import { test, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

import { buildApp } from '../src/app.js'

let app: FastifyInstance
let authToken: string

beforeAll(async () => {
  app = await buildApp()
  await app.ready()

  // テストユーザー作成（他のテストファイルと重複しないメールアドレスを使用）
  const hashedPassword = await bcrypt.hash('password123', 10)
  await app.prisma.user.create({
    data: {
      email: 'users-test@example.com',
      password: hashedPassword,
      name: 'Users Test User',
    },
  })

  // 認証トークン取得
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: {
      email: 'users-test@example.com',
      password: 'password123',
    },
  })
  authToken = loginResponse.json().accessToken
})

afterAll(async () => {
  await app.close()
})

test('POST /users - create user', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/users',
    payload: {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    },
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body).toHaveProperty('id')
  expect(body.email).toBe('newuser@example.com')
  expect(body.name).toBe('New User')
  expect(body).not.toHaveProperty('password')
})

test('POST /users - duplicate email', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/users',
    payload: {
      email: 'users-test@example.com', // beforeAllで作成したユーザーと同じメールアドレス
      password: 'password123',
      name: 'Duplicate',
    },
  })

  expect(response.statusCode).toBe(409)
  expect(response.json()).toEqual({ error: 'Email already exists' })
})

test('GET /users - list users', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/users',
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeGreaterThan(0)
})

test('GET /users/me - without auth', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/users/me',
  })

  expect(response.statusCode).toBe(401)
})

test('GET /users/me - with auth', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/users/me',
    headers: {
      authorization: `Bearer ${authToken}`,
    },
  })

  expect(response.statusCode).toBe(200)
  const body = response.json()
  expect(body.email).toBe('users-test@example.com')
  expect(body.name).toBe('Users Test User')
  expect(body).not.toHaveProperty('password')
})
