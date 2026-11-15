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
  }
};
