'use strict';
const { assert, OL, wait, text, newMatch, openBoard, releaseApparatus } = require('./helpers');

module.exports = {
  async 'Turnervorstellung: Gast, Heim, Kampfgericht; auf Tafel und in der App'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=intro-start]'); await wait(bp, 800);
    assert.ok(await bp.$('.tv-win'), 'Vorstellung auf der Tafel');
    assert.ok(await p.$('.app-tv .tv-win'), 'dasselbe Fenster in der App');
    assert.match(await text(bp, '.tv-win'), /TZ Bochum-Witten/, 'beginnt mit der Gastmannschaft');
    let last = '';
    for (let i = 0; i < 40; i++) {
      await wait(bp, 120);
      last = await text(bp, '.tv-win');
      if (/Kampfgericht/i.test(last)) break;
      await p.click('[data-action=intro-step][data-dir="1"]');
    }
    assert.match(last, /Kampfgericht/i, 'endet mit dem Kampfgericht');
    await p.click('[data-action=intro-end]'); await wait(bp, 600);
    assert.equal(await bp.$('.tv-win'), null, 'beendet');
  },

  async 'Ergebnis/Siegerehrung: Zwischenstand auf Tafel und in der App'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    await releaseApparatus(p, 'FX', 1);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=toggle-scorers]'); await wait(bp, 800);
    assert.match(await text(bp, '.so-box'), /Zwischenstand/i);
    assert.match(await text(bp, '.so-box'), /Topscorer/i);
    assert.ok(await p.$('#app-scorers .so-box'), 'auch in der App');
    // Mannschaftsnamen einzeilig mittig über ihrem Ergebnis (Tafel und App)
    for (const pg of [bp, p]) {
      const g = await pg.$eval('.so-result', (r) => ['h', 'g'].map((k) => {
        const t = r.querySelector('.t.' + k).getBoundingClientRect(), n = r.querySelector('.big.' + k).getBoundingClientRect(), el = r.querySelector('.t.' + k);
        return { above: t.bottom <= n.top + 2, mid: Math.abs((t.left + t.right) / 2 - (n.left + n.right) / 2), oneLine: t.height < parseFloat(getComputedStyle(el).fontSize) * 1.6, fits: el.scrollWidth <= el.clientWidth + 1 };
      }));
      g.forEach((x) => assert.ok(x.above && x.mid < 2 && x.oneLine && x.fits, 'Name über dem Ergebnis: ' + JSON.stringify(g)));
    }
    await p.click('#app-scorers [data-action=scorers-close]'); await wait(bp, 600);
    assert.equal(await bp.$('.so-box'), null, 'Schließen blendet auch auf der Tafel aus');
  }
};
