# WTB-Liga – Wettkampf-App Gerätturnen männlich

Offline-fähige Web-App zur Durchführung von Mannschaftswettkämpfen im Gerätturnen männlich –
**Oberliga** mit einem Scoresystem nach dem Vorbild der Deutschen Turnliga (DTL),
**Landesliga** mit dem klassischen Modell (die drei besten Wertungen je Gerät zählen).

## Seiten

Kopfzeile je Liga: Wettkämpfe · Mannschaften · Regeln · Datensicherung · Anleitung (Kurzanleitung zur Bedienung).
Adressen: `#/oberliga/…` bzw. `#/landesliga/…`; ein Wettkampf (`#/match/<id>`) gehört fest zu seiner Liga.

## Startseite

Beim Öffnen wählt man die Liga: **Oberliga** oder **Landesliga**. Beide nutzen denselben Kern
(Eingabe, Timer, Anzeigetafel, Protokoll, Datensicherung); nur Wertungsmodell und Darstellung unterscheiden sich.

## Landesliga (klassisches Modell)

- Je Gerät bis zu 4 Turner pro Mannschaft, **abwechselnd** (A1, B1, A2, B2 …); die beginnende Mannschaft
  wird ausgelost und wechselt an jedem Gerät.
- Eingabe: links die Turner der am Gerät beginnenden Mannschaft, rechts die der anderen, mit Startposition 1–8.
- Jede Übung wird **einzeln freigegeben** und auf der Tafel gezeigt (Endnote 5 s groß in Mannschaftsfarbe).
- Je Mannschaft und Gerät zählen die **3 höchsten Wertungen**; die niedrigste ist die **Streichwertung**
  (bei Gleichstand die später geturnte) und wird in Eingabe, Tafel und Protokoll durchgestrichen gekennzeichnet.
- Gerätepunkte 2/1/0 nach Gerätesumme, Sieger nach Gesamtpunktzahl (2/1/0 Punkte).
- Topscorer: die drei Turner mit der höchsten Summe ihrer geturnten Wertungen.
- Mannschaften: TSV Kierspe 2, TuS Leopoldshöhe 2, TV Jahn Plettenberg, SG Wünnenberg/Elsen,
  TuS Stockum, SG Coesfeld, SG Langenei-Kickenbach/Gleidorf (Turner noch offen).

## Funktionen (Oberliga)

- **7 feste Mannschaften** mit vorgegebenen Turnern (Startnummern 1–20) aus `js/config.js`
- Der Ausrichter kann Turnernamen korrigieren und freie Startnummern belegen. Wird die vorgegebene
  Turnerliste mit einem Update geändert (`rosterVersion`), gilt wieder der vorgegebene Stand –
  bereits erfasste Wettkämpfe behalten ihre Namen.
- **Mannschaftsfarben** werden beim Anlegen eines Wettkampfs gewählt – aus Rot, Blau, Orange, Hellgrau, Violett, Gelb und Grün
  (Heim und Gast verschieden)
- **Wettkampf Heim gegen Gast** an den sechs olympischen Geräten
  (Boden, Pauschenpferd, Ringe, Sprung, Barren, Reck)
- **Wettkampf anlegen**: Datum, beginnende Mannschaft, Heim/Gast mit Farbe und Mannschaftsführer,
  Kampfgericht (E1 Oberkampfrichter, E2 neutral, D1 Vereinskampfrichter Heim, D2 Vereinskampfrichter Gast).
  Ohne neutralen E2 werden E2 (Heim) und E3 (Gast) eingetragen.
- **Anwesende Turner**: Nach der Wahl der Vereine stehen auf derselben Seite alle Turner beider
  Mannschaften zum Abhaken (zunächst alle abgehakt; Fehlende abwählen). Namen lassen sich dort
  korrigieren und auf freien Startnummern ergänzen – das wird sofort in die Mannschaftsliste übernommen.
  Bei der Wertungseingabe stehen nur die abgehakten Turner zur Auswahl. Änderbar über „Bearbeiten“.
- **Startreihenfolge** (lt. Scoresystem): Die am Gerät beginnende Mannschaft beginnt Duell 1+2, die andere
  Duell 3+4; bei jedem Gerätewechsel wechselt die beginnende Mannschaft.
  In der Erfassung steht der **vorlegende Turner** links (bzw. oben auf schmalen Bildschirmen) und ist markiert;
  im Protokoll ist er fett mit ▶/◀ gekennzeichnet. Auf der Anzeigetafel bleiben Heim links und Gast rechts.
- **Zahlenformat**: D-Note, E-Abzüge und neutraler Abzug mit einer Nachkommastelle, E-Note und Endnote mit zwei.
- **Eingabeboxen** zeigen den Mannschaftsnamen; die Scorepunkte des Duells erscheinen als einzelne Zahl in der
  Farbe der Mannschaft, die das Duell gewonnen hat (unentschieden: graue 0).
- **Nicht angetreten** löscht Turner und bereits eingegebene Wertungen dieser Übung (nach Rückfrage).
- **Wertung 0,00 (angetreten)** gibt einem angetretenen Turner die Endnote 0; eine D-Note 0 wird dagegen ganz normal
  mit den Abzügen berechnet.
- **Sturz-Timer** an jeder Übung (nicht an Boden und Sprung): 30 s gelb, danach 30 s rot mit „Abzug 0,3“.
  **Einturn-Timer** je Gerät: 4:00 (hellgrün). Beide laufen im Knopf und in der Anzeigetafel und lassen sich mit
  erneutem Druck jederzeit beenden. Nach Ablauf zeigt die Tafel „Einturnen beendet“ (10 s) bzw.
  „Übung beendet“ (5 s), leicht blinkend.
- **Akustische Signale** (im Eingabefenster): Ende der Einturnzeit = Schelle 5 Sekunden; Sturz-Timer nach
  30 s = kurzer Doppelton, nach 60 s = kurzer Fehlerton. Nach manuellem Stopp ertönt nichts.
- **Scorepunkte** werden überall in der Farbe der jeweiligen Mannschaft angezeigt; eine Notensumme gibt es nicht.
- **Topscorer** (App und Protokoll): die ersten drei Plätze, bei Gleichstand entsprechend mehr (z. B. 1., 1., 3.).
- **Duell-Erfassung** je Gerät: D-Note, E-Abzüge, neutraler Abzug, Standbonus → Endnote; „nicht angetreten“ zählt 0,000
  - **E-Note mit neutralem E2: 10 − Mittelwert von E1 und E2**
  - **E-Note mit drei E-Kampfrichtern: höchster und niedrigster Abzug gestrichen, 10 − mittlerer Abzug**
  - Abzüge mit höchstens 2 Nachkommastellen
  - **Standbonus** +0,1 (nicht am Pauschenpferd)
  - Endnote = D-Note + Standbonus + E-Note − neutraler Abzug
  - **Eingabereihenfolge** je Übung: Abzüge E1, E2 (ggf. E3), D-Note, Standbonus, neutraler Abzug
  - **Tastatur**: Gerät mit der Maus wählen, dann führt Tab durch den ganzen Ablauf: Turnerauswahl des
    vorlegenden Turners, E1, E2, (E3), D-Note, Standbonus, neutraler Abzug, dann der gegnerische Turner
    genauso, zuletzt „Wertung freigeben“ – danach weiter mit dem vorlegenden Turner des nächsten Duells.
    Enter öffnet die Turnerauswahl, Pfeiltasten wählen, Enter übernimmt (weiter zu E1);
    Enter schaltet den Standbonus um und wirkt in Notenfeldern wie Tab;
    Pfeiltasten ↑/↓ ändern Noten in 0,1-Schritten (nie unter 0)
- **Automatische Wertung**: Scorepunkte je Duell nach Notendifferenz, Gerätepunkte, Gesamtergebnis, Tabellenpunkte
- **Anzeigetafel** für Beamer/Fernseher (zweites Fenster bzw. Tab auf demselben Gerät):
  - Knopf „Anzeigetafel“ öffnet das Tafel-Fenster (bzw. holt es nach vorn); beendet wird sie durch Schließen des Fensters
  - Knöpfe „Hell“ / „Dunkel“ daneben: hell ist Standard (gut lesbar mit Beamer in heller Halle),
    dunkel eignet sich für Fernseher, LED-Wände und abgedunkelte Räume
  - Knopf „Topscorer einblenden/ausblenden“ legt die Topscorer als Overlay über die Tafel
  - passt sich automatisch ins Fenster ein (keine Scrollbalken); Timer und Detailwertungen haben feste Plätze
  - Ergebnisse eines Duells erscheinen erst, wenn bei der Erfassung **„Wertung freigeben“** gedrückt wird.
    Der Knopf ist erst aktiv, wenn beide Turner gewählt und vollständig gewertet sind
    (bei „nicht angetreten“ ohne Turner und Wertung)
  - Dann werden die neuen Scorepunkte **5 Sekunden bildschirmfüllend** als Zahl in der Farbe der
    siegreichen Mannschaft eingeblendet, leicht blinkend (bei Gleichstand eine graue 0)
  - Das zuletzt angezeigte Duell steht mit **D-Note, E-Note, neutralem Abzug (falls vorhanden) und Endnote** auf der Tafel
- **Nachträgliche Änderungen**: Wird eine bereits angezeigte Wertung geändert, zeigt die Tafel weiter den alten Stand.
  Alle anderen Duelle sind gesperrt, bis die Korrektur mit **„Korrektur freigeben“** auf die Tafel gebracht
  oder mit „Änderung verwerfen“ zurückgenommen wurde. Auch das Abschließen des Wettkampfs ist bis dahin gesperrt.
  Die Korrektur erscheint **10 Sekunden als Overlay** über der Anzeigetafel (alte Werte durchgestrichen, neue Werte daneben).
- **Protokoll** zum Drucken bzw. Speichern als PDF – passt immer auf **eine DIN-A4-Seite im Hochformat**
  (wird bei Bedarf automatisch verkleinert)
- Abgeschlossene Wettkämpfe sind **schreibgeschützt** (lassen sich bewusst wieder öffnen)

## Mannschaften festlegen (nur Betreiber)

In `js/config.js` stehen je Liga (`leagues`) Schlüssel, Name, Wertungsmodell (`score` bzw. `classic`),
`rosterVersion` und die Mannschaften mit `id`, `name` und vorgegebenen Turnern.
Die Namen dürfen dort geändert werden; die `id` bitte **nie** ändern, sonst verlieren
bereits erfasste Wettkämpfe und Turnernamen die Zuordnung. Nach einer Änderung neu
veröffentlichen (Push auf `main`) – die installierten Apps laden das Update beim nächsten Start mit Internet.

## Wertungsregeln (fest, WTB-Oberliga-Scoresystem Stand 20.09.2025)

Die Regeln sind in der App **nicht änderbar** (auf der Seite „Regeln“ zusammen mit einer Kurzfassung des Scoresystems angezeigt).

| Notendifferenz | Scorepunkte für den Sieger des Duells |
|---|---|
| unter 0,15 | 0 (unentschieden) |
| von 0,15 bis 0,40 | 1 |
| von 0,45 bis 1,00 | 2 |
| von 1,05 bis 2,00 | 3 |
| von 2,05 bis 3,00 | 4 |
| ab 3,05 | 5 |

- 4 Duelle pro Gerät; eine nicht besetzte Übung zählt 0 Punkte
- Gerät und Wettkampf gewinnt, wer mehr Scorepunkte hat; bei Gleichstand unentschieden
- Die Ligatabelle gehört nicht zur App, sie ist für eine separate Liga-Webseite vorgesehen.

## Offline-Betrieb und Datensicherheit

- **Kein Server, keine Cloud**: alle Daten bleiben auf dem Gerät (IndexedDB im Browser).
- **Sofortiges Speichern**: jede Eingabe wird direkt dauerhaft geschrieben („durability: strict“).
- **Dauerhafter Speicher**: die App fordert beim Browser an, dass die Daten nicht automatisch gelöscht werden.
- **Automatische Sicherungspunkte**: die letzten 30 Stände werden aufbewahrt und lassen sich wiederherstellen.
  Vor Import, Wiederherstellung und Löschen wird immer zuerst gesichert.
- **Export/Import** als JSON-Datei, **getrennt je Liga** (Dateinamen beginnen mit `wtb-oberliga_` bzw. `wtb-landesliga_`), wahlweise
  - **Gesamtsicherung** (`wtb-<liga>_GESAMTSICHERUNG_<Datum>_<Uhrzeit>.json`): alle Mannschaften,
    Turnernamen und Wettkämpfe der Liga; beim Import werden nur die Daten dieser Liga ersetzt.
    Eine Datei der anderen Liga wird abgelehnt.
  - **Einzelner Wettkampf** (`wtb-<liga>_EINZELWETTKAMPF_<Datum>_<Heim>_<Gast>.json`): nur dieser
    Wettkampf; beim Import wird er hinzugefügt bzw. ersetzt nur denselben Wettkampf, alles andere bleibt.

  Nach dem Abschließen eines Wettkampfs fragt die App „Nur diesen Wettkampf“ / „Alles sichern“ / „Nein“ –
  die Daten bleiben auch ohne diese Sicherung gespeichert. Ältere, verschlüsselt exportierte Dateien lassen sich weiterhin
  importieren (die App fragt dann nach dem Passwort).
- **Alle Daten löschen** (je Liga) entfernt alle Wettkämpfe und eigene Änderungen an den Turnernamen dieser Liga;
  die Mannschaften und die vorgegebenen Turner aus `js/config.js` bleiben sofort erhalten.
- **Offline-fähig (PWA)**: ein Service Worker hält die App im Cache. Nach dem ersten Aufruf
  funktioniert sie ohne Internet und lässt sich als App installieren („Zum Startbildschirm hinzufügen“).
- **Updates**: Die App sucht beim Start und alle 30 Minuten (wenn online) nach einer neuen Version,
  lädt sie im Hintergrund und zeigt „Jetzt aktualisieren“. Erst nach dem Klick wird sie aktiv;
  die Daten bleiben erhalten. Beim Veröffentlichen muss `VERSION` in `sw.js` (und `APP_BUILD` in
  `js/app.js`) erhöht werden. Angezeigt wird in der Testphase „Beta <APP_BUILD>“ (`APP_LABEL`);
  zur Freigabe wird `APP_LABEL` auf „Version 1.0“ umgestellt.

**Empfehlung:** Nach jedem Wettkampf eine Sicherung auf einen USB-Stick o. Ä. exportieren,
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
