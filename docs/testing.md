# テストガイド

[← READMEに戻る](../README.md)

## テスト環境

このプロジェクトは **Vitest** を使用してテストを実行します。

### テスト実行

```bash
# テスト実行（watchモード - ファイル変更を監視）
npm test

# テスト実行（1回だけ実行して終了）
npm run test:run

# UIモードでテストを実行
npm run test:ui
```

**推奨される使い方**:
- **開発中**: `npm test` (watchモード) - ファイルを編集するとテストが自動再実行
- **CI/CD**: `npm run test:run` - 1回だけ実行して結果を返す
- **デバッグ**: `npm run test:ui` - ブラウザでテスト結果を確認

## テストの構成

```txt
tests/
├─ setup.ts          # テスト前のセットアップ（DBマイグレーション）
├─ auth.test.ts      # 認証エンドポイントのテスト
└─ users.test.ts     # ユーザーエンドポイントのテスト
```

## テストの仕組み

### 1. セットアップ（setup.ts）

`tests/setup.ts`では、すべてのテストファイル実行前にデータベースのマイグレーションを実行します。

```ts
beforeAll(async () => {
  // テストDB初期化
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
  })
})
```

### 2. テストファイルの構造

各テストファイルは以下の構造を持ちます：

```ts
let app: FastifyInstance

beforeAll(async () => {
  // Fastifyアプリを構築
  app = await buildApp()
  await app.ready()

  // テスト用データを作成
  // ...
})

afterAll(async () => {
  // クリーンアップ
  await app.close()
})

test('テストケース名', async () => {
  // テストロジック
})
```

### 3. テストの独立性

各テストファイルは独立して実行されるため、以下の点に注意してください：

* **異なるメールアドレスを使用**: 各テストファイルでユニークなテストユーザーを作成
  * `auth.test.ts`: `auth-test@example.com`
  * `users.test.ts`: `users-test@example.com`

* **並行実行に対応**: Vitestはデフォルトでテストファイルを並行実行します

## テストの書き方

### APIテストの例

```ts
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
})
```

### 認証が必要なAPIのテスト

```ts
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
})
```

## Fastifyのinjectメソッド

`app.inject()`は、Fastifyの軽量テストユーティリティで、HTTPサーバーを起動せずにルートをテストできます。

### 利点

* 高速（実際のHTTPリクエストを送信しない）
* ポートの競合なし
* セットアップが簡単

### 使用例

```ts
const response = await app.inject({
  method: 'POST',
  url: '/auth/login',
  payload: {
    email: 'test@example.com',
    password: 'password123',
  },
  headers: {
    'content-type': 'application/json',
  },
})

// レスポンスの検証
expect(response.statusCode).toBe(200)
const body = response.json()
expect(body).toHaveProperty('accessToken')
```

## テストデータベース

テストは**開発用とは完全に独立したテスト専用データベース**を使用します。

### データベースの分離

- **開発用データベース**: `db:5432/app` (開発サーバーで使用)
- **テスト用データベース**: `db-test:5432/app_test` (テスト実行時に使用)

この分離により、**テスト実行が開発中のデータに影響を与えることはありません**。

### 設定

テスト用データベースは`vitest.config.ts`で自動的に設定されます：

```typescript
export default defineConfig({
  test: {
    env: {
      // テスト用データベースを使用
      DATABASE_URL: 'postgresql://user:password@db-test:5432/app_test',
      NODE_ENV: 'test',
    },
  },
})
```

### Docker環境

`compose.yml`には2つのPostgreSQLコンテナが定義されています：

```yaml
services:
  db:
    # 開発用データベース
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
    ports:
      - 5432:5432

  db-test:
    # テスト用データベース
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app_test
    ports:
      - 5433:5432
```

**重要**: `docker compose up`でコンテナを起動すると、両方のデータベースが自動的に起動します。

## カバレッジ

カバレッジレポートを生成する場合は、`vitest.config.ts`の設定を使用します：

```bash
# カバレッジ付きでテスト実行
vitest run --coverage
```

カバレッジレポートは以下の場所に生成されます：
* テキスト形式: コンソール出力
* HTML形式: `coverage/index.html`

## トラブルシューティング

### ユニーク制約エラーが発生する

**原因**: 複数のテストファイルで同じメールアドレスを使用している

**解決策**: 各テストファイルでユニークなメールアドレスを使用してください

```ts
// ❌ 悪い例（すべてのテストファイルで同じ）
email: 'test@example.com'

// ✅ 良い例（テストファイルごとに異なる）
email: 'auth-test@example.com'  // auth.test.ts
email: 'users-test@example.com' // users.test.ts
```

### Prismaクライアントの初期化エラー

**原因**: `PrismaClient`の初期化時に適切な設定がされていない

**解決策**: `PrismaPg`アダプターを使用してください

```ts
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
  log: [],
})
```

### テストが並行実行されてデータが競合する

**原因**: 共有リソース（データベースレコード）への同時アクセス

**解決策**:
1. 各テストファイルで異なるテストデータを使用
2. または、`vitest.config.ts`で並行実行を無効化：

```ts
export default defineConfig({
  test: {
    fileParallelism: false, // ファイル単位の並行実行を無効化
  },
})
```

## ベストプラクティス

1. **テストの独立性を保つ**: 各テストファイルは他のテストファイルに依存しない
2. **明確なテスト名**: テストケースの目的が一目でわかる名前を使用
3. **適切なアサーション**: 期待する結果を明確に検証
4. **テストデータのクリーンアップ**: 必要に応じて`afterAll`でクリーンアップ
5. **エラーケースもテスト**: 正常系だけでなく異常系もカバー

## 参考リンク

* [Vitest公式ドキュメント](https://vitest.dev/)
* [Fastify Testing公式ドキュメント](https://fastify.dev/docs/latest/Guides/Testing/)
* [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
