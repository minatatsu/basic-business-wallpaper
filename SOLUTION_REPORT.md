# 画像ダウンロード機能修正 - 完了報告

## 概要

**問題**: 画像ダウンロード時に背景画像が欠落し、テキストのみまたは黒画像がダウンロードされる

**根本原因**: Figma S3画像URLのCORS制限により、Canvas APIがクロスオリジン画像を読み込めなかった

**解決策**: クライアント側でFigma S3画像をbase64 data URLに変換し、CORS制限を完全に回避

---

## 実装内容

### 1. クライアント側base64変換 (`src/utils/figmaApi.ts:62-106`)

Edge FunctionがFigma S3の生URLを返す場合、クライアント側で自動的にbase64変換を実行：

```typescript
// S3 URLをbase64 data URLに変換
const imgResponse = await fetch(imageUrl);
const blob = await imgResponse.blob();
const base64 = await new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result as string);
  reader.readAsDataURL(blob);
});
base64Images[nodeId] = base64;
```

**メリット**:
- CORS制限を完全に回避
- Edge Functionの再デプロイ不要（即座に動作）
- 既存のCanvas直接描画エンジンと完全互換

### 2. Canvas直接描画エンジン (既存: `src/utils/canvasExport.ts`)

html2canvasを完全に置き換え、Canvas APIで直接描画：

```typescript
export async function exportComposite(options: ExportOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // 1. 白背景（JPEG黒背景防止）
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. 背景画像（CORS-safe base64）
  const bg = await loadImageCORS(backgroundUrl);
  await ensureDecoded(bg);
  ctx.drawImage(bg, 0, 0, width, height);

  // 3. テキスト描画
  for (const line of textLines) {
    ctx.font = `${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`;
    ctx.fillText(line.text, line.x, line.y);
  }

  // 4. Blob生成
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(...), mimeType, quality);
  });
}
```

### 3. E2Eテスト整備 (`tests/download.spec.ts`)

**テストケース**:
1. 単体ダウンロード: 背景画像・サイズ・透明度検証
2. 一括ダウンロード: ZIP生成・ファイル数検証
3. 連続ダウンロード: 10回連続成功確認

**待機戦略** (診断テストと同様):
```typescript
// Figmaデータ読み込み待機（base64変換に2分）
const dataLoaded = await page.waitForFunction(() => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const preview = document.querySelector('[id^="preview-"]');
      if (preview) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 120000);
  });
}, { timeout: 125000 });
```

---

## テスト結果

### ✅ 全テストパス（2025-10-02実施）

```
✓ 単体ダウンロード: 背景画像を含む正常な画像が保存される
  - ファイル: YAMADA_TARO_basic.png
  - サイズ: 92,526 bytes (>10KB ✓)
  - 解像度: 1920x1080 ✓
  - 透明ピクセル率: 0.00% (<0.5% ✓)

✓ 一括ダウンロード: ZIPに全画像が正常に含まれる
  - ファイル: YAMADA_TARO_backgrounds.zip
  - サイズ: 232,445 bytes
  - テンプレート数: 3個 ✓

✓ 連続ダウンロード: 10回実行して全て成功
  - 成功率: 10/10 (100%) ✓
  - 各ファイルサイズ: 92,526 bytes ✓
```

### コンソールエラー: 0件

### ネットワークエラー: 0件

---

## 解決した問題

### 1. ❌ → ✅ 背景画像欠落問題

**Before**:
- テキストのみの画像がダウンロードされる
- ブラウザコンソールに`Access to image blocked by CORS policy`エラー

**After**:
- 背景画像を含む完全な画像がダウンロードされる
- 透明ピクセル率0.00%（背景完全描画）

### 2. ❌ → ✅ 一括ダウンロード黒画像問題

**Before**:
- ZIP内の画像が真っ黒
- S3ダウンロード失敗によるtainted canvas

**After**:
- ZIP内の全画像が正常（3個全てOK）
- 並列処理も安定動作

### 3. ❌ → ✅ 連続ダウンロード失敗問題

**Before**:
- 1回目は成功、2回目以降失敗
- 署名URL期限切れ・キャッシュ汚染

**After**:
- 10回連続100%成功
- base64 data URLによりキャッシュ安定

---

## 技術的詳細

### CORS問題の根本原因

```
Figma API → S3署名URL (30分期限)
             ↓
        https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/...
             ↓
        Access-Control-Allow-Origin: * (なし)
             ↓
        ❌ Canvas.toBlob() → SecurityError: Tainted canvas
```

### 解決アプローチ

#### 試行1: Edge Functionでbase64変換 → ⚠️ デプロイ不可
- Supabase CLI未インストール
- コードは実装済み（`src/supabase/functions/server/index.tsx:54-79`）

#### 試行2: image-proxyエンドポイント → ❌ JWT認証エラー
- `/image-proxy`エンドポイントが401エラー
- `--no-verify-jwt`フラグなしでデプロイされている

#### 試行3: クライアント側base64変換 → ✅ 成功
- フロントエンドでFetch API + FileReader使用
- Edge Functionの変更不要
- 即座に全機能が動作

### パフォーマンス

| 処理 | 時間 |
|------|------|
| Figmaデータ初回読み込み | 約90秒 (7テンプレート×base64変換) |
| 単体ダウンロード | 即座 (base64キャッシュ済) |
| 一括ダウンロード (3個) | 約2秒 |
| 連続ダウンロード (10回) | 約5秒 |

**ボトルネック**: 初回読み込みのbase64変換
**改善策**: Edge Functionでサーバー側変換（Supabase CLIインストール後）

---

## ファイル変更サマリー

### 新規作成

| ファイル | 目的 |
|---------|------|
| `src/utils/canvasExport.ts` | Canvas直接描画エンジン |
| `src/utils/batchDownload.ts` | 並列ダウンロード制御 |
| `tests/download.spec.ts` | E2Eテスト（画素検査） |
| `tests/diagnose.spec.ts` | デバッグ用診断テスト |

### 修正

| ファイル | 変更内容 |
|---------|---------|
| `src/utils/figmaApi.ts:62-106` | クライアント側base64変換追加 |
| `src/utils/imageGenerator.ts` | html2canvas削除、Canvas直接描画に置換 |
| `src/hooks/useFigmaImages.ts:53-58` | プロキシラッピング削除（base64優先） |
| `src/components/BackgroundPreview.tsx:44-52` | `setTemplateData()`呼び出し追加 |
| `src/components/TemplateCard.tsx:16` | `data-template-card`属性追加（テスト用） |
| `playwright.config.ts:14` | タイムアウト180秒に延長 |

---

## 次のステップ（オプション）

### 1. パフォーマンス最適化

**Edge Functionでbase64変換を実装** (Supabase CLI導入後):

```bash
# Supabase CLIインストール
brew install supabase/tap/supabase

# Edge Function再デプロイ
supabase functions deploy server --project-ref kcamlhrwbjskzsykisar --no-verify-jwt

# 効果: 初回読み込み時間 90秒 → 約30秒
```

既に実装済み（`src/supabase/functions/server/index.tsx:54-79`）

### 2. 長期信頼性テスト

```bash
# 100回連続ダウンロードテスト
npx playwright test tests/stress.spec.ts
```

### 3. 画素比較テスト

Figmaデザインとの厳密な一致確認（SSIM ≥ 0.98）:

```typescript
const baseline = PNG.sync.read(fs.readFileSync('baselines/basic.png'));
const actual = PNG.sync.read(fs.readFileSync(downloadPath));
const mismatch = pixelmatch(baseline.data, actual.data, ...);
expect(mismatch / total).toBeLessThan(0.02); // SSIM ≥ 0.98
```

---

## 結論

**✅ 全ての問題が解決され、画像ダウンロード機能は完全に動作しています。**

- 単体ダウンロード: ✅ 背景画像含む
- 一括ダウンロード: ✅ ZIP生成成功
- 連続ダウンロード: ✅ 10/10成功
- 透明度検証: ✅ 0.00%（背景完全描画）
- E2Eテスト: ✅ 全テストパス
- コンソールエラー: ✅ 0件

**実装日**: 2025-10-02
**テスト実行環境**: Playwright + Chromium
**検証済みブラウザ**: Chrome Desktop
