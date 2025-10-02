import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { FormData, TEMPLATES, TemplateData } from '../types';
import { exportComposite, buildTextLines } from './canvasExport';
import { runWithConcurrency, getOptimalConcurrency, Task, TaskResult } from './batchDownload';

// グローバルに保存されたテンプレートデータ
let globalTemplateData: Record<string, TemplateData> = {};

/**
 * テンプレートデータをグローバルに設定
 * BackgroundPreview.tsxから呼び出される
 */
export function setTemplateData(data: Record<string, TemplateData>): void {
  globalTemplateData = data;
  console.log('[ImageGenerator] Template data updated:', Object.keys(data));
}

/**
 * html2canvasでDOM要素を画像化（新アプローチ）
 * TemplateDownloadCanvasのDOM要素をそのまま画像化することで、
 * プレビューと完全に一致するレイアウトを実現
 */
export async function generatePNG(templateId: string, formData: FormData): Promise<Blob> {
  console.log(`[ImageGenerator] Generating PNG for template: ${templateId} (html2canvas)`);

  // テンプレートデータを取得
  const templateData = globalTemplateData[templateId];
  if (!templateData) {
    console.error('[ImageGenerator] Available templates:', Object.keys(globalTemplateData));
    throw new Error(`Template data not found: ${templateId}. Did you call setTemplateData()?`);
  }

  // TemplateDownloadCanvasのDOM要素を取得
  const downloadElement = document.getElementById(`download-${templateId}`);
  if (!downloadElement) {
    throw new Error(`Download canvas element not found: download-${templateId}. Make sure the template is selected.`);
  }

  console.log(`[ImageGenerator] Found download element for ${templateId}`);

  // 背景画像の読み込みを待つ
  const bgImage = downloadElement.querySelector('img');
  if (bgImage && !bgImage.complete) {
    console.log(`[ImageGenerator] Waiting for background image to load...`);
    await new Promise<void>((resolve, reject) => {
      bgImage.onload = () => resolve();
      bgImage.onerror = () => reject(new Error('Background image failed to load'));
      // 既に読み込まれている場合のフォールバック
      if (bgImage.complete) resolve();
    });
    console.log(`[ImageGenerator] ✓ Background image loaded`);
  }

  // html2canvasでDOM要素をCanvas化
  try {
    console.log(`[ImageGenerator] Starting html2canvas...`);
    const canvas = await html2canvas(downloadElement, {
      width: 1920,
      height: 1080,
      scale: 1,
      useCORS: true, // base64画像なのでCORS問題なし
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: true, // デバッグのため有効化
      ignoreElements: (element) => {
        // 念のため: 予期しない要素をスキップ
        return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
      },
    });

    console.log(`[ImageGenerator] ✓ Canvas created: ${canvas.width}x${canvas.height}`);

    // CanvasをBlobに変換
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('toBlob returned null'));
          }
        },
        'image/png'
      );
    });

    console.log(`[ImageGenerator] ✓ PNG generated successfully:`, {
      templateId,
      size: blob.size,
      type: blob.type
    });

    return blob;
  } catch (error) {
    console.error(`[ImageGenerator] ✗ Failed to generate PNG:`, error);
    throw error;
  }
}

export function generateFilename(formData: FormData, templateId: string): string {
  const lastName = formData.last_name_en || formData.last_name_jp;
  const firstName = formData.first_name_en || formData.first_name_jp;
  
  // Sanitize filename
  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${sanitize(lastName)}_${sanitize(firstName)}_${templateId}.png`;
}

export async function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ZIP生成（並列制御付き）
 * メモリ枯渇を防ぐため、並列数を制限して処理
 */
export async function generateZip(
  selectedTemplates: string[],
  formData: FormData,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  let completedCount = 0;

  console.log(`[ImageGenerator] Starting ZIP generation for ${selectedTemplates.length} templates`);

  // 並列制御付きで各テンプレートの画像を生成
  const concurrency = getOptimalConcurrency();
  const tasks: Task[] = selectedTemplates.map((templateId) => ({
    name: templateId,
    run: async () => {
      const pngBlob = await generatePNG(templateId, formData);
      const filename = generateFilename(formData, templateId);
      zip.file(filename, pngBlob);

      completedCount++;
      onProgress?.(completedCount, selectedTemplates.length);

      // UI更新のための小さな遅延
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }));

  const results = await runWithConcurrency(tasks, concurrency);

  // エラーチェック
  const errors = results.filter(r => r.status === 'error');
  if (errors.length > 0) {
    console.error(`[ImageGenerator] ${errors.length} templates failed:`, errors);
    throw new Error(`Failed to generate ${errors.length} images. Check console for details.`);
  }

  console.log('[ImageGenerator] ✓ All images generated, creating ZIP...');

  // ZIP生成
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  console.log(`[ImageGenerator] ✓ ZIP created:`, {
    size: zipBlob.size,
    filesCount: selectedTemplates.length
  });

  return zipBlob;
}

export async function downloadMultipleImages(
  selectedTemplates: string[],
  formData: FormData,
  onProgress?: (current: number, total: number) => void
) {
  if (selectedTemplates.length === 1) {
    // Single download
    const blob = await generatePNG(selectedTemplates[0], formData);
    const filename = generateFilename(formData, selectedTemplates[0]);
    await downloadImage(blob, filename);
  } else {
    // ZIP download
    const zipBlob = await generateZip(selectedTemplates, formData, onProgress);
    const lastName = formData.last_name_en || formData.last_name_jp;
    const firstName = formData.first_name_en || formData.first_name_jp;
    const zipFilename = `${lastName}_${firstName}_backgrounds.zip`;
    await downloadImage(zipBlob, zipFilename);
  }
}
