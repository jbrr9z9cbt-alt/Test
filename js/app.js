/* WTB-Liga – Oberfläche und Ablaufsteuerung */
(function () {
  'use strict';

  var S = window.Scoring;
  var DB = window.DB;
  var SB = window.SecureBackup;
  var CFG = window.TEAM_CONFIG;
  var APP_VERSION = 2;
  var APP_BUILD = '74';
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
    ui: { tab: {}, editDone: {}, openedDone: {} },
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

  function render() {
    var r = route();
    document.body.classList.toggle('board-mode', r.name === 'match' && r.sub === 'board');
    document.body.classList.toggle('board-light', r.name === 'match' && r.sub === 'board' && boardLight(match(r.id)));
    if (r.league) currentLeague = r.league;
    var ready = !!r.league && leagueReady(r.league);
    document.querySelectorAll('.topbar nav a').forEach(function (a) {
      var page = a.getAttribute('data-route');
      a.setAttribute('href', leagueHref(page));
      a.classList.toggle('active', page === r.name);
    });
    // Auf der Startseite (und in noch nicht freigeschalteten Ligen) gibt es keine Liga-Navigation.
    document.body.classList.toggle('no-league', !ready);
    var ln = document.getElementById('league-name');
    if (ln) ln.textContent = r.league ? leagueOf(r.league).name : APP_NAME;
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
      case 'data': html = viewData(); break;
      case 'rules': html = viewRules(); break;
      case 'help': html = viewHelp(); break;
      case 'info': html = viewInfo(); break;
      default: html = viewStart();
    }
    $app.innerHTML = (state.persistent ? '' : warningBanner()) + html;
    if (r.name === 'data') refreshDataView();
    var mf = $app.querySelector('form[data-form="match"]');
    if (mf) { syncJudgeFields(mf); syncLineup(mf); }
    if (r.name === 'match' && r.sub === 'print') fitPrintToA4();
    if (r.name === 'home' && ready) refreshStorageBox();
    var isBoard = r.name === 'match' && r.sub === 'board' && match(r.id);
    if (isBoard) { checkBoardFlash(match(r.id)); fitBoard(); }
    else state.board = { matchId: null, lastReveal: '' };
    if (!keepScroll) window.scrollTo(0, 0);
    tickTimers();
    if (isBoard) { fitBoard(); fitIntro(); fitScorers(); }
    keepScroll = false;
  }

  function warningBanner() {
    return '<div class="banner danger">⚠ Der Browser erlaubt hier keine dauerhafte Speicherung (z. B. privater Modus). ' +
      'Daten gehen beim Schließen verloren – bitte regelmäßig unter „Daten“ exportieren.</div>';
  }

  // ---------- Startseite ----------

  function viewStart() {
    return '<section class="start">' +
      '<img src="icons/icon.svg" alt="" width="96" height="96" class="start-logo">' +
      '<h1>' + esc(APP_NAME) + '</h1>' +
      '<div class="start-apparatus">' + S.APPARATUS.map(function (a) { return appIcon(a.key); }).join('') + '</div>' +
      '<p class="muted">Bitte die Liga wählen</p>' +
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

  function viewHome() {
    var matches = leagueMatches(currentLeague);
    var list = matches.length ? matches.map(function (m) {
      var r = S.matchResult(m);
      return '<a class="match-row" href="#/match/' + m.id + '">' +
        '<div><div class="match-title">' + esc(fmtDate(m.date) || 'ohne Datum') + '</div>' +
        '<div class="muted">' + esc(matchLeague(m).name) + '</div></div>' +
        '<div class="match-teams">' + teamTag(m, 'home') + ' <span class="muted">vs.</span> ' + teamTag(m, 'guest') + '</div>' +
        '<div class="match-score">' + totalPair(m, r) + '</div>' +
        '<div>' + statusBadge(m, r) + '</div></a>';
    }).join('') : '<p class="muted">Noch keine Wettkämpfe angelegt.</p>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Wettkämpfe</h2>' +
      '<a class="btn primary" href="' + leagueHref('new') + '">+ Neuer Wettkampf</a>' +
      '</div>' + list + '</section>' +
      '<section class="card"><h2>Datenspeicher</h2><div id="storage-box" class="muted">wird geprüft …</div></section>';
  }

  function teamTag(m, sideKey) {
    var id = sideKey === 'home' ? m.homeTeamId : m.guestTeamId;
    return '<span class="team-tag"><span class="dot" style="background:' + sideColor(m, sideKey).hex + '"></span>' + esc(teamName(id)) + '</span>';
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
      '<div class="actions"><button class="btn primary" type="submit">' + (isNew ? 'Anlegen' : 'Speichern') + '</button>' +
      '<a class="btn ghost" href="' + (m ? '#/match/' + m.id : leagueHref('home', leagueKey)) + '">Abbrechen</a></div>' +
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
    save('matches', m).then(function () { location.hash = '#/match/' + m.id; });
  }

  function sideUsed(s) {
    return !!(s.gymnastId || s.name || s.d !== null || s.e1 !== null || s.e2 !== null || s.e3 !== null || s.bonus || s.dns);
  }

  // ---------- Ansicht: Wettkampf (Erfassung) ----------

  function currentTab(m) {
    // Ohne Auswahl das laufende Gerät, sonst das erste. Gesperrte Geräte lassen sich öffnen (nur Turner änderbar).
    var run = runningApparatus(m);
    return state.ui.tab[m.id] || (run ? run.key : S.APPARATUS[0].key);
  }

  /**
   * Status je Gerät nach freigegebenen Wertungen: done (abgeschlossen), run (läuft), open (offen)
   * bzw. locked, solange ein anderes Gerät läuft – außer bei aufgehobener Gerätesperre.
   */
  /**
   * Gerät gestartet? Über „Gerät starten“ (m.started) – bei älteren Wettkämpfen ohne diesen Knopf
   * gilt ein Gerät mit eingetragener oder freigegebener Wertung als gestartet.
   */
  function appStarted(m, key) {
    if (m.started && m.started[key]) return true;
    return m.apparatus[key].duels.some(function (d) {
      return rowAnyRevealed(m, d) || ['home', 'guest'].some(function (k) {
        var x = d[k];
        // „kein Turner“ (dns) zählt nicht: es kann vorab gewählt werden.
        return x.d !== null || x.e1 !== null || x.e2 !== null || x.e3 !== null || x.nd || x.bonus || x.zero;
      });
    });
  }

  /** Wertungen dürfen erst nach „Gerät starten“ eingetragen werden (Turner jederzeit). */
  function scoresAllowed(m, key) {
    return appStarted(m, key) || appStatus(m)[key] === 'done';
  }

  /** Start zurücknehmen geht, solange am Gerät noch keine Wertung eingetragen ist. */
  function canUnstart(m, key) {
    if (!(m.started && m.started[key])) return false;
    var copy = Object.assign({}, m, { started: {} });
    return !appStarted(copy, key);
  }

  function appStatus(m) {
    var r = S.matchResult(S.revealedView(m)), st = {};
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      st[a.key] = ar.complete ? 'done' : (ar.started || appStarted(m, a.key)) ? 'run' : 'open';
    });
    // Gesperrt wird auch, solange an einem Gerät die Einturnzeit läuft (bis zu dessen automatischem Start).
    var warming = warmingApparatus(m);
    var running = S.APPARATUS.some(function (a) { return st[a.key] === 'run'; }) || !!warming;
    if (running && !m.unlockApparatus && m.status !== 'final') {
      S.APPARATUS.forEach(function (a) { if (st[a.key] === 'open' && a.key !== warming) st[a.key] = 'locked'; });
    }
    return st;
  }

  /** Gerät, an dem gerade die Einturnzeit läuft oder das gleich danach startet (noch nicht gestartet). */
  function warmingApparatus(m) {
    var w = m.timers && m.timers.warmup;
    if (!w || w.autoStarted || appStarted(m, w.appKey)) return null;
    return Date.now() - w.start < WARMUP_MS + WARMUP_END_MS ? w.appKey : null;
  }

  /** Gesperrtes Gerät angetippt: Hinweis, im Notfall Sperre aufheben (doppelt bestätigt). */
  function lockedDialog(m, key) {
    var run = runningApparatus(m);
    var why = run ? 'kann erst begonnen werden, wenn ' + run.name + ' abgeschlossen ist.'
      : 'kann erst begonnen werden, wenn die Einturnzeit an ' + apparatusName(warmingApparatus(m)) + ' beendet bzw. gestoppt ist.';
    askChoice('🔒 ' + apparatusName(key) + ' ist gesperrt', apparatusName(key) + ' ' + why + ' Turner lassen sich trotzdem schon ändern.', null,
      [{ label: 'Gerätesperre aufheben …', value: 'unlock', link: true }, { label: 'OK', value: 'ok', primary: true, focus: true, cancel: true }]).then(function (a) {
      if (a !== 'unlock') return null;
      return askChoice('⚠ Gerätesperre aufheben?', 'Die Gerätesperre ist nur für den Notfall gedacht, z. B. wenn die App ein Gerät fälschlich nicht als abgeschlossen erkennt. Danach sind alle Geräte frei wählbar.', null,
        [{ label: 'Abbrechen', value: false, cancel: true, focus: true }, { label: 'Weiter', value: true, primary: true }]);
    }).then(function (go) {
      if (!go) return null;
      return askChoice('Wirklich aufheben?', 'Alle Geräte sind dann frei wählbar, bis die Sperre wieder aktiviert wird.', null,
        [{ label: 'Nein', value: false, cancel: true, focus: true }, { label: 'Ja, Sperre aufheben', value: true, primary: true }]);
    }).then(function (yes) {
      if (!yes) return;
      m.unlockApparatus = true;
      save('matches', m).then(function () { render(); toast('Gerätesperre aufgehoben'); });
    });
  }

  function runningApparatus(m) {
    var st = appStatus(m);
    return S.APPARATUS.filter(function (a) { return st[a.key] === 'run'; })[0];
  }

  var TAB_BADGE = { done: '✓', run: '', locked: '🔒', open: '' };

  function tabStatusClass(st) {
    return st === 'open' ? '' : ' st-' + st;
  }

  function viewMatch(m) {
    var r = S.matchResult(m);
    var tab = currentTab(m);
    if (!(m.id in state.ui.openedDone)) state.ui.openedDone[m.id] = appStatus(m)[tab] === 'done' ? tab : '';
    var locked = m.status === 'final';
    var st = appStatus(m);
    var tabs = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<button class="tab' + (a.key === tab ? ' active' : '') + tabStatusClass(st[a.key]) + '" tabindex="-1" data-action="tab" data-tab="' + a.key + '">' +
        '<span class="tab-badge" aria-hidden="true">' + TAB_BADGE[st[a.key]] + '</span>' +
        appIcon(a.key, 'tab-ico') + '<span class="tab-name">' + a.name + '</span><span class="tab-score" data-out="tab-' + a.key + '">' + totalPair(m, ar) + '</span></button>';
    }).join('');

    return '<section class="card match-head">' +
      '<div class="match-meta"><h2>' + esc(matchLeague(m).name) + '</h2>' +
      '<div class="muted">' + esc(fmtDate(m.date)) + ' · Beginn: ' + esc(teamName(m.startTeam === 'guest' ? m.guestTeamId : m.homeTeamId)) +
      ' · <span data-out="status">' + statusBadge(m, r) + '</span></div></div>' +
      '<div class="scoreline' + (isClassic(m) ? ' sums' : '') + '">' +
      '<div class="team home"><div class="label">Heim</div><div class="name">' + teamTag(m, 'home') + '</div></div>' +
      '<div class="big' + (isClassic(m) ? ' sums' : '') + '" data-out="score">' + totalPair(m, r, false, ' : ') + '</div>' +
      '<div class="team guest"><div class="label">Gast</div><div class="name">' + teamTag(m, 'guest') + '</div></div>' +
      '</div>' +
      '<div class="subscore">Gerätepunkte <strong data-out="app">' + r.homeApp + ':' + r.guestApp + '</strong>' +
      '<span data-out="winner">' + winnerText(m, r) + '</span></div>' +
      (deductionsText(m) ? '<div class="deduct-note">' + esc(deductionsText(m)) + '</div>' : '') +
      '<div class="actions wrap">' +
      // Alles, was die Anzeigetafel betrifft, als eine Gruppe
      '<div class="board-group" role="group" aria-label="Anzeigetafel">' +
      // „Anzeigetafel“ und die Wahl Hell/Dunkel in einem gemeinsamen Rahmen
      '<span class="board-switch"><button class="btn bs-main" data-action="open-board">Anzeigetafel</button>' +
      '<span class="bs-theme" role="group" aria-label="Design der Anzeigetafel">' +
      '<button class="toggle' + (boardLight(m) ? ' on' : '') + '" data-action="theme" data-theme="light">Hell</button>' +
      '<button class="toggle' + (boardLight(m) ? '' : ' on') + '" data-action="theme" data-theme="dark">Dunkel</button></span></span>' +
      // Reihenfolge wie im Ablauf: Turnervorstellung, Wettkampfpause, Wettkampfergebnis
      '<span data-out="intro">' + introControls(m) + '</span>' + pauseControls() +
      '<button class="btn toggle' + (m.display && m.display.scorers ? ' on' : '') + '" data-action="toggle-scorers">' +
      scorersLabel(m.display && m.display.scorers) + '</button></div>' +
      // Knöpfe zum Wettkampf selbst als zweite Gruppe; „Löschen“ steht für sich.
      '<div class="board-group" role="group" aria-label="Wettkampf">' +
      (locked ? '' : '<a class="btn" href="#/edit/' + m.id + '">Wettkampf Setup</a>') +
      (locked ? '<button class="btn" data-action="reopen">Wieder öffnen</button>'
        : '<button class="btn primary" data-action="finalize">Wettkampf abschließen</button>') +
      '<a class="btn" href="#/match/' + m.id + '/print">Protokoll / Drucken</a></div>' +
      '<button class="btn danger ghost" data-action="del-match">Löschen</button>' +
      '<span id="save-status" class="save-status"></span>' +
      '</div></section>' +
      (locked ? '<div class="banner info">Dieser Wettkampf ist abgeschlossen und schreibgeschützt.</div>' : '') +
      '<div data-out="pending">' + pendingBanner(m) + '</div>' +
      (m.unlockApparatus && m.status !== 'final' ? '<div class="unlock-bar">⚠ <b>Gerätesperre aufgehoben</b> – alle Geräte sind frei wählbar. ' +
        '<button type="button" class="btn" data-action="relock">Sperre wieder aktivieren</button></div>' : '') +
      '<nav class="tabs">' + tabs + '</nav>' +
      '<section class="card" id="apparatus-panel">' + apparatusPanel(m, tab) + '</section>' +
      '<section class="card"><h3>Topscorer</h3><div data-out="scorers">' + scorersHtml(m) + '</div></section>';
  }

  /** Knopfbeschriftung nennt, was beim Drücken passiert. */
  /** Wettkampfpause: ein Knopf; ein Klick öffnet die Auswahl der Dauer, die Wahl startet die Pause sofort. */
  function pauseControls() {
    return '<span class="pause-ctl"><button class="btn timer-btn" data-action="pause-timer" aria-haspopup="menu">Wettkampfpause</button>' +
      '<div class="pause-menu" role="menu" hidden><div class="pm-head">Dauer wählen</div>' + PAUSE_MINUTES.map(function (n) {
        return '<button class="btn" role="menuitem" data-action="pause-start" data-min="' + n + '">' + n + ' Minuten</button>';
      }).join('') + '</div></span>';
  }

  function closePauseMenu() {
    var pm = $app.querySelector('.pause-menu');
    if (pm) pm.hidden = true;
  }

  function scorersLabel(on) { return on ? 'Wettkampfergebnis ausblenden' : 'Wettkampfergebnis einblenden'; }

  /** Solange eine nachträgliche Änderung nicht angezeigt ist, sind alle anderen Duelle gesperrt. */
  /**
   * Abgeschlossenes Gerät: nur ansehen, bis „Bearbeiten“ bestätigt wurde (gilt, bis das Gerät verlassen wird).
   * Eine offene Korrektur an diesem Gerät bleibt immer bearbeitbar.
   */
  function doneLocked(m, appKey) {
    if (m.status === 'final' || state.ui.editDone[m.id] === appKey || appStatus(m)[appKey] !== 'done') return false;
    // Erst während der Anzeige abgeschlossen (letzte Freigabe): bis zum Verlassen weiter bearbeitbar.
    if (appKey === currentTab(m) && state.ui.openedDone[m.id] !== appKey) return false;
    return !S.pendingCorrections(m).some(function (p) { return p.appKey === appKey; });
  }

  function doneBar(m, appKey) {
    return doneLocked(m, appKey) ? '<div class="done-bar">✓ <b>' + apparatusName(appKey) + ' ist abgeschlossen</b> – die Wertungen sind gesperrt. ' +
      '<button type="button" class="btn" data-action="edit-done" data-app="' + appKey + '">Bearbeiten</button></div>' : '';
  }

  function duelBlocked(m, appKey, idx, sideKey) {
    if (m.status === 'final' || doneLocked(m, appKey)) return true;
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
    }).join('; ') + '. Bitte zuerst <strong>„Korrektur freigeben“</strong> drücken (oder die Änderung verwerfen) – bis dahin sind alle anderen ' + unitWord(m) + ' gesperrt.</div>';
  }

  function winnerText(m, r) {
    if (!r.complete) return '';
    if (r.winner === 'draw') return ' · <strong>Unentschieden</strong>';
    return ' · Sieger: <strong>' + esc(teamName(r.winner === 'home' ? m.homeTeamId : m.guestTeamId)) + '</strong>';
  }

  var NO_GYMNAST = '__none';

  function gymnastSelect(m, appKey, idx, sideKey, side, locked) {
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
    return '<select ' + fieldAttrs(appKey, idx, sideKey, 'gymnast') + (locked ? ' disabled' : '') + ' aria-label="Turner">' + opts + '</select>';
  }

  function fieldAttrs(appKey, idx, sideKey, field) {
    return 'data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '" data-field="' + field + '"';
  }

  function scoreInput(appKey, idx, sideKey, field, value, locked, label) {
    var v = value === null || value === undefined ? '' : fmt1(value);
    if (field === 'nd' && !value) v = '';
    return '<label class="score-field"><span>' + label + '</span>' +
      '<input type="text" inputmode="decimal" autocomplete="off" ' + fieldAttrs(appKey, idx, sideKey, field) +
      ' value="' + esc(v) + '" placeholder="' + (field === 'nd' ? '0,0' : '') + '"' + (locked ? ' disabled' : '') + '></label>';
  }

  function sideHtml(m, appKey, idx, sideKey, side, locked, position, struck, noScores) {
    var classic = isClassic(m);
    // Vor „Gerät starten“ ist nur die Turnerauswahl aktiv.
    var dis = locked || noScores || side.dns || side.zero;
    var color = sideColor(m, sideKey);
    var key = appKey + '-' + idx + '-' + sideKey;
    var three = S.eJudgeCount(m.rules) === 3;
    var bonusAllowed = appKey !== S.NO_BONUS_APPARATUS;
    var eCols = three ? 3 : 2, dCols = bonusAllowed ? 3 : 2;
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '"';
    return '<div class="side ' + sideKey + (classic ? '' : position === 1 ? ' first' : ' second') + (side.dns ? ' dns' : '') + (struck ? ' struck' : '') +
      '" data-key="' + key + '" style="--team:' + color.hex + ';--team-fg:' + color.fg + '">' +
      (!classic && position === 1 ? '<span class="lead-tag">legt vor</span>' : '') +
      '<div class="side-head"><span class="order-no" title="' + (classic ? 'Startposition am Gerät' : 'Startreihenfolge im Duell') + '">' + position + '.</span>' +
      '<span class="side-label" title="' + (sideKey === 'home' ? 'Heim' : 'Gast') + '">' + esc(teamName(sideKey === 'home' ? m.homeTeamId : m.guestTeamId)) + '</span>' +
      gymnastSelect(m, appKey, idx, sideKey, side, locked) + '</div>' +
      // Zwei Bereiche: E-Kampfgericht (Abzüge) und D-Kampfgericht (D-Note, Standbonus, neutraler Abzug).
      '<div class="score-row">' +
      '<div class="score-grp" style="flex:' + eCols + ';grid-template-columns:repeat(' + eCols + ',minmax(0,1fr))"><div class="grp-title">E-Kampfgericht</div>' +
      scoreInput(appKey, idx, sideKey, 'e1', side.e1, dis, 'Abzüge E1') +
      scoreInput(appKey, idx, sideKey, 'e2', side.e2, dis, 'Abzüge E2') +
      (three ? scoreInput(appKey, idx, sideKey, 'e3', side.e3, dis, 'Abzüge E3') : '') + '</div>' +
      '<div class="score-grp" style="flex:' + dCols + ';grid-template-columns:repeat(' + dCols + ',minmax(0,1fr))"><div class="grp-title">D-Kampfgericht</div>' +
      scoreInput(appKey, idx, sideKey, 'd', side.d, dis, 'D-Note') +
      (bonusAllowed ? '<label class="score-field bonus-field"><span>Standbonus</span><span class="bonus-box' + (dis ? ' off' : '') + '"><input type="checkbox" ' +
        fieldAttrs(appKey, idx, sideKey, 'bonus') + (side.bonus ? ' checked' : '') + (dis ? ' disabled' : '') + '> +0,1</span></label>' : '') +
      scoreInput(appKey, idx, sideKey, 'nd', side.nd, dis, 'Neutr. Abzug') +
      '</div></div>' +
      '<div class="result-row">' +
      '<span style="flex:' + eCols + '">E-Note <strong data-out="enote-' + key + '">' + fmt(S.eScore(side, m.rules)) + '</strong></span>' +
      '<span class="final" style="flex:' + dCols + '">' + 
      'Endnote <strong data-out="final-' + key + '">' + fmt(S.sideFinal(side, m.rules)) + '</strong></span></div>' +
      '<div class="side-foot">' +
      // „Wertung 0,00“ nur mit ausgewähltem Turner; der Platz bleibt, damit nichts springt.
      '<label class="check' + (side.gymnastId && !side.dns ? '' : ' hidden-keep') + '"><input type="checkbox" tabindex="-1" ' + fieldAttrs(appKey, idx, sideKey, 'zero') + (side.zero ? ' checked' : '') +
        (locked || noScores || side.dns || !side.gymnastId ? ' disabled' : '') + '> Wertung 0,00</label>' +
      (FALL_TIMER_APPARATUS.indexOf(appKey) >= 0 ? '<button type="button" class="btn small timer-btn" tabindex="-1" data-action="fall-timer"' + attrs + (locked || noScores ? ' disabled' : '') + '>Sturz-Timer</button>' : '') +
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
  function duelActions(r, duel, appKey, idx, locked) {
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '"';
    var ready = duelReady(r, duel);
    if (S.hasPendingCorrection(duel)) {
      var html = '<span class="changed">geändert – noch nicht freigegeben</span>';
      if (!locked) {
        html += '<button class="btn primary"' + attrs + ' data-action="reveal"' + (ready ? '' : ' disabled') + '>Korrektur freigeben</button>' +
          '<button class="btn ghost" tabindex="-1"' + attrs + ' data-action="discard">Änderung verwerfen</button>';
      }
      return html;
    }
    if (duel.revealedAt) return '<span class="revealed">✓ freigegeben</span>';
    if (locked) return '';
    return '<button class="btn primary reveal-btn"' + attrs + ' data-action="reveal"' + (ready ? '' : ' disabled') + '>Wertung freigeben</button>';
  }

  /**
   * Einturnzeit nur vor dem Start eines Geräts; solange ein anderes Gerät läuft, ist sie wie der Start gesperrt
   * (blass, ein Klick erklärt warum). Nach Ablauf startet das Gerät automatisch.
   */
  function warmupButton(m, appKey) {
    var st = appStatus(m)[appKey];
    if (m.status === 'final' || st === 'done' || st === 'run' || warmupEnding(m, appKey)) return '';
    return '<button type="button" class="btn primary timer-btn warmup-btn' + (st === 'locked' ? ' is-locked' : '') + '" tabindex="-1" data-action="warmup-timer" data-app="' + appKey + '">Einturnzeit (6:40) starten</button>';
  }

  /** „Gerät direkt starten“ (ohne Einturnzeit, mit Rückfrage) schaltet die Anzeigetafel auf das Gerät und gibt die Wertungseingabe frei. */
  function startButton(m, appKey) {
    if (m.status === 'final') return '';
    var st = appStatus(m)[appKey];
    if (st === 'done') return '';
    var w = warmupState(m);
    if (w && w.t.appKey === appKey) return '';
    if (warmupEnding(m, appKey)) return '<span class="start-on">Gerät startet gleich …</span>';
    if (st === 'run') {
      return canUnstart(m, appKey) ? '<button type="button" class="btn ghost start-btn" tabindex="-1" data-action="app-unstart" data-app="' + appKey + '">Start zurücknehmen</button>'
        : '<span class="start-on">● Gerät läuft</span>';
    }
    return '<button type="button" class="btn start-btn' + (st === 'locked' ? ' is-locked' : '') + '" tabindex="-1" data-action="app-start" data-app="' + appKey + '">Gerät direkt starten</button>';
  }

  function st0(m, appKey) {
    return appStatus(m)[appKey];
  }

  /** Einturnzeit dieses Geräts ist abgelaufen, der automatische Start steht noch aus („Einturnen beendet“). */
  function warmupEnding(m, appKey) {
    var w = m.timers && m.timers.warmup;
    return !!(w && w.appKey === appKey && !w.autoStarted && Date.now() - w.start >= WARMUP_MS && !appStarted(m, appKey));
  }

  /** Knöpfe Einturnzeit / Gerät starten nachziehen (z. B. „Start zurücknehmen“ entfällt mit der ersten Wertung). */
  function refreshStartRow(m) {
    var wr = $app.querySelector('.warmup-row');
    if (!wr) return;
    var html = warmupButton(m, currentTab(m)) + startButton(m, currentTab(m));
    if (wr.getAttribute('data-sig') === html) return;
    wr.setAttribute('data-sig', html);
    wr.innerHTML = html;
  }

  function startApparatus(m, key) {
    m.started = m.started || {};
    m.started[key] = Date.now();
    save('matches', m).then(function () { keepScroll = true; render(); });
  }

  /**
   * Nach Ablauf der Einturnzeit (und der Anzeige „Einturnen beendet“) startet das Gerät von selbst.
   * Nur im Eingabefenster; war es im Hintergrund, wird der Start beim nächsten Takt nachgeholt.
   */
  function autoStartAfterWarmup() {
    if (document.body.classList.contains('board-mode')) return;
    state.matches.forEach(function (m) {
      var w = m.timers && m.timers.warmup;
      if (!w || w.autoStarted || m.status === 'final' || Date.now() - w.start < WARMUP_MS + WARMUP_END_MS) return;
      w.autoStarted = true;
      if (appStatus(m)[w.appKey] === 'open') { startApparatus(m, w.appKey); toast(apparatusName(w.appKey) + ' gestartet'); }
      else save('matches', m);
    });
  }

  function apparatusPanel(m, appKey) {
    if (isClassic(m)) return classicPanel(m, appKey);
    var a = S.APPARATUS.filter(function (x) { return x.key === appKey; })[0];
    var app = m.apparatus[appKey];
    var ar = S.apparatusResult(app, m.rules);
    var noScores = !scoresAllowed(m, appKey);
    var duels = app.duels.map(function (d, i) {
      var locked = duelBlocked(m, appKey, i);
      var order = S.startOrder(m, appKey, i);
      var cls = 'duel' + (S.hasPendingCorrection(d) ? ' pending' : '') + (locked && m.status !== 'final' && !doneLocked(m, appKey) ? ' blocked' : '');
      // DOM-Reihenfolge = Startreihenfolge, damit die Tabulatortaste der Wettkampfreihenfolge folgt.
      return '<div class="' + cls + '">' +
        '<div class="duel-no">Duell ' + (i + 1) + '</div>' +
        sideHtml(m, appKey, i, order[0], d[order[0]], locked, 1, false, noScores) +
        sideHtml(m, appKey, i, order[1], d[order[1]], locked, 2, false, noScores) +
        '<div class="duel-result" data-out="duel-' + appKey + '-' + i + '">' + duelPoints(m, ar.duels[i]) + '</div>' +
        '<div class="duel-actions" data-out="duelact-' + appKey + '-' + i + '">' + duelActions(ar.duels[i], d, appKey, i, locked || noScores) + '</div>' +
        '</div>';
    }).join('');
    return doneBar(m, appKey) + (m.status === 'final' || st0(m, appKey) === 'done' ? '' : '<div class="warmup-row">' + warmupButton(m, appKey) + startButton(m, appKey) + '</div>') +
      '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(m, ar) + '</div></div>' + duels +
      '<p class="muted small">Eingabe mit Komma oder Punkt und einer Nachkommastelle, z. B. <code>4,8</code> oder <code>1.3</code>; Pfeiltasten ↑/↓ ändern den Wert in 0,1-Schritten. ' +
      (S.eJudgeCount(m.rules) === 3 ? 'E-Note = 10 − mittlerer der drei E-Abzüge (höchster und niedrigster gestrichen). ' : 'E-Note = 10 − Mittelwert der Abzüge E1 und E2. ') +
      'Endnote = D-Note + Standbonus + E-Note − neutraler Abzug; „Wertung 0,00“ gibt einem angetretenen Turner die Endnote 0. Der vorlegende Turner (1.) steht links bzw. oben. ' +
      'Die Scorepunkte eines Duells zählen und erscheinen auf der Anzeigetafel erst nach „Wertung freigeben“. Jede Eingabe wird sofort gespeichert.</p>';
  }

  // ---------- Landesliga: Eingabe je Übung ----------

  /** Freigabe einer Übung: Turner gewählt und Wertung vollständig – oder „nicht angetreten“. */
  function sideReady(m, s) {
    return S.sideFinal(s, m.rules) !== null && (s.dns || !!s.gymnastId);
  }

  function sideActions(m, d, appKey, idx, sideKey, locked) {
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '"';
    var ready = sideReady(m, d[sideKey]);
    if (S.sidePending(d, sideKey)) {
      var html = '<span class="changed">geändert – noch nicht freigegeben</span>';
      if (!locked) {
        html += '<button class="btn primary"' + attrs + ' data-action="reveal"' + (ready ? '' : ' disabled') + '>Korrektur freigeben</button>' +
          '<button class="btn ghost" tabindex="-1"' + attrs + ' data-action="discard">Änderung verwerfen</button>';
      }
      return html;
    }
    if (S.revOf(d, sideKey).revealedAt) return '<span class="revealed">✓ freigegeben</span>';
    if (locked) return '';
    return '<button class="btn primary reveal-btn"' + attrs + ' data-action="reveal"' + (ready ? '' : ' disabled') + '>Wertung freigeben</button>';
  }

  function classicSumHtml(m, ar, sideKey) {
    return 'Summe (beste ' + m.rules.counting + ') <strong>' + teamValue(m, ar, sideKey) + '</strong>';
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
    var noScores = !scoresAllowed(m, appKey);
    var rows = app.duels.map(function (d, i) {
      return '<div class="cl-row">' + order.map(function (k) {
        var locked = duelBlocked(m, appKey, i, k);
        return '<div class="cl-cell' + (S.sidePending(d, k) ? ' pending' : '') + (locked && m.status !== 'final' && !doneLocked(m, appKey) ? ' blocked' : '') + '">' +
          sideHtml(m, appKey, i, k, d[k], locked, S.classicPosition(m, appKey, i, k), ar[k].struck.indexOf(i) >= 0, noScores) +
          '<div class="duel-actions" data-out="sideact-' + appKey + '-' + i + '-' + k + '">' + sideActions(m, d, appKey, i, k, locked || noScores) + '</div></div>';
      }).join('') + '</div>';
    }).join('');
    var sums = '<div class="cl-row cl-sums">' + order.map(function (k) {
      return '<div class="cl-sum" data-out="clsum-' + appKey + '-' + k + '">' + classicSumHtml(m, ar, k) + '</div>';
    }).join('') + '</div>';
    return doneBar(m, appKey) + (m.status === 'final' || st0(m, appKey) === 'done' ? '' : '<div class="warmup-row">' + warmupButton(m, appKey) + startButton(m, appKey) + '</div>') +
      '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(m, ar) + '</div></div>' +
      '<div class="cl-row cl-head">' + order.map(function (k, n) {
        return '<div>' + teamTag(m, k) + (n === 0 ? ' <span class="muted small">beginnt</span>' : '') + '</div>';
      }).join('') + '</div>' + rows + sums +
      '<p class="muted small">Eingabe mit Komma oder Punkt und einer Nachkommastelle, z. B. <code>4,8</code> oder <code>1.3</code>; Pfeiltasten ↑/↓ ändern den Wert in 0,1-Schritten. ' +
      'Geturnt wird abwechselnd in der Reihenfolge der Startpositionen (1., 2., 3. …). Je Mannschaft zählen die ' + m.rules.counting +
      ' höchsten Wertungen, die niedrigste ist die Streichwertung. Jede Übung wird einzeln mit „Wertung freigeben“ gezählt und auf der Anzeigetafel gezeigt. Jede Eingabe wird sofort gespeichert.</p>' +
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

  /** Topscorer: die ersten drei Plätze, bei Gleichstand entsprechend mehr. */
  function scorersHtml(m) {
    var list = S.topScorers(m, 3);
    var classic = isClassic(m);
    if (!list.length) return '<p class="muted">' + (classic ? 'Noch keine Wertungen.' : 'Noch keine Scorepunkte vergeben.') + '</p>';
    return '<div class="table-wrap"><table class="table compact"><thead><tr><th>Platz</th><th>Turner</th><th>Mannschaft</th><th class="num">Geräte</th><th class="num">' + (classic ? 'Summe' : 'Scorepunkte') + '</th></tr></thead><tbody>' +
      list.map(function (s) {
        return '<tr><td>' + s.rank + '.</td><td>' + esc(gymnastLabel(s.number, s.name) || '–') + '</td><td>' + esc(teamName(s.team === 'home' ? m.homeTeamId : m.guestTeamId)) + '</td><td class="num">' + s.starts + '</td>' +
          '<td class="num"><strong>' + pts(m, s.team, classic ? fmt(s.points) : s.points) + '</strong></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /** Aktualisiert berechnete Werte, ohne Eingabefelder neu aufzubauen (Fokus bleibt erhalten). */
  function refreshComputed(m) {
    var r = S.matchResult(m);
    function out(key, html) {
      var el = $app.querySelector('[data-out="' + key + '"]');
      if (el) el.innerHTML = html;
    }
    out('score', totalPair(m, r, false, ' : '));
    out('app', r.homeApp + ':' + r.guestApp);
    out('winner', winnerText(m, r));
    out('status', statusBadge(m, r));
    var st = appStatus(m);
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      out('tab-' + a.key, totalPair(m, ar));
      var tabBtn = $app.querySelector('.tab[data-tab="' + a.key + '"]');
      if (!tabBtn) return;
      ['done', 'run', 'locked'].forEach(function (k) { tabBtn.classList.toggle('st-' + k, st[a.key] === k); });
      tabBtn.querySelector('.tab-badge').textContent = TAB_BADGE[st[a.key]];
    });
    var tab = currentTab(m);
    var ar = r.apparatus[tab];
    out('app-sum', appSumHtml(m, ar));
    out('pending', pendingBanner(m));
    refreshStartRow(m);
    if (isClassic(m)) {
      m.apparatus[tab].duels.forEach(function (d, i) {
        ['home', 'guest'].forEach(function (k) {
          var key = tab + '-' + i + '-' + k;
          var act = $app.querySelector('[data-out="sideact-' + key + '"]');
          var html = sideActions(m, d, tab, i, k, duelBlocked(m, tab, i, k) || !scoresAllowed(m, tab));
          if (act && act.innerHTML !== html) act.innerHTML = html;
          out('enote-' + key, fmt(S.eScore(d[k], m.rules)));
          out('final-' + key, fmt(S.sideFinal(d[k], m.rules)));
          var sideEl = $app.querySelector('.side[data-key="' + key + '"]');
          if (sideEl) sideEl.classList.toggle('struck', ar[k].struck.indexOf(i) >= 0);
        });
      });
      ['home', 'guest'].forEach(function (k) { out('clsum-' + tab + '-' + k, classicSumHtml(m, ar, k)); });
      out('scorers', scorersHtml(m));
      return;
    }
    m.apparatus[tab].duels.forEach(function (d, i) {
      out('duel-' + tab + '-' + i, duelPoints(m, ar.duels[i]));
      // Knöpfe nur neu aufbauen, wenn sich etwas ändert – sonst ginge ein Fokus darauf verloren.
      var act = $app.querySelector('[data-out="duelact-' + tab + '-' + i + '"]');
      var html = duelActions(ar.duels[i], d, tab, i, duelBlocked(m, tab, i) || !scoresAllowed(m, tab));
      if (act && act.innerHTML !== html) act.innerHTML = html;
      ['home', 'guest'].forEach(function (k) {
        out('enote-' + tab + '-' + i + '-' + k, fmt(S.eScore(d[k], m.rules)));
        out('final-' + tab + '-' + i + '-' + k, fmt(S.sideFinal(d[k], m.rules)));
      });
    });
    out('scorers', scorersHtml(m));
  }

  function handleScoreChange(el) {
    var m = match(route().id);
    if (!m || m.status === 'final') return;
    var appKey = el.getAttribute('data-app');
    var idx = parseInt(el.getAttribute('data-duel'), 10);
    var sideKey = el.getAttribute('data-side');
    var field = el.getAttribute('data-field');
    var side = m.apparatus[appKey].duels[idx][sideKey];
    if (duelBlocked(m, appKey, idx, sideKey)) { toast(doneLocked(m, appKey) ? 'Das Gerät ist abgeschlossen – zum Ändern „Bearbeiten“ wählen.' : 'Erst die nachträgliche Änderung freigeben oder verwerfen.', 'error'); render(); return; }
    if (field !== 'gymnast' && !scoresAllowed(m, appKey)) { toast('Erst „Gerät starten“ drücken.', 'error'); render(); return; }
    var pendingBefore = S.pendingCorrections(m).length;

    if (field === 'gymnast' && el.value === NO_GYMNAST) {
      // „kein Turner“ = nicht angetreten; bereits eingegebene Wertungen werden nach Rückfrage gelöscht.
      var hasScores = side.d !== null || side.e1 !== null || side.e2 !== null || side.e3 !== null || side.nd || side.bonus || side.zero;
      var setNone = function () {
        Object.assign(side, S.emptySide(), { dns: true });
        save('matches', m).then(function () { rerenderPanel(m); });
      };
      if (!hasScores) { setNone(); return; }
      askConfirm('„Kein Turner“: Die bereits eingegebenen Wertungen dieser Übung werden gelöscht. Fortfahren?').then(function (yes) {
        if (yes) setNone(); else rerenderPanel(m);
      });
      return;
    }

    if (field === 'gymnast') {
      side.dns = false;
      var tm = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
      var gy = tm && tm.gymnasts.filter(function (x) { return x.id === el.value; })[0];
      side.gymnastId = el.value || null;
      side.number = gy ? gy.number : null;
      side.name = gy ? gy.name : '';
      // Ohne Turner gibt es keine Wertung 0,00.
      if (!side.gymnastId) side.zero = false;
      var keepFocus = lastPointerType !== 'touch' && lastPointerType !== 'pen';
      el.blur();
      save('matches', m).then(function () {
        rerenderPanel(m);
        // Mit Maus oder Tastatur bleibt das Auswahlfeld aktiv (weiter mit Tab bzw. erneut Enter);
        // bei Touch nicht fokussieren, sonst öffnet iOS die Auswahl sofort wieder.
        if (keepFocus) {
          var sel = $app.querySelector('select[data-app="' + appKey + '"][data-duel="' + idx + '"][data-side="' + sideKey + '"][data-field="gymnast"]');
          if (sel) sel.focus();
        }
      });
      return;
    }

    if (field === 'dns') {
      if (el.checked) {
        var hasData = side.gymnastId || side.d !== null || side.e1 !== null || side.e2 !== null || side.e3 !== null || side.nd || side.bonus || side.zero;
        var setDns = function () {
          Object.assign(side, S.emptySide(), { dns: true });
          save('matches', m).then(function () { rerenderPanel(m); });
        };
        if (!hasData) { setDns(); return; }
        askConfirm('„Nicht angetreten“: Turner und bereits eingegebene Wertungen dieser Übung werden gelöscht. Fortfahren?').then(function (yes) {
          if (yes) setDns(); else el.checked = false;
        });
        return;
      }
      side.dns = false;
      save('matches', m).then(function () { rerenderPanel(m); });
      return;
    }

    if (field === 'zero') {
      if (!el.checked) {
        side.zero = false;
        save('matches', m).then(function () { rerenderPanel(m); });
        return;
      }
      if (!side.gymnastId) { el.checked = false; toast('Erst einen Turner wählen.', 'error'); return; }
      // Wertung 0,00: bereits eingegebene Werte werden gelöscht, der Turner bleibt.
      var setZero = function () {
        Object.assign(side, { d: null, e1: null, e2: null, e3: null, nd: 0, bonus: false, zero: true });
        save('matches', m).then(function () { rerenderPanel(m); });
      };
      var hasScores = side.d !== null || side.e1 !== null || side.e2 !== null || side.e3 !== null || side.nd || side.bonus;
      if (!hasScores) { setZero(); return; }
      askConfirm('Wertung 0,00: Die bereits eingegebenen Wertungen dieser Übung werden gelöscht. Fortfahren?').then(function (yes) {
        if (yes) setZero(); else el.checked = false;
      });
      return;
    }

    if (field === 'bonus') {
      side.bonus = el.checked && appKey !== S.NO_BONUS_APPARATUS;
      save('matches', m).then(function () {
        if (S.pendingCorrections(m).length !== pendingBefore) rerenderPanel(m);
        else refreshComputed(m);
      });
      return;
    }

    var v = S.parseScore(el.value);
    if (field === 'nd' && v === null) v = 0;
    var isDeduction = field === 'e1' || field === 'e2' || field === 'e3';
    var max = field === 'd' ? 20000 : 10000;
    var invalid = Number.isNaN(v) || v > max || (v !== null && v % 100 !== 0);
    if (invalid) {
      el.classList.add('invalid');
      toast((isDeduction ? 'Ungültiger E-Abzug' : field === 'nd' ? 'Ungültiger neutraler Abzug' : 'Ungültige D-Note') +
        ': „' + el.value + '“ (eine Nachkommastelle, z. B. ' + (field === 'd' ? '4,5' : '1,3') + ')', 'error');
      return;
    }
    el.classList.remove('invalid');
    side[field] = v;
    if (v !== null && !(field === 'nd' && v === 0)) el.value = fmt1(v);
    save('matches', m).then(function () {
      if (S.pendingCorrections(m).length !== pendingBefore) rerenderPanel(m);
      else refreshComputed(m);
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
   * Gerät der Anzeigetafel: das zuletzt mit „Gerät starten“ gestartete – es bleibt nach dem Abschluss stehen,
   * bis das nächste gestartet wird. Ältere Wettkämpfe ohne Start: das erste mit Eintragungen, das noch nicht fertig ist.
   */
  function boardApparatus(m) {
    var last = null, lastTs = 0;
    S.APPARATUS.forEach(function (a) {
      var ts = m.started && m.started[a.key];
      if (ts && ts > lastTs) { last = a; lastTs = ts; }
    });
    return last || legacyBoardApparatus(m);
  }

  function legacyBoardApparatus(m) {
    var current = null;
    var lastRevealed = null;
    S.APPARATUS.forEach(function (a) {
      var duels = m.apparatus[a.key].duels;
      var touched = duels.some(function (d) {
        return rowAnyRevealed(m, d) || d.home.gymnastId || d.guest.gymnastId || S.sideFinal(d.home, m.rules) !== null || S.sideFinal(d.guest, m.rules) !== null;
      });
      var allRevealed = duels.every(function (d) { return rowRevealed(m, d); });
      if (!current && touched && !allRevealed) current = a;
      if (duels.some(function (d) { return rowAnyRevealed(m, d); })) lastRevealed = a;
    });
    return current || lastRevealed;
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
  function boardName(side) {
    return side.dns ? '–' : esc(gymnastLabel(side.number, side.name) || '');
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
    function name(k, d, right) {
      return '<td class="bn' + (right ? ' right' : '') + '" style="--team:' + boardTone(m, k) + '">' + boardName(d[k]) + '</td>';
    }
    return '<div class="board-detail"><h3>' + appIcon(current.key, 'bd-ico') + current.name + '</h3><table class="board-duels classic">' +
      app.duels.map(function (d, i) {
        return '<tr>' + name('home', d, false) + '<td class="num">' + val('home', i) + '</td><td></td>' +
          '<td class="num">' + val('guest', i) + '</td>' + name('guest', d, true) + '</tr>';
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
    // Vor der ersten Wertung steht schon das erste Gerät da, damit die Aufteilung immer gleich bleibt.
    var current = boardApparatus(m) || S.APPARATUS[0];
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
          return '<tr><td class="bn ' + (dr.winner === 'home' ? 'win' : '') + '" style="--team:' + homeColor + '">' + boardName(d.home) + '</td>' +
            '<td class="num">' + (dr.home === null ? '' : fmt(dr.home)) + '</td>' +
            '<td class="num pts">' + (dr.complete ? ptsPair(m, dr.homePoints, dr.guestPoints, true, ' : ') : '') + '</td>' +
            '<td class="num mirror">' + (dr.guest === null ? '' : fmt(dr.guest)) + '</td>' +
            '<td class="bn right ' + (dr.winner === 'guest' ? 'win' : '') + '" style="--team:' + guestColor + '">' + boardName(d.guest) + '</td></tr>';
        }).join('') +
        '<tr class="bsum"><td class="sum-lbl">Summe Scorepunkte</td><td></td><td class="num pts">' + ptsPair(m, ar.homePoints, ar.guestPoints, true, ' : ') + '</td>' +
        '<td></td><td class="sum-lbl right">Summe Scorepunkte</td></tr>' +
        '</table></div>';
    }

    return '<div class="board">' +
      '<div class="board-title">' + esc([matchLeague(m).name, fmtDate(m.date)].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="board-score">' +
      '<div class="board-team" style="color:' + homeColor + '">' + esc(teamName(m.homeTeamId)) + boardDeduction(m, 'home') + '</div>' +
      '<div class="board-big' + (isClassic(m) ? ' sums' : '') + '">' + totalPair(m, r, true) + '</div>' +
      '<div class="board-team" style="color:' + guestColor + '">' + esc(teamName(m.guestTeamId)) + boardDeduction(m, 'guest') + '</div></div>' +
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
    function warmTitle(key) { return appIcon(key, 'tm-ico') + 'Einturnzeit ' + apparatusName(key); }
    if (warm) return card(warmTitle(warm.t.appKey), '<div class="tm-clock">' + fixedDigits(clock(warm.remaining)) + '</div>');
    if (p) return card('Pause', '<div class="tm-clock">' + fixedDigits(clock(p.remaining)) + '</div>');
    if (timerEnded(t.warmup, WARMUP_MS, WARMUP_END_MS)) return card(warmTitle(t.warmup.appKey), '<div class="tm-clock tm-end">Einturnen beendet</div>');
    if (t.pause && timerEnded(t.pause, t.pause.ms, PAUSE_END_MS)) return card('Pause', '<div class="tm-clock tm-end">Zeit abgelaufen</div>');
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
        (side ? esc(teamName(side === 'home' ? m.homeTeamId : m.guestTeamId)) : '') + '</td></tr>');
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

  function introBoxHtml(m) {
    var step = introStep(m);
    if (step < 0) return '';
    var pages = introPages(m), p = pages[Math.min(step, pages.length - 1)];
    var body;
    if (p.judges) {
      var rows = introJudgeRows(m);
      body = '<div class="tv-big-team tv-fit tv-kg">Kampfgericht</div>' +
        (rows.length ? '<table class="tv-judges' + (rows.length > 4 ? ' many' : '') + '">' + rows.join('') + '</table>' : '');
    } else {
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
    return '<div class="pause-overlay tv-overlay"><div class="pause-win tv-win"><div class="tv-top"><span>Turnervorstellung</span><span>' +
      (Math.min(step, pages.length - 1) + 1) + ' / ' + pages.length + '</span></div><div class="tv-body">' + body + '</div></div></div>';
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

  /** Steuerung im Eingabefenster: Knopf zum Starten bzw. Zurück / Stand / Weiter / Beenden. */
  function introControls(m) {
    var step = introStep(m);
    if (step < 0) return '<button class="btn" data-action="intro-start">Turnervorstellung</button>';
    var pages = introPages(m), p = pages[Math.min(step, pages.length - 1)];
    var pos = p.judges ? 'Kampfgericht' : (p.side === 'home' ? 'Heim' : 'Gast') + (p.gym ? ' · Turner ' + p.pos + ' / ' + p.count : ' · Mannschaft');
    return '<span class="tv-ctl" role="group" aria-label="Turnervorstellung">' +
      '<button class="btn" data-action="intro-step" data-dir="-1"' + (step === 0 ? ' disabled' : '') + '>◀ Zurück</button>' +
      '<span class="pos">' + pos + '</span>' +
      '<button class="btn primary" data-action="intro-step" data-dir="1">Weiter ▶</button>' +
      '<button class="btn tv-end" data-action="intro-end">Beenden</button></span>';
  }

  function refreshIntro(m) {
    var el = $app.querySelector('[data-out="intro"]');
    if (el) el.innerHTML = introControls(m);
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
      '<div class="so-result"><div class="t" style="color:' + boardTone(m, 'home') + '">' + esc(teamName(m.homeTeamId)) + '</div>' +
      '<div class="big">' + totalPair(m, r, true) + '</div>' +
      '<div class="t" style="color:' + boardTone(m, 'guest') + '">' + esc(teamName(m.guestTeamId)) + '</div></div>' +
      '<div class="so-sub">Gerätepunkte ' + r.homeApp + ':' + r.guestApp + (r.complete ? ' · Wettkampfpunkte ' + r.homeMatch + ':' + r.guestMatch : '') + (deductionsText(m) ? ' · ' + esc(deductionsText(m)) : '') + '</div>' +
      '<div class="so-title so-h">Topscorer</div>' +
      (list.length ? '<table class="so-table">' + list.map(function (x) {
        return '<tr><td class="so-rank">' + x.rank + '.</td><td class="so-name">' + esc(gymnastLabel(x.number, x.name) || '–') +
          '<small>' + esc(teamName(x.team === 'home' ? m.homeTeamId : m.guestTeamId)) + '</small></td><td class="so-app">' + x.starts + (x.starts === 1 ? ' Gerät' : ' Geräte') + '</td>' +
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

  window.addEventListener('resize', function () { fitBoard(); fitIntro(); fitScorers(); });

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
    if (t) { t.textContent = scorersLabel(son); t.classList.toggle('on', son); }
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
      var label = on ? '⏱ ' + secs(fall.remaining) + (fall.phase === 2 ? ' · Abzug 0,3' : '') + ' – Stopp' : 'Sturz-Timer';
      if (btn.textContent !== label) btn.textContent = label;
      btn.classList.toggle('t-fall1', on && fall.phase === 1);
      btn.classList.toggle('t-fall2', on && fall.phase === 2);
      ['fz-0', 'fz-1', 'fz-2', 'fz-pulse'].forEach(function (c) { btn.classList.toggle(c, on && fallTone(fall).split(' ').indexOf(c) >= 0); });
    });
    if (r.name === 'match' && !r.sub) refreshStartRow(m);
    var wb = $app.querySelector('[data-action="warmup-timer"]');
    if (wb) {
      var won = !!warm && warm.t.appKey === wb.getAttribute('data-app');
      var wl = won ? '⏱ Einturnzeit ' + clock(warm.remaining) + ' – Stopp' : 'Einturnzeit (6:40) starten';
      if (wb.textContent !== wl) wb.textContent = wl;
      wb.classList.toggle('t-running', won);
    }
    var pause = pauseState(m);
    var pb = $app.querySelector('[data-action="pause-timer"]');
    if (pb) {
      var pl = pause ? 'Wettkampfpause ' + clock(pause.remaining) + ' – beenden' : 'Wettkampfpause';
      if (pb.textContent !== pl) pb.textContent = pl;
      pb.classList.toggle('t-running', !!pause);
    }
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

  setInterval(function () { tickTimers(); checkTimerSounds(); autoStartAfterWarmup(); }, 250);

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

  // ---------- Ansichten: Datensicherung und Regeln ----------

  function viewData() {
    return '<section class="card"><h2>Datensicherung</h2>' +
      '<p>Alle Daten liegen ausschließlich lokal auf diesem Gerät. Zusätzlich legt die App automatisch Sicherungspunkte an. ' +
      'Für Sicherheit gegen Geräteverlust bitte regelmäßig eine Sicherungsdatei exportieren (z. B. auf einen USB-Stick).</p>' +
      '<div id="data-storage" class="muted">wird geprüft …</div>' +
      '<h3>Exportieren</h3>' +
      '<div class="export-grid">' +
      '<div class="export-box"><h4>Gesamtsicherung</h4>' +
      '<p class="muted small">Alle Mannschaften, Turnernamen und Wettkämpfe der ' + esc(leagueOf(currentLeague).short) + '. Dateiname beginnt mit <b>' + filePrefix(currentLeague) + 'GESAMTSICHERUNG_</b>.</p>' +
      '<div class="actions"><button class="btn primary" data-action="export">Alles sichern</button></div></div>' +
      '<div class="export-box"><h4>Einzelner Wettkampf</h4>' +
      '<p class="muted small">Nur der gewählte Wettkampf. Dateiname beginnt mit <b>' + filePrefix(currentLeague) + 'EINZELWETTKAMPF_</b>.</p>' +
      (leagueMatches(currentLeague).length
        ? '<div class="actions wrap"><select id="export-match-select" aria-label="Wettkampf auswählen">' +
          leagueMatches(currentLeague).map(function (m) {
            return '<option value="' + esc(m.id) + '">' + esc(fmtDate(m.date) + ' – ' + teamName(m.homeTeamId) + ' : ' + teamName(m.guestTeamId)) + '</option>';
          }).join('') + '</select><button class="btn" data-action="export-match">Wettkampf sichern</button></div>'
        : '<p class="muted">Noch keine Wettkämpfe vorhanden.</p>') +
      '</div></div>' +
      '<h3>Importieren / Wiederherstellen</h3>' +
      '<form class="stack" data-form="import">' +
      '<input type="file" name="file" accept=".json,application/json" required>' +
      '<div class="actions"><button class="btn" type="submit">Importieren</button></div></form>' +
      '<p class="muted small">Eine Gesamtsicherung ersetzt alle Daten der ' + esc(leagueOf(currentLeague).short) + ' (die andere Liga bleibt unverändert). Ein einzelner Wettkampf wird hinzugefügt bzw. ersetzt nur denselben Wettkampf – alles andere bleibt unverändert. ' +
      'Vor jedem Import wird automatisch ein Sicherungspunkt des aktuellen Stands angelegt.</p>' +
      '<h3>Automatische Sicherungspunkte</h3><div id="snapshots" class="muted">wird geladen …</div>' +
      '</section>' +

      '<section class="card"><h2>Alle Daten löschen</h2>' +
      '<p class="muted">Löscht alle Wettkämpfe und eigene Änderungen an den Turnernamen der ' + esc(leagueOf(currentLeague).short) + ' auf diesem Gerät. Die Mannschaften und die vorgegebenen Turner bleiben erhalten. Ein Sicherungspunkt wird vorher angelegt.</p>' +
      '<button class="btn danger" data-action="wipe">Alle Daten löschen …</button></section>';
  }

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
        'Alle Angaben lassen sich später über <b>Wettkampf Setup</b> ändern.'
      ]) +

      sec('2. Wertungen erfassen', [
        classic
          ? 'Oben das Gerät wählen. Links stehen die Turner der am Gerät beginnenden Mannschaft, rechts die der anderen; die Zahl vor dem Turner ist seine Startposition (geturnt wird abwechselnd).'
          : 'Oben das Gerät wählen. Je Duell steht der vorlegende Turner links bzw. oben und ist mit „legt vor“ markiert.',
        '<b>Einturnzeit und Gerätestart</b>: Turner lassen sich an jedem Gerät jederzeit auswählen (auch vorab). Mit „Einturnzeit (6:40) starten“ beginnt das Einturnen; nach Ablauf und 5 Sekunden „Einturnen beendet“ startet das Gerät automatisch – erst dann sind Wertungen und „Wertung 0,00“ möglich, und die Anzeigetafel wechselt auf dieses Gerät. Bis dahin bleibt dort das vorige Gerät mit allen Werten stehen. Wird die Einturnzeit vorzeitig gestoppt, fragt die App, ob das Gerät jetzt starten soll. Ohne Einturnzeit: „Gerät direkt starten“ (mit Rückfrage). Ein versehentlicher Start lässt sich zurücknehmen, solange noch keine Wertung eingetragen ist.',
        'Die Gerätereiter zeigen den Stand: ✓ abgeschlossen, ● läuft, 🔒 gesperrt. Solange ein Gerät läuft oder an einem Gerät die Einturnzeit läuft, kann an keinem anderen Gerät die Einturnzeit oder der Start begonnen werden; gesperrte Geräte lassen sich trotzdem öffnen, um Turner zu ändern. Abgeschlossene Geräte öffnen sich gesperrt; zum Ändern „Bearbeiten“ wählen und bestätigen. Im Notfall lässt sich die Sperre über „Gerät starten“ an einem gesperrten Gerät und „Gerätesperre aufheben …“ (doppelt bestätigt) aufheben und über den Hinweis oberhalb der Geräte wieder aktivieren.',

        'Je Turner: Turner auswählen, dann Abzüge E1, E2 (ggf. E3), D-Note, Standbonus und neutralen Abzug eintragen. E-Note und Endnote rechnet die App.',
        (classic ? 'Mit der <b>Tab-Taste</b> geht es der Reihe nach durch die Eingabefelder.' : 'Mit der <b>Tab-Taste</b> geht es in dieser Reihenfolge durch das ganze Duell.') +
          ' Enter öffnet die Turnerauswahl und schaltet den Standbonus um; die Pfeiltasten ändern Noten in 0,1-Schritten.',
        '<b>kein Turner</b> (ganz oben in der Turnerauswahl, auch vorab wählbar): Die Übung zählt 0 Punkte, bereits eingegebene Wertungen werden nach Rückfrage gelöscht; auf Tafel und Protokoll erscheint sie als „nicht angetreten“ bzw. „n.a.“. <b>Wertung 0,00</b>: Der Turner ist angetreten, erhält aber die Endnote 0 – das Kästchen erscheint erst nach Auswahl eines Turners; bereits eingegebene Werte werden dabei gelöscht.',
        classic
          ? '<b>Mannschaftsabzug</b>: Die Links „Mannschaftsabzug Heim“ bzw. „Gast“ ganz unten im Gerätebereich öffnen die Eingabe des Abzugs in Punkten. Es gibt je Mannschaft nur einen Abzug für den ganzen Wettkampf – die Links unter allen Geräten sind dieselben. Der Abzug mindert nur die Gesamtpunktzahl, nicht die Geräteergebnisse; 0 oder leer entfernt ihn. Er erscheint auf der Anzeigetafel und – nur wenn eingetragen – im Protokoll.'
          : '<b>Mannschaftsabzüge</b> werden beim Turner als <b>neutraler Abzug</b> eingetragen, der zuletzt am Gerät war bzw. bei dem der Abzug zuerst aufgefallen ist.'
      ]) +

      sec('3. Wertung freigeben', classic ? [
        'Jede Übung hat ihren eigenen Knopf <b>Wertung freigeben</b>. Erst dann zählt die Wertung und erscheint auf der Anzeigetafel.',
        'Je Mannschaft und Gerät zählen die drei höchsten Wertungen; die Streichwertung wird grau durchgestrichen angezeigt.',
        'Wird eine freigegebene Wertung nachträglich geändert, sind alle anderen Übungen gesperrt, bis die Änderung mit <b>Korrektur freigeben</b> bestätigt oder mit <b>Änderung verwerfen</b> zurückgenommen wird.'
      ] : [
        'Sind beide Turner eines Duells gewählt und vollständig gewertet, wird <b>Wertung freigeben</b> aktiv. Erst dann zählen die Scorepunkte und erscheinen auf der Anzeigetafel.',
        'Wird eine freigegebene Wertung nachträglich geändert, sind alle anderen Duelle gesperrt, bis die Änderung mit <b>Korrektur freigeben</b> bestätigt oder mit <b>Änderung verwerfen</b> zurückgenommen wird.'
      ]) +

      sec('4. Timer', [
        '<b>Einturnzeit (6:40)</b> – 8 Turner × 50 Sekunden – über dem jeweiligen Gerät starten. Nach Ablauf ertönt 5 Sekunden lang eine Schelle.',
        '<b>Sturz-Timer</b> (nicht an Boden und Sprung) bei der jeweiligen Übung starten: Die Sekunden erscheinen zuerst schwarz, ab 10 Sekunden ocker, ab 20 Sekunden rot. Nach 30 Sekunden ertönt ein kurzer Doppelton, die Anzeige wird rot und zeigt „Abzug 0,3“; in den letzten 10 Sekunden blinkt die Zahl leicht. Nach weiteren 30 Sekunden ertönt ein Fehlerton und „Übung beendet“ erscheint.',
        'Ein erneuter Klick auf den laufenden Timer stoppt ihn. Die Lautstärke wird am Gerät eingestellt.'
      ]) +

      sec('5. Anzeigetafel', [
        '<b>Anzeigetafel</b> öffnet die Tafel in einem eigenen Fenster. Dieses Fenster auf den Beamer bzw. Fernseher ziehen und dort doppelt auf die Tafel klicken – das schaltet das Vollbild ein und aus.',
        '<b>Hell</b> eignet sich für Beamer in heller Halle, <b>Dunkel</b> für Fernseher und abgedunkelte Räume. <b>Wettkampfergebnis einblenden</b> zeigt Stand, Gerätepunkte und die drei besten Scorer (während des Wettkampfs als Zwischenstand). Beim Öffnen der Tafel ist es immer ausgeblendet. ' +
        '<b>Turnervorstellung</b> zeigt nacheinander die Gastmannschaft (Titelseite, dann die anwesenden Turner nach Startnummer), die Heimmannschaft und zum Schluss das Kampfgericht. Weiterschalten mit den Knöpfen oder per Tastatur – Pfeil rechts, Leertaste oder Bild ab (auch mit einem Presenter), zurück mit Pfeil links oder Bild auf, Esc beendet. Während der Vorstellung sind keine anderen Fenster auf der Tafel möglich.',
        '<b>Wettkampfpause</b>: Knopf antippen und 10, 15 oder 20 Minuten wählen – die Pause startet sofort. Die Restzeit erscheint groß auf der Tafel; am Ende ertönt ein Signal und 5 Sekunden lang „Zeit abgelaufen“. Ein Klick auf den laufenden Knopf beendet die Pause.',
        (classic ? 'Nach jeder Freigabe erscheint 10 Sekunden groß auf der Tafel die Endnote der Übung mit dem Turner darüber' : 'Nach jeder Freigabe erscheinen 10 Sekunden groß auf der Tafel die Scorepunkte des Duells mit dem Sieger darüber') +
          ', Korrekturen 10 Sekunden. Der Sturz-Timer erscheint groß als Fenster über der Tafel; Einturnzeit und Wettkampfpause laufen groß in der Karte oben rechts, Liste und Wertungen bleiben dabei sichtbar.'
      ]) +

      sec('6. Abschluss', [
        '<b>Wettkampf abschließen</b> sperrt die Eingabe. Anschließend fragt die App, ob nur dieser Wettkampf oder alles gesichert werden soll.',
        '<b>Protokoll / Drucken</b> erstellt das Wettkampfprotokoll auf einer DIN-A4-Seite (auch als PDF speicherbar).',
        'Über <b>Wieder öffnen</b> kann ein abgeschlossener Wettkampf erneut bearbeitet werden.',
        'Die Sicherungsdateien lassen sich jederzeit unter <b>Datensicherung</b> erstellen; wie das funktioniert, steht unter ' + INFO_LINK + '.'
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
        'Die Daten jeder Liga werden <b>getrennt gesichert</b>. Die Seite <b>Datensicherung</b> befindet sich deshalb in der jeweiligen Liga (oben im Menü).',
        'Dort regelmäßig eine Gesamtsicherung oder einzelne Wettkämpfe als Datei sichern, z. B. auf einen USB-Stick. Der Dateiname zeigt Liga und Art der Sicherung.',
        'Beim Importieren ersetzt eine Gesamtsicherung alle Daten dieser Liga; die andere Liga bleibt unverändert. Ein einzelner Wettkampf wird nur hinzugefügt bzw. ersetzt.',
        'Die App legt zusätzlich automatische Sicherungspunkte an, aus denen sich ein früherer Stand wiederherstellen lässt.',
        '<b>Alle Daten löschen</b> entfernt alle Wettkämpfe und eigene Änderungen an Turnernamen dieser Liga; die vorgegebenen Turner bleiben erhalten.'
      ]) +

      sec('4. Updates', [
        'Die App sucht beim Start und alle 30 Minuten nach einer neuen Version. Ist eine da, erscheint ein Hinweis; nach „Jetzt aktualisieren“ ist sie aktiv. Alle Daten bleiben erhalten.'
      ]) +
      '<p><a class="btn" href="#/">← Zur Startseite</a></p></section>';
  }

  function refreshDataView() {
    DB.storageInfo().then(function (info) {
      var el = document.getElementById('data-storage');
      if (el) el.innerHTML = storageInfoHtml(info);
    });
    DB.listSnapshots().then(function (list) {
      var el = document.getElementById('snapshots');
      if (!el) return;
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

  /** Landesliga: eine einzelne Übung freigeben (bzw. ihre Korrektur). */
  function revealSide(m, btn) {
    var appKey = btn.getAttribute('data-app');
    var idx = parseInt(btn.getAttribute('data-duel'), 10);
    var k = btn.getAttribute('data-side');
    var d = m.apparatus[appKey].duels[idx];
    if (!d || m.status === 'final') return;
    if (!sideReady(m, d[k])) { toast('Übung ist noch nicht vollständig erfasst.', 'error'); return; }
    d.revs = d.revs || { home: { revealedAt: null }, guest: { revealedAt: null } };
    var rev = d.revs[k] = d.revs[k] || { revealedAt: null };
    var wasCorrection = S.sidePending(d, k);
    if (rev.shown && !wasCorrection) return;
    rev.prevShown = wasCorrection ? rev.shown : null;
    rev.revealKind = wasCorrection ? 'correction' : 'first';
    rev.revealedAt = new Date().toISOString();
    if (!rev.firstRevealedAt) rev.firstRevealedAt = rev.revealedAt;
    rev.shown = S.snapshotSide(d[k]);
    var viaKeyboard = lastInputKeyboard;
    var cellKey = appKey + '-' + idx + '-' + k;
    save('matches', m).then(function () {
      rerenderPanel(m);
      // Per Tastatur weiter zur nächsten Übung in Startreihenfolge.
      var cells = Array.prototype.slice.call($app.querySelectorAll('#apparatus-panel .cl-cell'));
      var pos = cells.map(function (c) { return c.querySelector('.side').getAttribute('data-key'); }).indexOf(cellKey);
      var nextCell = cells[pos + 1];
      var next = nextCell && nextCell.querySelector('select[data-field="gymnast"]:not([disabled]), input[data-field]:not([type=checkbox]):not([disabled])');
      if (next && !wasCorrection && viaKeyboard) next.focus();
      toast(wasCorrection ? 'Korrektur freigegeben' : 'Wertung freigegeben');
    });
  }

  // ---------- Ereignisse ----------

  // Namen von D1/D2 sofort in ein noch verbundenes E2-/E3-Feld übernehmen.
  $app.addEventListener('input', function (ev) {
    var el = ev.target;
    if (!el.form || el.form.getAttribute('data-form') !== 'match') return;
    if (el.name === 'judgeD1' || el.name === 'judgeD2') linkJudges(el.form);
    if (el.name === 'judgeE2Home' || el.name === 'judgeE3Guest') el.dataset.linked = el.value === el.form[el.name === 'judgeE2Home' ? 'judgeD1' : 'judgeD2'].value ? '1' : '';
  });

  $app.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.dataset && el.dataset.picking) return; // erst mit Enter übernehmen
    if (el.hasAttribute('data-field')) { handleScoreChange(el); return; }
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

  var SCORE_FIELDS = ['d', 'e1', 'e2', 'e3', 'nd'];

  /** Reihenfolge wie mit der Tabulatortaste: Turner, Notenfelder, Standbonus – je Übung –, dann „Wertung freigeben“. */
  function entrySequence() {
    return Array.prototype.slice.call($app.querySelectorAll(
      'select[data-field="gymnast"]:not([disabled]), input[data-field]:not([type=checkbox]):not([disabled]), input[data-field="bonus"]:not([disabled]), button[data-action="reveal"]:not([disabled])'));
  }

  function focusNext(el) {
    var seq = entrySequence();
    var next = seq[seq.indexOf(el) + 1];
    if (next) next.focus(); else el.blur();
  }

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
    if (sel.value !== sel.dataset.orig) handleScoreChange(sel);
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
    if (el.matches && el.matches('select[data-field="gymnast"]')) {
      if (el.dataset.picking) {
        if (ev.key === 'Enter') { ev.preventDefault(); closePicker(el, true); }
        else if (ev.key === 'Escape') { ev.preventDefault(); closePicker(el, false); }
        return;
      }
      if (ev.key === 'Enter') { ev.preventDefault(); openPicker(el); return; }
      // Geschlossenes Feld nicht versehentlich per Pfeiltaste umstellen.
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') ev.preventDefault();
      return;
    }
    if (!el.matches || !el.matches('input[data-field]')) return;
    var field = el.getAttribute('data-field');
    if (ev.key === 'Enter') {
      ev.preventDefault();
      // Enter schaltet den Standbonus um, sonst springt Enter wie Tab zum nächsten Feld.
      if (field === 'bonus') {
        if (!el.disabled) { el.checked = !el.checked; handleScoreChange(el); }
        return;
      }
      focusNext(el);
      return;
    }
    // Pfeiltasten ↑/↓ ändern den Wert in 0,1-Schritten, nie unter 0.
    if ((ev.key === 'ArrowUp' || ev.key === 'ArrowDown') && SCORE_FIELDS.indexOf(field) >= 0 && !el.disabled) {
      ev.preventDefault();
      var cur = S.parseScore(el.value);
      if (cur === null || Number.isNaN(cur)) cur = 0;
      var max = field === 'd' ? 20000 : 10000;
      var v = Math.min(max, Math.max(0, cur + (ev.key === 'ArrowUp' ? 100 : -100)));
      el.value = fmt1(v);
      handleScoreChange(el);
      el.select();
    }
  });

  $app.addEventListener('focusin', function (ev) {
    if (ev.target.matches('input[data-field]')) ev.target.select();
  });

  $app.addEventListener('submit', function (ev) {
    var form = ev.target;
    var kind = form.getAttribute('data-form');
    if (!kind) return;
    ev.preventDefault();
    var fd = new FormData(form);

    if (kind === 'match') {
      submitMatchForm(form);
    } else if (kind === 'import') {
      var file = form.file.files[0];
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
  });

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
        if (state.ui.editDone[m.id] && state.ui.editDone[m.id] !== btn.getAttribute('data-tab')) delete state.ui.editDone[m.id];
        if (currentTab(m) !== btn.getAttribute('data-tab')) state.ui.openedDone[m.id] = appStatus(m)[btn.getAttribute('data-tab')] === 'done' ? btn.getAttribute('data-tab') : '';
        state.ui.tab[m.id] = btn.getAttribute('data-tab');
        $app.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        document.getElementById('apparatus-panel').innerHTML = apparatusPanel(m, currentTab(m));
        tickTimers();
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
        askConfirm('Wettkampf vom ' + fmtDate(m.date) + ' (' + teamName(m.homeTeamId) + ' – ' + teamName(m.guestTeamId) + ') wirklich löschen?').then(function (yes) {
          if (yes) delMatch();
        });
        var delMatch = function () { takeSnapshot('vor Löschen eines Wettkampfs').then(function () {
          state.matches = state.matches.filter(function (x) { return x.id !== m.id; });
          return remove('matches', m.id);
        }).then(function () { location.hash = leagueHref('home', matchLeague(m).key); toast('Wettkampf gelöscht'); }); };
        break;
      case 'reveal':
        if (m && isClassic(m)) { revealSide(m, btn); return; }
        var duel = m && m.apparatus[btn.getAttribute('data-app')].duels[parseInt(btn.getAttribute('data-duel'), 10)];
        if (!duel || m.status === 'final') return;
        if (!duelReady(S.duelResult(duel, m.rules), duel)) { toast('Duell ist noch nicht vollständig erfasst.', 'error'); return; }
        var wasCorrection = S.hasPendingCorrection(duel);
        if (duel.shown && !wasCorrection) return;
        duel.prevShown = wasCorrection ? duel.shown : null;
        duel.revealKind = wasCorrection ? 'correction' : 'first';
        duel.revealedAt = new Date().toISOString();
        if (!duel.firstRevealedAt) duel.firstRevealedAt = duel.revealedAt;
        duel.shown = { home: S.snapshotSide(duel.home), guest: S.snapshotSide(duel.guest) };
        var revealedIdx = parseInt(btn.getAttribute('data-duel'), 10);
        var revealViaKeyboard = lastInputKeyboard;
        var revealedApp = btn.getAttribute('data-app');
        save('matches', m).then(function () {
          rerenderPanel(m);
          // Per Tastatur weiter zur Turnerauswahl des vorlegenden Turners im nächsten Duell.
          var nextDuel = $app.querySelectorAll('#apparatus-panel .duel')[revealedIdx + 1];
          var next = nextDuel && nextDuel.querySelector('select[data-field="gymnast"]:not([disabled]), input[data-field]:not([type=checkbox]):not([disabled])');
          if (next && !wasCorrection && revealViaKeyboard) next.focus();
          toast(wasCorrection ? 'Korrektur freigegeben' : 'Wertung freigegeben');
        });
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
      case 'app-start':
        var sKey = btn.getAttribute('data-app');
        if (appStatus(m)[sKey] === 'locked') { lockedDialog(m, sKey); return; }
        askYesNo('Gerät ohne Anzeige der Einturnzeit starten?', '')
          .then(function (yes) { if (yes) startApparatus(m, sKey); });
        break;
      case 'app-unstart':
        var uKey = btn.getAttribute('data-app');
        if (!canUnstart(m, uKey)) { toast('Am Gerät sind bereits Wertungen eingetragen.', 'error'); keepScroll = true; render(); return; }
        delete m.started[uKey];
        save('matches', m).then(function () { keepScroll = true; render(); });
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
      case 'toggle-scorers':
        if (!(m.display && m.display.scorers) && introBlocks(m)) return;
        m.display = m.display || {};
        m.display.scorers = !m.display.scorers;
        save('matches', m).then(function () { refreshDisplayButtons(m); });
        refreshDisplayButtons(m);
        break;
      case 'fall-timer':
        if (!m || m.status === 'final') return;
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
        if (!m || m.status === 'final') return;
        var wapp = btn.getAttribute('data-app');
        var wcur = warmupState(m);
        if (!(wcur && wcur.t.appKey === wapp) && appStatus(m)[wapp] === 'locked') { lockedDialog(m, wapp); return; }
        if (!wcur && introBlocks(m)) return;
        m.timers = m.timers || {};
        if (wcur && wcur.t.appKey === wapp) {
          // Vorzeitig gestoppt: nachfragen, ob das Gerät jetzt starten soll.
          m.timers.warmup = null;
          save('matches', m).then(function () { tickTimers(); keepScroll = true; render(); });
          askYesNo('Gerät jetzt starten?', 'Die Einturnzeit wurde vorzeitig beendet. Soll ' + apparatusName(wapp) + ' jetzt gestartet werden?')
            .then(function (yes) { if (yes) startApparatus(m, wapp); });
          return;
        }
        m.timers.warmup = { appKey: wapp, start: Date.now() };
        save('matches', m).then(function () { tickTimers(); keepScroll = true; render(); });
        tickTimers();
        break;
      case 'discard':
        var dd = m && m.apparatus[btn.getAttribute('data-app')].duels[parseInt(btn.getAttribute('data-duel'), 10)];
        if (!dd) return;
        // Oberliga: das ganze Duell, Landesliga: nur die eine Übung.
        var dSides = isClassic(m) ? [btn.getAttribute('data-side')] : ['home', 'guest'];
        var dShown = function (k) { return isClassic(m) ? S.revOf(dd, k).shown : dd.shown && dd.shown[k]; };
        if (!dShown(dSides[0])) return;
        askConfirm('Änderung verwerfen und den angezeigten Stand wiederherstellen?').then(function (yes) {
          if (!yes) return;
          dSides.forEach(function (k) { restoreShownSide(m, dd, k, dShown(k)); });
          save('matches', m).then(function () { rerenderPanel(m); toast('Änderung verworfen'); });
        });
        break;
      case 'edit-done':
        var eKey = btn.getAttribute('data-app');
        askChoice(apparatusName(eKey) + ' ist bereits abgeschlossen', 'Wirklich bearbeiten? Jede Änderung muss anschließend mit „Korrektur freigeben“ bestätigt werden.', null,
          [{ label: 'Abbrechen', value: false, cancel: true }, { label: 'Bearbeiten', value: true, primary: true, focus: true }]).then(function (ok) {
          if (!ok) return;
          state.ui.editDone[m.id] = eKey;
          rerenderPanel(m);
        });
        break;
      case 'relock':
        m.unlockApparatus = false;
        save('matches', m).then(function () { render(); toast('Gerätesperre wieder aktiv'); });
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
        var sel = document.getElementById('export-match-select');
        var em = sel && match(sel.value);
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

  window.addEventListener('hashchange', render);
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
