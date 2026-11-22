'use strict';
const { assert, OL, wait, text, newMatch, openBoard, dbMatches } = require('./helpers');

module.exports = {
  async 'Einturnzeit und Wettkampfpause sperren sich gegenseitig und erscheinen in der Karte der Tafel'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=warmup-timer]'); await p.click('[data-action=warmup-start][data-ms="240000"]'); await wait(bp, 1200);
    assert.match(await text(bp, '.gb-clock'), /Einturnen/);
    assert.match(await text(bp, '.gb-clock'), /[34]:\d\d/);
    assert.ok(await p.$eval('[data-action=pause-timer]', (b) => b.disabled), 'Pause gesperrt, solange eingeturnt wird');
    await p.click('[data-action=warmup-timer]'); await wait(p, 300);
    await p.click('[data-action=pause-timer]'); await p.click('[data-action=pause-start][data-min="10"]'); await wait(bp, 1200);
    assert.match(await text(bp, '.gb-clock'), /Wettkampfpause und Einturnen/);
    assert.ok(await p.$eval('[data-action=warmup-timer]', (b) => b.disabled), 'Einturnzeit gesperrt, solange Pause läuft');
  },

  async 'Einturnzeit: Auswahl 4 Minuten, andere Zeit und zuletzt gewählte Zeit; Dauer auch auf der Tafel'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    await p.click('[data-action=warmup-timer]'); await wait(p, 200);
    const items = async () => p.$$eval('.warmup-ctl .pause-menu [role=menuitem]', (bs) => bs.map((b) => b.textContent.trim()));
    assert.deepEqual(await items(), ['4 Minuten', 'Andere Zeit …'], 'ohne eigene Zeit nur zwei Einträge');
    // ungültige Eingabe: nichts startet
    await p.click('[data-action=warmup-custom]'); await p.fill('.modal input', '45'); await p.click('.modal button[type=submit]'); await wait(p, 300);
    assert.equal(await p.$eval('[data-action=warmup-timer]', (b) => b.classList.contains('t-running')), false, '45 Minuten nicht erlaubt');
    // eigene Zeit 6:40
    await p.click('[data-action=warmup-timer]'); await p.click('[data-action=warmup-custom]');
    await p.fill('.modal input', '6:40'); await p.click('.modal button[type=submit]'); await wait(bp, 1200);
    assert.match(await text(p, '[data-action=warmup-timer]'), /6:(39|40) – beenden/);
    assert.match(await text(bp, '.gb-clock'), /6:(39|40)/, 'Tafel kennt die Dauer');
    await ctx.clock.fastForward(6 * 60000 + 42000); await wait(bp, 800);
    assert.match(await text(bp, '.gb-clock'), /Einturnen beendet/, 'endet nach 6:40');
    await ctx.clock.fastForward(8000); await wait(p, 300);
    await p.click('[data-action=warmup-timer]'); await wait(p, 200);
    assert.deepEqual(await items(), ['4 Minuten', 'Andere Zeit …', '6:40 (zuletzt)']);
    await p.click('[data-action=warmup-start]:has-text("zuletzt")'); await wait(p, 400);
    assert.match(await text(p, '[data-action=warmup-timer]'), /6:(39|40) – beenden/);
    const t = (await dbMatches(p))[0].timers.warmup;
    assert.equal(t.ms, 400000, 'Dauer im Wettkampf gespeichert');
  },

  async 'Laufende Timer stoppen auch bei langem Klick (über den Sekundenwechsel)'({ base, context }) {
    const ctx = await context();
    await ctx.clock.install();
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    const longClick = async (sel) => {
      const r = await p.$eval(sel, (b) => { const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
      await p.mouse.move(r[0], r[1]); await p.mouse.down();
      await ctx.clock.fastForward(1600); await wait(p, 300);
      await p.mouse.up(); await wait(p, 300);
    };
    await p.click('[data-action=pause-timer]'); await p.click('[data-action=pause-start][data-min="10"]'); await wait(p, 300);
    await longClick('[data-action=pause-timer]');
    assert.equal(await p.$eval('[data-action=pause-timer]', (b) => b.classList.contains('t-running')), false, 'Pause gestoppt');
    await p.click('[data-action=warmup-timer]'); await p.click('[data-action=warmup-start][data-ms="240000"]'); await wait(p, 300);
    await longClick('[data-action=warmup-timer]');
    assert.equal(await p.$eval('[data-action=warmup-timer]', (b) => b.classList.contains('t-running')), false, 'Einturnzeit gestoppt');
    await p.click('[data-action=tab][data-tab=SR]'); await wait(p, 300);
    const fb = '[data-action=fall-timer][data-app=SR][data-duel="0"][data-side=home]';
    await p.click(fb); await wait(p, 300);
    await longClick(fb);
    assert.equal(await p.$eval(fb, (b) => b.classList.contains('t-fall1')), false, 'Sturz gestoppt');
  },

  async 'Sturz: 30 s gelb, dann rot mit Abzug 0,3, danach Übung beendet'({ base, context }) {
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
