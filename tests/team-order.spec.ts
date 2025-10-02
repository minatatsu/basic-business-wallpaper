import { test } from "@playwright/test";

test("所属情報の並び順確認", async ({ page }) => {
  // Capture console logs
  page.on('console', msg => console.log(`[ブラウザ] [${msg.type()}] ${msg.text()}`));

  await page.goto("http://localhost:3000");

  // Figmaデータ読み込み待ち
  await page.evaluate(() => {
    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        if (window.__TEMPLATE_DATA__ && Object.keys(window.__TEMPLATE_DATA__).length > 0) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(false);
      }, 10000);
    });
  }, { timeout: 15000 });

  // フォーム入力
  await page.locator('text=姓（日本語）').locator('..').locator('input').fill('五十嵐');
  await page.locator('text=名（日本語）').locator('..').locator('input').fill('太郎');
  await page.locator('text=姓（ローマ字）').locator('..').locator('input').fill('ISOBATA');
  await page.locator('text=名（ローマ字）').locator('..').locator('input').fill('RYOTARO');

  // 所属情報入力（フォームの順序通り）
  await page.locator('text=部門1').locator('..').locator('input').fill('マーケ企画部');
  await page.locator('text=部門2').locator('..').locator('input').fill('第一グループ');
  await page.locator('text=グループ').locator('..').locator('input').fill('Aチーム');
  await page.locator('text=役職').locator('..').locator('input').fill('マネージャー');

  // テンプレート選択
  await page.locator('[data-template-card]').first().click();

  // プレビュー待機
  await page.waitForTimeout(1000);

  // プレビューのスクリーンショット
  const previewTab = page.locator('[role="tabpanel"]').first();
  await previewTab.screenshot({ path: 'test-results/team-order-preview.png' });

  // ダウンロード
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
  await page.click('button:has-text("ダウンロード")');
  const download = await downloadPromise;
  await download.saveAs('test-results/team-order-download.png');

  console.log('\n==========================================');
  console.log('所属情報の並び順を確認:');
  console.log('1. プレビュー: test-results/team-order-preview.png');
  console.log('2. ダウンロード: test-results/team-order-download.png');
  console.log('==========================================\n');
});
