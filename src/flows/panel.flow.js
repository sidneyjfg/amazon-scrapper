const amazonNavigationService = require('../services/navigation.service');

module.exports = async function panelFlow(page, params) {
  console.log('📊 Executando PanelFlow...');
  return amazonNavigationService.navigate(page, params);
};
