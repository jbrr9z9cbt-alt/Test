# Turnwettkampf – Gerätturnen männlich (WTB Oberliga 2026)

Offline-fähige Web-App zur Durchführung von Mannschaftswettkämpfen im Gerätturnen männlich
mit einem **Scoresystem nach dem Vorbild der Deutschen Turnliga (DTL)**.

## Funktionen

- **7 feste Mannschaften** (Name und Standardfarbe in `js/config.js`, in der App nicht änderbar)
- **20 Turner je Mannschaft** mit festen Startnummern 1–20; die Namen pflegen die Nutzer in der App
- **Mannschaftsfarben** werden beim Anlegen eines Wettkampfs gewählt – aus Rot, Blau, Orange, Hellgrau, Violett und Gelb
  (Heim und Gast verschieden)
- **Wettkampf Heim gegen Gast** an den sechs olympischen Geräten
  (Boden, Pauschenpferd, Ringe, Sprung, Barren, Reck)
- **Duell-Erfassung** je Gerät: D-Note, zwei E-Abzüge, neutraler Abzug → Endnote; „nicht angetreten“ zählt 0,000
  - **E-Note = 10 − Mittelwert der beiden E-Abzüge** (Abzüge mit höchstens 2 Nachkommastellen)
  - Endnote = D-Note + E-Note − neutraler Abzug
- **Automatische Wertung**: Scorepunkte je Duell nach Notendifferenz, Gerätepunkte, Gesamtergebnis, Tabellenpunkte
- **Scorer-Wertung** (bester Scorer des Wettkampfs)
- **Anzeigetafel** für Beamer/Fernseher (zweites Fenster bzw. Tab auf demselben Gerät):
  - Ergebnisse eines Duells erscheinen erst, wenn bei der Erfassung **„Wertung anzeigen“** gedrückt wird
  - Dann werden die neuen Scorepunkte **5 Sekunden bildschirmfüllend** als Zahl in der Farbe der
    siegreichen Mannschaft eingeblendet, leicht blinkend (bei Gleichstand eine graue 0)
  - Das zuletzt angezeigte Duell steht mit **D-Note, E-Note, neutralem Abzug (falls vorhanden) und Endnote** auf der Tafel
- **Nachträgliche Änderungen**: Wird eine bereits angezeigte Wertung geändert, zeigt die Tafel weiter den alten Stand.
  Alle anderen Duelle sind gesperrt, bis die Korrektur mit **„Korrektur anzeigen“** auf die Tafel gebracht
  oder mit „Änderung verwerfen“ zurückgenommen wurde. Auch das Abschließen des Wettkampfs ist bis dahin gesperrt.
  Die Korrektur erscheint **10 Sekunden als Overlay** über der Anzeigetafel (alte Werte durchgestrichen, neue Werte daneben).
- **Protokoll** zum Drucken bzw. Speichern als PDF – passt immer auf **eine DIN-A4-Seite im Hochformat**
  (wird bei Bedarf automatisch verkleinert)
- Abgeschlossene Wettkämpfe sind **schreibgeschützt** (lassen sich bewusst wieder öffnen)

## Mannschaften festlegen (nur Betreiber)

In `js/config.js` stehen der Liganame (`league`) und die 7 Mannschaften mit `id` und `name`.
Die Namen dürfen dort geändert werden; die `id` bitte **nie** ändern, sonst verlieren
bereits erfasste Wettkämpfe und Turnernamen die Zuordnung. Nach einer Änderung neu
veröffentlichen (Push auf `main`) – die installierten Apps laden das Update beim nächsten Start mit Internet.

## Wertungsregeln (Standard, frei anpassbar)

| Notendifferenz | Scorepunkte für den Sieger des Duells |
|---|---|
| unter 0,05 | 0 (Unentschieden) |
| ab 0,05 | 1 |
| ab 0,35 | 2 |
| ab 0,65 | 3 |
| ab 1,00 | 4 |
| ab 1,50 | 5 |

- 4 Duelle pro Gerät
- Gerätepunkte: Sieg 2, Unentschieden je 1 (werden vergeben, sobald alle Duelle eines Geräts gewertet sind)
- Mannschaftspunkte: Sieg 2, Unentschieden je 1. Sieger ist, wer mehr Scorepunkte hat.
- Die Ligatabelle gehört nicht zur App, sie ist für eine separate Liga-Webseite vorgesehen.

> **Hinweis:** Die Werte sind an die DTL angelehnt, aber **nicht** mit der aktuellen
> DTL-Wettkampfordnung abgeglichen. Bitte unter **„Daten & Regeln“** an die gültige
> Ausschreibung eurer Liga anpassen. Jeder Wettkampf speichert beim Anlegen eine eigene
> Kopie der Regeln, spätere Änderungen verändern also keine alten Ergebnisse.

## Offline-Betrieb und Datensicherheit

- **Kein Server, keine Cloud**: alle Daten bleiben auf dem Gerät (IndexedDB im Browser).
- **Sofortiges Speichern**: jede Eingabe wird direkt dauerhaft geschrieben („durability: strict“).
- **Dauerhafter Speicher**: die App fordert beim Browser an, dass die Daten nicht automatisch gelöscht werden.
- **Automatische Sicherungspunkte**: die letzten 30 Stände werden aufbewahrt und lassen sich wiederherstellen.
  Vor Import, Wiederherstellung und Löschen wird immer zuerst gesichert.
- **Export/Import** als JSON-Datei, optional **verschlüsselt** (AES-GCM 256 Bit, Schlüssel per
  PBKDF2-SHA-256 mit 310.000 Runden aus einem Passwort). Ohne Passwort ist die Datei nicht lesbar.
- **Offline-fähig (PWA)**: ein Service Worker hält die App im Cache. Nach dem ersten Aufruf
  funktioniert sie ohne Internet und lässt sich als App installieren („Zum Startbildschirm hinzufügen“).

**Empfehlung:** Nach jedem Wettkampf eine verschlüsselte Sicherung auf einen USB-Stick o. Ä. exportieren,
denn wenn das Gerät verloren geht oder die Browserdaten gelöscht werden, sind auch die lokalen Daten weg.

## Starten

Keine Installation und keine Abhängigkeiten nötig: reines HTML/CSS/JavaScript.

- **Direkt**: `index.html` im Browser öffnen. Das funktioniert ohne Internet, aber ohne Service Worker.
- **Lokaler Server** (empfohlen, aktiviert den PWA-Offline-Cache):
  ```bash
  npm start        # entspricht: python3 -m http.server 8080
  ```
  dann <http://localhost:8080> öffnen.
- **Hosting**: z. B. über GitHub Pages veröffentlichen, einmal online öffnen und installieren.
  Danach läuft die App vollständig offline.

## Tests

```bash
npm test
```

Die Tests prüfen Notenberechnung, Scorepunkte-Schwellen, Geräte- und Tabellenpunkte sowie die
verschlüsselte Sicherung.

## Aufbau

```
index.html            App-Gerüst
css/style.css         Gestaltung (inkl. Anzeigetafel, Druck, Mobil)
js/config.js          Feste Mannschaften (nur vom Betreiber zu ändern)
js/scoring.js         Wertungslogik (ohne Abhängigkeiten, getestet)
js/db.js              Speicherung in IndexedDB, Sicherungspunkte
js/crypto.js          Verschlüsselte Sicherungen (Web Crypto)
js/app.js             Oberfläche und Ablaufsteuerung
sw.js                 Service Worker für den Offline-Betrieb
manifest.webmanifest  PWA-Manifest
tests/                Unit-Tests (node --test)
```
