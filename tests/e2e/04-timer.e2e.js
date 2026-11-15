'use strict';
const { assert, OL, wait, text, newMatch, openBoard } = require('./helpers');

module.exports = {
  async 'Einturnzeit und Wettkampfpause sperren sich gegenseitig und erscheinen in der Karte der Tafel'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=warmup-timer]'); await wait(bp, 1200);
    assert.match(await text(bp, '.tm-card'), /Einturnen/);
    assert.ok(await p.$eval('[data-action=pause-timer]', (b) => b.disabled), 'Pause gesperrt, solange eingeturnt wird');
    await p.click('[data-action=warmup-timer]'); await wait(p, 300);
    await p.click('[data-action=pause-timer]'); await p.click('[data-action=pause-start][data-min="10"]'); await wait(bp, 1200);
    assert.match(await text(bp, '.tm-card'), /Wettkampfpause und Einturnen/);
    assert.ok(await p.$eval('[data-action=warmup-timer]', (b) => b.disabled), 'Einturnzeit gesperrt, solange Pause läuft');
  },

  async 'Sturz-Timer: 30 s gelb, dann rot mit Abzug 0,3, danach Übung beendet'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=tab][data-tab=SR]'); await wait(p, 300);
    await p.click('[data-action=fall-timer][data-app=SR][data-duel="0"][data-side=home]'); await wait(bp, 1200);
    assert.ok(await bp.$('.fall-win.phase1'), 'Phase 1 auf der Tafel');
    await ctx.clock.fastForward(31000); await wait(bp, 1200);
    assert.ok(await bp.$('.fall-win.phase2'), 'Phase 2 auf der Tafel');
    assert.match(await text(bp, '.fall-win'), /Abzug 0,3/);
    await ctx.clock.fastForward(30000); await wait(bp, 1200);
    assert.match(await text(bp, '.fall-win'), /Übung beendet/);
  }
};
