'use strict';
/** Gemeinsame Abläufe der Browser-Tests. */
const assert = require('assert/strict');

const OL = { league: 'oberliga', home: 'T6', guest: 'T3' };
const LL = { league: 'landesliga', home: 'L1', guest: 'L2' };
const LL_NAMES = ['Becker, Jonas', 'Wagner, Lukas', 'Hoffmann, Tim', 'Schulz, Ben', 'Meier, Paul', 'Fischer, Noah', 'Weber, Finn', 'Koch, Elias'];

const wait = (p, ms) => p.waitForTimeout(ms);
const text = (p, sel) => p.$eval(sel, (e) => e.innerText.replace(/\s+/g, ' ').trim());

/** Wettkampf anlegen (Pflichtfelder ausgefüllt, Zahlentastatur aus); liefert die Adresse (#/match/…). */
async function newMatch(p, base, L, opts = {}) {
  await p.goto(base + '#/' + L.league + '/new');
  await p.waitForSelector('form[data-form=match]');
  await p.evaluate((kp) => localStorage.setItem('wtb-zahlentastatur', kp), opts.keypad || 'off');
  await p.selectOption('select[name=home]', L.home);
  await p.selectOption('select[name=guest]', L.guest);
  if (L.league === 'landesliga') {
    await wait(p, 300);
    for (const [ti, t] of [[0, L.home], [1, L.guest]]) for (let k = 1; k <= 4; k++) {
      const sel = `input[data-team=${t}][data-gym="${k}"]`;
      await p.fill(sel, LL_NAMES[ti * 4 + k - 1]); await p.press(sel, 'Tab');
    }
  }
  for (const n of ['captainHome', 'captainGuest', 'judgeE1', 'judgeE2']) await p.fill(`input[name=${n}]`, 'Muster, Max');
  await p.click('button:has-text("Anlegen")');
  await p.waitForSelector('[data-action=tab]');
  await p.addStyleTag({ content: '#toast{display:none!important}' });
  return p.evaluate(() => location.hash);
}

/** Erster freier Turner in der Auswahl des Wertungsfensters. */
async function pickGymnast(p) {
  const v = await p.$eval('#score-dlg select[data-dlg=gymnast]', (s) => [...s.options].find((o) => /^[TL]\d+-\d+$/.test(o.value) && !o.disabled).value);
  await p.selectOption('#score-dlg select[data-dlg=gymnast]', v);
  await wait(p, 150);
  return v;
}

/** Wertung über das Wertungsfenster eintragen und freigeben. vals: { e1, e2, d, nd, bonus } */
async function release(p, app, idx, side, vals) {
  await p.click(`[data-action=score-open][data-app=${app}][data-duel="${idx}"][data-side=${side}]`);
  await p.waitForSelector('#score-dlg .sd-win');
  if (!(await p.$eval('#score-dlg select[data-dlg=gymnast]', (s) => s.value))) await pickGymnast(p);
  for (const f of ['e1', 'e2', 'd', 'nd']) if (vals[f] !== undefined) await p.fill(`#score-dlg input[data-dlg=${f}]`, vals[f]);
  if (vals.bonus) await p.check('#score-dlg input[data-dlg=bonus]');
  await p.click('#score-dlg [data-action=sd-release]');
  await wait(p, 300);
}

/** Ganzes Gerät freigeben; jede Seite bekommt dieselben Werte (Heim etwas besser). */
async function releaseApparatus(p, app, duels) {
  for (let i = 0; i < duels; i++) {
    for (const side of await startOrder(p, app, i)) await release(p, app, i, side, { e1: side === 'home' ? '1,0' : '1,4', e2: '1,2', d: '4,0' });
  }
}

/** Reihenfolge der Seiten im Duell (vorlegender Turner zuerst). */
async function startOrder(p, app, idx) {
  return p.$$eval(`#apparatus-panel [data-action=score-open][data-app=${app}][data-duel="${idx}"]`, (bs) => bs.map((b) => b.getAttribute('data-side')));
}

/** Tafel in eigenem Fenster öffnen. */
async function openBoard(ctx, base, hash, size) {
  const bp = await ctx.newPage();
  await bp.setViewportSize(size || { width: 1920, height: 1080 });
  await bp.goto(base + hash + '/board');
  await bp.waitForSelector('.board');
  await wait(bp, 400);
  return bp;
}

/** Gespeicherte Wettkämpfe aus IndexedDB. */
function dbMatches(p) {
  return p.evaluate(() => new Promise((res) => {
    const q = indexedDB.open('turnwettkampf');
    q.onsuccess = () => { const g = q.result.transaction('matches').objectStore('matches').getAll(); g.onsuccess = () => res(g.result); };
  }));
}

/** Nichts ragt über den Rand: Seite ohne Scrollen, alle Elemente innerhalb des Fensters. */
async function fitsViewport(p, sel) {
  return p.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    return { ok: r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 &&
      document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
      r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], vp: [innerWidth, innerHeight] };
  }, sel);
}

module.exports = { assert, OL, LL, wait, text, newMatch, pickGymnast, release, releaseApparatus, startOrder, openBoard, dbMatches, fitsViewport };
