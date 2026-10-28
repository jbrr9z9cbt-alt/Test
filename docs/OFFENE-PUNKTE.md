# Offene Punkte (noch nicht umgesetzt)

## Beschlossen für die nächste Beta (wird gesammelt und dann auf einmal umgesetzt)

Gefunden mit Beta 75 auf iPhone/iPad (Bildschirmfotos vom 26.10.2026):

1. **Einturnzeit / Gerät direkt starten am Handy zu breit:** Die Zeile mit „Einturnzeit (6:40) starten“ und
   „Gerät direkt starten“ ist am Handy ca. 395 px breit, die Karte nur ca. 350 px. Dadurch wird die ganze Seite
   seitlich verschiebbar (weißer Streifen rechts neben der Kopfleiste). Lösung: Passen die Knöpfe nicht nebeneinander,
   rutscht „Gerät direkt starten“ unter „Einturnzeit (6:40) starten“, beide gleich breit im Rahmen. Laptop unverändert.
   Beim Testen auch den Zustand **vor** „Gerät starten“ am Handy messen (bisher nur nach dem Start geprüft).

2. **Datumsfeld auf iPhone und iPad ragt aus dem Rahmen** („Neuer Wettkampf“ bzw. Setup; am Laptop in Ordnung).
   Ursache: Safari gibt dem Datumsfeld eine eigene Mindestbreite. Lösung: Safari-Eigendarstellung des Datumsfelds
   abschalten, damit es die Breite einhält; Datum dann linksbündig wie die anderen Felder.
   Hier nur in Chrome prüfbar – Kontrolle auf iPhone/iPad durch den Nutzer nach dem Veröffentlichen.

3. **Turnervorstellung als Fenster in der App:** Beim Start erscheint in der App dasselbe Fenster wie auf der Tafel
   (Titelseite, Turner mit Nummer, Kampfgericht, oben „3 / 11“), unten im Fenster **◀ ▶ ■**. Das Fenster liegt wie auf
   der Tafel über der ganzen Seite (Handy bildschirmfüllend, Laptop groß in der Mitte); die App darunter muss nicht
   bedienbar bleiben. Der Knopf in der Werkzeugzeile heißt wieder nur „Turnervorstellung“ und bleibt so groß wie früher
   (die ◀ ▶ ■ im Knopf entfallen). Tastatur und Presenter wie bisher; ■ bzw. Esc beendet die Vorstellung in App und Tafel.
   Anleitung und README anpassen.

4. **Beschriftungen der Eingabefelder auf kleinen Bildschirmen** (Bildschirmfotos iPhone und iPad, 26./27.10.2026):
   - iPhone (Landesliga, E1/E2): „Standbonus“ läuft in „Neutr. Abzug“ hinein; „Abzüge E2“ bricht zweizeilig um,
     „Abzüge E1“ daneben nicht – die Beschriftungen stehen unterschiedlich hoch und wirken unruhig.
     Mit drei E-Kampfrichtern dasselbe Problem.
   - iPad quer (Oberliga mit E3, Laptop-Darstellung ab 1100 px): „Abzüge E2“ und „Abzüge E3“ werden zu
     „Abzüge …“ abgekürzt – man sieht nicht mehr, welches Feld welcher Kampfrichter ist.
   - Ziel: Keine Beschriftung wird abgeschnitten, keine läuft in die nächste, und alle Beschriftungen einer Kachel
     stehen auf gleicher Höhe.
   - **Beschlossen:** Reicht der Platz nicht, bekommen alle Felder der Kachel die Kurzformen
     **„E1“, „E2“, „E3“, „D-Note“, „Stand“, „NA“** (statt „Abzüge E1/E2/E3“, „D-Note“, „Standbonus“, „Neutr. Abzug“);
     sonst bleiben die langen Beschriftungen wie heute.
   - **Grundregel: Gleichartige Felder werden immer gleich behandelt.** Nie darf eine Beschriftung umbrechen oder mit
     „…“ gekürzt werden, während die gleichartige daneben vollständig bleibt (wie bisher „Abzüge E1“ ganz, „Abzüge E2/E3“
     als „Abzüge …“). Beschriftungen brechen nicht um und werden nicht abgekürzt; entweder alle lang oder alle kurz –
     einheitlich für alle Kacheln der Geräteseite (Heim und Gast, alle Duelle bzw. Übungen gleich).
   - Die Kurzformen in der Anleitung kurz erklären (z. B. „Stand = Standbonus, NA = neutraler Abzug“; im Protokoll steht „NA“ bereits so).
   - Prüfen: Handy (360/390 px), iPad hoch und quer, Laptop 1100–1366 px; beide Ligen, mit E2 und mit E3.

5. **Wettkampf-Setup: ungespeicherte Änderungen nicht verlieren** (beschlossen 27.10.2026):
   Problem: Im Setup wird – anders als auf den anderen Seiten – erst mit dem Knopf ganz unten gespeichert. Wer z. B. die
   beginnende Mannschaft ändert oder einen Kampfrichternamen korrigiert und dann über einen Reiter der Kopfzeile geht,
   verliert die Änderung. (Turnernamen unter „Anwesende Turner“ werden schon jetzt sofort in die Mannschaftsliste übernommen.)
   - **Rückfrage beim Verlassen**, nur wenn etwas geändert wurde – bei Reitern der Kopfzeile, Logo und Zurück-Taste
     des Browsers. App-Fenster (kein Browser-Dialog): „Änderungen speichern?“ – „Im Wettkampf-Setup wurden Änderungen
     gemacht, die noch nicht gespeichert sind.“ Knöpfe **[Weiter bearbeiten] [Verwerfen] [Speichern]**.
     „Speichern“ = derselbe Ablauf wie der Knopf unten (alle Prüfungen und Rückfragen), danach zur gewählten Seite;
     „Verwerfen“ geht ohne Speichern weiter; „Weiter bearbeiten“ bleibt, nichts geht verloren.
     Bei „Neuer Wettkampf“ heißt der Knopf **[Anlegen]**. „Abbrechen“ unten fragt nicht (bewusstes Verwerfen).
   - **Fester Knopf unten:** „Speichern“ (bzw. „Anlegen“) und „Abbrechen“ stehen im Setup fest am unteren Bildschirmrand,
     ohne Scrollen erreichbar; solange etwas ungespeichert ist, steht daneben klein „nicht gespeichert“.
   - Kein automatisches Speichern im Setup (neuer Wettkampf entsteht erst mit „Anlegen“; Pflichtfelder und Rückfragen
     sollen nicht mitten im Ausfüllen greifen; Änderung der beginnenden Mannschaft soll bewusst bestätigt werden).
   - Prüfen: Handy, iPad, Laptop; neuer Wettkampf und Setup eines laufenden Wettkampfs; Zurück-Taste; Tastatur am Handy
     darf den festen Knopf nicht verdecken bzw. er darf keine Eingabefelder verdecken.

6. **Einheitliche Statuszeile je Gerät** (beschlossen 28.10.2026 nach Vorschaubildern):
   Eine Zeile im Rahmen wie heute „Gerät läuft“ (grauer Rahmen, heller Hintergrund) oberhalb des Geräts; Text fett,
   alle Knöpfe darin gleich gestaltet (weiß, umrandet). Am Handy rutscht der Knopf bei Bedarf in die zweite Zeile.
   | Zustand | Anzeige | Knopf |
   |---|---|---|
   | frei, nicht gestartet | – | „Einturnzeit (6:40) starten“ · „Gerät direkt starten“ (wie heute, Punkt 1 beachten) |
   | Einturnzeit läuft | wie heute (Timer-Knopf mit Stopp) | – |
   | 5 s „Einturnen beendet“ | „Gerät startet gleich …“ | – |
   | läuft | **„● Gerät läuft“** (ocker) | **„Start zurücknehmen“** bis zur ersten Freigabe |
   | abgeschlossen (gesperrt) | **„✓ Gerät abgeschlossen“** (grün) | **„Bearbeiten“** → bisherige Abfrage |
   | abgeschlossen, noch/wieder änderbar | „✓ Gerät abgeschlossen“ | – (direkt nach der letzten Freigabe bzw. nach „Bearbeiten“) |
   | gesperrt | **„🔒 Gerät gesperrt – <Gerät> läuft“** bzw. „– Einturnzeit an <Gerät> läuft“ (grau), darunter klein und normal: „Turner können schon gewählt werden.“ | **„Sperre aufheben …“** |
   | Wettkampf abgeschlossen | keine Statuszeile (Hinweis „schreibgeschützt“ und „Wieder öffnen“ wie heute) | – |
   - Der bisherige grüne Balken „… ist abgeschlossen – die Wertungen sind gesperrt“ und die blassen Knöpfe an gesperrten
     Geräten entfallen (kein Klick mehr auf einen ausgegrauten Knopf nötig).
   - **„Start zurücknehmen“** gilt bis zur **ersten Freigabe** an diesem Gerät (bisher: bis zur ersten eingetragenen Note).
     Sind schon Noten eingetragen, kommt die Rückfrage „Start zurücknehmen?“ – „An <Gerät> sind schon Noten eingetragen.
     Sie werden gelöscht; die Turnerauswahl bleibt erhalten.“ [Abbrechen] [Start zurücknehmen]; dabei werden die Noten
     (D, E1–E3, Standbonus, neutraler Abzug, „Wertung 0,00“) gelöscht, Turnerauswahl und „kein Turner“ bleiben.
     Ohne eingetragene Noten wie heute ohne Rückfrage. Tafel zeigt danach wieder das vorige Gerät (wie heute).
   - **„Sperre aufheben …“**: hebt wie bisher die Sperre für **alle** Geräte auf. Das bisherige erste Hinweisfenster
     („… ist gesperrt [OK]“) entfällt, weil die Zeile den Grund nennt; es folgen direkt die beiden bisherigen Warnfragen
     („⚠ Gerätesperre aufheben? … Danach sind alle Geräte frei wählbar“ und „Wirklich aufheben?“).
     Gelber Hinweis „Gerätesperre aufgehoben – Sperre wieder aktivieren“ bleibt.
   - **Gerätereiter gesperrter Geräte** nicht mehr ausgegraut, nur das Schloss-Abzeichen (sie bleiben anklickbar,
     um Turner zu ändern).
   - **Hinweis zur Turnerwahl bleibt erhalten:** Er stand bisher nur im entfallenden Hinweisfenster („Turner lassen sich
     trotzdem schon ändern“) und wandert in die Statuszeile: zweite Zeile, klein, normale Schrift,
     „Turner können schon gewählt werden.“ (am Handy steht der Knopf darunter).
   - Unverändert: Einturnzeit → automatischer Start, Rückfrage „Gerät jetzt starten?“, Sperre gegen zwei laufende Geräte,
     Turnerwahl an gesperrten Geräten, Anzeigetafel. Anleitung und README anpassen.
   - Prüfen: beide Ligen, Handy/iPad/Laptop, alle Zustände der Tabelle; Zurücknehmen mit/ohne eingetragene Noten;
     ältere Wettkämpfe (ohne „Gerät starten“) zeigen „Gerät läuft“ ohne „Start zurücknehmen“.

## Beschlossen und in Beta 75 umgesetzt (veröffentlicht)

Ergänzungen bei der Umsetzung:
- Punkt 7: Am Handy rutscht in der Wertungskachel die Turnerauswahl bei langem Vereinsnamen in eine eigene Zeile
  (statt auf ca. 90 px zu schrumpfen); das Vereinsschild bricht nach „/“ um statt abgeschnitten zu werden (auch am Laptop).
- Punkt 7 am Laptop: „Beginn: …“ bricht bei langem Namen um; reicht der Platz trotzdem nicht, rutscht nur die
  Gerätepunkte-Angabe bzw. die Spielstandzeile weiter – Namen werden nie mitten im Wort getrennt.
- Punkt 4: „✓ gespeichert“ bleibt rechts bei den Wettkampf-Knöpfen (bei 1280 px rechtsbündig darunter).
- Zusätzlich: Bei „kein Turner“ ist die Endnote 0,00 normal schwarz (Eingabefelder und E-Note bleiben blass).


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

8. **Gerätereiter auf dem Handy ohne Summen** (beschlossen, Variante B, **Oberliga und Landesliga einheitlich**):
   Auf schmalen Bildschirmen (Handy) zeigen die Gerätereiter nur Gerätesymbol und Abzeichen (✓, ●, 🔒), keine Summen/Scorepunkte
   (LL-Summen wie „24,00:20,00“ passten nicht in die ~60 px breiten Reiter). Die Summe des aktuellen Geräts steht in der Gerätezeile.
   Tablet und Laptop unverändert bzw. wie Punkt 4.

## Weitere offene Punkte

- **Bekanntes Verhalten, vorerst bewusst unverändert:** Ein eingetippter Wert wird erst beim Verlassen des Felds übernommen.
  Steht der Cursor noch im letzten Feld eines Duells bzw. einer Übung, bleibt „Wertung freigeben“ gesperrt (am Handy
  besonders spürbar: erst Feld verlassen, dann freigeben). Mögliche Lösung: Noten und Freigabe schon beim Tippen aktualisieren.
  Freigabe-Reihenfolge der Duelle ist frei (kein Zwang, Duell 1 zuerst).

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
