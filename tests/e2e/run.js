#!/usr/bin/env node
/**
 * Browser-Tests der App (Kernabläufe). Startet einen eigenen kleinen Webserver für den Projektordner und
 * führt alle Dateien tests/e2e/*.e2e.js nacheinander in Chromium (Playwright) aus.
 *
 *   npm run test:e2e              alle Tests
 *   npm run test:e2e -- tafel     nur Tests, deren Datei- oder Testname „tafel“ enthält
 *
 * Voraussetzung: Playwright mit Chromium (require('playwright') muss auflösbar sein, z. B. global installiert
 * und NODE_PATH="$(npm root -g)").
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('nicht gefunden'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) {
    console.error('Playwright nicht gefunden. Aufruf z. B. mit NODE_PATH="$(npm root -g)" npm run test:e2e');
    process.exit(2);
  }
  const filter = (process.argv[2] || '').toLowerCase();
  const srv = await startServer();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.e2e.js')).sort();
  let pass = 0, fail = 0;
  const t0 = Date.now();
  for (const f of files) {
    const tests = require(path.join(__dirname, f));
    for (const [name, fn] of Object.entries(tests)) {
      if (filter && !(f + ' ' + name).toLowerCase().includes(filter)) continue;
      const errors = [];
      const env = {
        base, browser,
        /** Neuer, leerer Browser-Kontext; Seitenfehler werden gesammelt und lassen den Test scheitern. */
        async context(opts) {
          const ctx = await browser.newContext(Object.assign({ viewport: { width: 1366, height: 768 } }, opts || {}));
          ctx.on('page', (pg) => pg.on('pageerror', (e) => errors.push(e.message)));
          env._ctx.push(ctx);
          return ctx;
        },
        _ctx: []
      };
      const s = Date.now();
      try {
        await fn(env);
        if (errors.length) throw new Error('Fehler in der Seite: ' + errors.join(' | '));
        pass++; console.log('  ✓ ' + f.replace('.e2e.js', '') + ' › ' + name + ' (' + ((Date.now() - s) / 1000).toFixed(1) + ' s)');
      } catch (e) {
        fail++; console.log('  ✗ ' + f.replace('.e2e.js', '') + ' › ' + name + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n      '));
      }
      for (const c of env._ctx) await c.close().catch(() => {});
    }
  }
  await browser.close();
  srv.close();
  console.log('\n' + pass + ' bestanden, ' + fail + ' fehlgeschlagen (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  process.exit(fail ? 1 : 0);
})();
