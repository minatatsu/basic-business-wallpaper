# レイヤー配置の調整ガイド

このドキュメントでは、`/components/BackgroundPreview.tsx`内のレイヤー配置を調整する方法を説明します。

## 最新の配置改善（2025-10-01）

以下の改善が実装されています：

- **日本語姓名**: 1行、gap 64px、右揃え
- **ローマ字姓名**: 1行、gap 48px、右揃え
- **部門1・部門2**: 1行、gap 8px、右揃え（空欄時は非表示）
- **グループ**: 1行、右揃え（空欄時は非表示）
- **役職**: 1行、右揃え（空欄時は非表示）
- すべての行の右端がQRコードの右端に揃う
- テキストが長くなっても左に伸びる（右端は固定）

## 配置を制御している主要な箇所

### 1. フレーム名によるデフォルトgap設定（229-250行目）

```typescript
const getDefaultGap = () => {
  const frameName = frame.name.toLowerCase();

  // Japanese name frame (姓名): 64px gap
  if (frameName.includes("54262")) return 64;

  // Roman name frame (TANAKA TARO): 48px gap
  if (frameName.includes("54263")) return 48;

  // Department frame: 8px gap
  if (frameName.includes("54269")) return 8;

  // Default vertical spacing
  if (frame.layoutMode === "VERTICAL") return 8;

  // Default horizontal spacing
  return 0;
};
```

**調整方法:**

- フレーム名に基づいてgap値を変更できます
- Figma APIから`itemSpacing`が取得されない場合のフォールバック値

---

### 2. オートレイアウトフレームの配置（252-289行目）

```typescript
// 水平方向の配置を決定
const constraints = frame.constraints;
const frameName = frame.name.toLowerCase();

// Force right alignment for info frame and all name/profile related frames
const isRightAligned =
  constraints?.horizontal === "RIGHT" ||
  frame.primaryAxisAlignItems === "MAX" ||
  frame.counterAxisAlignItems === "MAX" ||
  frameName === "info" ||
  frameName === "profile" ||
  frameName === "name" ||
  frameName === "team" ||
  frameName.includes("frame");

const isCenterAligned = !isRightAligned && constraints?.horizontal === "CENTER";
const isScaleAligned =
  constraints?.horizontal === "LEFT_RIGHT" ||
  constraints?.horizontal === "SCALE";

// 位置計算
const frameRight = containerWidth - (frame.x + frame.width);
const frameLeft = frame.x;
const frameCenterX = frame.x + frame.width / 2;

// ネストされたフレーム vs トップレベルフレーム
const positionStyle = isNested
  ? {
      position: "relative" as const,
      ...(frame.layoutAlign === "STRETCH" ? { width: "100%" } : {}),
      ...(frame.layoutGrow !== undefined && frame.layoutGrow > 0
        ? { flexGrow: frame.layoutGrow }
        : {}),
    }
  : {
      position: "absolute" as const,
      // 右揃えの場合
      ...(isRightAligned
        ? {
            right: `${frameRight * scale}px`,
            left: "auto",
            // 中央揃えの場合
          }
        : isCenterAligned
          ? {
              left: `${frameCenterX * scale}px`,
              transform: "translateX(-50%)",
              // 左揃え（デフォルト）
            }
          : {
              left: `${frameLeft * scale}px`,
            }),
      top: `${frame.y * scale}px`,
      ...(isScaleAligned && !isNested
        ? {
            minWidth: `${frame.width * scale}px`,
          }
        : {}),
    };
```

**調整可能なパラメータ:**

- `frameRight`, `frameLeft`, `frameCenterX`: 位置計算のベース値
- `right`, `left`, `top`: ピクセル単位の位置
- 特定のフレーム名（例: `'info'`）で特別な配置ルールを追加可能

---

### 3. フレーム内の要素配置（Flexboxアライメント、291-327行目）

```typescript
// 交差軸（縦方向で横の配置）
const getAlignItems = () => {
  const frameName = frame.name.toLowerCase();

  // Force right alignment (flex-end) for vertical containers
  if (
    frame.layoutMode === "VERTICAL" &&
    (frameName === "info" ||
      frameName === "profile" ||
      frameName === "name" ||
      frameName === "team")
  ) {
    return "flex-end";
  }

  if (frame.counterAxisAlignItems === "CENTER") return "center";
  if (frame.counterAxisAlignItems === "MAX") return "flex-end";
  if (frame.counterAxisAlignItems === "MIN") return "flex-start";
  return "flex-start";
};

// 主軸（縦方向で縦の配置）
const getJustifyContent = () => {
  const frameName = frame.name.toLowerCase();

  // Force right alignment (flex-end) for horizontal name rows
  if (
    frame.layoutMode === "HORIZONTAL" &&
    (frameName.includes("54262") || // Japanese name frame
      frameName.includes("54263") || // Roman name frame
      frameName.includes("54269") || // Department frame
      frameName.includes("frame"))
  ) {
    return "flex-end";
  }

  if (frame.primaryAxisAlignItems === "CENTER") return "center";
  if (frame.primaryAxisAlignItems === "SPACE_BETWEEN") return "space-between";
  if (frame.primaryAxisAlignItems === "MAX") return "flex-end";
  if (frame.primaryAxisAlignItems === "MIN") return "flex-start";

  // Default to flex-end for name/profile related frames
  if (frameName === "name" || frameName === "profile" || frameName === "team") {
    return "flex-end";
  }

  return "flex-start";
};
```

**調整可能なパラメータ:**

- `alignItems`: 'flex-start', 'center', 'flex-end', 'stretch'
- `justifyContent`: 'flex-start', 'center', 'flex-end', 'space-between', 'space-around'

---

### 4. フレームのスタイル適用（329-350行目）

```typescript
<div
  key={frame.id}
  style={{
    ...positionStyle,
    display: 'flex',
    flexDirection,  // 'row' または 'column'
    alignItems: getAlignItems(),
    justifyContent: getJustifyContent(),
    gap: `${gap}px`,  // 子要素間のスペース
    paddingLeft: `${(frame.paddingLeft || 0) * scale}px`,
    paddingRight: `${(frame.paddingRight || 0) * scale}px`,
    paddingTop: `${(frame.paddingTop || 0) * scale}px`,
    paddingBottom: `${(frame.paddingBottom || 0) * scale}px`,
  }}
>
```

**調整可能なパラメータ:**

- `gap`: 子要素間の間隔（ピクセル）
- `padding`: 内側の余白（上下左右）
- `flexDirection`: レイアウト方向

---

### 5. 単一テキストフィールドの配置（123-167行目）

```typescript
function renderSingleTextField(fieldName: string, layerInfo: TextLayerInfo, formData: FormData, scale: number = 1) {
  const value = formData[fieldName as keyof FormData];
  if (!value || typeof value !== 'string' || value.trim() === '') return null;

  // Force right alignment for text in name/profile related layers
  const forceRightAlign = fieldName.includes('name') || fieldName.includes('department') ||
                          fieldName.includes('group') || fieldName.includes('role');
  const textAlign = forceRightAlign ? 'right' : layerInfo.textAlignHorizontal.toLowerCase();

  const alignSelf = layerInfo.layoutAlign === 'STRETCH' ? 'stretch' :
                    layerInfo.layoutAlign === 'CENTER' ? 'center' :
                    layerInfo.layoutAlign === 'MAX' ? 'flex-end' :
                    layerInfo.layoutAlign === 'MIN' ? 'flex-start' : undefined;

  return (
    <div
      style={{
        fontSize: `${layerInfo.fontSize * scale}px`,
        fontWeight: layerInfo.fontWeight,
        fontFamily: '"Noto Sans JP", sans-serif',
        color: getFillColor(layerInfo.fills),
        textAlign: textAlign as any,  // 'left', 'center', 'right'
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexGrow,
        flexShrink: 0,
        alignSelf,
      }}
    >
      {value}
    </div>
  );
}
```

**調整可能なパラメータ:**

- `fontSize`: テキストサイズ
- `fontWeight`: フォントの太さ（400, 500, 700など）
- `textAlign`: テキストの配置（'left', 'center', 'right'）
- `lineHeight`: 行の高さ
- `flexGrow`: フレックスグロー値
- `alignSelf`: 自身の配置

---

### 6. 絶対配置のテキストレイヤー（433-469行目）

オートレイアウトに含まれていない個別のテキストレイヤーの配置：

```typescript
// 制約に基づく配置
const constraints = layerInfo.constraints;
const isRightConstrained = constraints?.horizontal === 'RIGHT';
const isCenterConstrained = constraints?.horizontal === 'CENTER';

const layerRight = containerWidth - (layerInfo.x + layerInfo.width);
const layerCenterX = layerInfo.x + layerInfo.width / 2;

const positionStyle = isRightConstrained ? {
  right: `${layerRight * scale}px`,
  left: 'auto',
} : isCenterConstrained ? {
  left: `${layerCenterX * scale}px`,
  transform: 'translateX(-50%)',
} : {
  left: `${layerInfo.x * scale}px`,
};

// スタイル適用
<div
  style={{
    position: 'absolute',
    ...positionStyle,
    top: `${layerInfo.y * scale}px`,
    fontSize: `${layerInfo.fontSize * scale}px`,
    fontWeight: layerInfo.fontWeight,
    fontFamily: '"Noto Sans JP", sans-serif',
    color: getFillColor(layerInfo.fills),
    textAlign: textAlign as any,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }}
>
```

**調整可能なパラメータ:**

- `right`, `left`, `top`: ピクセル単位の絶対位置
- `transform`: CSS変換（中央揃えなど）

---

## よくある調整例

### 例1: 日本語姓名のgapを変更（64px → 70px）

```typescript
// getDefaultGap関数内
if (frameName.includes("54262")) return 70; // 64 → 70に変更
```

### 例2: ローマ字姓名のgapを変更（48px → 52px）

```typescript
// getDefaultGap関数内
if (frameName.includes("54263")) return 52; // 48 → 52に変更
```

### 例3: 縦方向の行間を広げる

```typescript
// getDefaultGap関数内
if (frame.layoutMode === "VERTICAL") return 12; // 8 → 12に変更
```

### 例4: 特定フレームを左揃えに変更

```typescript
// isRightAligned判定から特定のフレーム名を削除
const isRightAligned =
  constraints?.horizontal === "RIGHT" ||
  frame.primaryAxisAlignItems === "MAX" ||
  frame.counterAxisAlignItems === "MAX" ||
  frameName === "info" ||
  // frameName === 'profile' || // ← コメントアウトして左揃えに
  frameName === "name" ||
  frameName === "team" ||
  frameName.includes("frame");
```

### 例5: フレームの位置を微調整

```typescript
// positionStyleのright値を調整（267-274行目付近）
...(isRightAligned ? {
  right: `${(frameRight + 10) * scale}px`,  // +10px左にずらす
  left: 'auto',
} : isCenterAligned ? {
  left: `${frameCenterX * scale}px`,
  transform: 'translateX(-50%)',
} : {
  left: `${frameLeft * scale}px`,
}),
```

### 例6: フォントサイズを調整

```typescript
// renderSingleTextField関数内
fontSize: `${layerInfo.fontSize * scale * 1.1}px`,  // 10%拡大
```

### 例7: パディングを追加

```typescript
// フレームスタイル適用箇所
paddingLeft: `${(frame.paddingLeft || 0) * scale + 10}px`,   // +10px
paddingRight: `${(frame.paddingRight || 0) * scale + 10}px`,  // +10px
paddingTop: `${(frame.paddingTop || 0) * scale + 5}px`,       // +5px
paddingBottom: `${(frame.paddingBottom || 0) * scale + 5}px`, // +5px
```

---

## デバッグのヒント

配置に問題がある場合は、ブラウザの開発者ツールを使って以下を確認してください：

### 1. コンソールログの確認

アプリケーションは以下の情報をコンソールに出力します：

- Figmaテンプレートの読み込み状況
- 各テンプレートの読み込み成功・失敗
- エラーメッセージ

### 2. 要素の検査

- ブラウザの開発者ツールで要素を検査
- Flexboxレイアウトの適用状況を確認
- `position`、`right`、`left`、`top`の値を確認
- `gap`、`padding`の値を確認

### 3. 一時的なデバッグログの追加

必要に応じて、`renderAutoLayoutFrame`関数内に一時的なログを追加：

```typescript
// renderAutoLayoutFrame関数内に追加
console.log("Frame:", frame.name, {
  x: frame.x,
  y: frame.y,
  width: frame.width,
  height: frame.height,
  layoutMode: frame.layoutMode,
  gap:
    (frame.itemSpacing !== undefined ? frame.itemSpacing : getDefaultGap()) *
    scale,
  isRightAligned,
});
```

**注意**: デバッグログは大量のデータをコンソールに出力するとパフォーマンスに影響するため、確認後は削除してください。

---

## 注意事項

1. **スケール係数**: すべての位置とサイズは`scale`で乗算されます
   - プレビュー表示: 動的スケール（コンテナサイズに基づく）
   - ダウンロード用: `scale = 1`（1920x1080固定）

2. **ネストレベル**: 無限ループ防止のため、最大10レベルまで

3. **制約の優先順位**:
   1. `constraints.horizontal` (Figmaの制約設定)
   2. `primaryAxisAlignItems` / `counterAxisAlignItems` (オートレイアウト設定)
   3. フレーム名による特別ルール（例: 'info'）

4. **フォント**: すべてのテキストは `"Noto Sans JP", sans-serif` を使用
