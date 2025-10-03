import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test("ビジュアル確認: プレビューとダウンロード画像の比較", async ({ page }) => {
  console.log("[ビジュアル確認] テスト開始");

  // アプリを開く
  await page.goto("http://localhost:3000");
  console.log("[ビジュアル確認] ページ読み込み完了");

  // Figmaデータの読み込みを待つ (diagnose.spec.tsと同じロジック)
  const dataLoaded = await page
    .evaluate(
      () => {
        return new Promise<boolean>((resolve) => {
          const checkInterval = setInterval(() => {
            if (
              window.__TEMPLATE_DATA__ &&
              Object.keys(window.__TEMPLATE_DATA__).length > 0
            ) {
              clearInterval(checkInterval);
              resolve(true);
            }
          }, 100);

          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(false);
          }, 10000);
        });
      },
      { timeout: 15000 },
    )
    .catch(() => false);

  if (!dataLoaded) {
    throw new Error("Figma data failed to load");
  }
  console.log("[ビジュアル確認] ✓ Figmaデータ読み込み完了");

  // フォーム入力 (diagnose.spec.tsと同じセレクタ)
  await page
    .locator("text=姓（日本語）")
    .locator("..")
    .locator("input")
    .fill("診断テスト");
  await page
    .locator("text=名（日本語）")
    .locator("..")
    .locator("input")
    .fill("ユーザー");
  await page
    .locator("text=姓（ローマ字）")
    .locator("..")
    .locator("input")
    .fill("TEST");
  await page
    .locator("text=名（ローマ字）")
    .locator("..")
    .locator("input")
    .fill("USER");
  console.log("[ビジュアル確認] ✓ フォーム入力完了");

  // テンプレート選択 (diagnose.spec.tsと同じ)
  const templates = page.locator("[data-template-card]");
  await templates.first().click();
  console.log("[ビジュアル確認] ✓ Basicテンプレート選択完了");

  // プレビュー画像の読み込みを待つ
  await page.waitForSelector('img[alt*="Background"]', {
    state: "visible",
    timeout: 10000,
  });
  console.log("[ビジュアル確認] ✓ プレビュー画像表示完了");

  // プレビューのスクリーンショットを撮る
  const previewArea = page.locator('[role="tabpanel"]').first();
  await previewArea.screenshot({ path: "test-results/preview-screenshot.png" });
  console.log(
    "[ビジュアル確認] ✓ プレビューのスクリーンショット保存: test-results/preview-screenshot.png",
  );

  // ダウンロードボタンをクリック
  const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
  await page.click('button:has-text("ダウンロード")');
  const download = await downloadPromise;
  console.log(
    `[ビジュアル確認] ✓ ダウンロード開始: ${download.suggestedFilename()}`,
  );

  // ダウンロードファイルを保存
  const downloadPath = path.join("test-results", download.suggestedFilename());
  await download.saveAs(downloadPath);
  console.log(`[ビジュアル確認] ✓ ダウンロード完了: ${downloadPath}`);

  // ファイルが存在することを確認
  expect(fs.existsSync(downloadPath)).toBe(true);
  const stats = fs.statSync(downloadPath);
  console.log(`[ビジュアル確認] ✓ ファイルサイズ: ${stats.size} bytes`);

  console.log("\n==========================================");
  console.log("次のファイルを手動で比較してください:");
  console.log("1. プレビュー: test-results/preview-screenshot.png");
  console.log("2. ダウンロード: " + downloadPath);
  console.log("==========================================\n");
});
