'use strict';
const { assert, OL, LL, wait, text, newMatch, release, startOrder, openBoard, fitsViewport } = require('./helpers');
const page = (bp) => bp.$eval('.board', (b) => b.getAttribute('data-gb'));

module.exports = {
  async 'Große Tafel Oberliga: nächstes Duell oben, Karte, Ergebnis nach dem Gerät, Übersicht in der Pause'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    assert.equal(await p.$('[data-action=board-size]'), null, 'kein Umschalter „Groß“ mehr');
    const bp = await openBoard(ctx, base, hash);
    assert.ok(await bp.$('.board.gb'), 'quer: große Tafel');
    assert.equal(await page(bp), 'duel:FX');
    assert.match(await text(bp, '.gb-next'), /Duell 1/i);
    for (let i = 0; i < 4; i++) {
      for (const s of await startOrder(p, 'FX', i)) await release(p, 'FX', i, s, { e1: s === 'home' ? '1,0' : '1,5', e2: '1,2', d: '4,0' });
      if (i === 0) {
        await ctx.clock.fastForward(9000); await wait(bp, 500);
        assert.match(await text(bp, '.gb-next'), /Duell 2/i, 'oben das nächste Duell');
        assert.match(await text(bp, '.cur-duel'), /Duell 1/, 'Karte mit der letzten Wertung');
      }
    }
    await ctx.clock.fastForward(9000); await wait(bp, 500);
    assert.equal(await page(bp), 'duel:FX', 'Haltezeit: noch die Karte');
    assert.equal((await text(bp, '.gb-next')), '', 'nach dem letzten Duell ist der Rahmen oben leer');
    await ctx.clock.fastForward(15000); await wait(bp, 600);
    assert.equal(await page(bp), 'result:FX', 'danach das Geräteergebnis');
    assert.match(await text(bp, '.gb-res'), /Scorepunkte/);
    await p.click('[data-action=pause-timer]'); await p.click('[data-action=pause-start][data-min="10"]'); await ctx.clock.fastForward(1000); await wait(bp, 600);
    assert.equal(await page(bp), 'clock:FX', 'in der Pause die Übersicht mit Uhr');
    assert.match(await text(bp, '.gb-clock'), /Wettkampfpause und Einturnen/);
    const f = await fitsViewport(bp, '.board'); assert.ok(f.ok, 'passt ' + JSON.stringify(f));
  },

  async 'Tafel wählt ihre Form nach der Ausrichtung: quer groß, hochkant ausführlich'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash, { width: 1366, height: 768 });
    assert.ok(await bp.$('.board.gb'), 'quer: große Tafel');
    await bp.setViewportSize({ width: 390, height: 844 }); await wait(bp, 500);
    assert.ok(!(await bp.$('.board.gb')) && await bp.$('.board-table'), 'hochkant: ausführliche Tafel');
    let f = await fitsViewport(bp, '.board'); assert.ok(f.ok, 'hochkant passt ' + JSON.stringify(f));
    await bp.setViewportSize({ width: 1180, height: 820 }); await wait(bp, 500);
    assert.ok(await bp.$('.board.gb'), 'Tablet quer gedreht: wieder groß');
    f = await fitsViewport(bp, '.board'); assert.ok(f.ok, 'quer passt ' + JSON.stringify(f));
  },

  async 'Große Tafel Landesliga: letzte Übung, gegenüber blass die der anderen Mannschaft'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, LL);
    const bp = await openBoard(ctx, base, hash);
    await release(p, 'FX', 0, 'home', { e1: '1,0', e2: '1,0', d: '4,0' });
    await release(p, 'FX', 0, 'guest', { e1: '1,0', e2: '1,0', d: '3,5' });
    await wait(bp, 9000);
    assert.match(await text(bp, '.gb-next'), /3\. Übung/i);
    assert.ok(await bp.$('.cur-duel .cd-side.gb-old'), 'ältere Übung blass');
    for (const [w, h] of [[1920, 1080], [3840, 2160], [1366, 768], [820, 1180], [390, 844]]) {
      await bp.setViewportSize({ width: w, height: h }); await wait(bp, 400);
      const f = await fitsViewport(bp, '.board'); assert.ok(f.ok, `${w}×${h} passt nicht ${JSON.stringify(f)}`);
    }
  }
};
