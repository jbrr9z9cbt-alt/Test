const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/scoring.js');
const SB = require('../js/crypto.js');

const rules = S.clone(S.DEFAULT_RULES);
// Hilfsfunktion: E-Note wird über zwei gleiche Abzüge (10 − E) abgebildet.
const side = (d, e, nd = 0, extra = {}) => {
  const ev = S.parseScore(e);
  const ded = ev === null ? null : 10000 - ev;
  return Object.assign(S.emptySide(), { d: S.parseScore(d), e1: ded, e2: ded, nd: S.parseScore(nd) || 0 }, extra);
};

test('parseScore / formatScore', () => {
  assert.equal(S.parseScore('8,433'), 8433);
  assert.equal(S.parseScore('8.4'), 8400);
  assert.equal(S.parseScore('13'), 13000);
  assert.equal(S.parseScore(''), null);
  assert.ok(Number.isNaN(S.parseScore('abc')));
  assert.ok(Number.isNaN(S.parseScore('8,4335')));
  assert.equal(S.formatScore(8433), '8,433');
  assert.equal(S.formatScore(50), '0,050');
  assert.equal(S.formatScore(null), '–');
  assert.equal(S.formatScore(4500, 1), '4,5');
  assert.equal(S.formatScore(8650, 2), '8,65');
  assert.equal(S.formatScore(12600, 2), '12,60');
  assert.equal(S.formatScore(8625, 2), '8,63');
});

test('Endnote = D + E − Abzug, nicht angetreten = 0', () => {
  assert.equal(S.sideFinal(side('4,8', '8,433', '0,3')), 12933);
  assert.equal(S.sideFinal(side('4,8', '')), null);
  assert.equal(S.sideFinal(Object.assign(S.emptySide(), { dns: true })), 0);
});

test('E-Note = 10 − Mittelwert der zwei Abzüge', () => {
  const s = Object.assign(S.emptySide(), { d: 5000, e1: S.parseScore('1,3'), e2: S.parseScore('1,6') });
  assert.equal(S.eScore(s), 8550);
  assert.equal(S.sideFinal(s), 13550);
  s.nd = 300;
  assert.equal(S.sideFinal(s), 13250);
  s.e2 = null;
  assert.equal(S.eScore(s), null);
  assert.equal(S.sideFinal(s), null);
});

const reveal = (duel, at) => { duel.revealedAt = at; duel.shown = { home: S.snapshotSide(duel.home), guest: S.snapshotSide(duel.guest) }; };

test('Anzeigetafel zeigt nur angezeigte Duelle', () => {
  const m = buildMatch((key, i) => ({ home: side('5', '8', 0, { name: 'H' + i, number: i + 1 }), guest: side('4', '8', 0, { name: 'G' + i, number: i + 1 }) }));
  assert.equal(S.matchResult(m).homePoints, 6 * 4 * 2);
  assert.equal(S.matchResult(S.revealedView(m)).homePoints, 0);
  reveal(m.apparatus.FX.duels[0], '2026-10-18T10:00:00Z');
  reveal(m.apparatus.FX.duels[2], '2026-10-18T10:01:00Z');
  const view = S.revealedView(m);
  const r = S.matchResult(view);
  assert.equal(r.homePoints, 4);
  assert.equal(r.apparatus.FX.complete, false);
  assert.equal(view.apparatus.FX.duels[1].home.name, 'H1');
  assert.equal(view.apparatus.FX.duels[1].home.d, null);
  assert.equal(m.apparatus.FX.duels[1].home.d, 5000, 'Original bleibt unverändert');
});

test('Nachträgliche Änderung: Tafel behält alten Stand bis zur Korrektur', () => {
  const m = buildMatch(() => ({ home: side('5', '8', 0, { gymnastId: 'T1-1', name: 'H' }), guest: side('4', '8', 0, { gymnastId: 'T2-1', name: 'G' }) }));
  const duel = m.apparatus.FX.duels[0];
  reveal(duel, '2026-10-18T10:00:00Z');
  assert.equal(S.pendingCorrections(m).length, 0);
  duel.guest.d = 5500; // Gast jetzt 0,5 vorne
  assert.ok(S.hasPendingCorrection(duel));
  assert.deepEqual(S.pendingCorrections(m), [{ appKey: 'FX', idx: 0 }]);
  let shown = S.duelResult(S.revealedView(m).apparatus.FX.duels[0], m.rules);
  assert.deepEqual([shown.homePoints, shown.guestPoints], [2, 0], 'Tafel zeigt noch den alten Stand');
  duel.home.name = 'Neuer Name'; // reine Namensänderung ist keine Korrektur
  reveal(duel, '2026-10-18T10:05:00Z');
  assert.equal(S.hasPendingCorrection(duel), false);
  shown = S.duelResult(S.revealedView(m).apparatus.FX.duels[0], m.rules);
  assert.deepEqual([shown.homePoints, shown.guestPoints], [0, 2]);
  assert.equal(S.revealedView(m).apparatus.FX.duels[0].home.name, 'Neuer Name');
  duel.home.nd = 0; duel.home.dns = false; // gleichwertige Werte lösen nichts aus
  assert.equal(S.hasPendingCorrection(duel), false);
});

test('Drei E-Kampfrichter: höchster und niedrigster Abzug gestrichen', () => {
  const r3 = Object.assign(S.clone(rules), { eJudges: 3 });
  const s = Object.assign(S.emptySide(), { d: 4000, e1: 1500, e2: 1200, e3: 2100 });
  assert.equal(S.eScore(s, r3), 8500, 'mittlerer Abzug 1,5');
  assert.equal(S.sideFinal(s, r3), 12500);
  assert.equal(S.eScore(s, rules), 8650, 'mit 2 Kampfrichtern zählt der Mittelwert von E1 und E2');
  s.e3 = null;
  assert.equal(S.eScore(s, r3), null, 'E3 fehlt noch');
});

test('Standbonus zählt 0,1 zur Endnote', () => {
  const s = Object.assign(S.emptySide(), { d: 4000, e1: 1500, e2: 1500, bonus: true });
  assert.equal(S.sideFinal(s, rules), 12600);
  s.bonus = false;
  assert.equal(S.sideFinal(s, rules), 12500);
});

test('Startreihenfolge: je 2 Duelle im Block, Gerät für Gerät gewechselt', () => {
  const order = (start) => S.APPARATUS.slice(0, 3).map((a) =>
    [0, 1, 2, 3].map((i) => S.startOrder({ startTeam: start }, a.key, i)[0] === start ? 'A' : 'B').join(''));
  assert.deepEqual(order('home'), ['AABB', 'BBAA', 'AABB']);
  assert.deepEqual(order('guest'), ['AABB', 'BBAA', 'AABB']);
  assert.deepEqual(S.startOrder({ startTeam: 'guest' }, 'FX', 0), ['guest', 'home']);
  assert.deepEqual(S.startOrder({}, 'PH', 0), ['guest', 'home']);
});

test('Wertung 0: angetreten, Endnote 0,00; D-Note 0 rechnet normal', () => {
  const s = Object.assign(S.emptySide(), { d: 0, e1: 2000, e2: 2000 });
  assert.equal(S.sideFinal(s, rules), 8000, 'D-Note 0 mit normalen Abzügen');
  s.zero = true;
  assert.equal(S.sideFinal(s, rules), 0);
  const z = Object.assign(S.emptySide(), { zero: true });
  assert.equal(S.sideFinal(z, rules), 0, 'auch ohne weitere Eingaben gewertet');
});

test('Topscorer: drei Plätze, bei Gleichstand mehr mit korrekter Platzierung', () => {
  const pts = [5, 5, 3, 2, 2, 1];
  const m = { rules: S.clone(rules), apparatus: {} };
  S.APPARATUS.forEach((a) => { m.apparatus[a.key] = { duels: [] }; });
  // Je Turner ein Duell am Boden mit passendem Vorsprung (Scorepunkte 5/3/2/1)
  const lead = { 5: '3,5', 3: '1,5', 2: '0,5', 1: '0,2' };
  pts.forEach((p, i) => m.apparatus.FX.duels.push({
    home: side(String(4 + Number(lead[p].replace(',', '.'))).replace('.', ','), '8', 0, { gymnastId: 'H' + i, name: 'H' + i }),
    guest: side('4', '8', 0, { gymnastId: 'G' + i, name: 'G' + i })
  }));
  const top = S.topScorers(m);
  assert.deepEqual(top.map((x) => [x.rank, x.points]), [[1, 5], [1, 5], [3, 3]]);
  m.apparatus.FX.duels.splice(2, 1); // ohne den 3-Punkte-Turner: Platz 3 teilen sich zwei
  assert.deepEqual(S.topScorers(m).map((x) => [x.rank, x.points]), [[1, 5], [1, 5], [3, 2], [3, 2]]);
});

test('Scorepunkte nach WTB-Oberliga-Scoresystem', () => {
  const p = (diff) => S.pointsForDiff(S.parseScore(diff), rules.thresholds);
  assert.equal(p('0'), 0);
  assert.equal(p('0,10'), 0, 'unter 0,15 unentschieden');
  assert.equal(p('0,15'), 1);
  assert.equal(p('0,40'), 1);
  assert.equal(p('0,45'), 2);
  assert.equal(p('1,00'), 2);
  assert.equal(p('1,05'), 3);
  assert.equal(p('2,00'), 3);
  assert.equal(p('2,05'), 4);
  assert.equal(p('3,00'), 4);
  assert.equal(p('3,05'), 5);
  assert.equal(p('7'), 5);
});

test('Duell: Sieger erhält Punkte, Verlierer 0, Gleichstand 0:0', () => {
  let r = S.duelResult({ home: side('5', '8,5'), guest: side('4,5', '8,3') }, rules);
  assert.deepEqual([r.homePoints, r.guestPoints, r.winner, r.diff], [2, 0, 'home', 700]);
  r = S.duelResult({ home: side('5', '8'), guest: side('5', '8') }, rules);
  assert.deepEqual([r.homePoints, r.guestPoints, r.winner], [0, 0, 'draw']);
  r = S.duelResult({ home: side('5', ''), guest: side('5', '8') }, rules);
  assert.equal(r.complete, false);
});

function buildMatch(fill) {
  const m = { rules: S.clone(rules), apparatus: {}, status: 'final', homeTeamId: 'A', guestTeamId: 'B' };
  S.APPARATUS.forEach((a) => {
    m.apparatus[a.key] = { duels: Array.from({ length: 4 }, (_, i) => fill(a.key, i)) };
  });
  return m;
}

test('Gerät und Wettkampf: Score-, Geräte- und Tabellenpunkte', () => {
  // Heim gewinnt jedes Duell mit 0,40 Differenz (1 Punkt), außer am Reck: Gast gewinnt mit 1,60 (3 Punkte)
  const m = buildMatch((key, i) => key === 'HB'
    ? { home: side('4', '8', 0, { name: 'H' + i }), guest: side('5', '8,6', 0, { name: 'G' + i }) }
    : { home: side('4', '8,4', 0, { name: 'H' + i }), guest: side('4', '8', 0, { name: 'G' + i }) });
  const r = S.matchResult(m);
  assert.equal(r.complete, true);
  assert.equal(r.homePoints, 5 * 4 * 1);
  assert.equal(r.guestPoints, 4 * 3);
  assert.equal(r.homeApp, 10);
  assert.equal(r.guestApp, 2);
  assert.equal(r.winner, 'home');
  assert.deepEqual([r.homeMatch, r.guestMatch], [2, 0]);

  const table = S.leagueTable([Object.assign({ id: 1 }, m)]);
  assert.equal(table[0].teamId, 'A');
  assert.equal(table[0].points, 2);
  assert.equal(table[1].score, 12);

  const sc = S.scorers(m);
  assert.equal(sc[0].points, 5);
  assert.equal(sc[0].team, 'home');
});

test('Gerätepunkte erst bei vollständigem Gerät, Gleichstand-Regel', () => {
  const m = buildMatch(() => ({ home: side('4', '8'), guest: side('4', '8') }));
  m.apparatus.FX.duels[0].home.e1 = null;
  let r = S.matchResult(m);
  assert.equal(r.complete, false);
  assert.equal(r.apparatus.FX.homeApp, 0);
  assert.equal(r.apparatus.PH.homeApp, 1);
  m.apparatus.FX.duels[0].home.e1 = 2000;
  r = S.matchResult(m);
  assert.equal(r.winner, 'draw');
  assert.deepEqual([r.homeMatch, r.guestMatch], [1, 1]);
});

test('Verschlüsselte Sicherung: Roundtrip und falsches Passwort', async () => {
  const data = { format: 'turnwettkampf-backup', teams: [{ id: 'x', name: 'Klartext-Mannschaft Ä' }], matches: [] };
  const env = await SB.encryptJSON(data, 'geheim123');
  assert.ok(SB.isEncrypted(env));
  // Ein langer, eindeutiger Text kann nicht zufällig im verschlüsselten Base64-Text auftauchen.
  assert.ok(!JSON.stringify(env).includes('Klartext-Mannschaft'));
  assert.deepEqual(await SB.decryptJSON(env, 'geheim123'), data);
  await assert.rejects(() => SB.decryptJSON(env, 'falsch'), /Falsches Passwort/);
});

// ---------- Landesliga (klassisches Modell) ----------

const classicMatch = (startTeam = 'home') => {
  const m = { rules: S.classicRules(2), startTeam, apparatus: {} };
  S.APPARATUS.forEach(a => { m.apparatus[a.key] = { duels: [0, 1, 2, 3].map(() => S.emptyRow()) }; });
  return m;
};
const cs = (d, e) => side(d, e, 0, { gymnastId: 'x' + Math.random() });

test('Klassisch: die drei höchsten Wertungen zählen, niedrigste ist Streichwertung', () => {
  const m = classicMatch();
  const fx = m.apparatus.FX.duels;
  [['4', '8'], ['4', '9'], ['3', '8'], ['5', '9']].forEach(([d, e], i) => { fx[i].home = cs(d, e); });
  const r = S.apparatusResult(m.apparatus.FX, m.rules);
  assert.deepEqual(r.home.struck, [2]);            // 11,00 ist die niedrigste
  assert.equal(r.homeSum, 12000 + 13000 + 14000);
  assert.equal(r.complete, false);                 // Gast fehlt noch
});

test('Klassisch: bei gleich niedrigen Wertungen wird die später geturnte gestrichen', () => {
  const m = classicMatch();
  const fx = m.apparatus.FX.duels;
  [['4', '8'], ['5', '8'], ['4', '8'], ['5', '8']].forEach(([d, e], i) => { fx[i].home = cs(d, e); });
  assert.deepEqual(S.apparatusResult(m.apparatus.FX, m.rules).home.struck, [2]);
});

test('Klassisch: mit drei oder weniger Wertungen wird nichts gestrichen', () => {
  const m = classicMatch();
  const fx = m.apparatus.FX.duels;
  fx[0].home = cs('4', '8'); fx[1].home = cs('4', '9');
  fx[2].home = Object.assign(S.emptySide(), { dns: true }); fx[3].home = Object.assign(S.emptySide(), { dns: true });
  const r = S.apparatusResult(m.apparatus.FX, m.rules);
  assert.equal(r.homeSum, 25000);                  // nur die zwei geturnten Wertungen (n.a. = 0)
  assert.deepEqual(r.home.struck, [3]);            // 4 Werte (davon 2× 0): eine 0 wird gestrichen
});

test('Klassisch: Gerätepunkte, Gesamtsumme und Sieger', () => {
  const m = classicMatch();
  S.APPARATUS.forEach(a => m.apparatus[a.key].duels.forEach((d, i) => {
    d.home = cs('4', '8');                          // 12,00
    d.guest = cs('4', a.key === 'FX' ? '9' : '7,5'); // Boden 13,00, sonst 11,50
  }));
  const r = S.matchResult(m);
  assert.equal(r.apparatus.FX.guestApp, 2);
  assert.equal(r.apparatus.PH.homeApp, 2);
  assert.equal(r.homeSum, 6 * 36000);
  assert.equal(r.guestSum, 39000 + 5 * 34500);
  assert.equal(r.winner, 'home');
  assert.equal(r.homeMatch, 2);
  assert.equal(r.homePoints, 0);                   // keine Scorepunkte
});

test('Klassisch: Startreihenfolge wechselt je Gerät, Positionen 1–8', () => {
  const m = classicMatch('guest');
  assert.deepEqual(S.classicOrder(m, 'FX'), ['guest', 'home']);
  assert.deepEqual(S.classicOrder(m, 'PH'), ['home', 'guest']);
  assert.equal(S.classicPosition(m, 'FX', 0, 'guest'), 1);
  assert.equal(S.classicPosition(m, 'FX', 0, 'home'), 2);
  assert.equal(S.classicPosition(m, 'FX', 3, 'home'), 8);
});

test('Klassisch: Freigabe je Übung, Korrektur und Tafelansicht', () => {
  const m = classicMatch();
  const d = m.apparatus.FX.duels[0];
  d.home = cs('4', '8');
  d.revs.home = { revealedAt: 't1', shown: S.snapshotSide(d.home) };
  d.guest = cs('4', '9');                           // noch nicht freigegeben
  const v = S.revealedView(m);
  assert.equal(S.sideFinal(v.apparatus.FX.duels[0].home, m.rules), 12000);
  assert.equal(S.sideFinal(v.apparatus.FX.duels[0].guest, m.rules), null);
  assert.deepEqual(S.pendingCorrections(m), []);
  d.home.d = 4500;
  assert.deepEqual(S.pendingCorrections(m), [{ appKey: 'FX', idx: 0, side: 'home' }]);
});

test('Klassisch: Topscorer nach Summe aller geturnten Wertungen', () => {
  const m = classicMatch();
  const a = Object.assign(cs('4', '8'), { gymnastId: 'L1-1', number: 1, name: 'A' });
  const b = Object.assign(cs('5', '9'), { gymnastId: 'L1-2', number: 2, name: 'B' });
  m.apparatus.FX.duels[0].home = a;
  m.apparatus.PH.duels[0].home = Object.assign(S.clone(a), {});
  m.apparatus.FX.duels[1].home = b;
  const top = S.topScorers(m, 3);
  assert.equal(top[0].name, 'A');
  assert.equal(top[0].points, 24000);
  assert.equal(top[1].points, 14000);
});
