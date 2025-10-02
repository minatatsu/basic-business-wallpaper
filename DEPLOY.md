# Vercelへのデプロイ手順

## 1. Vercel CLIのインストール

```bash
npm i -g vercel
```

## 2. Vercelにログイン

```bash
vercel login
```

## 3. プロジェクトのデプロイ

```bash
vercel
```

初回デプロイ時に以下の質問に答えます：
- Set up and deploy? → Y
- Which scope? → あなたのアカウント/チームを選択
- Link to existing project? → N
- What's your project's name? → wallpaper（または任意の名前）
- In which directory is your code located? → ./
- Want to override the settings? → N

## 4. Basic認証の設定

### 方法1: Vercel Dashboardから設定（推奨）

1. https://vercel.com/dashboard にアクセス
2. デプロイしたプロジェクトを選択
3. Settings → Deployment Protection
4. "Password Protection" を有効化
5. パスワードを設定（例: wallpaper2025）

### 方法2: 環境変数を使う場合

Vercel Dashboardで環境変数を設定：

```
BASIC_AUTH_USER=basic
BASIC_AUTH_PASSWORD=wallpaper2025
```

## 5. 本番環境へのデプロイ

```bash
vercel --prod
```

## デフォルト認証情報

**ユーザー名**: basic
**パスワード**: wallpaper2025

**重要**: 本番環境では必ずパスワードを変更してください。

## カスタムドメインの設定（オプション）

1. Vercel Dashboard → Settings → Domains
2. カスタムドメインを追加

## 環境変数の確認

```bash
vercel env ls
```

## ログの確認

```bash
vercel logs
```
