const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/scoring.js');
const SB = require('../js/crypto.js');

const rules = S.clone(S.DEFAULT_RULES);
const side = (d, e, nd = 0, extra = {}) => Object.assign(S.emptySide(), { d: S.parseScore(d), e: S.parseScore(e), nd: S.parseScore(nd) || 0 }, extra);

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
});

test('Endnote = D + E − Abzug, nicht angetreten = 0', () => {
  assert.equal(S.sideFinal(side('4,8', '8,433', '0,3')), 12933);
  assert.equal(S.sideFinal(side('4,8', '')), null);
  assert.equal(S.sideFinal(Object.assign(S.emptySide(), { dns: true })), 0);
});

test('Scorepunkte nach Differenz-Schwellen', () => {
  const p = (diff) => S.pointsForDiff(S.parseScore(diff), rules.thresholds);
  assert.equal(p('0'), 0);
  assert.equal(p('0,049'), 0);
  assert.equal(p('0,05'), 1);
  assert.equal(p('0,30'), 1);
  assert.equal(p('0,35'), 2);
  assert.equal(p('0,65'), 3);
  assert.equal(p('0,999'), 3);
  assert.equal(p('1,0'), 4);
  assert.equal(p('1,5'), 5);
  assert.equal(p('7'), 5);
});

test('Duell: Sieger erhält Punkte, Verlierer 0, Gleichstand 0:0', () => {
  let r = S.duelResult({ home: side('5', '8,5'), guest: side('4,5', '8,3') }, rules);
  assert.deepEqual([r.homePoints, r.guestPoints, r.winner, r.diff], [3, 0, 'home', 700]);
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
  // Heim gewinnt jedes Duell mit 0,40 Differenz (2 Punkte), außer am Reck: Gast gewinnt mit 1,60 (5 Punkte)
  const m = buildMatch((key, i) => key === 'HB'
    ? { home: side('4', '8', 0, { name: 'H' + i }), guest: side('5', '8,6', 0, { name: 'G' + i }) }
    : { home: side('4', '8,4', 0, { name: 'H' + i }), guest: side('4', '8', 0, { name: 'G' + i }) });
  const r = S.matchResult(m);
  assert.equal(r.complete, true);
  assert.equal(r.homePoints, 5 * 4 * 2);
  assert.equal(r.guestPoints, 4 * 5);
  assert.equal(r.homeApp, 10);
  assert.equal(r.guestApp, 2);
  assert.equal(r.winner, 'home');
  assert.deepEqual([r.homeMatch, r.guestMatch], [2, 0]);

  const table = S.leagueTable([Object.assign({ id: 1 }, m)]);
  assert.equal(table[0].teamId, 'A');
  assert.equal(table[0].points, 2);
  assert.equal(table[1].score, 20);

  const sc = S.scorers(m);
  assert.equal(sc[0].points, 10);
  assert.equal(sc[0].team, 'home');
});

test('Gerätepunkte erst bei vollständigem Gerät, Gleichstand-Regel', () => {
  const m = buildMatch(() => ({ home: side('4', '8'), guest: side('4', '8') }));
  m.apparatus.FX.duels[0].home.e = null;
  let r = S.matchResult(m);
  assert.equal(r.complete, false);
  assert.equal(r.apparatus.FX.homeApp, 0);
  assert.equal(r.apparatus.PH.homeApp, 1);
  m.apparatus.FX.duels[0].home.e = 8000;
  r = S.matchResult(m);
  assert.equal(r.winner, 'draw');
  assert.deepEqual([r.homeMatch, r.guestMatch], [1, 1]);
});

test('Verschlüsselte Sicherung: Roundtrip und falsches Passwort', async () => {
  const data = { format: 'turnwettkampf-backup', teams: [{ id: 'x', name: 'TV Ä' }], matches: [] };
  const env = await SB.encryptJSON(data, 'geheim123');
  assert.ok(SB.isEncrypted(env));
  assert.ok(!JSON.stringify(env).includes('TV'));
  assert.deepEqual(await SB.decryptJSON(env, 'geheim123'), data);
  await assert.rejects(() => SB.decryptJSON(env, 'falsch'), /Falsches Passwort/);
});
