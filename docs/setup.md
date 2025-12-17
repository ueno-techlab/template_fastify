# セットアップガイド

[← READMEに戻る](../README.md)

## 開発方法の選択

このプロジェクトは2つの開発方法をサポートしています：

### A. VSCode Dev Container（推奨）

**メリット**: 自動セットアップ、権限問題なし、環境の一貫性

```bash
# VSCodeで開いて「Reopen in Container」を選択
# すべて自動セットアップされます
```

### B. ローカル Docker Compose

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

## 環境変数

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

## 権限問題について

このプロジェクトは**ファイル権限問題を自動解決**します：

* **Dev Container**: 自動的にホストのユーザーと一致
* **Docker Compose**: `.env`の`USER_UID`/`USER_GID`でホストユーザーと一致
* **デフォルト値**: UID/GID=1000（ほとんどのLinux環境で動作）

詳細は [Docker権限設定ガイド](./docker-permissions.md) を参照してください。
