import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOWNLOADS_DIR = path.resolve(__dirname, "../.downloads");
const BASELINES_DIR = path.resolve(__dirname, "./baselines");

/**
 * 画素比較ヘルパー
 */
function comparePngs(
  baselinePath: string,
  actualPath: string,
): {
  total: number;
  diff: number;
  ratio: number;
} {
  if (!fs.existsSync(baselinePath)) {
    console.warn(`Baseline not found: ${baselinePath}`);
    return { total: 0, diff: 0, ratio: 0 };
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const actual = PNG.sync.read(fs.readFileSync(actualPath));

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `Image size mismatch: baseline ${baseline.width}x${baseline.height}, actual ${actual.width}x${actual.height}`,
    );
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );

  const total = width * height;
  return { total, diff: mismatch, ratio: mismatch / total };
}

/**
 * ページヘルパー: テンプレート選択 + フォーム入力
 */
async function fillForm(page: Page) {
  // 待機: Figmaテンプレートの読み込み完了（base64変換に時間がかかる）
  const dataLoaded = await page
    .waitForFunction(
      () => {
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
          }, 120000); // 2分タイムアウト
        });
      },
      { timeout: 125000 },
    )
    .catch(() => false);

  if (!dataLoaded) {
    throw new Error("Figma data failed to load");
  }

  console.log("[Test] ✓ Figma data loaded");

  // フォーム入力
  await page
    .locator("text=姓（日本語）")
    .locator("..")
    .locator("input")
    .fill("山田");
  await page
    .locator("text=名（日本語）")
    .locator("..")
    .locator("input")
    .fill("太郎");
  await page
    .locator("text=姓（ローマ字）")
    .locator("..")
    .locator("input")
    .fill("YAMADA");
  await page
    .locator("text=名（ローマ字）")
    .locator("..")
    .locator("input")
    .fill("TARO");

  console.log("[Test] ✓ Form filled");

  // テンプレート選択（1つ目）
  const templates = page.locator("[data-template-card]");
  const count = await templates.count();
  console.log(`[Test] Available templates: ${count}`);

  if (count > 0) {
    await templates.first().click();
    console.log("[Test] ✓ Template selected");
  } else {
    throw new Error("No templates available");
  }
}

test.describe("画像ダウンロード", () => {
  test.beforeAll(() => {
    // ダウンロードディレクトリ準備
    if (!fs.existsSync(DOWNLOADS_DIR)) {
      fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
    }
    // 既存ファイル削除
    const files = fs.readdirSync(DOWNLOADS_DIR);
    files.forEach((file) => fs.unlinkSync(path.join(DOWNLOADS_DIR, file)));
  });

  test("単体ダウンロード: 背景画像を含む正常な画像が保存される", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const requestFailed: string[] = [];

    page.on("console", (msg) => {
      if (["error", "warning"].includes(msg.type())) {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    page.on("requestfailed", (req) => {
      requestFailed.push(
        `${req.failure()?.errorText ?? "unknown"} ${req.url()}`,
      );
    });

    try {
      await page.goto("/");

      // フォーム入力
      await fillForm(page);

      // ダウンロード実行
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.locator('button:has-text("ダウンロード")').click(),
      ]);

      const filename = await download.suggestedFilename();
      const targetPath = path.join(DOWNLOADS_DIR, filename);
      await download.saveAs(targetPath);

      console.log(`[Test] Downloaded: ${targetPath}`);

      // ファイル存在チェック
      expect(fs.existsSync(targetPath), "Downloaded file should exist").toBe(
        true,
      );

      // ファイルサイズチェック（最低10KB）
      const stat = fs.statSync(targetPath);
      expect(
        stat.size,
        "File should be larger than 10KB (background included)",
      ).toBeGreaterThan(10000);

      // PNG形式チェック
      const png = PNG.sync.read(fs.readFileSync(targetPath));
      expect(png.width, "Image width should be 1920").toBe(1920);
      expect(png.height, "Image height should be 1080").toBe(1080);

      // 透明ピクセル率チェック（背景が欠落していないか）
      let transparentPixels = 0;
      for (let i = 0; i < png.data.length; i += 4) {
        const alpha = png.data[i + 3];
        if (alpha < 10) transparentPixels++;
      }
      const transparentRatio = transparentPixels / (png.width * png.height);
      expect(
        transparentRatio,
        "Transparent pixel ratio should be less than 0.5%",
      ).toBeLessThan(0.005);

      console.log(`[Test] Image validation passed:`, {
        size: stat.size,
        width: png.width,
        height: png.height,
        transparentRatio: `${(transparentRatio * 100).toFixed(2)}%`,
      });

      // コンソールエラーチェック
      expect(
        consoleErrors,
        `Console errors found:\n${consoleErrors.join("\n")}`,
      ).toHaveLength(0);

      // ネットワークエラーチェック
      expect(
        requestFailed,
        `Request failures found:\n${requestFailed.join("\n")}`,
      ).toHaveLength(0);
    } catch (error) {
      console.error("[Test] Test failed:", error);
      throw error;
    }
  });

  test("一括ダウンロード: ZIPに全画像が正常に含まれる", async ({ page }) => {
    const consoleErrors: string[] = [];
    const requestFailed: string[] = [];

    page.on("console", (msg) => {
      if (["error", "warning"].includes(msg.type())) {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    page.on("requestfailed", (req) => {
      requestFailed.push(
        `${req.failure()?.errorText ?? "unknown"} ${req.url()}`,
      );
    });

    try {
      await page.goto("/");

      // フォーム入力
      await fillForm(page);

      // 複数テンプレート選択（最初の3つ）
      const templates = page.locator("[data-template-card]");
      const count = Math.min(3, await templates.count());
      for (let i = 0; i < count; i++) {
        await templates.nth(i).click();
      }

      console.log(`[Test] Selected ${count} templates`);

      // ZIP ダウンロード実行
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 120000 }), // 2分タイムアウト
        page.locator('button:has-text("ダウンロード")').click(),
      ]);

      const filename = await download.suggestedFilename();
      const zipPath = path.join(DOWNLOADS_DIR, filename);
      await download.saveAs(zipPath);

      console.log(`[Test] Downloaded ZIP: ${zipPath}`);

      // ZIPファイル存在チェック
      expect(fs.existsSync(zipPath), "ZIP file should exist").toBe(true);

      // ZIPファイルサイズチェック（最低50KB × 枚数）
      const stat = fs.statSync(zipPath);
      expect(stat.size, "ZIP should contain multiple images").toBeGreaterThan(
        50000 * count,
      );

      console.log(`[Test] ZIP validation passed:`, {
        size: stat.size,
        templatesCount: count,
      });

      // コンソールエラーチェック
      expect(
        consoleErrors,
        `Console errors found:\n${consoleErrors.join("\n")}`,
      ).toHaveLength(0);

      // ネットワークエラーチェック
      expect(
        requestFailed,
        `Request failures found:\n${requestFailed.join("\n")}`,
      ).toHaveLength(0);
    } catch (error) {
      console.error("[Test] Test failed:", error);
      throw error;
    }
  });

  test("連続ダウンロード: 10回実行して全て成功", async ({ page }) => {
    await page.goto("/");
    await fillForm(page);

    const results: { success: boolean; size: number }[] = [];

    for (let i = 0; i < 10; i++) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 30000 }),
          page.locator('button:has-text("ダウンロード")').click(),
        ]);

        const filename = `test_${i}.png`;
        const targetPath = path.join(DOWNLOADS_DIR, filename);
        await download.saveAs(targetPath);

        const stat = fs.statSync(targetPath);
        results.push({ success: true, size: stat.size });

        console.log(`[Test] Download ${i + 1}/10: ✓ (${stat.size} bytes)`);

        // 次のダウンロードまで少し待機
        await page.waitForTimeout(500);
      } catch (error) {
        results.push({ success: false, size: 0 });
        console.error(`[Test] Download ${i + 1}/10: ✗`, error);
      }
    }

    // 全て成功していることを確認
    const successCount = results.filter((r) => r.success).length;
    expect(successCount, "10/10 downloads should succeed").toBe(10);

    // 全てのファイルサイズが10KB以上であることを確認
    results.forEach((result, i) => {
      expect(
        result.size,
        `Download ${i + 1} should be larger than 10KB`,
      ).toBeGreaterThan(10000);
    });

    console.log(`[Test] Continuous download test passed: ${successCount}/10`);
  });
});
