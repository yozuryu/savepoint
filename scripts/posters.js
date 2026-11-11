#!/usr/bin/env node
// README posters: screenshots of this site on your own data, composed into posters in docs/images/.
// Re-run it whenever the site's look changes.
//
//   npm run data:pull                      # the site needs data to show
//   npx playwright install chromium        # once
//   npm run posters                        # screenshots + posters
//   npm run posters -- --render            # posters only, from the last screenshots
//
// Options:
//   --header-art <url>      art behind the page headers instead of the latest game's (e.g. a SteamGridDB hero)
//   --header-pages hub,ra   which pages get it (hub, ra, steam, xbox, activity, …); default hub,ra
//   --game <ra id>          the RetroAchievements game whose sheet is shown; default the last played
//   --url <address>         shown in the browser frames; default you.github.io/savepoint
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, '.posters');
const OUT = path.join(ROOT, 'docs', 'images');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; };
const RENDER_ONLY = process.argv.includes('--render');
const HEADER_ART = arg('header-art');
const HEADER_PAGES = arg('header-pages', 'hub,ra').split(',');
const URL_LABEL = arg('url', 'you.github.io/savepoint');

let chromium;
try { ({ chromium } = require('playwright')); }
catch { console.error('Needs Playwright: npm install, then npx playwright install chromium'); process.exit(1); }

// ── A static server for this checkout ────────────────────────────────────────
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.jpg': 'image/jpeg' };
const serve = () => new Promise(resolve => {
    const server = http.createServer((req, res) => {
        let p = decodeURIComponent(req.url.split('?')[0]);
        if (p.endsWith('/')) p += 'index.html';
        const file = path.join(ROOT, p);
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
});

// ── Screenshots ──────────────────────────────────────────────────────────────
const PAGE_KEYS = { '': 'hub', 'profile/ra/': 'ra', 'profile/steam/': 'steam', 'profile/xbox/': 'xbox', 'activity/': 'activity', 'analytics/': 'analytics', 'completions/': 'completions', 'series/': 'series' };
async function capture() {
    if (!fs.existsSync(path.join(ROOT, 'data', 'ra', 'profile.json')) && !fs.existsSync(path.join(ROOT, 'data', 'steam', 'profile.json'))) {
        console.error('No data in data/: run npm run data:pull first'); process.exit(1);
    }
    const ra = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ra/profile.json'), 'utf8')); } catch { return null; } })();
    const game = arg('game', ra?.recentlyPlayedGames?.[0]?.gameId ?? ra?.mostRecentGame?.gameId);
    const phone = [['hub', ''], ['ra', 'profile/ra/'], ['steam', 'profile/steam/'], ['xbox', 'profile/xbox/'], ['activity', 'activity/'],
        ['playing', 'activity/?view=playing'], ['analytics', 'analytics/'], ['completions', 'completions/'], ['series', 'series/'],
        ...(game ? [['sheet', `profile/ra/?game=${game}`]] : [])];
    const desktop = [['d-hub', ''], ['d-ra', 'profile/ra/'], ['d-activity', 'activity/'], ['d-analytics', 'analytics/'], ['d-completions', 'completions/'], ['d-series', 'series/']];

    const server = await serve();
    const base = `http://127.0.0.1:${server.address().port}/`;
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();
    for (const [list, w, h] of [[phone, 420, 900], [desktop, 1440, 900]]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
        if (HEADER_ART) await ctx.addInitScript(([art, pages, keys]) => {
            const here = keys[location.pathname.replace(/^\//, '').replace(/index\.html$/, '')];
            if (!pages.includes(here)) return;
            const fix = () => document.querySelectorAll('.art-header img, #hub-art img').forEach(img => {
                if (img.getAttribute('src') !== art) { img.classList.remove('art-icon', 'px'); img.src = art; }
            });
            new MutationObserver(fix).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
        }, [HEADER_ART, HEADER_PAGES, PAGE_KEYS]);
        const page = await ctx.newPage();
        for (const [name, p] of list) {
            await page.goto(base + p, { waitUntil: 'load' });
            await page.waitForTimeout(4500);   // data, art and the skeleton fade
            await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
            console.log(`  shot ${name}`);
        }
        await ctx.close();
    }
    await browser.close();
    server.close();
}

// ── Posters ──────────────────────────────────────────────────────────────────
async function render() {
    const S = (n) => 'file://' + path.join(SHOTS, `${n}.png`);
    const A = (f) => 'file://' + path.join(ROOT, 'assets', f);
    const has = (n) => fs.existsSync(path.join(SHOTS, `${n}.png`));
    const crystal = fs.readFileSync(path.join(ROOT, 'assets', 'appicon.svg'), 'utf8').replace(/<rect width="100" height="100"[^>]*\/>/, '');
    const css = `
@import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@500;700;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0}
body{width:1600px;background:#0b0f15;color:#c6d4df;font-family:'IBM Plex Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.poster{position:relative;overflow:hidden;width:1600px;padding:76px 80px;background:#0b0f15}
.poster::before{content:"";position:absolute;inset:-40%;background:url(${A('art-fallback.webp')}) 0 0/660px auto;transform:rotate(-12deg);opacity:.05;pointer-events:none}
.poster::after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(102,192,244,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(102,192,244,.05) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at 50% 0%,#000 10%,transparent 70%);pointer-events:none}
.poster>*{position:relative;z-index:1}
.poster>.glow{position:absolute;z-index:0;border-radius:50%;filter:blur(100px);pointer-events:none}
.eyebrow{font:600 15px/1 'Oxanium';letter-spacing:.22em;text-transform:uppercase;color:#66c0f4;display:flex;align-items:center;gap:12px}
.eyebrow i{display:block;width:28px;height:2px;background:linear-gradient(90deg,transparent,#66c0f4)}
.eyebrow i:last-child{background:linear-gradient(90deg,#66c0f4,transparent)}
h1{font:800 112px/0.95 'Oxanium';letter-spacing:.01em;color:#fff}
h2{font:700 58px/1.05 'Oxanium';color:#fff;text-wrap:balance}
.grad{background:linear-gradient(90deg,#f5d27a,#66c0f4 55%,#6cc85e);-webkit-background-clip:text;background-clip:text;color:transparent}
p.lede{font-size:23px;line-height:1.5;color:#9fb0bf;max-width:32ch}
.chips{display:flex;gap:10px;flex-wrap:wrap}
.chip{display:flex;align-items:center;gap:9px;padding:10px 15px;border:1px solid #243b50;background:rgba(19,26,34,.8);border-radius:999px;font:600 16px/1 'IBM Plex Sans';color:#c6d4df}
.chip img{width:20px;height:20px;border-radius:2px}
.dev{border:1px solid transparent;background:linear-gradient(#0b0f14,#0b0f14) padding-box,linear-gradient(135deg,rgba(245,210,122,.6),rgba(102,192,244,.35) 45%,rgba(82,176,67,.5)) border-box}
.phone{position:absolute;border-radius:40px;padding:10px;box-shadow:0 40px 80px -20px rgba(0,0,0,.85),0 0 70px -10px rgba(102,192,244,.25)}
.phone img{display:block;width:100%;border-radius:31px}
.browser{position:absolute;border-radius:12px;overflow:hidden;box-shadow:0 50px 100px -30px rgba(0,0,0,.9),0 0 90px -20px rgba(102,192,244,.25)}
.browser .bar{height:36px;display:flex;align-items:center;gap:7px;padding:0 14px;background:#121821;border-bottom:1px solid #0b0f14}
.browser .bar i{width:11px;height:11px;border-radius:50%;background:#2a3a4c}
.browser .bar span{margin-left:14px;font:500 13px 'IBM Plex Sans';color:#6b7a88;background:#0b0f15;padding:5px 16px;border-radius:999px}
.browser img{display:block;width:100%;object-fit:cover;object-position:top}
.crystal{width:120px;height:120px;margin:-18px}`;
    const chips = `<div class="chips"><span class="chip"><img src="${A('icon-ra.png')}">RetroAchievements</span><span class="chip"><img src="${A('icon-steam.png')}">Steam</span><span class="chip"><img src="${A('icon-xbox.png')}">Xbox</span></div>`;
    const G = (x, y, w, h, c) => `<div class="glow" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${c}"></div>`;
    const phone = (n, x, y, w, z = 2) => has(n) ? `<div class="phone dev" style="left:${x}px;top:${y}px;width:${w}px;z-index:${z}"><img src="${S(n)}"></div>` : '';
    const browser = (n, p, x, y, w, h) => has(n) ? `<div class="browser dev" style="left:${x}px;top:${y}px;width:${w}px"><div class="bar"><i></i><i></i><i></i><span>${URL_LABEL}${p}</span></div><img src="${S(n)}" style="height:${h}px"></div>` : '';
    const head = (eyebrow, title, lede, center) => `<div style="display:flex;flex-direction:column;gap:20px;${center ? 'align-items:center;text-align:center;' : ''}margin-bottom:56px">
  <span class="eyebrow"><i></i>${eyebrow}${center ? '<i></i>' : ''}</span><h2>${title}</h2>${lede ? `<p class="lede" style="font-size:21px;max-width:58ch">${lede}</p>` : ''}</div>`;
    const stage = (h, inner) => `<div style="position:relative;height:${h}px">${inner}</div>`;

    const posters = {
        hero: `<div class="poster" style="height:900px;display:grid;grid-template-columns:580px 1fr;align-items:center;gap:20px">
    ${G(820, 80, 760, 560, 'rgba(102,192,244,.30)')}${G(1100, 520, 520, 400, 'rgba(229,177,67,.22)')}${G(-200, 600, 600, 400, 'rgba(82,176,67,.12)')}
    <div style="display:flex;flex-direction:column;gap:30px">
      <div style="display:flex;align-items:center;gap:18px">${crystal.replace('<svg', '<svg class="crystal"')}<span class="eyebrow"><i></i>Self-hosted gaming hub</span></div>
      <h1>Save<span class="grad">point</span></h1>
      <p class="lede">Your achievements, playtime and completions from every platform, on one site you own. Updated every hour, free to host.</p>
      ${chips}
    </div>
    ${stage(760, browser('d-hub', '', 160, 70, 900, 540) + phone('hub', 0, 290, 250, 3))}</div>`,
        profiles: `<div class="poster" style="height:1000px">${G(300, 420, 900, 500, 'rgba(229,177,67,.18)')}${G(900, 300, 640, 520, 'rgba(102,192,244,.24)')}
    ${head('Profiles', 'A full profile for <span class="grad">every platform</span>', 'Every game with its achievements, progress and rarity, plus tabs for recent unlocks, progress, series, activity and your want-to-play list.', true)}
    ${stage(640, browser('d-ra', '/profile/ra', 90, 10, 960, 560) + phone('steam', 1010, 0, 250, 2) + phone('xbox', 1190, 70, 250, 1))}</div>`,
        activity: `<div class="poster" style="height:960px">${G(300, 360, 900, 520, 'rgba(102,192,244,.26)')}${G(1100, 480, 520, 420, 'rgba(82,176,67,.18)')}
    ${head('Activity', 'See what you played, <span class="grad">and when</span>', 'Play sessions logged from your playtime every hour. The games in rotation stay in view, next to a year-long heatmap of every unlock.')}
    ${stage(620, browser('d-activity', '/activity', 0, 20, 1000, 560) + phone('playing', 1040, -40, 255, 1) + phone('activity', 1185, 40, 255, 2))}</div>`,
        analytics: `<div class="poster" style="height:960px">${G(560, 320, 900, 520, 'rgba(229,177,67,.18)')}${G(0, 480, 640, 420, 'rgba(102,192,244,.24)')}
    ${head('Analytics', 'Months of play, <span class="grad">in charts</span>', 'Hours, unlocks and sessions for any period, compared with the one before: your peak hours, favourite day, top games and rarest unlocks.')}
    ${stage(620, phone('analytics', 0, -30, 260, 2) + browser('d-analytics', '/analytics', 300, 20, 1140, 560))}</div>`,
        collection: `<div class="poster" style="height:980px">${G(260, 320, 820, 520, 'rgba(229,177,67,.24)')}${G(1000, 420, 600, 500, 'rgba(102,192,244,.22)')}
    ${head('Completions and series', 'Your collection, <span class="grad">organised</span>', 'Mastered, perfect and beaten games on one timeline. Series across platforms, with sub-series and progress for each.')}
    ${stage(640, browser('d-completions', '/completions', 0, 20, 920, 560) + phone('series', 940, -20, 255, 1) + phone('sheet', 1185, 40, 255, 2))}</div>`,
    };
    const step = (n, title, body, color) => `<div class="dev" style="flex:1;border-radius:14px;padding:28px 26px;display:flex;flex-direction:column;gap:12px;box-shadow:0 0 60px -20px ${color}">
  <span style="font:700 14px 'Oxanium';letter-spacing:.18em;color:${color}">STEP ${n}</span><b style="font:700 27px/1.15 'Oxanium';color:#fff">${title}</b><span style="font-size:17px;line-height:1.5;color:#9fb0bf">${body}</span></div>`;
    const arrow = `<svg width="40" height="24" viewBox="0 0 40 24" style="flex:none;align-self:center"><path d="M2 12h32M25 3l9 9-9 9" fill="none" stroke="#2f4a62" stroke-width="3"/></svg>`;
    posters.how = `<div class="poster" style="height:540px">${G(300, 200, 1000, 400, 'rgba(102,192,244,.16)')}
  ${head('How it works', 'No server. <span class="grad">Just your GitHub repository.</span>')}
  <div style="display:flex;gap:12px">
    ${step(1, 'Your API keys', "RetroAchievements, Steam and Xbox keys stay in your repository's encrypted secrets.", '#e5b143')}${arrow}
    ${step(2, 'GitHub Actions', 'Fetches your profiles every hour and commits only what changed to a data branch.', '#66c0f4')}${arrow}
    ${step(3, 'GitHub Pages', 'Deploys the site with the new data. Free for public repositories.', '#52b043')}${arrow}
    ${step(4, 'Your phone', 'Open it anywhere, or install it as an app from the browser.', '#c6d4df')}
  </div></div>`;

    let sharp;
    try { sharp = require('sharp'); } catch { console.error('Needs sharp: npm install'); process.exit(1); }
    fs.mkdirSync(OUT, { recursive: true });
    const chrome = await chromium.launch();
    const page = await chrome.newPage({ viewport: { width: 1600, height: 800 } });
    for (const [name, body] of Object.entries(posters)) {
        const file = path.join(SHOTS, `poster-${name}.html`);
        fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`);
        await page.goto('file://' + file, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const buf = await (await page.$('.poster')).screenshot();
        await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
        console.log(`  poster docs/images/${name}.jpg`);
    }
    await chrome.close();
}

(async () => {
    if (!RENDER_ONLY) await capture();
    await render();
})().catch(e => { console.error(e); process.exit(1); });
