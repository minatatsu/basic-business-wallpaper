# 画像ダウンロード時の背景画像CORS問題 - 調査ドキュメント

## 問題の概要

画像ダウンロード時に、**背景画像がCORSエラーにより正しくダウンロードされず、テキストのみの画像になってしまう**問題が発生しています。

### 現象

- プレビュー画面では背景画像が正常に表示される
- ダウンロードボタンを押すと、背景画像が含まれない（白背景にテキストのみ）画像がダウンロードされる
- コンソールにCORS関連のエラーは出ていない可能性があるが、html2canvasが背景画像をキャプチャできていない

---

## プロジェクト構成

### 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Supabase Edge Functions (Deno + Hono)
- **画像生成**: html2canvas
- **デザインソース**: Figma API

### アーキテクチャ概要

```
[Figma API]
    ↓ (画像URL取得)
[Supabase Edge Function]
    ↓ (プロキシ + base64変換)
[React App]
    ↓ (html2canvas)
[PNG画像ダウンロード]
```

---

## 関連ファイルと実装詳細

### 1. 画像生成ロジック (`src/utils/imageGenerator.ts`)

**目的**: html2canvasを使ってDOMをPNG画像に変換

**現在の実装**:

```typescript
export async function generatePNG(templateId: string): Promise<Blob> {
  const downloadElement = document.getElementById(`download-${templateId}`);

  const canvas = await html2canvas(downloadElement, {
    scale: 1,
    backgroundColor: "#ffffff",
    width: 1920,
    height: 1080,
    useCORS: true, // ← CORS画像を許可
    allowTaint: false, // ← taintedなcanvasを許可しない
    foreignObjectRendering: false, // ← SVG foreignObjectを使わない
    logging: true,
    onclone: (clonedDoc, clonedElement) => {
      // oklch色をrgbに変換する処理
      convertElementColors(downloadElement, clonedElement);
    },
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to generate image"));
      }
    }, "image/png");
  });
}
```

**問題点**:

- `useCORS: true` を設定しているが、背景画像が読み込めていない
- `allowTaint: false` により、CORS制限のある画像があるとcanvasが汚染(tainted)される
- Tainted canvasからは `toBlob()` や `toDataURL()` でデータを取り出せない

---

### 2. 背景画像の表示 (`src/components/BackgroundPreview.tsx`)

**プレビュー用コンポーネント** (`TemplatePreviewCanvas`):

```tsx
// プレビュー表示では問題なく画像が表示される
<img
  src={templateData.imageUrl} // ← base64 data URL
  alt={template?.displayName}
  style={{
    position: "absolute",
    width: "100%",
    height: "100%",
    objectFit: "contain",
  }}
/>
```

**ダウンロード用コンポーネント** (`TemplateDownloadCanvas`):

```tsx
// 画面外に配置された固定サイズ (1920x1080) の要素
<div
  id={`download-${templateId}`}
  style={{
    width: "1920px",
    height: "1080px",
    position: "relative",
  }}
>
  <img
    src={templateData.imageUrl} // ← base64 data URL
    style={{
      position: "absolute",
      width: "1920px",
      height: "1080px",
      objectFit: "cover",
    }}
  />
  {/* テキストレイヤー */}
</div>
```

**ポイント**:

- ダウンロード用の要素は `position: fixed; left: '-9999px'` で画面外に配置
- プレビューと同じ `templateData.imageUrl` を使用しているが、html2canvasでキャプチャする際に問題が発生

---

### 3. Figma画像URL取得とプロキシ処理

#### 3-1. フロントエンド (`src/utils/figmaApi.ts`)

```typescript
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-b35d308f`;

// 現在使用されているwrapImageUrl関数（実際には未使用の可能性あり）
export function wrapImageUrl(figmaUrl: string): string {
  return `${API_BASE}/image-proxy?url=${encodeURIComponent(figmaUrl)}`;
}

// Figma画像URL取得
export async function fetchFigmaImageUrls(
  nodeIds: string[],
): Promise<Record<string, string>> {
  const url = `${API_BASE}/figma/images?fileKey=${FIGMA_CONFIG.fileKey}&nodeIds=${nodeIds.join(",")}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  });

  const data = await response.json();
  // data.images = { "nodeId": "base64DataURL", ... }
  return data.images || {};
}
```

**現在の仕様**:

- Supabase Edge Functionから**base64 data URL形式**で画像が返される
- `wrapImageUrl()` 関数は定義されているが、実際には使用されていない模様

#### 3-2. バックエンド (`src/supabase/functions/server/index.tsx`)

```typescript
// Figma画像URL取得エンドポイント
app.get("/make-server-b35d308f/figma/images", async (c) => {
  const figmaToken = Deno.env.get("FIGMA_ACCESS_TOKEN");
  const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds}&format=png&scale=2`;

  const response = await fetch(url, {
    headers: { "X-Figma-Token": figmaToken },
  });

  const data = await response.json();
  // data = { images: { "nodeId": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/..." } }

  // ここでFigma S3のURLをbase64に変換して返す処理があるはず（コードに明示されていない）
  return c.json(data);
});

// 画像プロキシエンドポイント（CORSバイパス用）
app.get("/make-server-b35d308f/image-proxy", async (c) => {
  const imageUrl = c.req.query("url");

  // Figma S3から画像を取得
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  // CORS headerをつけて返す
  return new Response(arrayBuffer, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/png",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
```

**重要な発見**:

1. `/figma/images` エンドポイントでFigma APIから取得したURLを**そのまま返すのではなく、base64に変換している可能性**（コード上明示されていない）
2. `/image-proxy` エンドポイントは定義されているが、**現在使用されていない**
3. 画像がbase64 data URLで返されているため、理論上CORSエラーは発生しないはず

---

### 4. 画像データの流れ

#### Step 1: Figma APIから画像URL取得

```
Figma API -> Edge Function
  Response: {
    images: {
      "123:456": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/abc123..."
    }
  }
```

#### Step 2: Edge Functionでの処理（推測）

```typescript
// 推測: Edge Function内で各画像URLをfetchしてbase64化
const figmaImageUrls = await fetchFigmaImagesFromAPI();
const base64Images = {};

for (const [nodeId, url] of Object.entries(figmaImageUrls)) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  base64Images[nodeId] = `data:image/png;base64,${base64}`;
}

return { images: base64Images };
```

#### Step 3: フロントエンドで受け取り

```typescript
// useFigmaImages.ts
const urls = await fetchFigmaImageUrls(nodeIds);
// urls = { "123:456": "data:image/png;base64,iVBORw0KG..." }

mappedData[template.id] = {
  imageUrl: urls[nodeId],  // ← base64 data URL
  textLayers: {...},
  frames: {...},
};
```

#### Step 4: レンダリング

```tsx
// BackgroundPreview.tsx
<img src={templateData.imageUrl} />
// src="data:image/png;base64,iVBORw0KG..."
```

#### Step 5: html2canvasでキャプチャ（**問題発生箇所**）

```typescript
// imageGenerator.ts
const downloadElement = document.getElementById(`download-${templateId}`);
// downloadElement内の<img src="data:image/png;base64,...">をキャプチャ

const canvas = await html2canvas(downloadElement, {
  useCORS: true,
  allowTaint: false,
  // ...
});
```

---

## 問題の原因分析

### 仮説1: base64画像のサイズ問題

base64エンコードされた画像が非常に大きく、html2canvasが処理できない可能性。

**確認方法**:

- `templateData.imageUrl` の長さをコンソールで確認
- 通常、1920x1080のPNG画像は数MB程度だが、base64化すると約33%増加

### 仮説2: 画像ロード完了前のキャプチャ

ダウンロード用要素（画面外）の `<img>` タグが読み込み完了する前にhtml2canvasが実行されている可能性。

**確認ポイント**:

- `TemplateDownloadCanvas` の `<img>` に `onLoad` イベントは設定されていない
- html2canvas呼び出し前に画像のロードを待つ処理がない

### 仮説3: html2canvasのCORS/Taint処理

- base64 data URLはCORS制限を受けないはずだが、html2canvasの内部処理で問題が発生している可能性
- `useCORS: true` と `allowTaint: false` の組み合わせが問題を引き起こしている可能性

### 仮説4: 画面外要素のレンダリング問題

- `position: fixed; left: '-9999px'` で画面外に配置された要素は、ブラウザが画像の読み込みを遅延または省略する可能性
- Lazy loadingや viewport外の最適化が影響している可能性

---

## これまでの対策（推測）

### 1. Supabase Edge Functionを使ったプロキシ

- Figma S3のURLを直接使わず、Supabase経由でプロキシ
- **base64変換により、CORS問題を根本的に回避しようとした**

### 2. html2canvasの設定調整

```typescript
useCORS: true,           // CORS画像を許可
allowTaint: false,        // Taintedなcanvasを拒否
foreignObjectRendering: false,  // SVGを使わない
```

### 3. oncloneでの色変換処理

- Tailwind CSSの `oklch` カラーをRGBに変換
- これによりテキストの色は正しくキャプチャされている

---

## 未解決の課題

### 1. base64画像のロードタイミング

**問題**: 画面外要素の `<img>` が読み込み完了していない可能性

**解決案**:

```typescript
async function ensureImagesLoaded(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
  });
  await Promise.all(promises);
}

// generatePNG関数内で使用
await ensureImagesLoaded(downloadElement);
const canvas = await html2canvas(downloadElement, {...});
```

### 2. html2canvasの代替手段

**選択肢A**: dom-to-imageライブラリを試す

```bash
npm install dom-to-image
```

**選択肢B**: Puppeteerなどでサーバーサイドレンダリング

- Edge Functionで画像生成
- クライアント側の制約を回避

**選択肢C**: Canvasで直接描画

```typescript
const canvas = document.createElement("canvas");
canvas.width = 1920;
canvas.height = 1080;
const ctx = canvas.getContext("2d");

// 背景画像を描画
const img = new Image();
img.src = templateData.imageUrl;
await new Promise((resolve) => (img.onload = resolve));
ctx.drawImage(img, 0, 0, 1920, 1080);

// テキストを描画
// ... フォント、位置、色などを設定して描画
```

### 3. allowTaint設定の見直し

**現在**: `allowTaint: false`

- Tainted canvasを許可しないため、CORS問題があると `toBlob()` が失敗

**代替案**: `allowTaint: true` を試す

```typescript
const canvas = await html2canvas(downloadElement, {
  useCORS: true,
  allowTaint: true, // ← 変更
  // ...
});
```

ただし、これでもCORS制限のある画像はキャプチャできない可能性がある。

---

## デバッグ手順

### 1. 画像URLの確認

```typescript
// BackgroundPreview.tsx または imageGenerator.ts
console.log("[DEBUG] Image URL:", templateData.imageUrl.substring(0, 100));
console.log("[DEBUG] Image URL length:", templateData.imageUrl.length);
console.log(
  "[DEBUG] Is base64:",
  templateData.imageUrl.startsWith("data:image"),
);
```

### 2. 画像ロード状態の確認

```typescript
// TemplateDownloadCanvas
<img
  src={templateData.imageUrl}
  onLoad={() => console.log('✓ Download image loaded')}
  onError={(e) => console.error('✗ Download image error:', e)}
/>
```

### 3. html2canvasのログ確認

```typescript
const canvas = await html2canvas(downloadElement, {
  logging: true, // ← 詳細ログを有効化
  // ...
});
```

### 4. Canvas内容の確認

```typescript
const canvas = await html2canvas(downloadElement, {...});

// Canvasを一時的に表示して内容を確認
document.body.appendChild(canvas);
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.zIndex = '10000';
canvas.style.border = '2px solid red';
```

---

## 次のアクション候補

### 優先度: 高

1. **画像ロード待機処理の追加**
   - `generatePNG()` 内で `ensureImagesLoaded()` を実装
   - ダウンロード用要素の全画像がロード完了してからhtml2canvas実行

2. **allowTaint設定の変更テスト**
   - `allowTaint: true` に変更して動作確認

3. **デバッグログの追加**
   - 画像URL、ロード状態、Canvas内容を確認

### 優先度: 中

4. **dom-to-imageライブラリの検証**
   - html2canvasの代わりに試す

5. **Canvas直接描画への移行**
   - 背景画像 + テキストを手動で描画
   - html2canvasの依存を排除

### 優先度: 低

6. **サーバーサイドレンダリング**
   - Puppeteer + Edge Functionで画像生成
   - クライアント側の制約を完全に回避

---

## 参考情報

### html2canvas公式ドキュメント

- [GitHub: niklasvh/html2canvas](https://github.com/niklasvh/html2canvas)
- [CORS Issues](https://html2canvas.hertzen.com/faq#cors-issues)

### 関連する既知の問題

- html2canvasはCORS制限のある画像を扱う際に `useCORS: true` が必要
- `allowTaint: false` の場合、Tainted canvasからデータを取り出せない
- 画面外要素のキャプチャ時、画像が読み込まれていない場合がある

### ファイルパス一覧

```
/Users/minamitatsuya/workspace/wallpaper/
├── src/
│   ├── utils/
│   │   ├── imageGenerator.ts          # 画像生成ロジック
│   │   └── figmaApi.ts                # Figma API呼び出し
│   ├── components/
│   │   └── BackgroundPreview.tsx     # プレビュー&ダウンロード用UI
│   ├── hooks/
│   │   └── useFigmaImages.ts         # Figma画像データ取得hook
│   └── supabase/
│       └── functions/
│           └── server/
│               └── index.tsx          # Edge Function (プロキシ)
├── package.json
└── vite.config.ts
```

---

## まとめ

### 現在の状況

- **プレビューは正常**: base64 data URLで画像が表示される
- **ダウンロードが失敗**: html2canvasが背景画像をキャプチャできない
- **CORSエラーは表面化していない**: base64化により回避されているはず

### 最も可能性の高い原因

**画面外要素の画像ロード未完了**

- ダウンロード用要素（`download-${templateId}`）が画面外に配置されている
- `<img>` タグのロード完了を待たずにhtml2canvasが実行されている

### 推奨する最初の対策

1. `generatePNG()` 内で画像ロード待機処理を追加
2. デバッグログで画像URL・ロード状態を確認
3. `allowTaint: true` を試してみる

これらの対策で解決しない場合は、Canvas直接描画への移行を検討。
