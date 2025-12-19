const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

module.exports = async function createBrowser() {
  const browser = await puppeteer.launch({
    headless: "new",
    protocolTimeout: 70 * 60 * 1000, // ⬅️ 70 minutos
    slowMo: 30,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  // ✅ cria a página PRIMEIRO
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  // ✅ define diretório de download
  const downloadDir = process.env.DOWNLOAD_PATH || './downloads';

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: path.resolve(downloadDir),
  });

  return { browser, page };
};
