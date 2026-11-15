'use strict';
const { devices } = require('playwright');
const { assert, OL, LL, wait, newMatch, releaseApparatus, openBoard, fitsViewport, pickGymnast } = require('./helpers');

const SIZES = [[1920, 1080], [1366, 768], [3840, 2160], [1180, 820], [820, 1180], [390, 844], [844, 390]];

module.exports = {
  async 'Tafel passt auf alle Bildschirmgrößen (beide Ligen)'({ base, context }) {
    for (const L of [OL, LL]) {
      const ctx = await context();
      const p = await ctx.newPage();
      const hash = await newMatch(p, base, L);
      await releaseApparatus(p, 'FX', L === OL ? 2 : 1);
      for (const [w, h] of SIZES) {
        const bp = await openBoard(ctx, base, hash, { width: w, height: h });
        await wait(bp, 300);
        const f = await fitsViewport(bp, '.board');
        assert.ok(f.ok, `${L.league} ${w}×${h}: Tafel ragt heraus ${JSON.stringify(f)}`);
        await bp.close();
      }
    }
  },

  async 'Wertungsfenster passt auf iPhone und iPad'({ base, context }) {
    for (const dev of [devices['iPhone 13'], devices['iPhone 14 Pro Max'], { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true }]) {
      const p = await (await context(dev)).newPage();
      await newMatch(p, base, OL, { keypad: 'auto' });
      await p.click('[data-action=tab][data-tab=SR]'); await wait(p, 200);
      await p.click('[data-action=score-open][data-app=SR][data-duel="0"][data-side=home]');
      await pickGymnast(p);
      const f = await p.evaluate(() => { const r = document.querySelector('#score-dlg .sd-win').getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1; });
      assert.ok(f, 'Wertungsfenster ragt heraus');
    }
  }
};
