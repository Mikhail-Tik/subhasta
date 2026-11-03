const { chromium } = require('playwright');
(async () => {
  const file = 'file://' + require('path').join(__dirname, '..', 'build', 'preview.html');
  const outDir = require('path').join(__dirname, '..', 'shots'); require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/google/chrome/chrome', args: ['--no-sandbox'] });
  const errors = [];
  for (const [w, h, tag] of [[1400, 900, 'desktop'], [390, 844, 'phone']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|net::|ERR_FILE/.test(m.text())) errors.push(`${tag} console: ${m.text().slice(0, 160)}`); });
    // mark the guide as seen so it does not cover the shots
    await page.goto(file + '#floor', { waitUntil: 'load' });
    await page.evaluate(() => { try { localStorage.setItem('subhasta.seen', 'true'); } catch (e) {} });
    const nav = async (hash) => { await page.goto('about:blank'); await page.goto(file + hash, { waitUntil: 'load' }); };
    // Pulse: the report calendar
    await nav('#pulse'); await page.waitForTimeout(1800);
    const rep = await page.$('.rep'); if (!rep) errors.push(`${tag}: missing .rep`); else { await rep.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${outDir}/reports-${tag}.png` }); }
    // Atlas: institutions block + an open dossier
    await nav('#atlas'); await page.waitForTimeout(1800);
    const insts = await page.$('.insts'); if (!insts) errors.push(`${tag}: missing .insts`); else { await insts.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await page.screenshot({ path: `${outDir}/insts-${tag}.png` }); }
    await nav('#inst-mplus'); await page.waitForTimeout(1500); await page.screenshot({ path: `${outDir}/inst-mplus-${tag}.png` });
    await nav('#inst-zeitz'); await page.waitForTimeout(1500); await page.screenshot({ path: `${outDir}/inst-zeitz-${tag}.png` });
    // Houses view (local totals) — Seoul hub dossier
    await nav('#hub-seoul'); await page.waitForTimeout(1500); await page.screenshot({ path: `${outDir}/hub-seoul-${tag}.png` });
    await nav('#hub-mumbai'); await page.waitForTimeout(1500); await page.screenshot({ path: `${outDir}/hub-mumbai-${tag}.png` });
    for (const hash of ['#pulse', '#atlas', '#undertow', '#floor', '#houses', '#desk']) {
      await nav(hash); await page.waitForTimeout(1200);
      const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (ov.sw > ov.cw + 1) errors.push(`${tag} ${hash}: horizontal overflow ${ov.sw}>${ov.cw}`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? errors.join('\n') : 'no errors / no overflow');
})();
