'use strict';
const { assert, OL, wait, newMatch, dbMatches } = require('./helpers');

/** Vollständig geturnter Wettkampf (alle Geräte, alle Duelle) als Einzelsicherung; Heim turnt um `vorsprung` besser. */
function fileOf(tpl, id, date, home, guest, vorsprung, status, updatedAt) {
  const m = JSON.parse(JSON.stringify(tpl));
  Object.assign(m, { id, date, homeTeamId: home, guestTeamId: guest, status, updatedAt });
  Object.values(m.apparatus).forEach((app) => app.duels.forEach((d, i) => ['home', 'guest'].forEach((k) => {
    Object.assign(d[k], { gymnastId: (k === 'home' ? home : guest) + '-' + (i + 1), number: i + 1, name: 'Turner ' + (i + 1), d: 4000, e1: k === 'home' ? 1000 - vorsprung : 1000, e2: 1000, nd: 0, dns: false, zero: false });
  })));
  const data = { format: 'turnwettkampf-match', version: 2, exportedAt: updatedAt, league: 'oberliga', teams: { home, guest }, match: m };
  return { name: `wtb-oberliga_EINZELWETTKAMPF_${date}_${id}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) };
}

module.exports = {
  async 'Ligabericht: Dateien einlesen (neuester Stand zählt), Termine, Tabelle mit direktem Vergleich, Protokolle als Seiten'({ base, context }) {
    const ctx = await context({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await newMatch(p, base, OL);
    const tpl = (await dbMatches(p))[0];
    const r = await ctx.newPage();
    await r.goto(base + 'bericht.html'); await r.waitForSelector('#rp-league option', { state: 'attached' }); await wait(r, 300);
    // T1 schlägt T2, T2 schlägt T3, T3 schlägt T1 (alle 2:0 Wettkampfpunkte, gleiche Gerätepunkte); dazu ein offener Wettkampf
    const t0 = '2026-11-01T10:00:00.000Z', t1 = '2026-11-02T10:00:00.000Z';
    await r.setInputFiles('#rp-files', [
      fileOf(tpl, 'a', '2026-09-19', 'T1', 'T2', 300, 'final', t1),
      fileOf(tpl, 'b', '2026-09-26', 'T2', 'T3', 300, 'final', t1),
      fileOf(tpl, 'c', '2026-10-10', 'T3', 'T1', 300, 'final', t1),
      fileOf(tpl, 'd', '2026-10-24', 'T4', 'T7', 300, 'open', t1)
    ]); await wait(r, 800);
    assert.match(await r.textContent('#rp-msg'), /4 neu/);
    // älterer Stand desselben Wettkampfs wird nicht übernommen
    await r.setInputFiles('#rp-files', [fileOf(tpl, 'a', '2026-09-19', 'T1', 'T2', -300, 'final', t0)]); await wait(r, 600);
    assert.match(await r.textContent('#rp-msg'), /älter/);
    // kommender Wettkampf
    await r.fill('#rp-up-date', '2026-11-21'); await r.selectOption('#rp-up-home', 'T6'); await r.selectOption('#rp-up-guest', 'T7');
    await r.click('#rp-up-form button[type=submit]'); await wait(r, 600);
    const rows = await r.$$eval('#uebersicht .rb-sec:first-child tbody tr', (rs) => rs.map((x) => x.className + '|' + x.innerText.replace(/\s+/g, ' ').trim()));
    assert.equal(rows.length, 5, 'vier eingelesene und ein kommender Wettkampf: ' + rows.join(' / '));
    assert.match(rows[0], /19\.09\.2026/);
    assert.match(rows[3], /^open\|.*offen/, 'offener Wettkampf markiert');
    assert.match(rows[4], /^todo\|21\.11\.2026/, 'kommender Wettkampf ohne Werte');
    // Tabelle: drei Mannschaften gleich (2 Wettkampfpunkte, gleiche Differenz), direkter Vergleich im Kreis → gleicher Platz
    const tab = await r.$$eval('#uebersicht .rb-sec:nth-child(2) tbody tr', (rs) => rs.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
    assert.ok(tab.slice(0, 3).every((x) => /^1\./.test(x)), 'Platz 1 dreifach: ' + tab.join(' / '));
    assert.match(await r.textContent('#uebersicht .rb-sec:nth-child(2) .rb-note'), /Platz 1 geteilt .*unentschieden/);
    // Seiten: Übersicht + 4 Protokolle (gleiche Darstellung wie in der App), anklickbare Verweise
    assert.deepEqual(await r.$$eval('#rp-pages .print-sheet', (s) => s.map((x) => x.id)), ['uebersicht', 'p2', 'p3', 'p4', 'p5']);
    assert.ok(await r.$('#p2 .ps-head .ps-doc'), 'Protokoll mit Kopf wie in der App');
    assert.equal(await r.$('#rp-pages .print-actions'), null, 'ohne Knöpfe der App');
    assert.equal(await r.$eval('#uebersicht a[href="#p2"]', (a) => a.textContent), '2');
    assert.ok(await r.$('#p3 .rp-back a[href="#uebersicht"]'), 'Rücksprung zur Übersicht');
    // Doppelpunkte untereinander
    const cols = await r.$$eval('#uebersicht .rb-sec:first-child tbody tr:not(.todo) td:nth-child(5) .s', (s) => s.map((x) => Math.round(x.getBoundingClientRect().left)));
    assert.equal(new Set(cols).size, 1, 'Doppelpunkte der Gerätepunkte untereinander: ' + cols);
    // Datei zum Termin: aus der Terminzeile wird die Ergebniszeile; nach Neuladen alles noch da
    await r.setInputFiles('#rp-files', [fileOf(tpl, 'e', '2026-11-21', 'T6', 'T7', 300, 'final', t1)]); await wait(r, 800);
    await r.reload(); await wait(r, 1200);
    const rows2 = await r.$$eval('#uebersicht .rb-sec:first-child tbody tr', (rs) => rs.map((x) => x.className));
    assert.deepEqual(rows2, ['', '', '', 'open', ''], 'Termin durch Ergebnis ersetzt');
    // Die App selbst ist im Ligabericht nicht gestartet (keine Wettkampfdaten der App angetastet)
    assert.equal(await r.$eval('#app', (a) => a.innerHTML.trim()), '');
    // Übersicht passt auf eine Seite
    const h = await r.$eval('#uebersicht', (e) => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).zoom || 1));
    assert.ok(h > 0, 'Übersicht dargestellt');
  }
};
