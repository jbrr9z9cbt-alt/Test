'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const { assert, OL, wait, newMatch, releaseApparatus, dbMatches } = require('./helpers');

module.exports = {
  async 'Wettkampf sichern und in einem leeren Browser wieder einlesen'({ base, context }) {
    const p = await (await context({ acceptDownloads: true })).newPage();
    await newMatch(p, base, OL);
    await releaseApparatus(p, 'FX', 2);
    const before = (await dbMatches(p))[0];
    await p.goto(base + '#/oberliga'); await wait(p, 600);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-action=export-match]')]);
    const file = path.join(os.tmpdir(), 'wtb-e2e-' + Date.now() + '.json');
    await dl.saveAs(file);
    const q = await (await context()).newPage();
    q.on('dialog', (d) => d.accept());
    await q.goto(base + '#/oberliga'); await wait(q, 600);
    await q.setInputFiles('input[data-import]', file); await wait(q, 1200);
    const m = (await dbMatches(q)).find((x) => x.id === before.id);
    fs.unlinkSync(file);
    assert.ok(m, 'Wettkampf eingelesen');
    assert.deepEqual(m.apparatus.FX.duels.slice(0, 2).map((d) => [d.home.d, d.home.e1, d.guest.e1]), before.apparatus.FX.duels.slice(0, 2).map((d) => [d.home.d, d.home.e1, d.guest.e1]));
  }
};
