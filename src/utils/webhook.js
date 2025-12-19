const fetch = require('node-fetch');

/**
 * 📡 Envia log de execução para webhook (Google Chat)
 */
async function sendWebhookLog(payload) {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ WEBHOOK_URL não configurado, pulando envio.');
    return;
  }

  try {
    const message = payload.success
      ? `✅ *Job Amazon concluído com sucesso*
📊 Esperadas: ${payload.data?.totalEsperado}
📦 Extraídas: ${payload.data?.totalExtraidos}
📤 Enviadas: ${payload.data?.totalEnviados}
⏭️ Ignoradas: ${payload.data?.totalIgnorados}
🕒 ${payload.executedAt}`
      : `❌ *Job Amazon falhou*
🕒 ${payload.executedAt}
Erro: ${payload.error}`;

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: message
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Webhook respondeu ${res.status}: ${text}`);
    }

    console.log('📡 Webhook enviado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao enviar webhook:', err.message);
  }
}

module.exports = {
  sendWebhookLog
};
