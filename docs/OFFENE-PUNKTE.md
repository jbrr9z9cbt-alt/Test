# Offene Punkte (noch nicht umgesetzt)

## Beschlossen, für die nächste Beta (Verschlankung, Schritt für Schritt besprochen)

1. **Datensicherung auf die Seite „Wettkämpfe“ verlagern** (beschlossen, keine Vorschaubilder nötig):
   - In jeder Wettkampfzeile rechts kleine Knöpfe **„Sichern“** (Einzelsicherung) und **„Löschen“** (bisherige Rückfrage,
     vorher automatischer Sicherungspunkt). Klick auf die übrige Zeile öffnet den Wettkampf. Auf dem Handy rutschen die Knöpfe nach unten.
   - Unter der Liste Block **„Gesamtsicherung der <Liga>“** mit „Alles sichern“ (Hinweis zum Dateinamen) und
     **„Sicherung einlesen …“** (Import von Gesamt- und Einzelsicherungen wie bisher, vorher Sicherungspunkt).
   - Darunter Block **„Datenspeicher“** wie bisher, darunter **„Automatische Sicherungspunkte (n) ▸“** eingeklappt,
     ganz unten klein und rot **„Alle Daten löschen …“** mit der bisherigen doppelten Abfrage (Eingabe „LÖSCHEN“).
   - Der **„Löschen“-Knopf auf der Wettkampfseite entfällt**.
   - Der **Menüpunkt „Datensicherung“** in der oberen Leiste entfällt; Anleitung, Infoseite und README auf die neue Stelle anpassen.

2. ~~Menü „☰ Wettkampf“~~ – **verworfen**: Die Wettkampf-Knöpfe (Setup, Abschließen bzw. Wieder öffnen, Protokoll) bleiben wie sie sind;
   nur „Löschen“ wandert auf die Seite „Wettkämpfe“ (Punkt 1).

3. **Anzeigetafel-Knöpfe** (beschlossen):
   - „Wettkampfergebnis einblenden/ausblenden“ heißt künftig **„Ergebnis/Siegerehrung“**; die Beschriftung bleibt gleich,
     ob eingeblendet ist, zeigt der Knopf als dunkel hinterlegten Zustand (wie Hell/Dunkel). Die Tafel selbst bleibt unverändert.
   - **Turnervorstellung**: Während sie läuft, wird der Knopf nicht breiter, sondern zeigt nur **◀ ▶ ■**
     (zurück, weiter, beenden) in der Größe des bisherigen Knopfs. Die lange Steuerleiste mit „Gast · Turner 3/7“ entfällt
     (war auf dem Handy viel zu breit). ◀ ist auf der ersten Seite ausgegraut; Tastatur/Presenter wie bisher.
   - Anleitung und README anpassen.

4. **Oberer Bereich der Wettkampfseite am Laptop** (beschlossen, ab ca. 1100 px Fensterbreite; Tablet hochkant/Handy unverändert):
   - Übernommen aus dem verworfenen Beta-75-Entwurf (Commit 1548b6a, rückgängig in 5fab9a1), aber **nur der obere Bereich**:
     - Kopfzeile einzeilig: Liga · Datum · Beginn · Status, Mannschaften mit Stand, Gerätepunkte.
     - Werkzeugzeile darunter: links Anzeigetafel + Hell/Dunkel, Turnervorstellung (◀ ▶ ■), Wettkampfpause, Ergebnis/Siegerehrung;
       rechts Setup, Abschließen bzw. Wieder öffnen, Protokoll als normale Knöpfe (kein ☰-Menü; Löschen entfällt hier).
     - Gerätereiter flach einzeilig: kleines Logo, Name, Stand; Logo bleibt, solange Platz ist, sonst Name gekürzt.
   - **Nur der obere Bereich in voller Fensterbreite**; Wertungskacheln bleiben vorerst wie heute (mittig, ca. 1150 px).
   - Der obere Bereich **einschließlich Gerätereiter bleibt beim Scrollen oben stehen** (fixiert, nur am Laptop;
     auf dem Handy nicht, dort würde er zu viel Platz belegen). Verbleibendes Scrollen wird vorerst in Kauf genommen.

5. **Wertungskacheln flacher** (beschlossen, ohne Vorschaubilder):
   - Am Laptop (ab ca. 1100 px) dürfen die Kacheln die **volle Fensterbreite** nutzen (zwei Spalten wie heute;
     Oberliga mit Mittelspalte für das Duell). Damit gilt für die ganze Wettkampfseite am Laptop die volle Breite.
   - **Überschriften „E-Kampfgericht“/„D-Kampfgericht“ und die Gruppenrahmen entfallen – überall, auch auf dem Handy**;
     jedes Feld behält seine Beschriftung („Abzüge E1“, „D-Note“, „Standbonus“, „Neutr. Abzug“). Kleiner Abstand trennt E- und D-Felder.
   - Am Laptop: **E-Note und Endnote in derselben Zeile** hinter den Eingabefeldern (passt auch mit E3).
     Auf Handy/Tablet hochkant rutschen sie automatisch in eine eigene Zeile darunter (wie heute).
   - Am Laptop: **„Wertung freigeben“ / „✓ freigegeben“ rückt in die Kachel** (Landesliga: rechts in die Zeile mit
     „Wertung 0,00“ und Sturz-Timer) bzw. **in die Mittelspalte unter die Scorepunkte** (Oberliga, Freigabe je Duell).
     Auch „geändert – noch nicht freigegeben“ / „Korrektur freigeben“ / „Änderung verwerfen“ entsprechend. Handy wie heute.
   - Einpassung prüfen: 1280/1366/1536/1920 px Breite, beide Ligen, E2 und E3, abgeschlossene Geräte, Korrekturen.

6. **Erklärungsabsatz unter den Wertungen entfällt** (beide Ligen, alle Bildschirme); Inhalt muss in der Anleitung stehen
   (Eingabe mit Komma/Punkt, Pfeiltasten ±0,1, E-Note-Berechnung, Endnote, Startreihenfolge, Streichwertung, Freigabe, sofortiges Speichern).
   **Topscorer bleiben, wo sie sind** (unter dem Gerät).

7. **Lange Vereinsnamen auf dem Handy prüfen und einpassen** (Fehler aus Beta 74, Bildschirmfoto iPhone):
   Im Kopf der Wettkampfseite (Oberliga) läuft der Gastname rechts aus dem Bild („TG Geisweid/Eichen“ abgeschnitten),
   weil Name – Stand – Name in drei Spalten nebeneinander stehen. Lösung: auf dem Handy wie schon in der Landesliga
   die Namen links/rechts in einer Zeile, der Stand darunter mittig; Umbruch an „/“ und „-“ erlauben, notfalls mitten im Wort.
   Mit den längsten Namen („SG Langenei-Kickenbach/Gleidorf“, „SG Wünnenberg/Elsen“, „TG Geisweid/Eichen“) alles prüfen:
   Kopf, Wettkampfliste (mit neuen Knöpfen Sichern/Löschen), Kacheln, Setup, Anzeigetafel hochkant, Einblendungen,
   Turnervorstellung, Protokoll.

## Weitere offene Punkte

- **Endnote bei „kein Turner“ nicht abgeschwächt darstellen** (Wunsch nach Beta 74):
  In der Wertungseingabe ist bei „kein Turner“ die Endnote 0,00 derzeit grau/blass. Sie ist aber die gültige
  Wertung und soll ganz normal schwarz erscheinen. Die gesperrten Eingabefelder bleiben grau.
- **Wertungseingabe im eigenen Fenster** (Idee, erst nach dem Test beim echten Wettkampf angehen):
  Je Gerät eine kompakte Übersicht (eine Zeile je Übung: Turnerauswahl, D, E, Endnote, Stand) mit Knopf
  „Wertung eingeben“ bzw. „Wertung ändern“. Das Fenster zeigt Turner/Mannschaft/Gerät, die Felder E1, E2 (E3), D,
  Standbonus, neutraler Abzug, „Wertung 0,00“, laufende E-Note/Endnote; Knöpfe „Übernehmen“, „Übernehmen und
  freigeben“, „Abbrechen“ (Werte gelten erst mit Übernehmen), evtl. „Übernehmen und nächster Turner“; Tab/Enter.
  Vorteile: Übersicht, kein Verrutschen beim falschen Turner, besser auf Handy/Tablet. Nachteile: ein Klick mehr,
  kein durchgehendes Tab-Weiterspringen, andere Wertungen während der Eingabe verdeckt; großer Umbau beider Ligen.
- **Eigene Zahlentastatur auf Tablet/Handy** (Idee, zusammen mit dem Eingabefenster umsetzen):
  Eingabefelder öffnen nicht die Tastatur des Betriebssystems; stattdessen eine App-eigene Zahlentastatur
  (1–9, 0, Komma, ⌫, „Weiter ▶“ zum nächsten Feld, „Fertig“), groß, aber nur ca. ¼ des Bildschirms; aktives Feld markiert,
  E-Note/Endnote laufend sichtbar. Am Laptop bzw. bei angesteckter Tastatur ausgeblendet (Einstellung oder automatisch
  beim ersten Tastendruck). Mittlerer Umbau, auf iPhone, iPad und Android testen.
- Später: Anzeigetafel über das Netzwerk (eigener Chat, vorher CLAUDE.md und Übergabe-Notiz anlegen).
- Später, nur als Idee: Fotos der Turner für die Turnervorstellung (Fotoarchiv nach Namen, Mannschaftspaket).
