/**
 * Canvas直接描画による画像エクスポート
 * html2canvasのCORS/tainted canvas問題を回避
 */

import {
  FormData as AppFormData,
  TextLayerInfo,
  FrameLayoutInfo,
} from "../types";

export type ExportFormat = "image/png" | "image/jpeg" | "image/webp";

export interface TextLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fontFamily: string;
  readonly fillStyle: string;
  readonly textAlign: CanvasTextAlign;
  readonly textBaseline: CanvasTextBaseline;
  readonly letterSpacing?: string;
  readonly textShadow?: string;
}

export interface ExportOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundUrl: string;
  readonly textLines: ReadonlyArray<TextLine>;
  readonly mimeType: ExportFormat;
  readonly quality?: number;
}

/**
 * CORS対応画像読み込み
 * base64 data URLでも明示的にcrossOriginを設定
 */
function loadImageCORS(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // base64 data URLでもcrossOriginを設定（念のため）
    // CORS制限のあるURLでも動作するように
    if (!url.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    const timeout = setTimeout(() => {
      reject(new Error(`Image load timeout: ${url.substring(0, 100)}`));
    }, 30000); // 30秒タイムアウト

    img.onload = () => {
      clearTimeout(timeout);
      console.log("[CanvasExport] ✓ Image loaded:", {
        url: url.substring(0, 50) + "...",
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      resolve(img);
    };

    img.onerror = (e) => {
      clearTimeout(timeout);
      console.error(
        "[CanvasExport] ✗ Image load failed:",
        url.substring(0, 100),
        e,
      );
      reject(new Error(`Image load failed: ${url.substring(0, 100)}`));
    };

    img.src = url;
  });
}

/**
 * 画像のdecode完了を待つ（対応ブラウザのみ）
 */
async function ensureDecoded(img: HTMLImageElement): Promise<void> {
  // @ts-ignore - decode()は一部のブラウザでサポート
  if (typeof img.decode === "function") {
    try {
      await img.decode();
      console.log("[CanvasExport] ✓ Image decoded");
    } catch (e) {
      console.warn(
        "[CanvasExport] ⚠ Image decode failed, continuing anyway:",
        e,
      );
    }
  }
}

/**
 * テキストにシャドウを適用
 */
function applyTextShadow(ctx: CanvasRenderingContext2D, shadow?: string): void {
  if (!shadow) return;

  // "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6), ..."
  // 最初のシャドウのみを適用（Canvasは複数シャドウ非対応）
  const parts = shadow.split(",")[0].trim().split(/\s+/);
  if (parts.length >= 4) {
    ctx.shadowOffsetX = parseFloat(parts[0]) || 0;
    ctx.shadowOffsetY = parseFloat(parts[1]) || 0;
    ctx.shadowBlur = parseFloat(parts[2]) || 0;
    ctx.shadowColor = parts.slice(3).join(" ");
  }
}

/**
 * Canvas直接描画でテンプレート画像を生成
 */
export async function exportComposite(options: ExportOptions): Promise<Blob> {
  const { width, height, backgroundUrl, textLines, mimeType, quality } =
    options;

  console.log("[CanvasExport] Starting export:", {
    width,
    height,
    backgroundUrl: backgroundUrl.substring(0, 50) + "...",
    textLinesCount: textLines.length,
    mimeType,
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false }); // alpha=falseで高速化

  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  // 1. 背景を白で塗る（JPEG黒化対策）
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  console.log("[CanvasExport] ✓ White background filled");

  // 2. 背景画像を読み込み＆描画
  try {
    const bg = await loadImageCORS(backgroundUrl);
    await ensureDecoded(bg);

    ctx.drawImage(bg, 0, 0, width, height);
    console.log("[CanvasExport] ✓ Background image drawn");
  } catch (error) {
    console.error("[CanvasExport] ✗ Failed to draw background:", error);
    throw new Error(`Background image failed: ${error}`);
  }

  // 3. テキストレイヤーを描画
  for (const [index, line] of textLines.entries()) {
    ctx.save();

    // フォント設定
    ctx.font = `${line.fontWeight} ${line.fontSize}px ${line.fontFamily}`;
    ctx.fillStyle = line.fillStyle;
    ctx.textAlign = line.textAlign;
    ctx.textBaseline = line.textBaseline;

    // letter-spacing対応（Canvas APIに直接のサポートなし、手動で調整）
    // 簡易実装：各文字を個別に描画
    if (line.letterSpacing && line.letterSpacing !== "normal") {
      const spacing = parseFloat(line.letterSpacing) || 0;
      const spacingPx = spacing * line.fontSize; // emをpxに変換

      let currentX = line.x;
      for (const char of line.text) {
        applyTextShadow(ctx, line.textShadow);
        ctx.fillText(char, currentX, line.y);
        const charWidth = ctx.measureText(char).width;
        currentX += charWidth + spacingPx;
      }
    } else {
      // 通常のテキスト描画
      applyTextShadow(ctx, line.textShadow);
      ctx.fillText(line.text, line.x, line.y);
    }

    ctx.restore();
  }
  console.log(`[CanvasExport] ✓ Drew ${textLines.length} text lines`);

  // 4. Blobに変換
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error("toBlob returned null"));
          }
        },
        mimeType,
        quality,
      );
    });

    console.log("[CanvasExport] ✓ Blob created:", {
      size: blob.size,
      type: blob.type,
    });

    return blob;
  } catch (error) {
    console.error(
      "[CanvasExport] ✗ toBlob failed (likely tainted canvas):",
      error,
    );
    throw new Error(`Canvas export failed: ${error}`);
  }
}

/**
 * Figmaテンプレートデータから TextLine 配列を生成
 */
export function buildTextLines(
  textLayers: Record<string, TextLayerInfo>,
  frames: Record<string, FrameLayoutInfo> | undefined,
  formData: AppFormData,
  scale: number = 1,
): TextLine[] {
  const lines: TextLine[] = [];

  // 簡易実装：フレーム階層を無視して全テキストレイヤーを描画
  // 本来はrenderTextFields()のロジックを移植すべき
  Object.entries(textLayers).forEach(([fieldName, layer]) => {
    const value = formData[fieldName as keyof AppFormData];
    if (!value || typeof value !== "string" || value.trim() === "") return;

    // Convert to uppercase for English name fields
    const displayValue =
      fieldName === "last_name_en" || fieldName === "first_name_en"
        ? value.toUpperCase()
        : value;

    // Get text color
    let fillStyle = "#000000";
    if (layer.fills && layer.fills.length > 0) {
      const fill = layer.fills[0];
      if (fill.type === "SOLID" && fill.color) {
        const { r, g, b } = fill.color;
        const opacity = fill.opacity !== undefined ? fill.opacity : 1;
        fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${opacity})`;
      }
    }

    // letter-spacing for name fields
    const isNameField =
      fieldName.includes("name_jp") || fieldName.includes("name_en");
    const letterSpacing = isNameField ? "0.1em" : "normal";

    // text shadow for glow effect
    const textShadow =
      "0 0 8px rgba(255, 255, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.4)";

    // Determine text alignment
    const textAlign: CanvasTextAlign =
      layer.textAlignHorizontal === "RIGHT"
        ? "right"
        : layer.textAlignHorizontal === "CENTER"
          ? "center"
          : "left";

    lines.push({
      text: displayValue,
      x: layer.x * scale,
      y: layer.y * scale,
      fontSize: layer.fontSize * scale,
      fontWeight: layer.fontWeight,
      fontFamily: '"Noto Sans JP", sans-serif',
      fillStyle,
      textAlign,
      textBaseline: "top",
      letterSpacing,
      textShadow,
    });
  });

  return lines;
}
