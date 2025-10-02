import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定
 * 画像ダウンロードの自動テスト
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 画像生成は並列実行しない（メモリ節約）
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 1ワーカーで実行（メモリ節約）
  reporter: 'html',
  timeout: 180000, // 3分（Figmaデータのbase64変換に時間がかかる）
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
