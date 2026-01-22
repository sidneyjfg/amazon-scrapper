const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const createBrowser = require('./core/browser');
const loginFlow = require('./flows/login.flow');
const panelFlow = require('./flows/panel.flow');
const downloadFlow = require('./flows/download.flow');
const { sendWebhookLog } = require('./utils/webhook');
const { captureErrorScreenshot } = require('./utils/screenshotOnError');

require('dotenv').config();

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 6 * * *';
const LOCK_FILE = path.resolve(__dirname, 'run.lock');

async function runJob() {
  if (fs.existsSync(LOCK_FILE)) {
    console.log('⏭️ Job já em execução. Pulando.');
    return;
  }

  fs.writeFileSync(LOCK_FILE, String(process.pid));

  let browser;
  let page;

  try {
    console.log('🚀 Iniciando execução do job...');

    const browserData = await createBrowser();
    browser = browserData.browser;
    page = browserData.page;

    await loginFlow(page, {
      platformUrl: 'https://sellercentral.amazon.com.br/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fsellercentral.amazon.com.br%2Fhome&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=sc_br_amazon_v2&openid.mode=checkid_setup&language=pt_BR&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=sc_br_amazon_v2&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&ssoResponse=eyJ6aXAiOiJERUYiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiQTI1NktXIn0.-J1nCo-RiajWT4TTVJo3BL8h9HIbj4QaWDMwAMTw_HN-btwREGh8dA.qcfL0yP1wxBgcp0E.CCAzkyLDOU2ujp0R5yZTYXWGNbM7cZgSZQThelOv4X-z6dZuqxoZ-VNlRfzFzdYumaD0AFQhTXiBAckDO9-KnJ4wAcVbesBFFyE4zKcTB6LsnAil_QgWVmx0Yi5ZD55NdG8h1eh2NVzNCJr9305H6ZYTlMe6Zit-gytY8NZBVrUMrWYA1nmGqCIi9VgAq9GjwKNBvD9QjzdV3UX5i7RFhGt1iQpuIymMJDMXzRwwcudCUDmi270GUMEcUgl2pZv_.jNMGoI3MFqCbA7duyZbV5g',
      loginField: '#ap_email',
      passwordField: '#ap_password',
      login: process.env.AMAZON_EMAIL,
      password: process.env.AMAZON_PASSWORD
    });

    await panelFlow(page);

    const data = await downloadFlow(page);

    console.log(
      `📊 Notas esperadas: ${data.totalEsperado}\n` +
      `📦 Notas extraídas: ${data.totalExtraidos}\n` +
      `📤 Novas notas enviadas: ${data.totalEnviados}\n` +
      `⏭️ Já existentes: ${data.totalIgnorados}`
    );


    await sendWebhookLog({
      platform: 'Amazon Dootax',
      clientId: process.env.CLIENT_ID || 'Multilaser',
      executedAt: new Date().toISOString(),
      success: true,
      data: {
        totalEsperado: data.totalEsperado,
        totalExtraidos: data.totalExtraidos,
        totalEnviados: data.totalEnviados,
        totalIgnorados: data.totalIgnorados
      }
    });

  } catch (err) {
    console.error('❌ Erro no job:', err);

    let screenshot = null;

    if (browser && page) {
      screenshot = await captureErrorScreenshot(page, 'job');
    }

    await sendWebhookLog({
      platform: 'amazon',
      clientId: process.env.CLIENT_ID || 'default_client',
      executedAt: new Date().toISOString(),
      success: false,
      error: err.message,
      screenshot: screenshot
        ? {
          file: screenshot.file,
          name: screenshot.name,
          takenAt: screenshot.timestamp
        }
        : null
    });
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
    console.log('🏁 Execução finalizada.');
  }
}

console.log(`⏰ Cron configurado: ${CRON_SCHEDULE}`);

/**
 * 🔁 Agenda execução
 */
cron.schedule(CRON_SCHEDULE, async () => {
  await runJob();
});

/**
 * (Opcional) Rodar imediatamente ao subir container
 * Comente se não quiser
 */
// runJob();
