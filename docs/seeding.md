# データベースシーディング

データベースに初期データを投入するためのシーダー機能の使い方を説明します。

## シーダーの実行

```bash
npm run prisma:seed
```

## 初期データ

シーダーを実行すると、以下の管理者ユーザーが作成されます:

| 項目 | 値 |
|------|-----|
| Email | `admin@example.com` |
| Password | `Test_1234` |
| Name | `Administrator` |

## シーダーの動作

1. **冪等性**: 既に `admin@example.com` ユーザーが存在する場合はスキップされます
2. **パスワードハッシュ化**: パスワードは bcrypt でハッシュ化されて保存されます
3. **自動実行**: `prisma migrate dev` の後に自動的に実行されます（`package.json` の `prisma.seed` で設定）

## ログイン方法

シーダー実行後、以下の認証情報でログインできます:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Test_1234"
  }'
```

レスポンス:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## シーダーファイルの場所

シーダーのコードは [prisma/seed.ts](../prisma/seed.ts) にあります。

## カスタマイズ

シーダーに追加のデータを投入したい場合は、`prisma/seed.ts` を編集してください:

```typescript
// 例: 追加ユーザーの作成
const user2 = await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: await bcrypt.hash('password', 10),
    name: 'Regular User',
  },
})
```

## トラブルシューティング

### シーダーが実行されない

マイグレーション時に自動実行されない場合:

```bash
# 手動で実行
npm run prisma:seed
```

### 既存データをリセットして再シード

```bash
# データベースをリセット（全データ削除）
npx prisma migrate reset

# マイグレーションとシーディングが自動実行されます
```

### エラー: "Admin user already exists"

これは正常な動作です。シーダーは冪等性を保つため、既存の管理者ユーザーがある場合はスキップします。

管理者ユーザーを再作成したい場合:

```bash
# 1. 既存のadminユーザーを削除（Prisma StudioまたはSQL）
npx prisma studio

# 2. シーダーを再実行
npm run prisma:seed
```

## 本番環境での使用

**警告**: 本番環境では、デフォルトのシーダーは実行しないでください。

本番環境では:
1. シーダーを実行しない、または
2. 本番環境専用のシーダーを作成する
3. デフォルトパスワードを必ず変更する

本番環境用シーダーの例:

```typescript
// prisma/seed.production.ts
if (process.env.NODE_ENV !== 'production') {
  throw new Error('This seed is for production only')
}

// 環境変数から安全なパスワードを取得
const adminPassword = process.env.ADMIN_PASSWORD
if (!adminPassword) {
  throw new Error('ADMIN_PASSWORD must be set')
}
```

## 参考資料

- [Prisma Seeding Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding)
