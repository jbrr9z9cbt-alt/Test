'use strict';
const { assert, LL, wait, text, newMatch, release, openBoard, dbMatches } = require('./helpers');

module.exports = {
  async 'Übungen einzeln freigegeben, beste drei zählen, Streichwertung, Mannschaftsabzug'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, LL);
    const bp = await openBoard(ctx, base, hash);
    const d = ['4,0', '3,5', '3,0', '4,5'];
    for (let i = 0; i < 4; i++) {
      await release(p, 'FX', i, 'home', { e1: '1,0', e2: '1,0', d: d[i] });
      if (i === 0) {
        await bp.waitForSelector('#score-flash.show', { timeout: 3000 });
        assert.ok(!(await bp.$('.cur-duel.empty')), 'jede Übung erscheint sofort auf der Tafel');
      }
    }
    const m = (await dbMatches(p))[0];
    assert.equal(m.apparatus.FX.duels.length, 4);
    // Wertungen 13,0 / 12,5 / 12,0 / 13,5 → beste drei = 39,00, gestrichen wird 12,00
    await wait(bp, 200);
    assert.match(await text(bp, '.gb-big'), /39,00/);
    assert.ok(await p.$('#apparatus-panel .side.struck[data-key="FX-2-home"]'), 'Streichwertung markiert');
    // Mannschaftsabzug
    await p.click('[data-action=deduction][data-side=home]');
    await p.fill('.modal-backdrop input', '1,00');
    await p.click('.modal-backdrop button[type=submit]');
    await wait(p, 600);
    assert.match(await text(bp, '.gb-big'), /38,00/, 'Abzug mindert die Gesamtpunktzahl');
  }
};
