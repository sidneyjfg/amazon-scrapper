const amazonLoginService = require('../services/auth.service');
const { captureErrorScreenshot } = require('../utils/screenshotOnError');

module.exports = async function loginFlow(page, credentials) {
  try {
    console.log('🔐 Executando LoginFlow...');
    await amazonLoginService.login(page, credentials);
  } catch (err) {
    const shot = await captureErrorScreenshot(page, 'login');

    err.screenshot = shot;
    throw err;
  }
};
