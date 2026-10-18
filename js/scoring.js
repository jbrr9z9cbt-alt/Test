/*
 * Wertungslogik nach einem Scoresystem ähnlich der Deutschen Turnliga (DTL).
 *
 * Alle Noten werden intern als ganze Zahlen in Tausendsteln gespeichert
 * (8,433 Punkte => 8433), damit keine Rundungsfehler durch Gleitkommazahlen
 * entstehen.
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

  // Schwellen: ab dieser Differenz (in Tausendsteln) gibt es so viele Scorepunkte.
  var DEFAULT_RULES = {
    duelsPerApparatus: 4,
    thresholds: [
      { min: 50, points: 1 },
      { min: 350, points: 2 },
      { min: 650, points: 3 },
      { min: 1000, points: 4 },
      { min: 1500, points: 5 }
    ],
    apparatusPoints: { win: 2, draw: 1, loss: 0 },
    matchPoints: { win: 2, draw: 1, loss: 0 },
    // 'none': Gleichstand bei Scorepunkten ist Unentschieden,
    // 'apparatus': dann entscheiden die Gerätepunkte.
    tieBreak: 'none'
  };

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

  /** 8433 -> "8,433" */
  function formatScore(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '–';
    var sign = value < 0 ? '-' : '';
    var v = Math.abs(value);
    return sign + Math.floor(v / 1000) + ',' + String(v % 1000).padStart(3, '0');
  }

  function emptySide() {
    return { gymnastId: null, name: '', d: null, e: null, nd: 0, dns: false };
  }

  function emptyDuel() {
    return { home: emptySide(), guest: emptySide() };
  }

  /** Endnote = D + E − neutrale Abzüge; "nicht angetreten" zählt 0. null = noch offen. */
  function sideFinal(side) {
    if (!side) return null;
    if (side.dns) return 0;
    if (side.d === null || side.d === undefined || side.e === null || side.e === undefined) return null;
    return Math.max(0, side.d + side.e - (side.nd || 0));
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
    var h = sideFinal(duel.home);
    var g = sideFinal(duel.guest);
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
          if (!map[key]) map[key] = { team: pair[0], gymnastId: side.gymnastId, name: side.name, points: 0, starts: 0, wins: 0 };
          var entry = map[key];
          if (side.name) entry.name = side.name;
          if (r.complete) {
            entry.starts++;
            entry.points += pair[1];
            if (r.winner === pair[0]) entry.wins++;
          }
        });
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name); });
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
    parseScore: parseScore,
    formatScore: formatScore,
    emptySide: emptySide,
    emptyDuel: emptyDuel,
    sideFinal: sideFinal,
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
