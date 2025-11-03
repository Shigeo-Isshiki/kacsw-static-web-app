const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// simple static server to serve ./dist for HTTP-based checks
function createStaticServer(root) {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  };
  return http.createServer((req, res) => {
    try {
      const reqPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(root, reqPath);
      // prevent path traversal
      if (!filePath.startsWith(root)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      if (reqPath === '/' || reqPath === '') {
        filePath = path.join(root, 'index.html');
      }
      fs.stat(filePath, (err, stat) => {
        if (err) {
          res.writeHead(404); res.end('Not found'); return;
        }
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
        const ext = path.extname(filePath).toLowerCase();
        const ct = mime[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => { res.writeHead(500); res.end('Server error'); });
      });
    } catch (e) {
      res.writeHead(500); res.end('Server error');
    }
  });
}

(async () => {
  // if TARGET_URL provided, use it; otherwise start internal server
  let server;
  let target = process.env.TARGET_URL;
  if (!target) {
    const root = path.resolve(__dirname, '..', 'dist');
    server = createStaticServer(root);
    await new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve());
      server.on('error', reject);
    });
    const port = server.address().port;
    target = 'http://127.0.0.1:' + port + '/test-all-scripts.html';
    console.log('started internal static server at', target.replace('/test-all-scripts.html', '/'));
  }

  // attempt to read the full export list from dist/all-window-exports.js (if present)
  let namesFromFile = null;
  try {
    const exportsPath = path.resolve(__dirname, '..', 'dist', 'all-window-exports.js');
    const txt = fs.readFileSync(exportsPath, 'utf8');
    const m = txt.match(/var\s+names\s*=\s*\[([\s\S]*?)\];/m);
    if (m && m[1]) {
      const body = m[1]
        .replace(/\/\*[^]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .trim();
      const normalized = '[' + body.replace(/'/g, '"').replace(/,\s*\]/g, ']') + ']';
      try {
        namesFromFile = JSON.parse(normalized);
      } catch (e) {
        try { namesFromFile = eval('([' + body + '])'); } catch (e2) { namesFromFile = null; }
      }
    }
  } catch (e) {
    // ignore - file may not exist in all environments
  }

  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err && err.message ? err.message : err));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure && req.failure().errorText));
  try {
    console.log('visiting', target);
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 10000 });
    // wait a moment for scripts to run
    await new Promise((r) => setTimeout(r, 500));
    const out = await page.$eval('#out', el => el.textContent);
    console.log('---- #out content ----');
    console.log(out);
    console.log('---- window check via page.evaluate ----');
    const results = await page.evaluate((maybeNames) => {
      const fallback = ['getNationalHolidayName','isSingleByteAlnumOnly','toFullWidthKatakana','toFullWidth','toHalfWidth','convert_to_hiragana','start'];
      const names = Array.isArray(maybeNames) && maybeNames.length ? maybeNames : fallback;
      const res = {};
      names.forEach(n => {
        try { res[n] = typeof window[n]; } catch (e) { res[n] = 'error'; }
      });
      return res;
    }, namesFromFile);
    console.log(results);
  } catch (err) {
    console.error('ERROR:', err && err.message ? err.message : err);
  } finally {
    await browser.close();
    if (server) server.close();
  }
})();
