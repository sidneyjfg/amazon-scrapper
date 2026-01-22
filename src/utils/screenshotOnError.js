const fs = require('fs');
const path = require('path');

async function captureErrorScreenshot(page, label = 'error') {
  try {
    if (!page || page.isClosed()) return null;

    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const filename = `amazon_error_${label}_${ts}.png`;
    const filepath = path.join('/tmp', filename);

    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    return {
      file: filepath,
      name: filename,
      timestamp: ts
    };
  } catch (err) {
    console.error('❌ Falha ao gerar screenshot:', err.message);
    return null;
  }
}

module.exports = { captureErrorScreenshot };
