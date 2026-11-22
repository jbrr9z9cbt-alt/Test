'use strict';
const { assert, OL, LL, wait, text, newMatch, release, startOrder } = require('./helpers');

/** Lage eines Duells bzw. Startpaars zur Leiste und Hervorhebung in der Leiste. */
function where(p, unit) {
  return p.evaluate((u) => {
    const el = document.querySelector(`#apparatus-panel [data-unit="${u}"]`).getBoundingClientRect();
    const bar = document.querySelector('.unit-bar').getBoundingClientRect();
    return { top: Math.round(el.top), bottom: Math.round(el.bottom), barBottom: Math.round(bar.bottom), win: innerHeight,
      cur: [...document.querySelectorAll('.unit-bar .chip.cur')].map((c) => c.textContent) };
  }, unit);
}

module.exports = {
  async 'Handy hochkant (Oberliga): Duell-Leiste, Einrasten je Duell, Ergebnis in einer Zeile, Zurück nach oben'({ base, context }) {
    const { devices } = require('playwright');
    const ctx = await context(devices['iPhone 13']);
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    assert.ok(await p.evaluate(() => document.documentElement.classList.contains('unit-snap')), 'Einrasten an');
    assert.deepEqual(await p.$$eval('.unit-bar .chip', (c) => c.map((x) => x.textContent)), ['1', '2', '3', '4']);
    assert.match(await text(p, '.unit-bar'), /^Boden Duell/);
    // Duell 1 fertig → ✓, im Duell 2 erst ein Turner → ●
    for (const s of await startOrder(p, 'FX', 0)) await release(p, 'FX', 0, s, { e1: s === 'home' ? '1,0' : '1,4', e2: '1,2', d: '4,0' });
    const [first] = await startOrder(p, 'FX', 1);
    await release(p, 'FX', 1, first, { e1: '1,0', e2: '1,2', d: '4,0' });
    assert.deepEqual(await p.$$eval('.unit-bar .chip', (c) => c.map((x) => x.textContent)), ['1✓', '2●', '3', '4']);
    // fertiges Duell: Ergebnis und „✓ freigegeben“ in einer Zeile, das Duell passt unter Kopfzeile und Leiste
    const r = await p.evaluate(() => {
      const d = document.querySelector('#apparatus-panel [data-unit="0"]'), a = d.querySelector('.duel-result').getBoundingClientRect(), b = d.querySelector('.duel-actions').getBoundingClientRect();
      return { sameLine: a.bottom > b.top && b.bottom > a.top && b.left > a.left, h: d.getBoundingClientRect().height, free: innerHeight - parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) - 16 };
    });
    assert.ok(r.sameLine, 'Scorepunkte, Diff. und ✓ freigegeben nebeneinander');
    assert.ok(r.h <= r.free, `fertiges Duell passt: ${r.h} von ${r.free} px`);
    // Sprung zum Duell 3: steht oben unter der Leiste, Knopf 3 hervorgehoben
    await p.click('.unit-bar .chip[data-go="2"]'); await wait(p, 1000);
    let w = await where(p, 2);
    assert.ok(w.top >= w.barBottom && w.top <= w.barBottom + 30, 'Duell 3 oben: ' + JSON.stringify(w));
    assert.deepEqual(w.cur, ['3']);
    // weiterwischen rastet beim nächsten Duell ein
    await p.evaluate(() => window.scrollBy(0, 300)); await wait(p, 900);
    w = await where(p, 3);
    assert.ok(w.top >= w.barBottom && w.top <= w.barBottom + 30, 'eingerastet bei Duell 4: ' + JSON.stringify(w));
    // Ende: „Zurück nach oben“ sichtbar, Tipp führt ganz nach oben
    await p.evaluate(() => window.scrollBy(0, 5000)); await wait(p, 900);
    assert.ok(await p.$eval('.totop .btn', (b) => b.getBoundingClientRect().bottom <= innerHeight), '„Zurück nach oben“ erreichbar');
    await p.click('.totop .btn'); await wait(p, 1200);
    assert.equal(await p.evaluate(() => Math.round(window.scrollY)), 0);
  },

  async 'Handy hochkant (Landesliga): Übungs-Leiste 1–8 in Mannschaftsfarben, Startpaar hervorgehoben, Kachel blinkt'({ base, context }) {
    const ctx = await context({ viewport: { width: 360, height: 700 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const p = await ctx.newPage();
    await newMatch(p, base, LL);
    const bar = await p.$eval('.unit-bar', (b) => ({ fits: b.scrollWidth <= b.clientWidth + 1, n: b.querySelectorAll('.chip.p').length, ico: !!b.querySelector('.ub-ico img') }));
    assert.deepEqual(bar, { fits: true, n: 8, ico: true }, 'Leiste passt auf 360 px');
    await release(p, 'FX', 0, 'home', { e1: '1,2', e2: '1,3', d: '4,1' });
    const chips = await p.$$eval('.unit-bar .chip.p', (c) => c.map((x) => x.textContent + ':' + getComputedStyle(x).borderTopColor));
    assert.match(chips.join(' '), /✓/, 'freigegebene Übung mit ✓: ' + chips.join(' '));
    assert.notEqual(chips[0].split(':')[1], chips[1].split(':')[1], 'abwechselnd in den Farben der Mannschaften');
    await p.click('.unit-bar .chip.p:nth-of-type(5)'); await wait(p, 1000);
    const w = await where(p, 2);
    assert.ok(w.top >= w.barBottom && w.top <= w.barBottom + 30, '3. Startpaar oben: ' + JSON.stringify(w));
    assert.deepEqual(w.cur.map((t) => t.replace('✓', '')), ['5', '6'], 'beide Nummern des Startpaars hervorgehoben');
    assert.ok(await p.$('#apparatus-panel .side.flash'), 'Kachel der Übung blinkt kurz');
  },

  async 'Tablet und Handy quer: ohne Leiste und ohne Einrasten (wie bisher)'({ base, context }) {
    const ctx = await context({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    assert.equal(await p.$('.unit-bar'), null, 'iPad hochkant: keine Leiste');
    assert.equal(await p.evaluate(() => document.documentElement.classList.contains('unit-snap')), false);
    await p.setViewportSize({ width: 844, height: 390 }); await wait(p, 300);
    assert.equal(await p.$('.unit-bar'), null, 'Handy quer: keine Leiste');
    await p.setViewportSize({ width: 390, height: 844 }); await wait(p, 300);
    assert.ok(await p.$('.unit-bar'), 'zurück hochkant: Leiste wieder da');
  }
};
