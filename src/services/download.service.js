const path = require('path');
const fs = require('fs').promises; // Usando promises aqui também
const {
  waitForStableZip,
  extractXmlsAndClean,
  prepareDownloads,
  sendFilesViaSFTP,
  delay,
  cleanDirectory
} = require('../utils/automation.utils');
const { filterXmlsByNatOp } = require('../utils/xml.utils');

async function download(page) {
  // Pega total esperado da página (injeção do script anterior)
  const expectedInvoices = await page.evaluate(() => {
    return window.__TOTAL_INVOICES__ || 0;
  });

  console.log(`📊 Total esperado de XMLs: ${expectedInvoices}`);

  const downloadDir = process.env.DOWNLOAD_PATH || './downloads';
  const unzipDir = path.join(downloadDir, 'extraido');
  const clientId = process.env.CLIENT_ID || 'default_client';
  const platformId = process.env.PLATFORM_ID || 'amazon';

  // Garante diretórios
  await prepareDownloads(downloadDir, 'extraido');

  // 1. Aguarda o Download do ZIP (Versão corrigida e estável)
  const zipPath = await waitForStableZip(downloadDir, 320000);
  console.log(`✅ Download concluído: ${zipPath}`);

  await delay(3000);

  // 2. Limpa pasta de extração (Agora seguro sem erro de callback)
  console.log('🧹 Limpando diretório para extração...');
  await cleanDirectory(unzipDir);
  await delay(1000);

  // 3. Extrai
  const extractedCount = await extractXmlsAndClean(zipPath, unzipDir);
  console.log(`📦 XMLs extraídos: ${extractedCount}`);

  // 4. Lógica de Filtro por NatOp
  const allowedNatOps = process.env.ALLOWED_NAT_OP
    ? process.env.ALLOWED_NAT_OP.split(';').map(v => v.trim())
    : [];

  let acceptedFiles = null; // Null significa "enviar tudo"
  let rejectedCount = 0;

  if (allowedNatOps.length > 0) {
    const { accepted, rejected } = await filterXmlsByNatOp(
      unzipDir,
      allowedNatOps
    );

    acceptedFiles = accepted; // Lista de nomes de arquivos aceitos
    rejectedCount = rejected.length;

    console.log(`🧾 XMLs aceitos por natOp: ${accepted.length}`);
    console.log(`🚫 XMLs rejeitados por natOp: ${rejected.length}`);
  } else {
    console.log('⚠️ Nenhum filtro de natOp configurado, enviando todos os XMLs.');
  }

  // 5. Envia SFTP (Passando a lista filtrada)
  const uploadResult = await sendFilesViaSFTP(
    unzipDir,
    clientId,
    platformId,
    acceptedFiles // ← Agora a função lá no utils sabe lidar com isso
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