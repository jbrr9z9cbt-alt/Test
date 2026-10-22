/*
 * Lokale Datenhaltung in IndexedDB.
 *
 * - Jede Änderung wird sofort in einer eigenen Transaktion mit
 *   durability "strict" geschrieben (Daten liegen danach auf dem Datenträger).
 * - Zusätzlich werden automatische Sicherungspunkte (Snapshots) des gesamten
 *   Datenbestands angelegt, aus denen wiederhergestellt werden kann.
 * - Der Browser wird um dauerhaften Speicher gebeten (navigator.storage.persist),
 *   damit die Daten nicht bei Speicherknappheit gelöscht werden.
 * - Ist IndexedDB nicht verfügbar (z. B. privater Modus), läuft die App im
 *   Arbeitsspeicher weiter und zeigt eine deutliche Warnung.
 */
(function (root) {
  'use strict';

  var DB_NAME = 'turnwettkampf';
  var DB_VERSION = 1;
  var STORES = ['teams', 'matches', 'meta'];
  var SNAPSHOT_STORE = 'snapshots';
  var MAX_SNAPSHOTS = 30;

  var db = null;
  var memory = null; // Fallback ohne IndexedDB

  function req(r) {
    return new Promise(function (resolve, reject) {
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function done(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('Transaktion abgebrochen')); };
    });
  }

  function tx(stores, mode) {
    return db.transaction(stores, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
  }

  function open() {
    return new Promise(function (resolve) {
      var idb;
      try { idb = root.indexedDB; } catch (e) { idb = null; }
      if (!idb) { memory = { teams: {}, matches: {}, meta: {}, snapshots: [] }; resolve(false); return; }
      var r;
      try { r = idb.open(DB_NAME, DB_VERSION); } catch (e) { memory = { teams: {}, matches: {}, meta: {}, snapshots: [] }; resolve(false); return; }
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('teams')) d.createObjectStore('teams', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('matches')) d.createObjectStore('matches', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
        if (!d.objectStoreNames.contains(SNAPSHOT_STORE)) d.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = function () {
        db = r.result;
        db.onversionchange = function () { db.close(); root.location.reload(); };
        resolve(true);
      };
      r.onerror = function () { memory = { teams: {}, matches: {}, meta: {}, snapshots: [] }; resolve(false); };
      r.onblocked = function () { /* andere Tabs schließen sich über onversionchange */ };
    });
  }

  function isPersistentBackend() {
    return !!db;
  }

  function keyOf(store, obj) {
    return store === 'meta' ? obj.key : obj.id;
  }

  function getAll(store) {
    if (memory) {
      return Promise.resolve(Object.keys(memory[store]).map(function (k) { return JSON.parse(JSON.stringify(memory[store][k])); }));
    }
    return req(tx(store, 'readonly').objectStore(store).getAll());
  }

  function get(store, key) {
    if (memory) {
      var v = memory[store][key];
      return Promise.resolve(v ? JSON.parse(JSON.stringify(v)) : undefined);
    }
    return req(tx(store, 'readonly').objectStore(store).get(key));
  }

  function put(store, obj) {
    if (memory) { memory[store][keyOf(store, obj)] = JSON.parse(JSON.stringify(obj)); return Promise.resolve(); }
    var t = tx(store, 'readwrite');
    t.objectStore(store).put(obj);
    return done(t);
  }

  function del(store, key) {
    if (memory) { delete memory[store][key]; return Promise.resolve(); }
    var t = tx(store, 'readwrite');
    t.objectStore(store).delete(key);
    return done(t);
  }

  /** Ersetzt den gesamten Datenbestand atomar (alles oder nichts). */
  function replaceAll(data) {
    if (memory) {
      STORES.forEach(function (s) { memory[s] = {}; });
      (data.teams || []).forEach(function (t) { memory.teams[t.id] = t; });
      (data.matches || []).forEach(function (m) { memory.matches[m.id] = m; });
      (data.meta || []).forEach(function (m) { memory.meta[m.key] = m; });
      return Promise.resolve();
    }
    var t = tx(STORES, 'readwrite');
    STORES.forEach(function (s) { t.objectStore(s).clear(); });
    (data.teams || []).forEach(function (x) { t.objectStore('teams').put(x); });
    (data.matches || []).forEach(function (x) { t.objectStore('matches').put(x); });
    (data.meta || []).forEach(function (x) { t.objectStore('meta').put(x); });
    return done(t);
  }

  /** counts (optional): Anzahl Mannschaften/Wettkämpfe je Liga, z. B. { oberliga: { teams: 7, matches: 3 } }. */
  function addSnapshot(data, reason, counts) {
    var snap = {
      ts: new Date().toISOString(),
      reason: reason || 'automatisch',
      teams: (data.teams || []).length,
      matches: (data.matches || []).length,
      counts: counts || null,
      data: data
    };
    if (memory) {
      snap.id = memory.snapshots.length ? memory.snapshots[memory.snapshots.length - 1].id + 1 : 1;
      memory.snapshots.push(JSON.parse(JSON.stringify(snap)));
      while (memory.snapshots.length > MAX_SNAPSHOTS) memory.snapshots.shift();
      return Promise.resolve();
    }
    var t = tx(SNAPSHOT_STORE, 'readwrite');
    var store = t.objectStore(SNAPSHOT_STORE);
    store.add(snap);
    // Älteste Sicherungspunkte über dem Limit entfernen.
    var countReq = store.count();
    countReq.onsuccess = function () {
      var excess = countReq.result - MAX_SNAPSHOTS;
      if (excess <= 0) return;
      store.openCursor().onsuccess = function (ev) {
        var cursor = ev.target.result;
        if (!cursor || excess <= 0) return;
        cursor.delete();
        excess--;
        cursor.continue();
      };
    };
    return done(t);
  }

  function listSnapshots() {
    if (memory) {
      return Promise.resolve(memory.snapshots.map(function (s) { return { id: s.id, ts: s.ts, reason: s.reason, teams: s.teams, matches: s.matches, counts: s.counts }; }).reverse());
    }
    return new Promise(function (resolve, reject) {
      var out = [];
      var t = tx(SNAPSHOT_STORE, 'readonly');
      var r = t.objectStore(SNAPSHOT_STORE).openCursor(null, 'prev');
      r.onsuccess = function () {
        var c = r.result;
        if (!c) { resolve(out); return; }
        var v = c.value;
        out.push({ id: v.id, ts: v.ts, reason: v.reason, teams: v.teams, matches: v.matches, counts: v.counts });
        c.continue();
      };
      r.onerror = function () { reject(r.error); };
    });
  }

  function getSnapshot(id) {
    if (memory) {
      var s = memory.snapshots.filter(function (x) { return x.id === id; })[0];
      return Promise.resolve(s ? JSON.parse(JSON.stringify(s)) : undefined);
    }
    return req(tx(SNAPSHOT_STORE, 'readonly').objectStore(SNAPSHOT_STORE).get(id));
  }

  function storageInfo() {
    var info = { backend: db ? 'IndexedDB' : 'Arbeitsspeicher (nicht dauerhaft!)', persisted: null, usage: null, quota: null };
    var s = root.navigator && root.navigator.storage;
    if (!s || !db) return Promise.resolve(info);
    return Promise.all([
      s.persisted ? s.persisted().catch(function () { return null; }) : null,
      s.estimate ? s.estimate().catch(function () { return null; }) : null
    ]).then(function (res) {
      info.persisted = res[0];
      if (res[1]) { info.usage = res[1].usage; info.quota = res[1].quota; }
      return info;
    });
  }

  function requestPersist() {
    var s = root.navigator && root.navigator.storage;
    if (!s || !s.persist || !db) return Promise.resolve(false);
    return s.persist().catch(function () { return false; });
  }

  root.DB = {
    open: open,
    isPersistentBackend: isPersistentBackend,
    getAll: getAll,
    get: get,
    put: put,
    del: del,
    replaceAll: replaceAll,
    addSnapshot: addSnapshot,
    listSnapshots: listSnapshots,
    getSnapshot: getSnapshot,
    storageInfo: storageInfo,
    requestPersist: requestPersist
  };
})(this);
