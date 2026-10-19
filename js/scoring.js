/*
 * Wertungslogik nach dem Scoresystem der WTB-Oberliga (Stand 20.09.2025).
 *
 * Alle Noten werden intern als ganze Zahlen in Tausendsteln gespeichert
 * (8,433 Punkte => 8433), damit keine Rundungsfehler durch Gleitkommazahlen
 * entstehen.
 *
 * Noten:
 *  - E-Note mit 2 E-Kampfrichtern: 10 − Mittelwert der beiden E-Abzüge.
 *  - E-Note mit 3 E-Kampfrichtern: höchster und niedrigster Abzug werden
 *    gestrichen, 10 − mittlerer Abzug.
 *  - Endnote = D-Note + Standbonus (0,1; nicht am Pauschenpferd) + E-Note − neutrale Abzüge.
 *
 * Ablauf:
 *  - An jedem Gerät turnen Heim- und Gastturner paarweise im Duell.
 *  - Der Turner mit der höheren Endnote erhält Scorepunkte abhängig von der
 *    Notendifferenz (Schwellen konfigurierbar), der Gegner 0.
 *  - Wer an einem Gerät mehr Scorepunkte sammelt, erhält die Gerätepunkte.
 *  - Sieger des Wettkampfs ist die Mannschaft mit mehr Scorepunkten.
 */
(function (root) {
  'use strict';

  var APPARATUS = [
    { key: 'FX', name: 'Boden', short: 'BO' },
    { key: 'PH', name: 'Pauschenpferd', short: 'PP' },
    { key: 'SR', name: 'Ringe', short: 'RI' },
    { key: 'VT', name: 'Sprung', short: 'SP' },
    { key: 'PB', name: 'Barren', short: 'BA' },
    { key: 'HB', name: 'Reck', short: 'RE' }
  ];

  // Feste Regeln der WTB-Oberliga – in der App nicht änderbar.
  // Schwellen: ab dieser Differenz (in Tausendsteln) gibt es so viele Scorepunkte;
  // unter 0,15 endet das Duell unentschieden.
  var DEFAULT_RULES = {
    duelsPerApparatus: 4,
    thresholds: [
      { min: 150, points: 1 },
      { min: 450, points: 2 },
      { min: 1050, points: 3 },
      { min: 2050, points: 4 },
      { min: 3050, points: 5 }
    ],
    apparatusPoints: { win: 2, draw: 1, loss: 0 },
    matchPoints: { win: 2, draw: 1, loss: 0 },
    // 'none': Gleichstand bei Scorepunkten ist Unentschieden,
    // 'apparatus': dann entscheiden die Gerätepunkte.
    tieBreak: 'none',
    // Anzahl der E-Kampfrichter: 2 (mit neutralem E2) oder 3 (E2 Heim, E3 Gast).
    eJudges: 2
  };

  var STAND_BONUS = 100;
  var NO_BONUS_APPARATUS = 'PH';

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** "8,433" | "8.4" | "" -> 8433 | 8400 | null; ungültig -> NaN */
  function parseScore(input) {
    if (input === null || input === undefined) return null;
    var s = String(input).trim().replace(',', '.');
    if (s === '') return null;
    if (!/^\d{1,2}(\.\d{0,3})?$/.test(s)) return NaN;
    var parts = s.split('.');
    var frac = ((parts[1] || '') + '000').slice(0, 3);
    return parseInt(parts[0], 10) * 1000 + parseInt(frac, 10);
  }

  /** 8433 -> "8,433"; mit decimals 2 -> "8,43", mit 1 -> "8,4" (kaufmännisch gerundet) */
  function formatScore(value, decimals) {
    if (value === null || value === undefined || Number.isNaN(value)) return '–';
    var d = decimals === undefined ? 3 : decimals;
    var unit = Math.pow(10, 3 - d);
    var sign = value < 0 ? '-' : '';
    var v = Math.round(Math.abs(value) / unit);
    var base = Math.pow(10, d);
    var whole = Math.floor(v / base);
    return d === 0 ? sign + whole : sign + whole + ',' + String(v % base).padStart(d, '0');
  }

  /** Regeln eines Wettkampfs: immer die festen Ligaregeln, nur die Zahl der E-Kampfrichter variiert. */
  function leagueRules(eJudges) {
    var r = clone(DEFAULT_RULES);
    r.eJudges = eJudges === 3 ? 3 : 2;
    return r;
  }

  function emptySide() {
    return { gymnastId: null, number: null, name: '', d: null, e1: null, e2: null, e3: null, nd: 0, bonus: false, dns: false };
  }

  function emptyDuel() {
    return { home: emptySide(), guest: emptySide(), revealedAt: null };
  }

  function isSet(v) {
    return v !== null && v !== undefined;
  }

  function eJudgeCount(rules) {
    return rules && rules.eJudges === 3 ? 3 : 2;
  }

  /**
   * Maßgeblicher E-Abzug: bei 2 Kampfrichtern der Mittelwert, bei 3 der mittlere
   * Wert (höchster und niedrigster gestrichen). null = noch offen.
   */
  function eDeduction(side, rules) {
    if (!side) return null;
    if (eJudgeCount(rules) === 3) {
      if (!isSet(side.e1) || !isSet(side.e2) || !isSet(side.e3)) return null;
      return [side.e1, side.e2, side.e3].sort(function (a, b) { return a - b; })[1];
    }
    if (!isSet(side.e1) || !isSet(side.e2)) return null;
    return Math.round((side.e1 + side.e2) / 2);
  }

  /** E-Note = 10 − maßgeblicher E-Abzug. null = noch offen. */
  function eScore(side, rules) {
    var ded = eDeduction(side, rules);
    return ded === null ? null : Math.max(0, 10000 - ded);
  }

  /** Endnote = D + Standbonus + E − neutrale Abzüge; "nicht angetreten" zählt 0. null = noch offen. */
  function sideFinal(side, rules) {
    if (!side) return null;
    if (side.dns) return 0;
    var e = eScore(side, rules);
    if (!isSet(side.d) || e === null) return null;
    return Math.max(0, side.d + (side.bonus ? STAND_BONUS : 0) + e - (side.nd || 0));
  }

  /**
   * Startreihenfolge im Duell: An jedem Gerät bilden je zwei Duelle einen Block.
   * Gerät 1: Duell 1+2 beginnt die beginnende Mannschaft A, Duell 3+4 die andere (AA, BB);
   * am nächsten Gerät umgekehrt (BB, AA) usw.
   * Liefert ['home', 'guest'] oder ['guest', 'home'].
   */
  function startOrder(match, appKey, duelIdx) {
    var appIdx = APPARATUS.map(function (a) { return a.key; }).indexOf(appKey);
    var a = match.startTeam === 'guest' ? 'guest' : 'home';
    var b = a === 'home' ? 'guest' : 'home';
    var flip = (appIdx + Math.floor(duelIdx / 2)) % 2 === 1;
    return flip ? [b, a] : [a, b];
  }

  // Werte, die auf der Anzeigetafel angezeigt werden. Ändert sich einer davon nach
  // dem Anzeigen, muss die Korrektur erst angezeigt werden.
  var SHOWN_FIELDS = ['gymnastId', 'd', 'e1', 'e2', 'e3', 'nd', 'bonus', 'dns'];

  function norm(field, v) {
    if (field === 'nd') return v || 0;
    if (field === 'dns' || field === 'bonus') return !!v;
    return v === undefined ? null : v;
  }

  /** Stand einer Seite, wie er beim Anzeigen festgehalten wird. */
  function snapshotSide(side) {
    var o = { number: side.number || null, name: side.name || '' };
    SHOWN_FIELDS.forEach(function (f) { o[f] = norm(f, side[f]); });
    return o;
  }

  function sideDiffers(live, shown) {
    return SHOWN_FIELDS.some(function (f) { return norm(f, live[f]) !== norm(f, shown[f]); });
  }

  /** Wurde ein bereits angezeigtes Duell nachträglich geändert? */
  function hasPendingCorrection(duel) {
    return !!duel.shown && (sideDiffers(duel.home, duel.shown.home) || sideDiffers(duel.guest, duel.shown.guest));
  }

  function pendingCorrections(match) {
    var list = [];
    APPARATUS.forEach(function (a) {
      var app = match.apparatus[a.key];
      if (!app) return;
      app.duels.forEach(function (duel, i) {
        if (hasPendingCorrection(duel)) list.push({ appKey: a.key, idx: i });
      });
    });
    return list;
  }

  /**
   * Sicht für die Anzeigetafel: Je Duell gilt der zuletzt angezeigte Stand.
   * Noch nie angezeigte Duelle gelten als offen – nur die Turner sind sichtbar.
   */
  function revealedView(match) {
    var view = clone(match);
    APPARATUS.forEach(function (a) {
      var app = view.apparatus[a.key];
      if (!app) return;
      app.duels.forEach(function (duel) {
        ['home', 'guest'].forEach(function (k) {
          var live = duel[k];
          var s = emptySide();
          if (duel.shown) {
            Object.assign(s, duel.shown[k]);
            // Namensänderungen im Kader direkt übernehmen, solange es derselbe Turner ist.
            if (live.gymnastId === s.gymnastId) { s.name = live.name; s.number = live.number; }
          } else {
            s.gymnastId = live.gymnastId;
            s.number = live.number;
            s.name = live.name;
          }
          duel[k] = s;
        });
      });
    });
    return view;
  }

  function pointsForDiff(diff, thresholds) {
    var sorted = thresholds.slice().sort(function (a, b) { return a.min - b.min; });
    var points = 0;
    for (var i = 0; i < sorted.length; i++) {
      if (diff >= sorted[i].min) points = sorted[i].points;
    }
    return points;
  }

  function duelResult(duel, rules) {
    var h = sideFinal(duel.home, rules);
    var g = sideFinal(duel.guest, rules);
    if (h === null || g === null) {
      return { complete: false, home: h, guest: g, diff: null, homePoints: 0, guestPoints: 0, winner: null };
    }
    var diff = Math.abs(h - g);
    var pts = pointsForDiff(diff, rules.thresholds);
    return {
      complete: true,
      home: h,
      guest: g,
      diff: diff,
      homePoints: h > g ? pts : 0,
      guestPoints: g > h ? pts : 0,
      winner: pts === 0 ? 'draw' : (h > g ? 'home' : 'guest')
    };
  }

  function apparatusResult(app, rules) {
    var duels = (app && app.duels) || [];
    var res = {
      duels: [], homePoints: 0, guestPoints: 0, homeSum: 0, guestSum: 0,
      complete: duels.length > 0, started: false, homeApp: 0, guestApp: 0
    };
    duels.forEach(function (duel) {
      var r = duelResult(duel, rules);
      res.duels.push(r);
      res.homePoints += r.homePoints;
      res.guestPoints += r.guestPoints;
      if (r.home !== null) { res.homeSum += r.home; res.started = true; }
      if (r.guest !== null) { res.guestSum += r.guest; res.started = true; }
      if (!r.complete) res.complete = false;
    });
    // Gerätepunkte werden erst vergeben, wenn alle Duelle des Geräts gewertet sind.
    if (res.complete) {
      var ap = rules.apparatusPoints;
      if (res.homePoints > res.guestPoints) { res.homeApp = ap.win; res.guestApp = ap.loss; }
      else if (res.homePoints < res.guestPoints) { res.homeApp = ap.loss; res.guestApp = ap.win; }
      else { res.homeApp = ap.draw; res.guestApp = ap.draw; }
    }
    return res;
  }

  function matchResult(match) {
    var rules = match.rules;
    var res = {
      apparatus: {}, homePoints: 0, guestPoints: 0, homeApp: 0, guestApp: 0,
      homeSum: 0, guestSum: 0, complete: true, winner: null, homeMatch: 0, guestMatch: 0
    };
    APPARATUS.forEach(function (a) {
      var r = apparatusResult(match.apparatus[a.key], rules);
      res.apparatus[a.key] = r;
      res.homePoints += r.homePoints;
      res.guestPoints += r.guestPoints;
      res.homeApp += r.homeApp;
      res.guestApp += r.guestApp;
      res.homeSum += r.homeSum;
      res.guestSum += r.guestSum;
      if (!r.complete) res.complete = false;
    });
    if (res.complete) {
      var diff = res.homePoints - res.guestPoints;
      if (diff === 0 && rules.tieBreak === 'apparatus') diff = res.homeApp - res.guestApp;
      res.winner = diff > 0 ? 'home' : diff < 0 ? 'guest' : 'draw';
      var mp = rules.matchPoints;
      res.homeMatch = res.winner === 'home' ? mp.win : res.winner === 'draw' ? mp.draw : mp.loss;
      res.guestMatch = res.winner === 'guest' ? mp.win : res.winner === 'draw' ? mp.draw : mp.loss;
    }
    return res;
  }

  /** Scorer-Rangliste eines Wettkampfs: Scorepunkte je Turner. */
  function scorers(match) {
    var map = {};
    APPARATUS.forEach(function (a) {
      var app = match.apparatus[a.key];
      if (!app) return;
      app.duels.forEach(function (duel) {
        var r = duelResult(duel, match.rules);
        [['home', r.homePoints], ['guest', r.guestPoints]].forEach(function (pair) {
          var side = duel[pair[0]];
          if (!side.gymnastId && !side.name) return;
          var key = pair[0] + ':' + (side.gymnastId || side.name);
          if (!map[key]) map[key] = { team: pair[0], gymnastId: side.gymnastId, number: side.number, name: side.name, points: 0, starts: 0, wins: 0 };
          var entry = map[key];
          if (side.name) entry.name = side.name;
          if (side.number) entry.number = side.number;
          if (r.complete) {
            entry.starts++;
            entry.points += pair[1];
            if (r.winner === pair[0]) entry.wins++;
          }
        });
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.points - a.points || b.wins - a.wins || (a.number || 0) - (b.number || 0); });
  }

  /** Tabelle aus abgeschlossenen Wettkämpfen. */
  function leagueTable(matches) {
    var rows = {};
    function row(id) {
      if (!rows[id]) rows[id] = { teamId: id, played: 0, won: 0, draw: 0, lost: 0, points: 0, pointsAgainst: 0, app: 0, appAgainst: 0, score: 0, scoreAgainst: 0 };
      return rows[id];
    }
    matches.forEach(function (m) {
      if (m.status !== 'final') return;
      var r = matchResult(m);
      if (!r.complete) return;
      var h = row(m.homeTeamId), g = row(m.guestTeamId);
      h.played++; g.played++;
      h.points += r.homeMatch; h.pointsAgainst += r.guestMatch;
      g.points += r.guestMatch; g.pointsAgainst += r.homeMatch;
      h.app += r.homeApp; h.appAgainst += r.guestApp;
      g.app += r.guestApp; g.appAgainst += r.homeApp;
      h.score += r.homePoints; h.scoreAgainst += r.guestPoints;
      g.score += r.guestPoints; g.scoreAgainst += r.homePoints;
      if (r.winner === 'home') { h.won++; g.lost++; }
      else if (r.winner === 'guest') { g.won++; h.lost++; }
      else { h.draw++; g.draw++; }
    });
    return Object.keys(rows).map(function (k) { return rows[k]; }).sort(function (a, b) {
      return (b.points - a.points) ||
        ((b.app - b.appAgainst) - (a.app - a.appAgainst)) ||
        ((b.score - b.scoreAgainst) - (a.score - a.scoreAgainst)) ||
        (b.score - a.score);
    });
  }

  var api = {
    APPARATUS: APPARATUS,
    DEFAULT_RULES: DEFAULT_RULES,
    clone: clone,
    leagueRules: leagueRules,
    parseScore: parseScore,
    formatScore: formatScore,
    emptySide: emptySide,
    emptyDuel: emptyDuel,
    STAND_BONUS: STAND_BONUS,
    NO_BONUS_APPARATUS: NO_BONUS_APPARATUS,
    eJudgeCount: eJudgeCount,
    eDeduction: eDeduction,
    eScore: eScore,
    startOrder: startOrder,
    SHOWN_FIELDS: SHOWN_FIELDS,
    sideFinal: sideFinal,
    revealedView: revealedView,
    snapshotSide: snapshotSide,
    hasPendingCorrection: hasPendingCorrection,
    pendingCorrections: pendingCorrections,
    pointsForDiff: pointsForDiff,
    duelResult: duelResult,
    apparatusResult: apparatusResult,
    matchResult: matchResult,
    scorers: scorers,
    leagueTable: leagueTable
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scoring = api;
})(this);
