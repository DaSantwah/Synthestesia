const puppeteer = require('/home/santwah/.gemini/antigravity/brain/6fd008c5-ede5-4178-9ff8-3bdc32b54d6b/scratch/node_modules/puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8083;
const dir = '/home/santwah/Downloads/Synthestesia';

const server = http.createServer((req, res) => {
  let p = path.join(dir, req.url === '/' ? 'index.html' : req.url);
  if (p.endsWith('/')) p = path.join(dir, 'index.html');
  try {
    const data = fs.readFileSync(p);
    let ext = path.extname(p);
    let type = 'text/plain';
    if (ext === '.html') type = 'text/html';
    else if (ext === '.js') type = 'application/javascript';
    else if (ext === '.css') type = 'text/css';
    res.setHeader('Content-Type', type);
    res.end(data);
  } catch (e) {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(PORT, async () => {
  console.log('Server started on', PORT);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('[PAGE ERROR] ' + msg.text());
    }
  });
  page.on('pageerror', err => errors.push('[SCRIPT ERROR] ' + err.message));

  await page.goto(`http://localhost:${PORT}`);
  console.log('Page loaded');
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    const btnAccept = await page.$('#btn-accept-warning');
    if (btnAccept) {
      await btnAccept.click();
      console.log('Clicked accept warning');
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch(e) {
    console.log('No accept warning button found or click failed', e);
  }

  console.log('Final Errors list:', errors);
  await browser.close();
  server.close();
});
