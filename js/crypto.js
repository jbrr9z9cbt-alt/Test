/*
 * Verschlüsselte Datensicherungen: AES-GCM 256 Bit, Schlüssel per PBKDF2-SHA-256
 * aus einem Passwort abgeleitet. Läuft vollständig lokal im Browser (Web Crypto API).
 */
(function (root) {
  'use strict';

  var FORMAT = 'turnwettkampf-encrypted';
  var ITERATIONS = 310000;
  var subtle = root.crypto && root.crypto.subtle;

  function available() {
    return !!subtle;
  }

  function toB64(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  function fromB64(str) {
    var s = atob(str);
    var bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes;
  }

  function deriveKey(password, salt, iterations) {
    return subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          base,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      });
  }

  function encryptJSON(obj, password) {
    if (!available()) return Promise.reject(new Error('Verschlüsselung wird von diesem Browser nicht unterstützt.'));
    var salt = root.crypto.getRandomValues(new Uint8Array(16));
    var iv = root.crypto.getRandomValues(new Uint8Array(12));
    var plain = new TextEncoder().encode(JSON.stringify(obj));
    return deriveKey(password, salt, ITERATIONS)
      .then(function (key) { return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain); })
      .then(function (cipher) {
        return {
          format: FORMAT,
          version: 1,
          kdf: 'PBKDF2-SHA-256',
          iterations: ITERATIONS,
          cipher: 'AES-GCM-256',
          salt: toB64(salt),
          iv: toB64(iv),
          data: toB64(cipher)
        };
      });
  }

  function decryptJSON(envelope, password) {
    if (!available()) return Promise.reject(new Error('Verschlüsselung wird von diesem Browser nicht unterstützt.'));
    return deriveKey(password, fromB64(envelope.salt), envelope.iterations)
      .then(function (key) {
        return subtle.decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key, fromB64(envelope.data));
      })
      .then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); })
      .catch(function () { throw new Error('Falsches Passwort oder beschädigte Datei.'); });
  }

  function isEncrypted(obj) {
    return !!obj && obj.format === FORMAT;
  }

  var api = { available: available, encryptJSON: encryptJSON, decryptJSON: decryptJSON, isEncrypted: isEncrypted };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SecureBackup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
