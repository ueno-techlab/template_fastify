# 認証ガイド

[← READMEに戻る](../README.md)

## JWT認証

このプロジェクトは `@fastify/jwt` を使用したJWT認証を実装しています。

## ログイン

```http
POST /auth/login
```

レスポンス：

```json
{
  "accessToken": "jwt-token"
}
```

## 認証が必要なAPI

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

### 説明

* **preHandler**: リクエスト処理前に認証チェックを実行
* **security**: OpenAPIドキュメントに認証要件を記載
* **app.authenticate**: JWT tokenの検証と`request.user`への設定を行う

## 認証フロー

1. ユーザーが `/auth/login` でログイン
2. サーバーがJWTトークンを発行
3. クライアントが後続リクエストの `Authorization: Bearer <token>` ヘッダーにトークンを含める
4. `app.authenticate` がトークンを検証し、有効なら処理を続行

## カスタマイズ

JWT設定は [src/plugins/jwt.ts](../src/plugins/jwt.ts) で管理されています。

以下のカスタマイズが可能：
* トークン有効期限
* リフレッシュトークン
* カスタムクレーム
* 認可（ロールベース）
