'use strict';
const { assert, OL, LL, wait, text, newMatch, release, startOrder } = require('./helpers');

/** Passt die Seite ins Fenster (kein Scrollen, keine Überbreite)? Dazu Breite der Tabelle und des Gerätebereichs. */
function fit(p) {
  return p.evaluate(() => {
    const t = document.querySelector('table.ez'), panel = document.getElementById('apparatus-panel');
    return { rows: !!t, tiles: !!panel.querySelector('.side'), tw: t ? Math.round(t.getBoundingClientRect().width) : 0, pw: Math.round(panel.getBoundingClientRect().width),
      scroll: document.documentElement.scrollHeight - innerHeight, wide: document.documentElement.scrollWidth > innerWidth + 1 };
  });
}

// Browserfenster bzw. Bildschirme im Querformat (Laptop im Browser ohne Leisten, iPads quer)
const SIZES = [['Laptop 1280 × 800', 1280, 689], ['Laptop 1366 × 768', 1366, 657], ['Laptop 1536 × 864', 1536, 753], ['Full HD', 1920, 969],
  ['iPad mini quer', 1133, 744], ['iPad Air 11" quer', 1180, 820], ['iPad Pro 13" quer', 1366, 1024]];

module.exports = {
  async 'Querformat ab 1100 px (Oberliga): Wertungen einzeilig, ganzes Gerät ohne Scrollen, Duell rechts'({ base, context }) {
    const ctx = await context({ viewport: { width: 1366, height: 657 } });
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    await p.click('[data-action=tab][data-tab=SR]'); await wait(p, 200);
    // Kopf einmal oben, je Duell zwei Zeilen; ▶ am vorlegenden Turner; „Sturz“ und „Eingeben“
    assert.deepEqual(await p.$$eval('table.ez thead th', (t) => t.map((x) => x.childNodes[0] ? x.childNodes[0].textContent.trim() : '')),
      ['', 'Nr.', 'Verein', 'Turner', 'E1', 'E2', 'D-Note', 'Stand', 'NA', 'E-Note', 'Endnote', '', '', 'Duell']);
    assert.equal(await p.$$eval('table.ez tbody tr', (r) => r.length), 8);
    const [a, b] = await startOrder(p, 'SR', 0);
    assert.match(await text(p, `[data-key="SR-0-${a}"] td.nr`), /^1\.\s*▶$/);
    assert.equal(await text(p, `[data-key="SR-0-${a}"] [data-action=fall-timer]`), 'Sturz');
    assert.equal(await text(p, `[data-key="SR-0-${a}"] .score-btn`), 'Eingeben');
    await release(p, 'SR', 0, a, { e1: '1,0', e2: '1,2', d: '4,6' });
    await release(p, 'SR', 0, b, { e1: '2,0', e2: '2,2', d: '4,0' });
    assert.equal(await text(p, `[data-key="SR-0-${a}"] .score-btn`), 'Ändern');
    const vals = await p.$$eval(`[data-key="SR-0-${a}"] td.n`, (t) => t.map((x) => x.textContent.trim()));
    assert.deepEqual(vals, ['1,0', '1,2', '4,6', '–', '–', '8,90', '13,50'], 'Werte in der Zeile: ' + vals.join(' | '));
    const res = await text(p, '[data-out="duel-SR-0"]') + ' ' + await text(p, '[data-out="duelact-SR-0"]');
    assert.match(res, /3\s*Diff\. 1,60\s*✓/, 'Scorepunkte, Differenz und ✓: ' + res);
    // Verein: Spalte genau so breit wie „TZ Bochum-Witten“ – der Name passt ganz hinein, längere enden mit „…“
    const lbl = await p.$$eval('table.ez td.tm .side-label', (l) => l.filter((e) => e.title === 'TZ Bochum-Witten').map((e) => ({ cut: e.scrollWidth > e.clientWidth + 1, w: e.clientWidth })));
    const size = await p.$eval('table.ez th.tm .tm-size', (e) => e.clientWidth);
    assert.ok(lbl.length && lbl.every((x) => !x.cut && x.w === size), '„TZ Bochum-Witten“ ganz, Spalte so breit wie der Name: ' + JSON.stringify(lbl) + ' / ' + size);
    // Sturz läuft: Tabelle und Seite werden nicht breiter
    const w0 = (await fit(p)).tw;
    const fb = `[data-action=fall-timer][data-app=SR][data-duel="1"]`;
    await p.click(fb); await wait(p, 1200);
    assert.match(await text(p, fb), /Stopp/);
    const f1 = await fit(p);
    assert.equal(f1.tw, w0, 'Tabelle bleibt gleich breit, während „Sturz“ läuft');
    assert.ok(!f1.wide && f1.scroll <= 0, 'kein Scrollen: ' + JSON.stringify(f1));
    await p.click(fb); await wait(p, 300);
    // alle Querformate: ohne Scrollen, ohne Überbreite, Tabelle schmaler als der Gerätebereich
    for (const [name, w, h] of SIZES) {
      await p.setViewportSize({ width: w, height: h }); await wait(p, 300);
      const f = await fit(p);
      assert.ok(f.rows && f.scroll <= 0 && !f.wide && f.tw < f.pw, name + ': ' + JSON.stringify(f));
    }
  },

  async 'Querformat ab 1100 px (Landesliga): Übungen in Wettkampfreihenfolge, Streichwertung, Abzug oben, lange Vereinsnamen mit „…“'({ base, context }) {
    const ctx = await context({ viewport: { width: 1366, height: 657 } });
    const p = await ctx.newPage();
    await newMatch(p, base, Object.assign({}, LL, { guest: 'L7' }));
    await p.click('[data-action=tab][data-tab=SR]'); await wait(p, 200);
    const pos = await p.$$eval('table.ez tbody tr td.nr', (t) => t.map((x) => x.textContent.trim()));
    assert.deepEqual(pos, ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.'], 'Wettkampfreihenfolge = DOM-Reihenfolge (Tab-Taste)');
    for (let i = 0; i < 4; i++) for (const s of ['home', 'guest']) await release(p, 'SR', i, s, { e1: '1,2', e2: '1,2', d: (4 + (i === 2 ? -1 : i * 0.3)).toFixed(1).replace('.', ',') });
    assert.ok(await p.$('table.ez tr.struck[data-key="SR-2-home"]'), 'Streichwertung durchgestrichen');
    assert.match(await text(p, '[data-key="SR-0-home"] .ez-st'), /✓ freigegeben/);
    assert.ok(await p.$('.card-head [data-action=deduction][data-side=home]'), 'Mannschaftsabzug in der Kopfzeile des Geräts');
    const cut = await p.$$eval('table.ez td.tm .side-label', (l) => l.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.title));
    assert.ok(cut.length && cut.every((t) => t === 'SG Langenei-Kickenbach/Gleidorf'), 'nur der lange Name gekürzt: ' + cut);
    const rowH = await p.$$eval('table.ez tbody tr', (r) => r.map((x) => Math.round(x.getBoundingClientRect().height)));
    assert.ok(Math.max(...rowH) - Math.min(...rowH) <= 1 && Math.max(...rowH) < 45, 'alle Zeilen einzeilig gleich hoch: ' + rowH);
    for (const [name, w, h] of SIZES) {
      await p.setViewportSize({ width: w, height: h }); await wait(p, 300);
      const f = await fit(p);
      assert.ok(f.rows && f.scroll <= 0 && !f.wide && f.tw < f.pw, name + ': ' + JSON.stringify(f));
    }
  },

  async 'Kacheln bleiben: hochkant, iPad 10,2" quer, schmale Fenster; Wechsel beim Drehen'({ base, context }) {
    const ctx = await context({ viewport: { width: 1366, height: 657 } });
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    assert.ok((await fit(p)).rows, 'Laptop: Zeilen');
    for (const [name, w, h] of [['iPad 10,2" quer', 1080, 810], ['iPad hochkant', 820, 1180], ['Fenster 1000 px', 1000, 700]]) {
      await p.setViewportSize({ width: w, height: h }); await wait(p, 300);
      const f = await fit(p);
      assert.ok(f.tiles && !f.rows, name + ': Kacheln');
    }
    await p.setViewportSize({ width: 1180, height: 820 }); await wait(p, 300);
    assert.ok((await fit(p)).rows, 'zurück ins Querformat: wieder Zeilen');
  }
};
