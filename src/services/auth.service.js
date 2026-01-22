const { delay, getRandomDelay } = require('../utils/automation.utils');
const { generateTOTP } = require('../utils/authenticatorPass.js');

async function getTOTP() {
  if (!process.env.SECRET_TOTP) {
    throw new Error('SECRET_TOTP não configurado');
  }
  return generateTOTP(process.env.SECRET_TOTP);
}

async function login(page, {
  platformUrl,
  login,
  password
}) {
  console.log('🌐 Acessando Amazon...');
  await page.goto(platformUrl, { waitUntil: 'networkidle0' });
  await delay(await getRandomDelay(2000, 3500));

  // ================= VERIFICAR SE JÁ ESTÁ LOGADO =================
  const alreadyLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('div.nav-button[data-test-tag="hamburger-icon"]') ||
      !!document.querySelector('button.full-page-account-switcher-account-details');
  });

  if (alreadyLoggedIn) {
    console.log('ℹ️ Já está logado, pulando autenticação...');
    await selectBrazilAccount(page);
    return;
  }

  // ================= EMAIL =================
  console.log('✍️ Digitando e-mail...');
  await page.waitForSelector('#ap_email', { visible: true, timeout: 10000 });
  await page.type('#ap_email', login, { delay: 100 });

  await delay(await getRandomDelay(800, 1200));

  console.log('➡️ Clicando em Continuar...');
  await page.waitForSelector('#continue', { visible: true });
  await page.click('#continue');

  await delay(await getRandomDelay(2000, 3500));

  // ================= SENHA =================
  console.log('✍️ Digitando senha...');
  await page.waitForSelector('#ap_password', { visible: true });
  await page.type('#ap_password', password, { delay: 100 });

  await delay(await getRandomDelay(800, 1200));

  console.log('➡️ Clicando em Entrar...');
  await page.waitForSelector('#signInSubmit', { visible: true });
  await page.click('#signInSubmit');

  // ================= TOTP =================
  console.log('🔐 Verificando MFA...');
  const hasTotp = await Promise.race([
    page.waitForSelector('#auth-mfa-otpcode', { timeout: 8000 }).then(() => true).catch(() => false),
    page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 8000 }).then(() => false).catch(() => false)
  ]);

  if (hasTotp) {
    console.log('🔐 MFA solicitado');

    await page.waitForSelector('#auth-mfa-otpcode', { visible: true });

    const token = await getTOTP();
    await page.type('#auth-mfa-otpcode', token, { delay: 100 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.keyboard.press('Enter')
    ]);

    console.log('✅ MFA confirmado');
  } else {
    console.log('ℹ️ Login sem MFA');
  }


  console.log('✅ Login realizado com sucesso');

  // ================= SELEÇÃO DE CONTA =================
  await selectBrazilAccount(page);
}

async function selectBrazilAccount(page) {
  console.log('🌍 Selecionando conta Brazil...');

  // Verificar se a tela de seleção de conta aparece (timeout curto)
  const accountSwitcher = await page.waitForSelector(
    'button.full-page-account-switcher-account-details',
    { visible: true, timeout: 5000 }
  ).catch(() => null);

  if (!accountSwitcher) {
    console.log('ℹ️ Seleção de conta não necessária, já está na conta correta.');
    return;
  }

  await page.evaluate(() => {
    document
      .querySelectorAll('span.full-page-account-switcher-account-label')
      .forEach(span => {
        const txt = span.textContent.trim();
        if (txt === 'Brazil' || txt === 'Brasil') {
          span.scrollIntoView({ block: 'center' });
          span.click();
        }
      });
  });

  await page.waitForSelector('kat-button[data-test="confirm-selection"]', {
    visible: true
  });

  const katButton = await page.$('kat-button[data-test="confirm-selection"]');
  const shadow = await katButton.evaluateHandle(el => el.shadowRoot);
  const realBtn = await shadow.$('button');

  if (!realBtn) {
    throw new Error('Botão "Select account" não encontrado');
  }

  await realBtn.click();
  console.log('✅ Conta Brazil selecionada');
}

module.exports = { login };
