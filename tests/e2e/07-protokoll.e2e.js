'use strict';
const { assert, OL, LL, wait, text, newMatch, releaseApparatus, release } = require('./helpers');

async function check(p, base, L) {
  const hash = await newMatch(p, base, L);
  if (L === OL) await releaseApparatus(p, 'FX', 4);
  else for (let i = 0; i < 4; i++) for (const s of ['home', 'guest']) await release(p, 'FX', i, s, { e1: '1,0', e2: '1,2', d: s === 'home' ? '4,0' : '3,8' });
  await p.goto(base + hash + '/print'); await wait(p, 900);
  const t = await text(p, '#print-sheet');
  assert.match(t, /Wettkampfprotokoll/i);
  assert.match(t, /Boden/);
  assert.match(t, /12,90/, 'Endnoten im Protokoll');
  const fit = await p.evaluate(() => {
    const s = document.getElementById('print-sheet');
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;height:100mm'; document.body.appendChild(probe);
    const mm = probe.offsetHeight / 100; probe.remove();
    return s.scrollHeight * (parseFloat(s.style.zoom) || 1) <= 277 * mm + 2;
  });
  assert.ok(fit, 'passt auf eine DIN-A4-Seite');
}

module.exports = {
  async 'Protokoll Oberliga: Inhalte und eine DIN-A4-Seite'({ base, context }) { const p = await (await context()).newPage(); await check(p, base, OL); },
  async 'Protokoll Landesliga: Inhalte und eine DIN-A4-Seite'({ base, context }) { const p = await (await context()).newPage(); await check(p, base, LL); }
};
