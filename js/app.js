/* Turnwettkampf – Oberfläche und Ablaufsteuerung */
(function () {
  'use strict';

  var S = window.Scoring;
  var DB = window.DB;
  var SB = window.SecureBackup;
  var CFG = window.TEAM_CONFIG;
  var APP_VERSION = 2;
  var FLASH_MS = 5000;
  var CORRECTION_MS = 10000;
  var LEAGUE = CFG.league || '';

  // Feste Mannschaftsfarben; "onDark" ist der hellere Ton für die dunkle Anzeigetafel.
  var COLORS = [
    { key: 'rot', name: 'Rot', hex: '#d32f2f', onDark: '#ff5a5a', fg: '#fff' },
    { key: 'blau', name: 'Blau', hex: '#1e63c6', onDark: '#5b9bff', fg: '#fff' },
    { key: 'orange', name: 'Orange', hex: '#f07c00', onDark: '#ff9a2e', fg: '#171717' },
    { key: 'hellgrau', name: 'Hellgrau', hex: '#c8c8c8', onDark: '#dcdcdc', fg: '#171717' },
    { key: 'violett', name: 'Violett', hex: '#7b3fa0', onDark: '#b884e3', fg: '#fff' },
    { key: 'gelb', name: 'Gelb', hex: '#f5c400', onDark: '#ffd60a', fg: '#171717' }
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

  var fmt = S.formatScore;

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
      var gymnasts = [];
      for (var n = 1; n <= CFG.gymnastsPerTeam; n++) {
        var old = (s.gymnasts || []).filter(function (g) { return g.number === n; })[0];
        gymnasts.push({ id: c.id + '-' + n, number: n, name: old ? old.name : '' });
      }
      return { id: c.id, name: c.name, gymnasts: gymnasts };
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
        });
      });
    });
    if (!m.colors) { m.colors = { home: DEFAULT_COLORS.home, guest: DEFAULT_COLORS.guest }; changed = true; }
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
    return { name: parts[0] || 'home', id: parts[1], sub: parts[2] };
  }

  var keepScroll = false;

  function render() {
    var r = route();
    document.body.classList.toggle('board-mode', r.name === 'match' && r.sub === 'board');
    document.querySelectorAll('.topbar nav a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === r.name);
    });
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
      default: html = viewHome();
    }
    $app.innerHTML = (state.persistent ? '' : warningBanner()) + html;
    if (r.name === 'data') refreshDataView();
    if (r.name === 'match' && r.sub === 'print') fitPrintToA4();
    if (r.name === 'home') refreshStorageBox();
    var isBoard = r.name === 'match' && r.sub === 'board' && match(r.id);
    if (isBoard) checkBoardFlash(match(r.id));
    else state.board = { matchId: null, lastReveal: '' };
    if (!keepScroll) window.scrollTo(0, 0);
    keepScroll = false;
  }

  function warningBanner() {
    return '<div class="banner danger">⚠ Der Browser erlaubt hier keine dauerhafte Speicherung (z. B. privater Modus). ' +
      'Daten gehen beim Schließen verloren – bitte regelmäßig unter „Daten“ exportieren.</div>';
  }

  function notFound() {
    return '<section class="card"><h2>Nicht gefunden</h2><p>Dieser Wettkampf existiert nicht (mehr).</p><a class="btn" href="#/">Zur Übersicht</a></section>';
  }

  // ---------- Ansicht: Übersicht ----------

  function viewHome() {
    var list = state.matches.length ? state.matches.map(function (m) {
      var r = S.matchResult(m);
      return '<a class="match-row" href="#/match/' + m.id + '">' +
        '<div><div class="match-title">' + esc(m.title || 'Wettkampf') + '</div>' +
        '<div class="muted">' + esc(fmtDate(m.date)) + '</div></div>' +
        '<div class="match-teams">' + teamTag(m, 'home') + ' <span class="muted">vs.</span> ' + teamTag(m, 'guest') + '</div>' +
        '<div class="match-score">' + r.homePoints + ':' + r.guestPoints + '</div>' +
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
    var rules = m ? m.rules : state.settings.rules;
    var hasScores = m && S.APPARATUS.some(function (a) { return S.matchResult(m).apparatus[a.key].started; });
    return '<section class="card narrow"><h2>' + (isNew ? 'Neuer Wettkampf' : 'Wettkampf bearbeiten') + '</h2>' +
      '<form data-form="match" data-id="' + (m ? m.id : '') + '" class="stack">' +
      '<div class="row2"><label>Bezeichnung<input type="text" name="title" value="' + esc(m ? m.title : '') + '" placeholder="z. B. 3. Wettkampftag"></label>' +
      '<label>Datum<input type="date" name="date" value="' + esc(m ? m.date : new Date().toISOString().slice(0, 10)) + '"></label></div>' +
      '<div class="row2"><label>Heimmannschaft<select name="home" required' + (hasScores ? ' disabled' : '') + '>' + teamOptions(m && m.homeTeamId) + '</select></label>' +
      '<label>Gastmannschaft<select name="guest" required' + (hasScores ? ' disabled' : '') + '>' + teamOptions(m && m.guestTeamId) + '</select></label></div>' +
      '<div class="row2">' + colorPicker('homeColor', 'Farbe Heim', m ? sideColor(m, 'home').key : DEFAULT_COLORS.home) +
      colorPicker('guestColor', 'Farbe Gast', m ? sideColor(m, 'guest').key : DEFAULT_COLORS.guest) + '</div>' +
      '<label>Duelle pro Gerät<input type="number" name="duels" min="1" max="10" value="' + rules.duelsPerApparatus + '"></label>' +
      (isNew ? '<p class="muted small">Die Wertungsregeln (Scorepunkte-Schwellen usw.) werden aus den Standardregeln unter „Daten“ übernommen und gelten dann fest für diesen Wettkampf.</p>' : '') +
      '<div class="actions"><button class="btn primary" type="submit">' + (isNew ? 'Anlegen' : 'Speichern') + '</button>' +
      '<a class="btn ghost" href="' + (m ? '#/match/' + m.id : '#/') + '">Abbrechen</a></div>' +
      '</form></section>';
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
    var duels = Math.max(1, Math.min(10, parseInt(fd.get('duels'), 10) || 4));
    var m = id ? match(id) : null;
    var home = m && form.home.disabled ? m.homeTeamId : fd.get('home');
    var guest = m && form.guest.disabled ? m.guestTeamId : fd.get('guest');
    if (!home || !guest) { toast('Bitte beide Mannschaften wählen.', 'error'); return; }
    if (home === guest) { toast('Heim- und Gastmannschaft müssen verschieden sein.', 'error'); return; }
    var colors = { home: fd.get('homeColor') || DEFAULT_COLORS.home, guest: fd.get('guestColor') || DEFAULT_COLORS.guest };
    if (colors.home === colors.guest) { toast('Heim und Gast brauchen verschiedene Farben.', 'error'); return; }

    if (!m) {
      var rules = S.clone(state.settings.rules);
      rules.duelsPerApparatus = duels;
      m = {
        id: uid(), title: '', date: '', homeTeamId: home, guestTeamId: guest,
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
    m.title = String(fd.get('title') || '').trim();
    m.date = fd.get('date') || '';
    save('matches', m).then(function () { location.hash = '#/match/' + m.id; });
  }

  function sideUsed(s) {
    return !!(s.gymnastId || s.name || s.d !== null || s.e1 !== null || s.e2 !== null || s.dns);
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
      return '<button class="tab' + (a.key === tab ? ' active' : '') + (ar.complete ? ' complete' : '') + '" data-action="tab" data-tab="' + a.key + '">' +
        '<span>' + a.name + '</span><span class="tab-score" data-out="tab-' + a.key + '">' + ar.homePoints + ':' + ar.guestPoints + '</span></button>';
    }).join('');

    return '<section class="card match-head">' +
      '<div class="match-meta"><h2>' + esc(m.title || 'Wettkampf') + '</h2>' +
      '<div class="muted">' + (LEAGUE ? esc(LEAGUE) + ' · ' : '') + esc(fmtDate(m.date)) + ' · <span data-out="status">' + statusBadge(m, r) + '</span></div></div>' +
      '<div class="scoreline">' +
      '<div class="team home"><div class="label">Heim</div><div class="name">' + teamTag(m, 'home') + '</div></div>' +
      '<div class="big" data-out="score">' + r.homePoints + ' : ' + r.guestPoints + '</div>' +
      '<div class="team guest"><div class="label">Gast</div><div class="name">' + teamTag(m, 'guest') + '</div></div>' +
      '</div>' +
      '<div class="subscore">Gerätepunkte <strong data-out="app">' + r.homeApp + ':' + r.guestApp + '</strong> · Notensumme <span data-out="sum">' + fmt(r.homeSum) + ' : ' + fmt(r.guestSum) + '</span>' +
      '<span data-out="winner">' + winnerText(m, r) + '</span></div>' +
      '<div class="actions wrap">' +
      '<a class="btn" href="#/match/' + m.id + '/board" target="_blank" rel="noopener">Anzeigetafel ↗</a>' +
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
      '<section class="card"><h3>Scorer-Wertung</h3><div data-out="scorers">' + scorersHtml(m) + '</div></section>';
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
      opts += '<option value="' + g.id + '"' + (g.id === side.gymnastId ? ' selected' : '') + (used[g.id] ? ' disabled' : '') + '>' +
        esc(gymnastLabel(g.number, g.name || '(ohne Name)')) + (used[g.id] ? ' (bereits eingesetzt)' : '') + '</option>';
    });
    if (side.gymnastId && !found) opts += '<option value="' + esc(side.gymnastId) + '" selected>' + esc(gymnastLabel(side.number, side.name)) + '</option>';
    return '<select ' + fieldAttrs(appKey, idx, sideKey, 'gymnast') + (locked ? ' disabled' : '') + ' aria-label="Turner">' + opts + '</select>';
  }

  function fieldAttrs(appKey, idx, sideKey, field) {
    return 'data-app="' + appKey + '" data-duel="' + idx + '" data-side="' + sideKey + '" data-field="' + field + '"';
  }

  function scoreInput(appKey, idx, sideKey, field, value, locked, label) {
    var v = value === null || value === undefined ? '' : fmt(value);
    if (field === 'nd' && !value) v = '';
    return '<label class="score-field"><span>' + label + '</span>' +
      '<input type="text" inputmode="decimal" autocomplete="off" ' + fieldAttrs(appKey, idx, sideKey, field) +
      ' value="' + esc(v) + '" placeholder="' + (field === 'nd' ? '0,0' : '') + '"' + (locked ? ' disabled' : '') + '></label>';
  }

  function sideHtml(m, appKey, idx, sideKey, side, locked) {
    var dis = locked || side.dns;
    var color = sideColor(m, sideKey);
    var key = appKey + '-' + idx + '-' + sideKey;
    return '<div class="side ' + sideKey + (side.dns ? ' dns' : '') + '" style="--team:' + color.hex + ';--team-fg:' + color.fg + '">' +
      '<div class="side-head"><span class="side-label">' + (sideKey === 'home' ? 'Heim' : 'Gast') + '</span>' +
      gymnastSelect(m, appKey, idx, sideKey, side, locked) + '</div>' +
      '<div class="score-row">' +
      scoreInput(appKey, idx, sideKey, 'd', side.d, dis, 'D-Note') +
      scoreInput(appKey, idx, sideKey, 'e1', side.e1, dis, 'E-Abzug 1') +
      scoreInput(appKey, idx, sideKey, 'e2', side.e2, dis, 'E-Abzug 2') +
      scoreInput(appKey, idx, sideKey, 'nd', side.nd, dis, 'Neutr. Abzug') +
      '</div>' +
      '<div class="result-row"><span>E-Note <strong data-out="enote-' + key + '">' + fmt(S.eScore(side)) + '</strong></span>' +
      '<span class="final">Endnote <strong data-out="final-' + key + '">' + fmt(S.sideFinal(side)) + '</strong></span></div>' +
      '<label class="check"><input type="checkbox" ' + fieldAttrs(appKey, idx, sideKey, 'dns') + (side.dns ? ' checked' : '') + (locked ? ' disabled' : '') + '> nicht angetreten / nicht besetzt (0,000)</label>' +
      '</div>';
  }

  function duelBadge(r, duel, appKey, idx, locked) {
    var attrs = ' data-app="' + appKey + '" data-duel="' + idx + '"';
    var pending = S.hasPendingCorrection(duel);
    var html = !r.complete ? '<span class="duel-open">offen</span>' :
      '<span class="duel-pts ' + (r.winner === 'home' ? 'win' : '') + '">' + r.homePoints + '</span>' +
      '<span class="duel-sep">:</span>' +
      '<span class="duel-pts ' + (r.winner === 'guest' ? 'win' : '') + '">' + r.guestPoints + '</span>' +
      '<span class="duel-diff">Diff. ' + fmt(r.diff) + '</span>';
    if (pending) {
      html += '<span class="changed">geändert – Tafel zeigt noch den alten Stand</span>';
      if (!locked) {
        html += '<button class="btn small primary"' + attrs + ' data-action="reveal"' + (r.complete ? '' : ' disabled') + '>Korrektur anzeigen</button>' +
          '<button class="btn small ghost"' + attrs + ' data-action="discard">Änderung verwerfen</button>';
      }
    } else if (duel.revealedAt) {
      html += '<span class="revealed">✓ auf Anzeigetafel</span>';
    } else if (r.complete && !locked) {
      html += '<button class="btn small primary reveal-btn"' + attrs + ' data-action="reveal">Wertung anzeigen</button>';
    }
    return html;
  }

  function apparatusPanel(m, appKey) {
    var a = S.APPARATUS.filter(function (x) { return x.key === appKey; })[0];
    var app = m.apparatus[appKey];
    var ar = S.apparatusResult(app, m.rules);
    var duels = app.duels.map(function (d, i) {
      var locked = duelBlocked(m, appKey, i);
      var cls = 'duel' + (S.hasPendingCorrection(d) ? ' pending' : '') + (locked && m.status !== 'final' ? ' blocked' : '');
      return '<div class="' + cls + '">' +
        '<div class="duel-no">Duell ' + (i + 1) + '</div>' +
        sideHtml(m, appKey, i, 'home', d.home, locked) +
        '<div class="duel-result" data-out="duel-' + appKey + '-' + i + '">' + duelBadge(ar.duels[i], d, appKey, i, locked) + '</div>' +
        sideHtml(m, appKey, i, 'guest', d.guest, locked) +
        '</div>';
    }).join('');
    return '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(ar) + '</div></div>' + duels +
      '<p class="muted small">Eingabe mit Komma oder Punkt, z. B. <code>4,8</code> oder <code>1.35</code>. E-Note = 10 − Mittelwert der beiden E-Abzüge; Endnote = D-Note + E-Note − neutraler Abzug. ' +
      'Die Scorepunkte eines Duells erscheinen auf der Anzeigetafel erst nach „Wertung anzeigen“. Jede Eingabe wird sofort gespeichert.</p>';
  }

  function appSumHtml(ar) {
    return 'Scorepunkte <strong>' + ar.homePoints + ':' + ar.guestPoints + '</strong>' +
      (ar.complete ? ' · Gerätepunkte <strong>' + ar.homeApp + ':' + ar.guestApp + '</strong>' : ' · <span class="muted">noch nicht vollständig</span>');
  }

  function scorersHtml(m) {
    var list = S.scorers(m);
    if (!list.length) return '<p class="muted">Noch keine Turner eingesetzt.</p>';
    return '<div class="table-wrap"><table class="table compact"><thead><tr><th>#</th><th>Turner</th><th>Mannschaft</th><th class="num">Starts</th><th class="num">Siege</th><th class="num">Scorepunkte</th></tr></thead><tbody>' +
      list.map(function (s, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(gymnastLabel(s.number, s.name) || '–') + '</td><td>' + esc(teamName(s.team === 'home' ? m.homeTeamId : m.guestTeamId)) + '</td>' +
          '<td class="num">' + s.starts + '</td><td class="num">' + s.wins + '</td><td class="num"><strong>' + s.points + '</strong></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /** Aktualisiert berechnete Werte, ohne Eingabefelder neu aufzubauen (Fokus bleibt erhalten). */
  function refreshComputed(m) {
    var r = S.matchResult(m);
    function out(key, html) {
      var el = $app.querySelector('[data-out="' + key + '"]');
      if (el) el.innerHTML = html;
    }
    out('score', r.homePoints + ' : ' + r.guestPoints);
    out('app', r.homeApp + ':' + r.guestApp);
    out('sum', fmt(r.homeSum) + ' : ' + fmt(r.guestSum));
    out('winner', winnerText(m, r));
    out('status', statusBadge(m, r));
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      out('tab-' + a.key, ar.homePoints + ':' + ar.guestPoints);
      var tabBtn = $app.querySelector('.tab[data-tab="' + a.key + '"]');
      if (tabBtn) tabBtn.classList.toggle('complete', ar.complete);
    });
    var tab = currentTab(m);
    var ar = r.apparatus[tab];
    out('app-sum', appSumHtml(ar));
    out('pending', pendingBanner(m));
    m.apparatus[tab].duels.forEach(function (d, i) {
      out('duel-' + tab + '-' + i, duelBadge(ar.duels[i], d, tab, i, duelBlocked(m, tab, i)));
      ['home', 'guest'].forEach(function (k) {
        out('enote-' + tab + '-' + i + '-' + k, fmt(S.eScore(d[k])));
        out('final-' + tab + '-' + i + '-' + k, fmt(S.sideFinal(d[k])));
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
      save('matches', m).then(function () { rerenderPanel(m); });
      return;
    }

    if (field === 'dns') {
      side.dns = el.checked;
      save('matches', m).then(function () { rerenderPanel(m); });
      return;
    }

    var v = S.parseScore(el.value);
    if (field === 'nd' && v === null) v = 0;
    var isDeduction = field === 'e1' || field === 'e2';
    var max = field === 'd' ? 20000 : 10000;
    var invalid = Number.isNaN(v) || v > max || (isDeduction && v !== null && v % 10 !== 0);
    if (invalid) {
      el.classList.add('invalid');
      toast(isDeduction ? 'Ungültiger E-Abzug: „' + el.value + '“ (0 bis 10, höchstens 2 Nachkommastellen, z. B. 1,35)'
        : 'Ungültige Note: „' + el.value + '“ (Format z. B. 4,8)', 'error');
      return;
    }
    el.classList.remove('invalid');
    side[field] = v;
    if (v !== null && !(field === 'nd' && v === 0)) el.value = fmt(v);
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
    restoreFocus(focusKey);
  }

  function focusKeyOf(el) {
    if (!el || !el.getAttribute || !el.getAttribute('data-field')) return null;
    return ['data-app', 'data-duel', 'data-side', 'data-field'].map(function (a) { return '[' + a + '="' + el.getAttribute(a) + '"]'; }).join('');
  }

  function restoreFocus(key) {
    if (!key) return;
    var el = $app.querySelector(key);
    if (el) el.focus();
  }

  // ---------- Ansicht: Anzeigetafel ----------

  function latestReveal(m) {
    var latest = { at: '', appKey: null, idx: -1 };
    S.APPARATUS.forEach(function (a) {
      m.apparatus[a.key].duels.forEach(function (d, i) {
        if (d.revealedAt && d.revealedAt > latest.at) latest = { at: d.revealedAt, appKey: a.key, idx: i };
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
        return d.revealedAt || d.home.gymnastId || d.guest.gymnastId || S.sideFinal(d.home) !== null || S.sideFinal(d.guest) !== null;
      });
      var allRevealed = duels.every(function (d) { return d.revealedAt; });
      if (!current && touched && !allRevealed) current = a;
      if (duels.some(function (d) { return d.revealedAt; })) lastRevealed = a;
    });
    return current || lastRevealed;
  }

  /** Detailkarte des zuletzt angezeigten Duells: D-Note, E-Note, neutrale Abzüge, Endnote. */
  function currentDuelCard(m, view) {
    var latest = latestReveal(m);
    if (!latest.appKey) return '<div class="cur-duel empty">Noch keine Wertung angezeigt</div>';
    var duel = view.apparatus[latest.appKey].duels[latest.idx];
    var res = S.duelResult(duel, m.rules);
    function col(sideKey) {
      var s = duel[sideKey];
      var c = sideColor(m, sideKey);
      var won = res.winner === sideKey;
      var lines = s.dns ? '<div class="cd-dns">nicht angetreten</div>' :
        '<div class="cd-row"><span>D-Note</span><strong>' + fmt(s.d) + '</strong></div>' +
        '<div class="cd-row"><span>E-Note</span><strong>' + fmt(S.eScore(s)) + '</strong></div>' +
        (s.nd ? '<div class="cd-row nd"><span>Neutr. Abzug</span><strong>−' + fmt(s.nd) + '</strong></div>' : '');
      return '<div class="cd-side" style="--team:' + c.onDark + '">' +
        '<div class="cd-name">' + esc(gymnastLabel(s.number, s.name) || '–') + '</div>' + lines +
        '<div class="cd-final' + (won ? ' win' : '') + '"><span>Endnote</span><strong>' + fmt(S.sideFinal(s)) + '</strong></div></div>';
    }
    return '<div class="cur-duel"><div class="cd-head">' + apparatusName(latest.appKey) + ' · Duell ' + (latest.idx + 1) + '</div>' +
      '<div class="cd-grid">' + col('home') +
      '<div class="cd-pts">' + res.homePoints + '<span>:</span>' + res.guestPoints + '</div>' +
      col('guest') + '</div></div>';
  }

  function viewBoard(m) {
    var view = S.revealedView(m);
    var r = S.matchResult(view);
    var current = boardApparatus(m);
    var homeColor = sideColor(m, 'home').onDark, guestColor = sideColor(m, 'guest').onDark;
    var rows = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<tr class="' + (current && current.key === a.key ? 'current' : '') + '"><td>' + a.name + '</td>' +
        '<td class="num">' + (ar.started ? ar.homePoints : '–') + '</td><td class="num">' + (ar.started ? ar.guestPoints : '–') + '</td>' +
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
            '<td class="num pts">' + (dr.complete ? dr.homePoints + ' : ' + dr.guestPoints : '') + '</td>' +
            '<td class="num">' + (dr.guest === null ? '' : fmt(dr.guest)) + '</td>' +
            '<td class="bn right ' + (dr.winner === 'guest' ? 'win' : '') + '" style="--team:' + guestColor + '">' + esc(gymnastLabel(d.guest.number, d.guest.name) || '–') + '</td></tr>';
        }).join('') + '</table></div>';
    }

    return '<div class="board">' +
      '<div class="board-bar"><a href="#/match/' + m.id + '" class="btn small ghost">← zurück</a>' +
      '<button class="btn small ghost" data-action="fullscreen">Vollbild</button></div>' +
      '<div class="board-title">' + esc([LEAGUE, m.title].filter(Boolean).join(' · ') || 'Wettkampf') + '</div>' +
      '<div class="board-score">' +
      '<div class="board-team" style="color:' + homeColor + '">' + esc(teamName(m.homeTeamId)) + '</div>' +
      '<div class="board-big">' + r.homePoints + '<span>:</span>' + r.guestPoints + '</div>' +
      '<div class="board-team" style="color:' + guestColor + '">' + esc(teamName(m.guestTeamId)) + '</div></div>' +
      '<div class="board-sub">Gerätepunkte ' + r.homeApp + ':' + r.guestApp + winnerText(m, r) + '</div>' +
      '<div class="board-grid"><table class="board-table"><thead><tr><th>Gerät</th><th class="num">Heim</th><th class="num">Gast</th><th class="num">GP</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div>' + currentDuelCard(m, view) + detail + '</div></div></div>';
  }

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
    function val(label, now, before, cls) {
      var changed = before !== undefined && before !== now;
      return '<div class="cd-row ' + (cls || '') + '"><span>' + label + '</span><strong>' +
        (changed ? '<s>' + before + '</s> ' : '') + now + '</strong></div>';
    }
    function col(sideKey) {
      var s = duel[sideKey];
      var p = prev ? Object.assign(S.emptySide(), prev[sideKey]) : null;
      var c = sideColor(m, sideKey);
      var nd = function (x) { return x.nd ? '−' + fmt(x.nd) : '–'; };
      var body = s.dns ? '<div class="cd-dns">nicht angetreten</div>' :
        val('D-Note', fmt(s.d), p && !p.dns ? fmt(p.d) : undefined) +
        val('E-Note', fmt(S.eScore(s)), p && !p.dns ? fmt(S.eScore(p)) : undefined) +
        ((s.nd || (p && p.nd)) ? val('Neutr. Abzug', nd(s), p ? nd(p) : undefined, 'nd') : '');
      return '<div class="cd-side" style="--team:' + c.onDark + '">' +
        '<div class="cd-name">' + esc(gymnastLabel(s.number, s.name) || '–') + '</div>' + body +
        '<div class="cd-final' + (res.winner === sideKey ? ' win' : '') + '"><span>Endnote</span><strong>' +
        (p && fmt(S.sideFinal(p)) !== fmt(S.sideFinal(s)) ? '<s>' + fmt(S.sideFinal(p)) + '</s> ' : '') + fmt(S.sideFinal(s)) + '</strong></div></div>';
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
      res.homePoints + '<span>:</span>' + res.guestPoints + '</div>' + col('guest') + '</div></div>';
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

  // ---------- Ansicht: Protokoll ----------

  function viewPrint(m) {
    var r = S.matchResult(m);
    var apps = S.APPARATUS.map(function (a) {
      var app = m.apparatus[a.key];
      var ar = r.apparatus[a.key];
      return '<div class="print-app"><div class="pa-head"><strong>' + a.name + '</strong> <span>Scorepunkte ' + ar.homePoints + ':' + ar.guestPoints +
        (ar.complete ? ' · Gerätepunkte ' + ar.homeApp + ':' + ar.guestApp : '') + '</span></div>' +
        '<table class="print-table"><thead><tr><th>Heim</th><th class="num">D</th><th class="num">EA1</th><th class="num">EA2</th><th class="num">E</th><th class="num">NA</th><th class="num">End</th>' +
        '<th class="num sp">SP</th><th class="num">End</th><th class="num">NA</th><th class="num">E</th><th class="num">EA2</th><th class="num">EA1</th><th class="num">D</th><th class="right">Gast</th></tr></thead><tbody>' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          function cells(s, reverse) {
            var c = s.dns ? ['n.a.', '', '', '', '', ''] : [fmt(s.d), fmt(s.e1), fmt(s.e2), fmt(S.eScore(s)), s.nd ? fmt(s.nd) : '', ''];
            c[5] = '<strong>' + fmt(S.sideFinal(s)) + '</strong>';
            return (reverse ? c.reverse() : c).map(function (x) { return '<td class="num">' + x + '</td>'; }).join('');
          }
          return '<tr><td class="pn">' + esc(gymnastLabel(d.home.number, d.home.name) || '–') + '</td>' + cells(d.home, false) +
            '<td class="num sp"><strong>' + (dr.complete ? dr.homePoints + ':' + dr.guestPoints : '') + '</strong></td>' +
            cells(d.guest, true) + '<td class="pn right">' + esc(gymnastLabel(d.guest.number, d.guest.name) || '–') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }).join('');

    var scorers = S.scorers(m).filter(function (x) { return x.starts > 0; });
    function scorerTable(sideKey) {
      var list = scorers.filter(function (x) { return x.team === sideKey; });
      return '<table class="print-table scorer-table"><thead><tr><th>' + esc(teamName(sideKey === 'home' ? m.homeTeamId : m.guestTeamId)) + '</th>' +
        '<th class="num">Starts</th><th class="num">Siege</th><th class="num">SP</th></tr></thead><tbody>' +
        (list.length ? list.map(function (x) {
          return '<tr><td class="pn">' + esc(gymnastLabel(x.number, x.name) || '–') + '</td><td class="num">' + x.starts + '</td><td class="num">' + x.wins + '</td><td class="num"><strong>' + x.points + '</strong></td></tr>';
        }).join('') : '<tr><td colspan="4">–</td></tr>') + '</tbody></table>';
    }
    var scorerHtml = '<div class="print-scorers">' + scorerTable('home') + scorerTable('guest') + '</div>';

    var th = m.rules.thresholds.slice().sort(function (a, b) { return a.min - b.min; })
      .map(function (t) { return 'ab ' + fmt(t.min) + ' → ' + t.points; }).join(', ');

    return '<div class="print-actions no-print"><a class="btn ghost" href="#/match/' + m.id + '">← zurück</a>' +
      '<button class="btn primary" data-action="print">Drucken / als PDF speichern</button></div>' +
      '<div class="print-page"><section class="print-sheet" id="print-sheet">' +
      '<div class="ps-head"><div><div class="ps-league">' + esc(LEAGUE) + '</div><h2>Wettkampfprotokoll</h2></div>' +
      '<div class="ps-meta">' + esc(m.title || '') + (m.title ? '<br>' : '') + esc(fmtDate(m.date)) + '</div></div>' +
      '<table class="print-summary"><thead><tr><th></th><th>Mannschaft</th><th class="num">Scorepunkte</th><th class="num">Gerätepunkte</th><th class="num">Notensumme</th><th class="num">Punkte</th></tr></thead><tbody>' +
      '<tr><td>Heim</td><td>' + esc(teamName(m.homeTeamId)) + '</td><td class="num"><strong>' + r.homePoints + '</strong></td><td class="num">' + r.homeApp + '</td><td class="num">' + fmt(r.homeSum) + '</td><td class="num">' + (r.complete ? r.homeMatch : '–') + '</td></tr>' +
      '<tr><td>Gast</td><td>' + esc(teamName(m.guestTeamId)) + '</td><td class="num"><strong>' + r.guestPoints + '</strong></td><td class="num">' + r.guestApp + '</td><td class="num">' + fmt(r.guestSum) + '</td><td class="num">' + (r.complete ? r.guestMatch : '–') + '</td></tr>' +
      '</tbody></table>' +
      '<p class="ps-result">' + (r.complete ? 'Ergebnis: <strong>' + (r.winner === 'draw' ? 'Unentschieden' : 'Sieg ' + esc(teamName(r.winner === 'home' ? m.homeTeamId : m.guestTeamId))) + '</strong>' : 'Wettkampf noch nicht vollständig gewertet.') + '</p>' +
      apps +
      '<div class="pa-head"><strong>Scorer-Wertung</strong></div>' + scorerHtml +
      '<p class="ps-note">EA1/EA2 = E-Abzüge, E = 10 − Mittelwert, NA = neutraler Abzug, SP = Scorepunkte (' + esc(th) + '); Gerätepunkte Sieg/Unentschieden ' +
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

  function thresholdsText(list) {
    return list.slice().sort(function (a, b) { return a.min - b.min; })
      .map(function (t) { return fmt(t.min) + ' = ' + t.points; }).join('\n');
  }

  function viewData() {
    var r = state.settings.rules;
    return '<section class="card"><h2>Datensicherung</h2>' +
      '<p>Alle Daten liegen ausschließlich lokal auf diesem Gerät. Zusätzlich legt die App automatisch Sicherungspunkte an. ' +
      'Für Sicherheit gegen Geräteverlust bitte regelmäßig eine Sicherungsdatei exportieren (z. B. auf einen USB-Stick).</p>' +
      '<div id="data-storage" class="muted">wird geprüft …</div>' +
      '<h3>Exportieren</h3>' +
      '<div class="actions wrap"><button class="btn" data-action="export">Sicherung exportieren (unverschlüsselt)</button></div>' +
      '<form class="inline-form" data-form="export-enc">' +
      '<input type="password" name="pw" placeholder="Passwort (mind. 8 Zeichen)" minlength="8" required autocomplete="new-password">' +
      '<input type="password" name="pw2" placeholder="Passwort wiederholen" minlength="8" required autocomplete="new-password">' +
      '<button class="btn primary" type="submit">Verschlüsselt exportieren</button></form>' +
      '<p class="muted small">Verschlüsselung: AES-GCM 256 Bit, Schlüssel aus dem Passwort per PBKDF2 (310.000 Runden). Ohne Passwort ist die Datei nicht wiederherstellbar.</p>' +
      '<h3>Importieren / Wiederherstellen</h3>' +
      '<form class="stack" data-form="import">' +
      '<input type="file" name="file" accept=".json,application/json" required>' +
      '<input type="password" name="pw" placeholder="Passwort (nur bei verschlüsselter Datei)" autocomplete="current-password">' +
      '<div class="actions"><button class="btn" type="submit">Importieren (ersetzt alle Daten)</button></div></form>' +
      '<p class="muted small">Vor jedem Import wird automatisch ein Sicherungspunkt des aktuellen Stands angelegt.</p>' +
      '<h3>Automatische Sicherungspunkte</h3><div id="snapshots" class="muted">wird geladen …</div>' +
      '</section>' +

      '<section class="card"><h2>Standard-Wertungsregeln</h2>' +
      '<p class="muted">Gelten für <strong>neu angelegte</strong> Wettkämpfe. Bestehende Wettkämpfe behalten ihre Regeln.</p>' +
      '<form class="stack" data-form="rules">' +
      '<label>Duelle pro Gerät<input type="number" name="duels" min="1" max="10" value="' + r.duelsPerApparatus + '"></label>' +
      '<label>Scorepunkte nach Notendifferenz (je Zeile: „ab Differenz = Punkte“)' +
      '<textarea name="thresholds" rows="6">' + esc(thresholdsText(r.thresholds)) + '</textarea></label>' +
      '<div class="row2"><label>Gerätepunkte Sieg<input type="number" name="appWin" min="0" value="' + r.apparatusPoints.win + '"></label>' +
      '<label>Gerätepunkte Unentschieden<input type="number" name="appDraw" min="0" value="' + r.apparatusPoints.draw + '"></label></div>' +
      '<div class="row2"><label>Tabellenpunkte Sieg<input type="number" name="mWin" min="0" value="' + r.matchPoints.win + '"></label>' +
      '<label>Tabellenpunkte Unentschieden<input type="number" name="mDraw" min="0" value="' + r.matchPoints.draw + '"></label></div>' +
      '<label>Bei Gleichstand der Scorepunkte<select name="tieBreak">' +
      '<option value="none"' + (r.tieBreak === 'none' ? ' selected' : '') + '>Unentschieden</option>' +
      '<option value="apparatus"' + (r.tieBreak === 'apparatus' ? ' selected' : '') + '>Gerätepunkte entscheiden</option></select></label>' +
      '<div class="actions"><button class="btn primary" type="submit">Regeln speichern</button>' +
      '<button class="btn ghost" type="button" data-action="reset-rules">Auf Vorgabe zurücksetzen</button></div></form></section>' +

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

  function parseThresholds(text) {
    var out = [];
    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^([\d.,]+)\s*[=:→>-]+\s*(\d+)$/);
      if (!m) throw new Error('Zeile „' + lines[i] + '“ nicht verständlich. Format: 0,35 = 2');
      var min = S.parseScore(m[1]);
      if (min === null || Number.isNaN(min) || min <= 0) throw new Error('Ungültige Differenz in „' + lines[i] + '“');
      out.push({ min: min, points: parseInt(m[2], 10) });
    }
    if (!out.length) throw new Error('Mindestens eine Schwelle angeben.');
    return out.sort(function (a, b) { return a.min - b.min; });
  }

  function validateBackup(data) {
    if (!data || data.format !== 'turnwettkampf-backup' || !Array.isArray(data.teams) || !Array.isArray(data.matches)) {
      throw new Error('Keine gültige Turnwettkampf-Sicherungsdatei.');
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
    if (el.hasAttribute('data-field')) { handleScoreChange(el); return; }
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

  // Enter in einem Notenfeld springt zum nächsten Feld.
  $app.addEventListener('keydown', function (ev) {
    var el = ev.target;
    if (ev.key !== 'Enter' || !el.matches('input[data-field]:not([type=checkbox])')) return;
    ev.preventDefault();
    var inputs = Array.prototype.slice.call($app.querySelectorAll('input[data-field]:not([type=checkbox]):not([disabled])'));
    var next = inputs[inputs.indexOf(el) + 1];
    if (next) next.focus(); else el.blur();
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
    } else if (kind === 'rules') {
      try {
        var rules = {
          duelsPerApparatus: Math.max(1, Math.min(10, parseInt(fd.get('duels'), 10) || 4)),
          thresholds: parseThresholds(String(fd.get('thresholds'))),
          apparatusPoints: { win: parseInt(fd.get('appWin'), 10) || 0, draw: parseInt(fd.get('appDraw'), 10) || 0, loss: 0 },
          matchPoints: { win: parseInt(fd.get('mWin'), 10) || 0, draw: parseInt(fd.get('mDraw'), 10) || 0, loss: 0 },
          tieBreak: fd.get('tieBreak') === 'apparatus' ? 'apparatus' : 'none'
        };
        state.settings.rules = rules;
        save('meta', state.settings).then(function () { toast('Regeln gespeichert'); render(); });
      } catch (e) { toast(e.message, 'error'); }
    } else if (kind === 'export-enc') {
      var pw = String(fd.get('pw'));
      if (pw !== String(fd.get('pw2'))) { toast('Die Passwörter stimmen nicht überein.', 'error'); return; }
      SB.encryptJSON(exportData(), pw).then(function (env) {
        download('turnwettkampf-sicherung-' + stamp() + '.verschluesselt.json', JSON.stringify(env));
        form.reset();
        toast('Verschlüsselte Sicherung erstellt');
      }).catch(function (e) { toast(e.message, 'error'); });
    } else if (kind === 'import') {
      var file = form.file.files[0];
      if (!file) return;
      var password = String(fd.get('pw') || '');
      file.text().then(function (text) {
        var obj;
        try { obj = JSON.parse(text); } catch (e) { throw new Error('Datei ist kein gültiges JSON.'); }
        if (SB.isEncrypted(obj)) {
          if (!password) throw new Error('Diese Datei ist verschlüsselt – bitte Passwort eingeben.');
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
        break;
      case 'finalize':
        if (S.pendingCorrections(m).length) { toast('Erst die nachträgliche Änderung auf der Anzeigetafel anzeigen.', 'error'); return; }
        var res = S.matchResult(m);
        if (!res.complete && !confirm('Es sind noch nicht alle Duelle gewertet. Trotzdem abschließen? (Unvollständige Wettkämpfe zählen nicht in der Tabelle.)')) return;
        m.status = 'final';
        save('matches', m).then(function () { takeSnapshot('Wettkampf abgeschlossen'); render(); toast('Wettkampf abgeschlossen'); });
        break;
      case 'reopen':
        if (!confirm('Wettkampf wieder zur Bearbeitung öffnen?')) return;
        m.status = 'open';
        save('matches', m).then(render);
        break;
      case 'del-match':
        if (!confirm('Wettkampf „' + (m.title || 'Wettkampf') + '“ wirklich löschen?')) return;
        takeSnapshot('vor Löschen eines Wettkampfs').then(function () {
          state.matches = state.matches.filter(function (x) { return x.id !== m.id; });
          return remove('matches', m.id);
        }).then(function () { location.hash = '#/'; toast('Wettkampf gelöscht'); });
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
        duel.shown = { home: S.snapshotSide(duel.home), guest: S.snapshotSide(duel.guest) };
        save('matches', m).then(function () {
          rerenderPanel(m);
          toast(wasCorrection ? 'Korrektur wird auf der Anzeigetafel gezeigt' : 'Wertung wird auf der Anzeigetafel gezeigt');
        });
        break;
      case 'discard':
        var dd = m && m.apparatus[btn.getAttribute('data-app')].duels[parseInt(btn.getAttribute('data-duel'), 10)];
        if (!dd || !dd.shown) return;
        if (!confirm('Änderung verwerfen und den angezeigten Stand wiederherstellen?')) return;
        ['home', 'guest'].forEach(function (k) {
          ['gymnastId', 'd', 'e1', 'e2', 'nd', 'dns'].forEach(function (f) { dd[k][f] = dd.shown[k][f]; });
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
        download('turnwettkampf-sicherung-' + stamp() + '.json', JSON.stringify(exportData(), null, 2));
        break;
      case 'export-snap':
        DB.getSnapshot(parseInt(btn.getAttribute('data-snap'), 10)).then(function (s) {
          if (s) download('turnwettkampf-sicherungspunkt-' + s.id + '.json', JSON.stringify(s.data, null, 2));
        });
        break;
      case 'restore':
        DB.getSnapshot(parseInt(btn.getAttribute('data-snap'), 10)).then(function (s) {
          if (!s) return;
          if (!confirm('Stand vom ' + fmtDateTime(s.ts) + ' wiederherstellen? Der aktuelle Stand wird vorher gesichert.')) return;
          return restoreData(validateBackup(s.data), 'Wiederherstellung').then(function () { toast('Wiederhergestellt'); });
        }).catch(function (e) { toast(e.message, 'error'); });
        break;
      case 'reset-rules':
        if (!confirm('Standardregeln auf die Vorgabe zurücksetzen?')) return;
        state.settings.rules = S.clone(S.DEFAULT_RULES);
        save('meta', state.settings).then(render);
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
  if (leagueEl) leagueEl.textContent = LEAGUE;

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

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline-Cache optional */ });
  }
})();
