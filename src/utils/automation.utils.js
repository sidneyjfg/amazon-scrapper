const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const Client = require('ssh2-sftp-client');
async function cleanDirectory(dirPath) {
  try {
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
 * @param {number} ms
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 🎲 Delay aleatório (comportamento humano)
 * @param {number} min
 * @param {number} max
 */
async function getRandomDelay(min = 500, max = 1500) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return ms;
}

async function waitForStableZip(downloadDir, timeoutMs = 300000) {
  const start = Date.now();

  while (true) {
    const files = fs.readdirSync(downloadDir);

    const zip = files.find(f =>
      f.endsWith('.zip') &&
      !files.includes(`${f}.crdownload`)
    );

    if (zip) {
      const fullPath = path.join(downloadDir, zip);
      const size = fs.statSync(fullPath).size;

      if (size > 1024) {
        return fullPath;
      }
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error('⏰ Timeout aguardando ZIP válido');
    }

    await delay(1000);
  }
}

function isZipFile(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(4);
  fs.readSync(fd, buffer, 0, 4, 0);
  fs.closeSync(fd);

  return buffer.toString('utf8', 0, 2) === 'PK';
}

/**
 * 📥 Aguarda o download de um arquivo (ZIP, PDF, etc)
 * Monitora diretório até aparecer arquivo final
 */
async function waitForDownloadComplete(downloadDir, timeoutMs = 300000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const files = require('fs').readdirSync(downloadDir);

      const completedZip = files.find(f =>
        f.toLowerCase().endsWith('.zip')
      );

      if (completedZip) {
        clearInterval(interval);
        resolve(path.join(downloadDir, completedZip));
      }

      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error('⏰ Timeout aguardando download do ZIP'));
      }
    }, 1000);
  });
}


/**
 * 📦 Prepara diretório de downloads
 */
async function prepareDownloads(baseDir, extractFolder = 'extraido') {
  const extractPath = path.join(baseDir, extractFolder);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, { recursive: true });
  }
}


/**
 * 🧾 Descompacta ZIP e remove o arquivo original
 * (implementação real pode usar unzipper / adm-zip)
 */
async function extractXmlsAndClean(zipPath, outputDir) {
  const AdmZip = require('adm-zip');

  const stat = fs.statSync(zipPath);

  if (stat.size < 1024) {
    throw new Error(`Arquivo ZIP muito pequeno: ${zipPath}`);
  }

  if (!isZipFile(zipPath)) {
    const preview = fs.readFileSync(zipPath, 'utf8').slice(0, 300);
    throw new Error(
      `Arquivo baixado NÃO é ZIP.\nConteúdo inicial:\n${preview}`
    );
  }

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(outputDir, true);

  fs.unlinkSync(zipPath);

  return fs.readdirSync(outputDir)
    .filter(f => f.toLowerCase().endsWith('.xml')).length;
}




/**
 * 🚚 Envio via SFTP (stub pronto)
 * Aqui você pluga ssh2-sftp-client
 */

const { loadSentFiles, markAsSent } = require('./state.utils');

async function sendFilesViaSFTP(directory, clientId, platformId) {
  const sftp = new Client();

  const config = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT || 22,
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASSWORD,
  };

  const remoteBase =
    process.env.SFTP_BASE_PATH || '/uploads';

  const remoteDir = path.posix.join(
    remoteBase,
    clientId,
    platformId,
    new Date().toISOString().slice(0, 10)
  );

  await sftp.connect(config);
  await sftp.mkdir(remoteDir, true);

  const sentFiles = loadSentFiles();
  const files = fs.readdirSync(directory);

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
    const remotePath = path.posix.join(remoteDir, file);

    await sftp.put(localPath, remotePath);

    markAsSent(file);
    sentCount++;

    console.log(`📤 Enviado com sucesso: ${file}`);
  }

  await sftp.end();

  console.log('📡 Upload SFTP concluído com sucesso.');
  console.log(`✅ Enviados agora: ${sentCount}`);
  console.log(`⏭️ Pulados (já enviados): ${skippedCount}`);

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
  waitForDownloadComplete,
  extractXmlsAndClean,
  prepareDownloads,
  sendFilesViaSFTP,
  cleanDirectory
};
