# Fastify API Template

**Fastify + TypeScript + TypeBox + Prisma + OpenAPI + JWT**

高速・軽量な **Fastify** をベースに、**TypeBox(JSON Schema)をSingle Source of Truth** として型安全・OpenAPI自動生成・JWT認証まで揃えた **Web APIテンプレート** です。

## 特徴

* 🚀 **Fastify**：高速・軽量なNode.js Webフレームワーク
* 🧩 **TypeScript**：フルTypeScript構成
* 📐 **TypeBox**：リクエスト/レスポンスのバリデーション、TypeScript型、OpenAPIを **1つのSchemaから生成**
* 📄 **OpenAPI自動生成**（Swagger UI付き）
* 🗄 **Prisma ORM**：DB操作を型安全に
* 🔐 **JWT認証**：`@fastify/jwt` を利用
* 🧱 **プラグイン指向設計**：依存注入はFastify Pluginで管理

## クイックスタート

```bash
# 1. VSCodeで開いて「Reopen in Container」を選択

# 2. 依存関係のインストール
npm install

# 3. 環境変数の設定
cp .env.example .env

# 4. Prismaのセットアップ
npx prisma generate
npx prisma migrate dev

# 5. 開発サーバー起動
npm run dev
```

👉 [http://localhost:3000](http://localhost:3000)

> その他のセットアップ方法は [セットアップガイド](docs/setup.md) を参照してください。

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build
npm start

# テスト実行
npm test

# Prismaマイグレーション
npx prisma migrate dev
```

## APIドキュメント

* **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
* **OpenAPI JSON**: [http://localhost:3000/docs/json](http://localhost:3000/docs/json)

## ドキュメント

- [セットアップガイド](docs/setup.md) - 詳細な環境構築手順
- [アーキテクチャガイド](docs/architecture.md) - ディレクトリ構成とコンセプト
- [認証ガイド](docs/authentication.md) - JWT認証の使い方
- [Docker権限設定ガイド](docs/docker-permissions.md) - 権限問題の解決方法
- [ログ設定ガイド](docs/logging.md) - ログ出力のカスタマイズ

## ライセンス

MIT
