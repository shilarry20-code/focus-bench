// Makes the daily world snapshot: opens the site in a fresh browser (so only bots, no real players' matches), lets it
// catch up from the last snapshot to today's midnight (Eastern), and writes world.bin + world.json into the folder given.
import {chromium} from 'playwright';
import {writeFileSync, mkdirSync} from 'fs';
const out = process.argv[2] || 'out';
mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto('http://localhost:8765/?snapshot');
await page.waitForFunction(() => typeof RK_READY !== 'undefined' && RK_READY && !simBusy && R.lastSlice === WORLD_UNTIL, null, {timeout: 50 * 60e3, polling: 1000});
const {meta, bin} = await page.evaluate(() => exportWorld());
writeFileSync(`${out}/world.bin`, Buffer.from(bin, 'base64'));
writeFileSync(`${out}/world.json`, JSON.stringify(meta));
writeFileSync(`${out}/day.txt`, meta.day);
console.log('snapshot', meta.day, (Buffer.from(bin, 'base64').length / 1e6).toFixed(1), 'MB');
await browser.close();
