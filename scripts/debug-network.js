const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

function createStaticServer(root) {
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json' };
  return http.createServer((req, res) => {
    try {
      const reqPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(root, reqPath);
      if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
      if (reqPath === '/' || reqPath === '') filePath = path.join(root, 'index.html');
      fs.stat(filePath, (err, stat) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
        const ext = path.extname(filePath).toLowerCase();
        const ct = mime[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct });
        fs.createReadStream(filePath).pipe(res);
      });
    } catch (e) { res.writeHead(500); res.end('Server error'); }
  });
}

(async () => {
  const root = path.resolve(__dirname, '..', 'dist');
  const server = createStaticServer(root);
  await new Promise((res, rej) => server.listen(0, '127.0.0.1', () => res()));
  const port = server.address().port;
  const target = 'http://127.0.0.1:' + port + '/test-all-scripts.html';
  console.log('server at', target);

  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();

  page.on('request', req => {
    console.log('[REQ ]', req.method(), req.url());
  });
  page.on('response', async res => {
    const status = res.status();
    if (status >= 400) {
      console.log('[RESP]', status, res.url());
      try {
        const txt = await res.text();
        if (txt && txt.length < 4000) console.log('  body:', txt.slice(0, 4000));
      } catch (e) {}
    }
  });
  page.on('requestfailed', req => console.log('[FAIL]', req.failure() && req.failure().errorText, req.url()));

  try {
    await page.goto(target, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    console.error('goto error', e && e.message);
  } finally {
    await browser.close();
    server.close();
  }
})();
