const { delay, getRandomDelay } = require('../utils/automation.utils');
require('dotenv').config();

async function navigate(page) {
  // ===== navegação até faturador =====
  await page.waitForFunction(() => {
    const host = document.querySelector('navigation-hamburger-menu');
    return host && host.shadowRoot && host.shadowRoot.querySelector('.menu__hamburger-button');
  });

  await page.evaluate(() => {
    const host = document.querySelector('navigation-hamburger-menu');
    const shadow = host.shadowRoot;
    const btn = shadow.querySelector('.menu__hamburger-button');
    btn.click();
  });

  await delay(await getRandomDelay(1000, 1500));

  // Espera o componente existir
  await page.waitForFunction(() => {
    const host = document.querySelector('navigation-hamburger-menu');
    return host && host.shadowRoot;
  });

  // Hover em "Relatórios" dentro do Shadow DOM
  await page.evaluate(() => {
    const host = document.querySelector('navigation-hamburger-menu');
    const shadow = host.shadowRoot;

    const relatorios = shadow.querySelector('[data-test-tag="menu__section-reports"]');
    if (!relatorios) throw new Error('Seção Relatórios não encontrada');

    const fireHover = (el) => {
      el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    };

    fireHover(relatorios);
  });

  // Espera o botão Faturador aparecer dentro do Shadow
  await page.waitForFunction(() => {
    const shadow = document.querySelector('navigation-hamburger-menu')?.shadowRoot;
    return shadow?.querySelector('[data-test-tag="menu__button-invoicer-console"]');
  });

  // Clica e aguarda navegação
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.evaluate(() => {
      const shadow = document.querySelector('navigation-hamburger-menu').shadowRoot;
      const faturador = shadow.querySelector('[data-test-tag="menu__button-invoicer-console"]');
      faturador.click();
    })
  ]);

  await delay(await getRandomDelay(2000, 2500));
  console.log('➡️ Navegou até o Faturador.');

  // ===== abrir dropdown de período =====
  await page.evaluate(() => {
    const dropdown = document.querySelector('kat-dropdown-button');
    dropdown?.shadowRoot
      ?.querySelector('button[part="dropdown-button-toggle-button"]')
      ?.click();
  });

  await delay(800);
  console.log('➡️ Abriu dropdown de período.');

  // ===== selecionar personalizado + esperar + datas =====
  await page.evaluate(async () => {
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function setNativeValue(el, value) {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(el),
        'value'
      )?.set;
      setter?.call(el, value);

      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
    }

    // ===== 1. clicar em Personalizado =====
    const dropdown = document.querySelector('kat-dropdown-button');
    dropdown?.shadowRoot
      ?.querySelector('button[data-action="CUSTOM"]')
      ?.click();

    // ⏳ aguarda renderização do picker
    await sleep(800);

    // ===== 2. localizar date pickers =====
    const datePickers = document.querySelectorAll('kat-date-picker');
    if (datePickers.length < 2) {
      console.error('❌ kat-date-picker não encontrados');
      return;
    }

    const pickerFrom = datePickers[0];
    const pickerTo = datePickers[1];

    function getInputFromPicker(picker) {
      const root1 = picker.shadowRoot;
      if (!root1) return null;

      const katInput = root1.querySelector('kat-input');
      if (!katInput) return null;

      const root2 = katInput.shadowRoot;
      if (!root2) return null;

      return root2.querySelector('input[part="input"]');
    }

    const inputFrom = getInputFromPicker(pickerFrom);
    const inputTo = getInputFromPicker(pickerTo);

    if (!inputFrom || !inputTo) {
      console.error('❌ Inputs internos não encontrados');
      return;
    }

    // ===== 3. calcular datas (MM/DD/YYYY) =====
    const hoje = new Date();
    const de = new Date();


    de.setDate(hoje.getDate() - 4);

    const fmt = d =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/` +
      `${String(d.getDate()).padStart(2, '0')}/` +
      d.getFullYear();

    console.log('📅 Datas aplicadas:');
    console.log('FROM:', fmt(de));
    console.log('TO:', fmt(hoje));

    // ===== 4. aplicar valores =====
    inputFrom.focus();
    setNativeValue(inputFrom, fmt(de));

    inputTo.focus();
    setNativeValue(inputTo, fmt(hoje));
  });



  console.log('➡️ Selecionou período personalizado e datas.');
  await delay(1200);

  // ================= DOWNLOAD =================
  console.log('📥 Iniciando sequência de download XML/PDF...');

  const dropdownHandle2 = await page.$('#batch-download-options kat-dropdown-button');
  if (!dropdownHandle2) throw new Error('Dropdown de download não encontrado');

  const shadowRootDownload = await dropdownHandle2.evaluateHandle(el => el.shadowRoot);
  await shadowRootDownload.$eval('button.indicator', btn => btn.click());

  await delay(1000);

  const baixarOptionHandle = await shadowRootDownload.$('[data-action="BATCH_DOWNLOAD_XML_PDF"]');
  if (!baixarOptionHandle) throw new Error('Opção XML/PDF não encontrada');

  await baixarOptionHandle.click();
  console.log("✅ Clicou em 'Baixar XML/PDF'.");

  await delay(1500);

  // ===== ler total de notas =====
  const totalInvoices = await page.evaluate(() => {
    const strong = document.querySelector('#msg-total-invoices strong');
    return strong ? Number(strong.textContent.trim()) : 0;
  });

  console.log(`📊 Total de notas: ${totalInvoices}`);
  await page.evaluate((total) => {
    window.__TOTAL_INVOICES__ = total;
  }, totalInvoices);

  // ===== fluxo assíncrono se >= 600 =====
  if (totalInvoices >= 600) {
    console.log('🚨 Total ≥ 600 → fluxo assíncrono');

    const finalDownloadBtn = await page.$('#btn-batch-download');
    if (!finalDownloadBtn) {
      throw new Error('Botão "Fazer download" não encontrado');
    }

    const shadowFinalBtn = await finalDownloadBtn.evaluateHandle(el => el.shadowRoot);
    const realBtn = await shadowFinalBtn.$('button');
    await delay(4000);
    if (!realBtn) {
      throw new Error('Botão interno "Fazer download" não encontrado');
    }

    await realBtn.click();
    console.log('🕒 Solicitação enviada. Aguardando processamento...');

    await waitAndClickAsyncDownload(page);
  }
  else {
    console.log("✅ Total < 600 → download direto");

    const finalDownloadBtn = await page.$('#btn-batch-download');
    if (!finalDownloadBtn) throw new Error('Botão "Fazer download" não encontrado');

    const shadowFinalBtn = await finalDownloadBtn.evaluateHandle(el => el.shadowRoot);
    const realBtn = await shadowFinalBtn.$('button');
    if (!realBtn) throw new Error('Botão interno "Fazer download" não encontrado');

    await realBtn.click();
  }
}


async function waitAndClickAsyncDownload(page, timeoutMs = 70 * 60 * 1000) {
  console.log('⏳ Aguardando processamento assíncrono (kat-alert success)...');

  // 1️⃣ Aguarda alert de sucesso
  await page.waitForSelector('kat-alert[variant="success"]', {
    timeout: timeoutMs
  });

  console.log('✅ Alert de sucesso encontrado.');
  await delay(4000);

  // 2️⃣ CLICA NO DONE
  await page.evaluate(() => {
    const host = document.querySelector('#btn-batch-download-done');
    if (!host || !host.shadowRoot) return;

    const btn = host.shadowRoot.querySelector('button');
    btn?.click();
  });

  console.log('✅ Botão "Done" clicado.');
  await delay(2000);

  // 3️⃣ Aguarda existir ALGUM kat-button com label de download
  await page.waitForSelector('kat-button', {
    timeout: timeoutMs
  });

  // 4️⃣ Aguarda botão "Click here to download" via polling LEVE
  const start = Date.now();
  let downloadClicked = false;

  while (!downloadClicked) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('⏰ Timeout aguardando botão "Click here to download"');
    }

    downloadClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('kat-button'));

      const host = buttons.find(btn =>
        btn.getAttribute('label')?.includes('Click here') ||
        btn.textContent?.includes('Click here') ||
        btn.textContent?.includes('Clique aqui')
      );

      if (!host || !host.shadowRoot) return false;

      const realButton = host.shadowRoot.querySelector('button');
      if (!realButton) return false;

      realButton.click();
      return true;
    });

    if (!downloadClicked) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('🚀 Clique em "Click here to download" realizado com sucesso.');
}

module.exports = { navigate };
