import { createRequire } from 'module';
const { chromium } = createRequire('/usr/local/lib/node_modules/')('playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const n of ['A_minhwa','B_pop','C_premium']) {
  const p = await b.newPage({ viewport: { width: 375, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('file:///home/user/-/docs/design-mockups/' + n + '.html');
  await p.screenshot({ path: `/home/user/-/docs/design-mockups/${n}.png`, fullPage: true });
}
await b.close();
