# Offene Punkte (noch nicht umgesetzt)

## Liste für das nächste Update (nach Beta 78 – wird gesammelt und dann auf einmal umgesetzt)

Begonnen 01.11.2026.

1. **Wertungsfenster am iPad und PC wieder mittig** (gemeldet 01.11.2026, Bildschirmfoto PC): Seit Beta 78 steht das
   Fenster ganz oben; wie in Beta 77 soll es senkrecht in der Mitte stehen – auch der D-Note-Rechner. Am Handy (bis 560 px
   Breite) bleibt es bildschirmfüllend von oben (wegen der Safari-Leisten). Da im Fenster nichts mehr erscheint oder
   verschwindet, bleibt es auch mittig an festem Platz. Ist ein Fenster höher als der Bildschirm (z. B. Handy quer), beginnt
   es oben und lässt sich verschieben.
2. **iPhone: Zahlentastatur immer ganz unten** (gemeldet 01.11.2026, Bildschirmfotos aus der installierten App) – im
   Wertungsfenster und im D-Note-Rechner. Oben bleibt alles wie bisher (Kopf, Turner, Felder, Endnote, Hinweis, Knöpfe),
   die Tastatur steht unten am Bildschirmrand (in Safari direkt über der unteren Leiste); der Platz dazwischen bleibt frei.
   Die Einstellung „Zahlentastatur“ bleibt unter der Tastatur – als unterstes Element (entschieden 01.11.2026).
   Prüfen: App 390×844, Safari 390×664 und 375×548 – nichts darf verdeckt sein.
3. **Fehler in Beta 78: D-Note-Rechner am iPhone mit großen Lücken, lässt sich verschieben, untere Tastenreihe teils
   verdeckt, Kopf (Titel und Turner) nach oben weggeschoben** (gemeldet 01.11.2026). Ursache: Der Abstand, der am iPad quer
   zwischen Rechner und Tastatur gedacht war (2,5rem), wirkt am iPhone zwischen allen Zeilen des Rechners. Er gilt künftig nur
   für iPad quer und PC; danach passt der Rechner am iPhone wieder ganz auf den Bildschirm (Kopf oben, Tastatur unten).
4. **Zahlentastatur: „Weiter“ endet im letzten Feld, Tastatur steht fest** (gemeldet 01.11.2026): Bisher springt „Weiter ▶“
   nach dem letzten Feld (NA) auf „Wertung freigeben“; dabei verschwinden Feld- und Turnername über der Tastatur, die Zeile
   wird niedriger und die Tastatur rutscht ein Stück nach oben. Am Touch-Gerät bringt der Sprung nichts – „Wertung freigeben“
   wird ohnehin angetippt.
   - Die Anzeigezeile über der Tastatur bekommt eine feste Höhe – die Tastatur bewegt sich nie.
   - Vorschlag: „Weiter ▶“ bleibt im letzten Feld stehen und ist dort ausgegraut (NA bleibt aktiv, Anzeige bleibt); freigegeben
     wird durch Antippen von „Wertung freigeben“. Ebenso im D-Note-Rechner: „Weiter“ endet bei EG, „Übernehmen“ wird angetippt.
   - Mit echter Tastatur (Laptop) bleibt es wie bisher: Enter nach dem letzten Feld springt auf „Wertung freigeben“
     bzw. „Übernehmen“, ein weiteres Enter gibt frei.

Beta 78 am iPhone bestätigt (01.11.2026): Felder lassen sich antippen, kein Zoom, Seite dahinter bleibt stehen,
Fenster und D-Note-Rechner mit Safari-Leisten ganz sichtbar.

## Fehlerkorrekturen nach Beta 77 – umgesetzt in Beta 78 (veröffentlicht 01.11.2026)

Stand 01.11.2026: Punkte 1–9 umgesetzt und getestet (Laptop, iPad quer/hoch, Handy 360/375/390 px, auch mit den Höhen
von Safari 390×664 und 375×548). Veröffentlicht nach Freigabe (Commit `3c82d54`). Am iPhone selbst (Safari und installierte App) ist
nach dem Veröffentlichen geprüft und bestätigt (01.11.2026): Antippen der Felder, kein Zoom, Seite dahinter bleibt stehen (Punkt 6).
Rückkehrpunkt Beta 77: Stand von `main` vor der Veröffentlichung (Commit `5c73e9b`).


Gefunden mit Beta 77 auf dem iPhone in Safari (Bildschirmfotos 31.10.2026):

1. **Wertungsfenster: alle Elemente an festem Platz, alles auf einem Bildschirm** – auch im Browser.
   Im Safari-Browser verdeckt die Werkzeugleiste unten die untere Hälfte der Zahlentastatur (0, Komma, Weiter);
   außerdem verschieben Vorschau und Sturz-Timer die Tastatur nach unten, die Kopfzeile bricht zweizeilig um.
   Vorschlag: fester Aufbau von oben nach unten mit festen Höhen – nichts erscheint oder verschwindet, der Platz
   für die Vorschau ist immer reserviert; das Fenster beginnt oben und ist so kompakt (ca. 600 px), dass es auch mit
   Adress- und Werkzeugleiste von Safari ganz sichtbar ist (in der installierten App bleibt unten etwas Luft).
   Kopfzeile einzeilig (z. B. „Pauschenpferd · Duell 1 · 2.“).
2. **Großer Sturz-Timer im Fenster entfällt** (der Knopf „⏱ 21 – Stopp“ oben rechts bleibt).
3. **Vorschau des Duellergebnisses nur als Scorepunktzahl in Mannschaftsfarbe** (wie in der Mittelspalte der
   Kacheln; unentschieden: 0 in Schwarz) statt des Satzes „Vorschau Duell 1: … → 5 Scorepunkte für …“.
4. **Automatisches Komma entfällt**: Auf der Zahlentastatur wird genau das Getippte übernommen („4 , 5“ = 4,5;
   „4“ = 4,0). Mit echter Tastatur wie bisher.
5. **Turnerauswahl auch im Wertungsfenster** (beschlossen 31.10.2026):
   - Oben im Fenster dieselbe Auswahlliste wie in der Kachel („kein Turner“ ganz oben); die Auswahl in der Kachel bleibt
     zusätzlich (Vorauswahl).
   - Vor der Freigabe wird ein im Fenster gewählter Turner **sofort gespeichert** (wie in der Kachel); „Abbrechen“ verwirft
     nur die getippten Noten. Wechsel auf „kein Turner“ bei schon erfassten Noten: dieselbe Rückfrage wie heute.
     Nach der Freigabe gehört ein Turnerwechsel zur Korrektur („Korrektur freigeben“), wie bisher.
   - **„Wertung eingeben“ auch ohne gewählten Turner anklickbar** (Turner dann im Fenster wählen). Weiterhin **gesperrt
     vor „Gerät starten“ und an gesperrten Geräten**; abgeschlossenes Gerät (bis „Bearbeiten“) und abgeschlossener
     Wettkampf wie bisher gesperrt.
   - Laptop: Fokus beim Öffnen auf der Auswahl, wenn noch kein Turner gewählt ist, sonst im ersten leeren Feld;
     Enter öffnet die Liste wie in der Kachel. Ohne Turner sind die Notenfelder gesperrt.
6. **iPhone: Felder im Wertungsfenster lassen sich per Tipp nicht zuverlässig auswählen, Berührungen landen teils auf
   Knöpfen hinter dem Fenster** (gemeldet 31.10.2026). Wahrscheinliche Ursachen und Abhilfe:
   - Die Felder sind mit Zahlentastatur schreibgeschützte Eingabefelder; iOS behandelt Tipps darauf teils als
     Textauswahl/Fokus statt als Klick → mit Zahlentastatur die Felder als **Schaltflächen** darstellen (sehen gleich aus).
   - iOS zoomt bei Doppeltipp und beim Antippen der Auswahl „Zahlentastatur“ (Schrift kleiner als 16 px); danach stimmt
     die Trefferfläche des fest stehenden Fensters nicht mehr, Tipps landen dahinter → Doppeltipp-Zoom im Fenster
     abschalten, Auswahllisten im Fenster mit mindestens 16 px Schrift.
   - Die Seite hinter dem Fenster lässt sich am iPhone trotz Sperre verschieben → Seite hinter dem Fenster fest
     verriegeln und die Scroll-Position beim Schließen wiederherstellen.
   - Hier nur in Chrome prüfbar; Kontrolle auf dem iPhone durch den Nutzer nach dem Veröffentlichen.
7. **Turnername in der gesperrten Auswahl schwarz** (gemeldet 01.11.2026): In Kacheln mit freigegebener Wertung (und
   sonst gesperrter Turnerauswahl) bleibt das Feld grau hinterlegt, die Schrift wird aber normal schwarz – so gut lesbar
   wie die Wertungen. Auch auf iPhone/iPad (Safari blasst gesperrte Auswahlfelder zusätzlich ab; das wird mit abgeschaltet).
8. **Drei E-Kampfrichter am iPhone: Zahlen passen nicht in die Felder des Wertungsfensters** (gemeldet 01.11.2026,
   nachgemessen): Die drei E-Felder sind nur ca. 40–44 px breit (D-Note, Stand, NA ca. 61–67 px), „10,0“, „1,5“, „9,5“
   werden abgeschnitten. Abhilfe: alle Felder gleich breit (bei E3 sechs gleiche Spalten), Schrift und Innenabstand der
   Felder an die verfügbare Breite anpassen, sodass „10,0“ auch bei 360 px Bildschirmbreite ganz zu sehen ist.
   Prüfen: 360/375/390 px, Oberliga und Landesliga mit E3, auch Sprung (ohne Standbonus).
9. **D-Note-Rechner** (beschlossen 01.11.2026, Vorschaubilder „getippt“ gezeigt):
   - Im Wertungsfenster unter dem Feld D-Note ein gleich breiter Knopf „berechnen“ (fester Platz, passt zu Punkt 1).
     Am Sprung kein Knopf – dort wird die D-Note direkt eingegeben.
   - Eigenes Fenster über dem Wertungsfenster (Rand in Mannschaftsfarbe): Kopf „D-Note berechnen · Gerät · Duell/Übung“,
     Turnername. Darunter in einer Spalte die Felder **≥ D (je 0,8), C (je 0,6), B (je 0,4), A (je 0,2)** – Anzahl als
     **ganze Zahl getippt** – je mit Teilsumme; Zeile „Elemente x von 8“ (bei 8: „· voll“) und Summe der Elemente;
     **EG (Elementgruppen)** freie Eingabe mit einer Nachkommastelle, **höchstens 2,3**; darunter die D-Note groß.
     Leeres Feld zählt als 0 (Teilsumme „–“).
   - **Höchstens 8 Elemente insgesamt.** Mehr als 8 oder EG über 2,3: Zeile bzw. Feld rot, D-Note „–“, „Übernehmen“
     gesperrt, bis es stimmt.
   - „Übernehmen“ trägt die D-Note ins Feld D-Note des Wertungsfensters ein (freigegeben wird wie bisher dort);
     „Abbrechen“ schließt den Rechner ohne Änderung.
   - Handy: bildschirmfüllend mit der Zahlentastatur; „Weiter“ springt ≥ D → C → B → A → EG → „Übernehmen“; bei den
     Anzahlen ist die Komma-Taste gesperrt. Laptop: normale Tastatur, Enter/Tab ins nächste Feld, Esc = Abbrechen.
   - **Die Anzahlen werden gespeichert** (bestätigt 01.11.2026): mit der Wertung des Turners (beim Freigeben; „Abbrechen“
     im Wertungsfenster verwirft sie mit den übrigen getippten Werten), auch in der Datensicherung. Beim erneuten
     Öffnen des Rechners für diesen Turner (z. B. Korrektur) stehen sie wieder da. Auf Tafel und Protokoll erscheinen
     sie nicht.


## Beschlossen und in Beta 77 umgesetzt (veröffentlicht): Wertungseingabe im eigenen Fenster mit eigener Zahlentastatur

**Rückkehrpunkt:** Der veröffentlichte Stand Beta 76 ist auf GitHub als eigener Zweig **`stand-beta-76`** gesichert
(Commit `17866c1`). Funktioniert der Umbau nicht wie gewünscht, wird dieser Stand wieder veröffentlicht
(mit neuer Versionsnummer, damit installierte Geräte das Update laden). Der Umbau entsteht auf dem Arbeitszweig;
live bleibt Beta 76, bis der Umbau freigegeben ist.

Konzept (31.10.2026):
- Kachel zeigt die Werte nur als Text; Turnerauswahl (mit „kein Turner“) und Sturz-Timer bleiben in der Kachel.
  Knopf „Wertung eingeben“ bzw. nach der Freigabe „Wertung ändern“.
- Fenster über der Seite (Handy bildschirmfüllend): Kopf Gerät · Duell/Übung · Mannschaft · Turner; Felder E1, E2, (E3),
  D-Note, Stand, NA, „Wertung 0,00“; E-Note/Endnote laufend; Knöpfe [Abbrechen] [Übernehmen] [Wertung freigeben].
  Oberliga: Freigabe erst beim zweiten Turner des Duells (gibt das Duell frei), evtl. Vorschau der Scorepunkte.
- Korrektur: „Wertung ändern“ → Fenster mit alten Werten → „Korrektur freigeben“ oder abbrechen; der Zwischenzustand
  „geändert – noch nicht freigegeben“ samt Sperre der anderen Übungen entfiele.
- Laptop: Tab durch die Felder, Pfeile ±0,1, Enter im letzten Feld → „Wertung freigeben“, Esc = Abbrechen,
  danach Fokus auf „Wertung eingeben“ des nächsten Turners.
- Zahlentastatur im Fenster (Touch-Geräte): 0–9, Komma, ⌫, −0,1/+0,1, „Weiter ▶“, „Fertig“; Anzeigezeile mit Feld, Turner, Wert;
  Handy-Tastatur bleibt zu; automatisch auf Touch-Geräten, verschwindet beim ersten Druck einer echten Taste;
  Einstellung automatisch/immer/nie; optional automatisches Komma („17“ → „1,7“).
- **Beschlossen (31.10.2026, nach Vorschaubildern):**
  - Im Fenster nur **[Abbrechen] [Wertung freigeben]** (kein „Übernehmen“); „Abbrechen“ ohne Rückfrage (Eingaben verworfen).
  - Korrektur: „Wertung ändern“ → Fenster → „Korrektur freigeben“ oder Abbrechen; kein Zwischenzustand mehr.
  - **Sturz-Timer** des Turners auch im offenen Fenster (oben rechts), die Übung kann noch laufen.
  - **Oberliga, 1. Turner:** „Wertung freigeben“ speichert; die Tafel zeigt **nichts Neues** – die vorgelegte Note bleibt für
    Zuschauer, Turner und Trainer unsichtbar, bis der 2. Turner freigegeben ist (das gibt das ganze Duell frei, wie heute).
  - Zahlentastatur mit Einstellung (automatisch/immer/nie), **automatisches Komma** („17“ → 1,7) und trotzdem Komma-Taste
    („4 , 5“ → 4,5); Anzeige über der Tastatur zeigt den Wert, wie er übernommen wird. Taste **„Fertig“ entfällt**
    („Weiter ▶“ groß über zwei Reihen). iPad quer: Tastatur rechts neben den Feldern, hochkant darunter.
  - Automatisches Komma **nur auf der Bildschirm-Tastatur**; mit echter Tastatur wie heute („5“ = 5,0).
  - Kacheln behalten Größe und Aufbau, die Eingabefelder werden zu Text (wie Vorschaubilder 1 und 4) mit
    „Wertung eingeben“ bzw. „Wertung ändern“. Zweizeilige Kompakt-Kacheln: vorerst nicht.
  - „kein Turner“: Fenster zeigt „kein Turner – Endnote 0,00“ (Felder gesperrt) mit [Abbrechen] [Wertung freigeben];
    auch die Null muss freigegeben werden.
  - Oberliga: Duell wird freigegeben, sobald beide Turner freigegeben sind – zur Not auch in umgekehrter Reihenfolge.
  - Außerdem: „Wertung eingeben“ gesperrt vor dem Gerätestart, an gesperrten/abgeschlossenen Geräten (nach „Bearbeiten“ frei)
    und beim abgeschlossenen Wettkampf; ungültige Werte rot, Freigabe dann gesperrt; nach dem Freigeben Fokus auf den
    nächsten Turner; „Wertung 0,00“ im Fenster; Einstellung der Zahlentastatur je Gerät; alte, nicht freigegebene Noten
    und offene Korrekturen aus Beta 76 erscheinen im Fenster.
- **Frage: kompakte Kacheln, damit ein Gerät am Laptop/iPad quer ohne Scrollen passt** (gemessen mit nachgestellten
  zweizeiligen Kacheln, ca. 80 px hoch: Zeile 1 Nr., Verein, Turner, E-Note, Endnote; Zeile 2 Werte als Text, Sturz-Timer,
  „Wertung eingeben“; Statuszeile neben dem Gerätenamen): passt bei Full HD, iPad Pro, 1366×768 als installierte App;
  im normalen Browserfenster 1366×768 fehlen 10–60 px, iPad 11" quer Landesliga ca. 40 px, 1280×720 70–120 px.

## Beschlossen und in Beta 76 umgesetzt (veröffentlicht)

Ergänzungen bei der Umsetzung:
- Punkt 3: Das Fenster in der App folgt Hell/Dunkel der Tafel; hochkant (Handy) ist die Schrift größer als auf der
  Tafel, damit man sie am Gerät lesen kann. Lange Vereinsnamen stehen in der Vorstellung immer in einer Zeile
  (werden verkleinert, kein Umbruch nach „/“).
- Punkt 4: Auf sehr schmalen Handys (≤ 400 px) sind die Beschriftungen minimal kleiner, damit „D-Note“ auch mit
  drei E-Kampfrichtern ganz passt. Eingabefelder und Standbonus-Kästchen gleich hoch (Beschriftungen auf einer Linie).
- Punkt 5: Geänderte Turnernamen gelten nicht als ungespeichert (werden sofort übernommen); fehlen beim Speichern
  über die Rückfrage Pflichtfelder, bleibt die Seite offen und das Feld wird markiert.


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

- **Später, noch nicht beschlossen: ganzes Gerät ohne Scrollen auf Laptop und iPad quer** (Vorschaubilder 01.11.2026,
  nachgestellt mit scratchpad mock101): einzeilige Kacheln, nur so breit wie nötig (ca. 1000 px, mittig), Spaltenköpfe
  einmal oben; Zeile: Nr., Verein, Turnerauswahl, E1, E2, (E3), D-Note, Stand, NA, E-Note, Endnote, ⏱ (Sturz-Timer),
  „Wertung eingeben/ändern“. Oberliga: je Duell zwei Zeilen, rechts „Duell n“ und Scorepunkte; Landesliga: eine Spalte in
  Wettkampfreihenfolge (abwechselnd Heim/Gast), ✓ für freigegeben, Mannschafts- und Summenzeilen entfallen.
  Oben sparen: Liganame im Kopf weg, App-Leiste/Knöpfe/Reiter flacher, Statuszeile neben dem Gerätenamen, Topscorer weg.
  Gemessen: passt bei 1366×768 im Browser, 1536, Full HD, iPad 10./11./Air/Pro quer; nicht bei 1280×720 im Browser
  (40/10 px) und älterem iPad 10,2" (zu schmal). Offene Frage: Vereinsspalte behalten (lange Turnernamen in der Auswahl
  abgeschnitten) oder weglassen (Mannschaft am farbigen Rand, volle Namen, passt auch aufs ältere iPad).

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
