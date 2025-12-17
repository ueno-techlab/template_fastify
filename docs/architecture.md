# アーキテクチャガイド

[← READMEに戻る](../README.md)

## ディレクトリ構成

```txt
src/
├─ app.ts                # Fastifyアプリ生成
├─ server.ts             # 起動エントリ
├─ plugins/
│  ├─ prisma.ts          # Prisma初期化・注入
│  └─ jwt.ts             # JWT設定・authenticate注入
├─ routes/
│  ├─ auth/
│  │  ├─ index.ts        # /auth/login
│  │  └─ schema.ts
│  └─ users/
│     ├─ index.ts        # /users, /users/me
│     ├─ schema.ts
│     └─ handler.ts
└─ types/
   └─ fastify.d.ts       # Fastify型拡張
```

## コンセプト

### TypeBoxをSingle Source of Truthにする

* `schema.body` / `schema.response` に **TypeBox** を記述
* 以下を同時に実現：
  * 入力バリデーション
  * TypeScript型
  * OpenAPI（Swagger）定義

👉 **型・実装・ドキュメントがズレない**

## 依存の注入方法（Prisma/JWT）

* Fastify Pluginで注入
* DIコンテナは使用しない

```ts
app.decorate("prisma", prisma);
app.decorate("authenticate", authenticate);
```

型は `src/types/fastify.d.ts` で拡張します。

## 技術スタック

* Node.js
* Fastify
* TypeScript
* TypeBox (`@sinclair/typebox`)
* Prisma
* @fastify/swagger / @fastify/swagger-ui
* @fastify/jwt

## 想定ユースケース

* REST API サーバ
* BFF（Backend for Frontend）
* 社内API
* マイクロサービス

## 拡張しやすいポイント

* 認可（Role / RBAC）
* Refresh Token（Cookie）
* APIバージョニング
* テスト（Vitest / supertest）
* Rate Limit / CORS / CSRF

## 設計方針

* **魔法を減らす**
* **契約（Schema）を中心に設計**
* **軽く、読みやすく、壊れにくく**
