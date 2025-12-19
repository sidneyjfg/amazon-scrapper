const amazonDownloadService = require('../services/download.service');

module.exports = async function downloadFlow(page) {
  console.log('⬇️ Executando DownloadFlow...');
  return amazonDownloadService.download(page);
};
