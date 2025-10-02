import { test, expect } from '@playwright/test';

test('診断: ダウンロード機能の状態確認', async ({ page }) => {
  await page.goto('/');

  // 1. Figmaデータ読み込み待機
  console.log('[診断] Figmaデータ読み込み待機中...');

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
      }, 10000);
    });
  }, { timeout: 15000 }).catch(() => false);

  if (!dataLoaded) {
    console.log('[診断] ✗ Figmaデータ読み込み失敗 - タイムアウト');
    throw new Error('Figma data failed to load');
  }

  console.log('[診断] ✓ Figmaデータ読み込み完了');

  // 2. コンソールエラー監視
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log('[ブラウザ]', text);
  });

  // 3. フォーム入力
  console.log('[診断] フォーム入力中...');

  // ラベルの下にある入力フィールドを取得
  await page.locator('text=姓（日本語）').locator('..').locator('input').fill('診断テスト');
  await page.locator('text=名（日本語）').locator('..').locator('input').fill('ユーザー');
  await page.locator('text=姓（ローマ字）').locator('..').locator('input').fill('TEST');
  await page.locator('text=名（ローマ字）').locator('..').locator('input').fill('USER');

  console.log('[診断] ✓ フォーム入力完了');

  // 4. テンプレート選択
  console.log('[診断] テンプレート選択中...');
  const templates = page.locator('[data-template-card]');
  const count = await templates.count();
  console.log(`[診断] 利用可能なテンプレート数: ${count}`);

  if (count > 0) {
    await templates.first().click();
    console.log('[診断] ✓ テンプレート選択完了');
  } else {
    throw new Error('No templates available');
  }

  // プレビューのスクリーンショットを撮る
  await page.waitForTimeout(1000); // プレビュー描画を待つ
  const previewTab = page.locator('[role="tabpanel"]').first();
  await previewTab.screenshot({ path: 'test-results/preview.png' });
  console.log('[診断] ✓ プレビューのスクリーンショット保存: test-results/preview.png');

  // 5. ダウンロードボタン状態確認
  const downloadBtn = page.locator('button:has-text("ダウンロード")');
  const isDisabled = await downloadBtn.isDisabled();
  console.log(`[診断] ダウンロードボタン状態: ${isDisabled ? '無効' : '有効'}`);

  // 6. 内部状態の確認（デバッグ情報取得）
  const debugInfo = await page.evaluate(() => {
    const win = window as any;
    return {
      hasSetTemplateDataFunction: typeof win.setTemplateData === 'function',
      templateDataModuleKeys: Object.keys(win.__TEMPLATE_DATA__ || {}),
      formDataExists: !!win.__FORM_DATA__,
    };
  });

  console.log('[診断] 内部状態:', JSON.stringify(debugInfo, null, 2));

  // 7. ダウンロード試行
  console.log('[診断] ダウンロード試行中...');

  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await downloadBtn.click();

    const download = await downloadPromise;
    const filename = await download.suggestedFilename();

    // ダウンロードファイルを保存
    const downloadPath = `test-results/${filename}`;
    await download.saveAs(downloadPath);

    console.log('[診断] ✓ ダウンロード成功:', downloadPath);
    console.log('\n==========================================');
    console.log('次のファイルを比較してください:');
    console.log('1. プレビュー: test-results/preview.png');
    console.log(`2. ダウンロード: ${downloadPath}`);
    console.log('==========================================\n');
  } catch (error) {
    console.log('[診断] ✗ ダウンロード失敗:', error);

    // エラー時のコンソールメッセージ表示
    console.log('[診断] === コンソールメッセージ履歴 ===');
    consoleMessages.forEach(msg => console.log(msg));

    throw error;
  }
});
