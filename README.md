# Fastify API Template

**Fastify + TypeScript + TypeBox + Prisma + OpenAPI + JWT**

高速・軽量な **Fastify** をベースに、**TypeBox(JSON Schema)をSingle Source of Truth** として型安全・OpenAPI自動生成・JWT認証まで揃えた **Web APIテンプレート** です。

## 特徴

* 🚀 **Fastify**：高速・軽量なNode.js Webフレームワーク
* 🧩 **TypeScript**：フルTypeScript構成
* 📐 **TypeBox**：
  * リクエスト/レスポンスのバリデーション
  * TypeScript型
  * OpenAPIを **1つのSchemaから生成**
* 📄 **OpenAPI自動生成**（Swagger UI付き）
* 🗄 **Prisma ORM**：DB操作を型安全に
* 🔐 **JWT認証**：`@fastify/jwt` を利用
* 🧱 **プラグイン指向設計**：依存注入はFastify Pluginで管理

## 技術スタック

* Node.js
* Fastify
* TypeScript
* TypeBox (`@sinclair/typebox`)
* Prisma
* @fastify/swagger / @fastify/swagger-ui
* @fastify/jwt

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

## コンセプト（重要）

### TypeBoxをSingle Source of Truthにする

* `schema.body` / `schema.response` に **TypeBox** を記述
* 以下を同時に実現：

  * 入力バリデーション
  * TypeScript型
  * OpenAPI（Swagger）定義

👉 **型・実装・ドキュメントがズレない**

## セットアップ

### 開発方法の選択

このプロジェクトは2つの開発方法をサポートしています：

#### A. VSCode Dev Container（推奨）

**メリット**: 自動セットアップ、権限問題なし、環境の一貫性

```bash
# VSCodeで開いて「Reopen in Container」を選択
# すべて自動セットアップされます
```

#### B. ローカル Docker Compose

**メリット**: 軽量、柔軟性が高い

```bash
# 1. 環境変数の設定
cp .env.example .env

# 2. (オプション) UID/GIDを確認して.envに設定
id -u  # UID取得
id -g  # GID取得
# .envファイルでUSER_UID/USER_GIDを設定（デフォルト: 1000）

# 3. コンテナ起動
docker compose up -d

# 4. マイグレーション実行
docker compose exec app npx prisma migrate dev
```

### 権限問題について

このプロジェクトは**ファイル権限問題を自動解決**します：

* **Dev Container**: 自動的にホストのユーザーと一致
* **Docker Compose**: `.env`の`USER_UID`/`USER_GID`でホストユーザーと一致
* **デフォルト値**: UID/GID=1000（ほとんどのLinux環境で動作）

詳細は[権限設定の仕組み](#権限設定の仕組み)を参照してください。

### 環境変数

```bash
cp .env.example .env
```

主要な設定項目：

```env
# Docker権限設定（ホストのUID/GIDに合わせる）
USER_UID=1000
USER_GID=1000

# データベース
DATABASE_URL=postgresql://user:password@db:5432/app

# JWT
JWT_SECRET=change-me-to-a-secure-random-string-at-least-32-characters
```

## 起動

### 開発環境

```bash
npm run dev
```

### 本番ビルド

```bash
npm run build
npm start
```

## APIドキュメント

* Swagger UI
  👉 [http://localhost:3000/docs](http://localhost:3000/docs)
* OpenAPI(JSON)
  👉 [http://localhost:3000/docs/json](http://localhost:3000/docs/json)


## 認証（JWT）

### ログイン

```http
POST /auth/login
```

レスポンス：

```json
{
  "accessToken": "jwt-token"
}
```

### 認証が必要なAPI

* Swagger UIの **Authorize** ボタンから `Bearer <token>` を設定
* `preHandler: app.authenticate` を付けたルートが保護されます

## ルート定義例

```ts
app.get("/users/me", {
  preHandler: app.authenticate,
  schema: {
    response: { 200: MeResponse },
    security: [{ bearerAuth: [] }],
  },
}, handler);
```

## 依存の注入方法（Prisma/JWT）

* Fastify Pluginで注入
* DIコンテナは使用しない

```ts
app.decorate("prisma", prisma);
app.decorate("authenticate", authenticate);
```

型は `src/types/fastify.d.ts` で拡張します。

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

## 方針

* **魔法を減らす**
* **契約（Schema）を中心に設計**
* **軽く、読みやすく、壊れにくく**

## 権限設定の仕組み

### 問題

Dockerコンテナ内でrootユーザーで実行すると、作成されたファイルがホスト側でもroot所有になり、編集できなくなる問題が発生します。

### 解決方法

このプロジェクトは**ホストとコンテナで同じUID/GIDを使用**することで権限問題を解決しています：

#### 1. Dockerfile

```dockerfile
ARG USER_UID=1000
ARG USER_GID=1000

RUN groupadd -g ${USER_GID} nodeuser && \
    useradd -u ${USER_UID} -g nodeuser -m -s /bin/bash nodeuser

USER nodeuser
```

#### 2. compose.yml

```yaml
build:
  args:
    - USER_UID=${USER_UID:-1000}
    - USER_GID=${USER_GID:-1000}
user: "${USER_UID:-1000}:${USER_GID:-1000}"
```

#### 3. .env（オプション）

```env
USER_UID=1000
USER_GID=1000
```

### 使用シナリオ別の動作

| シナリオ | 動作 | 権限 |
|---------|------|------|
| Dev Container使用 | 自動でホストのUID/GIDに一致 | ✅ 問題なし |
| Docker Compose（.env設定） | `.env`のUID/GIDを使用 | ✅ 問題なし |
| Docker Compose（.env未設定） | デフォルト1000を使用 | ✅ 大抵のLinuxで問題なし |
| WSLから直接ファイル編集 | ホストユーザーとして編集 | ✅ 問題なし |
| node_modules | ホストにマウント（名前付きボリューム不使用） | ✅ 問題なし |

### node_modulesの扱いについて

このプロジェクトでは**node_modulesをホストにマウント**しています（名前付きボリュームは使用していません）。

**理由:**
- 名前付きボリュームは初回作成時にroot所有になる可能性があり、権限問題を引き起こす
- ホストマウントならUID/GID設定により、常に正しい権限で管理される
- WSL環境でも実用上十分なパフォーマンス

**注意事項:**
- `node_modules/`は`.gitignore`に含まれており、Gitにコミットされません
- ホスト側で`npm install`を実行すると、ホストのnode環境とコンテナが混在する可能性があるため、**コンテナ内で実行**してください

### トラブルシューティング

権限エラーが発生した場合：

```bash
# 1. 自分のUID/GIDを確認
id -u  # 例: 1000
id -g  # 例: 1000

# 2. .envファイルに設定
echo "USER_UID=$(id -u)" >> .env
echo "USER_GID=$(id -g)" >> .env

# 3. コンテナを再ビルド
docker compose down
docker compose build --no-cache
docker compose up -d
```
