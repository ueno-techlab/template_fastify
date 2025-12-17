# Docker権限設定ガイド

[← READMEに戻る](../README.md)

## 問題

Dockerコンテナ内でrootユーザーで実行すると、作成されたファイルがホスト側でもroot所有になり、編集できなくなる問題が発生します。

## 解決方法

このプロジェクトは**ホストとコンテナで同じUID/GIDを使用**することで権限問題を解決しています。

### 1. Dockerfile

```dockerfile
ARG USER_UID=1000
ARG USER_GID=1000

RUN groupadd -g ${USER_GID} nodeuser && \
    useradd -u ${USER_UID} -g nodeuser -m -s /bin/bash nodeuser

USER nodeuser
```

### 2. compose.yml

```yaml
build:
  args:
    - USER_UID=${USER_UID:-1000}
    - USER_GID=${USER_GID:-1000}
user: "${USER_UID:-1000}:${USER_GID:-1000}"
```

### 3. .env（オプション）

```env
USER_UID=1000
USER_GID=1000
```

## 使用シナリオ別の動作

| シナリオ | 動作 | 権限 |
|---------|------|------|
| Dev Container使用 | 自動でホストのUID/GIDに一致 | ✅ 問題なし |
| Docker Compose（.env設定） | `.env`のUID/GIDを使用 | ✅ 問題なし |
| Docker Compose（.env未設定） | デフォルト1000を使用 | ✅ 大抵のLinuxで問題なし |
| WSLから直接ファイル編集 | ホストユーザーとして編集 | ✅ 問題なし |
| node_modules | ホストにマウント（名前付きボリューム不使用） | ✅ 問題なし |

## node_modulesの扱いについて

このプロジェクトでは**node_modulesをホストにマウント**しています（名前付きボリュームは使用していません）。

### 理由

- 名前付きボリュームは初回作成時にroot所有になる可能性があり、権限問題を引き起こす
- ホストマウントならUID/GID設定により、常に正しい権限で管理される
- WSL環境でも実用上十分なパフォーマンス

### 注意事項

- `node_modules/`は`.gitignore`に含まれており、Gitにコミットされません
- ホスト側で`npm install`を実行すると、ホストのnode環境とコンテナが混在する可能性があるため、**コンテナ内で実行**してください

## トラブルシューティング

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

## よくある質問

### Q. なぜUID/GID=1000がデフォルト？

A. ほとんどのLinuxディストリビューションで、最初に作成されるユーザーのUID/GIDは1000です。これにより、多くの環境で設定なしで動作します。

### Q. macOSでも権限問題は発生しますか？

A. macOSのDocker Desktopは仮想化レイヤーでファイル権限を透過的に処理するため、通常は問題になりません。

### Q. 既存のファイルの権限を修正するには？

A. 以下のコマンドでホストユーザーに所有権を変更できます：

```bash
sudo chown -R $(id -u):$(id -g) .
```
