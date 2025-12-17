# ログシステムガイド

[← READMEに戻る](../README.md)

このドキュメントでは、プロジェクトのログシステムの使い方と解析方法について説明します。

## 目次

- [ログの表示方法](#ログの表示方法)
- [ログファイルの場所](#ログファイルの場所)
- [ログファイルの種類](#ログファイルの種類)
- [ログの読み方](#ログの読み方)
- [ログレベル](#ログレベル)
- [便利なコマンド](#便利なコマンド)
- [環境変数による設定](#環境変数による設定)
- [トラブルシューティング](#トラブルシューティング)

---

## ログの表示方法

このプロジェクトでは、既に`pino-pretty`がインストールされているため、追加のツールなしでログを見やすく表示できます。

### npm scriptsを使う方法（推奨）

```bash
# 全ログを整形して表示
npm run logs:view

# 全ログをリアルタイムで監視
npm run logs:watch

# エラーログのみ表示
npm run logs:errors

# エラーログをリアルタイムで監視
npm run logs:errors:watch
```

### pino-prettyを直接使う

```bash
# ログファイルを整形して表示
npx pino-pretty logs/app.log

# リアルタイムで監視
tail -f logs/app.log | npx pino-pretty

# エラーログのみ
npx pino-pretty logs/error.log
```

### jqを使った高度な解析（オプション）

より高度なフィルタリングや集計が必要な場合は、システムに`jq`をインストールして使用できます。

**インストール:**

```bash
# Ubuntu/Debian/WSL
sudo apt update && sudo apt install jq

# macOS
brew install jq
```

**使用例:**

```bash
# エラーレベルのみ抽出
cat logs/app.log | jq 'select(.level >= 50)'

# 特定のエンドポイントへのリクエスト
cat logs/app.log | jq 'select(.req.url | contains("/api/users"))'
```

---

## ログファイルの場所

すべてのログは `./logs/` ディレクトリに保存されます。

```
logs/
├── app.log           # 全てのログ（現在）
├── error.log         # エラーログのみ（現在）
├── query.log         # SQLクエリログ（開発環境のみ、現在）
├── 2025-12-18.app.log.gz     # ローテーション済みログ（圧縮）
├── 2025-12-18.error.log.gz
└── 2025-12-18.query.log.gz
```

## ログファイルの種類

### 1. app.log

**すべてのログ**が記録されます。

- サーバー起動/終了
- HTTPリクエスト/レスポンス
- エラー
- デバッグ情報

### 2. error.log

**エラーレベル以上のログ**のみが記録されます。

- ERROR (level 50)
- FATAL (level 60)

エラー調査時は、このファイルを確認すると効率的です。

### 3. query.log

**Prismaのデータベースクエリ**が記録されます（開発環境のみ）。

- SQL文
- クエリパラメータ
- 実行時間

本番環境では出力されません。

## ログの読み方

### JSON形式について

ログはJSON形式で保存されています。これは：

- ✅ 検索・フィルタリングが容易
- ✅ ログ集約ツールとの連携が簡単
- ✅ プログラムで解析しやすい
- ❌ 人間が直接読むには見づらい

### ログエントリの構造

```json
{
  "level": 30,
  "time": "2025-12-18T12:34:56.789Z",
  "pid": 12345,
  "hostname": "server-01",
  "reqId": "req_1734526496789_abc123xyz",
  "req": {
    "method": "GET",
    "url": "/api/users",
    "remoteAddress": "127.0.0.1"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45.2,
  "msg": "リクエスト完了"
}
```

**主要フィールド:**

| フィールド | 説明                       | 例                           |
| ---------- | -------------------------- | ---------------------------- |
| `level`    | ログレベル（数値）         | 30 (info)                    |
| `time`     | タイムスタンプ（ISO 8601） | 2025-12-18T12:34:56.789Z     |
| `pid`      | プロセスID                 | 12345                        |
| `reqId`    | リクエストID               | req_1734526496789_abc123xyz  |
| `msg`      | メッセージ                 | サーバーが正常に起動しました |
| `err`      | エラー情報（エラー時のみ） | { type, message, stack }     |

## ログレベル

| レベル | 数値 | 用途               | 例                       |
| ------ | ---- | ------------------ | ------------------------ |
| TRACE  | 10   | 詳細なデバッグ情報 | 関数の入出力             |
| DEBUG  | 20   | デバッグ情報       | 変数の値、処理フロー     |
| INFO   | 30   | 通常の情報         | リクエスト、サーバー起動 |
| WARN   | 40   | 警告               | 非推奨機能の使用         |
| ERROR  | 50   | エラー             | 処理失敗、例外           |
| FATAL  | 60   | 致命的エラー       | サーバー起動失敗         |

**環境別のデフォルトレベル:**

- 開発環境: `DEBUG` (20) 以上
- 本番環境: `INFO` (30) 以上

## 便利なコマンド

### 基本的な読み方

#### 1. jqで整形して表示

```bash
# 最新のログを整形して表示
cat logs/app.log | jq '.'

# エラーログのみ整形
cat logs/error.log | jq '.'
```

#### 2. リアルタイムで監視

```bash
# app.logをリアルタイムで整形表示
tail -f logs/app.log | jq '.'

# エラーログのみ監視
tail -f logs/error.log | jq '.'
```

### フィルタリング

#### ログレベルでフィルタ

```bash
# ERRORレベルのみ表示 (level 50)
cat logs/app.log | jq 'select(.level == 50)'

# WARNレベル以上 (level >= 40)
cat logs/app.log | jq 'select(.level >= 40)'

# INFO以上のみ
cat logs/app.log | jq 'select(.level >= 30)'
```

#### メッセージで検索

```bash
# メッセージに「エラー」を含むログ
cat logs/app.log | jq 'select(.msg | contains("エラー"))'

# 特定のエンドポイントへのリクエスト
cat logs/app.log | jq 'select(.req.url | contains("/api/users"))'
```

#### 時間範囲で絞り込み

```bash
# 特定の時刻以降のログ
cat logs/app.log | jq 'select(.time >= "2025-12-18T12:00:00Z")'

# 今日のエラーログのみ
cat logs/error.log | jq 'select(.time | startswith("2025-12-18"))'
```

#### リクエストIDで追跡

```bash
# 特定のリクエストに関連するログを全て表示
cat logs/app.log | jq 'select(.reqId == "req_1734526496789_abc123xyz")'
```

### 集計・分析

#### ステータスコード別にカウント

```bash
cat logs/app.log | jq -r '.res.statusCode' | sort | uniq -c
```

出力例:

```
  150 200
   23 201
   12 404
    5 500
```

#### エラーメッセージの一覧

```bash
cat logs/error.log | jq -r '.msg' | sort | uniq -c | sort -rn
```

#### 平均レスポンスタイム

```bash
cat logs/app.log | jq -s 'map(.responseTime) | add/length'
```

### 便利なエイリアス

`.bashrc` や `.zshrc` に追加すると便利です：

```bash
# ログをリアルタイム監視
alias log-watch='tail -f logs/app.log | jq "."'
alias log-errors='tail -f logs/error.log | jq "."'

# エラーログのみ表示
alias log-show-errors='cat logs/app.log | jq "select(.level >= 50)"'

# 今日のログを表示
alias log-today='cat logs/app.log | jq "select(.time | startswith(\"$(date +%Y-%m-%d)\"))"'
```

## 環境変数による設定

`.env` ファイルで設定を変更できます：

```bash
# ログレベル (trace, debug, info, warn, error, fatal)
LOG_LEVEL=debug

# ログディレクトリ
LOG_DIR=./logs

# pino-prettyを使用（コンソール出力を整形）
LOG_PRETTY=true

# ローテーション: 最大ファイルサイズ
LOG_MAX_SIZE=10M

# ローテーション: ログ保持日数
LOG_MAX_AGE_DAYS=30
```

**設定例:**

```bash
# 開発環境
LOG_LEVEL=debug
LOG_PRETTY=true

# 本番環境
LOG_LEVEL=info
LOG_PRETTY=false
LOG_MAX_AGE_DAYS=90
```

## トラブルシューティング

### ログファイルが空

**原因:** ロガーの設定に問題がある可能性があります。

**確認:**

```bash
# サーバーを起動してログを確認
npm run dev

# コンソールにログが表示されるか確認
# ファイルにも記録されているか確認
ls -lh logs/
```

### ログが多すぎる

**解決策1:** ログレベルを上げる

```bash
# .envファイルを編集
LOG_LEVEL=info  # debugから変更
```

**解決策2:** 開発中は query.log を無効化

Prismaのクエリログは大量になる可能性があります。`src/config/logger.ts` の `createPrismaLogger` を編集してください。

### 古いログを削除

```bash
# 30日以上前のログを削除
find logs/ -name "*.log.gz" -mtime +30 -delete

# すべてのローテーション済みログを削除
rm logs/*.gz
```

### ログファイルが開けない（権限エラー）

```bash
# ログディレクトリの権限を確認
ls -la logs/

# 権限を修正
chmod 755 logs/
chmod 644 logs/*.log
```

## ログの活用例

### 1. エラー調査

```bash
# 最新のエラーを確認
tail -20 logs/error.log | jq '.'

# エラーの種類を集計
cat logs/error.log | jq -r '.err.type' | sort | uniq -c
```

### 2. パフォーマンス分析

```bash
# レスポンスタイムが1秒以上のリクエスト
cat logs/app.log | jq 'select(.responseTime > 1000)'

# エンドポイント別の平均レスポンスタイム
cat logs/app.log | jq -s 'group_by(.req.url) |
  map({url: .[0].req.url, avg: (map(.responseTime) | add/length)})'
```

### 3. ユーザー行動の追跡

```bash
# 特定IPアドレスのアクセスログ
cat logs/app.log | jq 'select(.req.remoteAddress == "192.168.1.100")'

# リクエストが多いエンドポイント
cat logs/app.log | jq -r '.req.url' | sort | uniq -c | sort -rn | head -10
```

## 参考リンク

- [Pino公式ドキュメント](https://getpino.io/)
- [jq マニュアル](https://jqlang.github.io/jq/manual/)
- [rotating-file-stream](https://github.com/iccicci/rotating-file-stream)
