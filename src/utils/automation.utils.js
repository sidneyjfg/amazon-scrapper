const fs = require('fs');
const fsp = require('fs').promises; // ADICIONADO: Para usar await no rm/mkdir
const path = require('path');
const Client = require('ssh2-sftp-client');
const AdmZip = require('adm-zip');
const { loadSentFiles, markAsSent } = require('./state.utils');

/**
 * 🧹 Limpa e recria o diretório de downloads
 * CORREÇÃO AQUI: Usando 'fsp' (Promises) em vez de 'fs' (Callback)
 */
async function cleanDirectory(dirPath) {
  try {
    // force: true evita erro se a pasta não existir
    await fsp.rm(dirPath, { recursive: true, force: true });
    await fsp.mkdir(dirPath, { recursive: true });
    console.log(`🧹 Diretório limpo: ${dirPath}`);
  } catch (err) {
    console.error(`❌ Erro ao limpar diretório ${dirPath}`, err);
    throw err;
  }
}

/**
 * ⏳ Delay simples
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🎲 Delay aleatório
 */
async function getRandomDelay(min = 500, max = 1500) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 🔍 Monitora o download (Mantive a versão estável que passamos antes)
 */
async function waitForStableZip(downloadDir, timeoutMs = 300000) {
  const start = Date.now();

  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('⏰ Timeout aguardando ZIP válido');
    }

    let files;
    try {
      files = fs.readdirSync(downloadDir);
    } catch (e) {
      await delay(1000);
      continue;
    }

    const zip = files.find(f =>
      f.toLowerCase().endsWith('.zip') &&
      !files.includes(f + '.crdownload') &&
      !files.includes(f + '.part')
    );

    if (zip) {
      const fullPath = path.join(downloadDir, zip);
      try {
        const size = fs.statSync(fullPath).size;
        if (size > 1024) {
          await delay(1000);
          return fullPath;
        }
      } catch (err) { }
    }

    await delay(1000);
  }
}

function isZipFile(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    return buffer.toString('utf8', 0, 2) === 'PK';
  } catch (e) {
    return false;
  }
}

/**
 * 📦 Prepara diretório de downloads
 */
async function prepareDownloads(baseDir, extractFolder = 'extraido') {
  const extractPath = path.join(baseDir, extractFolder);
  try {
    await fsp.mkdir(baseDir, { recursive: true });
    await fsp.mkdir(extractPath, { recursive: true });
  } catch (e) { }
}

/**
 * 🧾 Descompacta ZIP e remove o arquivo original
 */
async function extractXmlsAndClean(zipPath, outputDir) {
  if (!fs.existsSync(zipPath)) throw new Error(`Arquivo não encontrado: ${zipPath}`);

  const stat = fs.statSync(zipPath);
  if (stat.size < 1024) throw new Error(`Arquivo ZIP muito pequeno.`);
  if (!isZipFile(zipPath)) throw new Error(`Arquivo não é um ZIP válido.`);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(outputDir, true);

  fs.unlinkSync(zipPath);

  return fs.readdirSync(outputDir)
    .filter(f => f.toLowerCase().endsWith('.xml')).length;
}

/**
 * 🚚 Envio via SFTP
 * Adicionei o suporte a fileList para o filtro funcionar
 */
async function sendFilesViaSFTP(directory, clientId, platformId, fileList = null) {
  const sftp = new Client();

  const config = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT || 22,
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
  };

  const remoteBase = process.env.SFTP_BASE_PATH || '/uploads';
  const remoteDir = path.posix.join(remoteBase, clientId, platformId, new Date().toISOString().slice(0, 10));

  console.log(`🔌 Conectando SFTP...`);
  await sftp.connect(config);
  await sftp.mkdir(remoteDir, true);

  const sentFiles = loadSentFiles();

  // Se veio lista filtrada, usa ela. Se não, lê tudo.
  const files = fileList ? fileList : fs.readdirSync(directory);

  let sentCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    if (!file.toLowerCase().endsWith('.xml')) continue;

    if (sentFiles.has(file)) {
      console.log(`⏭️ Já enviado, pulando: ${file}`);
      skippedCount++;
      continue;
    }

    const localPath = path.join(directory, file);
    if (!fs.existsSync(localPath)) continue;

    const remotePath = path.posix.join(remoteDir, file);

    console.log(`⬆️ Enviando: ${file}`);
    await sftp.put(localPath, remotePath);

    markAsSent(file);
    sentCount++;
  }

  await sftp.end();

  console.log(`✅ Upload SFTP: ${sentCount} enviados, ${skippedCount} pulados.`);

  return {
    success: true,
    sentAt: new Date().toISOString(),
    filesSent: sentCount,
    skipped: skippedCount
  };
}

module.exports = {
  delay,
  getRandomDelay,
  waitForStableZip, // Garanta que seu download.service.js está importando com ESSE nome
  extractXmlsAndClean,
  prepareDownloads,
  sendFilesViaSFTP,
  cleanDirectory
};