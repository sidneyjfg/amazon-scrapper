const path = require('path');
const fs = require('fs').promises;
const {
  waitForStableZip,
  extractXmlsAndClean,
  prepareDownloads,
  sendFilesViaSFTP,
  delay,
  cleanDirectory
} = require('../utils/automation.utils');
const { filterXmlsByNatOp } = require('../utils/xml.utils');

const { cli } = require('winston/lib/winston/config');

async function download(page) {
  const expectedInvoices = await page.evaluate(() => {
    return window.__TOTAL_INVOICES__ || 0;
  });

  console.log(`📊 Total esperado de XMLs: ${expectedInvoices}`);

  const downloadDir = process.env.DOWNLOAD_PATH || './downloads';
  const unzipDir = path.join(downloadDir, 'extraido');
  const clientId = process.env.CLIENT_ID || 'default_client';
  const platformId = process.env.PLATFORM_ID || 'amazon';

  await fs.mkdir(downloadDir, { recursive: true });
  await prepareDownloads(downloadDir, 'extraido');

  // ⏳ aguarda ZIP
  const zipPath = await waitForStableZip(downloadDir, 320000); // <--- E A CHAMADA AQUI  console.log(`✅ Download concluído: ${zipPath}`);

  await delay(3000);
  console.log('🧹 Limpando diretório para extração...');
  await cleanDirectory(unzipDir);
  await delay(1000);
  // 📦 extrai XMLs
  const extractedCount = await extractXmlsAndClean(zipPath, unzipDir);
  console.log(`📦 XMLs extraídos: ${extractedCount}`);

  // 🔍 FILTRO POR natOp
  const allowedNatOps = process.env.ALLOWED_NAT_OP
    ? process.env.ALLOWED_NAT_OP.split(';').map(v => v.trim())
    : [];

  let acceptedFiles = null;
  let rejectedCount = 0;

  if (allowedNatOps.length > 0) {
    const { accepted, rejected } = await filterXmlsByNatOp(
      unzipDir,
      allowedNatOps
    );

    acceptedFiles = accepted;
    rejectedCount = rejected.length;

    console.log(`🧾 XMLs aceitos por natOp: ${accepted.length}`);
    console.log(`🚫 XMLs rejeitados por natOp: ${rejected.length}`);
  } else {
    console.log('⚠️ Nenhum filtro de natOp configurado, enviando todos os XMLs.');
  }

  // 🚚 envia SOMENTE os aceitos
  const uploadResult = await sendFilesViaSFTP(
    unzipDir,
    clientId,
    platformId,
    acceptedFiles // ← aqui está o pulo do gato
  );

  return {
    totalEsperado: expectedInvoices,
    totalExtraidos: extractedCount,
    totalEnviados: uploadResult.filesSent,
    totalIgnorados: uploadResult.skipped + rejectedCount,
    totalRejeitadosNatOp: rejectedCount
  };
}

module.exports = { download };
