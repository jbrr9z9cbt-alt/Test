/*
 * Ligabericht für den Ligaleiter (bericht.html): Sicherungsdateien der Wettkämpfe einlesen, kommende Wettkämpfe
 * eintragen und je Liga und Saison (Kalenderjahr) ein PDF erstellen – Saisonübersicht mit allen Wettkämpfen und der
 * Tabelle, dahinter die Wettkampfprotokolle. Rechenlogik (js/scoring.js) und Protokolle (js/app.js im Berichtsmodus,
 * window.WTBReport) sind dieselben wie in der App. Gespeichert wird nur in diesem Browser (IndexedDB „wtb-ligabericht“).
 */
(function () {
  'use strict';

  var S = window.Scoring;
  var R = window.WTBReport;
  var SB = window.SecureBackup;
  var esc = R.esc;
  var MATCH_FORMAT = 'turnwettkampf-match', BACKUP_FORMAT = 'turnwettkampf-backup', UP_FORMAT = 'wtb-ligabericht-termine';

  var st = { records: [], teams: [], upcoming: [], league: null, year: null };

  // ---------- Speicher (eigene Datenbank, unabhängig von der App) ----------

  var dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise(function (res, rej) {
        var q = indexedDB.open('wtb-ligabericht', 1);
        q.onupgradeneeded = function () { q.result.createObjectStore('kv'); };
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    }
    return dbp;
  }
  function kvGet(k) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var r = d.transaction('kv').objectStore('kv').get(k);
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }
  function kvPut(k, v) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('kv', 'readwrite');
        t.objectStore('kv').put(v, k);
        t.oncomplete = function () { res(); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  function saveAll() {
    return Promise.all([kvPut('records', st.records), kvPut('teams', st.teams), kvPut('upcoming', st.upcoming)]);
  }
  function pref(k, v) {
    try { if (v === undefined) return localStorage.getItem('wtb-bericht-' + k); localStorage.setItem('wtb-bericht-' + k, v); } catch (e) { return null; }
    return null;
  }

  // ---------- Hilfen ----------

  function $(id) { return document.getElementById(id); }
  function yearOf(date) { var y = /^(\d{4})-/.exec(date || ''); return y ? parseInt(y[1], 10) : null; }
  function leagueOf(key) { return R.leagues.filter(function (l) { return l.key === key; })[0] || R.leagues[0]; }
  function classic(league) { return leagueOf(league).model === 'classic'; }
  function stamp(m) { return m.updatedAt || m.createdAt || ''; }
  function sameFixture(a, b) { return a.league === b.league && a.date === b.date && a.homeTeamId === b.homeTeamId && a.guestTeamId === b.guestTeamId; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function msg(html, err) { $('rp-msg').innerHTML = html ? '<span class="' + (err ? 'err' : '') + '">' + html + '</span>' : ''; }

  /** Namen aus Gesamtsicherungen und Einzelsicherungen bekanntmachen (Einzelsicherungen enthalten nur die Namen). */
  function syncTeams() {
    var names = {};
    st.records.forEach(function (r) {
      if (r.names) { names[r.match.homeTeamId] = r.names.home; names[r.match.guestTeamId] = r.names.guest; }
    });
    R.setTeams(st.teams, names);
  }

  // ---------- Einlesen ----------

  /** Einen Wettkampf aufnehmen; doppelte (gleiche Kennung oder gleiche Begegnung am selben Tag): der neueste Stand zählt. */
  function addMatch(m, names, file, counts) {
    if (!m || !m.id || !m.apparatus || !m.homeTeamId || !m.guestTeamId) { counts.bad++; return; }
    m = R.prepare(JSON.parse(JSON.stringify(m)));
    var rec = { match: m, names: names || null, file: file, importedAt: new Date().toISOString() };
    var dup = st.records.filter(function (r) { return r.match.id === m.id || sameFixture(r.match, m); });
    if (dup.length) {
      var newest = dup.reduce(function (a, b) { return stamp(a.match) >= stamp(b.match) ? a : b; });
      if (stamp(newest.match) > stamp(m)) { counts.older++; return; }
      st.records = st.records.filter(function (r) { return dup.indexOf(r) < 0; });
      counts.updated++;
    } else counts.added++;
    st.records.push(rec);
  }

  function readFiles(files) {
    var counts = { added: 0, updated: 0, older: 0, bad: 0 }, errors = [];
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    return list.reduce(function (p, f) {
      return p.then(function () {
        return f.text().then(function (text) {
          var obj;
          try { obj = JSON.parse(text); } catch (e) { throw new Error('kein gültiges JSON'); }
          if (SB && SB.isEncrypted(obj)) {
            var pw = window.prompt('„' + f.name + '“ ist verschlüsselt. Bitte Passwort eingeben:');
            if (!pw) throw new Error('verschlüsselt, kein Passwort');
            return SB.decryptJSON(obj, pw);
          }
          return obj;
        }).then(function (data) {
          if (data && data.format === MATCH_FORMAT) { addMatch(data.match, data.teams, f.name, counts); return; }
          if (data && data.format === BACKUP_FORMAT && Array.isArray(data.matches)) {
            (data.teams || []).forEach(function (t) {
              if (!t || !t.id) return;
              st.teams = st.teams.filter(function (x) { return x.id !== t.id; }).concat([t]);
            });
            data.matches.forEach(function (m) { addMatch(m, null, f.name, counts); });
            return;
          }
          throw new Error('keine Sicherungsdatei der WTB-Liga');
        }).catch(function (e) { errors.push(esc(f.name) + ': ' + esc(e.message)); });
      });
    }, Promise.resolve()).then(function () {
      syncTeams();
      return saveAll();
    }).then(function () {
      var parts = [];
      if (counts.added) parts.push(counts.added + ' neu');
      if (counts.updated) parts.push(counts.updated + ' aktualisiert');
      if (counts.older) parts.push(counts.older + ' älter als der vorhandene Stand – nicht übernommen');
      if (counts.bad) parts.push(counts.bad + ' ungültig');
      msg((parts.length ? 'Eingelesen: ' + parts.join(', ') + '.' : '') + (errors.length ? '<br>Nicht eingelesen: ' + errors.join('; ') : ''), errors.length && !parts.length);
      // Neu eingelesene Saison gleich anzeigen, wenn bisher keine gewählt war
      renderAll();
    });
  }

  // ---------- Saison: Wettkämpfe, Tabelle ----------

  function seasonRecords() {
    return st.records.filter(function (r) { return (r.match.league || R.leagues[0].key) === st.league && yearOf(r.match.date) === st.year; })
      .sort(function (a, b) { return (a.match.date || '').localeCompare(b.match.date || '') || R.teamName(a.match.homeTeamId).localeCompare(R.teamName(b.match.homeTeamId)); });
  }

  function seasonUpcoming(played) {
    return st.upcoming.filter(function (u) {
      return u.league === st.league && yearOf(u.date) === st.year && !played.some(function (r) { return sameFixture(r.match, u); });
    });
  }

  /** Alle Zeilen der Wettkampfliste (gewertete, offene, kommende) nach Datum; gewertete und offene bekommen eine Seitenzahl. */
  function seasonRows() {
    var played = seasonRecords();
    var rows = played.map(function (r) { return { rec: r, m: r.match, res: S.matchResult(r.match), date: r.match.date }; });
    rows.forEach(function (x, i) { x.page = i + 2; });
    seasonUpcoming(played).forEach(function (u) { rows.push({ up: u, date: u.date }); });
    rows.sort(function (a, b) {
      var ah = a.m ? a.m.homeTeamId : a.up.homeTeamId, bh = b.m ? b.m.homeTeamId : b.up.homeTeamId;
      return (a.date || '').localeCompare(b.date || '') || R.teamName(ah).localeCompare(R.teamName(bh));
    });
    // Protokolle in der Reihenfolge der Liste (nach Datum)
    var p = 2;
    rows.forEach(function (x) { if (x.m) x.page = p++; });
    return rows;
  }

  function isFinal(x) { return x.m && x.m.status === 'final' && x.res.complete; }

  /**
   * Tabelle: Wettkampfpunkte (gewonnene), dann Differenz der Gerätepunkte, dann direkter Vergleich (nur Wettkämpfe der
   * Gleichplatzierten untereinander; steht er aus oder ist er unentschieden: gleicher Platz mit Hinweis).
   */
  function standings(rows) {
    var finals = rows.filter(isFinal);
    var ids = R.leagueTeams(st.league).map(function (t) { return t.id; });
    finals.forEach(function (x) { [x.m.homeTeamId, x.m.guestTeamId].forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
    var t = {};
    ids.forEach(function (id) { t[id] = { id: id, name: R.teamName(id), n: 0, w: 0, d: 0, l: 0, gpA: 0, gpB: 0, wp: 0, sum: 0 }; });
    finals.forEach(function (x) {
      var r = x.res;
      [['home', x.m.homeTeamId, 'guest'], ['guest', x.m.guestTeamId, 'home']].forEach(function (s) {
        var e = t[s[1]];
        e.n++;
        e.gpA += r[s[0] + 'App']; e.gpB += r[s[2] + 'App'];
        e.wp += r[s[0] + 'Match'];
        e.sum += r[s[0] + 'Sum'];
        if (r.winner === s[0]) e.w++; else if (r.winner === 'draw') e.d++; else e.l++;
      });
    });
    var list = ids.map(function (id) { return t[id]; });
    list.forEach(function (e) { e.diff = e.gpA - e.gpB; });
    list.sort(function (a, b) { return b.wp - a.wp || b.diff - a.diff || a.name.localeCompare(b.name); });
    // Gruppen mit gleichen Wettkampfpunkten und gleicher Differenz: direkter Vergleich
    var out = [], notes = [], i = 0;
    while (i < list.length) {
      var j = i;
      while (j + 1 < list.length && list[j + 1].wp === list[i].wp && list[j + 1].diff === list[i].diff) j++;
      var grp = list.slice(i, j + 1);
      if (grp.length === 1) { out.push([grp]); i = j + 1; continue; }
      direct(grp, finals).forEach(function (g) { out.push(g); });
      i = j + 1;
    }
    var place = 1, rowsOut = [];
    out.forEach(function (g) {
      g[0].forEach(function (e) { e.place = place; rowsOut.push(e); });
      if (g[1]) notes.push('Platz ' + place + ' geteilt (' + g[0].map(function (e) { return e.name; }).join(', ') + '): ' + g[1] + '.');
      place += g[0].length;
    });
    return { rows: rowsOut, notes: notes };
  }

  /**
   * Direkter Vergleich einer Gruppe: Wettkampfpunkte nur aus den Wettkämpfen der Gruppe untereinander. Bleiben danach
   * einige gleich, entscheidet erneut der Vergleich nur unter diesen. Liefert [[Mannschaften, Hinweis bei gleichem Platz]].
   */
  function direct(grp, finals) {
    if (grp.length === 1) return [[grp, null]];
    var gids = grp.map(function (e) { return e.id; });
    var mutual = finals.filter(function (x) { return gids.indexOf(x.m.homeTeamId) >= 0 && gids.indexOf(x.m.guestTeamId) >= 0; });
    var mw = {};
    gids.forEach(function (id) { mw[id] = 0; });
    mutual.forEach(function (x) { mw[x.m.homeTeamId] += x.res.homeMatch; mw[x.m.guestTeamId] += x.res.guestMatch; });
    grp = grp.slice().sort(function (a, b) { return mw[b.id] - mw[a.id] || a.name.localeCompare(b.name); });
    var parts = [], k = 0;
    while (k < grp.length) {
      var l = k;
      while (l + 1 < grp.length && mw[grp[l + 1].id] === mw[grp[k].id]) l++;
      parts.push(grp.slice(k, l + 1));
      k = l + 1;
    }
    if (parts.length === 1) return [[grp, tieNote(grp, mutual)]];
    var res = [];
    parts.forEach(function (p) { direct(p, finals).forEach(function (g) { res.push(g); }); });
    return res;
  }

  function tieNote(sub, mutual) {
    if (sub.every(function (e) { return e.n === 0; })) return 'noch ohne Wettkampf';
    var ids = sub.map(function (e) { return e.id; });
    var among = mutual.filter(function (x) { return ids.indexOf(x.m.homeTeamId) >= 0 && ids.indexOf(x.m.guestTeamId) >= 0; });
    return 'gleiche Wettkampfpunkte und Gerätepunkte, direkter Vergleich ' + (among.length ? 'unentschieden' : 'steht noch aus');
  }

  // ---------- Seiten ----------

  /** a:b mit Doppelpunkten untereinander: Breiten je Spalte (w = [Zeichen links, Zeichen rechts]). */
  function ab(a, b, w) {
    return '<span class="ab"><span class="a" style="width:' + w[0] + 'ch">' + a + '</span><span class="s">:</span><span class="z" style="width:' + w[1] + 'ch">' + b + '</span></span>';
  }
  function widths(pairs) {
    var w = [1, 1];
    pairs.forEach(function (p) { if (!p) return; w[0] = Math.max(w[0], String(p[0]).length); w[1] = Math.max(w[1], String(p[1]).length); });
    return w;
  }
  function signed(n) { return n > 0 ? '+' + n : n < 0 ? '−' + (-n) : '0'; }

  function overviewHtml(rows) {
    var ll = classic(st.league), lg = leagueOf(st.league);
    var played = rows.filter(function (x) { return x.m; }), finals = rows.filter(isFinal);
    var res = function (x) { return x.m ? (ll ? [R.fmt(x.res.homeSum), R.fmt(x.res.guestSum)] : [x.res.homePoints, x.res.guestPoints]) : null; };
    var gp = function (x) { return x.m ? [x.res.homeApp, x.res.guestApp] : null; };
    var wp = function (x) { return isFinal(x) ? [x.res.homeMatch, x.res.guestMatch] : null; };
    var wR = widths(rows.map(res)), wG = widths(rows.map(gp)), wW = widths(rows.map(wp));
    var hasOpen = played.some(function (x) { return !isFinal(x); });

    var games = rows.map(function (x) {
      var m = x.m || x.up, fin = isFinal(x);
      var hn = esc(R.teamName(m.homeTeamId)).replace(/\//g, '/<wbr>'), gn = esc(R.teamName(m.guestTeamId)).replace(/\//g, '/<wbr>');
      var cells = '';
      if (x.m) {
        var r = res(x), g = gp(x), w = wp(x);
        cells = '<td class="num b">' + ab(r[0], r[1], wR) + '</td><td class="num">' + ab(g[0], g[1], wG) + '</td>' +
          '<td class="num">' + (w ? ab(w[0], w[1], wW) : 'offen') + '</td><td class="pg"><a href="#p' + x.page + '">' + x.page + '</a></td>';
      } else cells = '<td></td><td></td><td></td><td></td>';
      return '<tr class="' + (x.m ? (fin ? '' : 'open') : 'todo') + '"><td>' + esc(R.fmtDate(m.date)) + '</td>' +
        '<td class="tn' + (fin && x.res.winner === 'home' ? ' win' : '') + '">' + hn + '</td>' +
        '<td class="tn' + (fin && x.res.winner === 'guest' ? ' win' : '') + '">' + gn + '</td>' + cells + '</tr>';
    }).join('');

    var tb = standings(rows);
    var wT = widths(tb.rows.map(function (e) { return [e.gpA, e.gpB]; }));
    var table = tb.rows.map(function (e) {
      return '<tr><td>' + e.place + '.</td><td class="b">' + esc(e.name) + '</td><td class="c">' + e.n + '</td><td class="c">' + e.w + '</td><td class="c">' + e.d + '</td><td class="c">' + e.l + '</td>' +
        '<td class="num">' + ab(e.gpA, e.gpB, wT) + '</td><td class="num">' + signed(e.diff) + '</td>' +
        (ll ? '<td class="num">' + R.fmt(e.sum) + '</td>' : '') + '<td class="num b">' + e.wp + '</td></tr>';
    }).join('');

    return '<div class="print-page rp-page"><section class="print-sheet rp-ov" id="uebersicht">' +
      '<div class="ps-head"><div class="ps-title">' + R.printLogo + '<div class="ps-titletext"><div class="ps-league">' + esc(lg.short + ' ' + st.year) + '</div>' +
      '<div class="ps-doc">Saisonübersicht</div></div></div>' +
      '<div class="ps-meta"><strong>Stand ' + esc(R.fmtDate(today())) + '</strong><br><span class="sub">' + finals.length + ' von ' + rows.length + ' Wettkämpfen gewertet</span></div></div>' +
      '<div class="rb-body"><div class="rb-sec"><div class="rb-h">Wettkämpfe<span>Seite = Protokoll im Anhang (anklickbar)</span></div>' +
      '<table class="rb"><thead><tr><th>Datum</th><th>Heim</th><th>Gast</th><th class="num">' + (ll ? 'Punkte' : 'Scorepunkte') + '</th><th class="num">Gerätepunkte</th><th class="num">Wettkampfpunkte</th><th class="num">Seite</th></tr></thead>' +
      '<tbody>' + (games || '<tr><td colspan="7" class="muted">Noch keine Wettkämpfe eingelesen oder eingetragen.</td></tr>') + '</tbody></table>' +
      (hasOpen ? '<p class="rb-note">offen = Wettkampf noch nicht abgeschlossen; er zählt noch nicht für die Tabelle.</p>' : '') + '</div>' +
      '<div class="rb-sec"><div class="rb-h">Tabelle</div>' +
      '<table class="rb"><thead><tr><th>Pl.</th><th>Mannschaft</th><th class="c">Wettk.</th><th class="c">S</th><th class="c">U</th><th class="c">N</th><th class="num">Gerätepunkte</th><th class="num">Diff.</th>' +
      (ll ? '<th class="num">Gesamtpunkte</th>' : '') + '<th class="num">Wettkampfpunkte</th></tr></thead><tbody>' + table + '</tbody></table>' +
      '<p class="rb-note">Reihenfolge: Wettkampfpunkte (gewonnene Punkte), dann Differenz der Gerätepunkte, dann direkter Vergleich.' +
      (ll ? ' Gesamtpunkte ohne Bedeutung für die Platzierung.' : '') + (tb.notes.length ? ' ' + esc(tb.notes.join(' ')) : '') + '</p></div></div>' +
      '</section></div>';
  }

  /** Protokoll aus der App; Knöpfe weg, eigene Seitenkennung und oben der Rücksprung zur Übersicht. */
  function protocolPage(x) {
    var html = R.protocolHtml(x.m);
    var box = document.createElement('div');
    box.innerHTML = html;
    var acts = box.querySelector('.print-actions');
    if (acts) acts.remove();
    var sheet = box.querySelector('.print-sheet');
    sheet.id = 'p' + x.page;
    sheet.insertAdjacentHTML('afterbegin', '<div class="rp-back"><a href="#uebersicht">↑ Saisonübersicht</a> · Seite ' + x.page + '</div>');
    var page = box.querySelector('.print-page');
    page.classList.add('rp-page');
    return page.outerHTML;
  }

  /** Übersicht füllt die Seite: Zeilen etwas höher, solange Platz ist; passt sie nicht, wird sie kleiner. */
  function fitOverview(sheet) {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:100mm';
    document.body.appendChild(probe);
    var mm = probe.offsetHeight / 100;
    probe.remove();
    var maxH = 277 * mm, tds = sheet.querySelectorAll('table.rb td');
    sheet.style.zoom = ''; sheet.style.width = ''; sheet.style.height = 'auto';
    var setPad = function (p) { tds.forEach(function (td) { td.style.paddingTop = td.style.paddingBottom = p + 'mm'; }); };
    setPad(0.9);
    if (sheet.scrollHeight > maxH) {
      var z = maxH / sheet.scrollHeight * 0.99;
      sheet.style.zoom = z;
      sheet.style.width = (190 / z) + 'mm';
      sheet.style.height = (277 / z) + 'mm';
      return;
    }
    for (var p = 1.0; p <= 2.2; p += 0.1) {
      setPad(p);
      if (sheet.scrollHeight > maxH * 0.9) { setPad(p - 0.1); break; }
    }
    sheet.style.height = '';
  }

  function renderPages() {
    var rows = seasonRows();
    var html = overviewHtml(rows) + rows.filter(function (x) { return x.m; }).map(protocolPage).join('');
    var box = $('rp-pages');
    box.innerHTML = html;
    var ov = box.querySelector('.rp-ov');
    if (ov) fitOverview(ov);
    box.querySelectorAll('.print-sheet:not(.rp-ov)').forEach(function (s) { R.fitSheet(s); });
  }

  // ---------- Bedienung ----------

  function teamOptions(sel) {
    var teams = R.leagueTeams(st.league).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<option value="">– wählen –</option>' + teams.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === sel ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
  }

  function renderControls() {
    $('rp-league').innerHTML = R.leagues.map(function (l) { return '<option value="' + l.key + '"' + (l.key === st.league ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('');
    var years = {};
    years[new Date().getFullYear()] = 1;
    years[st.year] = 1;
    st.records.forEach(function (r) { if ((r.match.league || R.leagues[0].key) === st.league && yearOf(r.match.date)) years[yearOf(r.match.date)] = 1; });
    st.upcoming.forEach(function (u) { if (u.league === st.league && yearOf(u.date)) years[yearOf(u.date)] = 1; });
    $('rp-year').innerHTML = Object.keys(years).sort().reverse().map(function (y) { return '<option value="' + y + '"' + (+y === st.year ? ' selected' : '') + '>' + y + '</option>'; }).join('');
    $('rp-up-home').innerHTML = teamOptions($('rp-up-home').value);
    $('rp-up-guest').innerHTML = teamOptions($('rp-up-guest').value);
  }

  function renderLists() {
    var played = seasonRecords();
    var other = st.records.length - played.length;
    $('rp-played').innerHTML = played.length ? '<table class="rp-list"><thead><tr><th>Datum</th><th>Begegnung</th><th class="num">Ergebnis</th><th>Datei</th><th></th></tr></thead><tbody>' +
      played.map(function (r) {
        var m = r.match, res = S.matchResult(m), ll = classic(m.league);
        var result = ll ? R.fmt(res.homeSum) + ' : ' + R.fmt(res.guestSum) : res.homePoints + ' : ' + res.guestPoints;
        return '<tr><td>' + esc(R.fmtDate(m.date)) + '</td><td>' + esc(R.teamName(m.homeTeamId)) + ' – ' + esc(R.teamName(m.guestTeamId)) +
          (m.status === 'final' ? '' : ' <span class="rp-tag">nicht abgeschlossen – zählt nicht</span>') + '</td>' +
          '<td class="num">' + result + '</td><td class="muted small">' + esc(r.file || '') + '</td>' +
          '<td class="act"><button class="btn small ghost" type="button" data-rp-del="' + esc(m.id) + '">Entfernen</button></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted small">Für diese Liga und Saison ist noch kein Wettkampf eingelesen.</p>';
    if (other > 0) $('rp-played').insertAdjacentHTML('beforeend', '<p class="muted small">Dazu ' + (other === 1 ? '1 Wettkampf' : other + ' Wettkämpfe') + ' anderer Ligen oder Saisons (oben auswählen).</p>');
    var up = st.upcoming.filter(function (u) { return u.league === st.league && yearOf(u.date) === st.year; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
    $('rp-upcoming').innerHTML = up.length ? '<table class="rp-list"><thead><tr><th>Datum</th><th>Heim</th><th>Gast</th><th></th><th></th></tr></thead><tbody>' +
      up.map(function (u) {
        var done = played.some(function (r) { return sameFixture(r.match, u); });
        return '<tr><td>' + esc(R.fmtDate(u.date)) + '</td><td>' + esc(R.teamName(u.homeTeamId)) + '</td><td>' + esc(R.teamName(u.guestTeamId)) + '</td>' +
          '<td>' + (done ? '<span class="muted small">Ergebnis eingelesen</span>' : '') + '</td>' +
          '<td class="act"><button class="btn small ghost" type="button" data-rp-undel="' + esc(u.id) + '">Entfernen</button></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted small">Noch keine Termine eingetragen.</p>';
  }

  function renderAll() {
    renderControls();
    renderLists();
    renderPages();
  }

  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function wire() {
    $('rp-ver').textContent = 'WTB-Liga ' + R.version;
    $('rp-league').addEventListener('change', function (e) { st.league = e.target.value; pref('liga', st.league); renderAll(); });
    $('rp-year').addEventListener('change', function (e) { st.year = parseInt(e.target.value, 10); pref('jahr', String(st.year)); renderAll(); });
    $('rp-files').addEventListener('change', function (e) { readFiles(e.target.files); e.target.value = ''; });
    var drop = $('rp-drop');
    ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); readFiles(e.dataTransfer.files); });
    // Dateien, die neben dem Feld losgelassen werden, nicht im Browser öffnen
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) { e.preventDefault(); });

    $('rp-up-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var u = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), league: st.league, date: $('rp-up-date').value,
        homeTeamId: $('rp-up-home').value, guestTeamId: $('rp-up-guest').value };
      if (!u.date || !u.homeTeamId || !u.guestTeamId) return;
      if (u.homeTeamId === u.guestTeamId) { msg('Heim und Gast müssen verschiedene Mannschaften sein.', true); return; }
      if (st.upcoming.some(function (x) { return sameFixture(x, u); })) { msg('Diesen Termin gibt es schon.', true); return; }
      st.upcoming.push(u);
      if (yearOf(u.date) !== st.year) { st.year = yearOf(u.date); pref('jahr', String(st.year)); }
      msg('');
      saveAll().then(renderAll);
    });
    document.addEventListener('click', function (e) {
      var del = e.target.closest('[data-rp-del]'), undel = e.target.closest('[data-rp-undel]');
      if (del) {
        st.records = st.records.filter(function (r) { return r.match.id !== del.getAttribute('data-rp-del'); });
        saveAll().then(renderAll);
      } else if (undel) {
        st.upcoming = st.upcoming.filter(function (u) { return u.id !== undel.getAttribute('data-rp-undel'); });
        saveAll().then(renderAll);
      }
    });
    $('rp-up-save').addEventListener('click', function () {
      download('wtb-ligabericht_TERMINE_' + today() + '.json', JSON.stringify({ format: UP_FORMAT, version: 1, exportedAt: new Date().toISOString(), upcoming: st.upcoming }, null, 2));
    });
    $('rp-up-load').addEventListener('change', function (e) {
      var f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      f.text().then(function (text) {
        var data = JSON.parse(text);
        if (!data || data.format !== UP_FORMAT || !Array.isArray(data.upcoming)) throw new Error('Keine Termindatei des Ligaberichts.');
        var n = 0;
        data.upcoming.forEach(function (u) {
          if (!u || !u.date || !u.homeTeamId || !u.guestTeamId || !u.league) return;
          if (st.upcoming.some(function (x) { return sameFixture(x, u); })) return;
          st.upcoming.push(u); n++;
        });
        msg(n + ' Termin(e) eingelesen.');
        return saveAll().then(renderAll);
      }).catch(function (err) { msg(esc(err.message), true); });
    });
    $('rp-print').addEventListener('click', function () { window.print(); });
  }

  // ---------- Start ----------

  Promise.all([kvGet('records'), kvGet('teams'), kvGet('upcoming')]).then(function (v) {
    st.records = (v[0] || []).map(function (r) { r.match = R.prepare(r.match); return r; });
    st.teams = v[1] || [];
    st.upcoming = v[2] || [];
    syncTeams();
    st.league = pref('liga') && R.leagues.some(function (l) { return l.key === pref('liga'); }) ? pref('liga') : R.leagues[0].key;
    st.year = parseInt(pref('jahr'), 10) || new Date().getFullYear();
    wire();
    renderAll();
  }).catch(function (e) {
    document.body.insertAdjacentHTML('afterbegin', '<div class="banner danger">Ligabericht konnte nicht starten: ' + esc(e.message) + '</div>');
  });
})();
