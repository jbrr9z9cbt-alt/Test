'use strict';
const { assert, OL, wait, newMatch, releaseApparatus, release, startOrder, openBoard } = require('./helpers');
const boardApp = (bp) => bp.$eval('.board[data-app]', (b) => b.getAttribute('data-app'));

module.exports = {
  async 'Tafel folgt dem Reiter, bleibt auf einem angefangenen Gerät und nach der letzten Freigabe noch kurz stehen'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=tab][data-tab=PH]'); await wait(bp, 600);
    assert.equal(await boardApp(bp), 'PH', 'ohne Freigabe folgt die Tafel dem Reiter');
    await p.click('[data-action=tab][data-tab=FX]'); await wait(p, 300);
    const [a, b] = await startOrder(p, 'FX', 0);
    await release(p, 'FX', 0, a, { e1: '1,0', e2: '1,0', d: '4,0' });
    await release(p, 'FX', 0, b, { e1: '1,0', e2: '1,0', d: '4,0' });
    await p.click('[data-action=tab][data-tab=PH]'); await ctx.clock.fastForward(30000); await wait(bp, 600);
    assert.equal(await boardApp(bp), 'FX', 'angefangenes Gerät bleibt auf der Tafel');
    await p.click('[data-action=tab][data-tab=FX]'); await wait(p, 300);
    for (let i = 1; i < 4; i++) for (const s of await startOrder(p, 'FX', i)) await release(p, 'FX', i, s, { e1: '1,0', e2: '1,0', d: '4,0' });
    assert.ok(await p.$('[data-action=tab][data-tab=FX].st-done'), 'fertiges Gerät mit Haken');
    await p.click('[data-action=tab][data-tab=PH]');
    await ctx.clock.fastForward(12000); await wait(bp, 600);
    assert.equal(await boardApp(bp), 'FX', 'kurz nach der letzten Freigabe noch das fertige Gerät');
    await ctx.clock.fastForward(13000); await wait(bp, 800);
    assert.equal(await boardApp(bp), 'PH', 'danach der gewählte Reiter');
  }
};
