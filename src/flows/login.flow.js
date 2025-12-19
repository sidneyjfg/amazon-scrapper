const amazonLoginService = require('../services/auth.service');

module.exports = async function loginFlow(page, credentials) {
  console.log('🔐 Executando LoginFlow...');
  await amazonLoginService.login(page, credentials);
};
