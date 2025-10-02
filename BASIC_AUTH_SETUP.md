# Basic認証の設定手順

## デプロイ完了

✅ 本番環境URL: https://wallpaper-5rnsixl3q-minatatsus-projects.vercel.app

## Basic認証について

このアプリケーションには軽量なクライアントサイド認証が実装されています。

### デフォルト設定

- **パスワード**: `wallpaper2025`

### パスワードの変更方法

#### 1. Vercel Dashboardで環境変数を設定

1. https://vercel.com/dashboard にアクセスしてログイン
2. 「wallpaper」プロジェクトをクリック
3. 上部メニューから **Settings** をクリック
4. 左サイドバーから **Environment Variables** を選択
5. 以下の環境変数を追加:

```
Name: VITE_AUTH_PASSWORD
Value: your-secure-password-here
```

6. **Environment** で `Production` を選択
7. 「Save」をクリック

#### 2. 再デプロイ

環境変数を設定したら、再デプロイが必要です:

```bash
vercel --prod
```

または、Vercel Dashboard → Deployments → 最新のデプロイの右側の「...」→ Redeploy

### ローカル開発環境でのパスワード設定

1. プロジェクトルートに `.env` ファイルを作成（`.env.example` をコピー）:

```bash
cp .env.example .env
```

2. `.env` ファイルを編集:

```
VITE_AUTH_PASSWORD=your-local-password
```

3. 開発サーバーを再起動:

```bash
npm run dev
```

## 仕組み

- ログインページでパスワードを入力
- 正しいパスワードを入力すると `sessionStorage` に認証状態を保存
- ブラウザタブを閉じるまで認証状態が維持されます
- タブを閉じると再度ログインが必要になります

## セキュリティに関する注意

⚠️ **重要**

- これは軽量な認証実装です
- クライアントサイドでの検証のため、技術的な知識があれば回避可能です
- 機密性の高い情報を扱う場合は、サーバーサイド認証の実装を検討してください
- 本番環境では必ずデフォルトパスワードを変更してください

## トラブルシューティング

### ログインできない場合

1. ブラウザのキャッシュをクリア
2. シークレットモードで再度アクセス
3. Vercel Dashboardで環境変数が正しく設定されているか確認
4. 環境変数設定後に再デプロイしたか確認

### ログイン画面が表示されない場合

1. ブラウザのコンソールでエラーを確認
2. Vercel Dashboardでビルドログを確認
3. sessionStorageをクリアして再度アクセス
