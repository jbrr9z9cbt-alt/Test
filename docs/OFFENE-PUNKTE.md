# Offene Punkte (noch nicht umgesetzt)

## Nächste Liste (nach Beta 81 – wird gesammelt und dann auf einmal umgesetzt)

1. **Ligamenü: „Zurück zum Wettkampf“ statt „Startseite (Liga wechseln)“** (beschlossen 01.11.2026, zuletzt geöffneter Wettkampf): Im Menü „WTB-Oberliga ▾“ bzw.
   „WTB-Landesliga ▾“ ersetzt ein Link zum zuletzt geöffneten Wettkampf dieser Liga den Eintrag „Startseite (Liga wechseln)“,
   z. B. „← Zurück zum Wettkampf · TG Geisweid/Eichen – KTS Mettingen“ (lange Namen mit „…“). Gemerkt je Liga auf diesem Gerät
   beim Öffnen eines Wettkampfs; auf der Wettkampfseite selbst und wenn der Wettkampf gelöscht wurde, entfällt der Eintrag.
   Zur Startseite (Liga wechseln) führt weiterhin das Logo links in der Kopfzeile.
2. **Fehler in Beta 81 behoben (auf dem Arbeitszweig, kommt mit dem nächsten Update): Gerätereiter am Laptop/iPad quer wieder
   fixiert** (gemeldet 01.11.2026):
   Seit Beta 81 scrollten die Gerätereiter (und Hinweise) am Laptop und iPad quer weg, nur Menüband und Kopf blieben stehen.
   Ursache: ein überzähliges Schluss-Tag nach dem Umbau der Werkzeugzeile. Jetzt bleiben Menüband, Kopf und Gerätereiter wieder
   gemeinsam oben stehen (ab 1100 px Breite: Laptop, iPad Air/Pro quer).
3. ~~Oberen Bereich auch auf kleineren iPads fixieren~~ – **entfällt** (entschieden 01.11.2026): Kleines iPad quer (unter
   1100 px) und iPad hochkant bleiben wie bisher (nur Kopfzeile und Menüband fest). Nur die Reparatur aus Punkt 2 kommt.
4. **Gerätestart und Gerätesperre entfallen – die Tafel folgt dem Reiter, bis freigegeben wird** (beschlossen 01.11.2026):
   - **Nichts wird gesperrt:** Alle Gerätereiter sind jederzeit wählbar, Turner jederzeit änderbar, Wertungen jederzeit
     eintragbar. Es entfallen: „Gerät direkt starten“ (mit Rückfrage), „Start zurücknehmen“, die Gerätesperre 🔒 mit
     „Sperre aufheben …“, „Wertungen erst nach dem Start“, der automatische Start nach der Einturnzeit, „nur ansehen“ mit
     „Bearbeiten“ bei fertigen Geräten und damit die ganze Statuszeile über dem Gerät. Freigegebene Wertungen ändert man
     weiterhin über die Korrektur.
   - **Gelber Punkt** am Reiter ab der ersten eingetragenen Teilwertung (Turnerwahl und „kein Turner“ zählen nicht, wie
     heute); **grüner Haken**, wenn alle Wertungen freigegeben sind.
   - **Anzeigetafel:**
     - Solange an keinem Gerät freigegeben ist, zeigt die Tafel das Gerät des gewählten Reiters und folgt jedem Wechsel.
     - Mit der ersten Freigabe (Oberliga: erstes Duell auf der Tafel – der erste Turner eines Duells wird ja nur
       gespeichert; Landesliga: erste freigegebene Wertung) bleibt die Tafel auf diesem Gerät, bis alle Wertungen
       freigegeben sind (grüner Haken) – egal, welchen Reiter der Bediener wählt.
     - Nach der letzten Freigabe bleibt die Tafel mindestens 10 Sekunden (Dauer der großen Einblendung) auf dem fertigen
       Gerät; wurde in der Zeit schon der Reiter gewechselt, springt sie danach von selbst um.
     - Vergessene Freigabe: Sind mehrere Geräte angefangen und nicht fertig, zeigt die Tafel das mit der letzten Freigabe
       (das andere behält den gelben Punkt).
     - Korrekturen an fertigen Geräten verschieben die Tafel nicht (Korrekturanzeige wie bisher).
   - ~~Bildschirmsymbol am Reiter des Geräts, das die Tafel gerade zeigt~~ – **entfällt** (entschieden 01.11.2026 nach
     Vorschaubildern mit drei Varianten: oben links, unten mittig, oben rechts mit dem Statuspunkt – für keine gibt es einen
     richtigen Platz, und nötig ist es nicht).
   - **Einturnzeit im Menü Anzeigetafel** zwischen Turnervorstellung und Wettkampfpause (Menüband und Aufklappmenü):
     - Ein einziger Timer (6:40) ohne Zuordnung zu einem Gerät. Reiterwechsel, Turneränderungen und Wertungen ändern nichts
       an ihm.
     - Läuft er, zeigt der Knopf die Restzeit (am Handy auch am Menüknopf, wie die Pause); Antippen beendet ihn vorzeitig,
       ohne Rückfrage „Gerät jetzt starten?“.
     - Eine laufende Wettkampfpause verhindert den Start der Einturnzeit und umgekehrt (Knopf jeweils grau; bestätigt).
     - Überschrift auf der Tafel: Einturn-Timer „Einturnen“ (bisher „Einturnzeit Barren“), Pausen-Timer „Wettkampfpause und
       Einturnen“ (bisher „Pause“) – während der Wettkampfpause wird schon das nächste Gerät eingeturnt, ein eigener
       Einturn-Timer ist dann nicht nötig. Am Ende wie heute „Einturnen beendet“ mit Schelle bzw. „Zeit abgelaufen“.
       Die längere Überschrift darf die Passung der Tafel nicht verändern (prüfen, notfalls kleiner).
   - Ältere Wettkämpfe: Die alten Startdaten werden nicht mehr beachtet.
5. **Landesliga: Zeile „Summe (beste 3)“ unter den Turnerkacheln entfällt** (beschlossen 01.11.2026): Derselbe Wert steht
   schon im Gerätereiter („Boden 0,00 : 0,00“) und in der Gerätezeile über den Kacheln („Gerätesumme …“). Streichwertungen
   bleiben an der Kachel erkennbar; die Links „Mannschaftsabzug Heim/Gast“ bleiben und rücken nach oben. Oberliga unverändert.
6. **Landesliga: Kopfzeile mit den Vereinsnamen über den Turnerkacheln entfällt** (beschlossen 01.11.2026): Die Zeile
   „● TSV Kierspe 2 beginnt | ● TuS Leopoldshöhe 2“ wird ganz gestrichen (beide Namen und „beginnt“). Jede Kachel trägt den
   Verein schon im farbigen Schild, die beginnende Mannschaft erkennt man an Kachel 1; am Handy standen beide Namen sogar
   untereinander über allen Kacheln. Die Kacheln rücken direkt unter die Gerätezeile („Boden · Gerätesumme …“). Oberliga
   unverändert.
7. **Handy: Zahlentastatur etwas höher, besser mit dem Daumen erreichbar** (beschlossen 01.11.2026):
   - Wertungsfenster: Unter der Zeile „Zahlentastatur“ kommt ein freier Streifen von etwa deren Zeilenhöhe (ca. 35 px);
     Tastatur und Auswahlzeile rücken zusammen um diese Höhe nach oben.
   - D-Note-Rechner: Seine Tastatur (ohne Auswahlzeile, heute rund 33 px tiefer) steht auf derselben Höhe wie im
     Wertungsfenster – der Daumen findet die Tasten in beiden Fenstern an derselben Stelle.
   - Der freie Streifen schrumpft von selbst, wenn der Platz nicht reicht (nichts wird verdeckt, kein Scrollen). Gemessen
     01.11.2026 (Beta 81): frei über der Tastatur iPhone 13 als App vom Home-Bildschirm ca. 195 px, in Safari ca. 49 px.
   - iPad und Laptop unverändert.
8. **Grundsatz Zielgeräte** (festgelegt 01.11.2026): Die App muss auf Handys **ab 6,1 Zoll** funktionieren – iPhone ab 6,1
   Zoll (z. B. iPhone 13–16: 390 × 844, in Safari mit Leisten sichtbar ca. 390 × 664) und entsprechende Android-Handys
   (6,1 Zoll sind dort oft nur 360 px breit, z. B. Galaxy S: 360 × 780 – die Breite 360 bleibt also wichtig).
   **iPhone SE und iPhone mini** (375 × 667 bzw. 375 × 812) müssen nicht mehr berücksichtigt werden; bisherige Anpassungen
   für sie bleiben, werden aber nicht mehr geprüft. Grundsatz kommt mit dem nächsten Update auch in die README.
9. **Sturz-Timer sperren wie die Turnerauswahl** (beschlossen 01.11.2026):
   - Kachel: Der Knopf „Sturz-Timer“ wird gesperrt, sobald dort die Turnerauswahl gesperrt ist (nach der Freigabe).
     Bei „kein Turner“ ist er wirklich gesperrt – bisher war er nur blass, startete den Timer aber trotzdem (Fehler).
   - Läuft der Timer gerade für diesen Turner, bleibt der Knopf bedienbar, bis er gestoppt oder abgelaufen ist (sonst ließe
     sich ein noch laufender Timer nach Freigabe oder Umstellen auf „kein Turner“ nicht mehr anhalten).
   - Wertungsfenster: Der Sturz-Timer oben rechts folgt denselben Regeln – gesperrt bei einer bereits freigegebenen Wertung
     („Wertung ändern“) und bei „kein Turner“, außer sein Timer läuft gerade.
10. **iPad hochkant: D-Note-Rechner so breit wie das Wertungsfenster** (beschlossen 01.11.2026, Fehler seit Beta 78):
    Gedacht war gleiche Breite (der Rechner deckt das Wertungsfenster genau ab), eine später stehende CSS-Regel hob die
    Begrenzung im Hochformat aber auf. Gemessen (Beta 81): iPad Air hoch Wertungsfenster 760 / Rechner 788 px, iPad Pro
    12,9″ hoch 760 / 992 px; iPad 9,7″ hoch (736/736) und iPad quer (1100/1100) schon gleich. Künftig im Hochformat höchstens
    760 px wie das Wertungsfenster – Zahlentastatur an derselben Stelle, Anzahlfelder näher an D, C, B, A. iPad quer, Laptop
    und Handy unverändert.

## Liste nach Beta 80 – umgesetzt in Beta 81 (veröffentlicht 01.11.2026, Commit `b102b5c`)

Umgesetzt 01.11.2026 (Punkte 1 und 2). Rückkehrpunkt: Beta 80 (Commit `8f145eb`), Beta 79 als Zweig `stand-beta-79`.


1. **Menüs in der grauen Kopfzeile** (beschlossen 01.11.2026: **Laptop und iPad Menüband, Handy Aufklappmenüs**):
   - Regel: Menüband ab 700 px Breite und 500 px Höhe (Laptop, iPad quer und hoch), sonst Aufklappmenüs (Handy hoch und quer).
     Die Knöpfe gibt es nur einmal; nur die Darstellung richtet sich nach dem Bildschirm.
   - Knöpfe wie heute, ohne „an“/„aus“: Wettkampfpause zeigt die Restzeit („Wettkampfpause 4:12 – beenden“, auf dem iPad hoch
     kürzer „Pause 4:12 – beenden“); Tipp auf „Wettkampfpause“ klappt die Dauer (10 · 15 · 20 Minuten) auf, die Wahl startet
     die Pause. Ergebnis/Siegerehrung und Turnervorstellung öffnen ihr Fenster in der App (siehe Punkt 2).
   - Handy: Menü schließt nach der Auswahl (nicht beim Aufklappen der Pausendauer); die laufende Pause steht am Menüknopf
     („Pause 4:12“, orange). Tab erreicht Reiter bzw. Menüknöpfe (gelbe Umrandung), Esc schließt ein Aufklappmenü.
   - Vorausdenken (01.11.2026): Der Bereich „Anzeigetafel“ soll später eventuell auch den Einturn-Timer aufnehmen können,
     falls Gerätestart und Gerätesperre vereinfacht werden (noch offen). Menüband und Aufklappmenü daher so anlegen, dass ein
     weiterer Knopf mit laufender Zeit (wie die Pause) Platz hat – am iPad hoch notfalls mit kürzeren Beschriftungen.
   Bisherige Ideen dazu: „WTB-Oberliga ▾“ (Wettkämpfe, Mannschaften, Regeln, Anleitung, Startseite), „Anzeigetafel ▾“
   (Anzeigetafel öffnen, Hell/Dunkel, Turnervorstellung, Wettkampfpause, Ergebnis/Siegerehrung – Zustand wie „Pause 4:12“ am
   Menüknopf) und „Wettkampf ▾“ (Setup, Protokoll/Drucken, Wettkampf abschließen); am iPhone „Oberliga ▾ | Tafel ▾ |
   Wettkampf ▾“, „online“ als Punkt, „Beta“ im Ligamenü. Die Werkzeugzeile entfällt; Gerätereiter beginnen dann am Laptop
   bei ca. 126 statt 168 px, iPad quer 126 statt 215, iPad hoch 267 statt 475, iPhone 224 statt 764 px.
   **Variante Menüband (wie Office, „Menüband immer anzeigen“)** – Vorschaubilder gezeigt 01.11.2026: In der grauen Zeile
   „WTB-Oberliga ▾“ (Aufklappmenü der Liga) und die Reiter „Anzeigetafel“ / „Wettkampf“; darunter immer eine schmale Leiste
   mit den Knöpfen des gewählten Reiters (nicht einklappbar, damit nichts springt). Läuft die Pause, zeigt der Pause-Knopf
   die Restzeit (orange), bei Reiter „Wettkampf“ der Reiter „Anzeigetafel“ ein „4:12“-Abzeichen. Handy: „Oberliga ▾ | Tafel |
   Wettkampf“, Knöpfe kurz („Öffnen“, „Hell“/„Dunkel“, „Vorstellung“, „Pause“, „Ergebnis“ bzw. „Setup“, „Protokoll“,
   „Abschließen“). Nachgemessen: Laptop Gerätereiter ab 159 statt 174 px, beim Scrollen fest 199 statt 215 px; iPad quer
   159 statt 221, fest 199 statt 262; iPhone 249 statt 640, beim Scrollen fest 91 statt heute 139 px.
2. **Ergebnis/Siegerehrung als Fenster in der App** (gewünscht 01.11.2026): wie bei der Turnervorstellung – ist
   Ergebnis/Siegerehrung eingeblendet, überlagert dasselbe Fenster wie auf der Tafel („Zwischenstand“ bzw. „Wettkampfergebnis“:
   Stand, Gerätepunkte, Topscorer) die App, mit einem Knopf zum Schließen. So kann der Bediener die Siegerehrung lesen, ohne zum
   Beamer zu schauen. „Schließen“ blendet es wie bei der Turnervorstellung auch auf der Tafel aus (bestätigt 01.11.2026).

## Umgesetzt in Beta 80 (veröffentlicht 01.11.2026)

1. **Einheitliche Tastaturbedienung im Wertungsfenster und im D-Note-Rechner** (beschlossen 01.11.2026; umgesetzt in Beta 80,
   veröffentlicht 01.11.2026, Commit `8f145eb`):
   - Hardware-Tastatur: Tab/Umschalt+Tab wie bisher (Turner → E1 → E2 → (E3) → D-Note → Stand → NA → „Wertung freigeben“).
     → und Enter vorwärts im Kreis E1 → … → NA → „Wertung freigeben“ (nur wenn aktiv, sonst übersprungen) → E1, ← rückwärts.
     Enter auf „Wertung freigeben“ gibt frei. ↑/↓: kein ±0,1 mehr; auf dem Stand schalten ↑/↓ den Standbonus um (auch 1 = ja,
     0 = nein, Leertaste); auf der D-Note wählt ↓ „berechnen“ (Enter öffnet den Rechner, ↑ zurück). Enter auf dem Stand geht
     weiter (schaltet nicht um). Esc = Abbrechen.
   - Software-Tastatur: rechte Spalte ⌫ – „◀ Zurück“ – „Weiter ▶“ (doppelt hoch), keine Enter-Taste; Kreis E1 → … → Stand →
     NA → E1 ohne „Wertung freigeben“ (wird angetippt). Stand aktiv: 1 = ja, 0/⌫ = nein, 2–9 und Komma ausgegraut.
     „berechnen“ wird angetippt.
   - D-Note-Rechner: Software-Tastatur ebenfalls mit „◀ Zurück“ (Kreis ≥ D … EG, „Übernehmen“ antippen, Komma bei den
     Anzahlen ausgegraut). Hardware: Enter/→ ≥ D → … → EG → „Übernehmen“ (nur wenn möglich) → ≥ D, ← zurück, Enter auf
     „Übernehmen“ übernimmt; kein ±1 mit ↑/↓ mehr; Tab über ≥ D … EG und „Übernehmen“, Esc = Abbrechen.
   - Auf Touch-Geräten schalten auch Pfeiltasten und Enter einer angeschlossenen Tastatur die Bildschirm-Tastatur aus.
   - Gelbe Umrandung in der ganzen App für alles, was mit der Tastatur ausgewählt ist (Felder, ganzer Stand-Kasten,
     „Wertung freigeben“, „berechnen“, „Übernehmen“, Kachel-Knöpfe, Auswahllisten, Setup); nicht bei Maus/Finger.

## Liste nach Beta 78 – umgesetzt in Beta 79 (veröffentlicht 01.11.2026)

Begonnen 01.11.2026, umgesetzt und getestet 01.11.2026 (Punkte 1–11), veröffentlicht nach Freigabe (Commit `838a88a`).
**Gesichert** als eigener Zweig **`stand-beta-79`** (Rückkehrpunkt, bevor die Menüs aus der nächsten Liste ausprobiert werden).

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
4. **Zahlentastatur: „Weiter“ als Kreislauf, Tastatur steht fest** (gemeldet 01.11.2026): Bisher springt „Weiter ▶“
   nach dem letzten Feld (NA) auf „Wertung freigeben“; dabei verschwinden Feld- und Turnername über der Tastatur, die Zeile
   wird niedriger und die Tastatur rutscht ein Stück nach oben. Am Touch-Gerät bringt der Sprung nichts – „Wertung freigeben“
   wird ohnehin angetippt.
   - Die Anzeigezeile über der Tastatur bekommt eine feste Höhe – die Tastatur bewegt sich nie.
   - „Weiter ▶“ ist ein Kreislauf (entschieden 01.11.2026): nach dem letzten Feld wieder E1. Freigegeben wird durch Antippen
     von „Wertung freigeben“. Ebenso im D-Note-Rechner: nach EG wieder ≥ D, „Übernehmen“ wird angetippt.
   - Mit echter Tastatur (Laptop) bleibt es wie bisher: Enter nach dem letzten Feld springt auf „Wertung freigeben“
     bzw. „Übernehmen“, ein weiteres Enter gibt frei.
5. **Standbonus über die Zahlentastatur** (beschlossen 01.11.2026): „Stand“ wird ein Feld in der
   Reihenfolge von „Weiter ▶“ – E1 → E2 → (E3) → D-Note → Stand → NA → E1 (am Pauschenpferd ohne Stand). Ist Stand aktiv,
   zeigt die Anzeige über der Tastatur „Standbonus · Turner“ und „+0,1“ bzw. „–“; Taste **1** = Standbonus ja (+0,1),
   **0** oder **⌫** = nein, das Komma ist dort gesperrt. Antippen des Kästchens schaltet wie bisher direkt um.
   Am Laptop unverändert (Tab erreicht das Kästchen, Leertaste schaltet um).
6. **Hardware-Tastatur: kürzere Tab-Reihenfolge, Felder auch mit ← / →** (beschlossen 01.11.2026):
   - Tab im Wertungsfenster nur noch: Turner → E1 → E2 → (E3) → D-Note → Stand → NA → „Wertung freigeben“ → wieder Turner
     (Umschalt+Tab rückwärts). Nicht mehr per Tab erreichbar: „berechnen“, „Wertung 0,00“, „Abbrechen“ (dafür gibt es Esc),
     außerdem der Sturz-Timer-Knopf oben (in der Kachel ist er schon nicht per Tab erreichbar) und die Einstellung
     „Zahlentastatur“. Mit Maus bzw. Antippen bleibt alles bedienbar.
   - **← / →** wechseln zwischen den Feldern E1 … NA (inkl. Stand), in beide Richtungen und im Kreis; der Inhalt des neuen
     Felds ist markiert, Tippen ersetzt ihn. Innerhalb eines Felds lässt sich der Cursor damit nicht mehr verschieben (bei
     Werten wie „1,4“ wird ohnehin neu getippt; ⌫ löscht). ↑ / ↓ bleiben ±0,1.
   - In der geschlossenen Turnerauswahl ändern ← / → den Turner nicht versehentlich (wie schon ↑ / ↓).
   - D-Note-Rechner genauso: Tab ≥ D → C → B → A → EG → „Übernehmen“, ← / → zwischen den Feldern, „Abbrechen“ = Esc.
7. **D-Note-Rechner: Texte** (beschlossen 01.11.2026, Texte bestätigt):
   - Statt „Elemente 4 von 8“ steht „noch 4 Elemente möglich“ (Einzahl: „noch 1 Element möglich“; bei 8 Elementen:
     „keine Elemente mehr möglich“; bei mehr als 8 rot: „1 Element zu viel“ bzw. „2 Elemente zu viel“). „Summe“ rechts bleibt.
   - Bei EG entfällt der Text „höchstens 2,3“ (nur noch „Elementgruppen“); die rote Markierung bei einem zu hohen Wert bleibt.
8. **D-Note-Rechner nach Änderung von Hand leer** (gewünscht 01.11.2026): Wurde die D-Note nach dem Rechner direkt im Feld
   geändert, öffnet der Rechner danach leer statt mit der alten Berechnung. Regel: Der Rechner zeigt die gespeicherten
   Anzahlen nur, wenn sie genau die D-Note im Feld ergeben (z. B. bei einer Korrektur ohne Änderung der D-Note); sonst
   beginnt er leer. Beim Freigeben gilt schon dieselbe Regel (nicht passende Anzahlen werden nicht gespeichert).
9. **„kein Turner“ direkt in der Kachel freigeben** (beschlossen 01.11.2026): Bisher zeigt die Kachel nach „kein Turner“
   schon „Endnote 0,00“, freigegeben werden muss aber über „Wertung eingeben“ und das Fenster – nicht intuitiv.
   - Ist in der Kachel „kein Turner“ gewählt (und noch nicht freigegeben), heißt der Knopf **„Wertung freigeben“**
     (hervorgehoben); ein Klick gibt ohne Fenster frei – genau wie die Freigabe im Fenster (Landesliga: Übung auf die Tafel;
     Oberliga: Duell frei, wenn beide Turner fertig sind, sonst gespeichert; gleiche Meldungen).
   - Danach heißt der Knopf „Wertung ändern“ und öffnet wie bisher das Fenster (z. B. wenn der Turner doch geturnt hat).
   - Vorab (vor dem Gerätestart) gewählt: Knopf bis zum Start gesperrt wie bisher. „kein Turner“ im Fenster gewählt: das
     Fenster bleibt offen, dort „Wertung freigeben“.
   - Tastatur: Tab von der Turnerauswahl zum Knopf, Enter gibt frei; danach Fokus beim nächsten Turner.
10. **Startseite ohne Scrollen** (gewünscht 01.11.2026):
    - Die Reihe mit den 6 Gerätepiktogrammen (ohne Funktion) und der Satz „Bitte die Liga wählen“ entfallen (beschlossen).
    - Zusätzlich am Handy (beschlossen 01.11.2026): Im Kopf der Startseite steht eine leere, unsichtbare Menüzeile
      (ca. 85 px dunkle Fläche) – sie entfällt auf der Startseite; die drei Kacheln werden etwas flacher, das Logo etwas
      kleiner (64 statt 96 px). Nachgemessen: ohne Scrollen in der installierten App (390×844), im iPhone-Safari (390×664)
      und auf kleinen Android-Handys (360×640); nur das iPhone SE im Safari (375×548) scrollt noch ca. 70 px.
      Nur die Reihe und den Satz wegzulassen reicht nur in der App (im Safari blieben ca. 130 px).
    - iPad und Laptop scrollen schon heute nicht; dort ändert sich nur der Wegfall von Reihe und Satz.
11. **Grundsatz Namen: fester Platz für Vereins- und Turnernamen** (beschlossen 01.11.2026):
    - Grundsatz: Vereins- und Turnernamen haben in jeder Ansicht und Bildschirmgröße einen festen Platz, der sich nicht nach
      dem Namen richtet. Durchschnittliche Namen passen ohne Umbruch und ungekürzt (Vereine bis ca. 19 Zeichen wie
      „TG Geisweid/Eichen“, „TV Jahn Plettenberg“; Turner wie „Daudrich, Michael“, „Brickwedde, Henning“ – die längsten der
      vorgegebenen Turnerlisten haben 19 Zeichen). Längere Namen brechen innerhalb des festen Platzes um (wie das
      Mannschaftsschild in der Kachel) oder werden mit „…“ gekürzt; sie machen nichts höher und schieben nichts weg.
      Querformat (ab 1100 px Breite): Die Ergebniszeile oben bleibt immer einzeilig.
    - Prüfung 01.11.2026 (FullHD, Laptop 1366/1280, iPad quer/hoch, Handy; mittlere und lange Namen): in Ordnung sind
      Kacheln am Laptop/iPad (Mannschaftsschild zweizeilig ohne Mehrhöhe, Turnerauswahl breit genug), Wertungsfenster am
      Laptop/iPad, Anzeigetafel (feste Zeilen), Turnervorstellung, Wettkampfliste am Laptop/iPad. Nicht in Ordnung:
      a) Ergebniszeile Laptop/iPad quer: langer Name zweizeilig, ab 1280 px/iPad quer drei Reihen (Liga, „Beginn: …“,
         „Sieger: …“ und Namen ohne feste Breite).
      b) Handy, Kopf: schon „TG Geisweid/Eichen“ bricht um, der Kopf wird höher.
      c) Handy, Kacheln: Turnerauswahl neben dem Mannschaftsschild nur ca. 80–150 px breit – „1 Daudrich, Michael“ abgeschnitten.
      d) Handy, Wertungsfenster: bei langem Vereinsnamen ist die Turnerauswahl zu schmal für „14 Wilmes, Jonathan“.
      e) Handy, Topscorer-Tabelle unten auf der Eingabeseite: Namen brechen dreizeilig um.
      f) Handy, Wettkampfliste: sehr lange Namen machen die Zeile höher.
    - Beschlossen (01.11.2026):
      a) Ergebniszeile Laptop/iPad quer: Liga, „Beginn: …“ und „Sieger: …“ entfallen; Heim rechtsbündig vor dem Stand, Gast
         linksbündig dahinter, beide mit fester Breite und „…“ (nachgestellt: „SG Langenei-Kickenbach/Gleidorf“ passt ab iPad
         quer ganz).
      b) Handy-Kopf: die beiden Mannschaften als zwei Zeilen „● Verein … Punkte“ untereinander (volle Breite je Name).
      c) Handy-Kacheln: Turnerauswahl immer in eigener Zeile über die volle Breite (bisher nur, wenn der Vereinsname sehr lang
         ist – z. B. bei SG Langenei-Kickenbach/Gleidorf; bei mittellangen Namen blieb sie daneben und zu schmal).
      d) Handy-Wertungsfenster: Vereinsschild und Turnerauswahl untereinander (beide volle Breite); am Laptop/iPad bleiben sie
         nebeneinander. Passt auch mit Safari-Leisten; auf dem kleinsten iPhone (SE) gleichen etwas kleinere Tasten das aus.
      e) Die Topscorer-Tabelle entfällt auf der Eingabeseite – auf allen Geräten, beide Ligen. Im Fenster
         „Ergebnis/Siegerehrung“ der Anzeigetafel und im Protokoll bleiben die Topscorer.
      f) Handy-Wettkampfliste: Namen höchstens zwei Zeilen, dann „…“.

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
