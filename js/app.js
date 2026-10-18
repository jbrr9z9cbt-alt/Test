/* Turnwettkampf – Oberfläche und Ablaufsteuerung */
(function () {
  'use strict';

  var S = window.Scoring;
  var DB = window.DB;
  var SB = window.SecureBackup;
  var APP_VERSION = 1;

  var state = {
    teams: [],
    matches: [],
    settings: { key: 'settings', rules: S.clone(S.DEFAULT_RULES) },
    persistent: false,
    ui: { tab: {} }
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
    return t ? t.name : 'Unbekannte Mannschaft';
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

  function loadAll() {
    return Promise.all([DB.getAll('teams'), DB.getAll('matches'), DB.get('meta', 'settings')]).then(function (r) {
      state.teams = r[0].sort(function (a, b) { return a.name.localeCompare(b.name); });
      state.matches = r[1].sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''); });
      if (r[2]) state.settings = r[2];
    });
  }

  // ---------- Router ----------

  function route() {
    var parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    return { name: parts[0] || 'home', id: parts[1], sub: parts[2] };
  }

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
      case 'table': html = viewTable(); break;
      case 'data': html = viewData(); break;
      default: html = viewHome();
    }
    $app.innerHTML = (state.persistent ? '' : warningBanner()) + html;
    if (r.name === 'data') refreshDataView();
    if (r.name === 'home') refreshStorageBox();
    window.scrollTo(0, 0);
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
    var canCreate = state.teams.length >= 2;
    var list = state.matches.length ? state.matches.map(function (m) {
      var r = S.matchResult(m);
      return '<a class="match-row" href="#/match/' + m.id + '">' +
        '<div><div class="match-title">' + esc(m.title || 'Wettkampf') + '</div>' +
        '<div class="muted">' + esc(fmtDate(m.date)) + (m.location ? ' · ' + esc(m.location) : '') + '</div></div>' +
        '<div class="match-teams">' + esc(teamName(m.homeTeamId)) + ' <span class="muted">vs.</span> ' + esc(teamName(m.guestTeamId)) + '</div>' +
        '<div class="match-score">' + r.homePoints + ':' + r.guestPoints + '</div>' +
        '<div>' + statusBadge(m, r) + '</div></a>';
    }).join('') : '<p class="muted">Noch keine Wettkämpfe angelegt.</p>';

    return '<section class="card">' +
      '<div class="card-head"><h2>Wettkämpfe</h2>' +
      (canCreate ? '<a class="btn primary" href="#/new">+ Neuer Wettkampf</a>' : '<a class="btn" href="#/teams">Zuerst Mannschaften anlegen</a>') +
      '</div>' + list + '</section>' +
      '<section class="card"><h2>Datenspeicher</h2><div id="storage-box" class="muted">wird geprüft …</div></section>';
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
      var gymnasts = t.gymnasts.map(function (g) {
        return '<li class="gym-row">' +
          '<input type="text" value="' + esc(g.name) + '" data-team="' + t.id + '" data-gym="' + g.id + '" data-tfield="gname" aria-label="Name">' +
          '<button class="btn small ghost" data-action="del-gym" data-team="' + t.id + '" data-gym="' + g.id + '" title="Turner entfernen">✕</button></li>';
      }).join('');
      return '<section class="card team-card">' +
        '<div class="card-head"><input class="team-name" type="text" value="' + esc(t.name) + '" data-team="' + t.id + '" data-tfield="name" aria-label="Mannschaftsname">' +
        '<button class="btn small danger" data-action="del-team" data-team="' + t.id + '">Löschen</button></div>' +
        '<h3>Turner (' + t.gymnasts.length + ')</h3><ul class="plain gym-list">' + gymnasts + '</ul>' +
        '<form class="inline-form" data-form="add-gym" data-team="' + t.id + '">' +
        '<input type="text" name="name" placeholder="Name des Turners" required>' +
        '<button class="btn" type="submit">+ Turner</button></form>' +
        '<p class="muted small">Mehrere Namen auf einmal: durch Komma oder Zeilenumbruch trennen.</p>' +
        '</section>';
    }).join('');

    return '<section class="card"><h2>Mannschaften</h2>' +
      '<form class="inline-form" data-form="add-team">' +
      '<input type="text" name="name" placeholder="Name der Mannschaft" required>' +
      '<button class="btn primary" type="submit">+ Mannschaft</button></form></section>' +
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
      '<label>Bezeichnung<input type="text" name="title" value="' + esc(m ? m.title : '') + '" placeholder="z. B. 3. Wettkampftag Landesliga"></label>' +
      '<div class="row2"><label>Datum<input type="date" name="date" value="' + esc(m ? m.date : new Date().toISOString().slice(0, 10)) + '"></label>' +
      '<label>Ort<input type="text" name="location" value="' + esc(m ? m.location : '') + '"></label></div>' +
      '<div class="row2"><label>Heimmannschaft<select name="home" required' + (hasScores ? ' disabled' : '') + '>' + teamOptions(m && m.homeTeamId) + '</select></label>' +
      '<label>Gastmannschaft<select name="guest" required' + (hasScores ? ' disabled' : '') + '>' + teamOptions(m && m.guestTeamId) + '</select></label></div>' +
      '<label>Duelle pro Gerät<input type="number" name="duels" min="1" max="10" value="' + rules.duelsPerApparatus + '"></label>' +
      (isNew ? '<p class="muted small">Die Wertungsregeln (Scorepunkte-Schwellen usw.) werden aus den Standardregeln unter „Daten“ übernommen und gelten dann fest für diesen Wettkampf.</p>' : '') +
      '<div class="actions"><button class="btn primary" type="submit">' + (isNew ? 'Anlegen' : 'Speichern') + '</button>' +
      '<a class="btn ghost" href="' + (m ? '#/match/' + m.id : '#/') + '">Abbrechen</a></div>' +
      '</form></section>';
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

    if (!m) {
      var rules = S.clone(state.settings.rules);
      rules.duelsPerApparatus = duels;
      m = {
        id: uid(), title: '', date: '', location: '', homeTeamId: home, guestTeamId: guest,
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
    m.title = String(fd.get('title') || '').trim();
    m.date = fd.get('date') || '';
    m.location = String(fd.get('location') || '').trim();
    save('matches', m).then(function () { location.hash = '#/match/' + m.id; });
  }

  function sideUsed(s) {
    return !!(s.gymnastId || s.name || s.d !== null || s.e !== null || s.dns);
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
      '<div class="muted">' + esc(fmtDate(m.date)) + (m.location ? ' · ' + esc(m.location) : '') + ' · <span data-out="status">' + statusBadge(m, r) + '</span></div></div>' +
      '<div class="scoreline">' +
      '<div class="team home"><div class="label">Heim</div><div class="name">' + esc(teamName(m.homeTeamId)) + '</div></div>' +
      '<div class="big" data-out="score">' + r.homePoints + ' : ' + r.guestPoints + '</div>' +
      '<div class="team guest"><div class="label">Gast</div><div class="name">' + esc(teamName(m.guestTeamId)) + '</div></div>' +
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
      '<nav class="tabs">' + tabs + '</nav>' +
      '<section class="card" id="apparatus-panel">' + apparatusPanel(m, tab) + '</section>' +
      '<section class="card"><h3>Scorer-Wertung</h3><div data-out="scorers">' + scorersHtml(m) + '</div></section>';
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
        esc(g.name) + (used[g.id] ? ' (bereits eingesetzt)' : '') + '</option>';
    });
    if (side.gymnastId && !found) opts += '<option value="' + esc(side.gymnastId) + '" selected>' + esc(side.name) + ' (nicht mehr im Kader)</option>';
    if (!locked) opts += '<option value="__new__">+ neuer Turner …</option>';
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
      ' value="' + esc(v) + '" placeholder="' + (field === 'nd' ? '0,000' : '') + '"' + (locked ? ' disabled' : '') + '></label>';
  }

  function sideHtml(m, appKey, idx, sideKey, side, locked) {
    var dis = locked || side.dns;
    return '<div class="side ' + sideKey + (side.dns ? ' dns' : '') + '">' +
      '<div class="side-head"><span class="side-label">' + (sideKey === 'home' ? 'Heim' : 'Gast') + '</span>' +
      gymnastSelect(m, appKey, idx, sideKey, side, locked) + '</div>' +
      '<div class="score-row">' +
      scoreInput(appKey, idx, sideKey, 'd', side.d, dis, 'D-Note') +
      scoreInput(appKey, idx, sideKey, 'e', side.e, dis, 'E-Note') +
      scoreInput(appKey, idx, sideKey, 'nd', side.nd, dis, 'Abzug') +
      '<div class="final"><span>Endnote</span><strong data-out="final-' + appKey + '-' + idx + '-' + sideKey + '">' + fmt(S.sideFinal(side)) + '</strong></div>' +
      '</div>' +
      '<label class="check"><input type="checkbox" ' + fieldAttrs(appKey, idx, sideKey, 'dns') + (side.dns ? ' checked' : '') + (locked ? ' disabled' : '') + '> nicht angetreten / nicht besetzt (0,000)</label>' +
      '</div>';
  }

  function duelBadge(r) {
    if (!r.complete) return '<span class="duel-open">offen</span>';
    return '<span class="duel-pts ' + (r.winner === 'home' ? 'win' : '') + '">' + r.homePoints + '</span>' +
      '<span class="duel-sep">:</span>' +
      '<span class="duel-pts ' + (r.winner === 'guest' ? 'win' : '') + '">' + r.guestPoints + '</span>' +
      '<span class="duel-diff">Diff. ' + fmt(r.diff) + '</span>';
  }

  function apparatusPanel(m, appKey) {
    var a = S.APPARATUS.filter(function (x) { return x.key === appKey; })[0];
    var app = m.apparatus[appKey];
    var ar = S.apparatusResult(app, m.rules);
    var locked = m.status === 'final';
    var duels = app.duels.map(function (d, i) {
      return '<div class="duel">' +
        '<div class="duel-no">Duell ' + (i + 1) + '</div>' +
        sideHtml(m, appKey, i, 'home', d.home, locked) +
        '<div class="duel-result" data-out="duel-' + appKey + '-' + i + '">' + duelBadge(ar.duels[i]) + '</div>' +
        sideHtml(m, appKey, i, 'guest', d.guest, locked) +
        '</div>';
    }).join('');
    return '<div class="card-head"><h3>' + a.name + '</h3>' +
      '<div class="app-sum" data-out="app-sum">' + appSumHtml(ar) + '</div></div>' + duels +
      '<p class="muted small">Eingabe mit Komma oder Punkt, z. B. <code>4,8</code> oder <code>8.433</code>. Endnote = D-Note + E-Note − Abzug. Jede Eingabe wird sofort gespeichert.</p>';
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
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(s.name || '–') + '</td><td>' + esc(teamName(s.team === 'home' ? m.homeTeamId : m.guestTeamId)) + '</td>' +
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
    m.apparatus[tab].duels.forEach(function (d, i) {
      out('duel-' + tab + '-' + i, duelBadge(ar.duels[i]));
      out('final-' + tab + '-' + i + '-home', fmt(S.sideFinal(d.home)));
      out('final-' + tab + '-' + i + '-guest', fmt(S.sideFinal(d.guest)));
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

    if (field === 'gymnast') {
      if (el.value === '__new__') {
        var t = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
        var name = t && prompt('Name des neuen Turners für ' + t.name + ':');
        if (!name || !name.trim()) { el.value = side.gymnastId || ''; return; }
        var g = { id: uid(), name: name.trim() };
        t.gymnasts.push(g);
        save('teams', t);
        side.gymnastId = g.id;
        side.name = g.name;
      } else {
        var tm = team(sideKey === 'home' ? m.homeTeamId : m.guestTeamId);
        var gy = tm && tm.gymnasts.filter(function (x) { return x.id === el.value; })[0];
        side.gymnastId = el.value || null;
        side.name = gy ? gy.name : '';
      }
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
    var max = field === 'd' ? 20000 : 10000;
    if (Number.isNaN(v) || v > max) {
      el.classList.add('invalid');
      toast('Ungültige Note: „' + el.value + '“ (Format z. B. 8,433)', 'error');
      return;
    }
    el.classList.remove('invalid');
    side[field] = v;
    if (v !== null && !(field === 'nd' && v === 0)) el.value = fmt(v);
    save('matches', m).then(function () { refreshComputed(m); });
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

  function viewBoard(m) {
    var r = S.matchResult(m);
    // Aktuelles Gerät: erstes begonnenes, aber nicht vollständiges – sonst das zuletzt begonnene.
    var current = null;
    S.APPARATUS.forEach(function (a) {
      var ar = r.apparatus[a.key];
      if (!current && ar.started && !ar.complete) current = a;
    });
    if (!current) {
      S.APPARATUS.forEach(function (a) { if (r.apparatus[a.key].started) current = a; });
    }
    var rows = S.APPARATUS.map(function (a) {
      var ar = r.apparatus[a.key];
      return '<tr class="' + (current && current.key === a.key ? 'current' : '') + '"><td>' + a.name + '</td>' +
        '<td class="num">' + (ar.started ? ar.homePoints : '–') + '</td><td class="num">' + (ar.started ? ar.guestPoints : '–') + '</td>' +
        '<td class="num small">' + (ar.complete ? ar.homeApp + ':' + ar.guestApp : '') + '</td></tr>';
    }).join('');

    var detail = '';
    if (current) {
      var app = m.apparatus[current.key];
      var ar = r.apparatus[current.key];
      detail = '<div class="board-detail"><h3>' + current.name + '</h3><table class="board-duels">' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          return '<tr><td class="bn ' + (dr.winner === 'home' ? 'win' : '') + '">' + esc(d.home.name || '–') + '</td>' +
            '<td class="num">' + fmt(dr.home) + '</td>' +
            '<td class="num pts">' + (dr.complete ? dr.homePoints + ' : ' + dr.guestPoints : '') + '</td>' +
            '<td class="num">' + fmt(dr.guest) + '</td>' +
            '<td class="bn right ' + (dr.winner === 'guest' ? 'win' : '') + '">' + esc(d.guest.name || '–') + '</td></tr>';
        }).join('') + '</table></div>';
    }

    return '<div class="board">' +
      '<div class="board-bar"><a href="#/match/' + m.id + '" class="btn small ghost">← zurück</a>' +
      '<button class="btn small ghost" data-action="fullscreen">Vollbild</button></div>' +
      '<div class="board-title">' + esc(m.title || 'Wettkampf') + '</div>' +
      '<div class="board-score">' +
      '<div class="board-team">' + esc(teamName(m.homeTeamId)) + '</div>' +
      '<div class="board-big">' + r.homePoints + '<span>:</span>' + r.guestPoints + '</div>' +
      '<div class="board-team">' + esc(teamName(m.guestTeamId)) + '</div></div>' +
      '<div class="board-sub">Gerätepunkte ' + r.homeApp + ':' + r.guestApp + winnerText(m, r) + '</div>' +
      '<div class="board-grid"><table class="board-table"><thead><tr><th>Gerät</th><th class="num">Heim</th><th class="num">Gast</th><th class="num">GP</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      detail + '</div></div>';
  }

  // ---------- Ansicht: Protokoll ----------

  function viewPrint(m) {
    var r = S.matchResult(m);
    var apps = S.APPARATUS.map(function (a) {
      var app = m.apparatus[a.key];
      var ar = r.apparatus[a.key];
      return '<div class="print-app"><h3>' + a.name + ' <span class="muted">– Scorepunkte ' + ar.homePoints + ':' + ar.guestPoints +
        (ar.complete ? ', Gerätepunkte ' + ar.homeApp + ':' + ar.guestApp : '') + '</span></h3>' +
        '<div class="table-wrap"><table class="table compact print-table"><thead><tr><th>#</th><th>Heim</th><th class="num">D</th><th class="num">E</th><th class="num">Abz.</th><th class="num">End</th>' +
        '<th class="num">SP</th><th class="num">End</th><th class="num">Abz.</th><th class="num">E</th><th class="num">D</th><th>Gast</th></tr></thead><tbody>' +
        app.duels.map(function (d, i) {
          var dr = ar.duels[i];
          function cells(s, reverse) {
            var c = s.dns ? ['n.a.', '', '', ''] : [fmt(s.d), fmt(s.e), s.nd ? fmt(s.nd) : '', ''];
            c[3] = fmt(S.sideFinal(s));
            return (reverse ? c.reverse() : c).map(function (x) { return '<td class="num">' + x + '</td>'; }).join('');
          }
          return '<tr><td>' + (i + 1) + '</td><td>' + esc(d.home.name || '–') + '</td>' + cells(d.home, false) +
            '<td class="num"><strong>' + (dr.complete ? dr.homePoints + ':' + dr.guestPoints : '') + '</strong></td>' +
            cells(d.guest, true) + '<td>' + esc(d.guest.name || '–') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');

    var th = m.rules.thresholds.slice().sort(function (a, b) { return a.min - b.min; })
      .map(function (t) { return 'ab ' + fmt(t.min) + ' → ' + t.points; }).join(', ');

    return '<div class="print-actions no-print"><a class="btn ghost" href="#/match/' + m.id + '">← zurück</a>' +
      '<button class="btn primary" data-action="print">Drucken / als PDF speichern</button></div>' +
      '<section class="card print-sheet"><h2>Wettkampfprotokoll</h2>' +
      '<p><strong>' + esc(m.title || 'Wettkampf') + '</strong><br>' + esc(fmtDate(m.date)) + (m.location ? ', ' + esc(m.location) : '') + '</p>' +
      '<table class="table compact"><thead><tr><th></th><th>Mannschaft</th><th class="num">Scorepunkte</th><th class="num">Gerätepunkte</th><th class="num">Notensumme</th><th class="num">Tabellenpunkte</th></tr></thead><tbody>' +
      '<tr><td>Heim</td><td>' + esc(teamName(m.homeTeamId)) + '</td><td class="num"><strong>' + r.homePoints + '</strong></td><td class="num">' + r.homeApp + '</td><td class="num">' + fmt(r.homeSum) + '</td><td class="num">' + (r.complete ? r.homeMatch : '–') + '</td></tr>' +
      '<tr><td>Gast</td><td>' + esc(teamName(m.guestTeamId)) + '</td><td class="num"><strong>' + r.guestPoints + '</strong></td><td class="num">' + r.guestApp + '</td><td class="num">' + fmt(r.guestSum) + '</td><td class="num">' + (r.complete ? r.guestMatch : '–') + '</td></tr>' +
      '</tbody></table>' +
      (r.complete ? '<p>Ergebnis: <strong>' + (r.winner === 'draw' ? 'Unentschieden' : 'Sieg ' + esc(teamName(r.winner === 'home' ? m.homeTeamId : m.guestTeamId))) + '</strong></p>' : '<p class="warn">Wettkampf noch nicht vollständig gewertet.</p>') +
      apps +
      '<h3>Scorer-Wertung</h3>' + scorersHtml(m) +
      '<p class="muted small">Wertungsregeln: Scorepunkte je Duell nach Notendifferenz (' + esc(th) + '); Gerätepunkte Sieg/Unentschieden ' +
      m.rules.apparatusPoints.win + '/' + m.rules.apparatusPoints.draw + '. Status: ' + (m.status === 'final' ? 'abgeschlossen' : 'offen') +
      '. Stand: ' + esc(fmtDateTime(m.updatedAt || new Date().toISOString())) + '</p>' +
      '<div class="signatures"><div>Kampfgericht</div><div>Heimmannschaft</div><div>Gastmannschaft</div></div>' +
      '</section>';
  }

  // ---------- Ansicht: Tabelle ----------

  function viewTable() {
    var rows = S.leagueTable(state.matches);
    var finals = state.matches.filter(function (m) { return m.status === 'final'; }).length;
    var body = rows.length ? rows.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(teamName(r.teamId)) + '</td><td class="num">' + r.played + '</td>' +
        '<td class="num">' + r.won + '/' + r.draw + '/' + r.lost + '</td>' +
        '<td class="num"><strong>' + r.points + ':' + r.pointsAgainst + '</strong></td>' +
        '<td class="num">' + r.app + ':' + r.appAgainst + '</td>' +
        '<td class="num">' + r.score + ':' + r.scoreAgainst + '</td>' +
        '<td class="num">' + (r.score - r.scoreAgainst > 0 ? '+' : '') + (r.score - r.scoreAgainst) + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="muted">Noch keine abgeschlossenen Wettkämpfe.</td></tr>';
    return '<section class="card"><h2>Tabelle</h2>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Pl.</th><th>Mannschaft</th><th class="num">WK</th><th class="num">S/U/N</th>' +
      '<th class="num">Punkte</th><th class="num">Gerätepunkte</th><th class="num">Scorepunkte</th><th class="num">Diff.</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="muted small">Berücksichtigt werden ' + finals + ' abgeschlossene Wettkämpfe. Reihenfolge: Punkte, Gerätepunkte-Differenz, Scorepunkte-Differenz.</p></section>';
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
      '<p class="muted">Löscht alle Mannschaften und Wettkämpfe auf diesem Gerät. Ein Sicherungspunkt wird vorher angelegt.</p>' +
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
      var val = el.value.trim();
      if (!val) { toast('Name darf nicht leer sein.', 'error'); el.value = tfield === 'name' ? t.name : ''; return; }
      if (tfield === 'name') t.name = val;
      else {
        var g = t.gymnasts.filter(function (x) { return x.id === el.getAttribute('data-gym'); })[0];
        if (g) g.name = val;
      }
      save('teams', t).then(function () { toast('Gespeichert'); });
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

    if (kind === 'add-team') {
      var name = String(fd.get('name')).trim();
      if (!name) return;
      var t = { id: uid(), name: name, gymnasts: [], createdAt: new Date().toISOString() };
      state.teams.push(t);
      state.teams.sort(function (a, b) { return a.name.localeCompare(b.name); });
      save('teams', t).then(render);
    } else if (kind === 'add-gym') {
      var tm = team(form.getAttribute('data-team'));
      var names = String(fd.get('name')).split(/[,\n;]/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!tm || !names.length) return;
      names.forEach(function (n) { tm.gymnasts.push({ id: uid(), name: n }); });
      save('teams', tm).then(function () {
        render();
        var input = $app.querySelector('form[data-form="add-gym"][data-team="' + tm.id + '"] input');
        if (input) input.focus();
      });
    } else if (kind === 'match') {
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
      case 'del-team':
        var tid = btn.getAttribute('data-team');
        if (state.matches.some(function (x) { return x.homeTeamId === tid || x.guestTeamId === tid; })) {
          toast('Mannschaft wird in Wettkämpfen verwendet und kann nicht gelöscht werden.', 'error');
          return;
        }
        if (!confirm('Mannschaft „' + teamName(tid) + '“ löschen?')) return;
        state.teams = state.teams.filter(function (x) { return x.id !== tid; });
        remove('teams', tid).then(render);
        break;
      case 'del-gym':
        var t = team(btn.getAttribute('data-team'));
        var gid = btn.getAttribute('data-gym');
        t.gymnasts = t.gymnasts.filter(function (g) { return g.id !== gid; });
        save('teams', t).then(render);
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

  // Änderungen aus anderen Tabs (z. B. Anzeigetafel) übernehmen.
  if (channel) {
    channel.onmessage = function () {
      loadAll().then(function () {
        var active = document.activeElement;
        var editing = active && $app.contains(active) && /INPUT|SELECT|TEXTAREA/.test(active.tagName);
        if (!editing) render();
      });
    };
  }

  // Beim Verlassen/Verstecken der Seite noch ausstehenden Sicherungspunkt schreiben.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') takeSnapshot();
  });

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
