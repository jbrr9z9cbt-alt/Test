'use strict';
const { assert, OL, wait, newMatch, pickGymnast } = require('./helpers');

module.exports = {
  async 'D-Note-Rechner: Hinweis bei fehlenden Elementgruppen, Übernahme der D-Note'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    await p.click('[data-action=score-open][data-app=FX][data-duel="0"][data-side=home]');
    await pickGymnast(p);
    await p.click('#score-dlg [data-action=dc-open]'); await wait(p, 300);
    for (const [k, v] of [['D', '2'], ['C', '3'], ['B', '2'], ['A', '1']]) await p.fill(`[data-dc=${k}]`, v);
    await p.click('[data-action=dc-ok]'); await wait(p, 300);
    assert.ok(await p.$('.modal-backdrop'), 'Hinweis: Elementgruppen fehlen');
    await p.click('.modal-backdrop [data-answer="0"]'); await wait(p, 200);
    await p.fill('[data-dc=EG]', '2,0');
    await p.click('[data-action=dc-ok]'); await wait(p, 300);
    assert.equal(await p.$eval('#score-dlg input[data-dlg=d]', (i) => i.value), '6,4');
  },

  async 'Zahlentastatur am Handy: Eingabe über die eigenen Tasten'({ base, context }) {
    const { devices } = require('playwright');
    const ctx = await context(devices['iPhone 13']);
    const p = await ctx.newPage();
    await newMatch(p, base, OL, { keypad: 'auto' });
    await p.click('[data-action=score-open][data-app=FX][data-duel="0"][data-side=home]');
    await pickGymnast(p);
    assert.ok(await p.$('#score-dlg .sd-pad'), 'Zahlentastatur sichtbar');
    for (const k of ['1', ',', '5']) await p.click(`#score-dlg [data-action=sd-key][data-k="${k}"]`);
    assert.equal(await p.$eval('#score-dlg [data-dlg=e1]', (b) => b.textContent.trim()), '1,5');
  },

  async 'Zahlentastatur: automatisches Komma (letzte Ziffer = Nachkommastelle), getipptes Komma gilt wie getippt'({ base, context }) {
    const { devices } = require('playwright');
    const p = await (await context(devices['iPhone 13'])).newPage();
    await newMatch(p, base, OL, { keypad: 'auto' });
    await p.click('[data-action=score-open][data-app=FX][data-duel="0"][data-side=home]');
    await pickGymnast(p);
    const key = async (...ks) => { for (const k of ks) await p.click(`#score-dlg [data-action=sd-key][data-k="${k}"]`); };
    const val = (f) => p.$eval(`#score-dlg [data-dlg=${f}]`, (b) => b.textContent.trim());
    await key('1', '7'); assert.equal(await val('e1'), '1,7', '„1 7“ = 1,7');
    await key('next', '8'); assert.equal(await val('e2'), '0,8', '„8“ = 0,8');
    await key('next', '4', ',', '5'); assert.equal(await val('d'), '4,5', 'getipptes Komma');
    await key('back', 'back', 'back', '1', '3', '5', '9'); assert.equal(await val('d'), '13,5', 'höchstens drei Ziffern');
    await key('prev'); assert.equal(await val('e2'), '0,8');
    // D-Note-Rechner: EG ebenso
    await p.click('#score-dlg [data-action=dc-open]'); await wait(p, 200);
    await p.click('#score-dlg [data-action=dc-field][data-dc=EG]');
    await p.click('#score-dlg [data-action=dc-key][data-k="5"]');
    assert.equal(await p.$eval('#score-dlg [data-dc=EG]', (b) => b.textContent.trim()), '0,5', 'EG „5“ = 0,5');
  },

  async 'Zahlentastatur: Taste unter dem Finger zählt sofort beim Berühren, Lücken in der Mitte geteilt'({ base, context }) {
    const { devices } = require('playwright');
    const ctx = await context(devices['iPhone 13']);
    const p = await ctx.newPage();
    await newMatch(p, base, OL, { keypad: 'auto' });
    await p.click('[data-action=score-open][data-app=FX][data-duel="0"][data-side=home]');
    await pickGymnast(p);
    const cdp = await ctx.newCDPSession(p);
    const box = (k) => p.$eval(`#score-dlg [data-action=sd-key][data-k="${k}"]`, (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    const val = () => p.$eval('#score-dlg [data-dlg=e1]', (b) => b.textContent.trim());
    const touch = async (x, y) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await wait(p, 50);
      const down = await p.$$eval('#score-dlg .sd-keys button.down', (bs) => bs.map((b) => b.getAttribute('data-k')));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(p, 200);
      return down;
    };
    const two = await box('2'), zero = await box('0'), x = (two.l + two.r) / 2, mid = (two.b + zero.t) / 2;
    assert.deepEqual(await touch(x, (two.t + two.b) / 2), ['2'], 'beim Berühren grau: genau die 2');
    assert.equal(await val(), '0,2', 'schon beim Berühren getippt, genau einmal');
    assert.deepEqual(await touch(x, mid - 1), ['2'], 'Lücke knapp über der Mitte: 2');
    assert.deepEqual(await touch(x, mid + 1), ['0'], 'Lücke knapp unter der Mitte: 0');
    assert.equal(await val(), '22,0', '„2 2 0“ = 22,0');
    await wait(p, 200);
    assert.equal(await p.$$eval('#score-dlg .sd-keys button.down', (bs) => bs.length), 0, 'nach dem Loslassen nicht mehr grau');
  },

  async 'Zahlentastatur: Tastenton je Gerät einstellbar, Grundeinstellung aus'({ base, context }) {
    const { devices } = require('playwright');
    const p = await (await context(devices['iPhone 13'])).newPage();
    await newMatch(p, base, OL, { keypad: 'auto' });
    await p.evaluate(() => { window.WTB_SOUND_LOG = []; });
    await p.click('[data-action=score-open][data-app=FX][data-duel="0"][data-side=home]');
    await pickGymnast(p);
    const snd = '#score-dlg input[data-dlg=keysound]';
    assert.equal(await p.$eval(snd, (i) => i.checked), false, 'Grundeinstellung aus');
    await p.click('#score-dlg [data-action=sd-key][data-k="3"]');
    assert.deepEqual(await p.evaluate(() => window.WTB_SOUND_LOG), [], 'aus: kein Ton');
    await p.click(snd);
    assert.equal(await p.evaluate(() => localStorage.getItem('wtb-tastenton')), 'on', 'auf dem Gerät gemerkt');
    await p.evaluate(() => { window.WTB_SOUND_LOG = []; });
    await p.click('#score-dlg [data-action=sd-key][data-k="4"]');
    assert.deepEqual(await p.evaluate(() => window.WTB_SOUND_LOG), ['key'], 'an: Klick beim Tastendruck');
    const h = await p.$eval('#score-dlg .sd-set', (e) => e.getBoundingClientRect().height);
    assert.ok(h < 40, 'Zeile „Zahlentastatur / Tastenton“ einzeilig (' + h + ' px)');
  }
};
