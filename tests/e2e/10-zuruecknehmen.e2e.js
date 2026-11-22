'use strict';
const { assert, OL, LL, wait, text, newMatch, release, startOrder, openBoard, dbMatches } = require('./helpers');

async function withdraw(p, app, idx, side) {
  await p.click(`[data-action=score-open][data-app=${app}][data-duel="${idx}"][data-side=${side}]`);
  await p.selectOption('#score-dlg select[data-dlg=gymnast]', '');
  await wait(p, 200);
  assert.equal(await text(p, '#score-dlg [data-action=sd-release]'), 'Wertung zurücknehmen');
  assert.ok(await p.$eval('#score-dlg input[data-dlg=e1]', (i) => i.disabled && i.value === ''), 'Felder geleert und gesperrt');
  await p.click('#score-dlg [data-action=sd-release]');
  await p.waitForSelector('.modal-backdrop');
  await p.click('.modal-backdrop .btn.primary');
  await wait(p, 500);
}

module.exports = {
  async 'Oberliga: freigegebene Wertung zurücknehmen – Duell verschwindet von der Tafel, der andere Turner bleibt'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, OL);
    const bp = await openBoard(ctx, base, hash);
    const [a, b] = await startOrder(p, 'FX', 0);
    await release(p, 'FX', 0, a, { e1: '1,0', e2: '1,0', d: '4,0' });
    await release(p, 'FX', 0, b, { e1: '2,0', e2: '2,0', d: '4,0' });
    await bp.waitForSelector('#score-flash.show');
    await wait(bp, 8500);
    await withdraw(p, 'FX', 0, a);
    const d = (await dbMatches(p))[0].apparatus.FX.duels[0];
    assert.equal(d[a].gymnastId, null); assert.equal(d[a].d, null);
    assert.ok(d[b].gymnastId && d[b].d !== null, 'der andere Turner bleibt gespeichert');
    assert.equal(d.shown, null);
    assert.equal(await text(p, `[data-key="FX-0-${a}"] .score-btn`), 'Eingeben');
    await wait(bp, 600);
    assert.ok(await bp.$('.cur-duel.empty'), 'Duell nicht mehr auf der Tafel');
    assert.equal(await bp.$('#score-flash.show'), null, 'keine Einblendung');
    assert.match(await text(bp, '.gb-big'), /0\s*:\s*0/);
    // Abbrechen im Fenster stellt alles wieder her
    await p.click(`[data-action=score-open][data-app=FX][data-duel="0"][data-side=${b}]`);
    await p.selectOption('#score-dlg select[data-dlg=gymnast]', '');
    await p.click('#score-dlg [data-action=sd-cancel]'); await wait(p, 300);
    assert.ok((await dbMatches(p))[0].apparatus.FX.duels[0][b].gymnastId, '„Abbrechen“ ändert nichts');
    // erneut eingeben → Duell erscheint wieder mit Einblendung
    await release(p, 'FX', 0, a, { e1: '1,0', e2: '1,0', d: '4,0' });
    await bp.waitForSelector('#score-flash.show', { timeout: 3000 });
  },

  async 'Oberliga: erster Turner (nur gespeichert) lässt sich ebenso zurücknehmen'({ base, context }) {
    const p = await (await context()).newPage();
    await newMatch(p, base, OL);
    const [a] = await startOrder(p, 'FX', 0);
    await release(p, 'FX', 0, a, { e1: '1,0', e2: '1,0', d: '4,0' });
    await withdraw(p, 'FX', 0, a);
    const d = (await dbMatches(p))[0].apparatus.FX.duels[0];
    assert.equal(d[a].gymnastId, null); assert.equal(d[a].e1, null);
  },

  async 'Landesliga: Übung zurücknehmen, Summe rechnet neu'({ base, context }) {
    const ctx = await context();
    const p = await ctx.newPage();
    const hash = await newMatch(p, base, LL);
    const bp = await openBoard(ctx, base, hash);
    await release(p, 'FX', 0, 'home', { e1: '1,0', e2: '1,0', d: '4,0' });
    await release(p, 'FX', 1, 'home', { e1: '1,0', e2: '1,0', d: '3,0' });
    await wait(bp, 8500);
    assert.match(await text(bp, '.gb-big'), /25,00/);
    await withdraw(p, 'FX', 1, 'home');
    await wait(bp, 600);
    assert.match(await text(bp, '.gb-big'), /13,00/);
    const d = (await dbMatches(p))[0].apparatus.FX.duels[1];
    assert.equal(d.home.gymnastId, null);
    assert.ok(!(d.revs && d.revs.home && d.revs.home.shown), 'nicht mehr freigegeben');
  }
};
