/* WTB-Liga – Oberfläche und Ablaufsteuerung */
(function () {
  'use strict';

  var S = window.Scoring;
  var DB = window.DB;
  var SB = window.SecureBackup;
  var CFG = window.TEAM_CONFIG;
  var APP_VERSION = 2;
  var APP_BUILD = '83';
  // Angezeigte Version: in der Testphase „Beta <Nr.>“, ab der Freigabe „Version 1.0“ usw.
  var APP_LABEL = 'Beta ' + APP_BUILD;
  var FLASH_MS = 10000;
  var CORRECTION_MS = 10000;
  var FALL_PHASE_MS = 30000;       // Sturz-Timer: 30 s gelb, dann 30 s rot (Abzug 0,3)
  var WARMUP_MS = 8 * 50 * 1000;   // Einturnzeit je Gerät: 8 Turner × 50 Sekunden = 6:40
  var PAUSE_MINUTES = [10, 15, 20]; // Pause-Timer, groß in der Detailkarte der Tafel
  var FALL_TIMER_APPARATUS = ['PH', 'SR', 'PB', 'HB']; // nicht an Boden und Sprung
  // Ligen aus js/config.js; die aktuelle Liga ergibt sich aus der Adresse (#/oberliga/…, #/landesliga/…).
  var LEAGUES = CFG.leagues;
  var currentLeague = LEAGUES[0].key;
  var APP_NAME = 'WTB-Liga';
  // Logo des Westfälischen Turnerbunds oben links im Wettkampfprotokoll.
  var PRINT_LOGO = '<img class="ps-logo" src="icons/wtb-logo.png" alt="WTB – Westfälischer Turnerbund">';

  // Feste Mannschaftsfarben; "onDark" ist der hellere Ton für die dunkle Anzeigetafel.
  var COLORS = [
    { key: 'rot', name: 'Rot', hex: '#d32f2f', onDark: '#ff5a5a', onLight: '#c62828', fg: '#fff' },
    { key: 'blau', name: 'Blau', hex: '#1e63c6', onDark: '#5b9bff', onLight: '#1e63c6', fg: '#fff' },
    { key: 'orange', name: 'Orange', hex: '#f07c00', onDark: '#ff9a2e', onLight: '#c25e00', fg: '#171717' },
    // Hellgrau auf der dunklen Tafel als mittleres Grau, damit es sich von der weißen 0 (Unentschieden) abhebt.
    { key: 'hellgrau', name: 'Hellgrau', hex: '#c8c8c8', onDark: '#b0b0b0', onLight: '#8a8a8a', fg: '#171717' },
    { key: 'violett', name: 'Violett', hex: '#7b3fa0', onDark: '#b884e3', onLight: '#7b3fa0', fg: '#fff' },
    { key: 'gelb', name: 'Gelb', hex: '#f5c400', onDark: '#ffd60a', onLight: '#a88200', fg: '#171717' },
    { key: 'gruen', name: 'Grün', hex: '#2e7d32', onDark: '#4ade80', onLight: '#2e7d32', fg: '#fff' }
  ];
  var DEFAULT_COLORS = { home: 'rot', guest: 'blau' };

  var state = {
    teams: [],
    matches: [],
    settings: { key: 'settings', rules: S.clone(S.DEFAULT_RULES) },
    legacyTeamNames: {},
    persistent: false,
    ui: { tab: {} },
    board: { matchId: null, lastReveal: '' }
  };

  var $app = document.getElementById('app');
  var channel = 'BroadcastChannel' in window ? new BroadcastChannel('turnwettkampf-sync') : null;

  // ---------- Hilfsfunktionen ----------

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Anzeigeformate: D-Note, neutraler Abzug und E-Abzüge mit einer, E-Note und Endnote mit zwei Nachkommastellen.
  function fmt(v) { return S.formatScore(v, 2); }
  function fmt1(v) { return S.formatScore(v, 1); }

  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
  }

  function fmtDateTime(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function team(id) {
    return state.teams.filter(function (t) { return t.id === id; })[0];
  }

  function teamName(id) {
    var t = team(id);
    return t ? t.name : (state.legacyTeamNames[id] || 'Unbekannte Mannschaft');
  }

  // Vereinsname als HTML: nach „/“ darf umbrochen werden (z. B. „SG Langenei-Kickenbach/Gleidorf“).
  function teamHtml(id) {
    return esc(teamName(id)).replace(/\//g, '/<wbr>');
  }

  function leagueOf(key) {
    return LEAGUES.filter(function (l) { return l.key === key; })[0] || LEAGUES[0];
  }

  /** Liga eines Wettkampfs (ältere Wettkämpfe ohne Angabe gehören zur Oberliga). */
  function matchLeague(m) {
    return leagueOf(m && m.league);
  }

  function leagueTeams(key) {
    return state.teams.filter(function (t) { return t.league === key; });
  }

  function leagueMatches(key) {
    return state.matches.filter(function (m) { return matchLeague(m).key === key; });
  }

  /** Feste Regeln eines Wettkampfs nach dem Wertungsmodell seiner Liga. */
  function rulesFor(leagueKey, eJudges) {
    return leagueOf(leagueKey).model === 'classic' ? S.classicRules(eJudges) : S.leagueRules(eJudges);
  }

  function isClassic(m) {
    return S.isClassic(m.rules);
  }

  function colorOf(key) {
    return COLORS.filter(function (c) { return c.key === key; })[0] || COLORS[0];
  }

  /** Farbe einer Seite im Wettkampf (wird beim Anlegen gewählt). */
  function sideColor(m, sideKey) {
    var key = (m.colors && m.colors[sideKey]) || DEFAULT_COLORS[sideKey];
    return colorOf(key);
  }

  /** Anzeigetafel hell (Standard, gut für Beamer) oder dunkel (Fernseher, abgedunkelte Räume). */
  function boardLight(m) {
    return !(m && m.display && m.display.theme === 'dark');
  }

  /** Mannschaftsfarbe im passenden Ton für die Anzeigetafel. */
  function boardTone(m, sideKey) {
    var c = sideColor(m, sideKey);
    return boardLight(m) ? c.onLight : c.onDark;
  }

  /** Scorepunkte immer in der Farbe der jeweiligen Mannschaft (board = auf der Anzeigetafel). */
  function pts(m, sideKey, n, board) {
    var c = sideColor(m, sideKey);
    return '<span class="sp-num" style="color:' + (board ? boardTone(m, sideKey) : c.onLight) + '">' + n + '</span>';
  }

  function ptsPair(m, h, g, dark, sep) {
    return pts(m, 'home', h, dark) + '<span class="sp-sep">' + (sep || ':') + '</span>' + pts(m, 'guest', g, dark);
  }

  /** Wert einer Mannschaft in einem Ergebnis: Scorepunkte (Oberliga) bzw. Punktsumme (Landesliga). */
  function teamValue(m, res, sideKey, board) {
    if (isClassic(m)) return pts(m, sideKey, fmt(res[sideKey + 'Sum']), board);
    return pts(m, sideKey, res[sideKey + 'Points'], board);
  }

  /** Stand beider Mannschaften (Wettkampf oder Gerät) im Format der jeweiligen Liga. */
  function totalPair(m, res, board, sep) {
    return teamValue(m, res, 'home', board) + '<span class="sp-sep">' + (sep || ':') + '</span>' + teamValue(m, res, 'guest', board);
  }

  /** „Duelle“ bzw. „Übungen“ – je nach Wertungsmodell. */
  function unitWord(m) {
    return isClassic(m) ? 'Übungen' : 'Duelle';
  }

  function colorChip(c, text) {
    return '<span class="chip" style="background:' + c.hex + ';color:' + c.fg + '">' + esc(text) + '</span>';
  }

  function gymnastLabel(number, name) {
    if (!number) return name || '';
    return number + (name ? ' ' + name : '');
  }

  function match(id) {
    return state.matches.filter(function (m) { return m.id === id; })[0];
  }

  function toast(msg, kind) {
    var el = document.getElementById('toast');
    var item = document.createElement('div');
    item.className = 'toast-item ' + (kind || '');
    item.textContent = msg;
    el.appendChild(item);
    setTimeout(function () { item.remove(); }, kind === 'error' ? 6000 : 3000);
  }

  /**
   * Abfrage mit frei wählbaren Antworten. buttons: [{ value, label, primary }].
   * Escape liefert die Antwort des letzten Knopfs.
   */
  function askChoice(title, text, hint, buttons) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<h3 id="modal-title">' + esc(title) + '</h3>' + (text ? '<p>' + esc(text) + '</p>' : '') + (hint ? '<p class="muted small">' + esc(hint) + '</p>' : '') +
        '<div class="actions wrap">' + buttons.map(function (b, n) {
          return '<button type="button" class="' + (b.link ? 'linkish' : 'btn' + (b.primary ? ' primary' : '')) + '" data-answer="' + n + '">' + esc(b.label) + '</button>';
        }).join('') + '</div></div>';
      document.body.appendChild(wrap);
      function close(n) {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        resolve(buttons[n].value);
      }
      // Escape = Knopf mit cancel (sonst der letzte); Fokus auf dem Knopf mit focus (sonst dem ersten).
      var esc0 = buttons.findIndex(function (b) { return b.cancel; });
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(esc0 >= 0 ? esc0 : buttons.length - 1); } }
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-answer]');
        if (b) close(parseInt(b.getAttribute('data-answer'), 10));
      });
      document.addEventListener('keydown', onKey, true);
      var f = buttons.findIndex(function (b) { return b.focus; });
      wrap.querySelector('[data-answer="' + (f >= 0 ? f : 0) + '"]').focus();
    });
  }

  /** Abfrage eines Werts (Text) mit „Speichern“ und „Abbrechen“; liefert den Text oder null. */
  function askValue(title, text, value, hint) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h3 id="modal-title">' + esc(title) + '</h3>' +
        '<form class="stack"><label>' + esc(text) + '<input type="text" inputmode="decimal" autocomplete="off" value="' + esc(value) + '"></label>' +
        (hint ? '<p class="muted small">' + esc(hint) + '</p>' : '') +
        '<div class="actions wrap"><button type="button" class="btn" data-answer="cancel">Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form></div>';
      document.body.appendChild(wrap);
      var inp = wrap.querySelector('input');
      function close(v) { document.removeEventListener('keydown', onKey, true); wrap.remove(); resolve(v); }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(null); } }
      wrap.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); close(inp.value); });
      wrap.querySelector('[data-answer="cancel"]').addEventListener('click', function () { close(null); });
      document.addEventListener('keydown', onKey, true);
      inp.focus(); inp.select();
    });
  }

  /** Abfrage mit den Antworten „Ja“ und „Nein“ (Escape = Nein). */
  function askYesNo(title, text, hint) {
    return askChoice(title, text, hint, [{ value: true, label: 'Ja', primary: true }, { value: false, label: 'Nein' }]);
  }

  /** Rückfrage „Ja“/„Nein“ als eigenes Fenster statt confirm(): Browser-Dialoge beenden das Vollbild der Anzeigetafel. */
  function askConfirm(text) {
    return askYesNo('Bitte bestätigen', text);
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function stamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes());
  }

  // ---------- Speichern ----------

  var snapshotTimer = null;
  var dirty = false;

  function exportData() {
    return {
      format: 'turnwettkampf-backup',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      teams: S.clone(state.teams),
      matches: S.clone(state.matches),
      meta: [S.clone(state.settings)]
    };
  }

  var MATCH_FORMAT = 'turnwettkampf-match';

  function slug(t) { return String(t).toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, ''); }

  /** Dateinamen beginnen mit der Liga, z. B. „wtb-oberliga_GESAMTSICHERUNG_…“. */
  function filePrefix(leagueKey) {
    return 'wtb-' + leagueKey + '_';
  }

  /** Anteil einer Liga an einem Datenbestand (Mannschaften laut Konfiguration, Wettkämpfe laut Angabe). */
  function sliceLeague(data, key) {
    var ids = leagueOf(key).teams.map(function (t) { return t.id; });
    return {
      teams: (data.teams || []).filter(function (t) { return ids.indexOf(t.id) >= 0; }),
      matches: (data.matches || []).filter(function (m) { return (m.league || LEAGUES[0].key) === key; })
    };
  }

  /** Daten einer Liga als Sicherungsdatei. */
  function leagueData(key) {
    var part = sliceLeague(exportData(), key);
    return {
      format: 'turnwettkampf-backup',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      league: key,
      teams: part.teams,
      matches: part.matches,
      meta: [S.clone(state.settings)]
    };
  }

  /** Gesamtsicherung der aktuellen Liga: Mannschaften, Turnernamen und Wettkämpfe. */
  function exportBackup() {
    download(filePrefix(currentLeague) + 'GESAMTSICHERUNG_' + stamp() + '.json', JSON.stringify(leagueData(currentLeague), null, 2));
    toast('Gesamtsicherung erstellt');
  }

  /** Einzelsicherung: nur ein Wettkampf (mit den Mannschaftsnamen zur Kontrolle). */
  function exportMatch(m) {
    var data = {
      format: MATCH_FORMAT,
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      league: matchLeague(m).key,
      teams: { home: teamName(m.homeTeamId), guest: teamName(m.guestTeamId) },
      match: S.clone(m)
    };
    download(filePrefix(matchLeague(m).key) + 'EINZELWETTKAMPF_' + (m.date || 'ohne-datum') + '_' + slug(teamName(m.homeTeamId)) + '_' + slug(teamName(m.guestTeamId)) + '.json',
      JSON.stringify(data, null, 2));
    toast('Wettkampf gesichert');
  }

  function scheduleSnapshot() {
    dirty = true;
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(takeSnapshot, 5000);
  }

  function takeSnapshot(reason) {
    clearTimeout(snapshotTimer);
    if (!dirty && !reason) return Promise.resolve();
    dirty = false;
    var data = exportData();
    var counts = {};
    LEAGUES.forEach(function (l) {
      var part = sliceLeague(data, l.key);
      counts[l.key] = { teams: part.teams.length, matches: part.matches.length };
    });
    return DB.addSnapshot(data, reason, counts).catch(function (e) {
      toast('Sicherungspunkt konnte nicht angelegt werden: ' + e.message, 'error');
    });
  }

  function save(store, obj) {
    if (store === 'matches' || store === 'teams') obj.updatedAt = new Date().toISOString();
    return DB.put(store, S.clone(obj)).then(function () {
      scheduleSnapshot();
      if (channel) channel.postMessage({ type: 'changed' });
      setSaveIndicator('gespeichert');
    }).catch(function (e) {
      setSaveIndicator('FEHLER');
      toast('Speichern fehlgeschlagen: ' + e.message, 'error');
      throw e;
    });
  }

  function remove(store, id) {
    return DB.del(store, id).then(function () {
      scheduleSnapshot();
      if (channel) channel.postMessage({ type: 'changed' });
    });
  }

  function setSaveIndicator(text) {
    var el = document.getElementById('save-status');
    if (!el) return;
    el.textContent = text === 'FEHLER' ? '⚠ nicht gespeichert' : '✓ ' + text;
    el.className = text === 'FEHLER' ? 'save-status error' : 'save-status';
  }

  /**
   * Mannschaften aller Ligen kommen fest aus js/config.js. Gespeichert werden nur
   * die Nutzerangaben dazu (Turnernamen der Startnummern 1–20).
   */
  function buildTeams(stored) {
    var byId = {};
    state.legacyTeamNames = {};
    stored.forEach(function (t) { byId[t.id] = t; });
    var known = {};
    var teams = [];
    LEAGUES.forEach(function (lg) {
      lg.teams.forEach(function (c) {
        known[c.id] = true;
        var s = byId[c.id] || {};
        // Gespeicherte Änderungen gelten nur, solange die vorgegebene Turnerliste gleich geblieben ist.
        var useStored = s.rosterVersion === lg.rosterVersion;
        var preset = c.gymnasts || {};
        var gymnasts = [];
        for (var n = 1; n <= CFG.gymnastsPerTeam; n++) {
          var old = useStored ? (s.gymnasts || []).filter(function (g) { return g.number === n; })[0] : null;
          gymnasts.push({ id: c.id + '-' + n, number: n, name: old ? old.name : (preset[n] || '') });
        }
        teams.push({ id: c.id, name: c.name, league: lg.key, rosterVersion: lg.rosterVersion, gymnasts: gymnasts });
      });
    });
    stored.forEach(function (t) { if (!known[t.id] && t.name) state.legacyTeamNames[t.id] = t.name; });
    return teams;
  }

  /** Ältere Daten (eine E-Note statt zwei E-Abzügen) auf das neue Format bringen. */
  function migrateMatch(m) {
    var changed = false;
    S.APPARATUS.forEach(function (a) {
      var app = m.apparatus[a.key];
      if (!app) return;
      app.duels.forEach(function (d) {
        if (m.league === 'landesliga' && !d.revs) { d.revs = { home: { revealedAt: null }, guest: { revealedAt: null } }; changed = true; }
        if (d.revealedAt === undefined) { d.revealedAt = null; changed = true; }
        if (d.revealedAt && !d.firstRevealedAt) { d.firstRevealedAt = d.revealedAt; changed = true; }
        if (d.revealedAt && !d.shown) {
          d.shown = { home: S.snapshotSide(d.home), guest: S.snapshotSide(d.guest) };
          changed = true;
        }
        ['home', 'guest'].forEach(function (k) {
          var side = d[k];
          if (side.e !== undefined) {
            if (side.e !== null && (side.e1 === undefined || side.e1 === null)) side.e1 = side.e2 = 10000 - side.e;
            delete side.e;
            changed = true;
          }
          if (side.e1 === undefined) { side.e1 = null; side.e2 = null; changed = true; }
          if (side.e3 === undefined) { side.e3 = null; changed = true; }
          if (side.bonus === undefined) { side.bonus = false; changed = true; }
          if (side.zero === undefined) { side.zero = false; changed = true; }
        });
      });
    });
    if (!m.colors) { m.colors = { home: DEFAULT_COLORS.home, guest: DEFAULT_COLORS.guest }; changed = true; }
    if (!m.startTeam) { m.startTeam = 'home'; changed = true; }
    if (!m.judges) { m.judges = {}; changed = true; }
    if (!m.captains) { m.captains = {}; changed = true; }
    if (!m.league) { m.league = LEAGUES[0].key; changed = true; }
    var fixed = rulesFor(m.league, m.rules && m.rules.eJudges);
    if (JSON.stringify(m.rules) !== JSON.stringify(fixed)) { m.rules = fixed; changed = true; }
    return changed;
  }

  function loadAll() {
    return Promise.all([DB.getAll('teams'), DB.getAll('matches'), DB.get('meta', 'settings')]).then(function (r) {
      state.teams = buildTeams(r[0]);
      state.matches = r[1].sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''); });
      state.matches.forEach(function (m) { if (migrateMatch(m)) DB.put('matches', S.clone(m)); });
      if (r[2]) state.settings = r[2];
    });
  }

  // ---------- Router ----------

  // Seiten innerhalb einer Liga; ältere Adressen ohne Liga (#/teams …) gehören zur Oberliga.
  var LEAGUE_PAGES = ['teams', 'new', 'rules', 'data', 'help'];

  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    var first = parts[0] || 'start';
    if (LEAGUES.some(function (l) { return l.key === first; })) return { league: first, name: parts[1] || 'home' };
    if (LEAGUE_PAGES.indexOf(first) >= 0) return { league: LEAGUES[0].key, name: first };
    if (first === 'match' || first === 'edit') {
      var m = match(parts[1]);
      return { league: m ? matchLeague(m).key : LEAGUES[0].key, name: first, id: parts[1], sub: parts[2] };
    }
    if (first === 'info') return { league: null, name: 'info' };
    return { league: null, name: 'start' };
  }

  /** Adresse einer Seite der aktuellen Liga. */
  function leagueHref(page, key) {
    return '#/' + (key || currentLeague) + (page && page !== 'home' ? '/' + page : '');
  }

  /** Bereiche, die noch nicht freigeschaltet sind, zeigen einen Platzhalter. */
  function leagueReady(key) {
    return ['score', 'classic'].indexOf(leagueOf(key).model) >= 0;
  }

  var keepScroll = false;

  // „← zurück“ auf den Seiten, die man vom Wettkampf aus öffnet: der Wettkampf, von dem man kommt (je Fenster).
  var BACK_KEY = 'wtb-zurueck';
  var backMatch = (function () { try { return JSON.parse(sessionStorage.getItem(BACK_KEY) || 'null'); } catch (e) { return null; } })();

  function setBackMatch(v) {
    backMatch = v;
    try { if (v) sessionStorage.setItem(BACK_KEY, JSON.stringify(v)); else sessionStorage.removeItem(BACK_KEY); } catch (e) { /* nur im Speicher */ }
  }

  /**
   * Knopf „← zurück“ (wie im Protokoll): im Wettkampf Setup immer zum Wettkampf; auf Wettkämpfe, Mannschaften, Regeln
   * und Anleitung nur, wenn man von einem Wettkampf dieser Liga kommt. Vergessen wird er auf der Startseite, beim Öffnen
   * eines anderen Wettkampfs und in einer anderen Liga.
   */
  function backRowHtml(r) {
    var id = null;
    if (r.name === 'edit' && match(r.id)) id = r.id;
    else if (['home', 'data', 'teams', 'rules', 'help'].indexOf(r.name) >= 0 && backMatch && backMatch.league === r.league && match(backMatch.id)) id = backMatch.id;
    return id ? '<div class="back-row' + (r.name === 'edit' ? ' narrow' : '') + '"><a class="btn ghost" href="#/match/' + id + '">← zurück</a></div>' : '';
  }

  function render() {
    var r = route();
    document.body.classList.toggle('board-mode', r.name === 'match' && r.sub === 'board');
    document.body.classList.toggle('match-page', r.name === 'match' && !r.sub);
    document.body.classList.toggle('board-light', r.name === 'match' && r.sub === 'board' && boardLight(match(r.id)));
    if (r.league) currentLeague = r.league;
    if (r.name === 'match' && !r.sub && match(r.id)) setBackMatch({ league: matchLeague(match(r.id)).key, id: r.id });
    else if (r.name === 'start' || r.name === 'info' || (r.league && backMatch && backMatch.league !== r.league)) setBackMatch(null);
    var ready = !!r.league && leagueReady(r.league);
    document.querySelectorAll('.topbar nav a').forEach(function (a) {
      var page = a.getAttribute('data-route');
      a.setAttribute('href', leagueHref(page));
      a.classList.toggle('active', page === r.name);
    });
    // Auf der Startseite (und in noch nicht freigeschalteten Ligen) gibt es kein Ligamenü.
    document.body.classList.toggle('no-league', !ready);
    var ln = document.getElementById('league-name');
    if (ln) {
      var lgo = r.league ? leagueOf(r.league) : null;
      ln.innerHTML = lgo ? '<span class="ml">' + esc(lgo.name) + '</span><span class="ms">' + esc(lgo.short) + '</span>' + (ready ? '<span class="car" aria-hidden="true">▾</span>' : '') : esc(APP_NAME);
      ln.disabled = !ready;
    }
    // Reiter bzw. Menüs „Anzeigetafel“ und „Wettkampf“ nur auf der Wettkampfseite
    var onMatch = r.name === 'match' && !r.sub && !!match(r.id);
    // Beim Öffnen eines Wettkampfs (aus der Liste, beim Start, mit „← zurück“) ist der Reiter „Anzeigetafel“ gewählt.
    if (onMatch && ribbonMatchId !== r.id) ribbonChoice = 'board';
    ribbonMatchId = onMatch ? r.id : null;
    var tabsEl = document.getElementById('topbar-tabs');
    if (tabsEl) tabsEl.innerHTML = onMatch ? '<button type="button" class="tb-menu tb-tab" id="tb-board" data-menu="board" aria-haspopup="true" aria-expanded="false"></button>' +
      '<button type="button" class="tb-menu tb-tab" data-menu="match" aria-haspopup="true" aria-expanded="false">Wettkampf<span class="car" aria-hidden="true">▾</span></button>' : '';
    if (!onMatch) closeMenus();
    applyRibbonTab();
    var html;
    switch (r.league && !ready ? 'pending' : r.name) {
      case 'pending': html = viewLeaguePending(); break;
      case 'home': html = viewHome(); break;
      case 'teams': html = viewTeams(); break;
      case 'new': html = viewMatchForm(null); break;
      case 'edit': html = viewMatchForm(match(r.id)); break;
      case 'match':
        var m = match(r.id);
        if (!m) { html = notFound(); break; }
        html = r.sub === 'board' ? viewBoard(m) : r.sub === 'print' ? viewPrint(m) : viewMatch(m);
        break;
      case 'data': html = viewHome(); break;
      case 'rules': html = viewRules(); break;
      case 'help': html = viewHelp(); break;
      case 'info': html = viewInfo(); break;
      default: html = viewStart();
    }
    $app.innerHTML = (state.persistent ? '' : warningBanner()) + (ready ? backRowHtml(r) : '') + html;
    if ((r.name === 'home' || r.name === 'data') && ready) refreshDataView();
    var mf = $app.querySelector('form[data-form="match"]');
    if (mf) { syncJudgeFields(mf); syncLineup(mf); setupGuard.initial = formState(mf); setupGuard.leaveOk = false; }
    else setupGuard.initial = null;
    setupGuard.lastHash = location.hash;
    document.documentElement.classList.toggle('setup-page', !!mf);
    if (r.name === 'match' && r.sub === 'print') fitPrintToA4();

    var isBoard = r.name === 'match' && r.sub === 'board' && match(r.id);
    if (isBoard) { checkBoardFlash(match(r.id)); fitBoard(); }
    else state.board = { matchId: null, lastReveal: '' };
    if (onMatch) refreshTopMenus(match(r.id));
    syncTopbarHeight();
    if (!keepScroll) window.scrollTo(0, 0);
    tickTimers();
    if (isBoard) { fitBoard(); fitIntro(); fitScorers(); }
    if (r.name === 'match' && !r.sub && match(r.id)) {
      showAppIntro(match(r.id));
      showAppScorers(match(r.id));
      // Ein offenes Wertungsfenster bleibt mit seinen Eingaben erhalten (z. B. nach einer Änderung aus der Tafel).
      if (scoreDlg && scoreDlg.matchId === r.id) showScoreDlg(false); else closeScoreDlg();
    } else {
      document.body.classList.remove('intro-open');
      document.body.classList.remove('scorers-open');
      closeScoreDlg();
    }
    keepScroll = false;
  }

  function warningBanner() {
    return '<div class="banner danger">⚠ Der Browser erlaubt hier keine dauerhafte Speicherung (z. B. privater Modus). ' +
      'Daten gehen beim Schließen verloren – bitte regelmäßig unter „Wettkämpfe“ eine Gesamtsicherung erstellen.</div>';
  }

  // ---------- Startseite ----------

  function viewStart() {
    return '<section class="start">' +
      '<img src="icons/icon.svg" alt="" width="96" height="96" class="start-logo">' +
      '<h1>' + esc(APP_NAME) + '</h1>' +
      '<div class="start-grid">' +
      '<a class="start-tile" href="#/oberliga"><span class="st-title">Oberliga</span><span class="st-sub">Wettkämpfe, Mannschaften, Anzeigetafel</span></a>' +
      '<a class="start-tile" href="#/landesliga"><span class="st-title">Landesliga</span><span class="st-sub">Wettkämpfe, Mannschaften, Anzeigetafel</span></a>' +
      '<a class="start-tile wide" href="#/info"><span class="st-title">Installation und Datensicherung</span><span class="st-sub">App installieren, Daten sichern, Updates</span></a>' +
      '</div></section>';
  }

  function viewLeaguePending() {
    return '<section class="card narrow"><h2>' + esc(leagueOf(currentLeague).short) + '</h2><p class="muted">Dieser Bereich wird später ergänzt.</p>' +
      '<a class="btn" href="#/">← Zur Startseite</a></section>';
  }

  function notFound() {
    return '<section class="card"><h2>Nicht gefunden</h2><p>Dieser Wettkampf existiert nicht (mehr).</p><a class="btn" href="' + leagueHref('home') + '">Zur Übersicht</a></section>';
  }

  // ---------- Ansicht: Übersicht ----------

  /**
   * Übersicht der Liga: Wettkämpfe (je Zeile „Sichern“ und „Löschen“), darunter die Gesamtsicherung mit Import
   * und der Datenspeicher mit den automatischen Sicherungspunkten und „Alle Daten löschen“.
   */
  function viewHome() {
    var lg = leagueOf(currentLeague);
    var matches = leagueMatches(currentLeague);
    var list = matches.length ? matches.map(function (m) {
      var r = S.matchResult(m);
      return '<div class="match-row"><a class="match-link" href="#/match/' + m.id + '">' +
        '<div><div class="match-title">' + esc(fmtDate(m.date) || 'ohne Datum') + '</div>' +
        '<div class="muted">' + esc(matchLeague(m).name) + '</div></div>' +
        '<div class="match-teams">' + teamTag(m, 'home') + ' <span class="muted">vs.</span> ' + teamTag(m, 'guest') + '</div>' +
        '<div class="match-score">' + totalPair(m, r) + '</div>' +
        '<div>' + statusBadge(m, r) + '</div></a>' +
        '<div class="match-acts"><button class="btn small" data-action="export-match" data-id="' + m.id + '" title="Diesen Wettkampf als Datei sichern">Sichern</button>' +
        '<button class="btn small danger ghost" data-action="del-match" data-id="' + m.id + '">Löschen</button></div></div>';
    }).join('') : '<p class="muted">Noch keine Wettkämpfe angelegt.</p>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Wettkämpfe</h2>' +
      '<a class="btn primary" href="' + leagueHref('new') + '">+ Neuer Wettkampf</a>' +
      '</div>' + list + '</section>' +
      '<section class="card"><h2>Gesamtsicherung der ' + esc(lg.short) + '</h2>' +
      '<p class="muted small">Alle Mannschaften, Turnernamen und Wettkämpfe der ' + esc(lg.short) + ' in einer Datei; der Dateiname beginnt mit <b>' + filePrefix(currentLeague) + 'GESAMTSICHERUNG_</b>. ' +
      'Die Daten liegen nur auf diesem Gerät – zum Schutz gegen Geräteverlust regelmäßig sichern, z. B. auf einen USB-Stick. ' +
      'Einzelne Wettkämpfe sichert „Sichern“ in der Zeile des Wettkampfs.</p>' +
      '<div class="actions wrap"><button class="btn primary" data-action="export">Alles sichern</button>' +
      '<label class="btn file-btn">Sicherung einlesen …<input type="file" accept=".json,application/json" data-import hidden></label></div>' +
      '<p class="muted small">Eine Gesamtsicherung ersetzt alle Daten der ' + esc(lg.short) + ' (die andere Liga bleibt unverändert). Ein einzelner Wettkampf wird hinzugefügt bzw. ersetzt nur denselben Wettkampf. ' +
      'Vor jedem Einlesen wird automatisch ein Sicherungspunkt angelegt.</p></section>' +
      '<section class="card"><h2>Datenspeicher</h2><div id="storage-box" class="muted">wird geprüft …</div>' +
      '<details class="snap-details"><summary>Automatische Sicherungspunkte <span id="snap-count"></span></summary>' +
      '<div id="snapshots" class="muted">wird geladen …</div></details>' +
      '<div class="wipe-row"><button class="btn small danger ghost" data-action="wipe">Alle Daten löschen …</button>' +
      '<span class="muted small">Löscht alle Wettkämpfe und eigene Änderungen an den Turnernamen der ' + esc(lg.short) + ' auf diesem Gerät; Mannschaften und vorgegebene Turner bleiben. Vorher wird ein Sicherungspunkt angelegt.</span></div></section>';
  }

  function teamTag(m, sideKey) {
    var id = sideKey === 'home' ? m.homeTeamId : m.guestTeamId;
    return '<span class="team-tag"><span class="dot" style="background:' + sideColor(m, sideKey).hex + '"></span>' + teamHtml(id) + '</span>';
  }

  function statusBadge(m, r) {
    if (m.status === 'final') return '<span class="badge final">abgeschlossen</span>';
    if (r.complete) return '<span class="badge done">alle ' + unitWord(m) + ' gewertet</span>';
    var started = S.APPARATUS.some(function (a) { return r.apparatus[a.key].started; });
    return started ? '<span class="badge live">läuft</span>' : '<span class="badge">geplant</span>';
  }

  function refreshStorageBox() {
    DB.storageInfo().then(function (info) {
      var el = document.getElementById('storage-box');
      if (!el) return;
      el.innerHTML = storageInfoHtml(info);
    });
  }

  function storageInfoHtml(info) {
    var mb = function (b) { return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB'; };
    return '<ul class="plain">' +
      '<li>Speicherort: <strong>' + esc(info.backend) + '</strong> (nur auf diesem Gerät, kein Server)</li>' +
      '<li>Dauerhafter Speicher: ' + (info.persisted === true ? '<strong class="ok">aktiv</strong> – der Browser löscht die Daten nicht automatisch'
        : info.persisted === false ? '<strong class="warn">nicht bestätigt</strong> – <button class="btn small" data-action="persist">jetzt anfordern</button>'
        : 'unbekannt') + '</li>' +
      (info.usage !== null ? '<li>Belegt: ' + mb(info.usage) + ' von ' + mb(info.quota) + '</li>' : '') +
      '<li>Offline-Betrieb: ' + offlineStatus() + '</li>' +
      '<li>App-Version: ' + APP_LABEL + ' (sucht beim Start und alle 30 Minuten nach Updates)</li>' +
      '</ul>';
  }

  function offlineStatus() {
    if (!('serviceWorker' in navigator)) return 'nicht verfügbar in diesem Browser';
    if (location.protocol === 'file:') return 'direkt aus Datei geöffnet – funktioniert ohne Internet';
    return navigator.serviceWorker.controller ? '<strong class="ok">bereit</strong> (App ist zwischengespeichert)' : 'wird eingerichtet … (Seite einmal neu laden)';
  }

  // ---------- Ansicht: Mannschaften ----------

  function viewTeams() {
    var teams = leagueTeams(currentLeague);
    var cards = teams.map(function (t) {
      var rows = t.gymnasts.map(function (g) {
        return '<li class="gym-row"><span class="startno">' + g.number + '</span>' +
          '<input type="text" value="' + esc(g.name) + '" placeholder="Name Startnummer ' + g.number + '" data-team="' + t.id + '" data-gym="' + g.number + '" data-tfield="gname" aria-label="Name Startnummer ' + g.number + '"></li>';
      }).join('');
      var filled = t.gymnasts.filter(function (g) { return g.name; }).length;
      return '<section class="card team-card">' +
        '<div class="card-head"><h3 class="team-title">' + esc(t.name) + '</h3></div>' +
        '<p class="muted small">' + filled + ' von ' + t.gymnasts.length + ' Turnern benannt</p>' +
        '<ul class="plain gym-list">' + rows + '</ul></section>';
    }).join('');

    return '<section class="card"><h2>Mannschaften</h2>' +
      '<p class="muted">Die ' + teams.length + ' Mannschaften sind fest vorgegeben. Hier lassen sich die Namen der Turner mit den Startnummern 1–' +
      CFG.gymnastsPerTeam + ' anpassen. Jede Änderung wird sofort gespeichert. Die Mannschaftsfarben werden beim Anlegen eines Wettkampfs gewählt.</p></section>' +
      '<div class="team-grid">' + cards + '</div>';
  }

  // ---------- Ansicht: Wettkampf anlegen / bearbeiten ----------

  function teamOptions(selected, leagueKey) {
    return '<option value="">– auswählen –</option>' + leagueTeams(leagueKey).map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === selected ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    }).join('');
  }

  function viewMatchForm(m) {
    var isNew = !m;
    var leagueKey = m ? matchLeague(m).key : currentLeague;
    var rules = m ? m.rules : S.DEFAULT_RULES;
    var hasScores = m && S.APPARATUS.some(function (a) { return S.matchResult(m).apparatus[a.key].started; });
    var j = (m && m.judges) || {};
    var cap = (m && m.captains) || {};
    var neutral = S.eJudgeCount(rules) === 2;
    var start = (m && m.startTeam) || 'home';
    // optional: kein Pflichtfeld (ohne Sternchen)
    function input(name, label, value, optional) {
      return '<label><span>' + label + (optional ? '' : ' <span class="req" aria-hidden="true">*</span>') + '</span><input type="text" name="' + name + '" value="' + esc(value || '') + '" autocomplete="off"' + (optional ? '' : ' required') + '></label>';
    }
    function teamCol(side, label) {
      var teamId = m ? (side === 'home' ? m.homeTeamId : m.guestTeamId) : null;
      return '<fieldset class="team-col boxed"><legend>' + label + '</legend><select name="' + side + '" aria-label="' + label + '" required' + (hasScores ? ' disabled' : '') + '>' + teamOptions(teamId, leagueKey) + '</select>' +
        colorPicker(side + 'Color', 'Farbe', m ? sideColor(m, side).key : DEFAULT_COLORS[side]) +
        input(side === 'home' ? 'captainHome' : 'captainGuest', 'Mannschaftsführer', cap[side]) +
        '<div class="lineup" data-lineup="' + side + '">' + lineupHtml(side, teamId, m && m.lineup && m.lineup[side]) + '</div></fieldset>';
    }
    return '<section class="card narrow"><h2>' + (isNew ? 'Neuer Wettkampf' : 'Wettkampf Setup') + '</h2>' +
      '<form data-form="match" data-id="' + (m ? m.id : '') + '" data-league="' + leagueKey + '" class="stack match-form' + (neutral ? '' : ' split-e') + '">' +
      // Alle Bereiche einheitlich mit Rahmen und Überschrift im Rahmen (wie „Kampfgericht“).
      '<div class="row2"><fieldset class="boxed"><legend>Datum</legend><input type="date" name="date" aria-label="Datum" value="' + esc(m ? m.date : new Date().toISOString().slice(0, 10)) + '" required></fieldset>' +
      '<fieldset class="boxed"><legend>Beginnende Mannschaft</legend>' +
      '<span class="bs-theme" role="group" aria-label="Beginnende Mannschaft">' +
      '<button type="button" class="toggle' + (start === 'home' ? ' on' : '') + '" data-action="start-team" data-value="home">Heim</button>' +
      '<button type="button" class="toggle' + (start === 'guest' ? ' on' : '') + '" data-action="start-team" data-value="guest">Gast</button></span>' +
      '<input type="radio" name="startTeam" value="home" hidden' + (start === 'home' ? ' checked' : '') + '><input type="radio" name="startTeam" value="guest" hidden' + (start === 'guest' ? ' checked' : '') + '></fieldset></div>' +
      '<div class="row2 teams-row">' + teamCol('home', 'Heimmannschaft') + teamCol('guest', 'Gastmannschaft') + '</div>' +
      '<fieldset class="judges"><legend>Kampfgericht</legend>' +
      '<div class="row2">' + input('judgeD1', 'D1 – Vereinskampfrichter Heim', j.d1, true) + input('judgeD2', 'D2 – Vereinskampfrichter Gast', j.d2, true) + '</div>' +
      input('judgeE1', 'E1 – Oberkampfrichter', j.e1) +
      // Umschalter Ja/Nein; das (versteckte) Häkchen trägt den Wert für das Formular.
      '<div class="e2-toggle"><span class="e2-label">Neutraler Kampfrichter E2</span>' +
      '<span class="bs-theme" role="group" aria-label="Neutraler Kampfrichter E2">' +
      '<button type="button" class="toggle' + (neutral ? ' on' : '') + '" data-action="neutral-e2" data-value="yes"' + (hasScores ? ' disabled' : '') + '>Ja</button>' +
      '<button type="button" class="toggle' + (neutral ? '' : ' on') + '" data-action="neutral-e2" data-value="no"' + (hasScores ? ' disabled' : '') + '>Nein</button></span>' +
      (hasScores ? ' <span class="muted small">(nach Beginn der Wertung nicht mehr änderbar)</span>' : '') +
      '<input type="checkbox" name="neutralE2" hidden' + (neutral ? ' checked' : '') + (hasScores ? ' disabled' : '') + '></div>' +
      '<div class="judge-neutral">' + input('judgeE2', 'E2 – neutral', neutral ? j.e2 : '') + '</div>' +
      // Ohne neutralen E2: E2 (Heim) und E3 (Gast) sind mit D1 bzw. D2 vorausgefüllt und frei änderbar.
      '<div class="judge-split row2">' + input('judgeE2Home', 'E2 – Heim', neutral ? '' : j.e2, true) + input('judgeE3Guest', 'E3 – Gast', j.e3, true) + '</div>' +
      '</fieldset>' +

      '<p class="muted small req-note"><span class="req">*</span> Pflichtfeld</p>' +
      // Fest am unteren Rand: Speichern bzw. Anlegen, Abbrechen und der Hinweis auf ungespeicherte Änderungen
      '<div class="actions form-bar"><button class="btn primary" type="submit">' + (isNew ? 'Anlegen' : 'Speichern') + '</button>' +
      '<a class="btn ghost form-cancel" href="' + (m ? '#/match/' + m.id : leagueHref('home', leagueKey)) + '">Abbrechen</a>' +
      '<span class="unsaved" hidden>nicht gespeichert</span></div>' +
      '</form></section>';
  }

  /**
   * Anwesende Turner einer Mannschaft zum Abhaken. selected: Liste der Turner-IDs
   * (fehlt sie, sind alle benannten Turner abgehakt). Die Namen lassen sich direkt
   * ändern bzw. auf freien Startnummern ergänzen und werden sofort in der Mannschaft gespeichert.
   */
  function lineupHtml(side, teamId, selected) {
    var t = team(teamId);
    if (!t) return '';
    var rows = t.gymnasts.map(function (g) {
      var on = !!g.name && (!selected || selected.indexOf(g.id) >= 0);
      return '<li class="gym-row lineup-row' + (on ? '' : ' off') + '">' +
        '<input type="checkbox" class="lineup-check" data-side="' + side + '" value="' + g.id + '"' + (on ? ' checked' : '') + (g.name ? '' : ' disabled') +
        ' aria-label="Startnummer ' + g.number + ' anwesend">' +
        '<span class="startno">' + g.number + '</span>' +
        '<input type="text" value="' + esc(g.name) + '" placeholder="frei – Name eintragen" data-team="' + t.id + '" data-gym="' + g.number + '" data-tfield="gname" aria-label="Name Startnummer ' + g.number + '"></li>';
    }).join('');
    return '<div class="lineup-head"><strong>Anwesende Turner</strong><span class="lineup-count" data-count="' + side + '"></span></div>' +
      '<div class="actions"><button type="button" class="btn small" data-action="lineup-all" data-side="' + side + '">Alle</button>' +
      '<button type="button" class="btn small" data-action="lineup-none" data-side="' + side + '">Keine</button></div>' +
      '<ul class="plain gym-list">' + rows + '</ul>';
  }

  /** Zähler und Hinweis (weniger als 4 Turner) der Anwesenheitsliste aktualisieren. */
  function syncLineup(form) {
    ['home', 'guest'].forEach(function (side) {
      var el = form.querySelector('[data-count="' + side + '"]');
      if (!el) return;
      var boxes = form.querySelectorAll('.lineup-check[data-side="' + side + '"]');
      var n = 0;
      boxes.forEach(function (b) {
        if (b.checked) n++;
        b.closest('.lineup-row').classList.toggle('off', !b.checked);
      });
      var min = S.DEFAULT_RULES.duelsPerApparatus;
      el.textContent = n + ' ausgewählt' + (n < min ? ' – weniger als ' + min + ' Turner!' : '');
      el.classList.toggle('warn', n < min);
    });
  }

  /** Neutraler E2 an/aus: passende Eingabefelder zeigen und als Pflichtfeld markieren. */
  function syncJudgeFields(form) {
    var neutral = form.neutralE2.checked;
    form.classList.toggle('split-e', !neutral);
    form.judgeE2.required = neutral;
    form.querySelectorAll('[data-action="neutral-e2"]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-value') === 'yes') === neutral); });
    linkJudges(form);
  }

  /**
   * Ohne neutralen E2: E2 (Heim) bzw. E3 (Gast) übernehmen den Namen von D1 bzw. D2, solange man sie
   * nicht selbst geändert hat (leer oder gleich dem D-Namen = noch verbunden).
   */
  var JUDGE_LINKS = [['judgeE2Home', 'judgeD1'], ['judgeE3Guest', 'judgeD2']];
  function linkJudges(form) {
    JUDGE_LINKS.forEach(function (x) {
      var e = form[x[0]], d = form[x[1]];
      if (!e.dataset.linked) e.dataset.linked = (!e.value || e.value === d.value) ? '1' : '';
      if (e.dataset.linked && !form.neutralE2.checked) e.value = d.value;
    });
  }

  function colorPicker(name, label, selected) {
    return '<fieldset class="color-choice"><legend>' + label + '</legend>' + COLORS.map(function (c) {
      return '<label class="swatch" title="' + c.name + '"><input type="radio" name="' + name + '" value="' + c.key + '"' + (c.key === selected ? ' checked' : '') + '>' +
        '<span style="background:' + c.hex + ';color:' + c.fg + '">' + c.name + '</span></label>';
    }).join('') + '</fieldset>';
  }

  function submitMatchForm(form, ok) {
    ok = ok || {};
    var fd = new FormData(form);
    var id = form.getAttribute('data-id');
    var duels = S.DEFAULT_RULES.duelsPerApparatus;
    var m = id ? match(id) : null;
    var home = m && form.home.disabled ? m.homeTeamId : fd.get('home');
    var guest = m && form.guest.disabled ? m.guestTeamId : fd.get('guest');
    if (!home || !guest) { toast('Bitte beide Mannschaften wählen.', 'error'); return; }
    if (home === guest) { toast('Heim- und Gastmannschaft müssen verschieden sein.', 'error'); return; }
    var colors = { home: fd.get('homeColor') || DEFAULT_COLORS.home, guest: fd.get('guestColor') || DEFAULT_COLORS.guest };
    if (colors.home === colors.guest) { toast('Heim und Gast brauchen verschiedene Farben.', 'error'); return; }
    var lineup = {};
    ['home', 'guest'].forEach(function (side) {
      lineup[side] = Array.prototype.filter.call(form.querySelectorAll('.lineup-check[data-side="' + side + '"]'), function (b) { return b.checked; })
        .map(function (b) { return b.value; });
    });
    if (m) {
      // Abgewählte Turner, die bereits eine Wertung haben, behalten sie – trotzdem nachfragen.
      var scored = [];
      S.APPARATUS.forEach(function (a) {
        m.apparatus[a.key].duels.forEach(function (d) {
          ['home', 'guest'].forEach(function (k) {
            var id = d[k].gymnastId;
            if (id && lineup[k].indexOf(id) < 0 && scored.indexOf(d[k].name) < 0) scored.push(d[k].name || id);
          });
        });
      });
      if (scored.length && !ok.scored) {
        askConfirm('Bereits eingesetzt, aber nicht mehr als anwesend markiert: ' + scored.join(', ') +
          '. Ihre Wertungen bleiben erhalten. Trotzdem speichern?').then(function (yes) {
          if (yes) submitMatchForm(form, Object.assign({}, ok, { scored: true }));
        });
        return;
      }
    }
    var neutral = form.neutralE2.disabled ? S.eJudgeCount(m.rules) === 2 : form.neutralE2.checked;
    var text = function (n) { return String(fd.get(n) || '').trim(); };
    var judges = {
      e1: text('judgeE1'),
      e2: neutral ? text('judgeE2') : text('judgeE2Home'),
      e3: neutral ? '' : text('judgeE3Guest'),
      d1: text('judgeD1'),
      d2: text('judgeD2')
    };

    if (!m) {
      var leagueKey = form.getAttribute('data-league') || currentLeague;
      var rules = rulesFor(leagueKey, neutral ? 2 : 3);
      m = {
        id: uid(), league: leagueKey, date: '', homeTeamId: home, guestTeamId: guest,
        rules: rules, status: 'open', apparatus: {}, createdAt: new Date().toISOString()
      };
      S.APPARATUS.forEach(function (a) {
        m.apparatus[a.key] = { duels: Array.from({ length: duels }, S.isClassic(rules) ? S.emptyRow : S.emptyDuel) };
      });
      state.matches.unshift(m);
    } else {
      if (duels < m.rules.duelsPerApparatus) {
        var lost = S.APPARATUS.some(function (a) {
          return m.apparatus[a.key].duels.slice(duels).some(function (d) { return sideUsed(d.home) || sideUsed(d.guest); });
        });
        if (lost && !ok.lost) {
          askConfirm('Beim Verringern der Duelle gehen bereits eingetragene Daten verloren. Fortfahren?').then(function (yes) {
            if (yes) submitMatchForm(form, Object.assign({}, ok, { lost: true }));
          });
          return;
        }
      }
      S.APPARATUS.forEach(function (a) {
        var list = m.apparatus[a.key].duels;
        while (list.length < duels) list.push(isClassic(m) ? S.emptyRow() : S.emptyDuel());
        list.length = duels;
      });
      m.rules.duelsPerApparatus = duels;
      m.homeTeamId = home;
      m.guestTeamId = guest;
    }
    m.colors = colors;
    m.lineup = lineup;
    m.rules = rulesFor(m.league, neutral ? 2 : 3);
    m.judges = judges;
    m.captains = { home: text('captainHome'), guest: text('captainGuest') };
    m.startTeam = fd.get('startTeam') === 'guest' ? 'guest' : 'home';
    m.date = fd.get('date') || '';
    save('matches', m).then(function () { setupGuard.leaveOk = true; location.hash = ok.goto || '#/match/' + m.id; });
  }

  // ---------- Wettkampf-Setup: ungespeicherte Änderungen nicht verlieren ----------

  var setupGuard = { initial: null, leaveOk: false, lastHash: location.hash };

  function setupForm() {
    return $app.querySelector('form[data-form="match"]');
  }

  /** Stand des Formulars als Text; Turnernamen zählen nicht (sie werden sofort in die Mannschaftsliste übernommen). */
  function formState(form) {
    return Array.prototype.map.call(form.elements, function (el) {
      if (el.hasAttribute('data-gym') || el.tagName === 'BUTTON' || el.tagName === 'FIELDSET') return '';
      var key = el.name || (el.classList.contains('lineup-check') ? 'lu-' + el.getAttribute('data-side') + '-' + el.value : '');
      if (!key) return '';
      return key + '=' + (el.type === 'checkbox' || el.type === 'radio' ? el.value + ':' + el.checked : el.value);
    }).join('&');
  }

  function setupDirty() {
    var form = setupForm();
    return !!form && setupGuard.initial !== null && formState(form) !== setupGuard.initial;
  }

  function updateUnsaved() {
    var el = $app.querySelector('.form-bar .unsaved');
    if (el) el.hidden = !setupDirty();
  }

  /** Verlassen mit ungespeicherten Änderungen: Weiter bearbeiten, Verwerfen oder Speichern (bzw. Anlegen) und weiter. */
  function askLeaveSetup(target) {
    var form = setupForm();
    askChoice('Änderungen speichern?', 'Im Wettkampf-Setup wurden Änderungen gemacht, die noch nicht gespeichert sind.', null, [
      { label: 'Weiter bearbeiten', value: 'stay', cancel: true, focus: true },
      { label: 'Verwerfen', value: 'discard' },
      { label: form && !form.getAttribute('data-id') ? 'Anlegen' : 'Speichern', value: 'save', primary: true }
    ]).then(function (a) {
      if (a === 'discard') { setupGuard.leaveOk = true; location.hash = target; }
      else if (a === 'save' && form && form.reportValidity()) submitMatchForm(form, { goto: target });
    });
  }

  function sideUsed(s) {
    return !!(s.gymnastId || s.name || s.d !== null || s.e1 !== null || s.e2 !== null || s.e3 !== null || s.bonus || s.dns);
  }

  // ---------- Ansicht: Wettkampf (Erfassung) ----------

  function currentTab(m) {
    // Ohne Auswahl das Gerät, das gerade auf der Anzeigetafel steht (siehe boardApparatus).
    return state.ui.tab[m.id] || boardApparatus(m).key;
  }

  /**
   * Am Gerät ist schon eine Teilwertung eingetragen oder etwas freigegeben – dann trägt der Reiter den gelben Punkt.
   * Turnerauswahl und „kein Turner“ zählen nicht (sie können vorab gewählt werden).
   */
  function appHasInput(m, key) {
    return m.apparatus[key].duels.some(function (d) {
      return rowAnyRevealed(m, d) || ['home', 'guest'].some(function (k) {
        var x = d[k];
        return x.d !== null || x.e1 !== null || x.e2 !== null || x.e3 !== null || x.nd || x.bonus || x.zero;
      });
    });
  }

  /**
   * Status je Gerät für die Reiter: done (alle Wertungen freigegeben, grüner Haken), run (Eingaben vorhanden, gelber Punkt)
   * oder open. Gesperrt wird kein Gerät: Reiter, Turner und Wertungen sind jederzeit bedienbar.
   */
  function appStatus(m) {
    var r = S.matchResult(S.revealedView(m)), st = {};
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      st[a.key] = ar.complete ? 'done' : (ar.started || appHasInput(m, a.key)) ? 'run' : 'open';
    });
    return st;
  }

  var TAB_BADGE = { done: '✓', run: '', open: '' };

  function tabStatusClass(st) {
    return st === 'open' ? '' : ' st-' + st;
  }

  function viewMatch(m) {
    var r = S.matchResult(m);
    var tab = currentTab(m);
    var locked = m.status === 'final';
    var st = appStatus(m);
    var tabs = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<button class="tab' + (a.key === tab ? ' active' : '') + tabStatusClass(st[a.key]) + '" tabindex="-1" data-action="tab" data-tab="' + a.key + '">' +
        '<span class="tab-badge" aria-hidden="true">' + TAB_BADGE[st[a.key]] + '</span>' +
        appIcon(a.key, 'tab-ico') + '<span class="tab-name">' + a.name + '</span><span class="tab-score" data-out="tab-' + a.key + '">' + totalPair(m, ar) + '</span></button>';
    }).join('');

    // Menüband (Laptop, iPad) bzw. Aufklappmenüs (Handy): dieselben Knöpfe, nur anders dargestellt (siehe Kopfzeile).
    var ribbon = '<div class="tb-ribbon">' +
      '<div class="menu-pop" id="menu-board" role="group" aria-label="Anzeigetafel">' +
      '<button class="btn mi-main" data-action="open-board"><span class="ml">Anzeigetafel öffnen</span><span class="ms">Öffnen</span></button>' +
      '<span class="mi-design"><span class="mi-lbl">Design</span><span class="bs-theme" role="group" aria-label="Design der Anzeigetafel">' +
      '<button class="toggle' + (boardLight(m) ? ' on' : '') + '" data-action="theme" data-theme="light">Hell</button>' +
      '<button class="toggle' + (boardLight(m) ? '' : ' on') + '" data-action="theme" data-theme="dark">Dunkel</button></span></span><hr>' +
      // Reihenfolge wie im Ablauf: Turnervorstellung, Einturnzeit, Wettkampfpause, Ergebnis/Siegerehrung
      '<span data-out="intro">' + introControls(m) + '</span>' +
      '<button class="btn timer-btn" data-action="warmup-timer">' + warmupLabel(null) + '</button>' + pauseControls() +
      '<button class="btn toggle' + (m.display && m.display.scorers ? ' on' : '') + '" data-action="toggle-scorers">' + scorersLabel() + '</button></div>' +
      '<div class="menu-pop" id="menu-match" role="group" aria-label="Wettkampf">' +
      (locked ? '' : '<a class="btn" href="#/edit/' + m.id + '"><span class="ml">Wettkampf Setup</span><span class="ms">Setup</span></a>') +
      '<a class="btn" href="#/match/' + m.id + '/print"><span class="ml">Protokoll / Drucken</span><span class="ms">Protokoll</span></a><hr>' +
      (locked ? '<button class="btn" data-action="reopen">Wieder öffnen</button>'
        : '<button class="btn mi-main" data-action="finalize"><span class="ml">Wettkampf abschließen</span><span class="ms">Abschließen</span></button>') +
      '</div></div>';

    // Kopf, Hinweise und Gerätereiter bilden den oberen Bereich (am Laptop beim Scrollen fixiert).
    return ribbon + '<div class="match-top"><section class="card match-head">' +
      // Kopf: Datum und Status · Mannschaften mit Stand · Gerätepunkte. Liga, „Beginn: …“ und (im Querformat) „Sieger: …“
      // stehen hier nicht mehr, damit die Ergebniszeile einzeilig bleibt; Namen haben einen festen Platz (sonst „…“).
      '<div class="match-meta"><div class="muted">' + esc(fmtDate(m.date)) + ' · <span data-out="status">' + statusBadge(m, r) + '</span></div></div>' +
      '<div class="scoreline' + (isClassic(m) ? ' sums' : '') + '">' +
      '<div class="team home"><div class="label">Heim</div><div class="name" title="' + esc(teamName(m.homeTeamId)) + '">' + teamTag(m, 'home') + '</div>' +
      '<div class="tv' + (isClassic(m) ? ' sums' : '') + '" data-out="score-home">' + teamValue(m, r, 'home') + '</div></div>' +
      '<div class="big' + (isClassic(m) ? ' sums' : '') + '" data-out="score">' + totalPair(m, r, false, ' : ') + '</div>' +
      '<div class="team guest"><div class="label">Gast</div><div class="name" title="' + esc(teamName(m.guestTeamId)) + '">' + teamTag(m, 'guest') + '</div>' +
      '<div class="tv' + (isClassic(m) ? ' sums' : '') + '" data-out="score-guest">' + teamValue(m, r, 'guest') + '</div></div>' +
      '</div>' +
      '<div class="subscore">Gerätepunkte <strong data-out="app">' + r.homeApp + ':' + r.guestApp + '</strong></div>' +
      (deductionsText(m) ? '<div class="deduct-note">' + esc(deductionsText(m)) + '</div>' : '') +
      '</section>' +
      (locked ? '<div class="banner info">Dieser Wettkampf ist abgeschlossen und schreibgeschützt.</div>' : '') +
      '<div data-out="pending">' + pendingBanner(m) + '</div>' +
      '<nav class="tabs">' + tabs + '</nav></div>' +
      '<section class="card" id="apparatus-panel">' + apparatusPanel(m, tab) + '</section>' +
      '<div id="app-intro"></div><div id="app-scorers"></div><div id="score-dlg"></div>';
  }

  /** Knopfbeschriftung nennt, was beim Drücken passiert. */
  /** Wettkampfpause: ein Knopf; ein Klick öffnet die Auswahl der Dauer, die Wahl startet die Pause sofort. */
  function pauseControls() {
    return '<span class="pause-ctl"><button class="btn timer-btn" data-action="pause-timer" aria-haspopup="menu">' + pauseLabel(null) + '</button>' +
      '<div class="pause-menu" role="menu" hidden><div class="pm-head">Dauer wählen</div>' + PAUSE_MINUTES.map(function (n) {
        return '<button class="btn" role="menuitem" data-action="pause-start" data-min="' + n + '">' + n + ' Minuten</button>';
      }).join('') + '</div></span>';
  }

  function closePauseMenu() {
    var pm = $app.querySelector('.pause-menu');
    if (pm) pm.hidden = true;
  }

  /** Gleiche Beschriftung in beiden Zuständen; eingeblendet zeigt der Knopf dunkel hinterlegt (wie Hell/Dunkel). */
  function scorersLabel() { return '<span class="ml">Ergebnis/Siegerehrung</span><span class="ms">Ergebnis</span>'; }

  /** Beschriftung des Einturn-Knopfs: „Einturnzeit“ bzw. mit Restzeit „Einturnzeit 4:12 – beenden“ (schmal: „Einturnen …“). */
  function warmupLabel(w) {
    return '<span class="ml">Einturnzeit</span><span class="ms">Einturnen</span>' + (w ? ' ' + clock(w.remaining) + ' – beenden' : '');
  }

  /** Beschriftung des Pause-Knopfs: „Wettkampfpause“ bzw. mit Restzeit „Wettkampfpause 4:12 – beenden“ (schmal: „Pause …“). */
  function pauseLabel(pause) {
    return '<span class="ml">Wettkampfpause</span><span class="ms">Pause</span>' + (pause ? ' ' + clock(pause.remaining) + ' – beenden' : '');
  }

  /** Solange eine nachträgliche Änderung nicht angezeigt ist, sind alle anderen Duelle gesperrt (sonst nichts). */
  function duelBlocked(m, appKey, idx, sideKey) {
    if (m.status === 'final') return true;
    var pending = S.pendingCorrections(m);
    // Im klassischen Modell bleibt nur die geänderte Übung selbst bearbeitbar.
    return pending.length > 0 && !pending.some(function (p) { return p.appKey === appKey && p.idx === idx && (!p.side || p.side === sideKey); });
  }

  // Geräte-Logos (neutral grau) in icons/geraete/
  var APPARATUS_ICON = { FX: 'boden', PH: 'pauschenpferd', SR: 'ringe', VT: 'sprung', PB: 'barren', HB: 'reck' };

  function appIcon(key, cls) {
    return '<img src="icons/geraete/' + APPARATUS_ICON[key] + '.svg" class="app-ico' + (cls ? ' ' + cls : '') + '" alt="">';
  }

  function apparatusName(key) {
    return S.APPARATUS.filter(function (a) { return a.key === key; })[0].name;
  }

  function pendingBanner(m) {
    var pending = S.pendingCorrections(m);
    if (!pending.length) return '';
    return '<div class="banner warn-banner">⚠ Nachträgliche Änderung: ' + pending.map(function (p) {
      return apparatusName(p.appKey) + (p.side ? ', ' + S.classicPosition(m, p.appKey, p.idx, p.side) + '. Übung' : ', Duell ' + (p.idx + 1));
    }).join('; ') + '. Bitte über <strong>„Wertung ändern“</strong> die Korrektur freigeben (oder dort mit „Abbrechen“ verwerfen) – bis dahin sind alle anderen ' + unitWord(m) + ' gesperrt.</div>';
  }

  var NO_GYMNAST = '__none';

  function gymnastSelect(m, appKey, idx, sideKey, side, locked) {
    return '<select ' + fieldAttrs(appKey, idx, sideKey, 'gymnast') + (locked ? ' disabled' : '') + ' aria-label="Turner">' + gymnastOptions(m, appKey, idx, sideKey, side) + '</select>';
  }

  /** Auswahlliste der Turner: „kein Turner“ oben, nur anwesende, bereits eingesetzte gesperrt. */
  function gymnastOptions(m, appKey, idx, sideKey, side) {
    var t = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
    var used = {};
    m.apparatus[appKey].duels.forEach(function (d, i) {
      if (i !== idx && d[sideKey].gymnastId) used[d[sideKey].gymnastId] = true;
    });
    var lineup = m.lineup && m.lineup[sideKey];
    // „kein Turner“ (= nicht angetreten) ganz oben, auch als Vorauswahl.
    var opts = '<option value="">– Turner –</option><option value="' + NO_GYMNAST + '"' + (side.dns ? ' selected' : '') + '>kein Turner</option>' +
      '<option disabled>──────────</option>';
    var found = false;
    (t ? t.gymnasts : []).forEach(function (g) {
      if (g.id === side.gymnastId) found = true;
      // Startnummern ohne Namen sind nicht auswählbar (außer sie sind bereits eingesetzt).
      if (!g.name && g.id !== side.gymnastId) return;
      // Nur anwesende Turner (ältere Wettkämpfe ohne Anwesenheitsliste: alle).
      if (lineup && lineup.indexOf(g.id) < 0 && g.id !== side.gymnastId) return;
      // Der eingesetzte Turner erscheint mit dem im Wettkampf gespeicherten Namen (bleibt nach Listen-Updates gleich).
      var label = g.id === side.gymnastId && side.name ? side.name : (g.name || '(ohne Name)');
      opts += '<option value="' + g.id + '"' + (g.id === side.gymnastId ? ' selected' : '') + (used[g.id] ? ' disabled' : '') + '>' +
        esc(gymnastLabel(g.number, label)) + (used[g.id] ? ' (bereits eingesetzt)' : '') + '</option>';
    });
    if (side.gymnastId && !found) opts += '<option value="' + esc(side.gymnastId) + '" selected>' + esc(gymnastLabel(side.number, side.name)) + '</option>';
    return opts;
  }

  function fieldAttrs(appKey, idx, sideKey, field) {
    return 'data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '" data-field="' + field + '"';
  }

  /** Kurzformen der Feldbeschriftungen – im Wertungsfenster für alle Felder gemeinsam (siehe fitFieldLabels). */
  var SHORT_LABEL = { 'Abzüge E1': 'E1', 'Abzüge E2': 'E2', 'Abzüge E3': 'E3', 'D-Note': 'D-Note', 'Standbonus': 'Stand', 'Neutr. Abzug': 'NA' };

  function fieldLabel(label) {
    return '<span class="lbl" title="' + label + '"><span class="l-long">' + label + '</span><span class="l-short">' + SHORT_LABEL[label] + '</span></span>';
  }

  /**
   * Beschriftungen im Wertungsfenster nie umbrechen oder kürzen: Passt auch nur eine lange Beschriftung nicht in ihr Feld,
   * zeigen alle Felder die Kurzformen (E1, E2, E3, D-Note, Stand, NA).
   */
  function fitFieldLabels() {
    var box = document.querySelector('#score-dlg .sd-fields');
    if (!box) return;
    box.classList.remove('short-labels');
    var tight = Array.prototype.some.call(box.querySelectorAll('.sd-f > .lbl'), function (el) {
      return el.scrollWidth > el.clientWidth + 0.5;
    });
    box.classList.toggle('short-labels', tight);
  }

  /** Ist diese Übung schon auf der Tafel (freigegeben)? Oberliga: das ganze Duell, Landesliga: die einzelne Übung. */
  function sideShown(m, appKey, idx, sideKey) {
    var d = m.apparatus[appKey].duels[idx];
    return isClassic(m) ? !!S.revOf(d, sideKey).shown : !!d.shown;
  }

  /** Werte der Übung als Text (die Eingabe geschieht im Wertungsfenster). */
  function sideValuesHtml(m, appKey, side) {
    if (side.dns) return '<div class="score-row sv-row"><span class="sv-note">kein Turner</span></div>';
    if (side.zero) return '<div class="score-row sv-row"><span class="sv-note">Wertung 0,00</span></div>';
    var three = S.eJudgeCount(m.rules) === 3;
    var cell = function (label, v) {
      return '<span class="sv"><span>' + label + '</span><b' + (v ? '' : ' class="empty"') + '>' + (v || '–') + '</b></span>';
    };
    var num = function (x) { return x === null || x === undefined ? '' : fmt1(x); };
    return '<div class="score-row sv-row">' + cell('E1', num(side.e1)) + cell('E2', num(side.e2)) + (three ? cell('E3', num(side.e3)) : '') +
      cell('D-Note', num(side.d)) + (appKey !== S.NO_BONUS_APPARATUS ? cell('Stand', side.bonus ? '+0,1' : '') : '') + cell('NA', side.nd ? fmt1(side.nd) : '') + '</div>';
  }

  /**
   * Knopf zum Wertungsfenster: „Wertung eingeben“ bzw. – schon freigegeben (Oberliga: schon erfasst) – „Wertung ändern“.
   * Gesperrt nur im abgeschlossenen Wettkampf und solange eine andere Korrektur offen ist –
   * ohne Turner anklickbar (der Turner wird dann im Fenster gewählt).
   */
  function scoreButton(m, appKey, idx, sideKey, side, locked) {
    var shown = sideShown(m, appKey, idx, sideKey);
    var entered = !side.dns && S.sideFinal(side, m.rules) !== null;
    var change = shown || (!isClassic(m) && (entered || (side.dns && side.dnsReleased)));
    var off = locked;
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '"' + (off ? ' disabled' : '');
    // „kein Turner“: nichts einzutippen – direkt in der Kachel freigeben (ohne Fenster).
    if (side.dns && !change) return '<button type="button" class="btn primary score-btn" data-action="dns-release"' + attrs + '>Wertung freigeben</button>';
    return '<button type="button" class="btn ' + (change ? '' : 'primary ') + 'score-btn" data-action="score-open"' + attrs + '>' + (change ? 'Wertung ändern' : 'Wertung eingeben') + '</button>';
  }

  /**
   * „kein Turner“ ohne Fenster freigeben – wie „Wertung freigeben“ im Fenster: Landesliga auf die Tafel; Oberliga gibt das
   * Duell frei, wenn beide Turner fertig sind, sonst wird nur vermerkt (dnsReleased), dass diese Seite freigegeben ist.
   */
  function releaseDns(m, appKey, idx, sideKey) {
    var d = m.apparatus[appKey].duels[idx], live = d[sideKey];
    if (!live.dns || m.status === 'final' || duelBlocked(m, appKey, idx, sideKey)) return;
    if (!isClassic(m)) live.dnsReleased = true;
    var kind = isClassic(m) ? revealSideNow(m, appKey, idx, sideKey)
      : duelReady(S.duelResult(d, m.rules), d) ? revealDuelNow(m, appKey, idx) : 'stored';
    var viaKeyboard = lastInputKeyboard;
    var key = appKey + '-' + idx + '-' + sideKey;
    save('matches', m).then(function () {
      rerenderPanel(m);
      if (viaKeyboard) focusNextScoreBtn(key, true);
      toast(kind === 'correction' ? 'Korrektur freigegeben' : kind === 'stored' ? 'Wertung erfasst – erscheint mit dem Duell auf der Tafel' : kind === 'none' ? 'Keine Änderung' : 'Wertung freigegeben');
    });
  }

  /**
   * Knopf „Sturz-Timer“ (Kachel und Wertungsfenster). Gesperrt wie die Turnerauswahl – nach der Freigabe, bei „kein Turner“
   * und im abgeschlossenen Wettkampf –, außer sein Timer läuft gerade: dann bleibt er bis zum Stopp bzw. Ablauf bedienbar.
   */
  function fallButton(m, appKey, idx, sideKey, off) {
    var f = fallState(m);
    var running = !!f && f.t.appKey === appKey && f.t.idx === idx && f.t.side === sideKey;
    return '<button type="button" class="btn small timer-btn" tabindex="-1" data-action="fall-timer" data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '"' +
      (off ? ' data-off="1"' + (running ? '' : ' disabled') : '') + '>Sturz-Timer</button>';
  }

  function sideHtml(m, appKey, idx, sideKey, side, locked, position, struck) {
    var classic = isClassic(m);
    var color = sideColor(m, sideKey);
    var key = appKey + '-' + idx + '-' + sideKey;
    var d = m.apparatus[appKey].duels[idx];
    return '<div class="side ' + sideKey + (classic ? '' : position === 1 ? ' first' : ' second') + (side.dns ? ' dns' : '') + (struck ? ' struck' : '') +
      '" data-key="' + key + '" style="--team:' + color.hex + ';--team-fg:' + color.fg + '">' +
      (!classic && position === 1 ? '<span class="lead-tag">legt vor</span>' : '') +
      '<div class="side-head"><span class="order-no" title="' + (classic ? 'Startposition am Gerät' : 'Startreihenfolge im Duell') + '">' + position + '.</span>' +
      '<span class="side-label" title="' + (sideKey === 'home' ? 'Heim' : 'Gast') + '">' + teamHtml(sideKey === 'home' ? m.homeTeamId : m.guestTeamId) + '</span>' +
      // Nach der Freigabe wird der Turner nur noch im Wertungsfenster („Wertung ändern“) geändert.
      gymnastSelect(m, appKey, idx, sideKey, side, locked || sideShown(m, appKey, idx, sideKey)) + '</div>' +
      sideValuesHtml(m, appKey, side) +
      '<div class="result-row">' +
      '<span>E-Note <strong data-out="enote-' + key + '">' + fmt(S.eScore(side, m.rules)) + '</strong></span>' +
      '<span class="final">Endnote <strong data-out="final-' + key + '">' + fmt(S.sideFinal(side, m.rules)) + '</strong></span></div>' +
      '<div class="side-foot">' +
      (classic ? '<span class="side-status" data-out="sideact-' + key + '">' + sideActions(m, d, appKey, idx, sideKey) + '</span>' : '') +
      (FALL_TIMER_APPARATUS.indexOf(appKey) >= 0 ? fallButton(m, appKey, idx, sideKey, locked || side.dns || sideShown(m, appKey, idx, sideKey)) : '') +
      scoreButton(m, appKey, idx, sideKey, side, locked) +
      '</div></div>';
  }

  /** Scorepunkte des Duells als einzelne Zahl in der Farbe der Mannschaft, die es gewonnen hat. */
  function duelPoints(m, r) {
    if (!r.complete) return '<span class="duel-open">offen</span>';
    var n = r.winner === 'home' ? r.homePoints : r.winner === 'guest' ? r.guestPoints : 0;
    var num = r.winner === 'draw' ? '<span class="sp-num draw0">0</span>' : pts(m, r.winner, n);
    return '<span class="duel-pts">' + num + '</span>' +
      '<span class="duel-diff">' + (r.winner === 'draw' ? 'unentschieden · ' : '') + 'Diff. ' + fmt(r.diff) + '</span>';
  }

  /**
   * Freigabe erst, wenn beide Seiten fertig sind: Turner gewählt und Wertung vollständig –
   * oder „nicht angetreten“ (dann ohne Turner und Wertung).
   */
  function duelReady(r, duel) {
    function sideReady(s) { return s.dns || !!s.gymnastId; }
    return r.complete && sideReady(duel.home) && sideReady(duel.guest);
  }

  /** Knöpfe unter der zweiten Übung – in der Tab-Reihenfolge als Letztes im Duell. */
  /** Mittelspalte (Oberliga): nur noch der Stand – freigegeben wird im Wertungsfenster. */
  function duelActions(r, duel) {
    if (S.hasPendingCorrection(duel)) return '<span class="changed">geändert – noch nicht freigegeben</span>';
    return duel.revealedAt ? '<span class="revealed">✓ freigegeben</span>' : '';
  }

  function apparatusPanel(m, appKey) {
    if (isClassic(m)) return classicPanel(m, appKey);
    var a = S.APPARATUS.filter(function (x) { return x.key === appKey; })[0];
    var app = m.apparatus[appKey];
    var ar = S.apparatusResult(app, m.rules);
    var duels = app.duels.map(function (d, i) {
      var locked = duelBlocked(m, appKey, i);
      var order = S.startOrder(m, appKey, i);
      var cls = 'duel' + (S.hasPendingCorrection(d) ? ' pending' : '') + (locked && m.status !== 'final' ? ' blocked' : '');
      // DOM-Reihenfolge = Startreihenfolge, damit die Tabulatortaste der Wettkampfreihenfolge folgt.
      return '<div class="' + cls + '">' +
        '<div class="duel-no">Duell ' + (i + 1) + '</div>' +
        sideHtml(m, appKey, i, order[0], d[order[0]], locked, 1, false) +
        sideHtml(m, appKey, i, order[1], d[order[1]], locked, 2, false) +
        '<div class="duel-result" data-out="duel-' + appKey + '-' + i + '">' + duelPoints(m, ar.duels[i]) + '</div>' +
        '<div class="duel-actions" data-out="duelact-' + appKey + '-' + i + '">' + duelActions(ar.duels[i], d) + '</div>' +
        '</div>';
    }).join('');
    return '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(m, ar) + '</div></div>' + duels;
  }

  // ---------- Landesliga: Eingabe je Übung ----------

  /** Freigabe einer Übung: Turner gewählt und Wertung vollständig – oder „nicht angetreten“. */
  function sideReady(m, s) {
    return S.sideFinal(s, m.rules) !== null && (s.dns || !!s.gymnastId);
  }

  /** Landesliga: Stand der Übung im Fuß der Kachel – freigegeben wird im Wertungsfenster. */
  function sideActions(m, d, appKey, idx, sideKey) {
    if (S.sidePending(d, sideKey)) return '<span class="changed">geändert – noch nicht freigegeben</span>';
    return S.revOf(d, sideKey).revealedAt ? '<span class="revealed">✓ freigegeben</span>' : '';
  }

  /**
   * Landesliga: links die Turner der am Gerät beginnenden Mannschaft, rechts die der
   * anderen; jede Zeile ist ein Startpaar (A1/B1 …). DOM-Reihenfolge = Startreihenfolge.
   */
  function classicPanel(m, appKey) {
    var a = S.APPARATUS.filter(function (x) { return x.key === appKey; })[0];
    var app = m.apparatus[appKey];
    var ar = S.apparatusResult(app, m.rules);
    var order = S.classicOrder(m, appKey);
    var rows = app.duels.map(function (d, i) {
      return '<div class="cl-row">' + order.map(function (k) {
        var locked = duelBlocked(m, appKey, i, k);
        return '<div class="cl-cell' + (S.sidePending(d, k) ? ' pending' : '') + (locked && m.status !== 'final' ? ' blocked' : '') + '">' +
          sideHtml(m, appKey, i, k, d[k], locked, S.classicPosition(m, appKey, i, k), ar[k].struck.indexOf(i) >= 0) + '</div>';
      }).join('') + '</div>';
    }).join('');
    // Ohne Kopfzeile mit den Vereinsnamen und ohne Zeile „Summe (beste 3)“: Verein steht an jeder Kachel,
    // die beginnende Mannschaft hat Kachel 1, die Summen stehen im Reiter und in der Gerätezeile.
    return '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(m, ar) + '</div></div>' + rows +
      deductionLinks(m);
  }

  // ---------- Mannschaftsabzug (nur Landesliga) ----------
  // m.deduction = { home, guest } in Tausendsteln; zieht nur von der Gesamtpunktzahl ab (siehe Wertung).

  function deductionOf(m, side) {
    return (m.deduction && m.deduction[side]) || 0;
  }

  function deductionText(m, side) {
    return 'Mannschaftsabzug ' + teamName(side === 'home' ? m.homeTeamId : m.guestTeamId) + ': −' + fmt(deductionOf(m, side));
  }

  /** Alle eingetragenen Abzüge als Text (leer, wenn keiner eingetragen ist). */
  function deductionsText(m) {
    return ['home', 'guest'].filter(function (k) { return deductionOf(m, k); }).map(function (k) { return deductionText(m, k); }).join(' · ');
  }

  function deductionLinks(m) {
    var off = m.status === 'final' ? ' disabled' : '';
    return '<div class="deduct-row">' + ['home', 'guest'].map(function (k) {
      var v = deductionOf(m, k);
      return '<button type="button" class="linkish' + (v ? ' set' : '') + '" tabindex="-1" data-action="deduction" data-side="' + k + '"' + off + '>' +
        'Mannschaftsabzug ' + (k === 'home' ? 'Heim' : 'Gast') + (v ? ': −' + fmt(v) : '') + '</button>';
    }).join('') + '</div>';
  }

  function appSumHtml(m, ar) {
    if (isClassic(m)) {
      return 'Gerätesumme <strong>' + totalPair(m, ar) + '</strong>' +
        (ar.complete ? ' · Gerätepunkte <strong>' + ar.homeApp + ':' + ar.guestApp + '</strong>' : ' · <span class="muted">noch nicht vollständig</span>');
    }
    return 'Scorepunkte <strong>' + ptsPair(m, ar.homePoints, ar.guestPoints) + '</strong>' +
      (ar.complete ? ' · Gerätepunkte <strong>' + ar.homeApp + ':' + ar.guestApp + '</strong>' : ' · <span class="muted">noch nicht vollständig</span>');
  }

  /** Aktualisiert berechnete Werte, ohne Eingabefelder neu aufzubauen (Fokus bleibt erhalten). */
  function refreshComputed(m) {
    var r = S.matchResult(m);
    function out(key, html) {
      var el = $app.querySelector('[data-out="' + key + '"]');
      if (el) el.innerHTML = html;
    }
    out('score', totalPair(m, r, false, ' : '));
    out('score-home', teamValue(m, r, 'home'));
    out('score-guest', teamValue(m, r, 'guest'));
    out('app', r.homeApp + ':' + r.guestApp);
    out('status', statusBadge(m, r));
    var st = appStatus(m);
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      out('tab-' + a.key, totalPair(m, ar));
      var tabBtn = $app.querySelector('.tab[data-tab="' + a.key + '"]');
      if (!tabBtn) return;
      ['done', 'run'].forEach(function (k) { tabBtn.classList.toggle('st-' + k, st[a.key] === k); });
      tabBtn.querySelector('.tab-badge').textContent = TAB_BADGE[st[a.key]];
    });
    var tab = currentTab(m);
    var ar = r.apparatus[tab];
    out('app-sum', appSumHtml(m, ar));
    out('pending', pendingBanner(m));
    if (isClassic(m)) {
      m.apparatus[tab].duels.forEach(function (d, i) {
        ['home', 'guest'].forEach(function (k) {
          var key = tab + '-' + i + '-' + k;
          var act = $app.querySelector('[data-out="sideact-' + key + '"]');
          var html = sideActions(m, d, tab, i, k);
          if (act && act.innerHTML !== html) act.innerHTML = html;
          var cell = act && act.closest('.cl-cell');
          if (cell) cell.classList.toggle('pending', S.sidePending(d, k));
          out('enote-' + key, fmt(S.eScore(d[k], m.rules)));
          out('final-' + key, fmt(S.sideFinal(d[k], m.rules)));
          var sideEl = $app.querySelector('.side[data-key="' + key + '"]');
          if (sideEl) sideEl.classList.toggle('struck', ar[k].struck.indexOf(i) >= 0);
        });
      });
      return;
    }
    m.apparatus[tab].duels.forEach(function (d, i) {
      out('duel-' + tab + '-' + i, duelPoints(m, ar.duels[i]));
      // Knöpfe nur neu aufbauen, wenn sich etwas ändert – sonst ginge ein Fokus darauf verloren.
      var act = $app.querySelector('[data-out="duelact-' + tab + '-' + i + '"]');
      var html = duelActions(ar.duels[i], d);
      if (act && act.innerHTML !== html) act.innerHTML = html;
      ['home', 'guest'].forEach(function (k) {
        out('enote-' + tab + '-' + i + '-' + k, fmt(S.eScore(d[k], m.rules)));
        out('final-' + tab + '-' + i + '-' + k, fmt(S.sideFinal(d[k], m.rules)));
      });
    });
  }

  /** Turnerauswahl in der Kachel (Noten werden im Wertungsfenster eingegeben). */
  function handleScoreChange(el) {
    var m = match(route().id);
    if (!m || m.status === 'final') return;
    var appKey = el.getAttribute('data-app');
    var idx = parseInt(el.getAttribute('data-duel'), 10);
    var sideKey = el.getAttribute('data-side');
    var field = el.getAttribute('data-field');
    if (duelBlocked(m, appKey, idx, sideKey)) { toast('Erst die nachträgliche Änderung freigeben oder verwerfen.', 'error'); render(); return; }

    if (field !== 'gymnast') return;
    var none = el.value === NO_GYMNAST;
    // Mit Maus oder Tastatur bleibt das Auswahlfeld aktiv (weiter mit Tab bzw. erneut Enter);
    // bei Touch nicht fokussieren, sonst öffnet iOS die Auswahl sofort wieder.
    var keepFocus = !none && lastPointerType !== 'touch' && lastPointerType !== 'pen';
    if (!none) el.blur();
    applyGymnastChoice(m, appKey, idx, sideKey, el.value, false).then(function () {
      rerenderPanel(m);
      if (keepFocus) {
        var sel = $app.querySelector('select[data-app="' + appKey + '"][data-duel="' + idx + '"][data-side="' + sideKey + '"][data-field="gymnast"]');
        if (sel) sel.focus();
      }
    });
  }

  function rerenderPanel(m) {
    var panel = document.getElementById('apparatus-panel');
    if (!panel) return;
    var focusKey = focusKeyOf(document.activeElement);
    panel.innerHTML = apparatusPanel(m, currentTab(m));
    refreshComputed(m);
    tickTimers();
    restoreFocus(focusKey);
  }

  function focusKeyOf(el) {
    if (!el || !el.getAttribute || !el.getAttribute('data-field')) return null;
    return ['data-app', 'data-duel', 'data-side', 'data-field'].map(function (a) { return '[' + a + '="' + el.getAttribute(a) + '"]'; }).join('');
  }

  function restoreFocus(key) {
    if (!key) return;
    var el = $app.querySelector(key);
    // Auswahlfelder nie automatisch fokussieren: iOS öffnet die Auswahl dann erneut.
    if (el && el.tagName !== 'SELECT') el.focus();
  }

  // ---------- Ansicht: Anzeigetafel ----------

  /** Zuletzt freigegebene Wertung (auch Korrekturen) – steuert die Einblendungen. */
  function latestReveal(m) {
    return latestBy(m, 'revealedAt');
  }

  /** Zuletzt geturntes Duell (erste Anzeige) – Korrekturen ändern das nicht. */
  function latestPerformed(m) {
    return latestBy(m, 'firstRevealedAt');
  }

  function latestBy(m, field) {
    var latest = { at: '', appKey: null, idx: -1, side: null };
    S.APPARATUS.forEach(function (a) {
      m.apparatus[a.key].duels.forEach(function (d, i) {
        (isClassic(m) ? ['home', 'guest'] : [null]).forEach(function (k) {
          var u = k ? S.revOf(d, k) : d;
          var at = u[field] || (field === 'firstRevealedAt' ? u.revealedAt : null);
          if (at && at > latest.at) latest = { at: at, appKey: a.key, idx: i, side: k };
        });
      });
    });
    return latest;
  }

  /** Ist das Duell bzw. (Landesliga) sind beide Übungen der Zeile freigegeben? */
  function rowRevealed(m, d) {
    return isClassic(m) ? !!(S.revOf(d, 'home').revealedAt && S.revOf(d, 'guest').revealedAt) : !!d.revealedAt;
  }

  function rowAnyRevealed(m, d) {
    return isClassic(m) ? !!(S.revOf(d, 'home').revealedAt || S.revOf(d, 'guest').revealedAt) : !!d.revealedAt;
  }

  /**
   * Nach der letzten Freigabe eines Geräts bleibt es noch BOARD_HOLD_MS auf der Tafel – gezählt ab dem Ende der großen
   * Einblendung (FLASH_MS), damit die Wertungen des Geräts danach frei zu sehen sind; ohne Einblendung (Landesliga,
   * letzte Übung „kein Turner“) ab der Freigabe.
   */
  var BOARD_HOLD_MS = 10000;

  /**
   * Letzte (erste) Freigabe am Gerät: Zeitpunkt und ob dazu eine große Einblendung kam – in der Landesliga nicht bei
   * „kein Turner“ (siehe classicBoardFlash), in der Oberliga immer (das ganze Duell wird eingeblendet).
   */
  function appLastRelease(m, key) {
    var res = { at: '', flash: false };
    m.apparatus[key].duels.forEach(function (d) {
      (isClassic(m) ? ['home', 'guest'] : [null]).forEach(function (k) {
        var u = k ? S.revOf(d, k) : d;
        var t = u.firstRevealedAt || u.revealedAt;
        if (t && t > res.at) res = { at: t, flash: !(k && u.shown && u.shown.dns) };
      });
    });
    return res;
  }

  /**
   * Gerät der Anzeigetafel:
   * 1. Ist an einem Gerät schon freigegeben, aber noch nicht alles, steht die Tafel fest auf diesem Gerät
   *    (bei mehreren – etwa einer vergessenen Freigabe – auf dem mit der letzten Freigabe).
   * 2. Nach der letzten Freigabe eines Geräts bleibt es nach der großen Einblendung noch BOARD_HOLD_MS stehen (Zeit zum Lesen).
   * 3. Sonst folgt die Tafel dem zuletzt gewählten Gerätereiter (m.display.tab), ohne Auswahl dem ersten Gerät.
   *    Gesperrt wird dabei nichts; der frühere Gerätestart (m.started) wird nicht mehr beachtet.
   */
  function boardApparatus(m) {
    var open = null, openAt = '', last = null, lastAt = '', lastFlash = false;
    S.APPARATUS.forEach(function (a) {
      var rel = appLastRelease(m, a.key), at = rel.at;
      if (!at) return;
      var done = m.apparatus[a.key].duels.every(function (d) { return rowRevealed(m, d); });
      if (!done && at > openAt) { open = a; openAt = at; }
      if (at > lastAt) { last = a; lastAt = at; lastFlash = rel.flash; }
    });
    if (open) return open;
    if (last && Date.now() - Date.parse(lastAt) < (lastFlash ? FLASH_MS : 0) + BOARD_HOLD_MS) return last;
    // Ältere Wettkämpfe ohne gemerkten Reiter: das Gerät mit der letzten Freigabe.
    var key = m.display && m.display.tab;
    return S.APPARATUS.filter(function (a) { return a.key === key; })[0] || last || S.APPARATUS[0];
  }

  /**
   * Eine Seite der Detailkarte. Alle Zeilen haben einen festen Platz (auch wenn leer),
   * damit sich die Größe nicht ändert; der Standbonus steht in der Zeile der D-Note.
   * prev (optional): vorheriger Stand für die Korrekturanzeige (alt durchgestrichen).
   */
  function duelSideHtml(m, s, sideKey, won, prev) {
    var c = sideColor(m, sideKey);
    var out = s.dns || s.zero;
    function cell(now, before) {
      return (before !== undefined && before !== now ? '<s>' + before + '</s> ' : '') + now;
    }
    function dText(x) { return x.dns || x.zero ? '–' : fmt1(x.d) + (x.bonus ? ' <small>+0,1</small>' : ''); }
    function eText(x) { return x.dns || x.zero ? '–' : fmt(S.eScore(x, m.rules)); }
    function ndText(x) { return x.nd && !x.dns && !x.zero ? '−' + fmt1(x.nd) : ''; }
    var p = prev ? Object.assign(S.emptySide(), prev) : null;
    var nd = ndText(s), ndBefore = p ? ndText(p) : undefined;
    return '<div class="cd-side" style="--team:' + boardTone(m, sideKey) + '">' +
      '<div class="cd-name">' + esc(gymnastLabel(s.number, s.name) || '–') +
      (s.dns ? ' <span class="cd-tag">nicht angetreten</span>' : s.zero ? ' <span class="cd-tag">Wertung 0,00</span>' : '') + '</div>' +
      '<div class="cd-row"><span>D-Note' + (s.bonus && !out ? ' <small class="sb">+SB</small>' : '') + '</span><strong>' + cell(dText(s), p ? dText(p) : undefined) + '</strong></div>' +
      '<div class="cd-row"><span>E-Note</span><strong>' + cell(eText(s), p ? eText(p) : undefined) + '</strong></div>' +
      '<div class="cd-row nd' + (nd || ndBefore ? '' : ' empty') + '"><span>Neutr. Abzug</span><strong>' + cell(nd || '–', ndBefore === undefined ? undefined : (ndBefore || '–')) + '</strong></div>' +
      '<div class="cd-final' + (won ? ' win' : '') + '"><span>Endnote</span><strong>' +
      cell(fmt(S.sideFinal(s, m.rules)), p ? fmt(S.sideFinal(p, m.rules)) : undefined) + '</strong></div></div>';
  }

  /** Unsichtbarer Platzhalter gleicher Größe (die Karte behält ihre Maße). */
  function ghostSideHtml(m, sideKey) {
    return duelSideHtml(m, S.emptySide(), sideKey, false).replace('class="cd-side"', 'class="cd-side ghost"');
  }

  /** Mitte der Landesliga-Karte bleibt leer (die Summen stehen in Liste und Tabelle). */
  function classicCardMiddle() {
    return '<div class="cd-pts none"></div>';
  }

  /** Oberliga-Karte: Scorepunkte des Duells als einzelne Zahl in der Farbe des Siegers (Unentschieden: schwarze bzw. weiße 0). */
  function duelPointsBig(m, res) {
    if (res.winner === 'draw') return '<span class="sp-num draw0">0</span>';
    return pts(m, res.winner, res.winner === 'home' ? res.homePoints : res.guestPoints, true);
  }

  /**
   * Landesliga: Detailkarte der zuletzt geturnten Übung. Sie steht auf der Seite
   * ihrer Mannschaft, die andere Seite bleibt leer; in der Mitte die Gerätesummen.
   */
  function currentExerciseCard(m, view, r) {
    var latest = latestPerformed(m);
    if (!latest.appKey) {
      return '<div class="cur-duel empty"><div class="cd-head">&nbsp;</div><div class="cd-grid">' +
        duelSideHtml(m, S.emptySide(), 'home', false) + classicCardMiddle() +
        duelSideHtml(m, S.emptySide(), 'guest', false) + '</div><div class="cd-empty">Noch keine Wertung angezeigt</div></div>';
    }
    var k = latest.side;
    var s = view.apparatus[latest.appKey].duels[latest.idx][k];
    var struck = r.apparatus[latest.appKey][k].struck.indexOf(latest.idx) >= 0;
    var card = duelSideHtml(m, s, k, true);
    if (struck) card = card.replace('<div class="cd-final', '<div class="cd-final struck');
    return '<div class="cur-duel"><div class="cd-head">' + apparatusName(latest.appKey) + ' · ' + S.classicPosition(m, latest.appKey, latest.idx, k) + '. Übung</div>' +
      '<div class="cd-grid">' + (k === 'home' ? card : ghostSideHtml(m, 'home')) + classicCardMiddle() +
      (k === 'guest' ? card : ghostSideHtml(m, 'guest')) + '</div></div>';
  }

  /** Name in der Liste der Tafel: „–“ nur bei „nicht angetreten“, sonst leer, solange kein Turner gewählt ist. */
  /**
   * Name auf der Tafel. live (optional): die noch nicht freigegebene Eingabe – wie ein gewählter Name erscheint auch
   * „kein Turner“ sofort als „–“ (nur in der Anzeige; gezählt wird erst mit der Freigabe).
   */
  function boardName(side, live) {
    return side.dns || (live && live.dns) ? '–' : esc(gymnastLabel(side.number, side.name) || '');
  }

  /** Noch nicht freigegebene Eingabe einer Übung (sonst null) – für boardName. */
  function boardLive(m, appKey, idx, k) {
    return sideShown(m, appKey, idx, k) ? null : m.apparatus[appKey].duels[idx][k];
  }

  /** Landesliga: Wertungen des laufenden Geräts je Startpaar, Streichwertung blass und durchgestrichen. */
  function classicBoardDetail(m, view, r, current) {
    var app = view.apparatus[current.key];
    var ar = r.apparatus[current.key];
    function val(k, i) {
      var v = ar[k].values[i];
      if (v === null) return '';
      return ar[k].struck.indexOf(i) >= 0 ? '<span class="struck-val"><s>' + fmt(v) + '</s></span>'
        : '<span class="team-val" style="color:' + boardTone(m, k) + '">' + fmt(v) + '</span>';
    }
    function name(k, d, right, i) {
      return '<td class="bn' + (right ? ' right' : '') + '" style="--team:' + boardTone(m, k) + '">' + boardName(d[k], boardLive(m, current.key, i, k)) + '</td>';
    }
    return '<div class="board-detail"><h3>' + appIcon(current.key, 'bd-ico') + current.name + '</h3><table class="board-duels classic">' +
      app.duels.map(function (d, i) {
        return '<tr>' + name('home', d, false, i) + '<td class="num">' + val('home', i) + '</td><td></td>' +
          '<td class="num">' + val('guest', i) + '</td>' + name('guest', d, true, i) + '</tr>';
      }).join('') +
      '<tr class="bsum"><td class="sum-lbl">Summe (beste ' + m.rules.counting + ')</td><td class="num">' + teamValue(m, ar, 'home', true) + '</td><td></td>' +
      '<td class="num">' + teamValue(m, ar, 'guest', true) + '</td><td class="sum-lbl right">Summe (beste ' + m.rules.counting + ')</td></tr>' +
      '</table></div>';
  }

  /** Detailkarte des zuletzt geturnten Duells (nach einer Korrektur bleibt es beim letzten Duell). */
  function currentDuelCard(m, view) {
    var latest = latestPerformed(m);
    if (!latest.appKey) {
      // Gleiche Größe wie eine gefüllte Karte: Platzhalter unsichtbar, Hinweis darüber.
      return '<div class="cur-duel empty"><div class="cd-head">&nbsp;</div><div class="cd-grid">' +
        duelSideHtml(m, S.emptySide(), 'home', false) + '<div class="cd-pts single">' + pts(m, 'home', 0, true) + '</div>' +
        duelSideHtml(m, S.emptySide(), 'guest', false) + '</div><div class="cd-empty">Noch keine Wertung angezeigt</div></div>';
    }
    var duel = view.apparatus[latest.appKey].duels[latest.idx];
    var res = S.duelResult(duel, m.rules);
    return '<div class="cur-duel"><div class="cd-head">' + apparatusName(latest.appKey) + ' · Duell ' + (latest.idx + 1) + '</div>' +
      '<div class="cd-grid">' + duelSideHtml(m, duel.home, 'home', res.winner === 'home') +
      '<div class="cd-pts single">' + duelPointsBig(m, res) + '</div>' +
      duelSideHtml(m, duel.guest, 'guest', res.winner === 'guest') + '</div></div>';
  }

  function boardOn(m) {
    return !(m.display && m.display.board === false);
  }

  /** Kleiner Hinweis unter dem Mannschaftsnamen; schwebt im freien Platz neben dem Stand und verändert die Aufteilung nicht. */
  function boardDeduction(m, side) {
    var v = deductionOf(m, side);
    return v ? '<span class="board-ded">inkl. Abzug −' + fmt(v) + '</span>' : '';
  }

  function viewBoard(m) {
    if (!boardOn(m)) {
      return '<div class="board board-standby">' +
        '<div class="standby"><img src="icons/icon.svg" alt="" width="120" height="120"><div>' + esc(matchLeague(m).name) + '</div></div></div>';
    }
    var view = S.revealedView(m);
    var r = S.matchResult(view);
    var current = boardApparatus(m);
    var homeColor = boardTone(m, 'home'), guestColor = boardTone(m, 'guest');
    var rows = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<tr class="' + (current && current.key === a.key ? 'current' : '') + '"><td>' + appIcon(a.key, 'bt-ico') + a.name + '</td>' +
        '<td class="num">' + (ar.started ? teamValue(m, ar, 'home', true) : '') + '</td><td class="num">' + (ar.started ? teamValue(m, ar, 'guest', true) : '') + '</td></tr>';
    }).join('');

    var detail = '';
    if (current && isClassic(m)) detail = classicBoardDetail(m, view, r, current);
    else if (current) {
      var app = view.apparatus[current.key];
      var ar = r.apparatus[current.key];
      detail = '<div class="board-detail"><h3>' + appIcon(current.key, 'bd-ico') + current.name + '</h3><table class="board-duels">' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          return '<tr><td class="bn ' + (dr.winner === 'home' ? 'win' : '') + '" style="--team:' + homeColor + '">' + boardName(d.home, boardLive(m, current.key, i, 'home')) + '</td>' +
            '<td class="num">' + (dr.home === null ? '' : fmt(dr.home)) + '</td>' +
            '<td class="num pts">' + (dr.complete ? ptsPair(m, dr.homePoints, dr.guestPoints, true, ' : ') : '') + '</td>' +
            '<td class="num mirror">' + (dr.guest === null ? '' : fmt(dr.guest)) + '</td>' +
            '<td class="bn right ' + (dr.winner === 'guest' ? 'win' : '') + '" style="--team:' + guestColor + '">' + boardName(d.guest, boardLive(m, current.key, i, 'guest')) + '</td></tr>';
        }).join('') +
        '<tr class="bsum"><td class="sum-lbl">Summe Scorepunkte</td><td></td><td class="num pts">' + ptsPair(m, ar.homePoints, ar.guestPoints, true, ' : ') + '</td>' +
        '<td></td><td class="sum-lbl right">Summe Scorepunkte</td></tr>' +
        '</table></div>';
    }

    return '<div class="board" data-app="' + current.key + '">' +
      '<div class="board-title">' + esc([matchLeague(m).name, fmtDate(m.date)].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="board-score">' +
      '<div class="board-team" style="color:' + homeColor + '">' + teamHtml(m.homeTeamId) + boardDeduction(m, 'home') + '</div>' +
      '<div class="board-big' + (isClassic(m) ? ' sums' : '') + '">' + totalPair(m, r, true) + '</div>' +
      '<div class="board-team" style="color:' + guestColor + '">' + teamHtml(m.guestTeamId) + boardDeduction(m, 'guest') + '</div></div>' +
      '<div class="board-grid"><table class="board-table"><thead><tr><th>Gerät</th><th class="num">Heim</th><th class="num">Gast</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr class="gp-row"><td>Gerätepunkte</td><td class="num"><span class="sp-num">' + r.homeApp + '</span></td><td class="num"><span class="sp-num">' + r.guestApp + '</span></td></tr></tfoot></table>' +
      '<div>' + (isClassic(m) ? currentExerciseCard(m, view, r) : currentDuelCard(m, view)) + detail + '</div></div>' +
      '</div>' + boardScorers(m, view) + '<div id="fall-box">' + fallBoxHtml(m) + '</div>' +
      '<div id="intro-box">' + introBoxHtml(m) + '</div>';
  }

  /**
   * Einturnzeit und Pause erscheinen in der Detailkarte der Tafel (Liste und Tabelle bleiben sichtbar);
   * nach Ablauf kurz „Einturnen beendet“ bzw. „Zeit abgelaufen“. Liefert den Inhalt der Karte oder ''.
   */
  function timerCardInner(m) {
    var warm = warmupState(m), p = pauseState(m), t = m.timers || {};
    function card(title, body) { return '<div class="tm-title">' + title + '</div>' + body; }
    // Während der Wettkampfpause wird schon das nächste Gerät eingeturnt – daher „Wettkampfpause und Einturnen“.
    var PT = 'Wettkampfpause und Einturnen';
    if (warm) return card('Einturnen', '<div class="tm-clock">' + fixedDigits(clock(warm.remaining)) + '</div>');
    if (p) return card(PT, '<div class="tm-clock">' + fixedDigits(clock(p.remaining)) + '</div>');
    if (timerEnded(t.warmup, WARMUP_MS, WARMUP_END_MS)) return card('Einturnen', '<div class="tm-clock tm-end">Einturnen beendet</div>');
    if (t.pause && timerEnded(t.pause, t.pause.ms, PAUSE_END_MS)) return card(PT, '<div class="tm-clock tm-end">Zeit abgelaufen</div>');
    return '';
  }

  /** Große Zeitanzeige: jede Ziffer auf festem Platz, damit die Zahl beim Herunterzählen nicht hin und her springt. */
  function fixedDigits(text) {
    return text.split('').map(function (c) {
      return '<span class="' + (/\d/.test(c) ? 'dg' : 'dg-sep') + '">' + c + '</span>';
    }).join('');
  }

  /** Sturz-Timer groß als Fenster über der Tafel (wie die Wettkampfpause): 30 s gelb, dann 30 s rot mit „Abzug 0,3“, danach kurz „Übung beendet“. */
  function fallBoxHtml(m) {
    var fall = fallState(m);
    var fEnd = !fall && timerEnded(m.timers && m.timers.fall, 2 * FALL_PHASE_MS, FALL_END_MS);
    if (!fall && !fEnd) return '';
    var t = fall ? fall.t : m.timers.fall, d = m.apparatus[t.appKey].duels[t.idx][t.side];
    var name = esc(gymnastLabel(d.number, d.name) || teamName(t.side === 'home' ? m.homeTeamId : m.guestTeamId));
    return '<div class="pause-overlay fall-overlay"><div class="pause-win fall-win ' + (fall ? 'phase' + fall.phase : 'ended') + '">' +
      '<div class="fw-name">' + appIcon(t.appKey, 'tm-ico') + (fall ? 'Sturz · ' : '') + name + '</div>' +
      (fall ? '<div class="pw-clock ' + fallTone(fall) + '">' + fixedDigits(secs(fall.remaining)) + '</div>' : '<div class="pw-clock pw-end">Übung beendet</div>') +
      '<div class="fw-note' + (fall && fall.phase === 2 ? '' : ' hide') + '">Abzug 0,3</div></div></div>';
  }

  /** Farbe der Sekunden: 0–10 s schwarz (dunkle Tafel weiß), 10–20 s ocker, ab 20 s rot, 50–60 s zusätzlich leicht blinkend. */
  function fallTone(fall) {
    return ['fz-0', 'fz-1', 'fz-2', 'fz-2', 'fz-2', 'fz-2 fz-pulse'][Math.min(5, fall.step)];
  }

  // ---------- Turnervorstellung ----------
  // Seiten: Titel Gast, Gastturner (nach Startnummer), Titel Heim, Heimturner, Kampfgericht.
  // Der Stand (Seitennummer oder null) steht in m.display.intro und wird wie alles andere synchronisiert.

  function introPages(m) {
    var pages = [];
    ['guest', 'home'].forEach(function (side) {
      var t = team(side === 'home' ? m.homeTeamId : m.guestTeamId);
      var lineup = m.lineup && m.lineup[side];
      var gyms = (t ? t.gymnasts : []).filter(function (g) { return g.name && (!lineup || lineup.indexOf(g.id) >= 0); })
        .sort(function (a, b) { return a.number - b.number; });
      pages.push({ side: side, count: gyms.length });
      gyms.forEach(function (g, i) { pages.push({ side: side, gym: g, pos: i + 1, count: gyms.length }); });
    });
    pages.push({ judges: true });
    return pages;
  }

  function introStep(m) {
    var s = m && m.display && m.display.intro;
    return typeof s === 'number' ? s : -1;
  }

  function introOn(m) {
    return introStep(m) >= 0;
  }

  /** Während der Turnervorstellung sind keine anderen Fenster auf der Tafel möglich. */
  function introBlocks(m) {
    if (!introOn(m)) return false;
    toast('Erst die Turnervorstellung beenden.', 'error');
    return true;
  }

  /**
   * Kampfgericht für die Tafel: E1 ist Oberkampfrichter, ein neutraler E2 ohne Verein.
   * Vereinskampfrichter ohne Nummer, nach Verein geordnet; wer für seinen Verein D und E wertet, steht einmal als „D/E“.
   */
  function introJudgeRows(m) {
    var j = m.judges || {}, three = S.eJudgeCount(m.rules) === 3;
    var rows = [];
    function add(role, name, side, gap) {
      if (name) rows.push('<tr' + (gap ? ' class="gap"' : '') + '><td>' + role + '</td><td>' + esc(name) + '</td><td class="r">' +
        (side ? teamHtml(side === 'home' ? m.homeTeamId : m.guestTeamId) : '') + '</td></tr>');
    }
    add('E1/OK', j.e1);
    if (!three) add('E2', j.e2);
    ['home', 'guest'].forEach(function (side) {
      var e = three ? (side === 'home' ? j.e2 : j.e3) : '', d = side === 'home' ? j.d1 : j.d2;
      var n = rows.length;
      if (e && d && e.trim().toLowerCase() === d.trim().toLowerCase()) add('D/E', d, side, true);
      else { add('E', e, side, true); add('D', d, side, rows.length === n); }
    });
    return rows;
  }

  /** Fenster der Turnervorstellung – auf der Tafel und, mit ◀ ▶ ■ unten im Fenster, gleich groß im Eingabefenster. */
  function introBoxHtml(m, withControls) {
    var step = introStep(m);
    if (step < 0) return '';
    var pages = introPages(m), p = pages[Math.min(step, pages.length - 1)];
    var body;
    if (p.judges) {
      var rows = introJudgeRows(m);
      body = '<div class="tv-big-team tv-fit tv-kg">Kampfgericht</div>' +
        (rows.length ? '<table class="tv-judges' + (rows.length > 4 ? ' many' : '') + '">' + rows.join('') + '</table>' : '');
    } else {
      // Ohne Umbruch nach „/“: fitIntro verkleinert lange Namen, bis sie in einer Zeile passen.
      var color = boardTone(m, p.side), name = esc(teamName(p.side === 'home' ? m.homeTeamId : m.guestTeamId));
      if (p.gym) {
        body = '<div class="tv-team tv-fit" style="color:' + color + '">' + name + '</div>' +
          '<div class="tv-num" style="color:' + color + '">' + p.gym.number + '</div><div class="tv-name tv-fit">' + esc(p.gym.name) + '</div>';
      } else {
        var cap = m.captains && m.captains[p.side];
        body = '<div class="tv-label">' + (p.side === 'home' ? 'Heimmannschaft' : 'Gastmannschaft') + '</div>' +
          '<div class="tv-big-team tv-fit" style="color:' + color + '">' + name + '</div>' +
          (cap ? '<div class="tv-cap">Mannschaftsführer: <b>' + esc(cap) + '</b></div>' : '') +
          '<div class="tv-count">' + p.count + ' Turner</div>';
      }
    }
    var ctl = withControls ? '<div class="tv-ctl-bar"><span class="tv-ctl" role="group" aria-label="Turnervorstellung">' +
      '<button class="btn" data-action="intro-step" data-dir="-1" aria-label="Zurück" title="Zurück"' + (step === 0 ? ' disabled' : '') + '>◀</button>' +
      '<button class="btn primary" data-action="intro-step" data-dir="1" aria-label="Weiter" title="Weiter">▶</button>' +
      '<button class="btn tv-end" data-action="intro-end" aria-label="Beenden" title="Beenden">■</button></span></div>' : '';
    return '<div class="pause-overlay tv-overlay' + (withControls ? ' app-tv' + (boardLight(m) ? ' tv-light' : '') : '') + '"><div class="pause-win tv-win"><div class="tv-top"><span>Turnervorstellung</span><span>' +
      (Math.min(step, pages.length - 1) + 1) + ' / ' + pages.length + '</span></div><div class="tv-body">' + body + '</div>' + ctl + '</div></div>';
  }

  /** Lange Mannschafts- und Turnernamen so weit verkleinern, dass sie in einer Zeile ins Fenster passen. */
  function fitIntro() {
    document.querySelectorAll('.tv-win .tv-fit').forEach(function (el) {
      el.style.fontSize = '';
      for (var n = 0; n < 30 && el.scrollWidth > el.clientWidth + 1; n++) {
        el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * 0.94) + 'px';
      }
    });
  }

  /** Knopf im Menüband bzw. Menü „Anzeigetafel“; läuft die Vorstellung, liegt ihr Fenster mit ◀ ▶ ■ über der ganzen Seite. */
  function introControls(m) {
    return '<button class="btn toggle' + (introOn(m) ? ' on' : '') + '" data-action="intro-start"><span class="ml">Turnervorstellung</span><span class="ms">Vorstellung</span></button>';
  }

  function refreshIntro(m) {
    var el = $app.querySelector('[data-out="intro"]');
    if (el) el.innerHTML = introControls(m);
    showAppScorers(m);
    showAppIntro(m);
  }

  /** Fenster der Turnervorstellung im Eingabefenster zeigen bzw. schließen; ▶ bekommt den Fokus (Leertaste/Enter = weiter). */
  function showAppIntro(m) {
    var box = document.getElementById('app-intro');
    if (!box) return;
    var html = introBoxHtml(m, true);
    if (box.getAttribute('data-sig') !== html) { box.setAttribute('data-sig', html); box.innerHTML = html; }
    document.body.classList.toggle('intro-open', !!html);
    if (!html) return;
    fitIntro();
    var next = box.querySelector('[data-action="intro-step"][data-dir="1"]');
    if (next && document.activeElement !== next) next.focus({ preventScroll: true });
  }

  /** Seite setzen (null = beenden), speichern und die eigene Ansicht nachziehen – die andere folgt über die Synchronisation. */
  function introSet(m, step) {
    m.display = m.display || {};
    m.display.intro = step;
    if (step !== null) m.display.scorers = false;
    save('matches', m).then(function () {
      if (document.body.classList.contains('board-mode')) { keepScroll = true; render(); }
      else { refreshIntro(m); refreshDisplayButtons(m); }
    });
  }

  /** Eine Seite vor oder zurück; hinter der letzten Seite (Kampfgericht) endet die Vorstellung. */
  function introGo(m, dir) {
    var step = introStep(m);
    if (step < 0) return;
    var next = Math.max(0, step + dir);
    introSet(m, next >= introPages(m).length ? null : next);
  }

  /**
   * Fenster „Wettkampfergebnis“ (während des Wettkampfs „Zwischenstand“) auf der Tafel:
   * Stand, Gerätepunkte und Topscorer – nur angezeigte Wertungen, per Knopf ein-/ausschaltbar.
   */
  function boardScorers(m, view) {
    if (!(m.display && m.display.scorers)) return '';
    var r = S.matchResult(view);
    var list = S.topScorers(view, 3);
    var classic = isClassic(m);
    return '<div class="scorer-overlay"><div class="so-box"><div class="so-title">' + (r.complete ? 'Wettkampfergebnis' : 'Zwischenstand') + '</div>' +
      '<div class="so-result"><div class="t" style="color:' + boardTone(m, 'home') + '">' + teamHtml(m.homeTeamId) + '</div>' +
      '<div class="big">' + totalPair(m, r, true) + '</div>' +
      '<div class="t" style="color:' + boardTone(m, 'guest') + '">' + teamHtml(m.guestTeamId) + '</div></div>' +
      '<div class="so-sub">Gerätepunkte ' + r.homeApp + ':' + r.guestApp + (r.complete ? ' · Wettkampfpunkte ' + r.homeMatch + ':' + r.guestMatch : '') + (deductionsText(m) ? ' · ' + esc(deductionsText(m)) : '') + '</div>' +
      '<div class="so-title so-h">Topscorer</div>' +
      (list.length ? '<table class="so-table">' + list.map(function (x) {
        return '<tr><td class="so-rank">' + x.rank + '.</td><td class="so-name">' + esc(gymnastLabel(x.number, x.name) || '–') +
          '<small>' + teamHtml(x.team === 'home' ? m.homeTeamId : m.guestTeamId) + '</small></td><td class="so-app">' + x.starts + (x.starts === 1 ? ' Gerät' : ' Geräte') + '</td>' +
          '<td class="so-pts">' + pts(m, x.team, classic ? fmt(x.points) : x.points, true) + '</td></tr>';
      }).join('') + '</table>' : '<div class="so-empty">' + (classic ? 'Noch keine Wertungen' : 'Noch keine Scorepunkte') + '</div>') + '</div></div>';
  }

  /**
   * Anzeigetafel ohne Scrollbalken ins Fenster einpassen (misst die tatsächlich dargestellte Größe).
   * Bleibt Platz, wird sie vergrößert, damit alle Schriften so groß wie möglich sind.
   */
  function fitBoard() {
    var b = document.querySelector('.board');
    if (!b || b.classList.contains('board-standby')) return;
    // Feste Aufteilung per CSS; hier nur lange Namen einpassen und im Notfall alles etwas verkleinern.
    var k = 1;
    for (var i = 0; i < 12; i++) {
      b.style.setProperty('--k', k);
      fitNames(b);
      evenRows(b);
      if (!boardOverflows(b) || k <= 0.6) break;
      k = Math.round((k - 0.04) * 100) / 100;
    }
    // Notfall bei sehr kleinem Fenster: lieber scrollen als abschneiden.
    b.style.overflowY = boardOverflows(b) ? 'auto' : '';
    fitResultBox();
  }

  /** Alle Zeilen der Duell- bzw. Übungsliste gleich hoch – egal ob schon Turner oder Wertungen darin stehen. */
  function evenRows(b) {
    var t = b.querySelector('.board-duels');
    if (!t) return;
    var rows = t.querySelectorAll('tr');
    rows.forEach(function (tr) { tr.style.height = ''; });
    // Passt der Inhalt nicht in gleich hohe Zeilen, wird die Tafel insgesamt verkleinert (fitBoard).
    var each = t.getBoundingClientRect().height / rows.length;
    rows.forEach(function (tr) { tr.style.height = each + 'px'; });
    // Linke Tabelle: Zeile „Gerätepunkte“ so hoch wie die Summenzeile daneben, die Geräte teilen sich den Rest.
    var lt = b.querySelector('.board-table');
    if (!lt || getComputedStyle(lt).display !== 'table') return;
    var gp = lt.querySelector('.gp-row'), body = lt.querySelectorAll('tbody tr');
    body.forEach(function (tr) { tr.style.height = ''; });
    gp.style.height = each + 'px';
    var rest = lt.getBoundingClientRect().height - lt.querySelector('thead').getBoundingClientRect().height - each;
    body.forEach(function (tr) { tr.style.height = (rest / body.length) + 'px'; });
  }

  // Vollbild per Doppelklick irgendwo auf die Tafel; solange kein Vollbild, kurz ein Hinweis.
  function toggleFullscreen() {
    var d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }

  var fsHintTimer = null;
  function showFullscreenHint() {
    if (!document.body.classList.contains('board-mode') || document.fullscreenElement || document.webkitFullscreenElement) return;
    var el = document.getElementById('fs-hint');
    if (!el) { el = document.createElement('div'); el.id = 'fs-hint'; el.textContent = 'Doppelklick für Vollbild'; document.body.appendChild(el); }
    el.classList.add('show');
    clearTimeout(fsHintTimer);
    fsHintTimer = setTimeout(function () { el.classList.remove('show'); }, 4000);
  }

  document.addEventListener('dblclick', function () {
    if (document.body.classList.contains('board-mode')) toggleFullscreen();
  });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      var h = document.getElementById('fs-hint');
      if (document.fullscreenElement || document.webkitFullscreenElement) { if (h) h.classList.remove('show'); }
      else showFullscreenHint();
    });
  });

  /** Zu lange Namen in der Karte werden nur in ihrem eigenen Feld kleiner (höchstens auf 60 %). */
  function fitNames(b) {
    b.querySelectorAll('.cd-name').forEach(function (el) {
      el.style.fontSize = '';
      if (el.scrollWidth <= el.clientWidth + 1) return;
      var base = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = Math.max(base * 0.6, base * el.clientWidth / el.scrollWidth * 0.98) + 'px';
    });
  }

  function boardOverflows(b) {
    if (b.scrollHeight > b.clientHeight + 1 || b.scrollWidth > b.clientWidth + 1) return true;
    return [].some.call(b.querySelectorAll('.board-grid > *, .board-detail'), function (el) { return el.scrollHeight > el.clientHeight + 1; });
  }

  /** Das Ergebnis-Fenster liegt über der Tafel (nicht mitverkleinert) und schrumpft nur, wenn es sonst nicht passt. */
  function fitResultBox() {
    var box = document.querySelector('.so-box');
    if (!box) return;
    box.style.zoom = '';
    var over = Math.max(box.getBoundingClientRect().height / (window.innerHeight * 0.96), box.getBoundingClientRect().width / (window.innerWidth * 0.98));
    if (over > 1) box.style.zoom = 1 / over;
  }
  /** Wettkampfergebnis-Fenster: bei vielen Topscorern oder kleinen Bildschirmen als Ganzes verkleinern statt abschneiden. */
  function fitScorers() {
    var box = document.querySelector('.so-box');
    if (!box) return;
    box.style.transform = '';
    var rc = box.getBoundingClientRect();
    var k = Math.min(1, innerHeight * 0.96 / rc.height, innerWidth * 0.98 / rc.width);
    if (k < 1) box.style.transform = 'scale(' + k.toFixed(3) + ')';
  }

  /** Der fixierte obere Bereich der Wettkampfseite schließt direkt an die App-Leiste an. */
  function syncTopbarHeight() {
    var tb = document.querySelector('.topbar');
    if (!tb) return;
    var rb = document.querySelector('.tb-ribbon');
    var rbh = rb && ribbonMode() ? rb.offsetHeight : 0;
    document.documentElement.style.setProperty('--bar-h', tb.offsetHeight + 'px');
    document.documentElement.style.setProperty('--topbar-h', (tb.offsetHeight + rbh) + 'px');
  }

  window.addEventListener('resize', function () { fitBoard(); fitIntro(); fitScorers(); syncTopbarHeight(); fitFieldLabels(); fitDlgFont(); });

  /** Nach jedem Aufbau der Anzeigetafel prüfen, ob eine neue Wertung freigegeben wurde. */
  function checkBoardFlash(m) {
    var latest = latestReveal(m);
    if (state.board.matchId !== m.id) {
      // Beim Öffnen der Tafel keine bereits gezeigten Wertungen erneut einblenden.
      state.board = { matchId: m.id, lastReveal: latest.at };
      showFullscreenHint();
      return;
    }
    if (!latest.at || latest.at <= state.board.lastReveal) return;
    state.board.lastReveal = latest.at;
    if (isClassic(m)) { classicBoardFlash(m, latest); return; }
    var raw = m.apparatus[latest.appKey].duels[latest.idx];
    var duel = S.revealedView(m).apparatus[latest.appKey].duels[latest.idx];
    var res = S.duelResult(duel, m.rules);
    if (!res.complete) return;
    if (raw.revealKind === 'correction') { showCorrection(m, latest.appKey, latest.idx, duel, raw.prevShown); return; }
    var points = res.winner === 'home' ? res.homePoints : res.winner === 'guest' ? res.guestPoints : 0;
    var w = res.winner === 'draw' ? null : res.winner;
    showFlash(points, w ? boardTone(m, w) : '', false, !w, w ? flashWho(m, duel[w], w) : null);
  }

  /** Kopf der großen Einblendung: Startnummer und Name des Turners, darunter kleiner seine Mannschaft. */
  function flashWho(m, side, k) {
    return { name: gymnastLabel(side.number, side.name) || teamName(k === 'home' ? m.homeTeamId : m.guestTeamId),
      team: gymnastLabel(side.number, side.name) ? teamName(k === 'home' ? m.homeTeamId : m.guestTeamId) : '' };
  }

  /** Landesliga: neue Endnote 10 Sekunden groß in Mannschaftsfarbe mit Turner darüber, Korrekturen 10 Sekunden. */
  function classicBoardFlash(m, latest) {
    var k = latest.side;
    var rev = S.revOf(m.apparatus[latest.appKey].duels[latest.idx], k);
    var view = S.revealedView(m);
    var s = view.apparatus[latest.appKey].duels[latest.idx][k];
    var v = S.sideFinal(s, m.rules);
    if (v === null) return;
    if (rev.revealKind === 'correction') {
      var card = duelSideHtml(m, s, k, true, rev.prevShown);
      showOverlay('<div class="cd-head">' + apparatusName(latest.appKey) + ' · ' + S.classicPosition(m, latest.appKey, latest.idx, k) + '. Übung</div>' +
        '<div class="cd-grid">' + (k === 'home' ? card : ghostSideHtml(m, 'home')) + classicCardMiddle() +
        (k === 'guest' ? card : ghostSideHtml(m, 'guest')) + '</div>');
      return;
    }
    if (s.dns) return; // „nicht angetreten“: keine große Einblendung
    showFlash(fmt(v), boardTone(m, k), true, false, flashWho(m, s, k));
  }

  var correctionTimer = null;

  /** Korrigierte Wertung 10 Sekunden als Overlay über der Anzeigetafel zeigen (alt → neu). */
  function showCorrection(m, appKey, idx, duel, prev) {
    var res = S.duelResult(duel, m.rules);
    var prevRes = null;
    if (prev) {
      var old = { home: Object.assign(S.emptySide(), prev.home), guest: Object.assign(S.emptySide(), prev.guest) };
      prevRes = S.duelResult(old, m.rules);
    }
    function col(sideKey) {
      return duelSideHtml(m, duel[sideKey], sideKey, res.winner === sideKey, prev ? prev[sideKey] : null);
    }
    showOverlay('<div class="cd-head">' + apparatusName(appKey) + ' · Duell ' + (idx + 1) + '</div>' +
      '<div class="cd-grid">' + col('home') +
      '<div class="cd-pts">' + (prevRes && prevRes.complete ? '<div class="corr-old">' + prevRes.homePoints + ' : ' + prevRes.guestPoints + '</div>' : '') +
      ptsPair(m, res.homePoints, res.guestPoints, true) + '</div>' + col('guest') + '</div>');
  }

  /** Korrektur-Overlay 10 Sekunden über der Anzeigetafel. */
  function showOverlay(inner) {
    var el = document.getElementById('correction-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'correction-overlay';
      el.setAttribute('aria-live', 'assertive');
      document.body.appendChild(el);
    }
    el.innerHTML = '<div class="corr-box"><div class="corr-title">Korrektur</div>' + inner + '</div>';
    el.classList.add('show');
    clearTimeout(correctionTimer);
    correctionTimer = setTimeout(function () { el.classList.remove('show'); }, CORRECTION_MS);
  }

  var flashTimer = null;

  /** Neue Scorepunkte (bzw. Endnote, wide) 5 Sekunden bildschirmfüllend in der Mannschaftsfarbe zeigen. */
  function showFlash(points, color, wide, draw, who) {
    var el = document.getElementById('score-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'score-flash';
      el.setAttribute('aria-live', 'assertive');
      document.body.appendChild(el);
    }
    el.classList.toggle('wide', !!wide);
    // Darüber der Turner (Startnummer, Name, Mannschaft); bei Unentschieden nur „Unentschieden“.
    // Unentschieden: 0 und Text in Kontrastfarbe (schwarz bzw. weiß), damit sie sich von jeder Mannschaftsfarbe (auch Hellgrau) abhebt.
    var head = draw ? '<div class="sf-who"><div class="sf-name draw0">Unentschieden</div></div>'
      : who ? '<div class="sf-who"><div class="sf-name" style="color:' + color + '">' + esc(who.name) + '</div>' +
        (who.team ? '<div class="sf-team">' + esc(who.team) + '</div>' : '') + '</div>' : '';
    el.innerHTML = head + '<span class="sf-num' + (draw ? ' draw0' : '') + '"' + (draw ? '' : ' style="color:' + color + '"') + '>' + esc(String(points)) + '</span>';
    el.classList.remove('show');
    void el.offsetWidth; // Animation neu starten
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.classList.remove('show'); }, FLASH_MS);
  }

  // ---------- Timer (Sturz und Einturnzeit) ----------
  // Der Zustand liegt im Wettkampf (Startzeit), damit die Anzeigetafel ihn mitbekommt.
  // Abgelaufene Timer gelten automatisch als beendet und werden ausgeblendet.

  function fallState(m) {
    var t = m && m.timers && m.timers.fall;
    if (!t) return null;
    var el = Date.now() - t.start;
    if (el < 0 || el >= 2 * FALL_PHASE_MS) return null;
    var phase = el < FALL_PHASE_MS ? 1 : 2;
    // Abschnitt 0–5 je 10 Sekunden: Farbe der Zahl (schwarz/weiß, ocker, rot), im letzten Abschnitt leicht blinkend.
    return { t: t, phase: phase, step: Math.floor(el / 10000), remaining: phase * FALL_PHASE_MS - el };
  }

  function warmupState(m) {
    var t = m && m.timers && m.timers.warmup;
    if (!t) return null;
    var el = Date.now() - t.start;
    if (el < 0 || el >= WARMUP_MS) return null;
    return { t: t, remaining: WARMUP_MS - el };
  }

  function pauseState(m) {
    var t = m && m.timers && m.timers.pause;
    if (!t) return null;
    var el = Date.now() - t.start;
    if (el < 0 || el >= t.ms) return null;
    return { t: t, remaining: t.ms - el };
  }

  var WARMUP_END_MS = 5000, FALL_END_MS = 5000, PAUSE_END_MS = 5000;

  /** Kurz nach regulärem Ablauf (nicht nach manuellem Stopp) zeigt die Tafel einen Hinweis. */
  function timerEnded(t, duration, showMs) {
    if (!t) return false;
    var el = Date.now() - t.start;
    return el >= duration && el < duration + showMs;
  }

  /** Sturz-Timer: nur Sekunden (eine Phase dauert höchstens 30 Sekunden). */
  function secs(ms) {
    return String(Math.ceil(ms / 1000));
  }

  function clock(ms) {
    var sec = Math.ceil(ms / 1000);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function refreshDisplayButtons(m) {
    var t = $app.querySelector('[data-action="toggle-scorers"]');
    var son = !!(m.display && m.display.scorers);
    if (t) { if (t.innerHTML !== scorersLabel()) t.innerHTML = scorersLabel(); t.classList.toggle('on', son); }
    showAppScorers(m);
    refreshTopMenus(m);
    $app.querySelectorAll('[data-action="theme"]').forEach(function (b) {
      b.classList.toggle('on', (b.getAttribute('data-theme') === 'light') === boardLight(m));
    });
  }

  function tickTimers() {
    var r = route();
    var m = r.name === 'match' ? match(r.id) : null;
    if (!m) return;
    var fall = fallState(m), warm = warmupState(m);
    $app.querySelectorAll('[data-action="fall-timer"]').forEach(function (btn) {
      var on = !!fall && fall.t.appKey === btn.getAttribute('data-app') && String(fall.t.idx) === btn.getAttribute('data-duel') && fall.t.side === btn.getAttribute('data-side');
      // Laufend: Sekunden auf festem Platz, unsichtbar darunter die längste Beschriftung – der Knopf behält während des
      // ganzen Laufs seine Breite (am iPad blieben sonst Reste der alten Umrandung stehen); geblinkt wird nur die Zahl.
      var label = on ? '<span class="fall-lbl"><span>⏱ <b class="fs">' + secs(fall.remaining) + '</b>' + (fall.phase === 2 ? ' · Abzug 0,3' : '') + ' – Stopp</span>' +
        '<span class="sizer" aria-hidden="true">⏱ <b class="fs">00</b> · Abzug 0,3 – Stopp</span></span>' : 'Sturz-Timer';
      if (btn.innerHTML !== label) btn.innerHTML = label;
      btn.classList.toggle('t-fall1', on && fall.phase === 1);
      btn.classList.toggle('t-fall2', on && fall.phase === 2);
      ['fz-0', 'fz-1', 'fz-2', 'fz-pulse'].forEach(function (c) { btn.classList.toggle(c, on && fallTone(fall).split(' ').indexOf(c) >= 0); });
      if (btn.hasAttribute('data-off')) btn.disabled = !on;
    });
    // Einturnzeit und Wettkampfpause schließen sich gegenseitig aus: läuft einer der Timer, ist der andere Knopf gesperrt.
    var pause = pauseState(m);
    var wb = $app.querySelector('[data-action="warmup-timer"]');
    if (wb) {
      var wl = warmupLabel(warm);
      if (wb.innerHTML !== wl) wb.innerHTML = wl;
      wb.classList.toggle('t-running', !!warm);
      wb.disabled = !!pause;
    }
    var pb = $app.querySelector('[data-action="pause-timer"]');
    if (pb) {
      var pl = pauseLabel(pause);
      if (pb.innerHTML !== pl) pb.innerHTML = pl;
      pb.classList.toggle('t-running', !!pause);
      pb.disabled = !!warm;
    }
    if (r.name === 'match' && !r.sub) refreshTopMenus(m);
    var cd = document.querySelector('.board .cur-duel');
    if (cd) {
      var tc = cd.querySelector('.tm-card'), tin = timerCardInner(m);
      if (!tin) { if (tc) tc.remove(); }
      else if (!tc) cd.insertAdjacentHTML('beforeend', '<div class="tm-card">' + tin + '</div>');
      else if (tc.innerHTML !== tin) tc.innerHTML = tin;
    }
    var fbox = document.getElementById('fall-box');
    if (fbox) {
      var fbh = fallBoxHtml(m);
      if (fbox.innerHTML !== fbh) fbox.innerHTML = fbh;
    }
  }

  // ---------- Akustische Signale (Web Audio, ohne Tondateien – funktioniert offline) ----------
  // Ende Einturnzeit: Schelle 5 s. Sturz-Timer: nach 30 s kurzer Doppelton, nach 60 s kurzer Fehlerton.
  // Es tönt nur das Eingabefenster, nicht die Anzeigetafel (sonst käme jedes Signal doppelt).

  var audioCtx = null;

  function audio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // Browser geben Ton erst nach einer Bedienung frei – beim ersten Klick bzw. Tastendruck vorbereiten.
  ['pointerdown', 'keydown'].forEach(function (type) {
    document.addEventListener(type, function () { if (!document.body.classList.contains('board-mode')) audio(); }, true);
  });

  function tone(ctx, freq, type, start, dur, vol, out) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.setValueAtTime(vol, start + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(out || ctx.destination);
    o.start(start); o.stop(start + dur + 0.02);
  }

  var SOUNDS = {
    /** Elektrische Schelle: metallischer Klang, sehr schnell angeschlagen, 5 Sekunden. */
    bell: function (ctx) {
      var t0 = ctx.currentTime + 0.02, dur = 5;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      for (var t = 0; t < dur; t += 0.05) {
        g.gain.setValueAtTime(0.5, t0 + t);
        g.gain.exponentialRampToValueAtTime(0.06, t0 + t + 0.045);
      }
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.3);
      g.connect(ctx.destination);
      [[950, 0.5], [2204, 0.3], [4037, 0.15], [5600, 0.08]].forEach(function (p) {
        var o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sine'; o.frequency.value = p[0]; og.gain.value = p[1];
        o.connect(og); og.connect(g);
        o.start(t0); o.stop(t0 + dur + 0.35);
      });
    },
    /** Kurzer, deutlicher Doppelton (Sturz-Timer nach 30 s). */
    beep: function (ctx) {
      var t0 = ctx.currentTime + 0.05;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 4000; lp.connect(ctx.destination);
      [0, 0.3].forEach(function (d) {
        tone(ctx, 1046, 'square', t0 + d, 0.22, 0.3, lp);
        tone(ctx, 2093, 'sine', t0 + d, 0.22, 0.25);
      });
    },
    /** Kurzer Fehlerton, zwei absteigende Töne (Sturz-Timer nach 60 s). */
    error: function (ctx) {
      var t0 = ctx.currentTime + 0.02;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 2500; lp.connect(ctx.destination);
      tone(ctx, 466, 'square', t0, 0.2, 0.25, lp);
      tone(ctx, 311, 'square', t0 + 0.22, 0.4, 0.25, lp);
    }
  };

  function playSound(name) {
    if (window.WTB_SOUND_LOG) window.WTB_SOUND_LOG.push(name);
    var ctx = audio();
    if (ctx) SOUNDS[name](ctx);
  }

  var soundsPlayed = {};
  var keepAlive = null;

  /**
   * Solange ein Timer läuft, hält ein unhörbar leises Signal den Audioausgang wach.
   * Viele Geräte (Laptops, HDMI, Bluetooth) schalten ihn sonst nach Stille ab und
   * verschlucken beim Aufwachen den Anfang – bei kurzen Signalen den ganzen Ton.
   */
  function setKeepAlive(on) {
    if (on && !keepAlive) {
      var ctx = audio();
      if (!ctx) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 40;
      g.gain.value = 0.0005;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      keepAlive = o;
    } else if (!on && keepAlive) {
      try { keepAlive.stop(); } catch (e) { /* bereits gestoppt */ }
      keepAlive = null;
    }
  }

  /** Spielt jedes Signal genau einmal, wenn ein laufender Timer die jeweilige Grenze erreicht. */
  function checkTimerSounds() {
    if (document.body.classList.contains('board-mode')) return;
    var now = Date.now();
    var active = false;
    state.matches.forEach(function (m) {
      var tm = m.timers;
      if (!tm) return;
      if (tm.warmup && now - tm.warmup.start < WARMUP_MS + 6000) active = true;
      if (tm.fall && now - tm.fall.start < 2 * FALL_PHASE_MS + 3000) active = true;
      if (tm.pause && now - tm.pause.start < tm.pause.ms + 3000) active = true;
      [['warmup', WARMUP_MS, 'bell'], ['fall', FALL_PHASE_MS, 'beep'], ['fall', 2 * FALL_PHASE_MS, 'error'], ['pause', tm.pause && tm.pause.ms, 'error']].forEach(function (c) {
        var t = tm[c[0]];
        if (!t) return;
        var el = now - t.start;
        var key = m.id + '|' + c[0] + '|' + t.start + '|' + c[1];
        // Nur kurz nach dem Erreichen der Grenze (nicht beim späteren Öffnen der App).
        if (el >= c[1] && el < c[1] + 3000 && !soundsPlayed[key]) {
          soundsPlayed[key] = true;
          playSound(c[2]);
        }
      });
    });
    setKeepAlive(active);
  }

  /** Anzeigetafel: nach Ablauf der Haltezeit (letzte Freigabe eines Geräts) auf das nun gültige Gerät umschalten. */
  function checkBoardApparatus() {
    if (!document.body.classList.contains('board-mode')) return;
    var b = document.querySelector('.board[data-app]');
    var m = b && match(route().id);
    if (m && boardApparatus(m).key !== b.getAttribute('data-app')) render();
  }

  setInterval(function () { tickTimers(); checkTimerSounds(); checkBoardApparatus(); }, 250);

  // ---------- Ansicht: Protokoll ----------

  /** Kampfgericht, Mannschaftsführer und beginnende Mannschaft (beide Ligen). */
  function printPanel(m) {
    var three = S.eJudgeCount(m.rules) === 3;
    var j = m.judges || {}, cap = m.captains || {};
    return '<div class="ps-panel"><div><strong>Kampfgericht:</strong> E1 (Oberkampfrichter) ' + esc(j.e1 || '–') +
      ' · E2 ' + (three ? '(Heim) ' : '(neutral) ') + esc(j.e2 || '–') + (three ? ' · E3 (Gast) ' + esc(j.e3 || '–') : '') +
      ' · D1 (Heim) ' + esc(j.d1 || '–') + ' · D2 (Gast) ' + esc(j.d2 || '–') + '</div>' +
      '<div><strong>Mannschaftsführer:</strong> Heim ' + esc(cap.home || '–') + ' · Gast ' + esc(cap.guest || '–') +
      ' · <strong>Beginn:</strong> ' + esc(teamName(m.startTeam === 'guest' ? m.guestTeamId : m.homeTeamId)) + '</div></div>';
  }

  /** Knöpfe, Blattanfang und Kopf mit Logo, Liga, Begegnung und Datum (beide Ligen). */
  function printHead(m) {
    return '<div class="print-actions no-print"><a class="btn ghost" href="#/match/' + m.id + '">← zurück</a>' +
      '<button class="btn primary" data-action="print">Drucken / als PDF speichern</button></div>' +
      '<div class="print-page"><section class="print-sheet" id="print-sheet">' +
      '<div class="ps-head"><div class="ps-title">' + PRINT_LOGO +
      '<div class="ps-titletext"><div class="ps-league">' + esc(matchLeague(m).short) + '</div><div class="ps-doc">Wettkampfprotokoll</div></div></div>' +
      '<div class="ps-meta"><strong>' + esc(teamName(m.homeTeamId)) + ' – ' + esc(teamName(m.guestTeamId)) + '</strong><br><strong>' + esc(fmtDate(m.date)) + '</strong></div></div>' + printPanel(m);
  }

  /** Notenspalten einer Übung im Protokoll (n.a. bzw. W0 statt Noten). */
  function printCells(m, s, head, reverse) {
    var three = S.eJudgeCount(m.rules) === 3;
    var c = (s.dns || s.zero) ? head.map(function (h, n) { return n === 0 ? (s.dns ? 'n.a.' : 'W0') : ''; }) :
      [fmt1(s.d), s.bonus ? '0,1' : '', fmt1(s.e1), fmt1(s.e2)].concat(three ? [fmt1(s.e3)] : [])
        .concat([fmt(S.eScore(s, m.rules)), s.nd ? fmt1(s.nd) : '', '']);
    c[c.length - 1] = '<strong>' + fmt(S.sideFinal(s, m.rules)) + '</strong>';
    return (reverse ? c.reverse() : c).map(function (x) { return '<td class="num">' + x + '</td>'; }).join('');
  }

  /** Spaltenköpfe; am Pauschenpferd bleibt die SB-Spalte, aber ohne Überschrift. */
  function printHeadCells(appKey, cols) {
    return cols.map(function (h) { return '<th class="num">' + (h === 'SB' && appKey === S.NO_BONUS_APPARATUS ? '' : h) + '</th>'; }).join('');
  }

  /** Wettkampfpunkte (2/1/0) – erst wenn der Wettkampf vollständig ist, sonst „–“. */
  function matchPts(r, side) { return r.complete ? String(side === 'home' ? r.homeMatch : r.guestMatch) : '–'; }

  /** Topscorer-Tabelle im Protokoll (Scorepunkte bzw. Summe der Wertungen). */
  function printScorers(m) {
    var classic = isClassic(m);
    var top = S.topScorers(m, 3);
    return top.length ? '<table class="print-table scorer-table"><thead><tr><th>Platz</th><th>Turner</th><th>Mannschaft</th><th class="num">Geräte</th><th class="num">' + (classic ? 'Summe' : 'SP') + '</th></tr></thead><tbody>' +
      top.map(function (x) {
        return '<tr><td>' + x.rank + '.</td><td class="pn">' + esc(gymnastLabel(x.number, x.name) || '–') + '</td><td>' + esc(teamName(x.team === 'home' ? m.homeTeamId : m.guestTeamId)) +
          '</td><td class="num">' + x.starts + '</td><td class="num"><strong>' + pts(m, x.team, classic ? fmt(x.points) : x.points) + '</strong></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">–</p>';
  }

  function printResultLine(m, r, extra) {
    return '<p class="ps-result">' + (r.complete ? 'Ergebnis: <strong>' + (r.winner === 'draw' ? 'Unentschieden' : 'Sieg ' + esc(teamName(r.winner === 'home' ? m.homeTeamId : m.guestTeamId))) + '</strong>' : 'Wettkampf noch nicht vollständig gewertet.') + (extra || '') + '</p>';
  }

  /**
   * Landesliga-Protokoll: je Gerät die Startpaare (Heim links, Gast rechts) mit
   * Startposition; Streichwertungen durchgestrichen, darunter Gerätesummen und Zwischenstand.
   */
  function viewPrintClassic(m) {
    var r = S.matchResult(m);
    var three = S.eJudgeCount(m.rules) === 3;
    var head = ['D', 'SB', 'E1', 'E2'].concat(three ? ['E3'] : []).concat(['E', 'NA', 'End']);
    var homeName = esc(teamName(m.homeTeamId)), guestName = esc(teamName(m.guestTeamId));
    var running = { home: 0, guest: 0 };
    var apps = S.APPARATUS.map(function (a) {
      var app = m.apparatus[a.key];
      var ar = r.apparatus[a.key];
      running.home += ar.homeSum;
      running.guest += ar.guestSum;
      function nameCell(d, i, k, right) {
        var label = esc(gymnastLabel(d[k].number, d[k].name) || '–');
        var pos = S.classicPosition(m, a.key, i, k) + '.';
        return '<td class="pn' + (right ? ' right' : '') + '">' + (right ? label + ' ' + pos : pos + ' ' + label) + '</td>';
      }
      return '<div class="print-app"><div class="pa-head"><strong>' + appIcon(a.key, 'pa-ico') + a.name + '</strong> <span>Gerätesumme ' + totalPair(m, ar) +
        (ar.complete ? ' · Gerätepunkte ' + ar.homeApp + ':' + ar.guestApp : '') + '</span></div>' +
        '<table class="print-table"><thead><tr><th>' + homeName + '</th>' + printHeadCells(a.key, head) +
        printHeadCells(a.key, head.slice().reverse()) + '<th class="right">' + guestName + '</th></tr></thead><tbody>' +
        app.duels.map(function (d, i) {
          // Bei einer Streichwertung wird nur die Endnote durchgestrichen.
          function cells(k, reverse) {
            var html = printCells(m, d[k], head, reverse);
            return ar[k].struck.indexOf(i) >= 0 ? html.replace('<td class="num"><strong>', '<td class="num ps-s"><strong>') : html;
          }
          return '<tr>' + nameCell(d, i, 'home', false) + cells('home', false) + cells('guest', true) + nameCell(d, i, 'guest', true) + '</tr>';
        }).join('') + '</tbody></table>' +
        '<div class="pa-inter">Zwischenstand nach ' + a.name + ': <strong>' + totalPair(m, { homeSum: running.home, guestSum: running.guest }, false, ' : ') + '</strong></div></div>';
    }).join('');

    return printHead(m) +
      '<table class="print-summary"><thead><tr><th></th><th>Mannschaft</th><th class="num">Punkte</th><th class="num">Wettkampfpunkte</th><th class="num">Gerätepunkte</th></tr></thead><tbody>' +
      '<tr><td>Heim</td><td>' + homeName + '</td><td class="num"><strong>' + teamValue(m, r, 'home') + (deductionOf(m, 'home') ? '*' : '') + '</strong></td><td class="num">' + matchPts(r, 'home') + '</td><td class="num">' + r.homeApp + '</td></tr>' +
      '<tr><td>Gast</td><td>' + guestName + '</td><td class="num"><strong>' + teamValue(m, r, 'guest') + (deductionOf(m, 'guest') ? '*' : '') + '</strong></td><td class="num">' + matchPts(r, 'guest') + '</td><td class="num">' + r.guestApp + '</td></tr>' +
      '</tbody></table>' + printResultLine(m, r, deductionsText(m) ? ' · * ' + esc(deductionsText(m)) : '') + apps +
      '<div class="pa-head"><strong>Topscorer</strong> <span>(Summe aller geturnten Wertungen)</span></div>' + printScorers(m) +
      '<p class="ps-note">1.–8. = Startposition am Gerät, durchgestrichene Endnote = Streichwertung (zählt nicht; je Mannschaft zählen die ' + m.rules.counting + ' höchsten Wertungen), ' +
      'n.a. = nicht angetreten, W0 = Wertung 0,00, D = D-Note, SB = Standbonus, E1–E' + (three ? '3' : '2') + ' = Abzüge der E-Kampfrichter, E = ' +
      (three ? '10 − mittlerer Abzug' : '10 − Mittelwert') + ', NA = neutraler Abzug; Gerätepunkte Sieg/Unentschieden ' +
      m.rules.apparatusPoints.win + '/' + m.rules.apparatusPoints.draw + '. Status: ' + (m.status === 'final' ? 'abgeschlossen' : 'offen') +
      '. Stand: ' + esc(fmtDateTime(m.updatedAt || new Date().toISOString())) + '</p>' +
      '</section></div>';
  }

  function viewPrint(m) {
    if (isClassic(m)) return viewPrintClassic(m);
    var r = S.matchResult(m);
    var three = S.eJudgeCount(m.rules) === 3;
    var head = ['D', 'SB', 'E1', 'E2'].concat(three ? ['E3'] : []).concat(['E', 'NA', 'End']);
    var homeName = esc(teamName(m.homeTeamId)), guestName = esc(teamName(m.guestTeamId));
    var running = { home: 0, guest: 0 };
    var apps = S.APPARATUS.map(function (a) {
      var app = m.apparatus[a.key];
      var ar = r.apparatus[a.key];
      return '<div class="print-app"><div class="pa-head"><strong>' + appIcon(a.key, 'pa-ico') + a.name + '</strong> <span>Scorepunkte ' + ptsPair(m, ar.homePoints, ar.guestPoints) +
        (ar.complete ? ' · Gerätepunkte ' + ar.homeApp + ':' + ar.guestApp : '') + '</span></div>' +
        '<table class="print-table"><thead><tr><th>' + homeName + '</th>' + printHeadCells(a.key, head) +
        '<th class="num sp">SP</th>' + printHeadCells(a.key, head.slice().reverse()) + '<th class="right">' + guestName + '</th></tr></thead><tbody>' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          function cells(s, reverse) { return printCells(m, s, head, reverse); }
          var first = S.startOrder(m, a.key, i)[0];
          function nameCell(k, right) {
            var lead = first === k;
            return '<td class="pn' + (right ? ' right' : '') + (lead ? ' lead' : '') + '">' + (lead && !right ? '▶ ' : '') +
              esc(gymnastLabel(d[k].number, d[k].name) || '–') + (lead && right ? ' ◀' : '') + '</td>';
          }
          return '<tr>' + nameCell('home', false) + cells(d.home, false) +
            '<td class="num sp"><strong>' + (dr.complete ? ptsPair(m, dr.homePoints, dr.guestPoints) : '') + '</strong></td>' +
            cells(d.guest, true) + nameCell('guest', true) + '</tr>';
        }).join('') + '</tbody></table>' + intermediate(a, ar) + '</div>';
    }).join('');

    // Zwischenstand nach Scorepunkten nach diesem Gerät.
    function intermediate(a, ar) {
      running.home += ar.homePoints;
      running.guest += ar.guestPoints;
      return '<div class="pa-inter">Zwischenstand nach ' + a.name + ': <strong>' + ptsPair(m, running.home, running.guest, false, ' : ') + '</strong></div>';
    }

    var th = m.rules.thresholds.slice().sort(function (a, b) { return a.min - b.min; })
      .map(function (t) { return 'ab ' + fmt(t.min) + ' → ' + t.points; }).join(', ');

    return printHead(m) +
      '<table class="print-summary"><thead><tr><th></th><th>Mannschaft</th><th class="num">Scorepunkte</th><th class="num">Wettkampfpunkte</th><th class="num">Gerätepunkte</th><th class="num">Geturnte Punkte</th></tr></thead><tbody>' +
      '<tr><td>Heim</td><td>' + esc(teamName(m.homeTeamId)) + '</td><td class="num"><strong>' + pts(m, 'home', r.homePoints) + '</strong></td><td class="num">' + matchPts(r, 'home') + '</td><td class="num">' + r.homeApp + '</td><td class="num">' + fmt(r.homeSum) + '</td></tr>' +
      '<tr><td>Gast</td><td>' + esc(teamName(m.guestTeamId)) + '</td><td class="num"><strong>' + pts(m, 'guest', r.guestPoints) + '</strong></td><td class="num">' + matchPts(r, 'guest') + '</td><td class="num">' + r.guestApp + '</td><td class="num">' + fmt(r.guestSum) + '</td></tr>' +
      '</tbody></table>' +
      printResultLine(m, r) +
      apps +
      '<div class="pa-head"><strong>Topscorer</strong></div>' + printScorers(m) +
      '<p class="ps-note">▶ ◀ = vorlegender Turner, n.a. = nicht angetreten, W0 = Wertung 0,00, D = D-Note, SB = Standbonus, E1–E' + (three ? '3' : '2') + ' = Abzüge der E-Kampfrichter, E = ' +
      (three ? '10 − mittlerer Abzug' : '10 − Mittelwert') + ', NA = neutraler Abzug, SP = Scorepunkte (' + esc(th) + '); Gerätepunkte Sieg/Unentschieden ' +
      m.rules.apparatusPoints.win + '/' + m.rules.apparatusPoints.draw + '. Status: ' + (m.status === 'final' ? 'abgeschlossen' : 'offen') +
      '. Stand: ' + esc(fmtDateTime(m.updatedAt || new Date().toISOString())) + '</p>' +
      '</section></div>';
  }

  /** Protokoll so verkleinern, dass es auf eine DIN-A4-Seite (Hochformat) passt. */
  function fitPrintToA4() {
    var sheet = document.getElementById('print-sheet');
    if (!sheet) return;
    // Logo exakt so hoch wie die beiden Titelzeilen daneben.
    var logo = sheet.querySelector('.ps-logo'), titleText = sheet.querySelector('.ps-titletext');
    if (logo && titleText) {
      var fit = function () { logo.style.height = titleText.offsetHeight + 'px'; };
      fit();
      if (!logo.complete) logo.addEventListener('load', fit, { once: true });
    }
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:100mm;height:100mm';
    document.body.appendChild(probe);
    var pxPerMm = probe.offsetHeight / 100;
    probe.remove();
    var maxH = 277 * pxPerMm; // 297 mm minus 2 × 10 mm Rand
    var zoom = 1;
    sheet.style.zoom = '';
    sheet.style.width = '';
    for (var i = 0; i < 4; i++) {
      var h = sheet.scrollHeight * zoom;
      if (h <= maxH) break;
      zoom = zoom * maxH / h * 0.99;
      sheet.style.zoom = zoom;
      sheet.style.width = (190 / zoom) + 'mm';
    }
  }

  // ---------- Ansichten: Regeln, Anleitung, Infoseite ----------

  function viewRules() {
    var classic = leagueOf(currentLeague).model === 'classic';
    var r = classic ? S.CLASSIC_RULES : S.DEFAULT_RULES;
    var ap = r.apparatusPoints, mp = r.matchPoints, n = r.duelsPerApparatus;
    var names = S.APPARATUS.map(function (a) { return a.name; });
    function list(items) { return '<ul class="rules-list">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }
    function word(k, w) { return k + ' ' + w + (k === 1 ? '' : 'e'); }
    function and(xs) { return xs.slice(0, -1).join(', ') + ' und ' + xs[xs.length - 1]; }
    // „am Boden“, „an den Ringen“ usw. für das Beispiel der beginnenden Mannschaft
    var at = { FX: 'am Boden', PH: 'am Pauschenpferd', SR: 'an den Ringen', VT: 'am Sprung', PB: 'am Barren', HB: 'am Reck' };
    var example = S.APPARATUS.map(function (a, i) { return (i === 1 ? 'Mannschaft ' : '') + (i % 2 ? 'B ' : 'A ') + at[a.key]; });
    var points = classic ? 'Punkte' : 'Scorepunkte';

    var basics = classic ? '<h3>Grundprinzip</h3>' + list([
      'Zwei Mannschaften treten gegeneinander an. An jedem Gerät kann jede Mannschaft bis zu ' + n + ' Turner einsetzen; die Turner beider Mannschaften turnen abwechselnd.',
      'Je Mannschaft zählen an jedem Gerät die ' + r.counting + ' höchsten Wertungen. Die niedrigste Wertung ist die Streichwertung; sind zwei Wertungen gleich niedrig, wird die später geturnte gestrichen.',
      'Turnen weniger als ' + n + ' Turner, zählen die vorhandenen Wertungen – bei 2 Turnern also nur diese 2.',
      'Jede Wertung wird einzeln veröffentlicht. Nach jeder Übung wird der aktuelle Zwischenstand angezeigt.'
    ]) : '<h3>Grundprinzip</h3>' + list([
      'Zwei Mannschaften treten in Duellen Mann gegen Mann an. Die beiden Turner eines Duells starten direkt hintereinander.',
      'An jedem Gerät werden ' + n + ' Duelle geturnt. Jede Mannschaft kann also bis zu ' + n + ' Turner pro Gerät einsetzen.',
      'Setzt eine Mannschaft in einem Duell keinen Turner ein, wird diese Übung mit 0 Punkten bewertet.'
    ]) +
      '<h3>Scorepunkte je Duell</h3>' +
      '<p>Die Mannschaft des Turners mit der höheren Wertung erhält je nach Notendifferenz folgende Scorepunkte:</p>' +
      '<table class="table compact rules-table"><thead><tr><th>Notendifferenz</th><th class="num">Scorepunkte</th></tr></thead><tbody>' +
      '<tr><td>unter ' + fmt(r.thresholds[0].min) + '</td><td class="num">0 (unentschieden)</td></tr>' +
      r.thresholds.map(function (t, i) {
        var next = r.thresholds[i + 1];
        return '<tr><td>' + (next ? 'von ' + fmt(t.min) + ' bis ' + fmt(next.min - 50) : 'ab ' + fmt(t.min)) + '</td><td class="num">' + t.points + '</td></tr>';
      }).join('') + '</tbody></table>' +
      list(['Die Wertungen bleiben bis zur Bekanntgabe der Scorepunkte geheim und werden danach veröffentlicht.']);

    return '<section class="card rules"><h2>Wertungsregeln</h2>' +
      '<p class="muted">Die Regeln folgen dem ' + (classic ? 'Wertungssystem' : 'Scoresystem') + ' der ' + esc(leagueOf(currentLeague).name) + '.</p>' +
      basics +

      '<h3>Geräte- und Gesamtergebnis</h3>' + list([
        'Für das Geräteergebnis werden ' + (classic ? 'die gezählten Wertungen' : 'die Scorepunkte') + ' an diesem Gerät addiert. Die Mannschaft mit mehr ' + points + 'n' +
          ' gewinnt das Gerät, bei Gleichstand endet es unentschieden. Ein Gerätesieg bringt ' + word(ap.win, 'Gerätepunkt') + ', ein Unentschieden ' + word(ap.draw, 'Gerätepunkt') + '.',
        'Für das Gesamtergebnis werden ' + (classic ? 'die Punkte aller Geräte' : 'alle Scorepunkte des Wettkampfs') + ' addiert. Die Mannschaft mit mehr ' + points + 'n' +
          ' gewinnt den Wettkampf, bei Gleichstand endet er unentschieden. Ein Sieg bringt ' + word(mp.win, 'Punkt') + ', ein Unentschieden ' + word(mp.draw, 'Punkt') + '.'
      ]) +

      '<h3>Wettkampfablauf</h3>' + list([
        'Geturnt wird in der olympischen Reihenfolge: ' + and(names) + '.',
        'Die Farben beider Mannschaften werden frei gewählt. ' + (classic ? 'Punkte und Wertungen' : 'Die Scorepunkte') + ' werden in der Farbe der jeweiligen Mannschaft angezeigt.',
        'Vor Beginn lost der Oberkampfrichter im Beisein beider Mannschaftsführer eine Mannschaft aus, zum Beispiel per Münzwurf. Deren Mannschaftsführer legt fest, welche Mannschaft am ersten Gerät beginnt.',
        'Die beginnende Mannschaft wechselt an jedem Gerät. Beginnt zum Beispiel Mannschaft A am Boden, beginnt ' + and(example.slice(1)) + '.',
        classic
          ? 'Am Gerät turnen die Mannschaften abwechselnd, beginnend mit der am Gerät beginnenden Mannschaft. Beginnt Mannschaft A, ist die Reihenfolge also A1, B1, A2, B2, A3, B3, A4 und B4.'
          : 'Die am Gerät beginnende Mannschaft beginnt die Duelle 1 und 2, die andere Mannschaft die Duelle 3 und 4. ' +
            'Beginnt Mannschaft A, lauten die Duelle also A1 gegen B1, A2 gegen B2, B3 gegen A3 und B4 gegen A4; der zuerst genannte Turner turnt jeweils zuerst.',
        'Beide Mannschaften können sich 1 Stunde vor Wettkampfbeginn und 4 Minuten vor jedem Gerät einturnen. Abweichende Regelungen, etwa wegen eines Geräteumbaus oder einer Pause nach 3 Geräten, können in Absprache mit der Gastmannschaft getroffen werden.'
      ]) +

      '<h3>E-Note</h3>' + list([
        'Mit neutralem E2 ist die E-Note 10 minus dem Mittelwert der Abzüge von E1 und E2.',
        'Mit drei E-Kampfrichtern werden der höchste und der niedrigste Abzug gestrichen; die E-Note ist 10 minus dem mittleren Abzug.'
      ]) + '</section>';
  }

  // ---------- Ansicht: Anleitung ----------

  function helpSec(title, items) {
    return '<h3>' + title + '</h3><ul class="rules-list">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
  }

  var INFO_LINK = '<a href="#/info">Installation und Datensicherung</a>';

  /** Anleitung der Liga: nur der Wettkampftag, Texte passend zum Wertungsmodell der Liga. */
  function viewHelp() {
    var sec = helpSec;
    var lg = leagueOf(currentLeague);
    var classic = lg.model === 'classic';
    return '<section class="card rules"><h2>Anleitung ' + esc(lg.short) + '</h2>' +
      '<p class="muted">Kurzanleitung für den Wettkampftag. Installation, Datensicherung und Updates stehen auf der Startseite unter ' + INFO_LINK + '.</p>' +

      sec('1. Wettkampf anlegen', [
        'Vorab lassen sich unter <b>Mannschaften</b> Turnernamen korrigieren und freie Startnummern belegen. Jede Änderung wird sofort gespeichert.',
        'Unter <b>Wettkämpfe</b> auf „Neuer Wettkampf“ tippen, Datum, Heim- und Gastmannschaft sowie die Farben wählen.',
        'Bei <b>Anwesende Turner</b> sind zunächst alle Turner abgehakt; fehlende Turner abwählen. Namen lassen sich dort auch korrigieren oder ergänzen.',
        'Mannschaftsführer und Kampfgericht eintragen (Pflichtfelder *: Mannschaftsführer, E1 und – bei „Ja“ – der neutrale E2). Bei „Neutraler Kampfrichter E2: Nein“ werden E2 (Heim) und E3 (Gast) mit D1 bzw. D2 vorausgefüllt und lassen sich frei ändern.',
        'Die per Los bestimmte <b>beginnende Mannschaft</b> wählen. Die Startreihenfolge an allen Geräten ergibt sich daraus automatisch.',
        'Alle Angaben lassen sich später über <b>Wettkampf Setup</b> ändern. Änderungen dort gelten erst mit <b>Speichern</b> (Knopf fest am unteren Rand); wer die Seite vorher verlässt, wird gefragt, ob gespeichert oder verworfen werden soll.'
      ]) +

      sec('2. Wertungen erfassen', [
        classic
          ? 'Oben das Gerät wählen. Links stehen die Turner der am Gerät beginnenden Mannschaft, rechts die der anderen; die Zahl vor dem Turner ist seine Startposition (geturnt wird abwechselnd).'
          : 'Oben das Gerät wählen. Je Duell steht der vorlegende Turner links bzw. oben und ist mit „legt vor“ markiert.',
        '<b>Geräte und Anzeigetafel</b>: Gesperrt wird nichts – jeder Gerätereiter ist jederzeit wählbar, Turner lassen sich jederzeit ändern und Wertungen jederzeit eintragen. ' +
          'Die Anzeigetafel folgt dem gewählten Gerätereiter, solange an keinem Gerät eine Wertung offen ist. ' +
          (classic ? 'Mit der ersten freigegebenen Wertung eines Geräts' : 'Sobald an einem Gerät das erste Duell freigegeben ist,') +
          ' bleibt die Tafel auf diesem Gerät, bis dort alle Wertungen freigegeben sind – egal, welcher Reiter gewählt ist. Nach der letzten Freigabe bleibt sie nach der großen Einblendung noch 10 Sekunden stehen (insgesamt 20 Sekunden; ohne Einblendung – Landesliga, letzte Übung „kein Turner“ – 10 Sekunden) und wechselt dann zum gewählten Reiter. ' +
          'Sind an mehreren Geräten Wertungen offen (z. B. bei einer vergessenen Freigabe), zeigt die Tafel das Gerät mit der letzten Freigabe.',
        'Die Gerätereiter zeigen den Stand: ● an diesem Gerät ist schon eine Wertung eingetragen' + (classic ? '' : ' (auch der gespeicherte erste Turner eines Duells)') + ', ✓ alle Wertungen freigegeben (am Handy nur Logo und Abzeichen, die Ergebnisse stehen im Gerätebereich). Am Laptop bleibt der obere Bereich mit den Gerätereitern beim Scrollen stehen.',

        'Je Turner: <b>Wertung eingeben</b> – es öffnet sich das Wertungsfenster: oben der Turner (Auswahl wie in der Kachel), darunter Abzüge E1, E2 (ggf. E3), D-Note, Standbonus und neutraler Abzug. ' +
          'Den Turner kann man vorab in der Kachel oder erst im Fenster wählen; vor der Freigabe ist er sofort gespeichert (auch bei „Abbrechen“). Ohne Turner sind die Notenfelder gesperrt. ' +
          'Eingabe mit Komma oder Punkt und einer Nachkommastelle, z. B. 4,8 oder 1.3; E-Note und Endnote rechnet die App schon beim Tippen: E-Note = 10 − Mittelwert der Abzüge E1 und E2 (bei drei E-Kampfrichtern 10 − mittlerer Abzug, höchster und niedrigster gestrichen); Endnote = D-Note + Standbonus + E-Note − neutraler Abzug. ' +
          'Bei wenig Platz stehen über allen Feldern Kurzformen: E1–E3 = Abzüge der E-Kampfrichter, Stand = Standbonus, NA = neutraler Abzug. Der Sturz-Timer ist auch im Fenster bedienbar (Knopf oben rechts).',
        '<b>D-Note berechnen</b> (Knopf „berechnen“ unter der D-Note, nicht am Sprung): Anzahl der Elemente je Wertigkeit eintippen – ≥ D je 0,8, C je 0,6, B je 0,4, A je 0,2, höchstens 8 Elemente insgesamt – und die Elementgruppen (EG, höchstens 2,3). „Übernehmen“ trägt die D-Note ins Fenster ein; die Anzahlen werden mit der Wertung gespeichert und stehen beim erneuten Öffnen wieder da. Über den Feldern steht, wie viele Elemente noch möglich sind; bei mehr als 8 Elementen oder EG über 2,3 wird rot markiert, „Übernehmen“ geht dann nicht. Leere Felder zählen als 0 – ohne Eingaben ergibt der Rechner D-Note 0,0 (z. B. nur Teile unterhalb von A). Sind Elemente eingetragen, aber keine Elementgruppen, erinnert ein Hinweis daran (ein anerkanntes Element erfüllt immer auch eine Elementgruppe); übernommen wird dann nicht. Nach „Übernehmen“ steht die Auswahl auf der D-Note. Wurde die D-Note danach von Hand geändert, beginnt der Rechner wieder leer. Mit Tastatur: Enter, → oder ↓ bis EG und weiter auf „Übernehmen“ (Enter übernimmt), ← oder ↑ zurück, Esc bricht ab.',
        '<b>Wertung freigeben</b> im Fenster übernimmt die Werte; <b>Abbrechen</b> verwirft sie ohne Rückfrage. In der Kachel stehen die Werte danach als Text, der Knopf heißt dann „Wertung ändern“.',
        (classic ? 'Mit der <b>Tab-Taste</b> geht es in der Seite von der Turnerauswahl zu „Wertung eingeben“ und weiter zum nächsten Turner.' : 'Mit der <b>Tab-Taste</b> geht es in der Seite von der Turnerauswahl zu „Wertung eingeben“ und weiter zum nächsten Turner.') +
          ' Im Fenster führt Tab nur über Turner, Notenfelder, Stand und „Wertung freigeben“ (Umschalt+Tab rückwärts). → und Enter gehen ins nächste Feld, ← ins vorige – im Kreis E1 → … → Stand → NA → „Wertung freigeben“ (nur wenn vollständig) → E1; Enter auf „Wertung freigeben“ gibt frei. Den <b>Standbonus</b> schalten ↑ / ↓ (oder 1 = ja, 0 = nein); auf der D-Note wählt ↓ den Knopf „berechnen“ (Enter öffnet den Rechner, ↑ zurück). Esc bricht ab. Was mit der Tastatur ausgewählt ist, hat eine gelbe Umrandung. Nach dem Freigeben steht der Fokus beim nächsten Turner.',
        '<b>Zahlentastatur</b> (Handy, Tablet): Statt der Tastatur des Geräts erscheint im Fenster eine eigene Zahlentastatur mit großer Anzeige des aktiven Felds. Übernommen wird genau das Getippte („4 , 5“ = 4,5; „4“ = 4,0); ein Feld antippen macht es zum aktiven Feld. „Weiter ▶“ springt ins nächste Feld, „◀ Zurück“ ins vorige (im Kreis E1 → … → Stand → NA → E1); freigegeben wird durch Antippen von „Wertung freigeben“. Auch der <b>Standbonus</b> gehört zur Reihenfolge: Taste 1 = +0,1, Taste 0 oder ⌫ = kein Standbonus (die übrigen Tasten sind dann ausgegraut). Am Handy steht die Zahlentastatur unten – mit etwas Abstand zum Rand, damit der Daumen sie gut erreicht. ' +
          'Mit angeschlossener Tastatur verschwindet sie beim ersten Tastendruck. Einstellung unten im Fenster: automatisch, immer oder nie (gilt für dieses Gerät).',
        '<b>kein Turner</b> (ganz oben in der Turnerauswahl, in der Kachel oder im Fenster, auch vorab wählbar): Die Übung zählt 0 Punkte. Der Knopf in der Kachel heißt dann „Wertung freigeben“ und gibt direkt frei, ohne Fenster (danach „Wertung ändern“). Bereits erfasste Werte werden nach Rückfrage gelöscht; auf der Tafel steht sofort „–“ statt des Namens, die Wertung 0,00 erscheint mit der Freigabe; im Protokoll steht die Übung als „nicht angetreten“ bzw. „n.a.“. <b>Wertung 0,00</b> (im Wertungsfenster): Der Turner ist angetreten, erhält aber die Endnote 0. Sind schon Werte eingetragen, fragt die App vorher nach, ob sie gelöscht werden sollen.',
        classic
          ? '<b>Mannschaftsabzug</b>: Die Links „Mannschaftsabzug Heim“ bzw. „Gast“ ganz unten im Gerätebereich öffnen die Eingabe des Abzugs in Punkten. Es gibt je Mannschaft nur einen Abzug für den ganzen Wettkampf – die Links unter allen Geräten sind dieselben. Der Abzug mindert nur die Gesamtpunktzahl, nicht die Geräteergebnisse; 0 oder leer entfernt ihn. Er erscheint auf der Anzeigetafel und – nur wenn eingetragen – im Protokoll.'
          : '<b>Mannschaftsabzüge</b> werden beim Turner als <b>neutraler Abzug</b> eingetragen, der zuletzt am Gerät war bzw. bei dem der Abzug zuerst aufgefallen ist.'
      ]) +

      sec('3. Wertung freigeben', classic ? [
        'Jede Übung wird im Wertungsfenster mit <b>Wertung freigeben</b> einzeln freigegeben. Erst dann zählt die Wertung und erscheint auf der Anzeigetafel.',
        'Je Mannschaft und Gerät zählen die drei höchsten Wertungen; die Streichwertung wird grau durchgestrichen angezeigt.',
        'Korrektur: <b>Wertung ändern</b> öffnet das Fenster mit den bisherigen Werten (auch der Turner lässt sich dort ändern); <b>Korrektur freigeben</b> zeigt die neue Wertung auf der Tafel, „Abbrechen“ lässt alles, wie es war.'
      ] : [
        '„Wertung freigeben“ beim ersten Turner eines Duells speichert seine Wertung – auf der Anzeigetafel erscheint sie noch nicht. Die freigegebene Wertung des zweiten Turners gibt das ganze Duell frei: Erst dann zählen die Scorepunkte und die Tafel zeigt beide Noten. Im Fenster des zweiten Turners steht vorher als Vorschau die Scorepunktzahl des Duells in der Farbe der Mannschaft, die es gewinnt (unentschieden: 0 in Schwarz).',
        'Korrektur: <b>Wertung ändern</b> öffnet das Fenster mit den bisherigen Werten (auch der Turner lässt sich dort ändern); <b>Korrektur freigeben</b> zeigt das geänderte Duell auf der Tafel, „Abbrechen“ lässt alles, wie es war.'
      ]) +

      sec('4. Timer', [
        '<b>Einturnzeit (6:40)</b> – 8 Turner × 50 Sekunden – im Menü <b>Anzeigetafel</b> starten (zwischen Turnervorstellung und Wettkampfpause). Es gibt nur einen Einturn-Timer, unabhängig vom Gerät: Reiterwechsel, Turner und Wertungen ändern nichts an ihm. Die Restzeit steht im Knopf, ein Klick darauf beendet die Einturnzeit vorzeitig. Auf der Tafel steht „Einturnen“; nach Ablauf ertönt 5 Sekunden lang eine Schelle. Während einer Wettkampfpause wird schon eingeturnt – solange sie läuft, lässt sich die Einturnzeit nicht starten (und umgekehrt).',
        '<b>Sturz-Timer</b> (nicht an Boden und Sprung) bei der jeweiligen Übung starten: Die Sekunden erscheinen zuerst schwarz, ab 10 Sekunden ocker, ab 20 Sekunden rot. Nach 30 Sekunden ertönt ein kurzer Doppelton, die Anzeige wird rot und zeigt „Abzug 0,3“; in den letzten 10 Sekunden blinkt die Zahl leicht. Nach weiteren 30 Sekunden ertönt ein Fehlerton und „Übung beendet“ erscheint. Wie die Turnerauswahl ist der Knopf nach der Freigabe und bei „kein Turner“ gesperrt; ein noch laufender Timer lässt sich aber immer stoppen.',
        'Ein erneuter Klick auf den laufenden Timer stoppt ihn. Die Lautstärke wird am Gerät eingestellt.'
      ]) +

      sec('5. Anzeigetafel', [
        'Alle Knöpfe zur Tafel stehen unter <b>„Anzeigetafel“</b> in der grauen Kopfzeile, die zum Wettkampf (Setup, Protokoll / Drucken, Wettkampf abschließen) unter <b>„Wettkampf“</b>. Am Laptop und iPad sind das Reiter eines Menübands: Die Leiste darunter zeigt immer die Knöpfe des gewählten Reiters; beim Öffnen eines Wettkampfs ist „Anzeigetafel“ gewählt. Am Handy sind es Aufklappmenüs („Tafel ▾“, „Wettkampf ▾“), die nach der Auswahl schließen; eine laufende Wettkampfpause bzw. Einturnzeit steht dann am Menüknopf. Wettkämpfe, Mannschaften, Regeln und Anleitung stehen im Menü unter dem Liganamen. Von Wettkampf Setup und Protokoll – und von diesen Seiten, wenn man vom Wettkampf kommt – führt „← zurück“ oben links wieder zum Wettkampf; zur Startseite (Liga wechseln) führt das Logo links oben.',
        '<b>Anzeigetafel öffnen</b> öffnet die Tafel in einem eigenen Fenster. Dieses Fenster auf den Beamer bzw. Fernseher ziehen und dort doppelt auf die Tafel klicken – das schaltet das Vollbild ein und aus.',
        '<b>Hell</b> eignet sich für Beamer in heller Halle, <b>Dunkel</b> für Fernseher und abgedunkelte Räume. <b>Ergebnis/Siegerehrung</b> blendet ein bzw. aus (eingeblendet ist der Knopf dunkel hinterlegt) und zeigt Stand, Gerätepunkte und die drei besten Scorer (während des Wettkampfs als Zwischenstand). Dasselbe Fenster liegt dann auch über der App, damit man die Siegerehrung am Gerät mitlesen kann; „Schließen“ (oder Esc) blendet es auch auf der Tafel aus. Beim Öffnen der Tafel ist es immer ausgeblendet. ' +
        '<b>Turnervorstellung</b> zeigt nacheinander die Gastmannschaft (Titelseite, dann die anwesenden Turner nach Startnummer), die Heimmannschaft und zum Schluss das Kampfgericht. Solange sie läuft, erscheint auch in der App dasselbe Fenster wie auf der Tafel, unten mit ◀ ▶ ■ (zurück, weiter, beenden); weiterschalten damit oder per Tastatur – Pfeil rechts, Leertaste oder Bild ab (auch mit einem Presenter), zurück mit Pfeil links oder Bild auf, Esc beendet. Während der Vorstellung sind keine anderen Fenster auf der Tafel möglich.',
        '<b>Wettkampfpause</b>: Knopf antippen und 10, 15 oder 20 Minuten wählen – die Pause startet sofort. Die Restzeit erscheint groß auf der Tafel unter der Überschrift „Wettkampfpause und Einturnen“ (in der Pause wird schon das nächste Gerät eingeturnt); am Ende ertönt ein Signal und 5 Sekunden lang „Zeit abgelaufen“. Ein Klick auf den laufenden Knopf beendet die Pause.',
        (classic ? 'Nach jeder Freigabe erscheint 10 Sekunden groß auf der Tafel die Endnote der Übung mit dem Turner darüber' : 'Nach jeder Freigabe erscheinen 10 Sekunden groß auf der Tafel die Scorepunkte des Duells mit dem Sieger darüber') +
          ', Korrekturen 10 Sekunden. Der Sturz-Timer erscheint groß als Fenster über der Tafel; Einturnzeit und Wettkampfpause laufen groß in der Karte oben rechts, Liste und Wertungen bleiben dabei sichtbar.'
      ]) +

      sec('6. Abschluss', [
        '<b>Wettkampf abschließen</b> sperrt die Eingabe. Anschließend fragt die App, ob nur dieser Wettkampf oder alles gesichert werden soll.',
        '<b>Protokoll / Drucken</b> erstellt das Wettkampfprotokoll auf einer DIN-A4-Seite (auch als PDF speicherbar).',
        'Über <b>Wieder öffnen</b> kann ein abgeschlossener Wettkampf erneut bearbeitet werden.',
        'Sicherungsdateien lassen sich jederzeit auf der Seite <b>Wettkämpfe</b> erstellen: „Sichern“ in der Zeile eines Wettkampfs bzw. „Alles sichern“ darunter; mehr dazu unter ' + INFO_LINK + '.'
      ]) + '</section>';
  }

  /** Allgemeine Hinweise, von der Startseite aus erreichbar: gelten für beide Ligen. */
  function viewInfo() {
    var sec = helpSec;
    return '<section class="card rules"><h2>Installation und Datensicherung</h2>' +
      '<p class="muted">Hinweise für beide Ligen. Was am Wettkampftag zu tun ist, steht in der jeweiligen Liga unter <b>Anleitung</b>.</p>' +

      sec('1. Installation', [
        'Die App läuft im Browser und lässt sich zusätzlich wie eine normale App installieren. Sie startet dann ohne Adressleiste und funktioniert auch ohne Internet.',
        '<b>iPad / iPhone:</b> In Safari auf „Teilen“ und dann „Zum Home-Bildschirm“ tippen.',
        '<b>Android-Smartphone:</b> Im Chrome-Menü (⋮) „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.',
        '<b>Windows und macOS mit Chrome oder Edge:</b> Auf das Installationssymbol rechts in der Adressleiste klicken oder im Menü „App installieren“ wählen (bei Edge unter „Apps“).',
        '<b>macOS mit Safari:</b> Im Menü „Ablage“ den Punkt „Zum Dock hinzufügen“ wählen.',
        'Auf iPad und iPhone sowie mit Safari am Mac hat die installierte App eigene Daten, getrennt vom Browser – daher für eine Variante entscheiden.'
      ]) +

      sec('2. Empfohlene Geräte', [
        'Alle Daten bleiben auf diesem Gerät; die App braucht am Wettkampftag kein Internet.',
        'Soll die Anzeigetafel genutzt werden, empfiehlt sich ein Windows- oder Mac-Rechner mit <b>Chrome oder Edge</b>, im Browser oder als installierte App.'
      ]) +

      sec('3. Datensicherung', [
        'Die Daten jeder Liga werden <b>getrennt gesichert</b>, jeweils auf der Seite <b>Wettkämpfe</b> der Liga.',
        'Einzelne Wettkämpfe sichert „Sichern“ in der Zeile des Wettkampfs, alle Daten der Liga „Alles sichern“ im Abschnitt <b>Gesamtsicherung</b> darunter – regelmäßig, z. B. auf einen USB-Stick. Der Dateiname zeigt Liga und Art der Sicherung.',
        'Beim Einlesen („Sicherung einlesen …“) ersetzt eine Gesamtsicherung alle Daten dieser Liga; die andere Liga bleibt unverändert. Ein einzelner Wettkampf wird nur hinzugefügt bzw. ersetzt.',
        'Die App legt zusätzlich automatische Sicherungspunkte an, aus denen sich ein früherer Stand wiederherstellen lässt (im Abschnitt <b>Datenspeicher</b>, aufklappbar).',
        '<b>Alle Daten löschen</b> (ganz unten im Abschnitt Datenspeicher) entfernt alle Wettkämpfe und eigene Änderungen an Turnernamen dieser Liga; die vorgegebenen Turner bleiben erhalten.'
      ]) +

      sec('4. Updates', [
        'Die App sucht beim Start und alle 30 Minuten nach einer neuen Version. Ist eine da, erscheint ein Hinweis; nach „Jetzt aktualisieren“ ist sie aktiv. Alle Daten bleiben erhalten.'
      ]) +
      '<p><a class="btn" href="#/">← Zur Startseite</a></p></section>';
  }

  function refreshDataView() {
    refreshStorageBox();
    DB.listSnapshots().then(function (list) {
      var el = document.getElementById('snapshots');
      if (!el) return;
      var cnt = document.getElementById('snap-count');
      if (cnt) cnt.textContent = '(' + list.length + ')';
      if (!list.length) { el.innerHTML = '<p class="muted">Noch keine Sicherungspunkte.</p>'; return; }
      el.innerHTML = '<div class="table-wrap"><table class="table compact"><thead><tr><th>Zeitpunkt</th><th>Anlass</th><th class="num">Mannschaften</th><th class="num">Wettkämpfe</th><th></th></tr></thead><tbody>' +
        list.map(function (s) {
          // Ältere Sicherungspunkte kennen nur die Gesamtzahlen.
          var c = (s.counts && s.counts[currentLeague]) || s;
          return '<tr><td>' + esc(fmtDateTime(s.ts)) + '</td><td>' + esc(s.reason) + '</td><td class="num">' + c.teams + '</td><td class="num">' + c.matches + '</td>' +
            '<td><button class="btn small" data-action="restore" data-snap="' + s.id + '">Wiederherstellen</button> ' +
            '<button class="btn small ghost" data-action="export-snap" data-snap="' + s.id + '">Export</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    });
  }

  function validateBackup(data) {
    if (!data || data.format !== 'turnwettkampf-backup' || !Array.isArray(data.teams) || !Array.isArray(data.matches)) {
      throw new Error('Keine gültige WTB-Liga-Sicherungsdatei.');
    }
    if (data.league && data.league !== currentLeague) {
      throw new Error('Diese Sicherung gehört zur ' + leagueOf(data.league).short + ' – bitte im Bereich ' + leagueOf(data.league).short + ' importieren.');
    }
    data.matches.forEach(function (m) {
      if (!m.id || !m.apparatus || !m.rules) throw new Error('Sicherungsdatei enthält ungültige Wettkampfdaten.');
    });
    return data;
  }

  /** Ersetzt nur die Daten der aktuellen Liga; die anderen Ligen bleiben unverändert. */
  function restoreData(data, reason) {
    var part = sliceLeague(data, currentLeague);
    var others = LEAGUES.filter(function (l) { return l.key !== currentLeague; });
    var keep = { teams: [], matches: [] };
    others.forEach(function (l) {
      var o = sliceLeague(exportData(), l.key);
      keep.teams = keep.teams.concat(o.teams);
      keep.matches = keep.matches.concat(o.matches);
    });
    return takeSnapshot('vor ' + reason).then(function () {
      return DB.replaceAll({ teams: keep.teams.concat(part.teams), matches: keep.matches.concat(part.matches), meta: [S.clone(state.settings)] });
    }).then(loadAll).then(function () {
      dirty = true;
      return takeSnapshot('nach ' + reason);
    }).then(function () {
      if (channel) channel.postMessage({ type: 'changed' });
      render();
    });
  }

  /** Einzelnen Wettkampf einlesen: ergänzt ihn oder ersetzt nur denselben Wettkampf. */
  function importMatch(data) {
    var m = data.match;
    if (!m || !m.id || !m.apparatus || !m.rules) throw new Error('Datei enthält keinen gültigen Wettkampf.');
    var lg = m.league || LEAGUES[0].key;
    if (lg !== currentLeague) throw new Error('Dieser Wettkampf gehört zur ' + leagueOf(lg).short + ' – bitte im Bereich ' + leagueOf(lg).short + ' importieren.');
    var exists = state.matches.some(function (x) { return x.id === m.id; });
    var label = fmtDate(m.date) + ' (' + ((data.teams && data.teams.home) || teamName(m.homeTeamId)) + ' – ' + ((data.teams && data.teams.guest) || teamName(m.guestTeamId)) + ')';
    var question = exists
      ? 'Der Wettkampf vom ' + label + ' ist bereits vorhanden. Durch den Stand aus der Datei ersetzen? Alle anderen Daten bleiben unverändert.'
      : 'Wettkampf vom ' + label + ' hinzufügen? Alle anderen Daten bleiben unverändert.';
    if (!confirm(question)) return Promise.resolve();
    return takeSnapshot('vor Import eines Wettkampfs').then(function () {
      migrateMatch(m);
      return DB.put('matches', S.clone(m));
    }).then(loadAll).then(function () {
      dirty = true;
      return takeSnapshot('nach Import eines Wettkampfs');
    }).then(function () {
      if (channel) channel.postMessage({ type: 'changed' });
      render();
      toast(exists ? 'Wettkampf ersetzt' : 'Wettkampf hinzugefügt');
    });
  }

  /** Setzt eine Übung auf den zuletzt freigegebenen Stand zurück. */
  function restoreShownSide(m, d, k, shown) {
    S.SHOWN_FIELDS.forEach(function (f) { d[k][f] = shown[f] === undefined ? null : shown[f]; });
    d[k].nd = d[k].nd || 0;
    d[k].bonus = !!d[k].bonus;
    d[k].zero = !!d[k].zero;
    d[k].dns = !!d[k].dns;
    var tm = team(k === 'home' ? m.homeTeamId : m.guestTeamId);
    var g = tm && tm.gymnasts.filter(function (x) { return x.id === d[k].gymnastId; })[0];
    d[k].number = g ? g.number : shown.number;
    d[k].name = g ? g.name : shown.name;
  }

  /** Oberliga: Duell auf die Tafel bringen (erste Freigabe oder Korrektur). Liefert 'first', 'correction' oder 'none'. */
  function revealDuelNow(m, appKey, idx) {
    var duel = m.apparatus[appKey].duels[idx];
    var wasCorrection = S.hasPendingCorrection(duel);
    if (duel.shown && !wasCorrection) return 'none';
    duel.prevShown = wasCorrection ? duel.shown : null;
    duel.revealKind = wasCorrection ? 'correction' : 'first';
    duel.revealedAt = new Date().toISOString();
    if (!duel.firstRevealedAt) duel.firstRevealedAt = duel.revealedAt;
    duel.shown = { home: S.snapshotSide(duel.home), guest: S.snapshotSide(duel.guest) };
    return wasCorrection ? 'correction' : 'first';
  }

  /** Landesliga: eine einzelne Übung auf die Tafel bringen (erste Freigabe oder Korrektur). */
  function revealSideNow(m, appKey, idx, k) {
    var d = m.apparatus[appKey].duels[idx];
    d.revs = d.revs || { home: { revealedAt: null }, guest: { revealedAt: null } };
    var rev = d.revs[k] = d.revs[k] || { revealedAt: null };
    var wasCorrection = S.sidePending(d, k);
    if (rev.shown && !wasCorrection) return 'none';
    rev.prevShown = wasCorrection ? rev.shown : null;
    rev.revealKind = wasCorrection ? 'correction' : 'first';
    rev.revealedAt = new Date().toISOString();
    if (!rev.firstRevealedAt) rev.firstRevealedAt = rev.revealedAt;
    rev.shown = S.snapshotSide(d[k]);
    return wasCorrection ? 'correction' : 'first';
  }

  // ---------- Wertungsfenster: Eingabe und Freigabe einer Übung ----------
  // Die Kachel zeigt die Werte nur als Text. „Wertung eingeben“ öffnet dieses Fenster; erst „Wertung freigeben“
  // übernimmt die Werte (Landesliga: auf die Tafel; Oberliga: auf die Tafel, sobald beide Turner des Duells freigegeben sind).
  // „Abbrechen“ verwirft die getippten Werte ohne Rückfrage. Der Turner wird im Fenster gewählt (vor der Freigabe sofort
  // gespeichert). Auf Touch-Geräten gibt es eine eigene Zahlentastatur. Aufbau fest von oben nach unten: nichts erscheint
  // oder verschwindet, damit alles an seinem Platz bleibt (auch mit den Leisten des Safari-Browsers ganz sichtbar).

  var KEYPAD_KEY = 'wtb-zahlentastatur';
  var DLG_FIELDS = ['e1', 'e2', 'e3', 'd', 'nd'];
  var DLG_LABEL = { e1: 'Abzüge E1', e2: 'Abzüge E2', e3: 'Abzüge E3', d: 'D-Note', nd: 'Neutr. Abzug' };
  var VAULT = 'VT'; // am Sprung wird die D-Note direkt eingegeben (kein D-Note-Rechner)
  var scoreDlg = null;
  var hwKeySeen = false; // echte Tastatur benutzt: Bildschirm-Tastatur („automatisch“) für diese Sitzung aus
  var dlgScrollY = null; // Scroll-Position der Seite hinter dem Fenster (wird beim Schließen wiederhergestellt)

  function keypadSetting() {
    try { return localStorage.getItem(KEYPAD_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }

  function setKeypadSetting(v) {
    try { localStorage.setItem(KEYPAD_KEY, v); } catch (e) { /* gilt dann nur bis zum Neuladen */ }
  }

  function isTouchDevice() {
    return (navigator.maxTouchPoints || 0) > 0 || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function keypadOn() {
    var set = keypadSetting();
    return set === 'on' || (set === 'auto' && isTouchDevice() && !hwKeySeen);
  }

  function dlgFields(m) {
    return S.eJudgeCount(m.rules) === 3 ? DLG_FIELDS : DLG_FIELDS.filter(function (f) { return f !== 'e3'; });
  }

  /** Getippter Text → Wert (null = leer, NaN = ungültig); neutraler Abzug leer = 0. */
  function dlgValue(field, text) {
    var v = S.parseScore(text);
    if (field === 'nd' && v === null) return 0;
    if (v === null || Number.isNaN(v)) return v;
    return v > (field === 'd' ? 20000 : 10000) || v % 100 !== 0 ? NaN : v;
  }

  function dlgInvalid() {
    return DLG_FIELDS.filter(function (f) { return Number.isNaN(dlgValue(f, scoreDlg.text[f] || '')); });
  }

  /** Noten tippen geht erst mit gewähltem Turner (nicht bei „kein Turner“ und nicht bei „Wertung 0,00“). */
  function dlgEditable() {
    var d = scoreDlg.draft;
    return !!d.gymnastId && !d.dns && !d.zero;
  }

  /** Entwurf als Übung (für E-Note, Endnote und Freigabe). */
  function dlgSide() {
    var s = Object.assign({}, scoreDlg.draft);
    DLG_FIELDS.forEach(function (f) {
      var v = s.dns || s.zero ? (f === 'nd' ? 0 : null) : dlgValue(f, scoreDlg.text[f] || '');
      s[f] = Number.isNaN(v) ? null : v;
    });
    return s;
  }

  function sameAsShown(side, shown) {
    var norm = function (f, v) { return f === 'nd' ? v || 0 : f === 'dns' || f === 'bonus' || f === 'zero' ? !!v : v === undefined ? null : v; };
    return S.SHOWN_FIELDS.every(function (f) { return norm(f, side[f]) === norm(f, shown[f]); });
  }

  /**
   * Reihenfolge für „Weiter ▶“ (Zahlentastatur, im Kreis) und ← / → (Tastatur): E1 → E2 → (E3) → D-Note → Stand → NA
   * (Pauschenpferd ohne Stand).
   */
  function kpOrder(m, appKey) {
    var fs = dlgFields(m).filter(function (f) { return f !== 'nd'; });
    if (appKey !== S.NO_BONUS_APPARATUS) fs.push('bonus');
    return fs.concat('nd');
  }

  /** Erstes leeres Notenfeld (sonst E1); ohne Turner keins. */
  function firstEmptyField(m) {
    if (!dlgEditable()) return null;
    return dlgFields(m).filter(function (f) { return f !== 'nd' && !scoreDlg.text[f]; })[0] || 'e1';
  }

  function dlgWhere(m, g) {
    var classic = isClassic(m);
    var pos = classic ? S.classicPosition(m, g.appKey, g.idx, g.sideKey) : (S.startOrder(m, g.appKey, g.idx)[0] === g.sideKey ? 1 : 2);
    return apparatusName(g.appKey) + ' · ' + (classic ? pos + '. Übung' : 'Duell ' + (g.idx + 1) + ' · ' + pos + '.');
  }

  function openScoreDlg(m, appKey, idx, sideKey) {
    var side = m.apparatus[appKey].duels[idx][sideKey];
    var text = {};
    DLG_FIELDS.forEach(function (f) {
      var v = side[f];
      text[f] = v === null || v === undefined || (f === 'nd' && !v) ? '' : fmt1(v);
    });
    scoreDlg = {
      matchId: m.id, appKey: appKey, idx: idx, sideKey: sideKey, text: text, buf: null, calc: null,
      draft: { gymnastId: side.gymnastId, number: side.number, name: side.name, dns: !!side.dns, bonus: !!side.bonus, zero: !!side.zero,
        dparts: side.dparts ? Object.assign({}, side.dparts) : null },
      correction: sideShown(m, appKey, idx, sideKey)
    };
    scoreDlg.active = firstEmptyField(m);
    if (dlgScrollY === null) dlgScrollY = window.scrollY;
    showScoreDlg(true);
  }

  /** Fenster schließen; restore = Scroll-Position der Seite wiederherstellen (nicht beim Seitenwechsel). */
  function closeScoreDlg(restore) {
    scoreDlg = null;
    var box = document.getElementById('score-dlg');
    if (box) box.innerHTML = '';
    document.body.classList.remove('sd-open');
    document.documentElement.classList.remove('sd-open');
    var y = dlgScrollY;
    dlgScrollY = null;
    if (restore && y !== null && Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }

  /** Zahlentastatur (Wertungsfenster: prefix 'sd', D-Note-Rechner: 'dc'). */
  function keypadHtml(prefix) {
    var out = prefix === 'sd' ? 'data-dlg-out' : 'data-dc-out';
    return '<div class="sd-pad"><div class="sd-disp"><span class="w" ' + out + '="kpwhat"></span><span class="val" ' + out + '="kpval"></span></div>' +
      // 7 8 9 ⌫ / 4 5 6 ◀ Zurück / 1 2 3 Weiter ▶ / 0 0 , Weiter ▶ – „0“ doppelt breit, „Weiter ▶“ doppelt hoch
      '<div class="sd-keys">' + ['7', '8', '9', 'back', '4', '5', '6', 'prev', '1', '2', '3', 'next', '0', ','].map(function (k) {
        var label = { back: '⌫', prev: '◀ Zurück', next: 'Weiter ▶' }[k] || k;
        var area = { back: 'kb', prev: 'kp', next: 'kn', ',': 'kc' }[k] || 'k' + k;
        return '<button type="button" tabindex="-1" class="' + (k === 'next' ? 'k-next' : k === 'back' || k === 'prev' ? 'k-fn' + (k === 'prev' ? ' k-prev' : '') : '') + '" style="grid-area:' + area + '" data-action="' + prefix + '-key" data-k="' + k + '" aria-label="' + label + '">' + label + '</button>';
      }).join('') + '</div></div>';
  }

  function scoreDlgHtml(m) {
    var g = scoreDlg, a = g.appKey, classic = isClassic(m), kp = keypadOn(), edit = dlgEditable();
    var color = sideColor(m, g.sideKey);
    // Per Tab erreichbar sind nur Turner, Notenfelder, Stand und „Wertung freigeben“ (Esc = Abbrechen).
    var timer = FALL_TIMER_APPARATUS.indexOf(a) >= 0 ? fallButton(m, a, g.idx, g.sideKey, sideShown(m, a, g.idx, g.sideKey) || !!g.draft.dns) : '';
    // Mit Zahlentastatur sind die Felder Schaltflächen (iOS behandelt Tipps auf schreibgeschützte Eingabefelder unzuverlässig).
    var field = function (f) {
      var v = g.text[f] || '';
      var ctl = kp
        ? '<button type="button" class="sd-in' + (v ? '' : ' empty') + '" tabindex="-1" data-action="sd-field" data-dlg="' + f + '" aria-label="' + DLG_LABEL[f] + '"' + (edit ? '' : ' disabled') + '>' + (v ? esc(v) : f === 'nd' ? '0,0' : '') + '</button>'
        : '<input type="text" data-dlg="' + f + '" value="' + esc(v) + '" autocomplete="off" inputmode="decimal" aria-label="' + DLG_LABEL[f] + '"' + (f === 'nd' ? ' placeholder="0,0"' : '') + (edit ? '' : ' disabled') + '>';
      var calc = f === 'd' && a !== VAULT ? '<button type="button" class="btn sd-dcalc" tabindex="-1" data-action="dc-open"' + (edit ? '' : ' disabled') + '>berechnen</button>' : '';
      return '<div class="sd-f">' + fieldLabel(DLG_LABEL[f]) + ctl + calc + '</div>';
    };
    var fs = dlgFields(m).filter(function (f) { return f !== 'nd'; });
    var bonus = a !== S.NO_BONUS_APPARATUS ? '<div class="sd-f">' + fieldLabel('Standbonus') + '<label class="sd-box' + (edit ? '' : ' off') + '"><input type="checkbox" data-dlg="bonus"' +
      (g.draft.bonus ? ' checked' : '') + (edit ? '' : ' disabled') + '><span>+0,1</span></label></div>' : '';
    var n = fs.length + 1 + (bonus ? 1 : 0);
    var set = keypadSetting();
    var opt = function (v, l) { return '<option value="' + v + '"' + (set === v ? ' selected' : '') + '>' + l + '</option>'; };
    return '<div class="sd-backdrop"><div class="sd-win' + (kp ? ' kp' : '') + '" role="dialog" aria-modal="true" aria-label="Wertung" tabindex="-1" style="--team:' + color.hex + ';--team-fg:' + color.fg + '">' +
      '<div class="sd-main"><div class="sd-head"><span class="sd-where">' + dlgWhere(m, g) + '</span>' + timer + '</div>' +
      '<div class="sd-gym"><span class="sd-tag">' + teamHtml(g.sideKey === 'home' ? m.homeTeamId : m.guestTeamId) + '</span>' +
      '<select class="sd-gsel" data-dlg="gymnast" aria-label="Turner">' + gymnastOptions(m, a, g.idx, g.sideKey, g.draft) + '</select></div>' +
      '<div class="sd-fields" style="--n:' + n + '">' + fs.map(field).join('') + bonus + field('nd') + '</div>' +
      '<div class="sd-res"><label class="check"><input type="checkbox" tabindex="-1" data-dlg="zero"' + (g.draft.zero ? ' checked' : '') + (g.draft.gymnastId && !g.draft.dns ? '' : ' disabled') + '> Wertung 0,00</label>' +
      '<span class="sd-n">' + (classic ? '' : '<span class="pv" data-dlg-out="pvbox" title="Vorschau: Scorepunkte des Duells">Duell <b data-dlg-out="prev"></b></span>') +
      '<span>E-Note <b data-dlg-out="enote"></b></span><span class="fin">Endnote <b data-dlg-out="final"></b></span></span></div>' +
      '<div class="sd-hint" data-dlg-out="hint"></div>' +
      '<div class="sd-btns"><button type="button" class="btn" tabindex="-1" data-action="sd-cancel">Abbrechen</button>' +
      '<button type="button" class="btn primary" data-action="sd-release">' + (g.correction ? 'Korrektur freigeben' : 'Wertung freigeben') + '</button></div>' +
      '<div class="sd-set"><label>Zahlentastatur <select tabindex="-1" data-dlg="keypad">' + opt('auto', 'automatisch') + opt('on', 'immer') + opt('off', 'nie') + '</select></label></div>' +
      '</div>' + (kp ? keypadHtml('sd') : '') + '</div></div>' + (g.calc ? calcHtml(m) : '');
  }

  function showScoreDlg(focus) {
    var box = document.getElementById('score-dlg');
    var m = scoreDlg && match(scoreDlg.matchId);
    if (!box || !m) { closeScoreDlg(); return; }
    box.innerHTML = scoreDlgHtml(m);
    document.body.classList.add('sd-open');
    document.documentElement.classList.add('sd-open');
    fitFieldLabels();
    refreshScoreDlg();
    if (scoreDlg.calc) refreshCalc();
    tickTimers();
    if (focus) { if (scoreDlg.calc) focusCalcField(); else focusDlgField(); }
  }

  /**
   * Fokus im Fenster: ohne Turner auf die Auswahl (nicht bei Touch – iOS öffnet die Liste sonst sofort), sonst auf das aktive
   * Feld bzw. „Wertung freigeben“. Mit Zahlentastatur aufs Fenster selbst (die Seite dahinter bekommt keine Tasten).
   */
  function focusDlgField() {
    var box = document.getElementById('score-dlg'), g = scoreDlg;
    if (!box || !g) return;
    var el;
    if (!g.draft.gymnastId && !g.draft.dns) el = keypadOn() || lastPointerType === 'touch' || lastPointerType === 'pen' ? box.querySelector('.sd-win') : box.querySelector('select[data-dlg="gymnast"]');
    else if (keypadOn()) el = box.querySelector('.sd-win');
    else el = box.querySelector('input[data-dlg="' + (g.active || '') + '"]:not([disabled])') || box.querySelector('[data-action="sd-release"]:not([disabled])') || box.querySelector('.sd-win');
    if (!el) return;
    el.focus({ preventScroll: true });
    if (el.tagName === 'INPUT') el.select();
  }

  /**
   * Schrift der Notenfelder an ihre Breite anpassen: „10,0“ passt auch bei sechs Feldern auf 360 px breiten Handys.
   * Alle Felder sind gleich breit und haben dieselbe Schriftgröße.
   */
  function fitDlgFont() {
    var box = document.querySelector('#score-dlg .sd-fields');
    var el = box && box.querySelector('.sd-fields [data-dlg="e1"]');
    if (!el) return;
    var cs = getComputedStyle(el);
    var inner = el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
    // Breite von „10,0“ je px Schriftgröße – gemessen in der Schrift der Felder (Ziffern gleicher Breite)
    var probe = document.createElement('span');
    probe.textContent = '10,0';
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;font-variant-numeric:tabular-nums;font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight;
    box.appendChild(probe);
    var per = (probe.getBoundingClientRect().width || 225) / 100 * 1.04;
    box.removeChild(probe);
    var max = window.innerWidth <= 560 ? 28 : 22;
    box.style.setProperty('--sd-fs', Math.max(13, Math.min(max, Math.floor(inner / per))) + 'px');
  }

  /** Berechnete Werte, Vorschau, Hinweis und Freigabe-Knopf nachziehen (ohne die Felder neu aufzubauen). */
  function refreshScoreDlg() {
    var box = document.getElementById('score-dlg');
    var g = scoreDlg, m = g && match(g.matchId);
    if (!box || !m) return;
    fitDlgFont();
    var out = function (k, html) { var el = box.querySelector('[data-dlg-out="' + k + '"]'); if (el) el.innerHTML = html; };
    var side = dlgSide(), bad = dlgInvalid(), kp = keypadOn();
    var d = m.apparatus[g.appKey].duels[g.idx];
    out('enote', fmt(S.eScore(side, m.rules)));
    out('final', fmt(S.sideFinal(side, m.rules)));
    DLG_FIELDS.forEach(function (f) {
      var el = box.querySelector('.sd-fields [data-dlg="' + f + '"]');
      if (!el) return;
      el.classList.toggle('invalid', bad.indexOf(f) >= 0);
      if (el.tagName === 'BUTTON') {
        var t = g.text[f] || '', shown = t || (f === 'nd' ? '0,0' : '');
        if (el.textContent !== shown) el.textContent = shown;
        el.classList.toggle('empty', !t);
        el.classList.toggle('active', f === g.active);
      }
    });
    var noGym = !g.draft.gymnastId && !g.draft.dns;
    var ready = !bad.length && sideReady(m, side);
    var shown = isClassic(m) ? S.revOf(d, g.sideKey).shown : d.shown && d.shown[g.sideKey];
    var changed = !shown || !sameAsShown(side, shown) || (isClassic(m) ? S.sidePending(d, g.sideKey) : S.hasPendingCorrection(d));
    var rel = box.querySelector('[data-action="sd-release"]');
    if (rel) { rel.disabled = !(ready && changed); rel.classList.toggle('sd-next', kp && !g.active && !rel.disabled); }
    var other = d[g.sideKey === 'home' ? 'guest' : 'home'];
    var otherReady = sideReady(m, other);
    out('hint', noGym ? 'Erst den Turner wählen.' :
      bad.length ? 'Ungültiger Wert – eine Nachkommastelle, z. B. ' + (bad[0] === 'd' ? '4,5' : '1,3') :
      ready && !changed ? 'Keine Änderung' :
      !isClassic(m) && !otherReady && !shown ? 'Die Note erscheint mit dem Duell auf der Tafel.' : '');
    // Oberliga: Vorschau – nur die Scorepunkte des Duells in der Farbe der Mannschaft (unentschieden: 0 in Schwarz)
    var pv = box.querySelector('[data-dlg-out="pvbox"]');
    if (pv) {
      var html = '';
      if (ready && otherReady) {
        var duel = { home: g.sideKey === 'home' ? side : d.home, guest: g.sideKey === 'guest' ? side : d.guest };
        var res = S.duelResult(duel, m.rules);
        html = res.winner === 'draw' ? '<span class="sp-num draw0">0</span>' : pts(m, res.winner, res.winner === 'home' ? res.homePoints : res.guestPoints);
      }
      out('prev', html);
      pv.classList.toggle('on', !!html);
    }
    if (kp) {
      var f = g.active;
      var sbox = box.querySelector('.sd-box');
      if (sbox) sbox.classList.toggle('active', f === 'bonus');
      out('kpwhat', noGym ? 'Erst den Turner wählen' : f ? esc(f === 'bonus' ? 'Standbonus' : DLG_LABEL[f]) + ' · <b>' + esc(gymnastLabel(g.draft.number, g.draft.name)) + '</b>' : '');
      out('kpval', f === 'bonus' ? (g.draft.bonus ? '+0,1' : '–') : f ? esc(g.text[f] || '–') : '');
      // Stand aktiv: nur 1, 0 und ⌫ – Ziffern 2–9 und Komma ausgegraut
      box.querySelectorAll('[data-action="sd-key"]').forEach(function (kb) {
        if (/^[2-9,]$/.test(kb.getAttribute('data-k'))) kb.disabled = f === 'bonus';
      });
    }
  }

  /**
   * Bildschirm-Tastatur: genau das Getippte („4 , 5“ = 4,5; „4“ = 4,0 beim Verlassen des Feldes), kein automatisches Komma.
   * maxInt = Ziffern vor dem Komma. Liefert den neuen Text oder null (Taste ohne Wirkung).
   */
  function typeKey(buf, k, maxInt) {
    if (/^\d$/.test(k)) {
      var comma = buf.indexOf(',');
      if (comma >= 0) return buf.length - comma > 1 ? null : buf + k;
      if (buf === '0') return k;
      return buf.length >= maxInt ? null : buf + k;
    }
    if (k === ',') return buf.indexOf(',') >= 0 ? null : (buf === '' ? '0' : buf) + ',';
    if (k === 'back') return buf.slice(0, -1);
    return null;
  }

  function keypadPress(k) {
    var g = scoreDlg, m = g && match(g.matchId);
    if (!m || !dlgEditable()) return;
    if (k === 'next' || k === 'prev') { moveDlgActive(m, k === 'prev' ? -1 : 1); return; }
    var f = g.active;
    if (!f) return;
    if (f === 'bonus') {
      // Standbonus: 1 = ja (+0,1), 0 oder ⌫ = nein
      if (k !== '1' && k !== '0' && k !== 'back') return;
      g.draft.bonus = k === '1';
      var cb = document.querySelector('#score-dlg input[data-dlg="bonus"]');
      if (cb) cb.checked = g.draft.bonus;
      refreshScoreDlg();
      return;
    }
    var nb = typeKey(g.buf === null ? '' : g.buf, k, 2);
    if (nb === null) return;
    g.buf = nb;
    g.text[f] = nb;
    refreshScoreDlg();
  }

  /** Aktives Feld verlassen: gültigen Wert einheitlich anzeigen (4 → 4,0; 4.5 → 4,5). */
  function commitDlgField() {
    var g = scoreDlg, f = g && g.active;
    if (!f || !g.text[f]) return;
    var v = dlgValue(f, g.text[f]);
    if (v !== null && !Number.isNaN(v) && !(f === 'nd' && v === 0)) g.text[f] = fmt1(v);
    var el = document.querySelector('#score-dlg input[data-dlg="' + f + '"]');
    if (el) el.value = g.text[f];
  }

  /**
   * Zahlentastatur: „Weiter ▶“ / „◀ Zurück“ – nächstes bzw. voriges Feld im Kreis E1 → … → Stand → NA → E1
   * („Wertung freigeben“ wird angetippt).
   */
  function moveDlgActive(m, dir) {
    var g = scoreDlg, ko = kpOrder(m, g.appKey);
    commitDlgField();
    var i = ko.indexOf(g.active);
    g.active = ko[((i < 0 ? (dir > 0 ? -1 : 0) : i) + dir + ko.length) % ko.length];
    g.buf = null;
    refreshScoreDlg();
  }

  /**
   * Echte Tastatur: → und Enter vorwärts, ← rückwärts im Kreis E1 → … → Stand → NA → „Wertung freigeben“ → E1;
   * „Wertung freigeben“ nur, wenn der Knopf aktiv ist (sonst übersprungen). from: Feld, 'release' oder 'calc' („berechnen“).
   */
  function dlgStep(m, dir, from) {
    var g = scoreDlg;
    if (from === 'calc') from = 'd';
    if (from !== 'release') { g.active = from; commitDlgField(); refreshScoreDlg(); }
    var order = kpOrder(m, g.appKey);
    var rel = document.querySelector('#score-dlg [data-action="sd-release"]');
    if (rel && !rel.disabled) order.push('release');
    var i = order.indexOf(from);
    if (i < 0) i = from === 'release' ? order.length : -1;
    var next = order[(i + dir + order.length) % order.length];
    g.buf = null;
    if (next === 'release') { rel.focus({ preventScroll: true }); return; }
    g.active = next;
    refreshScoreDlg();
    focusDlgField();
  }

  function releaseScoreDlg() {
    var g = scoreDlg, m = g && match(g.matchId);
    if (!m) { closeScoreDlg(true); return; }
    commitDlgField();
    var side = dlgSide();
    if (m.status === 'final' || dlgInvalid().length || !sideReady(m, side)) return;
    var d = m.apparatus[g.appKey].duels[g.idx], live = d[g.sideKey];
    ['d', 'e1', 'e2', 'e3', 'bonus', 'zero'].forEach(function (f) { live[f] = side[f]; });
    live.nd = side.nd || 0;
    // Anzahlen aus dem D-Note-Rechner nur speichern, wenn sie zur freigegebenen D-Note passen.
    var parts = g.draft.dparts;
    live.dparts = parts && side.d !== null && !side.zero && !side.dns && dpartsValue(parts) === side.d ? parts : null;
    if (g.correction) { live.gymnastId = side.gymnastId; live.number = side.number; live.name = side.name; live.dns = side.dns; }
    if (live.dns && !isClassic(m)) live.dnsReleased = true; else delete live.dnsReleased;
    var kind = isClassic(m) ? revealSideNow(m, g.appKey, g.idx, g.sideKey)
      : duelReady(S.duelResult(d, m.rules), d) ? revealDuelNow(m, g.appKey, g.idx) : 'stored';
    var viaKeyboard = lastInputKeyboard;
    var key = g.appKey + '-' + g.idx + '-' + g.sideKey;
    closeScoreDlg(true);
    save('matches', m).then(function () {
      rerenderPanel(m);
      if (viaKeyboard) focusNextScoreBtn(key, kind !== 'correction');
      toast(kind === 'correction' ? 'Korrektur freigegeben' : kind === 'stored' ? 'Wertung erfasst – erscheint mit dem Duell auf der Tafel' : kind === 'none' ? 'Keine Änderung' : 'Wertung freigegeben');
    });
  }

  function cancelScoreDlg() {
    var g = scoreDlg, m = g && match(g.matchId);
    closeScoreDlg(true);
    if (!m) return;
    var d = m.apparatus[g.appKey].duels[g.idx];
    var key = g.appKey + '-' + g.idx + '-' + g.sideKey;
    // Offene Korrektur aus einer älteren Version: „Abbrechen“ verwirft sie.
    if (isClassic(m) ? S.sidePending(d, g.sideKey) : S.hasPendingCorrection(d)) {
      (isClassic(m) ? [g.sideKey] : ['home', 'guest']).forEach(function (k) {
        restoreShownSide(m, d, k, isClassic(m) ? S.revOf(d, k).shown : d.shown[k]);
      });
      save('matches', m).then(function () { rerenderPanel(m); focusNextScoreBtn(key, false); toast('Änderung verworfen'); });
      return;
    }
    if (lastInputKeyboard) focusNextScoreBtn(key, false);
  }

  /**
   * Fokus nach dem Fenster: bei „next“ auf „Wertung eingeben“ des nächsten Turners in Wettkampfreihenfolge,
   * sonst zurück auf „Wertung eingeben“ dieses Turners.
   */
  function focusNextScoreBtn(key, next) {
    var sides = Array.prototype.slice.call($app.querySelectorAll('#apparatus-panel .side'));
    var pos = sides.map(function (sd) { return sd.getAttribute('data-key'); }).indexOf(key);
    var list = next ? sides.slice(pos + 1) : sides.slice(pos, pos + 1);
    for (var i = 0; i < list.length; i++) {
      var el = list[i].querySelector('.score-btn:not([disabled])');
      if (el) { el.focus(); return; }
    }
  }

  /**
   * Turner einer Übung setzen – in der Kachel und im Wertungsfenster (vor der Freigabe), sofort gespeichert.
   * „Kein Turner“ löscht schon erfasste Noten nach Rückfrage (askAlso: auch wenn erst im Fenster getippt wurde).
   * Liefert ein Promise: true = gesetzt, false = Rückfrage verneint.
   */
  function applyGymnastChoice(m, appKey, idx, sideKey, value, askAlso) {
    var side = m.apparatus[appKey].duels[idx][sideKey];
    if (value === NO_GYMNAST) {
      var hasScores = side.d !== null || side.e1 !== null || side.e2 !== null || side.e3 !== null || side.nd || side.bonus || side.zero;
      var setNone = function () {
        Object.assign(side, S.emptySide(), { dns: true });
        if (side.dparts) side.dparts = null;
        delete side.dnsReleased;
        return save('matches', m).then(function () { return true; });
      };
      if (!hasScores && !askAlso) return setNone();
      return askConfirm('„Kein Turner“: Die bereits eingegebenen Wertungen dieser Übung werden gelöscht. Fortfahren?').then(function (yes) {
        return yes ? setNone() : false;
      });
    }
    side.dns = false;
    delete side.dnsReleased;
    var tm = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
    var gy = tm && tm.gymnasts.filter(function (x) { return x.id === value; })[0];
    side.gymnastId = value || null;
    side.number = gy ? gy.number : null;
    side.name = gy ? gy.name : '';
    // Ohne Turner gibt es keine Wertung 0,00.
    if (!side.gymnastId) side.zero = false;
    return save('matches', m).then(function () { return true; });
  }

  /** Eingaben im Fenster: Felder, Standbonus, Wertung 0,00, Turner und Einstellung der Zahlentastatur. */
  function handleDlgChange(el) {
    var g = scoreDlg, m = g && match(g.matchId);
    if (!m) return;
    var f = el.getAttribute('data-dlg');
    if (f === 'keypad') { setKeypadSetting(el.value); if (el.value !== 'auto') hwKeySeen = false; showScoreDlg(true); return; }
    if (f === 'bonus') {
      g.draft.bonus = el.checked;
      if (keypadOn()) { commitDlgField(); g.active = 'bonus'; g.buf = null; }
      refreshScoreDlg();
      return;
    }
    if (f === 'zero') {
      var setZero = function (on) {
        g.draft.zero = on;
        if (on) { DLG_FIELDS.forEach(function (x) { g.text[x] = ''; }); g.draft.bonus = false; g.draft.dparts = null; }
        g.active = firstEmptyField(m);
        g.buf = null;
        showScoreDlg(true);
      };
      // Sind schon Werte eingetragen, erst nachfragen (wie bis Beta 76 und wie bei „kein Turner“).
      var entered = el.checked && (g.draft.bonus || DLG_FIELDS.some(function (x) {
        var t = String(g.text[x] || '').trim();
        if (!t) return false;
        var v = dlgValue(x, t);
        return x === 'nd' ? !!v : true;
      }));
      if (!entered) { setZero(el.checked); return; }
      el.checked = false;
      askConfirm('Wertung 0,00: Die bereits eingegebenen Wertungen dieser Übung werden gelöscht. Fortfahren?').then(function (yes) {
        if (scoreDlg !== g) return;
        if (yes) setZero(true); else showScoreDlg(true);
      });
      return;
    }
    if (f === 'gymnast') {
      var touch = lastPointerType === 'touch' || lastPointerType === 'pen';
      if (g.correction) {
        // Nach der Freigabe gehört ein Turnerwechsel zur Korrektur („Korrektur freigeben“).
        if (el.value === NO_GYMNAST) {
          Object.assign(g.draft, { gymnastId: null, number: null, name: '', dns: true, bonus: false, zero: false, dparts: null });
          DLG_FIELDS.forEach(function (x) { g.text[x] = ''; });
        } else {
          var tm = team(g.sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
          var gy = tm && tm.gymnasts.filter(function (x) { return x.id === el.value; })[0];
          Object.assign(g.draft, { gymnastId: el.value || null, number: gy ? gy.number : null, name: gy ? gy.name : '', dns: false });
          if (!g.draft.gymnastId) g.draft.zero = false;
        }
        g.active = firstEmptyField(m);
        g.buf = null;
        showScoreDlg(!touch);
        return;
      }
      // Vor der Freigabe: Turner sofort speichern (wie in der Kachel); getippte Noten bleiben im Fenster.
      var typed = DLG_FIELDS.some(function (x) { return !!g.text[x]; }) || g.draft.bonus || g.draft.zero;
      applyGymnastChoice(m, g.appKey, g.idx, g.sideKey, el.value, typed).then(function (done) {
        if (scoreDlg !== g) return;
        if (done) {
          var live = m.apparatus[g.appKey].duels[g.idx][g.sideKey];
          Object.assign(g.draft, { gymnastId: live.gymnastId, number: live.number, name: live.name, dns: !!live.dns });
          if (live.dns) {
            DLG_FIELDS.forEach(function (x) { g.text[x] = ''; });
            Object.assign(g.draft, { bonus: false, zero: false, dparts: null });
          }
          if (!live.gymnastId) g.draft.zero = false;
          rerenderPanel(m);
        }
        g.active = firstEmptyField(m);
        g.buf = null;
        showScoreDlg(!touch);
      });
      return;
    }
    // Textfeld verlassen: gültigen Wert einheitlich anzeigen (z. B. 4.5 → 4,5)
    var v = dlgValue(f, el.value);
    if (v !== null && !Number.isNaN(v) && !(f === 'nd' && v === 0)) { el.value = fmt1(v); g.text[f] = el.value; }
    refreshScoreDlg();
  }

  // ---------- D-Note-Rechner (im Wertungsfenster unter der D-Note; nicht am Sprung) ----------
  // Anzahl der Elemente je Wertigkeit getippt (höchstens 8 Elemente insgesamt) plus Elementgruppen (EG, höchstens 2,3).
  // „Übernehmen“ trägt die D-Note ins Wertungsfenster ein; die Anzahlen werden mit der Wertung gespeichert (side.dparts).

  var DC_ROWS = [['D', '≥ D', 800], ['C', 'C', 600], ['B', 'B', 400], ['A', 'A', 200]];
  var DC_FIELDS = ['D', 'C', 'B', 'A', 'EG'];
  var DC_MAX_ELEMENTS = 8;
  var DC_MAX_EG = 2300;

  /** Gespeicherte Anzahlen → D-Note (Tausendstel). */
  function dpartsValue(p) {
    return DC_ROWS.reduce(function (s, r) { return s + r[2] * (p[r[0]] || 0); }, 0) + (p.EG || 0);
  }

  function openCalc() {
    var g = scoreDlg;
    if (!g || !dlgEditable() || g.appKey === VAULT) return;
    commitDlgField();
    // Gespeicherte Anzahlen nur, wenn sie genau die D-Note im Feld ergeben (sonst wurde sie von Hand geändert: leer beginnen).
    var p = g.draft.dparts, t = {};
    if (p && dpartsValue(p) !== dlgValue('d', g.text.d || '')) p = null;
    DC_FIELDS.forEach(function (f) { t[f] = p && p[f] ? (f === 'EG' ? fmt1(p[f]) : String(p[f])) : ''; });
    g.calc = { text: t, active: 'D', buf: null, last: null };
    showScoreDlg(true);
  }

  /** Stand des Rechners: Anzahlen, Summen, ungültige Felder, Ergebnis (null, solange etwas nicht stimmt). */
  function dcState() {
    var c = scoreDlg.calc, bad = [], n = {}, total = 0, sum = 0;
    DC_ROWS.forEach(function (r) {
      var t = String(c.text[r[0]] || '').trim();
      var v = t === '' ? 0 : /^\d{1,2}$/.test(t) ? parseInt(t, 10) : NaN;
      if (Number.isNaN(v)) { bad.push(r[0]); v = 0; }
      n[r[0]] = v;
      total += v;
      sum += v * r[2];
    });
    var eg = S.parseScore(c.text.EG || '');
    if (eg === null) eg = 0;
    if (Number.isNaN(eg) || eg % 100 !== 0 || eg > DC_MAX_EG) { bad.push('EG'); eg = NaN; }
    var over = total > DC_MAX_ELEMENTS;
    // Leere Felder zählen als 0: ohne Eingaben ergibt der Rechner D-Note 0,0 (z. B. nur Teile unterhalb von A).
    var ok = !bad.length && !over;
    return { n: n, total: total, sum: sum, eg: eg, bad: bad, over: over, ok: ok, value: ok ? sum + eg : null };
  }

  function dcLabel(f) {
    return f === 'EG' ? 'EG' : DC_ROWS.filter(function (r) { return r[0] === f; })[0][1];
  }

  function calcHtml(m) {
    var g = scoreDlg, c = g.calc, kp = keypadOn(), color = sideColor(m, g.sideKey);
    var inp = function (f) {
      var v = c.text[f] || '', lbl = f === 'EG' ? 'Elementgruppen' : 'Anzahl ' + dcLabel(f);
      return kp ? '<button type="button" class="dc-in" tabindex="-1" data-action="dc-field" data-dc="' + f + '" aria-label="' + lbl + '">' + esc(v) + '</button>'
        : '<input type="text" data-dc="' + f + '" value="' + esc(v) + '" autocomplete="off" inputmode="' + (f === 'EG' ? 'decimal' : 'numeric') + '" aria-label="' + lbl + '">';
    };
    var rows = DC_ROWS.map(function (r) {
      return '<span class="l">' + r[1] + '</span><span class="v">je ' + fmt1(r[2]) + '</span>' + inp(r[0]) + '<span class="s" data-dc-out="s' + r[0] + '"></span>';
    }).join('');
    return '<div class="dc-backdrop"><div class="dc-win' + (kp ? ' kp' : '') + '" role="dialog" aria-modal="true" aria-label="D-Note berechnen" tabindex="-1" style="--team:' + color.hex + '">' +
      '<div class="dc-main"><div class="dc-where">D-Note berechnen · ' + dlgWhere(m, g) + '</div>' +
      '<div class="dc-title">' + esc(gymnastLabel(g.draft.number, g.draft.name)) + '</div>' +
      '<div class="dc-grid">' + rows + '<div class="dc-sum" data-dc-out="sum"></div>' +
      '<span class="l">EG</span><span class="v">Elementgruppen</span>' + inp('EG') + '<span class="s" data-dc-out="sEG"></span></div>' +
      '<div class="dc-res"><span>D-Note</span><b data-dc-out="val"></b></div>' +
      '<div class="dc-btns"><button type="button" class="btn" tabindex="-1" data-action="dc-cancel">Abbrechen</button>' +
      '<button type="button" class="btn primary" data-action="dc-ok">Übernehmen</button></div></div>' +
      (kp ? keypadHtml('dc') : '') + '</div></div>';
  }

  function refreshCalc() {
    var box = document.getElementById('score-dlg'), g = scoreDlg, c = g && g.calc;
    if (!box || !c) return;
    var st = dcState(), kp = keypadOn();
    var out = function (k, html) { var el = box.querySelector('[data-dc-out="' + k + '"]'); if (el) el.innerHTML = html; };
    DC_ROWS.forEach(function (r) { out('s' + r[0], c.text[r[0]] && st.bad.indexOf(r[0]) < 0 ? fmt1(st.n[r[0]] * r[2]) : '–'); });
    out('sEG', c.text.EG && st.bad.indexOf('EG') < 0 ? fmt1(st.eg) : '–');
    var sum = box.querySelector('[data-dc-out="sum"]');
    if (sum) sum.classList.toggle('bad', st.over);
    var left = DC_MAX_ELEMENTS - st.total;
    var elw = function (n) { return '<b>' + n + '</b> ' + (n === 1 ? 'Element' : 'Elemente'); };
    out('sum', '<span' + (left === 0 ? ' class="full"' : '') + '>' + (st.over ? elw(-left) + ' zu viel' : left === 0 ? 'keine Elemente mehr möglich' : 'noch ' + elw(left) + ' möglich') +
      '</span><span>Summe <b>' + fmt1(st.sum) + '</b></span>');
    out('val', st.value === null ? '–' : fmt1(st.value));
    DC_FIELDS.forEach(function (f) {
      var el = box.querySelector('[data-dc="' + f + '"]');
      if (!el) return;
      el.classList.toggle('invalid', st.bad.indexOf(f) >= 0 || (st.over && f === c.last));
      if (kp) {
        if (el.textContent !== (c.text[f] || '')) el.textContent = c.text[f] || '';
        el.classList.toggle('active', f === c.active);
      }
    });
    var ok = box.querySelector('[data-action="dc-ok"]');
    if (ok) { ok.disabled = !st.ok; ok.classList.toggle('sd-next', kp && !c.active && st.ok); }
    if (kp) {
      out('kpwhat', c.active ? dcLabel(c.active) + ' · <b>' + esc(gymnastLabel(g.draft.number, g.draft.name)) + '</b>' : 'Feld antippen');
      out('kpval', c.active ? esc(c.text[c.active] || '–') : '');
      // Anzahlen sind ganze Zahlen: Komma nur bei EG
      var comma = box.querySelector('[data-action="dc-key"][data-k=","]');
      if (comma) comma.disabled = c.active !== 'EG';
    }
  }

  function focusCalcField() {
    var box = document.getElementById('score-dlg'), c = scoreDlg && scoreDlg.calc;
    if (!box || !c) return;
    var el = keypadOn() ? box.querySelector('.dc-win')
      : c.active ? box.querySelector('input[data-dc="' + c.active + '"]') : box.querySelector('[data-action="dc-ok"]:not([disabled])') || box.querySelector('input[data-dc="EG"]');
    if (!el) return;
    el.focus({ preventScroll: true });
    if (el.tagName === 'INPUT') el.select();
  }

  /** Rechner-Tastatur: Anzahl = eine Ziffer (die nächste ersetzt sie), EG wie die Notenfelder. */
  function calcKey(k) {
    var c = scoreDlg && scoreDlg.calc;
    if (!c) return;
    if (k === 'next' || k === 'prev') { moveCalcActive(k === 'prev' ? -1 : 1); return; }
    var f = c.active;
    if (!f) return;
    var nb = f === 'EG' ? typeKey(c.buf === null ? '' : c.buf, k, 2) : /^\d$/.test(k) ? k : k === 'back' ? '' : null;
    if (nb === null) return;
    c.buf = nb;
    c.text[f] = nb;
    if (f !== 'EG') c.last = f;
    refreshCalc();
  }

  /** EG beim Verlassen einheitlich anzeigen (2 → 2,0). */
  function commitCalcField() {
    var c = scoreDlg && scoreDlg.calc;
    if (!c || c.active !== 'EG' || !c.text.EG) return;
    var v = S.parseScore(c.text.EG);
    if (v !== null && !Number.isNaN(v) && v % 100 === 0) c.text.EG = fmt1(v);
    var el = document.querySelector('#score-dlg input[data-dc="EG"]');
    if (el) el.value = c.text.EG;
  }

  /**
   * Zahlentastatur: „Weiter ▶“ / „◀ Zurück“ im Kreis ≥ D → C → B → A → EG („Übernehmen“ wird angetippt).
   * Echte Tastatur: → und Enter vorwärts, ← rückwärts im Kreis ≥ D → … → EG → „Übernehmen“ (nur wenn möglich) → ≥ D.
   */
  function moveCalcActive(dir, from) {
    var c = scoreDlg.calc;
    dir = dir || 1;
    if (from && from !== 'ok') c.active = from;
    commitCalcField();
    var order = DC_FIELDS.slice();
    if (!keypadOn() && dcState().ok) order.push('ok');
    var cur = from === 'ok' ? 'ok' : c.active;
    var i = order.indexOf(cur);
    if (i < 0) i = cur === 'ok' ? order.length : -1;
    var next = order[(i + dir + order.length) % order.length];
    c.buf = null;
    if (next === 'ok') {
      c.active = null;
      refreshCalc();
      var ok = document.querySelector('#score-dlg [data-action="dc-ok"]');
      if (ok) ok.focus({ preventScroll: true });
      return;
    }
    c.active = next;
    refreshCalc();
    if (!keypadOn()) focusCalcField();
  }

  function calcOk() {
    var g = scoreDlg, c = g && g.calc, m = g && match(g.matchId);
    if (!c || !m) return;
    commitCalcField();
    var st = dcState();
    if (!st.ok) return;
    // Wird ein Element anerkannt, ist immer auch eine Elementgruppe anerkannt: ohne EG nicht übernehmen.
    if (st.total > 0 && !st.eg) {
      askChoice('Elementgruppen fehlen', 'Es sind Elemente eingetragen, aber keine Elementgruppen.', null,
        [{ label: 'Elementgruppen eintragen', value: true, primary: true, focus: true, cancel: true }]).then(function () {
        if (!scoreDlg || scoreDlg.calc !== c) return;
        c.active = 'EG';
        c.buf = null;
        refreshCalc();
        focusCalcField();
      });
      return;
    }
    g.draft.dparts = { D: st.n.D, C: st.n.C, B: st.n.B, A: st.n.A, EG: st.eg };
    g.text.d = fmt1(st.value);
    g.calc = null;
    // Die Auswahl bleibt auf der D-Note (die übernommene Note ist gleich zu sehen); „Weiter“ führt zum Standbonus.
    g.active = 'd';
    g.buf = null;
    showScoreDlg(true);
  }

  function calcCancel() {
    var g = scoreDlg;
    if (!g) return;
    g.calc = null;
    showScoreDlg(false);
    var b = !keypadOn() && document.querySelector('#score-dlg [data-action="dc-open"]');
    if (b) b.focus({ preventScroll: true }); else focusDlgField();
  }

  /** Tasten im Rechner (echte Tastatur): Enter/→/↓ vorwärts, ←/↑ rückwärts (bis „Übernehmen“), Esc = Abbrechen, Tab bleibt im Rechner. */
  function calcKeydown(ev) {
    var box = document.getElementById('score-dlg'), el = ev.target;
    if (ev.key === 'Escape') { ev.preventDefault(); calcCancel(); return; }
    if (ev.key === 'Tab') { trapTab(ev, box.querySelector('.dc-win')); return; }
    if (keypadOn() || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var item = el.matches && el.matches('#score-dlg input[data-dc]') ? el.getAttribute('data-dc')
      : el.matches && el.matches('#score-dlg [data-action="dc-ok"]') ? 'ok' : null;
    if (!item) return;
    if (ev.key === 'Enter') {
      if (item === 'ok') return; // Enter auf „Übernehmen“ übernimmt
      ev.preventDefault();
      moveCalcActive(1, item);
      return;
    }
    // Die Felder stehen untereinander: ↓ wie → (nächstes Feld), ↑ wie ← (voriges Feld), im selben Kreis.
    if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && !ev.shiftKey) {
      ev.preventDefault();
      moveCalcActive(ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : -1, item);
      return;
    }
  }

  /** Tab-Taste: Fokus bleibt im Fenster (win). */
  function trapTab(ev, win) {
    if (!win) return;
    var foc = Array.prototype.slice.call(win.querySelectorAll('input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])'));
    if (!foc.length) return;
    var at = foc.indexOf(ev.target);
    if (ev.shiftKey && at <= 0) { ev.preventDefault(); foc[foc.length - 1].focus(); }
    else if (!ev.shiftKey && (at === foc.length - 1 || at < 0)) { ev.preventDefault(); foc[0].focus(); }
  }

  // ---------- Menüband (Laptop, iPad) und Aufklappmenüs (Handy) ----------
  // Kopfzeile: „WTB-Oberliga ▾“ (Aufklappmenü der Liga) und auf der Wettkampfseite „Anzeigetafel“ / „Wettkampf“.
  // Ab 700 × 500 px sind das Reiter eines Menübands: darunter immer eine Leiste mit den Knöpfen des gewählten Reiters
  // (nicht einklappbar). Kleiner (Handy) sind es Aufklappmenüs, die nach der Auswahl schließen. Die Knöpfe gibt es nur einmal.
  var RIBBON_MQ = window.matchMedia ? window.matchMedia('(min-width: 700px) and (min-height: 500px)') : null;
  var openMenu = null;
  // Gewählter Reiter des Menübands: beim Öffnen eines Wettkampfs immer „Anzeigetafel“; innerhalb der Wettkampfseite
  // bleibt die Wahl stehen (nicht mehr gespeichert – den früher gemerkten Wert räumen wir einmal weg).
  var ribbonChoice = 'board', ribbonMatchId = null;
  try { localStorage.removeItem('wtb-menueband'); } catch (e) { /* ohne Speicher nichts zu tun */ }

  function ribbonMode() { return !!(RIBBON_MQ && RIBBON_MQ.matches); }

  function ribbonTab() { return ribbonChoice; }

  /** Gewählten Reiter des Menübands anzeigen (Leiste und Reiter). */
  function applyRibbonTab() {
    var t = ribbonTab();
    document.body.classList.toggle('rb-board', t === 'board');
    document.body.classList.toggle('rb-match', t === 'match');
    document.querySelectorAll('.tb-tab').forEach(function (b) {
      var on = b.getAttribute('data-menu') === t;
      b.classList.toggle('on', on);
      if (ribbonMode()) b.setAttribute('aria-pressed', on ? 'true' : 'false'); else b.removeAttribute('aria-pressed');
    });
  }

  /**
   * Reiter bzw. Menüknopf „Anzeigetafel“: Läuft die Wettkampfpause, steht die Restzeit daran – am Handy als „Pause 4:12“
   * (orange), im Menüband als Abzeichen, solange der Reiter „Wettkampf“ gewählt ist.
   */
  function refreshTopMenus(m) {
    var b = document.getElementById('tb-board');
    if (!b || !m) return;
    // Laufende Wettkampfpause bzw. Einturnzeit steht am Menüknopf: im Menüband als Zeit neben „Anzeigetafel“, am Handy
    // statt „Tafel“ nur die Restzeit auf Orange (mit „Pause …“ bzw. „Einturnen …“ wäre die Kopfzeile bei 360 px zu breit).
    var p = pauseState(m), w = p ? null : warmupState(m), t = p ? clock(p.remaining) : w ? clock(w.remaining) : '';
    var html = '<span class="tl"><span class="ml">Anzeigetafel</span><span class="ms">Tafel</span></span>' +
      (t ? '<span class="bdg">' + t + '</span><span class="tp">' + t + '</span>' : '') + '<span class="car" aria-hidden="true">▾</span>';
    if (b.innerHTML !== html) b.innerHTML = html;
    b.classList.toggle('live', !!t);
  }

  function menuPop(name) { return document.getElementById('menu-' + name); }

  function closeMenus() {
    if (!openMenu) return;
    document.body.classList.remove('menu-open-' + openMenu);
    document.querySelectorAll('.tb-menu[aria-expanded="true"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    openMenu = null;
    closePauseMenu();
  }

  function toggleMenu(btn) {
    var name = btn.getAttribute('data-menu');
    if (btn.disabled) return;
    // Menüband: die Reiter schalten die Leiste um (sie bleibt immer sichtbar)
    if (ribbonMode() && (name === 'board' || name === 'match')) {
      closeMenus();
      ribbonChoice = name;
      applyRibbonTab();
      closePauseMenu();
      syncTopbarHeight();
      return;
    }
    var was = openMenu;
    closeMenus();
    if (was === name) return;
    var r = btn.getBoundingClientRect();
    document.documentElement.style.setProperty('--menu-x', Math.round(Math.max(8, Math.min(r.left, window.innerWidth - 290))) + 'px');
    document.body.classList.add('menu-open-' + name);
    btn.setAttribute('aria-expanded', 'true');
    openMenu = name;
    // Mit der Tastatur geöffnet: Fokus auf den ersten Eintrag
    if (lastInputKeyboard) {
      var first = menuPop(name) && menuPop(name).querySelector('a, button:not([disabled])');
      if (first) first.focus();
    }
  }

  // Tipp neben ein offenes Aufklappmenü schließt nur das Menü (löst darunter nichts aus). Ein Link im Menü schließt es
  // sofort (auch wenn danach eine Rückfrage kommt, z. B. „Änderungen speichern?“); Klicks in Rückfragen gehen immer durch.
  document.addEventListener('click', function (ev) {
    if (!openMenu || !ev.target.closest) return;
    if (ev.target.closest('.modal-backdrop')) { closeMenus(); return; }
    if (ev.target.closest('.menu-pop a')) { closeMenus(); return; }
    if (ev.target.closest('.menu-pop') || ev.target.closest('.tb-menu[data-menu]')) return;
    ev.preventDefault();
    ev.stopPropagation();
    closeMenus();
  }, true);

  document.addEventListener('click', function (ev) {
    var mb = ev.target.closest && ev.target.closest('.tb-menu[data-menu]');
    if (mb) { ev.preventDefault(); toggleMenu(mb); return; }
    if (!openMenu) return;
    var pop = ev.target.closest && ev.target.closest('.menu-pop');
    if (!pop) { closeMenus(); return; }
    var item = ev.target.closest('a, button');
    if (!item) return;
    // Hell/Dunkel und das Aufklappen der Pausendauer lassen das Menü offen; alles andere schließt es.
    if (item.getAttribute('data-action') === 'theme') return;
    setTimeout(function () {
      var pm = document.querySelector('#menu-board .pause-menu');
      if (item.getAttribute('data-action') === 'pause-timer' && pm && !pm.hidden) return;
      closeMenus();
    }, 0);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    if (openMenu) {
      ev.preventDefault();
      var btn = document.querySelector('.tb-menu[data-menu="' + openMenu + '"]');
      closeMenus();
      if (btn) btn.focus();
      return;
    }
    // Fenster „Ergebnis/Siegerehrung“ in der App: Esc = Schließen
    if (document.body.classList.contains('scorers-open') && !document.querySelector('.modal-backdrop') && !scoreDlg) {
      var cb = document.querySelector('#app-scorers [data-action="scorers-close"]');
      if (cb) { ev.preventDefault(); cb.click(); }
    }
  }, true);

  window.addEventListener('hashchange', closeMenus);
  if (RIBBON_MQ) {
    var onRibbonChange = function () { closeMenus(); applyRibbonTab(); syncTopbarHeight(); };
    if (RIBBON_MQ.addEventListener) RIBBON_MQ.addEventListener('change', onRibbonChange); else if (RIBBON_MQ.addListener) RIBBON_MQ.addListener(onRibbonChange);
  }

  // ---------- Ergebnis/Siegerehrung als Fenster in der App ----------
  /**
   * Ist „Ergebnis/Siegerehrung“ eingeblendet, liegt dasselbe Fenster wie auf der Tafel über der App (wie bei der
   * Turnervorstellung) – mit „Schließen“, das es auch auf der Tafel ausblendet.
   */
  function showAppScorers(m) {
    var box = document.getElementById('app-scorers');
    if (!box) return;
    var inner = m ? boardScorers(m, S.revealedView(m)) : '';
    var html = inner ? inner.replace('<div class="scorer-overlay">', '<div class="scorer-overlay app-so' + (boardLight(m) ? ' so-light' : '') + '" role="dialog" aria-modal="true" aria-label="Ergebnis/Siegerehrung">')
      .replace(/<\/div><\/div>$/, '<div class="tv-ctl-bar"><button class="btn primary so-close" data-action="scorers-close">Schließen</button></div></div></div>') : '';
    var was = box.getAttribute('data-sig');
    if (was !== html) { box.setAttribute('data-sig', html); box.innerHTML = html; }
    document.body.classList.toggle('scorers-open', !!html);
    if (!html) return;
    fitScorers();
    if (!was) { var cb = box.querySelector('.so-close'); if (cb) cb.focus({ preventScroll: true }); }
  }

  // ---------- Ereignisse ----------

  // Namen von D1/D2 sofort in ein noch verbundenes E2-/E3-Feld übernehmen.
  $app.addEventListener('input', function (ev) {
    var el = ev.target;
    if (scoreDlg && el.matches && el.matches('#score-dlg input[type=text][data-dlg]')) {
      scoreDlg.text[el.getAttribute('data-dlg')] = el.value;
      scoreDlg.active = el.getAttribute('data-dlg');
      refreshScoreDlg();
      return;
    }
    if (scoreDlg && scoreDlg.calc && el.matches && el.matches('#score-dlg input[data-dc]')) {
      var dcf = el.getAttribute('data-dc');
      scoreDlg.calc.text[dcf] = el.value;
      scoreDlg.calc.active = dcf;
      if (dcf !== 'EG') scoreDlg.calc.last = dcf;
      refreshCalc();
      return;
    }
    if (!el.form || el.form.getAttribute('data-form') !== 'match') return;
    if (el.name === 'judgeD1' || el.name === 'judgeD2') linkJudges(el.form);
    if (el.name === 'judgeE2Home' || el.name === 'judgeE3Guest') el.dataset.linked = el.value === el.form[el.name === 'judgeE2Home' ? 'judgeD1' : 'judgeD2'].value ? '1' : '';
  });

  $app.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.dataset && el.dataset.picking) return; // erst mit Enter übernehmen
    if (el.hasAttribute('data-dlg')) { handleDlgChange(el); return; }
    if (el.hasAttribute('data-dc')) { if (scoreDlg && scoreDlg.calc && el.getAttribute('data-dc') === 'EG') { scoreDlg.calc.active = 'EG'; commitCalcField(); refreshCalc(); } return; }
    if (el.hasAttribute('data-field')) { handleScoreChange(el); return; }
    if (el.hasAttribute('data-import')) { importFile(el.files[0]); el.value = ''; return; }
    if (el.name === 'neutralE2' && el.form) { syncJudgeFields(el.form); return; }
    if (el.classList.contains('lineup-check')) { syncLineup(el.form); return; }
    if ((el.name === 'home' || el.name === 'guest') && el.form && el.form.getAttribute('data-form') === 'match') {
      el.form.querySelector('[data-lineup="' + el.name + '"]').innerHTML = lineupHtml(el.name, el.value, null);
      syncLineup(el.form);
      return;
    }
    var tfield = el.getAttribute('data-tfield');
    if (tfield) {
      var t = team(el.getAttribute('data-team'));
      if (!t) return;
      var number = parseInt(el.getAttribute('data-gym'), 10);
      var g = t.gymnasts.filter(function (x) { return x.number === number; })[0];
      if (!g) return;
      g.name = el.value.trim();
      el.value = g.name;
      // Namen in noch offenen Wettkämpfen mitziehen, abgeschlossene bleiben unverändert.
      state.matches.forEach(function (m) {
        if (m.status === 'final') return;
        var changed = false;
        S.APPARATUS.forEach(function (a) {
          m.apparatus[a.key].duels.forEach(function (d) {
            ['home', 'guest'].forEach(function (k) {
              if (d[k].gymnastId === g.id && d[k].name !== g.name) { d[k].name = g.name; changed = true; }
            });
          });
        });
        if (changed) save('matches', m);
      });
      save('teams', t);
      // In der Anwesenheitsliste: neu benannte Turner abhaken, Turner ohne Namen abwählen.
      var row = el.closest('.lineup-row');
      if (row) {
        var box = row.querySelector('.lineup-check');
        if (box.disabled && g.name) box.checked = true;
        if (!g.name) box.checked = false;
        box.disabled = !g.name;
        syncLineup(el.form);
      }
    }
  });

  // Turnerauswahl per Tastatur: Enter öffnet die Liste, Pfeiltasten wählen, Enter übernimmt.
  // Wo der Browser keine native Liste per Skript öffnen kann, klappt das Feld als Liste auf.
  function openPicker(sel) {
    if (typeof sel.showPicker === 'function') {
      try { sel.showPicker(); return; } catch (e) { /* Rückfall unten */ }
    }
    sel.dataset.picking = '1';
    sel.dataset.orig = sel.value;
    sel.size = Math.min(9, sel.options.length);
    sel.classList.add('picking');
  }

  function closePicker(sel, commit) {
    if (!sel.dataset.picking) return;
    delete sel.dataset.picking;
    sel.size = 1;
    sel.classList.remove('picking');
    if (!commit) { sel.value = sel.dataset.orig; return; }
    if (sel.value !== sel.dataset.orig) { if (sel.hasAttribute('data-dlg')) handleDlgChange(sel); else handleScoreChange(sel); }
  }

  var lastInputKeyboard = false;
  var lastPointerType = 'mouse';
  document.addEventListener('keydown', function () { lastInputKeyboard = true; }, true);
  document.addEventListener('pointerdown', function (e) { lastInputKeyboard = false; lastPointerType = e.pointerType || 'mouse'; }, true);

  $app.addEventListener('focusout', function (ev) {
    if (ev.target.dataset && ev.target.dataset.picking) closePicker(ev.target, true);
  });

  $app.addEventListener('keydown', function (ev) {
    var el = ev.target;
    if (el.matches && el.matches('select[data-field="gymnast"], select[data-dlg="gymnast"]')) {
      if (el.dataset.picking) {
        if (ev.key === 'Enter') { ev.preventDefault(); closePicker(el, true); }
        else if (ev.key === 'Escape') { ev.preventDefault(); closePicker(el, false); }
        return;
      }
      if (ev.key === 'Enter') { ev.preventDefault(); openPicker(el); return; }
      // Geschlossenes Feld nicht versehentlich per Pfeiltaste umstellen.
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown' || ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') ev.preventDefault();
      return;
    }
  });


  $app.addEventListener('focusin', function (ev) {
    if (ev.target.matches('#score-dlg input[type=text][data-dlg], #score-dlg input[data-dc]') && !keypadOn()) ev.target.select();
  });

  // Wertungsfenster per Tastatur: → und Enter = nächstes Feld im Kreis (mit „Wertung freigeben“, wenn aktiv), ← = voriges,
  // Enter auf einem Knopf löst ihn aus; Stand mit ↑/↓, 1 und 0; auf der D-Note wählt ↓ „berechnen“; Esc = Abbrechen;
  // Tab bleibt im Fenster (bzw. im D-Note-Rechner). Ein Druck auf eine echte Taste blendet die Bildschirm-Tastatur
  // („automatisch“) für diese Sitzung aus; Ziffern und Komma werden dabei schon ins Feld übernommen.
  document.addEventListener('keydown', function (ev) {
    if (!scoreDlg || !document.getElementById('score-dlg') || document.querySelector('.modal-backdrop')) return;
    var m = match(scoreDlg.matchId);
    if (!m) return;
    var el = ev.target, box = document.getElementById('score-dlg');
    if (el.dataset && el.dataset.picking) return; // aufgeklappte Turnerauswahl: Enter/Esc gehören ihr
    if (keypadOn() && keypadSetting() === 'auto' && ev.isTrusted && !ev.altKey && !ev.ctrlKey && !ev.metaKey &&
        (ev.key.length === 1 || ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(ev.key) >= 0)) {
      hwKeySeen = true;
      var c0 = scoreDlg.calc;
      var f0 = c0 ? c0.active : scoreDlg.active;
      var typed = !!f0 && f0 !== 'bonus' && /^[0-9.,]$/.test(ev.key) && (c0 ? (f0 === 'EG' || /^\d$/.test(ev.key)) : dlgEditable());
      if (typed) { (c0 ? c0.text : scoreDlg.text)[f0] = ev.key; ev.preventDefault(); }
      showScoreDlg(true);
      if (typed) {
        var inp0 = box.querySelector('input[data-' + (c0 ? 'dc' : 'dlg') + '="' + f0 + '"]');
        if (inp0) { inp0.focus(); inp0.setSelectionRange(inp0.value.length, inp0.value.length); }
      }
      return;
    }
    if (scoreDlg.calc) { calcKeydown(ev); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); cancelScoreDlg(); return; }
    if (ev.key === 'Tab') { trapTab(ev, box.querySelector('.sd-win')); return; }
    if (keypadOn() || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    // Was ist ausgewählt? Notenfeld, Stand, „Wertung freigeben“ oder „berechnen“ (Turnerauswahl: siehe unten)
    var item = el.matches && el.matches('#score-dlg input[data-dlg]') ? el.getAttribute('data-dlg')
      : el.matches && el.matches('#score-dlg [data-action="sd-release"]') ? 'release'
      : el.matches && el.matches('#score-dlg [data-action="dc-open"]') ? 'calc' : null;
    if (!item || item === 'zero') return;
    if (ev.key === 'Enter') {
      if (item === 'release' || item === 'calc') return; // Enter löst den Knopf aus
      ev.preventDefault();
      dlgStep(m, 1, item);
      return;
    }
    if ((ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') && !ev.shiftKey) {
      ev.preventDefault();
      dlgStep(m, ev.key === 'ArrowRight' ? 1 : -1, item);
      return;
    }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault(); // kein ±0,1 mehr
      if (item === 'bonus') { el.click(); return; } // Standbonus ein/aus
      var calcBtn = box.querySelector('[data-action="dc-open"]');
      if (item === 'd' && ev.key === 'ArrowDown' && calcBtn && !calcBtn.disabled) { scoreDlg.active = 'd'; commitDlgField(); calcBtn.focus({ preventScroll: true }); return; }
      if (item === 'calc' && ev.key === 'ArrowUp') { scoreDlg.active = 'd'; focusDlgField(); }
      return;
    }
    // Standbonus auch mit 1 (ja) und 0 (nein)
    if (item === 'bonus' && (ev.key === '1' || ev.key === '0')) {
      ev.preventDefault();
      if (el.checked !== (ev.key === '1')) el.click();
    }
  }, true);

  // iPhone/iPad: Die Seite hinter dem Fenster darf sich nicht verschieben (nur ein Fenster, das nicht ganz passt, scrollt selbst).
  // Zwei Finger (Zoomen) bleiben erlaubt – etwa um nach dem Drehen des iPads die Zoomstufe anzupassen.
  document.addEventListener('touchmove', function (ev) {
    if (!scoreDlg) return;
    if (ev.touches && ev.touches.length > 1) return;
    var win = ev.target.closest && ev.target.closest('.sd-win, .dc-win');
    if (win && win.scrollHeight > win.clientHeight + 1) return;
    if (ev.cancelable) ev.preventDefault();
  }, { passive: false });

  $app.addEventListener('submit', function (ev) {
    var form = ev.target;
    var kind = form.getAttribute('data-form');
    if (!kind) return;
    ev.preventDefault();
    var fd = new FormData(form);

    if (kind === 'match') {
      submitMatchForm(form);
    }
  });

  /** Sicherungsdatei einlesen: Gesamtsicherung der Liga oder einzelner Wettkampf (ältere verschlüsselte Dateien mit Passwort). */
  function importFile(file) {
    if (!file) return;
    file.text().then(function (text) {
      var obj;
      try { obj = JSON.parse(text); } catch (e) { throw new Error('Datei ist kein gültiges JSON.'); }
      // Ältere, verschlüsselt exportierte Sicherungen lassen sich weiterhin einlesen.
      if (SB.isEncrypted(obj)) {
        var password = prompt('Diese Sicherung ist verschlüsselt. Bitte Passwort eingeben:');
        if (!password) throw new Error('Import abgebrochen.');
        return SB.decryptJSON(obj, password);
      }
      return obj;
    }).then(function (data) {
      if (data && data.format === MATCH_FORMAT) return importMatch(data);
      validateBackup(data);
      var part = sliceLeague(data, currentLeague);
      if (!confirm('Import ersetzt alle Daten der ' + leagueOf(currentLeague).short + ' durch ' + part.teams.length + ' Mannschaften und ' + part.matches.length + ' Wettkämpfe. Fortfahren?')) return;
      return restoreData(data, 'Import').then(function () { toast('Import erfolgreich'); });
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  // Auswahl der Pausendauer schließt bei Klick daneben oder mit Esc.
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.pause-ctl')) closePauseMenu();
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closePauseMenu();
  });

  // Turnervorstellung per Tastatur – im Eingabefenster und auf der Tafel: weiter mit Pfeil rechts, Leertaste oder Bild ab
  // (so auch mit einem Presenter), zurück mit Pfeil links oder Bild auf; Esc beendet (nur im Eingabefenster, auf der Tafel beendet Esc das Vollbild).
  document.addEventListener('keydown', function (ev) {
    var r = route();
    var m = r.name === 'match' && (!r.sub || r.sub === 'board') ? match(r.id) : null;
    if (!m || !introOn(m) || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var t = ev.target;
    if (t && /INPUT|SELECT|TEXTAREA/.test(t.tagName)) return;
    if (document.querySelector('.modal-backdrop')) return;
    if (ev.key === ' ' && t && t.tagName === 'BUTTON') return;
    if (ev.key === 'Escape' && r.sub !== 'board') { ev.preventDefault(); introSet(m, null); return; }
    var dir = { ArrowRight: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, PageUp: -1 }[ev.key];
    if (!dir) return;
    ev.preventDefault();
    introGo(m, dir);
  });

  $app.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var r = route();
    var m = r.id ? match(r.id) : null;

    switch (action) {
      case 'tab':
        var tKey = btn.getAttribute('data-tab');
        state.ui.tab[m.id] = tKey;
        $app.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        document.getElementById('apparatus-panel').innerHTML = apparatusPanel(m, currentTab(m));
        tickTimers();
        // Die Anzeigetafel folgt dem gewählten Reiter, solange an keinem Gerät eine Wertung offen ist (siehe boardApparatus).
        m.display = m.display || {};
        if (m.display.tab !== tKey) { m.display.tab = tKey; save('matches', m); }
        break;
      case 'finalize':
        if (S.pendingCorrections(m).length) { toast('Erst die nachträgliche Änderung freigeben oder verwerfen.', 'error'); return; }
        var res = S.matchResult(m);
        (res.complete ? Promise.resolve(true) : askConfirm('Es sind noch nicht alle ' + unitWord(m) + ' gewertet. Trotzdem abschließen?')).then(function (yes) {
          if (!yes) return;
          m.status = 'final';
          return save('matches', m).then(afterFinal);
        });
        var afterFinal = function () {
          takeSnapshot('Wettkampf abgeschlossen');
          render();
          toast('Wettkampf abgeschlossen');
          askChoice('Sicherung erstellen?', 'Der Wettkampf ist abgeschlossen. Soll jetzt eine Sicherungsdatei erstellt werden?',
            'Hinweis: Alle Daten bleiben auch ohne diese Sicherung in der App auf diesem Gerät gespeichert.',
            [{ value: 'match', label: 'Nur diesen Wettkampf', primary: true }, { value: 'all', label: 'Alles sichern' }, { value: null, label: 'Nein' }])
            .then(function (choice) {
              if (choice === 'match') exportMatch(m);
              else if (choice === 'all') exportBackup();
            });
        };
        break;
      case 'reopen':
        askConfirm('Wettkampf wieder zur Bearbeitung öffnen?').then(function (yes) {
          if (!yes) return;
          m.status = 'open';
          save('matches', m).then(render);
        });
        break;
      case 'del-match':
        m = match(btn.getAttribute('data-id')) || m;
        if (!m) return;
        askConfirm('Wettkampf vom ' + fmtDate(m.date) + ' (' + teamName(m.homeTeamId) + ' – ' + teamName(m.guestTeamId) + ') wirklich löschen?').then(function (yes) {
          if (yes) delMatch();
        });
        var delMatch = function () { takeSnapshot('vor Löschen eines Wettkampfs').then(function () {
          state.matches = state.matches.filter(function (x) { return x.id !== m.id; });
          return remove('matches', m.id);
        }).then(function () { keepScroll = true; render(); toast('Wettkampf gelöscht'); }); };
        break;
      case 'score-open':
        if (!m || btn.disabled) return;
        openScoreDlg(m, btn.getAttribute('data-app'), parseInt(btn.getAttribute('data-duel'), 10), btn.getAttribute('data-side'));
        break;
      case 'sd-release':
        releaseScoreDlg();
        break;
      case 'sd-cancel':
        cancelScoreDlg();
        break;
      case 'sd-key':
        keypadPress(btn.getAttribute('data-k'));
        break;
      case 'sd-field':
        // Bildschirm-Tastatur: Antippen eines Feldes macht es zum aktiven Feld (die erste Ziffer ersetzt den alten Wert).
        if (!scoreDlg || btn.disabled) return;
        commitDlgField();
        scoreDlg.active = btn.getAttribute('data-dlg');
        scoreDlg.buf = null;
        refreshScoreDlg();
        break;
      case 'dns-release':
        if (!m || btn.disabled) return;
        releaseDns(m, btn.getAttribute('data-app'), parseInt(btn.getAttribute('data-duel'), 10), btn.getAttribute('data-side'));
        break;
      case 'dc-open':
        if (!btn.disabled) openCalc();
        break;
      case 'dc-field':
        if (!scoreDlg || !scoreDlg.calc) return;
        commitCalcField();
        scoreDlg.calc.active = btn.getAttribute('data-dc');
        scoreDlg.calc.buf = null;
        refreshCalc();
        break;
      case 'dc-key':
        if (!btn.disabled) calcKey(btn.getAttribute('data-k'));
        break;
      case 'dc-ok':
        calcOk();
        break;
      case 'dc-cancel':
        calcCancel();
        break;
      case 'open-board':
        // Öffnet das Tafel-Fenster (bzw. holt es nach vorn); ausgeschaltet wird die Tafel durch Schließen des Fensters.
        if (state.boardWin && !state.boardWin.closed) { state.boardWin.focus(); break; }
        state.boardWin = window.open(location.href.split('#')[0] + '#/match/' + m.id + '/board', 'anzeigetafel-' + m.id);
        // Die Tafel öffnet immer ohne das Fenster „Wettkampfergebnis“.
        if (!boardOn(m) || (m.display && m.display.scorers) || introOn(m)) {
          m.display = m.display || {};
          m.display.board = true;
          m.display.scorers = false;
          m.display.intro = null;
          refreshIntro(m);
          save('matches', m);
          refreshDisplayButtons(m);
        }
        break;
      case 'deduction':
        var dSide = btn.getAttribute('data-side');
        var dCur = deductionOf(m, dSide);
        askValue('Mannschaftsabzug ' + (dSide === 'home' ? 'Heim' : 'Gast'), 'Abzug für ' + teamName(dSide === 'home' ? m.homeTeamId : m.guestTeamId) + ' in Punkten',
          dCur ? fmt(dCur) : '', 'Wird nur von der Gesamtpunktzahl abgezogen, die Geräteergebnisse bleiben unverändert. 0 oder leer entfernt den Abzug.').then(function (txt) {
          if (txt === null) return;
          var v = String(txt).trim() === '' ? 0 : S.parseScore(txt);
          if (v === null || Number.isNaN(v)) { toast('Bitte eine Zahl eingeben, z. B. 1,00.', 'error'); return; }
          m.deduction = m.deduction || {};
          m.deduction[dSide] = v;
          save('matches', m).then(function () { keepScroll = true; render(); toast(v ? 'Mannschaftsabzug gespeichert' : 'Mannschaftsabzug entfernt'); });
        });
        break;
      case 'intro-start':
        if (introOn(m)) { showAppIntro(m); return; }
        if (pauseState(m) || warmupState(m) || fallState(m)) { toast('Erst Pause, Einturnzeit bzw. Sturz-Timer beenden.', 'error'); return; }
        introSet(m, 0);
        break;
      case 'intro-step':
        introGo(m, parseInt(btn.getAttribute('data-dir'), 10));
        break;
      case 'intro-end':
        introSet(m, null);
        break;
      case 'pause-timer':
        if (!pauseState(m) && warmupState(m)) { toast('Erst die Einturnzeit beenden.', 'error'); return; }
        if (!pauseState(m) && introBlocks(m)) return;
        // Läuft eine Pause, beendet der Knopf sie; sonst öffnet bzw. schließt er die Auswahl der Dauer.
        if (pauseState(m)) {
          m.timers.pause = null;
          save('matches', m).then(tickTimers);
          tickTimers();
        } else {
          var pm = btn.parentNode.querySelector('.pause-menu');
          pm.hidden = !pm.hidden;
          if (!pm.hidden && lastInputKeyboard) pm.querySelector('button').focus();
        }
        break;
      case 'pause-start':
        closePauseMenu();
        if (warmupState(m)) { toast('Erst die Einturnzeit beenden.', 'error'); return; }
        m.timers = m.timers || {};
        m.timers.pause = { start: Date.now(), ms: parseInt(btn.getAttribute('data-min'), 10) * 60000 };
        save('matches', m).then(tickTimers);
        tickTimers();
        break;
      case 'theme':
        m.display = m.display || {};
        m.display.theme = btn.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        save('matches', m).then(function () { refreshDisplayButtons(m); });
        refreshDisplayButtons(m);
        break;
      case 'scorers-close':
        if (!m || !(m.display && m.display.scorers)) return;
        m.display.scorers = false;
        save('matches', m).then(function () { refreshDisplayButtons(m); });
        refreshDisplayButtons(m);
        break;
      case 'toggle-scorers':
        if (!(m.display && m.display.scorers) && introBlocks(m)) return;
        m.display = m.display || {};
        m.display.scorers = !m.display.scorers;
        save('matches', m).then(function () { refreshDisplayButtons(m); });
        refreshDisplayButtons(m);
        break;
      case 'fall-timer':
        if (!m || m.status === 'final' || btn.disabled) return;
        if (!fallState(m) && introBlocks(m)) return;
        var cur = fallState(m);
        var tgt = { appKey: btn.getAttribute('data-app'), idx: parseInt(btn.getAttribute('data-duel'), 10), side: btn.getAttribute('data-side') };
        var same = cur && cur.t.appKey === tgt.appKey && cur.t.idx === tgt.idx && cur.t.side === tgt.side;
        m.timers = m.timers || {};
        m.timers.fall = same ? null : Object.assign(tgt, { start: Date.now() });
        save('matches', m).then(tickTimers);
        tickTimers();
        break;
      case 'warmup-timer':
        if (!m) return;
        // Ein einziger Einturn-Timer ohne Gerät: Reiterwechsel, Turner und Wertungen ändern nichts an ihm.
        m.timers = m.timers || {};
        if (warmupState(m)) {
          m.timers.warmup = null;
        } else {
          if (pauseState(m)) { toast('Erst die Wettkampfpause beenden.', 'error'); return; }
          if (introBlocks(m)) return;
          closePauseMenu();
          m.timers.warmup = { start: Date.now() };
        }
        save('matches', m).then(tickTimers);
        tickTimers();
        break;
      case 'start-team':
        var sf = btn.closest('form');
        sf.querySelector('input[name="startTeam"][value="' + btn.getAttribute('data-value') + '"]').checked = true;
        sf.querySelectorAll('[data-action="start-team"]').forEach(function (b) { b.classList.toggle('on', b === btn); });
        break;
      case 'neutral-e2':
        var nf = btn.closest('form');
        if (nf.neutralE2.disabled) return;
        nf.neutralE2.checked = btn.getAttribute('data-value') === 'yes';
        syncJudgeFields(nf);
        break;
      case 'print':
        window.print();
        break;
      case 'persist':
        DB.requestPersist().then(function (ok) {
          toast(ok ? 'Dauerhafter Speicher aktiviert' : 'Browser hat dauerhaften Speicher (noch) nicht gewährt. Tipp: App installieren bzw. zum Startbildschirm hinzufügen.', ok ? '' : 'error');
          render();
        });
        break;
      case 'export':
        exportBackup();
        break;
      case 'lineup-all':
      case 'lineup-none':
        var lf = btn.closest('form');
        lf.querySelectorAll('.lineup-check[data-side="' + btn.getAttribute('data-side') + '"]').forEach(function (b) {
          if (!b.disabled) b.checked = action === 'lineup-all';
        });
        syncLineup(lf);
        break;
      case 'export-match':
        var em = match(btn.getAttribute('data-id'));
        if (em) exportMatch(em);
        break;
      case 'export-snap':
        DB.getSnapshot(parseInt(btn.getAttribute('data-snap'), 10)).then(function (s) {
          if (!s) return;
          var part = sliceLeague(s.data, currentLeague);
          var data = Object.assign({}, s.data, { league: currentLeague, teams: part.teams, matches: part.matches });
          download(filePrefix(currentLeague) + 'GESAMTSICHERUNG_sicherungspunkt-' + s.id + '.json', JSON.stringify(data, null, 2));
        });
        break;
      case 'restore':
        DB.getSnapshot(parseInt(btn.getAttribute('data-snap'), 10)).then(function (s) {
          if (!s) return;
          if (!confirm('Stand der ' + leagueOf(currentLeague).short + ' vom ' + fmtDateTime(s.ts) + ' wiederherstellen? Der aktuelle Stand wird vorher gesichert.')) return;
          return restoreData(validateBackup(s.data), 'Wiederherstellung').then(function () { toast('Wiederhergestellt'); });
        }).catch(function (e) { toast(e.message, 'error'); });
        break;
      case 'wipe':
        var answer = prompt('Zum Bestätigen bitte LÖSCHEN eingeben:');
        if (answer !== 'LÖSCHEN') return;
        restoreData({ teams: [], matches: [], meta: [state.settings] }, 'Löschen aller Daten').then(function () { toast('Alle Daten gelöscht'); });
        break;
    }
  });

  window.addEventListener('hashchange', function () {
    if (!setupGuard.leaveOk && setupDirty()) {
      // z. B. Zurück-Taste: Adresse zurücksetzen (ohne neu aufzubauen – das Formular bleibt, wie es ist) und nachfragen
      var target = location.hash;
      history.replaceState(null, '', setupGuard.lastHash);
      askLeaveSetup(target);
      return;
    }
    setupGuard.leaveOk = false;
    render();
  });

  // Links bei ungespeicherten Änderungen im Setup: erst fragen; „Abbrechen“ verwirft bewusst ohne Rückfrage.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a || !setupDirty()) return;
    if (a.classList.contains('form-cancel')) { setupGuard.leaveOk = true; return; }
    var target = a.getAttribute('href');
    if (target === location.hash) return;
    ev.preventDefault();
    ev.stopPropagation();
    askLeaveSetup(target);
  }, true);

  // Hinweis „nicht gespeichert“ nachziehen
  ['input', 'change', 'click'].forEach(function (type) {
    document.addEventListener(type, function () { if (setupForm()) requestAnimationFrame(updateUnsaved); });
  });
  window.addEventListener('beforeprint', fitPrintToA4);

  // Änderungen aus anderen Tabs (z. B. Anzeigetafel) übernehmen.
  if (channel) {
    channel.onmessage = function () {
      loadAll().then(function () {
        var active = document.activeElement;
        var editing = active && $app.contains(active) && /INPUT|SELECT|TEXTAREA/.test(active.tagName);
        keepScroll = true;
        if (!editing) render();
      });
    };
  } else {
    // Ohne BroadcastChannel aktualisiert sich die Anzeigetafel per Abfrage.
    setInterval(function () {
      if (!document.body.classList.contains('board-mode')) return;
      loadAll().then(function () { keepScroll = true; render(); });
    }, 2000);
  }

  // Beim Verlassen/Verstecken der Seite noch ausstehenden Sicherungspunkt schreiben.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') takeSnapshot();
  });

  var leagueEl = document.getElementById('league-name');
  if (leagueEl) leagueEl.textContent = APP_NAME;
  var versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = APP_LABEL;
  var menuVer = document.getElementById('menu-ver');
  if (menuVer) menuVer.textContent = APP_LABEL;

  function updateNetStatus() {
    var el = document.getElementById('net-status');
    if (!el) return;
    el.textContent = navigator.onLine ? 'online' : 'offline';
    el.className = 'net-status ' + (navigator.onLine ? 'on' : 'off');
  }
  window.addEventListener('online', updateNetStatus);
  window.addEventListener('offline', updateNetStatus);

  // ---------- Start ----------

  DB.open().then(function (ok) {
    state.persistent = ok;
    if (ok) DB.requestPersist();
    return loadAll();
  }).then(function () {
    updateNetStatus();
    render();
  }).catch(function (e) {
    $app.innerHTML = '<div class="banner danger">Fehler beim Laden der Daten: ' + esc(e.message) + '</div>';
  });

  // ---------- Updates ----------
  // Beim Start und alle 30 Minuten (wenn online) nach einer neuen Version suchen.
  // Eine neue Version wird im Hintergrund geladen und erst nach Klick auf
  // „Jetzt aktualisieren“ aktiviert; gespeicherte Daten bleiben erhalten.
  var UPDATE_CHECK_MS = 30 * 60 * 1000;

  function showUpdateBanner(reg) {
    if (document.getElementById('update-banner')) return;
    var bar = document.createElement('div');
    bar.id = 'update-banner';
    bar.className = 'update-banner';
    bar.innerHTML = '<span>Eine neue Version der App ist verfügbar.</span>' +
      '<button class="btn small primary" type="button">Jetzt aktualisieren</button>';
    bar.querySelector('button').addEventListener('click', function () {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      else location.reload();
    });
    document.body.appendChild(bar);
  }

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // Nur nach einem Update neu laden, nicht bei der allerersten Installation.
      if (!hadController || reloading) return;
      reloading = true;
      takeSnapshot().then(function () { location.reload(); });
    });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function checkWaiting() {
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);
      }
      checkWaiting();
      reg.addEventListener('updatefound', function () {
        var worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', function () { if (worker.state === 'installed') checkWaiting(); });
      });
      setInterval(function () { if (navigator.onLine) reg.update().catch(function () {}); }, UPDATE_CHECK_MS);
    }).catch(function () { /* offline-Cache optional */ });
  }
})();
