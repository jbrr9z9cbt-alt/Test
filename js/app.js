/* WTB-Liga – Oberfläche und Ablaufsteuerung */
(function () {
  'use strict';

  var S = window.Scoring;
  var DB = window.DB;
  var SB = window.SecureBackup;
  var CFG = window.TEAM_CONFIG;
  var APP_VERSION = 2;
  var APP_BUILD = '13';
  var FLASH_MS = 5000;
  var CORRECTION_MS = 10000;
  var FALL_PHASE_MS = 30000;       // Sturz-Timer: 30 s gelb, dann 30 s rot (Abzug 0,3)
  var WARMUP_MS = 4 * 60 * 1000;   // Einturnzeit je Gerät
  var FALL_TIMER_APPARATUS = ['PH', 'SR', 'PB', 'HB']; // nicht an Boden und Sprung
  var LEAGUE = CFG.league || '';
  var APP_NAME = 'WTB-Liga';

  // Feste Mannschaftsfarben; "onDark" ist der hellere Ton für die dunkle Anzeigetafel.
  var COLORS = [
    { key: 'rot', name: 'Rot', hex: '#d32f2f', onDark: '#ff5a5a', onLight: '#c62828', fg: '#fff' },
    { key: 'blau', name: 'Blau', hex: '#1e63c6', onDark: '#5b9bff', onLight: '#1e63c6', fg: '#fff' },
    { key: 'orange', name: 'Orange', hex: '#f07c00', onDark: '#ff9a2e', onLight: '#c25e00', fg: '#171717' },
    { key: 'hellgrau', name: 'Hellgrau', hex: '#c8c8c8', onDark: '#dcdcdc', onLight: '#8a8a8a', fg: '#171717' },
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

  function colorOf(key) {
    return COLORS.filter(function (c) { return c.key === key; })[0] || COLORS[0];
  }

  /** Farbe einer Seite im Wettkampf (wird beim Anlegen gewählt). */
  function sideColor(m, sideKey) {
    var key = (m.colors && m.colors[sideKey]) || DEFAULT_COLORS[sideKey];
    return colorOf(key);
  }

  /** Scorepunkte immer in der Farbe der jeweiligen Mannschaft (dark = dunkle Anzeigetafel). */
  function pts(m, sideKey, n, dark) {
    var c = sideColor(m, sideKey);
    return '<span class="sp-num" style="color:' + (dark ? c.onDark : c.onLight) + '">' + n + '</span>';
  }

  function ptsPair(m, h, g, dark, sep) {
    return pts(m, 'home', h, dark) + '<span class="sp-sep">' + (sep || ':') + '</span>' + pts(m, 'guest', g, dark);
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

  /** Abfrage mit den Antworten „Ja“ und „Nein“ (Escape = Nein). */
  function askYesNo(title, text, hint) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
        '<h3 id="modal-title">' + esc(title) + '</h3><p>' + esc(text) + '</p>' + (hint ? '<p class="muted small">' + esc(hint) + '</p>' : '') +
        '<div class="actions"><button type="button" class="btn primary" data-answer="yes">Ja</button>' +
        '<button type="button" class="btn" data-answer="no">Nein</button></div></div>';
      document.body.appendChild(wrap);
      function close(answer) {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        resolve(answer);
      }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(false); } }
      wrap.addEventListener('click', function (e) {
        var b = e.target.closest('[data-answer]');
        if (b) close(b.getAttribute('data-answer') === 'yes');
      });
      document.addEventListener('keydown', onKey, true);
      wrap.querySelector('[data-answer="yes"]').focus();
    });
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

  /** Sicherungsdatei aller Daten herunterladen; nach einem Wettkampf mit dessen Datum und Mannschaften im Namen. */
  function exportBackup(m) {
    var slug = function (t) { return String(t).toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').replace(/^-|-$/g, ''); };
    var name = 'wtb-oberliga-sicherung-' + (m ? (m.date || '') + '_' + slug(teamName(m.homeTeamId)) + '_' + slug(teamName(m.guestTeamId)) : stamp()) + '.json';
    download(name, JSON.stringify(exportData(), null, 2));
    toast('Sicherung erstellt');
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
    return DB.addSnapshot(exportData(), reason).catch(function (e) {
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
   * Mannschaften kommen fest aus js/config.js. Gespeichert werden nur die
   * Nutzerangaben dazu (Farbe, Turnernamen der Startnummern 1–20).
   */
  function buildTeams(stored) {
    var byId = {};
    state.legacyTeamNames = {};
    stored.forEach(function (t) { byId[t.id] = t; });
    var known = {};
    var teams = CFG.teams.map(function (c) {
      known[c.id] = true;
      var s = byId[c.id] || {};
      // Gespeicherte Änderungen gelten nur, solange die vorgegebene Turnerliste gleich geblieben ist.
      var useStored = s.rosterVersion === CFG.rosterVersion;
      var preset = c.gymnasts || {};
      var gymnasts = [];
      for (var n = 1; n <= CFG.gymnastsPerTeam; n++) {
        var old = useStored ? (s.gymnasts || []).filter(function (g) { return g.number === n; })[0] : null;
        gymnasts.push({ id: c.id + '-' + n, number: n, name: old ? old.name : (preset[n] || '') });
      }
      return { id: c.id, name: c.name, rosterVersion: CFG.rosterVersion, gymnasts: gymnasts };
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
    var fixed = S.leagueRules(m.rules && m.rules.eJudges);
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

  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    return { name: parts[0] || 'start', id: parts[1], sub: parts[2] };
  }

  var keepScroll = false;

  function render() {
    var r = route();
    document.body.classList.toggle('board-mode', r.name === 'match' && r.sub === 'board');
    document.querySelectorAll('.topbar nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === r.name);
    });
    // Auf der Startseite und im Landesliga-Bereich gibt es keine Oberliga-Navigation.
    var inOberliga = r.name !== 'start' && r.name !== 'landesliga';
    document.body.classList.toggle('no-league', !inOberliga);
    var ln = document.getElementById('league-name');
    if (ln) ln.textContent = r.name === 'landesliga' ? 'WTB-Landesliga' : inOberliga ? LEAGUE : APP_NAME;
    var html;
    switch (r.name) {
      case 'teams': html = viewTeams(); break;
      case 'new': html = viewMatchForm(null); break;
      case 'edit': html = viewMatchForm(match(r.id)); break;
      case 'match':
        var m = match(r.id);
        if (!m) { html = notFound(); break; }
        html = r.sub === 'board' ? viewBoard(m) : r.sub === 'print' ? viewPrint(m) : viewMatch(m);
        break;
      case 'data': html = viewData(); break;
      case 'oberliga': html = viewHome(); break;
      case 'landesliga': html = viewLandesliga(); break;
      default: html = viewStart();
    }
    $app.innerHTML = (state.persistent ? '' : warningBanner()) + html;
    if (r.name === 'data') refreshDataView();
    var mf = $app.querySelector('form[data-form="match"]');
    if (mf) syncJudgeFields(mf);
    if (r.name === 'match' && r.sub === 'print') fitPrintToA4();
    if (r.name === 'oberliga') refreshStorageBox();
    var isBoard = r.name === 'match' && r.sub === 'board' && match(r.id);
    if (isBoard) { checkBoardFlash(match(r.id)); fitBoard(); }
    else state.board = { matchId: null, lastReveal: '' };
    if (!keepScroll) window.scrollTo(0, 0);
    tickTimers();
    if (isBoard) fitBoard();
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
      '<h1>' + esc(APP_NAME) + '</h1><p class="muted">Bitte die Liga wählen</p>' +
      '<div class="start-grid">' +
      '<a class="start-tile" href="#/oberliga"><span class="st-title">Oberliga</span><span class="st-sub">Wettkämpfe, Mannschaften, Anzeigetafel</span></a>' +
      '<a class="start-tile" href="#/landesliga"><span class="st-title">Landesliga</span><span class="st-sub">folgt in Kürze</span></a>' +
      '</div></section>';
  }

  function viewLandesliga() {
    return '<section class="card narrow"><h2>Landesliga</h2><p class="muted">Dieser Bereich wird später ergänzt.</p>' +
      '<a class="btn" href="#/">← Zur Startseite</a></section>';
  }

  function notFound() {
    return '<section class="card"><h2>Nicht gefunden</h2><p>Dieser Wettkampf existiert nicht (mehr).</p><a class="btn" href="#/oberliga">Zur Übersicht</a></section>';
  }

  // ---------- Ansicht: Übersicht ----------

  function viewHome() {
    var list = state.matches.length ? state.matches.map(function (m) {
      var r = S.matchResult(m);
      return '<a class="match-row" href="#/match/' + m.id + '">' +
        '<div><div class="match-title">' + esc(fmtDate(m.date) || 'ohne Datum') + '</div>' +
        '<div class="muted">' + esc(LEAGUE) + '</div></div>' +
        '<div class="match-teams">' + teamTag(m, 'home') + ' <span class="muted">vs.</span> ' + teamTag(m, 'guest') + '</div>' +
        '<div class="match-score">' + ptsPair(m, r.homePoints, r.guestPoints) + '</div>' +
        '<div>' + statusBadge(m, r) + '</div></a>';
    }).join('') : '<p class="muted">Noch keine Wettkämpfe angelegt.</p>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Wettkämpfe</h2>' +
      '<a class="btn primary" href="#/new">+ Neuer Wettkampf</a>' +
      '</div>' + list + '</section>' +
      '<section class="card"><h2>Datenspeicher</h2><div id="storage-box" class="muted">wird geprüft …</div></section>';
  }

  function teamTag(m, sideKey) {
    var id = sideKey === 'home' ? m.homeTeamId : m.guestTeamId;
    return '<span class="team-tag"><span class="dot" style="background:' + sideColor(m, sideKey).hex + '"></span>' + esc(teamName(id)) + '</span>';
  }

  function statusBadge(m, r) {
    if (m.status === 'final') return '<span class="badge final">abgeschlossen</span>';
    if (r.complete) return '<span class="badge done">alle Duelle gewertet</span>';
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
      '<li>App-Version: ' + APP_BUILD + ' (sucht beim Start und alle 30 Minuten nach Updates)</li>' +
      '</ul>';
  }

  function offlineStatus() {
    if (!('serviceWorker' in navigator)) return 'nicht verfügbar in diesem Browser';
    if (location.protocol === 'file:') return 'direkt aus Datei geöffnet – funktioniert ohne Internet';
    return navigator.serviceWorker.controller ? '<strong class="ok">bereit</strong> (App ist zwischengespeichert)' : 'wird eingerichtet … (Seite einmal neu laden)';
  }

  // ---------- Ansicht: Mannschaften ----------

  function viewTeams() {
    var cards = state.teams.map(function (t) {
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
      '<p class="muted">Die ' + state.teams.length + ' Mannschaften sind fest vorgegeben. Hier lassen sich die Namen der Turner mit den Startnummern 1–' +
      CFG.gymnastsPerTeam + ' anpassen. Jede Änderung wird sofort gespeichert. Die Mannschaftsfarben werden beim Anlegen eines Wettkampfs gewählt.</p></section>' +
      '<div class="team-grid">' + cards + '</div>';
  }

  // ---------- Ansicht: Wettkampf anlegen / bearbeiten ----------

  function teamOptions(selected) {
    return '<option value="">– auswählen –</option>' + state.teams.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === selected ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    }).join('');
  }

  function viewMatchForm(m) {
    var isNew = !m;
    var rules = m ? m.rules : S.DEFAULT_RULES;
    var hasScores = m && S.APPARATUS.some(function (a) { return S.matchResult(m).apparatus[a.key].started; });
    var j = (m && m.judges) || {};
    var cap = (m && m.captains) || {};
    var neutral = S.eJudgeCount(rules) === 2;
    var start = (m && m.startTeam) || 'home';
    function input(name, label, value) {
      return '<label>' + label + '<input type="text" name="' + name + '" value="' + esc(value || '') + '" autocomplete="off" required></label>';
    }
    function teamCol(side, label) {
      var teamId = m ? (side === 'home' ? m.homeTeamId : m.guestTeamId) : null;
      return '<div class="team-col"><label>' + label + '<select name="' + side + '" required' + (hasScores ? ' disabled' : '') + '>' + teamOptions(teamId) + '</select></label>' +
        colorPicker(side + 'Color', 'Farbe', m ? sideColor(m, side).key : DEFAULT_COLORS[side]) +
        input(side === 'home' ? 'captainHome' : 'captainGuest', 'Mannschaftsführer', cap[side]) + '</div>';
    }
    return '<section class="card narrow"><h2>' + (isNew ? 'Neuer Wettkampf' : 'Wettkampf bearbeiten') + '</h2>' +
      '<form data-form="match" data-id="' + (m ? m.id : '') + '" class="stack match-form' + (neutral ? '' : ' split-e') + '">' +
      '<div class="row2"><label>Datum<input type="date" name="date" value="' + esc(m ? m.date : new Date().toISOString().slice(0, 10)) + '" required></label>' +
      '<fieldset class="radio-row"><legend>Beginnende Mannschaft</legend>' +
      '<label class="check"><input type="radio" name="startTeam" value="home"' + (start === 'home' ? ' checked' : '') + '> Heim</label>' +
      '<label class="check"><input type="radio" name="startTeam" value="guest"' + (start === 'guest' ? ' checked' : '') + '> Gast</label></fieldset></div>' +
      '<div class="row2 teams-row">' + teamCol('home', 'Heimmannschaft') + teamCol('guest', 'Gastmannschaft') + '</div>' +
      '<fieldset class="judges"><legend>Kampfgericht</legend>' +
      input('judgeE1', 'E1 – Oberkampfrichter', j.e1) +
      '<label class="check"><input type="checkbox" name="neutralE2"' + (neutral ? ' checked' : '') + (hasScores ? ' disabled' : '') + '> Neutraler Kampfrichter E2' +
      (hasScores ? ' <span class="muted small">(nach Beginn der Wertung nicht mehr änderbar)</span>' : '') + '</label>' +
      '<div class="judge-neutral">' + input('judgeE2', 'E2 – neutral', neutral ? j.e2 : '') + '</div>' +
      '<div class="judge-split row2">' + input('judgeE2Home', 'E2 – Heim', neutral ? '' : j.e2) + input('judgeE3Guest', 'E3 – Gast', j.e3) + '</div>' +
      '<p class="muted small judge-hint">' + (neutral ? 'E-Note: 10 − Mittelwert der Abzüge von E1 und E2.' : 'E-Note: höchster und niedrigster Abzug werden gestrichen, der mittlere zählt.') + '</p>' +
      '<div class="row2">' + input('judgeD1', 'D1 – Vereinskampfrichter Heim', j.d1) + input('judgeD2', 'D2 – Vereinskampfrichter Gast', j.d2) + '</div>' +
      '</fieldset>' +

      '<div class="actions"><button class="btn primary" type="submit">' + (isNew ? 'Anlegen' : 'Speichern') + '</button>' +
      '<a class="btn ghost" href="' + (m ? '#/match/' + m.id : '#/oberliga') + '">Abbrechen</a></div>' +
      '</form></section>';
  }

  /** Neutraler E2 an/aus: passende Eingabefelder zeigen und als Pflichtfeld markieren. */
  function syncJudgeFields(form) {
    var neutral = form.neutralE2.checked;
    form.classList.toggle('split-e', !neutral);
    form.judgeE2.required = neutral;
    form.judgeE2Home.required = !neutral;
    form.judgeE3Guest.required = !neutral;
    form.querySelector('.judge-hint').textContent = neutral ? 'E-Note: 10 − Mittelwert der Abzüge von E1 und E2.'
      : 'E-Note: höchster und niedrigster Abzug werden gestrichen, der mittlere zählt.';
  }

  function colorPicker(name, label, selected) {
    return '<fieldset class="color-choice"><legend>' + label + '</legend>' + COLORS.map(function (c) {
      return '<label class="swatch" title="' + c.name + '"><input type="radio" name="' + name + '" value="' + c.key + '"' + (c.key === selected ? ' checked' : '') + '>' +
        '<span style="background:' + c.hex + ';color:' + c.fg + '">' + c.name + '</span></label>';
    }).join('') + '</fieldset>';
  }

  function submitMatchForm(form) {
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
      var rules = S.leagueRules(neutral ? 2 : 3);
      m = {
        id: uid(), date: '', homeTeamId: home, guestTeamId: guest,
        rules: rules, status: 'open', apparatus: {}, createdAt: new Date().toISOString()
      };
      S.APPARATUS.forEach(function (a) {
        m.apparatus[a.key] = { duels: Array.from({ length: duels }, S.emptyDuel) };
      });
      state.matches.unshift(m);
    } else {
      if (duels < m.rules.duelsPerApparatus) {
        var lost = S.APPARATUS.some(function (a) {
          return m.apparatus[a.key].duels.slice(duels).some(function (d) { return sideUsed(d.home) || sideUsed(d.guest); });
        });
        if (lost && !confirm('Beim Verringern der Duelle gehen bereits eingetragene Daten verloren. Fortfahren?')) return;
      }
      S.APPARATUS.forEach(function (a) {
        var list = m.apparatus[a.key].duels;
        while (list.length < duels) list.push(S.emptyDuel());
        list.length = duels;
      });
      m.rules.duelsPerApparatus = duels;
      m.homeTeamId = home;
      m.guestTeamId = guest;
    }
    m.colors = colors;
    m.rules = S.leagueRules(neutral ? 2 : 3);
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
    return state.ui.tab[m.id] || S.APPARATUS[0].key;
  }

  function viewMatch(m) {
    var r = S.matchResult(m);
    var tab = currentTab(m);
    var locked = m.status === 'final';
    var tabs = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<button class="tab' + (a.key === tab ? ' active' : '') + (ar.complete ? ' complete' : '') + '" tabindex="-1" data-action="tab" data-tab="' + a.key + '">' +
        '<span>' + a.name + '</span><span class="tab-score" data-out="tab-' + a.key + '">' + ptsPair(m, ar.homePoints, ar.guestPoints) + '</span></button>';
    }).join('');

    return '<section class="card match-head">' +
      '<div class="match-meta"><h2>' + esc(LEAGUE || 'Wettkampf') + '</h2>' +
      '<div class="muted">' + esc(fmtDate(m.date)) + ' · Beginn: ' + esc(teamName(m.startTeam === 'guest' ? m.guestTeamId : m.homeTeamId)) +
      ' · <span data-out="status">' + statusBadge(m, r) + '</span></div></div>' +
      '<div class="scoreline">' +
      '<div class="team home"><div class="label">Heim</div><div class="name">' + teamTag(m, 'home') + '</div></div>' +
      '<div class="big" data-out="score">' + ptsPair(m, r.homePoints, r.guestPoints, false, ' : ') + '</div>' +
      '<div class="team guest"><div class="label">Gast</div><div class="name">' + teamTag(m, 'guest') + '</div></div>' +
      '</div>' +
      '<div class="subscore">Gerätepunkte <strong data-out="app">' + r.homeApp + ':' + r.guestApp + '</strong>' +
      '<span data-out="winner">' + winnerText(m, r) + '</span></div>' +
      '<div class="actions wrap">' +
      '<button class="btn toggle' + (boardOn(m) && state.boardWin && !state.boardWin.closed ? ' on' : '') + '" data-action="toggle-board">Anzeigetafel: ' +
      (boardOn(m) && state.boardWin && !state.boardWin.closed ? 'an' : 'aus') + '</button>' +
      '<button class="btn toggle' + (m.display && m.display.scorers ? ' on' : '') + '" data-action="toggle-scorers">Topscorer auf Tafel: ' +
      (m.display && m.display.scorers ? 'an' : 'aus') + '</button>' +
      '<a class="btn" href="#/match/' + m.id + '/print">Protokoll / Drucken</a>' +
      (locked ? '' : '<a class="btn" href="#/edit/' + m.id + '">Bearbeiten</a>') +
      (locked ? '<button class="btn" data-action="reopen">Wieder öffnen</button>'
        : '<button class="btn primary" data-action="finalize">Wettkampf abschließen</button>') +
      '<button class="btn danger ghost" data-action="del-match">Löschen</button>' +
      '<span id="save-status" class="save-status"></span>' +
      '</div></section>' +
      (locked ? '<div class="banner info">Dieser Wettkampf ist abgeschlossen und schreibgeschützt.</div>' : '') +
      '<div data-out="pending">' + pendingBanner(m) + '</div>' +
      '<nav class="tabs">' + tabs + '</nav>' +
      '<section class="card" id="apparatus-panel">' + apparatusPanel(m, tab) + '</section>' +
      '<section class="card"><h3>Topscorer</h3><div data-out="scorers">' + scorersHtml(m) + '</div></section>';
  }

  /** Solange eine nachträgliche Änderung nicht angezeigt ist, sind alle anderen Duelle gesperrt. */
  function duelBlocked(m, appKey, idx) {
    if (m.status === 'final') return true;
    var pending = S.pendingCorrections(m);
    return pending.length > 0 && !pending.some(function (p) { return p.appKey === appKey && p.idx === idx; });
  }

  function apparatusName(key) {
    return S.APPARATUS.filter(function (a) { return a.key === key; })[0].name;
  }

  function pendingBanner(m) {
    var pending = S.pendingCorrections(m);
    if (!pending.length) return '';
    return '<div class="banner warn-banner">⚠ Nachträgliche Änderung: ' + pending.map(function (p) {
      return apparatusName(p.appKey) + ', Duell ' + (p.idx + 1);
    }).join('; ') + '. Bitte zuerst <strong>„Korrektur anzeigen“</strong> drücken (oder die Änderung verwerfen) – bis dahin sind alle anderen Duelle gesperrt.</div>';
  }

  function winnerText(m, r) {
    if (!r.complete) return '';
    if (r.winner === 'draw') return ' · <strong>Unentschieden</strong>';
    return ' · Sieger: <strong>' + esc(teamName(r.winner === 'home' ? m.homeTeamId : m.guestTeamId)) + '</strong>';
  }

  function gymnastSelect(m, appKey, idx, sideKey, side, locked) {
    var t = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
    var used = {};
    m.apparatus[appKey].duels.forEach(function (d, i) {
      if (i !== idx && d[sideKey].gymnastId) used[d[sideKey].gymnastId] = true;
    });
    var opts = '<option value="">– Turner –</option>';
    var found = false;
    (t ? t.gymnasts : []).forEach(function (g) {
      if (g.id === side.gymnastId) found = true;
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

  function sideHtml(m, appKey, idx, sideKey, side, locked, position) {
    var dis = locked || side.dns || side.zero;
    var color = sideColor(m, sideKey);
    var key = appKey + '-' + idx + '-' + sideKey;
    var three = S.eJudgeCount(m.rules) === 3;
    var bonusAllowed = appKey !== S.NO_BONUS_APPARATUS;
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '"';
    return '<div class="side ' + sideKey + (position === 1 ? ' first' : ' second') + (side.dns ? ' dns' : '') + '" style="--team:' + color.hex + ';--team-fg:' + color.fg + '">' +
      '<div class="side-head"><span class="order-no" title="Startreihenfolge im Duell">' + position + '.</span>' +
      (position === 1 ? '<span class="lead-tag">vorlegend</span>' : '') +
      '<span class="side-label" title="' + (sideKey === 'home' ? 'Heim' : 'Gast') + '">' + esc(teamName(sideKey === 'home' ? m.homeTeamId : m.guestTeamId)) + '</span>' +
      gymnastSelect(m, appKey, idx, sideKey, side, locked || side.dns) + '</div>' +
      '<div class="score-row" style="grid-template-columns:repeat(' + ((three ? 5 : 4) + (bonusAllowed ? 1 : 0)) + ',minmax(0,1fr))">' +
      scoreInput(appKey, idx, sideKey, 'e1', side.e1, dis, 'Abzüge E1') +
      scoreInput(appKey, idx, sideKey, 'e2', side.e2, dis, 'Abzüge E2') +
      (three ? scoreInput(appKey, idx, sideKey, 'e3', side.e3, dis, 'Abzüge E3') : '') +
      scoreInput(appKey, idx, sideKey, 'd', side.d, dis, 'D-Note') +
      (bonusAllowed ? '<label class="score-field bonus-field"><span>Standbonus</span><span class="bonus-box"><input type="checkbox" ' +
        fieldAttrs(appKey, idx, sideKey, 'bonus') + (side.bonus ? ' checked' : '') + (dis ? ' disabled' : '') + '> +0,1</span></label>' : '') +
      scoreInput(appKey, idx, sideKey, 'nd', side.nd, dis, 'Neutr. Abzug') +
      '</div>' +
      '<div class="result-row">' +
      '<span>E-Note <strong data-out="enote-' + key + '">' + fmt(S.eScore(side, m.rules)) + '</strong></span>' +
      '<span class="final">Endnote <strong data-out="final-' + key + '">' + fmt(S.sideFinal(side, m.rules)) + '</strong></span></div>' +
      '<div class="side-foot">' +
      '<label class="check"><input type="checkbox" tabindex="-1" ' + fieldAttrs(appKey, idx, sideKey, 'dns') + (side.dns ? ' checked' : '') + (locked ? ' disabled' : '') + '> nicht angetreten</label>' +
      '<label class="check"><input type="checkbox" tabindex="-1" ' + fieldAttrs(appKey, idx, sideKey, 'zero') + (side.zero ? ' checked' : '') + (locked || side.dns ? ' disabled' : '') + '> Wertung 0,00 (angetreten)</label>' +
      (FALL_TIMER_APPARATUS.indexOf(appKey) >= 0 ? '<button type="button" class="btn small timer-btn" tabindex="-1" data-action="fall-timer"' + attrs + (locked ? ' disabled' : '') + '>Sturz-Timer</button>' : '') +
      '</div></div>';
  }

  /** Scorepunkte des Duells als einzelne Zahl in der Farbe der Mannschaft, die es gewonnen hat. */
  function duelPoints(m, r) {
    if (!r.complete) return '<span class="duel-open">offen</span>';
    var n = r.winner === 'home' ? r.homePoints : r.winner === 'guest' ? r.guestPoints : 0;
    var num = r.winner === 'draw' ? '<span class="sp-num draw">0</span>' : pts(m, r.winner, n);
    return '<span class="duel-pts">' + num + '</span>' +
      '<span class="duel-diff">' + (r.winner === 'draw' ? 'unentschieden · ' : '') + 'Diff. ' + fmt(r.diff) + '</span>';
  }

  /** Knöpfe unter der zweiten Übung – in der Tab-Reihenfolge als Letztes im Duell. */
  function duelActions(r, duel, appKey, idx, locked) {
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '"';
    if (S.hasPendingCorrection(duel)) {
      var html = '<span class="changed">geändert – Tafel zeigt noch den alten Stand</span>';
      if (!locked) {
        html += '<button class="btn primary"' + attrs + ' data-action="reveal"' + (r.complete ? '' : ' disabled') + '>Korrektur anzeigen</button>' +
          '<button class="btn ghost" tabindex="-1"' + attrs + ' data-action="discard">Änderung verwerfen</button>';
      }
      return html;
    }
    if (duel.revealedAt) return '<span class="revealed">✓ auf Anzeigetafel</span>';
    if (locked) return '';
    return '<button class="btn primary reveal-btn"' + attrs + ' data-action="reveal"' + (r.complete ? '' : ' disabled') + '>Wertung anzeigen</button>';
  }

  function apparatusPanel(m, appKey) {
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
        sideHtml(m, appKey, i, order[0], d[order[0]], locked, 1) +
        sideHtml(m, appKey, i, order[1], d[order[1]], locked, 2) +
        '<div class="duel-result" data-out="duel-' + appKey + '-' + i + '">' + duelPoints(m, ar.duels[i]) + '</div>' +
        '<div class="duel-actions" data-out="duelact-' + appKey + '-' + i + '">' + duelActions(ar.duels[i], d, appKey, i, locked) + '</div>' +
        '</div>';
    }).join('');
    return '<div class="warmup-row"><button type="button" class="btn timer-btn warmup-btn" tabindex="-1" data-action="warmup-timer" data-app="' + appKey + '"' +
      (m.status === 'final' ? ' disabled' : '') + '>Einturnzeit (4:00) starten</button></div>' +
      '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(m, ar) + '</div></div>' + duels +
      '<p class="muted small">Eingabe mit Komma oder Punkt und einer Nachkommastelle, z. B. <code>4,8</code> oder <code>1.3</code>; Pfeiltasten ↑/↓ ändern den Wert in 0,1-Schritten. ' +
      (S.eJudgeCount(m.rules) === 3 ? 'E-Note = 10 − mittlerer der drei E-Abzüge (höchster und niedrigster gestrichen). ' : 'E-Note = 10 − Mittelwert der Abzüge E1 und E2. ') +
      'Endnote = D-Note + Standbonus + E-Note − neutraler Abzug; „Wertung 0,00“ gibt einem angetretenen Turner die Endnote 0. Der vorlegende Turner (1.) steht links bzw. oben. ' +
      'Die Scorepunkte eines Duells erscheinen auf der Anzeigetafel erst nach „Wertung anzeigen“. Jede Eingabe wird sofort gespeichert.</p>';
  }

  function appSumHtml(m, ar) {
    return 'Scorepunkte <strong>' + ptsPair(m, ar.homePoints, ar.guestPoints) + '</strong>' +
      (ar.complete ? ' · Gerätepunkte <strong>' + ar.homeApp + ':' + ar.guestApp + '</strong>' : ' · <span class="muted">noch nicht vollständig</span>');
  }

  /** Topscorer: die ersten drei Plätze, bei Gleichstand entsprechend mehr. */
  function scorersHtml(m) {
    var list = S.topScorers(m, 3);
    if (!list.length) return '<p class="muted">Noch keine Scorepunkte vergeben.</p>';
    return '<div class="table-wrap"><table class="table compact"><thead><tr><th>Platz</th><th>Turner</th><th>Mannschaft</th><th class="num">Scorepunkte</th></tr></thead><tbody>' +
      list.map(function (s) {
        return '<tr><td>' + s.rank + '.</td><td>' + esc(gymnastLabel(s.number, s.name) || '–') + '</td><td>' + esc(teamName(s.team === 'home' ? m.homeTeamId : m.guestTeamId)) + '</td>' +
          '<td class="num"><strong>' + pts(m, s.team, s.points) + '</strong></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /** Aktualisiert berechnete Werte, ohne Eingabefelder neu aufzubauen (Fokus bleibt erhalten). */
  function refreshComputed(m) {
    var r = S.matchResult(m);
    function out(key, html) {
      var el = $app.querySelector('[data-out="' + key + '"]');
      if (el) el.innerHTML = html;
    }
    out('score', ptsPair(m, r.homePoints, r.guestPoints, false, ' : '));
    out('app', r.homeApp + ':' + r.guestApp);
    out('winner', winnerText(m, r));
    out('status', statusBadge(m, r));
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      out('tab-' + a.key, ptsPair(m, ar.homePoints, ar.guestPoints));
      var tabBtn = $app.querySelector('.tab[data-tab="' + a.key + '"]');
      if (tabBtn) tabBtn.classList.toggle('complete', ar.complete);
    });
    var tab = currentTab(m);
    var ar = r.apparatus[tab];
    out('app-sum', appSumHtml(m, ar));
    out('pending', pendingBanner(m));
    m.apparatus[tab].duels.forEach(function (d, i) {
      out('duel-' + tab + '-' + i, duelPoints(m, ar.duels[i]));
      // Knöpfe nur neu aufbauen, wenn sich etwas ändert – sonst ginge ein Fokus darauf verloren.
      var act = $app.querySelector('[data-out="duelact-' + tab + '-' + i + '"]');
      var html = duelActions(ar.duels[i], d, tab, i, duelBlocked(m, tab, i));
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
    if (duelBlocked(m, appKey, idx)) { toast('Erst die nachträgliche Änderung auf der Anzeigetafel anzeigen.', 'error'); render(); return; }
    var pendingBefore = S.pendingCorrections(m).length;

    if (field === 'gymnast') {
      var tm = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
      var gy = tm && tm.gymnasts.filter(function (x) { return x.id === el.value; })[0];
      side.gymnastId = el.value || null;
      side.number = gy ? gy.number : null;
      side.name = gy ? gy.name : '';
      var viaKeyboard = lastInputKeyboard;
      el.blur();
      save('matches', m).then(function () {
        rerenderPanel(m);
        // Per Tastatur gleich mit der D-Note weitermachen; bei Touch nichts fokussieren (iOS).
        if (viaKeyboard) {
          var e1 = $app.querySelector('input[data-app="' + appKey + '"][data-duel="' + idx + '"][data-side="' + sideKey + '"][data-field="e1"]:not([disabled])');
          if (e1) e1.focus();
        }
      });
      return;
    }

    if (field === 'dns') {
      if (el.checked) {
        var hasData = side.gymnastId || side.d !== null || side.e1 !== null || side.e2 !== null || side.e3 !== null || side.nd || side.bonus || side.zero;
        if (hasData && !confirm('„Nicht angetreten“: Turner und bereits eingegebene Wertungen dieser Übung werden gelöscht. Fortfahren?')) { el.checked = false; return; }
        Object.assign(side, S.emptySide(), { dns: true });
      } else {
        side.dns = false;
      }
      save('matches', m).then(function () { rerenderPanel(m); });
      return;
    }

    if (field === 'zero') {
      side.zero = el.checked;
      save('matches', m).then(function () { rerenderPanel(m); });
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
    var latest = { at: '', appKey: null, idx: -1 };
    S.APPARATUS.forEach(function (a) {
      m.apparatus[a.key].duels.forEach(function (d, i) {
        var at = d[field] || (field === 'firstRevealedAt' ? d.revealedAt : null);
        if (at && at > latest.at) latest = { at: at, appKey: a.key, idx: i };
      });
    });
    return latest;
  }

  /** Gerät, das gerade läuft: das erste mit Eintragungen, aber noch nicht vollständig freigegeben. */
  function boardApparatus(m) {
    var current = null;
    var lastRevealed = null;
    S.APPARATUS.forEach(function (a) {
      var duels = m.apparatus[a.key].duels;
      var touched = duels.some(function (d) {
        return d.revealedAt || d.home.gymnastId || d.guest.gymnastId || S.sideFinal(d.home, m.rules) !== null || S.sideFinal(d.guest, m.rules) !== null;
      });
      var allRevealed = duels.every(function (d) { return d.revealedAt; });
      if (!current && touched && !allRevealed) current = a;
      if (duels.some(function (d) { return d.revealedAt; })) lastRevealed = a;
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
    return '<div class="cd-side" style="--team:' + c.onDark + '">' +
      '<div class="cd-name">' + esc(gymnastLabel(s.number, s.name) || '–') +
      (s.dns ? ' <span class="cd-tag">nicht angetreten</span>' : s.zero ? ' <span class="cd-tag">Wertung 0,00</span>' : '') + '</div>' +
      '<div class="cd-row"><span>D-Note' + (s.bonus && !out ? ' <small class="sb">+SB</small>' : '') + '</span><strong>' + cell(dText(s), p ? dText(p) : undefined) + '</strong></div>' +
      '<div class="cd-row"><span>E-Note</span><strong>' + cell(eText(s), p ? eText(p) : undefined) + '</strong></div>' +
      '<div class="cd-row nd' + (nd || ndBefore ? '' : ' empty') + '"><span>Neutr. Abzug</span><strong>' + cell(nd || '–', ndBefore === undefined ? undefined : (ndBefore || '–')) + '</strong></div>' +
      '<div class="cd-final' + (won ? ' win' : '') + '"><span>Endnote</span><strong>' +
      cell(fmt(S.sideFinal(s, m.rules)), p ? fmt(S.sideFinal(p, m.rules)) : undefined) + '</strong></div></div>';
  }

  /** Detailkarte des zuletzt geturnten Duells (nach einer Korrektur bleibt es beim letzten Duell). */
  function currentDuelCard(m, view) {
    var latest = latestPerformed(m);
    if (!latest.appKey) {
      // Gleiche Größe wie eine gefüllte Karte: Platzhalter unsichtbar, Hinweis darüber.
      return '<div class="cur-duel empty"><div class="cd-head">&nbsp;</div><div class="cd-grid">' +
        duelSideHtml(m, S.emptySide(), 'home', false) + '<div class="cd-pts">' + ptsPair(m, 0, 0, true) + '</div>' +
        duelSideHtml(m, S.emptySide(), 'guest', false) + '</div><div class="cd-empty">Noch keine Wertung angezeigt</div></div>';
    }
    var duel = view.apparatus[latest.appKey].duels[latest.idx];
    var res = S.duelResult(duel, m.rules);
    return '<div class="cur-duel"><div class="cd-head">' + apparatusName(latest.appKey) + ' · Duell ' + (latest.idx + 1) + '</div>' +
      '<div class="cd-grid">' + duelSideHtml(m, duel.home, 'home', res.winner === 'home') +
      '<div class="cd-pts">' + ptsPair(m, res.homePoints, res.guestPoints, true) + '</div>' +
      duelSideHtml(m, duel.guest, 'guest', res.winner === 'guest') + '</div></div>';
  }

  function boardOn(m) {
    return !(m.display && m.display.board === false);
  }

  function viewBoard(m) {
    if (!boardOn(m)) {
      return '<div class="board board-standby"><div class="board-bar"><a href="#/match/' + m.id + '" class="btn small ghost">← zurück</a>' +
        '<button class="btn small ghost" data-action="fullscreen">Vollbild</button></div>' +
        '<div class="standby"><img src="icons/icon.svg" alt="" width="120" height="120"><div>' + esc(LEAGUE) + '</div></div></div>';
    }
    var view = S.revealedView(m);
    var r = S.matchResult(view);
    var current = boardApparatus(m);
    var homeColor = sideColor(m, 'home').onDark, guestColor = sideColor(m, 'guest').onDark;
    var rows = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<tr class="' + (current && current.key === a.key ? 'current' : '') + '"><td>' + a.name + '</td>' +
        '<td class="num">' + (ar.started ? pts(m, 'home', ar.homePoints, true) : '–') + '</td><td class="num">' + (ar.started ? pts(m, 'guest', ar.guestPoints, true) : '–') + '</td>' +
        '<td class="num small">' + (ar.complete ? ar.homeApp + ':' + ar.guestApp : '') + '</td></tr>';
    }).join('');

    var detail = '';
    if (current) {
      var app = view.apparatus[current.key];
      var ar = r.apparatus[current.key];
      detail = '<div class="board-detail"><h3>' + current.name + '</h3><table class="board-duels">' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          return '<tr><td class="bn ' + (dr.winner === 'home' ? 'win' : '') + '" style="--team:' + homeColor + '">' + esc(gymnastLabel(d.home.number, d.home.name) || '–') + '</td>' +
            '<td class="num">' + (dr.home === null ? '' : fmt(dr.home)) + '</td>' +
            '<td class="num pts">' + (dr.complete ? ptsPair(m, dr.homePoints, dr.guestPoints, true, ' : ') : '') + '</td>' +
            '<td class="num">' + (dr.guest === null ? '' : fmt(dr.guest)) + '</td>' +
            '<td class="bn right ' + (dr.winner === 'guest' ? 'win' : '') + '" style="--team:' + guestColor + '">' + esc(gymnastLabel(d.guest.number, d.guest.name) || '–') + '</td></tr>';
        }).join('') + '</table></div>';
    }

    return '<div class="board">' +
      '<div class="board-bar"><a href="#/match/' + m.id + '" class="btn small ghost">← zurück</a>' +
      '<button class="btn small ghost" data-action="fullscreen">Vollbild</button></div>' +
      '<div class="board-title">' + esc([LEAGUE, fmtDate(m.date)].filter(Boolean).join(' · ') || 'Wettkampf') + '</div>' +
      '<div class="board-score">' +
      '<div class="board-team" style="color:' + homeColor + '">' + esc(teamName(m.homeTeamId)) + '</div>' +
      '<div class="board-big">' + ptsPair(m, r.homePoints, r.guestPoints, true) + '</div>' +
      '<div class="board-team" style="color:' + guestColor + '">' + esc(teamName(m.guestTeamId)) + '</div></div>' +
      '<div class="board-sub">Gerätepunkte ' + r.homeApp + ':' + r.guestApp + winnerText(m, r) + '</div>' +
      '<div id="board-timers" class="board-timers"><div class="bt warm off" data-slot="warm"><span>&nbsp;</span><strong>0:00</strong></div>' +
      '<div class="bt fall off" data-slot="fall"><span>&nbsp;</span><strong>0:00</strong><em>Abzug 0,3</em></div></div>' +
      '<div class="board-grid"><table class="board-table"><thead><tr><th>Gerät</th><th class="num">Heim</th><th class="num">Gast</th><th class="num">GP</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div>' + currentDuelCard(m, view) + detail + '</div></div>' +
      boardScorers(m, view) + '</div>';
  }

  /** Topscorer-Overlay auf der Tafel (nur angezeigte Wertungen), per Knopf ein-/ausschaltbar. */
  function boardScorers(m, view) {
    if (!(m.display && m.display.scorers)) return '';
    var list = S.topScorers(view, 3);
    return '<div class="scorer-overlay"><div class="so-box"><div class="so-title">Topscorer</div>' +
      (list.length ? '<table class="so-table">' + list.map(function (x) {
        return '<tr><td class="so-rank">' + x.rank + '.</td><td class="so-name">' + esc(gymnastLabel(x.number, x.name) || '–') +
          '<small>' + esc(teamName(x.team === 'home' ? m.homeTeamId : m.guestTeamId)) + '</small></td>' +
          '<td class="so-pts">' + pts(m, x.team, x.points, true) + '</td></tr>';
      }).join('') + '</table>' : '<div class="so-empty">Noch keine Scorepunkte</div>') + '</div></div>';
  }

  /** Anzeigetafel ohne Scrollbalken ins Fenster einpassen (misst die tatsächlich dargestellte Größe). */
  function fitBoard() {
    var b = document.querySelector('.board');
    if (!b || b.classList.contains('board-standby')) return;
    b.style.zoom = '';
    var z = 1;
    for (var i = 0; i < 6; i++) {
      var rect = b.getBoundingClientRect();
      var over = Math.max(rect.height / window.innerHeight, b.scrollWidth / b.clientWidth);
      if (over <= 1.001) break;
      z = z / over * 0.99;
      b.style.zoom = z;
    }
  }
  window.addEventListener('resize', fitBoard);

  /** Nach jedem Aufbau der Anzeigetafel prüfen, ob eine neue Wertung freigegeben wurde. */
  function checkBoardFlash(m) {
    var latest = latestReveal(m);
    if (state.board.matchId !== m.id) {
      // Beim Öffnen der Tafel keine bereits gezeigten Wertungen erneut einblenden.
      state.board = { matchId: m.id, lastReveal: latest.at };
      return;
    }
    if (!latest.at || latest.at <= state.board.lastReveal) return;
    state.board.lastReveal = latest.at;
    var raw = m.apparatus[latest.appKey].duels[latest.idx];
    var duel = S.revealedView(m).apparatus[latest.appKey].duels[latest.idx];
    var res = S.duelResult(duel, m.rules);
    if (!res.complete) return;
    if (raw.revealKind === 'correction') { showCorrection(m, latest.appKey, latest.idx, duel, raw.prevShown); return; }
    var points = res.winner === 'home' ? res.homePoints : res.winner === 'guest' ? res.guestPoints : 0;
    var color = res.winner === 'draw' ? '#a3a3a3' : sideColor(m, res.winner).onDark;
    showFlash(points, color);
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
    var el = document.getElementById('correction-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'correction-overlay';
      el.setAttribute('aria-live', 'assertive');
      document.body.appendChild(el);
    }
    el.innerHTML = '<div class="corr-box"><div class="corr-title">Korrektur</div>' +
      '<div class="cd-head">' + apparatusName(appKey) + ' · Duell ' + (idx + 1) + '</div>' +
      '<div class="cd-grid">' + col('home') +
      '<div class="cd-pts">' + (prevRes && prevRes.complete ? '<div class="corr-old">' + prevRes.homePoints + ' : ' + prevRes.guestPoints + '</div>' : '') +
      ptsPair(m, res.homePoints, res.guestPoints, true) + '</div>' + col('guest') + '</div></div>';
    el.classList.add('show');
    clearTimeout(correctionTimer);
    correctionTimer = setTimeout(function () { el.classList.remove('show'); }, CORRECTION_MS);
  }

  var flashTimer = null;

  /** Neue Scorepunkte 5 Sekunden bildschirmfüllend in der Mannschaftsfarbe zeigen. */
  function showFlash(points, color) {
    var el = document.getElementById('score-flash');
    if (!el) {
      el = document.createElement('div');
      el.id = 'score-flash';
      el.setAttribute('aria-live', 'assertive');
      el.innerHTML = '<span></span>';
      document.body.appendChild(el);
    }
    var num = el.firstChild;
    num.textContent = points;
    num.style.color = color;
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
    return { t: t, phase: phase, remaining: phase * FALL_PHASE_MS - el };
  }

  function warmupState(m) {
    var t = m && m.timers && m.timers.warmup;
    if (!t) return null;
    var el = Date.now() - t.start;
    if (el < 0 || el >= WARMUP_MS) return null;
    return { t: t, remaining: WARMUP_MS - el };
  }

  var WARMUP_END_MS = 10000, FALL_END_MS = 5000;

  /** Kurz nach regulärem Ablauf (nicht nach manuellem Stopp) zeigt die Tafel einen Hinweis. */
  function timerEnded(t, duration, showMs) {
    if (!t) return false;
    var el = Date.now() - t.start;
    return el >= duration && el < duration + showMs;
  }

  function clock(ms) {
    var sec = Math.ceil(ms / 1000);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function refreshDisplayButtons(m) {
    var b = $app.querySelector('[data-action="toggle-board"]');
    var on = boardOn(m) && state.boardWin && !state.boardWin.closed;
    if (b) { b.textContent = 'Anzeigetafel: ' + (on ? 'an' : 'aus'); b.classList.toggle('on', !!on); }
    var t = $app.querySelector('[data-action="toggle-scorers"]');
    var son = !!(m.display && m.display.scorers);
    if (t) { t.textContent = 'Topscorer auf Tafel: ' + (son ? 'an' : 'aus'); t.classList.toggle('on', son); }
  }

  function tickTimers() {
    var r = route();
    var m = r.name === 'match' ? match(r.id) : null;
    if (!m) return;
    var fall = fallState(m), warm = warmupState(m);
    $app.querySelectorAll('[data-action="fall-timer"]').forEach(function (btn) {
      var on = !!fall && fall.t.appKey === btn.getAttribute('data-app') && String(fall.t.idx) === btn.getAttribute('data-duel') && fall.t.side === btn.getAttribute('data-side');
      var label = on ? '⏱ ' + clock(fall.remaining) + (fall.phase === 2 ? ' · Abzug 0,3' : '') + ' – Stopp' : 'Sturz-Timer';
      if (btn.textContent !== label) btn.textContent = label;
      btn.classList.toggle('t-yellow', on && fall.phase === 1);
      btn.classList.toggle('t-red', on && fall.phase === 2);
    });
    var wb = $app.querySelector('[data-action="warmup-timer"]');
    if (wb) {
      var won = !!warm && warm.t.appKey === wb.getAttribute('data-app');
      var wl = won ? '⏱ Einturnzeit ' + clock(warm.remaining) + ' – Stopp' : 'Einturnzeit (4:00) starten';
      if (wb.textContent !== wl) wb.textContent = wl;
      wb.classList.toggle('t-running', won);
    }
    var bt = document.getElementById('board-timers');
    if (bt && bt.querySelector('[data-slot]')) {
      // Feste Plätze: Inhalt wird nur sichtbar/unsichtbar geschaltet, die Größe bleibt gleich.
      var ws = bt.querySelector('[data-slot="warm"]'), fs = bt.querySelector('[data-slot="fall"]');
      var wEnd = !warm && timerEnded(m.timers && m.timers.warmup, WARMUP_MS, WARMUP_END_MS);
      var wh = warm ? '<span>Einturnzeit ' + apparatusName(warm.t.appKey) + '</span><strong>' + clock(warm.remaining) + '</strong>'
        : wEnd ? '<span>' + apparatusName(m.timers.warmup.appKey) + '</span><strong>Einturnen beendet</strong>' : '<span>&nbsp;</span><strong>0:00</strong>';
      if (ws.innerHTML !== wh) ws.innerHTML = wh;
      ws.classList.toggle('off', !warm && !wEnd);
      ws.classList.toggle('ended', wEnd);
      var fh = '<span>&nbsp;</span><strong>0:00</strong><em>Abzug 0,3</em>';
      if (fall) {
        var fsd = m.apparatus[fall.t.appKey].duels[fall.t.idx][fall.t.side];
        fh = '<span>Sturz · ' + esc(gymnastLabel(fsd.number, fsd.name) || teamName(fall.t.side === 'home' ? m.homeTeamId : m.guestTeamId)) + '</span>' +
          '<strong>' + clock(fall.remaining) + '</strong><em' + (fall.phase === 2 ? '' : ' class="hide"') + '>Abzug 0,3</em>';
      }
      var fEnd = !fall && timerEnded(m.timers && m.timers.fall, 2 * FALL_PHASE_MS, FALL_END_MS);
      if (fEnd) {
        var fe = m.timers.fall, fed = m.apparatus[fe.appKey].duels[fe.idx][fe.side];
        fh = '<span>' + esc(gymnastLabel(fed.number, fed.name) || teamName(fe.side === 'home' ? m.homeTeamId : m.guestTeamId)) + '</span><strong>Übung beendet</strong><em class="hide">Abzug 0,3</em>';
      }
      if (fs.innerHTML !== fh) fs.innerHTML = fh;
      fs.classList.toggle('off', !fall && !fEnd);
      fs.classList.toggle('ended', fEnd);
      fs.classList.toggle('phase1', !!fall && fall.phase === 1);
      fs.classList.toggle('phase2', !!fall && fall.phase === 2);
    } else if (bt) {
      var html = '';
      if (warm) html += '<div class="bt warm"><span>Einturnzeit ' + apparatusName(warm.t.appKey) + '</span><strong>' + clock(warm.remaining) + '</strong></div>';
      if (fall) {
        var s = m.apparatus[fall.t.appKey].duels[fall.t.idx][fall.t.side];
        html += '<div class="bt fall phase' + fall.phase + '"><span>Sturz · ' + esc(gymnastLabel(s.number, s.name) || teamName(fall.t.side === 'home' ? m.homeTeamId : m.guestTeamId)) + '</span>' +
          '<strong>' + clock(fall.remaining) + '</strong>' + (fall.phase === 2 ? '<em>Abzug 0,3</em>' : '') + '</div>';
      }
      if (bt.innerHTML !== html) bt.innerHTML = html;
      bt.hidden = !html;
    }
  }

  setInterval(tickTimers, 250);

  // ---------- Ansicht: Protokoll ----------

  function viewPrint(m) {
    var r = S.matchResult(m);
    var three = S.eJudgeCount(m.rules) === 3;
    var head = ['D', 'SB', 'E1', 'E2'].concat(three ? ['E3'] : []).concat(['E', 'NA', 'End']);
    var j = m.judges || {}, cap = m.captains || {};
    var panel = '<div class="ps-panel"><div><strong>Kampfgericht:</strong> E1 (Oberkampfrichter) ' + esc(j.e1 || '–') +
      ' · E2 ' + (three ? '(Heim) ' : '(neutral) ') + esc(j.e2 || '–') + (three ? ' · E3 (Gast) ' + esc(j.e3 || '–') : '') +
      ' · D1 (Heim) ' + esc(j.d1 || '–') + ' · D2 (Gast) ' + esc(j.d2 || '–') + '</div>' +
      '<div><strong>Mannschaftsführer:</strong> Heim ' + esc(cap.home || '–') + ' · Gast ' + esc(cap.guest || '–') +
      ' · <strong>Beginn:</strong> ' + esc(teamName(m.startTeam === 'guest' ? m.guestTeamId : m.homeTeamId)) + '</div></div>';
    var apps = S.APPARATUS.map(function (a) {
      var app = m.apparatus[a.key];
      var ar = r.apparatus[a.key];
      return '<div class="print-app"><div class="pa-head"><strong>' + a.name + '</strong> <span>Scorepunkte ' + ptsPair(m, ar.homePoints, ar.guestPoints) +
        (ar.complete ? ' · Gerätepunkte ' + ar.homeApp + ':' + ar.guestApp : '') + '</span></div>' +
        '<table class="print-table"><thead><tr><th>Heim</th>' + head.map(function (h) { return '<th class="num">' + h + '</th>'; }).join('') +
        '<th class="num sp">SP</th>' + head.slice().reverse().map(function (h) { return '<th class="num">' + h + '</th>'; }).join('') + '<th class="right">Gast</th></tr></thead><tbody>' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          function cells(s, reverse) {
            var c = (s.dns || s.zero) ? head.map(function (h, n) { return n === 0 ? (s.dns ? 'n.a.' : 'W0') : ''; }) :
              [fmt1(s.d), s.bonus ? '0,1' : '', fmt1(s.e1), fmt1(s.e2)].concat(three ? [fmt1(s.e3)] : [])
                .concat([fmt(S.eScore(s, m.rules)), s.nd ? fmt1(s.nd) : '', '']);
            c[c.length - 1] = '<strong>' + fmt(S.sideFinal(s, m.rules)) + '</strong>';
            return (reverse ? c.reverse() : c).map(function (x) { return '<td class="num">' + x + '</td>'; }).join('');
          }
          var first = S.startOrder(m, a.key, i)[0];
          function nameCell(k, right) {
            var lead = first === k;
            return '<td class="pn' + (right ? ' right' : '') + (lead ? ' lead' : '') + '">' + (lead && !right ? '▶ ' : '') +
              esc(gymnastLabel(d[k].number, d[k].name) || '–') + (lead && right ? ' ◀' : '') + '</td>';
          }
          return '<tr>' + nameCell('home', false) + cells(d.home, false) +
            '<td class="num sp"><strong>' + (dr.complete ? ptsPair(m, dr.homePoints, dr.guestPoints) : '') + '</strong></td>' +
            cells(d.guest, true) + nameCell('guest', true) + '</tr>';
        }).join('') + '</tbody></table></div>';
    }).join('');

    var top = S.topScorers(m, 3);
    var scorerHtml = top.length ? '<table class="print-table scorer-table"><thead><tr><th>Platz</th><th>Turner</th><th>Mannschaft</th><th class="num">SP</th></tr></thead><tbody>' +
      top.map(function (x) {
        return '<tr><td>' + x.rank + '.</td><td class="pn">' + esc(gymnastLabel(x.number, x.name) || '–') + '</td><td>' + esc(teamName(x.team === 'home' ? m.homeTeamId : m.guestTeamId)) +
          '</td><td class="num"><strong>' + pts(m, x.team, x.points) + '</strong></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">–</p>';

    var th = m.rules.thresholds.slice().sort(function (a, b) { return a.min - b.min; })
      .map(function (t) { return 'ab ' + fmt(t.min) + ' → ' + t.points; }).join(', ');

    return '<div class="print-actions no-print"><a class="btn ghost" href="#/match/' + m.id + '">← zurück</a>' +
      '<button class="btn primary" data-action="print">Drucken / als PDF speichern</button></div>' +
      '<div class="print-page"><section class="print-sheet" id="print-sheet">' +
      '<div class="ps-head"><div><div class="ps-league">' + esc(LEAGUE) + '</div><h2>Wettkampfprotokoll</h2></div>' +
      '<div class="ps-meta">' + esc(teamName(m.homeTeamId)) + ' – ' + esc(teamName(m.guestTeamId)) + '<br>' + esc(fmtDate(m.date)) + '</div></div>' + panel +
      '<table class="print-summary"><thead><tr><th></th><th>Mannschaft</th><th class="num">Scorepunkte</th><th class="num">Gerätepunkte</th><th class="num">Punkte</th></tr></thead><tbody>' +
      '<tr><td>Heim</td><td>' + esc(teamName(m.homeTeamId)) + '</td><td class="num"><strong>' + pts(m, 'home', r.homePoints) + '</strong></td><td class="num">' + r.homeApp + '</td><td class="num">' + (r.complete ? r.homeMatch : '–') + '</td></tr>' +
      '<tr><td>Gast</td><td>' + esc(teamName(m.guestTeamId)) + '</td><td class="num"><strong>' + pts(m, 'guest', r.guestPoints) + '</strong></td><td class="num">' + r.guestApp + '</td><td class="num">' + (r.complete ? r.guestMatch : '–') + '</td></tr>' +
      '</tbody></table>' +
      '<p class="ps-result">' + (r.complete ? 'Ergebnis: <strong>' + (r.winner === 'draw' ? 'Unentschieden' : 'Sieg ' + esc(teamName(r.winner === 'home' ? m.homeTeamId : m.guestTeamId))) + '</strong>' : 'Wettkampf noch nicht vollständig gewertet.') + '</p>' +
      apps +
      '<div class="pa-head"><strong>Topscorer</strong></div>' + scorerHtml +
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

  // ---------- Ansicht: Daten & Regeln ----------

  function viewData() {
    var r = S.DEFAULT_RULES;
    return '<section class="card"><h2>Datensicherung</h2>' +
      '<p>Alle Daten liegen ausschließlich lokal auf diesem Gerät. Zusätzlich legt die App automatisch Sicherungspunkte an. ' +
      'Für Sicherheit gegen Geräteverlust bitte regelmäßig eine Sicherungsdatei exportieren (z. B. auf einen USB-Stick).</p>' +
      '<div id="data-storage" class="muted">wird geprüft …</div>' +
      '<h3>Exportieren</h3>' +
      '<div class="actions wrap"><button class="btn primary" data-action="export">Sicherung exportieren</button></div>' +
      '<p class="muted small">Die Sicherungsdatei (JSON) enthält alle Mannschaften, Turnernamen und Wettkämpfe.</p>' +
      '<h3>Importieren / Wiederherstellen</h3>' +
      '<form class="stack" data-form="import">' +
      '<input type="file" name="file" accept=".json,application/json" required>' +
      '<div class="actions"><button class="btn" type="submit">Importieren (ersetzt alle Daten)</button></div></form>' +
      '<p class="muted small">Vor jedem Import wird automatisch ein Sicherungspunkt des aktuellen Stands angelegt.</p>' +
      '<h3>Automatische Sicherungspunkte</h3><div id="snapshots" class="muted">wird geladen …</div>' +
      '</section>' +

      '<section class="card"><h2>Wertungsregeln</h2>' +
      '<p class="muted">Fest nach dem Scoresystem der ' + esc(LEAGUE || 'Liga') + ' – in der App nicht änderbar.</p>' +
      '<table class="table compact rules-table"><thead><tr><th>Notendifferenz</th><th class="num">Scorepunkte</th></tr></thead><tbody>' +
      '<tr><td>unter ' + fmt(r.thresholds[0].min) + '</td><td class="num">0 (unentschieden)</td></tr>' +
      r.thresholds.map(function (t, n) {
        var next = r.thresholds[n + 1];
        return '<tr><td>' + (next ? 'von ' + fmt(t.min) + ' bis ' + fmt(next.min - 50) : 'ab ' + fmt(t.min)) + '</td><td class="num">' + t.points + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<ul class="plain small muted"><li>' + r.duelsPerApparatus + ' Duelle pro Gerät; eine nicht besetzte Übung zählt 0 Punkte.</li>' +
      '<li>Gerät und Wettkampf gewinnt, wer mehr Scorepunkte hat; bei Gleichstand unentschieden.</li>' +
      '<li>E-Note: mit neutralem E2 10 − Mittelwert der Abzüge, mit drei E-Kampfrichtern 10 − mittlerer Abzug.</li>' +
      '<li>Standbonus +0,1 (nicht am Pauschenpferd).</li></ul></section>' +

      '<section class="card"><h2>Alle Daten löschen</h2>' +
      '<p class="muted">Löscht alle Wettkämpfe, Turnernamen und gewählten Farben auf diesem Gerät. Die festen Mannschaften bleiben bestehen. Ein Sicherungspunkt wird vorher angelegt.</p>' +
      '<button class="btn danger" data-action="wipe">Alle Daten löschen …</button></section>';
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
          return '<tr><td>' + esc(fmtDateTime(s.ts)) + '</td><td>' + esc(s.reason) + '</td><td class="num">' + s.teams + '</td><td class="num">' + s.matches + '</td>' +
            '<td><button class="btn small" data-action="restore" data-snap="' + s.id + '">Wiederherstellen</button> ' +
            '<button class="btn small ghost" data-action="export-snap" data-snap="' + s.id + '">Export</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    });
  }

  function validateBackup(data) {
    if (!data || data.format !== 'turnwettkampf-backup' || !Array.isArray(data.teams) || !Array.isArray(data.matches)) {
      throw new Error('Keine gültige WTB-Liga-Sicherungsdatei.');
    }
    data.matches.forEach(function (m) {
      if (!m.id || !m.apparatus || !m.rules) throw new Error('Sicherungsdatei enthält ungültige Wettkampfdaten.');
    });
    return data;
  }

  function restoreData(data, reason) {
    return takeSnapshot('vor ' + reason).then(function () {
      return DB.replaceAll({ teams: data.teams, matches: data.matches, meta: data.meta || [] });
    }).then(loadAll).then(function () {
      dirty = true;
      return takeSnapshot('nach ' + reason);
    }).then(function () {
      if (channel) channel.postMessage({ type: 'changed' });
      render();
    });
  }

  // ---------- Ereignisse ----------

  $app.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.dataset && el.dataset.picking) return; // erst mit Enter übernehmen
    if (el.hasAttribute('data-field')) { handleScoreChange(el); return; }
    if (el.name === 'neutralE2' && el.form) { syncJudgeFields(el.form); return; }
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
    }
  });

  var SCORE_FIELDS = ['d', 'e1', 'e2', 'e3', 'nd'];

  /** Reihenfolge wie mit der Tabulatortaste: Turner, Notenfelder, Standbonus – je Übung –, dann „Wertung anzeigen“. */
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
  document.addEventListener('keydown', function () { lastInputKeyboard = true; }, true);
  document.addEventListener('pointerdown', function () { lastInputKeyboard = false; }, true);

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
        validateBackup(data);
        if (!confirm('Import ersetzt alle aktuellen Daten durch ' + data.teams.length + ' Mannschaften und ' + data.matches.length + ' Wettkämpfe. Fortfahren?')) return;
        return restoreData(data, 'Import').then(function () { toast('Import erfolgreich'); });
      }).catch(function (e) { toast(e.message, 'error'); });
    }
  });

  $app.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var r = route();
    var m = r.id ? match(r.id) : null;

    switch (action) {
      case 'tab':
        state.ui.tab[m.id] = btn.getAttribute('data-tab');
        $app.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b === btn); });
        document.getElementById('apparatus-panel').innerHTML = apparatusPanel(m, currentTab(m));
        tickTimers();
        break;
      case 'finalize':
        if (S.pendingCorrections(m).length) { toast('Erst die nachträgliche Änderung auf der Anzeigetafel anzeigen.', 'error'); return; }
        var res = S.matchResult(m);
        if (!res.complete && !confirm('Es sind noch nicht alle Duelle gewertet. Trotzdem abschließen?')) return;
        m.status = 'final';
        save('matches', m).then(function () {
          takeSnapshot('Wettkampf abgeschlossen');
          render();
          toast('Wettkampf abgeschlossen');
          askYesNo('Sicherung erstellen?', 'Der Wettkampf ist abgeschlossen. Soll jetzt eine Sicherungsdatei erstellt werden?',
            'Hinweis: Alle Daten bleiben auch ohne diese Sicherung in der App auf diesem Gerät gespeichert.')
            .then(function (yes) { if (yes) exportBackup(m); });
        });
        break;
      case 'reopen':
        if (!confirm('Wettkampf wieder zur Bearbeitung öffnen?')) return;
        m.status = 'open';
        save('matches', m).then(render);
        break;
      case 'del-match':
        if (!confirm('Wettkampf vom ' + fmtDate(m.date) + ' (' + teamName(m.homeTeamId) + ' – ' + teamName(m.guestTeamId) + ') wirklich löschen?')) return;
        takeSnapshot('vor Löschen eines Wettkampfs').then(function () {
          state.matches = state.matches.filter(function (x) { return x.id !== m.id; });
          return remove('matches', m.id);
        }).then(function () { location.hash = '#/oberliga'; toast('Wettkampf gelöscht'); });
        break;
      case 'reveal':
        var duel = m && m.apparatus[btn.getAttribute('data-app')].duels[parseInt(btn.getAttribute('data-duel'), 10)];
        if (!duel || m.status === 'final') return;
        if (!S.duelResult(duel, m.rules).complete) { toast('Duell ist noch nicht vollständig gewertet.', 'error'); return; }
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
          toast(wasCorrection ? 'Korrektur wird auf der Anzeigetafel gezeigt' : 'Wertung wird auf der Anzeigetafel gezeigt');
        });
        break;
      case 'toggle-board':
        // Erstes Einschalten öffnet das Tafel-Fenster; danach wechselt die Tafel zwischen Anzeige und Ruhebild.
        m.display = m.display || {};
        var winOpen = state.boardWin && !state.boardWin.closed;
        if (!winOpen) {
          state.boardWin = window.open(location.href.split('#')[0] + '#/match/' + m.id + '/board', 'anzeigetafel-' + m.id);
          m.display.board = true;
        } else {
          m.display.board = !boardOn(m);
        }
        save('matches', m).then(function () { refreshDisplayButtons(m); });
        refreshDisplayButtons(m);
        break;
      case 'toggle-scorers':
        m.display = m.display || {};
        m.display.scorers = !m.display.scorers;
        save('matches', m).then(function () { refreshDisplayButtons(m); });
        refreshDisplayButtons(m);
        break;
      case 'fall-timer':
        if (!m || m.status === 'final') return;
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
        var wcur = warmupState(m);
        var wapp = btn.getAttribute('data-app');
        m.timers = m.timers || {};
        m.timers.warmup = wcur && wcur.t.appKey === wapp ? null : { appKey: wapp, start: Date.now() };
        save('matches', m).then(tickTimers);
        tickTimers();
        break;
      case 'discard':
        var dd = m && m.apparatus[btn.getAttribute('data-app')].duels[parseInt(btn.getAttribute('data-duel'), 10)];
        if (!dd || !dd.shown) return;
        if (!confirm('Änderung verwerfen und den angezeigten Stand wiederherstellen?')) return;
        ['home', 'guest'].forEach(function (k) {
          S.SHOWN_FIELDS.forEach(function (f) { dd[k][f] = dd.shown[k][f] === undefined ? null : dd.shown[k][f]; });
          dd[k].nd = dd[k].nd || 0;
          dd[k].bonus = !!dd[k].bonus;
          dd[k].zero = !!dd[k].zero;
          dd[k].dns = !!dd[k].dns;
          var tm = team(k === 'home' ? m.homeTeamId : m.guestTeamId);
          var g = tm && tm.gymnasts.filter(function (x) { return x.id === dd[k].gymnastId; })[0];
          dd[k].number = g ? g.number : dd.shown[k].number;
          dd[k].name = g ? g.name : dd.shown[k].name;
        });
        save('matches', m).then(function () { rerenderPanel(m); toast('Änderung verworfen'); });
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
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
      case 'export-snap':
        DB.getSnapshot(parseInt(btn.getAttribute('data-snap'), 10)).then(function (s) {
          if (s) download('wtb-oberliga-sicherungspunkt-' + s.id + '.json', JSON.stringify(s.data, null, 2));
        });
        break;
      case 'restore':
        DB.getSnapshot(parseInt(btn.getAttribute('data-snap'), 10)).then(function (s) {
          if (!s) return;
          if (!confirm('Stand vom ' + fmtDateTime(s.ts) + ' wiederherstellen? Der aktuelle Stand wird vorher gesichert.')) return;
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
  if (versionEl) versionEl.textContent = 'Version ' + APP_BUILD;

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
