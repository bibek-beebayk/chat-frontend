const { chromium } = require('playwright');
const OUTDIR = '/tmp/claude-1000/-home-beebayk-projects-rollin-community/a22de60d-e2e5-412a-8dbc-5a7bce932a0d/scratchpad';

(async () => {
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('requestfailed', (req) => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));
    page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="username"]', 'mock_player_01');
    await page.fill('input[name="password"]', 'MockPass@123');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
        page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(1000);

    await page.goto('http://localhost:3000/games', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUTDIR}/thumb-check-desktop.png`, fullPage: true });

    const imgSrcs = await page.$$eval('img', imgs => imgs.map(i => ({ src: i.src, naturalWidth: i.naturalWidth, alt: i.alt })));
    console.log('IMAGES:', JSON.stringify(imgSrcs.filter(i => i.src.includes('thumbnail') || i.alt.toLowerCase().includes('thumbnail')), null, 2));

    console.log('DONE');
    await browser.close();
})().catch((e) => { console.error('SCRIPT_FAIL', e.message); process.exit(1); });
