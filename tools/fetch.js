// Load a page in headless Chromium and save its text.
// Use for sites that answer plain requests with Cloudflare's "Just a moment..." page.
// Usage: node tools/fetch.js <url> [out.txt] [links|html]
//   links: also append every link as "text => url"; html: also append the page HTML.
// Run `bash tools/setup-browser.sh` once per container first.
const { chromium } = require('./node_modules/playwright-core');
const fs = require('fs');

(async () => {
  const [url, out = 'page.txt', mode] = process.argv.slice(2);
  if (!url) { console.error('usage: node tools/fetch.js <url> [out.txt] [links|html]'); process.exit(2); }
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-US',
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  const page = await ctx.newPage();
  const blocked = async () => /Just a moment/i.test(await page.title().catch(() => ''));
  const load = async (u) => {
    const res = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    // Wait out the Cloudflare check if it appears (up to about 45 seconds).
    for (let i = 0; i < 18 && (await blocked()); i++) await page.waitForTimeout(2500);
    await page.waitForTimeout(1500);
    return res ? res.status() : 0;
  };
  let status = 0;
  try {
    status = await load(url);
    // Deep pages can be challenged harder than the home page: clear the check there, then retry.
    if (await blocked()) {
      await load(new URL(url).origin + '/');
      status = await load(url);
    }
  } catch (e) {
    console.log('ERR', e.message.slice(0, 160));
  }
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  let text = await page.evaluate(() => (document.body ? document.body.innerText : ''));
  if (mode === 'links') {
    text += '\n==LINKS==\n' + (await page.evaluate(() =>
      [...document.querySelectorAll('a')].map(a => (a.innerText || '').trim().replace(/\s+/g, ' ') + ' => ' + (a.href || '')).join('\n')));
  } else if (mode === 'html') {
    text += '\n==HTML==\n' + (await page.content());
  }
  fs.writeFileSync(out, text);
  const title = await page.title().catch(() => '');
  console.log(status, title.slice(0, 100), text.length + ' chars ->', out);
  if (/Just a moment/i.test(title)) console.log('WARNING: still on the Cloudflare check page; treat this source as blocked.');
  await browser.close();
})();
