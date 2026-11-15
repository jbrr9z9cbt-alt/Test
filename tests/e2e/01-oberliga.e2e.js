'use strict';
const { assert, OL, wait, text, newMatch, release, startOrder, openBoard, dbMatches } = require('./helpers');

module.exports = {
  async 'Duell: erster Turner nur gespeichert, zweiter gibt das Duell frei (Tafel, Einblendung, Scorepunkte)'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    const [first, second] = await startOrder(p, 'FX', 0);
    await release(p, 'FX', 0, first, { e1: '1,0', e2: '1,2', d: '4,6' });
    assert.ok(await bp.$('.cur-duel.empty'), 'nach dem ersten Turner zeigt die Tafel noch kein Duell');
    assert.equal(await bp.$('#score-flash.show'), null, 'keine Einblendung nach dem ersten Turner');
    await release(p, 'FX', 0, second, { e1: '2,0', e2: '2,2', d: '4,0' });
    await bp.waitForSelector('#score-flash.show', { timeout: 3000 });
    await wait(bp, 300);
    const m = (await dbMatches(p))[0];
    const d = m.apparatus.FX.duels[0];
    assert.ok(d[first].gymnastId && d[second].gymnastId, 'beide Turner gespeichert');
    // 13,50 gegen 11,90 → 1,60 Unterschied → 3 Scorepunkte
    const big = await text(bp, '.board-big');
    assert.match(big, first === 'home' ? /3\s*:\s*0/ : /0\s*:\s*3/, 'Stand auf der Tafel: ' + big);
  },

  async 'Korrektur: geänderte Wertung erscheint als Korrektur, Ergebnis rechnet neu'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    const [a, b] = await startOrder(p, 'FX', 0);
    await release(p, 'FX', 0, a, { e1: '1,0', e2: '1,0', d: '4,0' });
    await release(p, 'FX', 0, b, { e1: '1,0', e2: '1,0', d: '4,0' });
    await wait(p, 300);
    await p.click(`[data-action=score-open][data-app=FX][data-duel="0"][data-side=${a}]`);
    assert.match(await text(p, '#score-dlg [data-action=sd-release]'), /Korrektur freigeben/);
    await p.fill('#score-dlg input[data-dlg=d]', '5,0');
    await p.click('#score-dlg [data-action=sd-release]');
    await bp.waitForSelector('#correction-overlay.show', { timeout: 3000 });
    assert.match(await text(bp, '#correction-overlay'), /korrektur/i);
    const big = await text(bp, '.board-big');
    assert.match(big, a === 'home' ? /2\s*:\s*0/ : /0\s*:\s*2/, 'nach Korrektur 1,00 Unterschied → 2 Scorepunkte, Tafel: ' + big);
  },

  async '„kein Turner“ und „Wertung 0,00“'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    // kein Turner: direkt freigeben aus der Kachel
    await p.selectOption('select[data-field=gymnast][data-app=FX][data-duel="0"][data-side=home]', '__none');
    await wait(p, 300);
    assert.match(await text(p, '.side[data-key="FX-0-home"] .score-btn'), /Wertung freigeben/);
    // Wertung 0,00 mit Rückfrage, wenn schon Werte eingetragen sind
    await p.click('[data-action=score-open][data-app=FX][data-duel="0"][data-side=guest]');
    const sel = await p.$eval('#score-dlg select[data-dlg=gymnast]', (s) => [...s.options].find((o) => /^T\d+-\d+$/.test(o.value) && !o.disabled).value);
    await p.selectOption('#score-dlg select[data-dlg=gymnast]', sel);
    await p.fill('#score-dlg input[data-dlg=e1]', '1,0');
    await p.click('#score-dlg input[data-dlg=zero]');
    await p.waitForSelector('.modal-backdrop');
    await p.click('.modal-backdrop [data-answer="0"]');
    await wait(p, 200);
    assert.ok(await p.$eval('#score-dlg input[data-dlg=zero]', (c) => c.checked), 'Wertung 0,00 gesetzt');
    assert.match(await text(p, '#score-dlg [data-dlg-out=final]'), /0,00/);
  }
};
