import puppeteer from 'puppeteer';

(async () => {
  console.log('🔍 Analyzing page load issues on localhost:3000...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Track all errors
  const errors = {
    console: [],
    page: [],
    network: [],
    react: []
  };

  // Console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.console.push({ text, args: msg.args() });
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning' && text.includes('Warning:')) {
      errors.react.push(text);
      console.log(`⚠️  React Warning: ${text.substring(0, 100)}...`);
    }
  });

  // Page errors
  page.on('pageerror', error => {
    errors.page.push({
      message: error.message,
      stack: error.stack
    });
    console.log(`💥 Page Error: ${error.message}`);
  });

  // Network failures
  page.on('requestfailed', request => {
    errors.network.push({
      url: request.url(),
      error: request.failure().errorText
    });
    console.log(`🚫 Network Failed: ${request.url()}`);
  });

  // Response errors
  page.on('response', response => {
    if (response.status() >= 400) {
      errors.network.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      if (response.status() !== 404 || !response.url().includes('favicon')) {
        console.log(`⚠️  HTTP ${response.status()}: ${response.url()}`);
      }
    }
  });

  try {
    console.log('📡 Loading page...\n');

    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n✅ Page loaded\n');

    // Check DOM state
    const domInfo = await page.evaluate(() => {
      return {
        hasRoot: !!document.getElementById('root'),
        hasDebugPanel: !!document.querySelector('[style*="position: fixed"][style*="bottom: 0"]'),
        imageCount: document.querySelectorAll('img').length,
        errorDivs: Array.from(document.querySelectorAll('[style*="rgba(255,0,0"]')).map(el => el.textContent),
        bodyClasses: document.body.className,
        hasBackgroundPreview: !!document.querySelector('[id^="preview-"]'),
        hasDownloadElements: document.querySelectorAll('[id^="download-"]').length
      };
    });

    console.log('🔍 DOM State:');
    console.log(`  - Root element: ${domInfo.hasRoot ? '✅' : '❌'}`);
    console.log(`  - Debug panel: ${domInfo.hasDebugPanel ? '✅' : '❌'}`);
    console.log(`  - Images loaded: ${domInfo.imageCount}`);
    console.log(`  - Background preview: ${domInfo.hasBackgroundPreview ? '✅' : '❌'}`);
    console.log(`  - Download elements: ${domInfo.hasDownloadElements}`);

    if (domInfo.errorDivs.length > 0) {
      console.log(`  - Error messages displayed: ${domInfo.errorDivs.length}`);
      domInfo.errorDivs.forEach(msg => console.log(`    • ${msg}`));
    }

    // Summary
    console.log('\n📊 Error Summary:');
    console.log(`  - Console errors: ${errors.console.length}`);
    console.log(`  - Page errors: ${errors.page.length}`);
    console.log(`  - Network errors: ${errors.network.filter(e => !e.url?.includes('favicon')).length}`);
    console.log(`  - React warnings: ${errors.react.length}`);

    if (errors.console.length > 0) {
      console.log('\n🔴 Console Errors Details:');
      errors.console.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.text}`);
      });
    }

    if (errors.page.length > 0) {
      console.log('\n🔴 Page Errors Details:');
      errors.page.forEach((err, i) => {
        console.log(`\n${i + 1}. ${err.message}`);
        console.log(`   Stack: ${err.stack?.substring(0, 200)}...`);
      });
    }

    if (errors.react.length > 0) {
      console.log('\n⚠️  React Warnings (first 3):');
      errors.react.slice(0, 3).forEach((warn, i) => {
        console.log(`\n${i + 1}. ${warn.substring(0, 300)}...`);
      });
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  } finally {
    await browser.close();
  }
})();
