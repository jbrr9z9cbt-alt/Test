# Offene Punkte (noch nicht umgesetzt)

## Liste nach Beta 85

### 1. Zahlentastatur am iPad quer: Breite darf sich beim Tippen nicht ändern
Beobachtet (Video 16.11.2026, iPad quer, Beta 85): Beim Tippen von „1 1 1“ (0,1 → 1,1 → 11,1) wird die Zahlentastatur
breiter und rückt nach links. Nachgestellt (iPad quer 1024 bis 1366 px breit, Turner mit langem Namen): Die Tastatur wächst bei
„11,1“ von 304 auf 314 px; hochkant und am Handy bleibt sie gleich.
Ursache: Neben den Feldern ist die Tastatur 19rem breit, darf aber nicht schmaler werden als ihr Inhalt. Die Zeile darüber
(„Abzüge E3 · 2 Brickwedde, Henning“ und der Wert) passt bei langem Namen und breitem Wert nicht mehr hinein – dann wird die
ganze Tastatur breiter.
Lösung: Die Tastatur behält immer ihre Breite; wird die Zeile zu lang, wird nur der Name darin mit „…“ gekürzt, der Wert
bleibt voll sichtbar. Im Test geprüft (iPad quer 1024, 1180, 1366 px): Breite bleibt 304 px. Gleiches im D-Note-Rechner
prüfen; Browser-Test dazu.

### 2. Mannschaftslisten der Oberliga (Stand Saison 2026)
Gewünscht 18.11.2026 bei der Übernahme der Excel-Wettkämpfe:
- **KTS Mettingen:** Nr. 1 heißt „Baar, Mats“ (statt „Baar, Matz“).
- **KTV Dortmund:** neu Nr. 13 „Ledesma, Erick“. „Hellmich, Thomas“ (Nr. 1) ist richtig geschrieben.
- **SG Langenei-Kickenbach/Gleidorf** hat 2026 nicht in der Oberliga geturnt und wird aus der Oberliga herausgenommen
  (beschlossen 18.11.2026). Der 7. Platz bleibt einfach leer: Er erscheint nirgends (nicht bei „Neuer Wettkampf“, nicht
  unter „Mannschaften“, nicht in der Tabelle des Ligaberichts), bis eine neue 7. Mannschaft in `js/config.js` eingetragen
  wird. Die **Landesliga-Liste bleibt vorerst unverändert** und wird vor Beginn der nächsten Saison aktualisiert.
- Dafür wird die Version der Oberliga-Turnerlisten erhöht: Nach dem Update stehen die Turnernamen der Oberliga auf allen
  Geräten wieder auf dem Stand dieser Liste (dort selbst geänderte Namen werden überschrieben); bereits erfasste Wettkämpfe
  bleiben unverändert, weil sie die Namen selbst speichern.

### 3. Ligabericht: kampfloser Wettkampf (Mannschaft nicht angetreten)
Anlass: 07.11.2026 KTS Mettingen – TZ Bochum-Witten, Bochum-Witten nicht angetreten; Mettingen gewinnt mit 12:0 Gerätepunkten
und 2:0 Wettkampfpunkten. Beschlossen 18.11.2026 – eingetragen wird das im **Ligabericht** (nicht in der App der Vereine):
- Bei „3. Kommende Wettkämpfe“ bekommt jeder Eintrag die Auswahl **Termin · Heim nicht angetreten · Gast nicht angetreten**
  (für den 07.11.: Datum, Mettingen, Bochum-Witten eintragen und „Gast nicht angetreten“ wählen). „Termine sichern /
  einlesen“ nimmt die Angabe mit.
- **Wettkampfliste:** Aus der Terminzeile wird eine Ergebniszeile – Sieger fett, in der Ergebnisspalte **„kampflos“**,
  Gerätepunkte **12:0**, Wettkampfpunkte **2:0**, ohne Protokollseite. Unter der Liste der Hinweis „kampflos = Gegner nicht
  angetreten (Gerätepunkte 12:0, Wettkampfpunkte 2:0)“.
- **Tabelle:** zählt für beide als Wettkampf (Sieger S, nicht angetretene Mannschaft N); die 12:0 gehen in Gerätepunkte und
  Differenz ein; im direkten Vergleich zählt er wie ein Sieg. Scorepunkte spielen keine Rolle; in der Landesliga ändert er
  die Gesamtpunkte nicht.
- „x von y Wettkämpfen gewertet“ zählt ihn als gewertet.
- Gilt für beide Ligen gleich (kampflos immer 12:0 Gerätepunkte, 2:0 Wettkampfpunkte).

### 4. Querformat: Wertungen einzeilig – ganzes Gerät ohne Scrollen
Beschlossen 21.11.2026 nach Vorschaubildern (nachgebaut in der echten App, Beta 85). Der obere Bereich (Kopfzeile, Menüband,
Stand, Gerätereiter) bleibt unverändert; darunter steht der Inhalt jeder Wertungskachel in **einer Zeile**:
- **Tabelle mit Spaltenköpfen einmal oben:** Nr. (mit ▶ für „legt vor“, wie im Protokoll) · Verein · Turnerauswahl · E1 ·
  E2 · (E3) · D-Note · Stand · NA · E-Note · Endnote · Knopf **„Sturz“** (nur an Pauschenpferd, Ringen, Barren, Reck) ·
  Knopf **„Eingeben“ / „Ändern“**. Mannschaft zusätzlich als Farbleiste links an der Zeile.
- **Verein:** Feld so breit wie „TZ Bochum-Witten“; längere Namen einzeilig mit „…“ abgeschnitten (keine zweite Zeile).
- **Oberliga:** je Duell zwei Zeilen, links „Duell n“, rechts über beide Zeilen die Scorepunkte des Duells mit ✓ daneben
  (freigegeben), darunter „unentschieden“ bzw. „Diff. …“ in kurzen Zeilen; „offen“, solange das Duell nicht fertig ist.
- **Landesliga:** alle Übungen in Wettkampfreihenfolge (1.–8., abwechselnd), am Zeilenende „✓ freigegeben“ bzw. der
  Hinweis bei einer Änderung; Streichwertung durchgestrichen. Die Links „Mannschaftsabzug Heim/Gast“ rücken in die
  Kopfzeile des Geräts (spart eine Zeile).
- **Breite:** Die Tabelle ist nur so breit wie nötig (je nach Gerät etwa 920–1050 px) und steht mittig – keine unnötigen
  Lücken; die volle Bildschirmbreite wird nur genutzt, soweit nötig. Etwas engere Spaltenabstände, Turnerauswahl etwas
  schmaler als heute.
- **Gilt nur im Querformat ab 1100 px Breite** (dort ist der obere Bereich schon heute flach). Hochformat, Handys und das
  ältere iPad 10,2" quer (oberer Bereich dort doppelt so hoch) behalten die heutigen Kacheln.
- Gemessen ohne Scrollen und ohne Überbreite (beide Ligen, Geräte mit und ohne Sturz-Timer): Laptop 1280 × 800 und
  1366 × 768 im Browser, 1536 × 864, Full HD, iPad mini, Air 11" und Pro 13" quer.
- **„Sturz-Timer“ heißt künftig überall „Sturz“** (Kachel, Wertungsfenster, Anleitung, README); die laufende Anzeige
  (Sekunden, „· Abzug 0,3 – Stopp“) bleibt.
- Bedienung wie heute: Turnerauswahl in der Zeile, Wertung im Wertungsfenster, Tab-Reihenfolge = Wettkampfreihenfolge.
  Browser-Tests für die Passung (die Größen oben) und die Bedienung in der Zeile.

## Liste nach Beta 84 – umgesetzt in Beta 85 (veröffentlicht 16.11.2026, Commit `febb54e`)

Umgesetzt 15./16.11.2026 (Punkte 1–12). Rückkehrpunkt: Beta 84 (Commit `356e885`).
Hinweise zur Umsetzung:
- Punkt 8: Die Tafel wählt ihre Form mit derselben Grenze wie das Stylesheet (Seitenverhältnis 1:1): quer große Tafel,
  hochkant ausführliche Tafel; Drehen wechselt sofort. Umschalter „Groß“ entfernt (ein in alten Wettkämpfen gespeichertes
  `display.size` wird nicht mehr beachtet). Die Querformat-Aufteilung der ausführlichen Tafel ist entfernt: Die Regeln
  gelten jetzt ohne Hochformat-Klammer, überschriebene Querformat-Angaben sind weg (auch die Zeilenhöhen-Anpassung der alten
  Gerätetabelle in `evenRows`). Prüfung: berechnete Stile aller Elemente der Tafel vorher/nachher in 96 Ansichten
  (6 Zustände × 8 Fenstergrößen, hell und dunkel) – keine sichtbare Abweichung.
- Punkt 7: Einzeilige Namensfelder (Kasten „als Nächstes“, Karte, beide Tafeln) reichen per Innenabstand etwas weiter nach
  unten, ein gleich großer negativer Außenabstand hält die Aufteilung (gemessen: höchstens 0,1 px Verschiebung). Die
  Mannschaftsnamen oben auf der großen Tafel sind nur noch seitlich begrenzt. **Dabei behoben:** Der Hinweis
  „inkl. Abzug −…“ unter dem Mannschaftsnamen war auf der großen Tafel (Beta 84) abgeschnitten und unsichtbar – jetzt sichtbar.
- Punkt 6: Namen über dem Ergebnis, beide Spalten gleich breit (nach dem längeren Namen bzw. der breiteren Zahl); geprüft
  in beiden Ligen auf Tafel (Full HD, 1366 × 768, 4K, Handy) und in der App (Laptop, iPad, Handy).
- Punkt 5: Test „langer Klick“ (1,6 s gedrückt über den Sekundenwechsel) für Pause, Einturnzeit und Sturz-Timer – schlägt
  ohne die Änderung fehl, mit ihr nicht.
- Punkt 3: Die Dauer steht im Timer (`timers.warmup.ms`); ältere Wettkämpfe ohne Angabe: 4:00. Eingabe auch „6,40“ bzw.
  „6.40“ (die Zahlentastatur des iPhones hat keinen Doppelpunkt).
- Punkte 10–12: Lage der Zahlentastatur im Wertungsfenster und im D-Note-Rechner vorher/nachher gleich (iPhone 6,1" und
  6,7", Android 360 px); die Zeile „Zahlentastatur / Tastenton“ bleibt einzeilig. Klicks des Browsers auf die Tasten werden
  nicht mehr ausgewertet (nur noch das Berühren), der Tastenton nutzt dieselbe Tonausgabe wie die Timer-Signale.
- Punkt 9: `bericht.html` lädt `js/app.js` im Berichtsmodus (`window.WTB_REPORT`): keine Datenbank, keine Anzeige, kein
  eigener Start der App; `window.WTBReport` liefert Namen, Rechenlogik und Protokolle (dieselben wie in der App). Eigene
  Datenbank `wtb-ligabericht` (Wettkämpfe, Mannschaften, Termine). Direkter Vergleich: erst die Wettkampfpunkte aus den
  Wettkämpfen der ganzen Gruppe untereinander, bleiben einige gleich, erneut nur unter diesen. Seite und Protokolle sind im
  Offline-Speicher (Service Worker) enthalten.
- Nebenbei: Das Menüband ragte am iPad hochkant (744 px) mit laufender Pause rechts heraus (Beta 84: 39 px); ohne den
  Umschalter „Groß“ passt es ab 720 px Breite.
- Browser-Tests: 28, alle bestanden; Unit-Tests 22 (neu u. a. Einturnzeit-Auswahl, langer Klick, Zahlentastatur ×3, Tafelform nach Ausrichtung, Ligabericht).

### 1. Große Tafel: Rahmen „als Nächstes“ wie die Karte darunter
Der Kasten mit dem nächsten Duell bzw. Turner bekommt denselben Hintergrund und dieselben runden Ecken wie die Karte
des aktuellen Duells: hell weiß mit dem leichten Schatten der Karte, dunkel dunkelgrau wie die Karte. Die gestrichelte
Linie entfällt. Inhalt, Größe und Position bleiben gleich (Unterscheidung über „Duell 4 · als Nächstes“ in der Mitte und
nur die Namen).

### 2. D-Note-Rechner: „keine Elemente mehr möglich“ normal statt farbig
Bei genau 8 Elementen steht „keine Elemente mehr möglich“ heute dunkelorange und fett – 8 Elemente sind aber ein
regulärer Fall. Künftig genauso wie „noch 3 Elemente möglich“ (normal, schwarz). Rot bleibt nur der Fehlerfall mit mehr
als 8 Elementen („1 Element zu viel“).

### 3. Einturnzeit mit Auswahl der Dauer (wie bei der Wettkampfpause)
- Ein Klick auf **„Einturnzeit“** öffnet ein kleines Menü wie bei der Pause: **4 Minuten** · **Andere Zeit …** und – wenn es
  sie gibt – die **zuletzt gewählte eigene Zeit** als dritter Eintrag (z. B. „6:40 (zuletzt)“, auf dem Gerät gemerkt).
- „4 Minuten“ bzw. die zuletzt gewählte Zeit starten sofort.
- **„Andere Zeit …“** öffnet ein kleines Fenster „Einturnzeit in Minuten“: Eingabe z. B. `5` oder `6:40`
  (Minuten:Sekunden), erlaubt 1 bis 30 Minuten; [Abbrechen] [Starten] – „Starten“ startet sofort.
- Gleich bleibt: Restzeit im Knopf, Klick auf den laufenden Knopf beendet; Tafel („Einturnen“ mit Uhr, auch auf der großen
  Tafel), Schelle am Ende, gegenseitige Sperre mit der Wettkampfpause. Am Handy im Aufklappmenü „Tafel“ wie die Pause.
- Die Dauer wird mit dem laufenden Timer im Wettkampf gespeichert (Tafelfenster kennt sie); ältere Wettkämpfe ohne Angabe: 4:00.
- Hilfetext und README anpassen.

### 4. Tafel: Hinweis „Noch keine Wertung angezeigt“ entfällt
Solange noch keine Wertung auf der Tafel ist, bleibt die Karte einfach leer – bei der Standardtafel und bei der großen
Tafel. Größe und Aufteilung der Tafel bleiben gleich; mit der ersten Freigabe erscheint wie gewohnt das Duell bzw. die Übung.

### 5. Laufende Timer lassen sich auch mit langem Klick stoppen
Fehler: Wettkampfpause, Einturnzeit und Sturz-Timer ließen sich nur mit einem kurzen Klick stoppen; bei längerem Drücken
(über den nächsten Sekundenwechsel) passierte nichts. Ursache: Die Beschriftung des laufenden Knopfs wird jede Sekunde neu
geschrieben; dabei wird der Text im Knopf ausgetauscht, und der Browser verwirft den Klick, weil Drücken und Loslassen nicht
mehr auf demselben Element liegen. Nachgestellt (1,6 s gedrückt: Pause und Sturz-Timer liefen weiter).
Lösung: Klicks auf die Beschriftung zählen als Klick auf den Knopf selbst (Text im Knopf nicht anklickbar) – für Pause,
Einturnzeit, Sturz-Timer (Kachel und Wertungsfenster) und den Menüknopf „Anzeigetafel“ mit der laufenden Zeit. Im Test mit
dieser Änderung: alle drei Timer stoppen auch bei langem Klick.

### 6. Ergebnis/Siegerehrung: lange Mannschaftsnamen über dem Ergebnis
Beobachtet (Foto 15.11.2026, Landesliga, Laptop): Neben den breiten Summen („44,00 : 41,60“) bleibt für die Namen nur ein
schmaler Streifen – „TSV Kierspe 2“ bricht auf drei Zeilen um, „Leopoldshöhe“ wird am Rand abgeschnitten. In der Oberliga
kann es bei sehr langen Namen genauso passieren.
Beschlossen: Die Mannschaftsnamen stehen **über** ihrem Ergebnis statt daneben, jeweils mittig über der Zahl, einzeilig in
der Mannschaftsfarbe; ein zu langer Name wird nur selbst etwas kleiner, bis er passt (kein Umbruch, nichts abgeschnitten).
Für beide Ligen, auf der Tafel (bildschirmfüllend) und im Fenster „Ergebnis/Siegerehrung“ in der App.

### 7. Unterlängen (g, j, p, q, y) nicht abschneiden
Beobachtet (Foto 15.11.2026, große Tafel, Laptop mit Windows): Im Kasten „als Nächstes“ fehlt beim „g“ in „Berg“ die
Unterlänge. Ursache: Die einzeiligen Namensfelder der großen Tafel sind genau eine Zeile hoch und schneiden Überstehendes ab;
die Windows-Schrift (Segoe UI) hat tiefere Unterlängen als die Testumgebung.
Lösung: Diese Felder bekommen etwas mehr Höhe nach unten (Namen im Kasten „als Nächstes“, in der Karte, Mannschaftsnamen
oben, Namen im Geräteergebnis), Aufteilung unverändert. Standardtafel und Einblendungen dabei mitprüfen.

### 8. Tafel wählt ihre Form nach der Ausrichtung – in der Halle nur noch die große Tafel
Die große Tafel hat sich bewährt; für die Halle wird die bisherige ausführliche Tafel nicht mehr gebraucht. Am Handy
verschenkt die große Tafel viel Platz – dort passt die ausführliche Version, die später auch für Zuschauer auf dem eigenen
Handy gedacht ist (siehe „Weitere offene Punkte“: Netzwerkfunktion).
Beschlossen:
- **Querformat** (Beamer, Fernseher, Laptop): immer die große Tafel.
- **Hochformat** (Handy, Tablet hochkant): die bisherige ausführliche Tafel in ihrer Handy-Aufteilung (Beta 82/83).
- Der **Umschalter „Groß“** im Menü Anzeigetafel entfällt (Menüband wieder schmaler; in der Halle nichts mehr einzustellen).
- Die **Querformat-Aufteilung der ausführlichen Tafel** wird nicht mehr gebraucht und wird entfernt (spart doppelte Arbeit).
  Die Hochformat-Version bleibt erhalten und wird in den Browser-Tests weiter geprüft.
- Bekannt und so gewollt: In der Halle steht keine Liste aller Turner eines Geräts mehr gleichzeitig auf der Tafel – sie
  erscheint als Geräteergebnis nach dem Gerät bzw. als Übersicht in der Pause. Ein hochkant aufgestelltes Tablet zeigt die
  ausführliche Version.
- Hilfetext und README anpassen; Punkte 1, 4, 6, 7 dieser Liste entsprechend für die verbleibenden Formen umsetzen.

### 9. Ligabericht: eigene Seite für den Ligaleiter (Saisonübersicht als PDF)
Bis zur Netzwerkfunktion braucht der Ligaleiter eine Möglichkeit, die Wettkämpfe einer Saison einzulesen und daraus ein PDF
zu erstellen. Nicht in der App der Vereine, sondern auf einer **eigenen, nicht verlinkten Seite** im selben Projekt
(z. B. `…/Test/bericht.html`), nur für den Ligaleiter. Vorschaubilder vom 15.11.2026 (Oberliga und Landesliga, zweite Fassung).
- **Technik:** läuft im Browser am PC (Chrome/Edge), auch ohne Internet; die Daten bleiben auf dem Rechner (nichts wird
  hochgeladen). Gleiche Rechenlogik und gleiche Protokoll-Darstellung wie die App.
- **Einlesen:** Die Vereine schicken die Sicherungsdatei des Wettkampfs („Sichern“ in der Zeile auf der Seite Wettkämpfe →
  `…EINZELWETTKAMPF_….json`; Gesamtsicherungen gehen auch). Alle Dateien auf einmal hineinziehen. Doppelte Wettkämpfe: der
  neueste Stand zählt. Nicht abgeschlossene Wettkämpfe werden markiert und zählen nicht.
- **Ein PDF je Liga und Saison** (Saison = Kalenderjahr des Wettkampfdatums; je Liga und Jahr nur eine Saison).
- **Kommende Wettkämpfe:** vom Ligaleiter eingetragen (Datum, Heim, Gast), im Browser gespeichert und zur Sicherheit als
  Datei sicher- und einlesbar. Kommt später die Datei zu einem eingetragenen Termin, wird aus der Terminzeile die
  Ergebniszeile (erkannt an Datum, Heim, Gast).
- **PDF (über „Drucken → Als PDF speichern“):**
  - **Seite 1 – Saisonübersicht:** Kopf wie im Protokoll (WTB-Logo, „Oberliga 2026 · Saisonübersicht“, rechts „Stand …“
    und „x von y Wettkämpfen gewertet“).
    - **Wettkämpfe** – eine gemeinsame Tabelle mit gewerteten und kommenden Wettkämpfen, nach Datum: Datum, Heim, Gast
      (Sieger fett), Ergebnis (Oberliga Scorepunkte, Landesliga Punktsummen), Gerätepunkte, Wettkampfpunkte, **Seite** des
      Protokolls (im PDF anklickbar, springt zum Protokoll). Kommende Wettkämpfe ohne Werte, etwas heller. Sehr lange
      Vereinsnamen brechen um.
    - **Tabelle:** Pl., Mannschaft, Wettk., S, U, N, Gerätepunkte (a:b), Diff., Wettkampfpunkte (nur gewonnene Punkte, keine
      Minuspunkte); Landesliga zusätzlich **Gesamtpunkte** (Summe, ohne Bedeutung für die Platzierung).
    - **Reihenfolge:** Wettkampfpunkte (gewonnene), dann Differenz der Gerätepunkte, dann direkter Vergleich (nur wenn
      schon gegeneinander geturnt; steht er aus oder unentschieden: gleicher Platz mit Hinweis; bei drei oder mehr nur die
      Wettkämpfe untereinander). Scorepunkte und Gesamtpunkte spielen keine Rolle.
    - **Doppelpunkte untereinander** in allen „a:b“-Spalten (Ergebnis, Gerätepunkte, Wettkampfpunkte), auch bei gemischt
      ein- und zweistelligen Zahlen.
    - Tabellen gleichmäßig über die Seite verteilt; wird es zu lang, wird die Schrift wie beim Protokoll etwas kleiner.
  - **Ab Seite 2:** je Wettkampf das Wettkampfprotokoll auf einer eigenen DIN-A4-Seite, nach Datum; oben ein kleiner
    anklickbarer Rücksprung „↑ Saisonübersicht“.

### 10. Zahlentastatur: automatisches Komma wieder einführen
Am iPhone auf der Testseite ausprobiert (15.11.2026) und für gut befunden; es war in Beta 77 schon einmal drin (in Beta 78
entfernt). Beschlossen:
- **Nur auf der Bildschirm-Zahlentastatur** (Wertungsfenster und D-Note-Rechner); mit der Hardware-Tastatur am Laptop
  bleibt alles wie heute („4“ = 4,0, Komma/Punkt selbst tippen).
- Regel wie in Beta 77: **Die letzte getippte Ziffer ist die Nachkommastelle** – „1 7“ = 1,7; „8“ = 0,8; „4 0“ = 4,0;
  „1 3 5“ = 13,5 (höchstens drei Ziffern). Ein **getipptes Komma gilt wie getippt** („4 , 5“ = 4,5), wer das Komma gewohnt
  ist, kann also weiter so tippen.
- Gilt für alle Felder mit einer Nachkommastelle: Abzüge E1–E3, D-Note, neutraler Abzug, im D-Note-Rechner das Feld EG.
  Nicht betroffen: Anzahlen im D-Note-Rechner (ganze Zahlen) und der Standbonus (1 = ja, 0 = nein).
- Die Anzeige über der Tastatur zeigt den Wert, wie er übernommen wird (nach „4“ also 0,4). Der erste Tastendruck in einem
  Feld ersetzt wie heute den alten Wert.
- Keine Einstellung zum Ein-/Ausschalten.
- Hilfetext und README anpassen.

### 11. Zahlentastatur: Tastenton
Auf der Testseite ausprobiert (15.11.2026): Ton „Klick“ in mittlerer Lautstärke passt. Vibration geht am iPhone nicht
(Apple lässt sie für Webseiten offenbar nicht mehr zu, laut Entwicklerseiten seit iOS 26.5); Android ließ sich nicht
testen – die Vibration entfällt daher.
Beschlossen:
- Ein kurzer, leiser **Klick bei jedem Tastendruck** auf der Bildschirm-Zahlentastatur (Wertungsfenster und D-Note-Rechner);
  nicht bei der Hardware-Tastatur und nicht bei anderen Knöpfen.
- **Einstellung „Tastenton“ an/aus je Gerät** (gemerkt wie die Zahlentastatur), in der Zeile „Zahlentastatur“ unter der
  Tastatur – in derselben Zeile, damit sich die Tastatur am Handy nicht verschiebt.
- **Grundeinstellung: aus** (ein iPad am Beamer könnte den Ton sonst über die Hallenlautsprecher ausgeben).
- Steht das iPhone auf lautlos, bleibt der Ton stumm (wie die Tastenklicks des iPhones).
- Hilfetext und README anpassen.

### 12. Zahlentastatur: Die Taste unter dem Finger zählt, sofort beim Berühren
Beobachtet am Handy (15.11.2026): Ein Tipp in die Lücke zwischen 0 und 2 schrieb die 2, ohne dass sie grau wurde; ein
anderes Mal wurde die 0 grau, geschrieben wurde aber die 2. Ursache: Das Grauwerden richtet sich nach dem Punkt unter der
Fingerspitze, den Klick ordnet Safari dagegen mit seiner Tipp-Korrektur (ganze Fingerfläche) oft der Nachbartaste zu.
Auf der Testseite mit Umschalter „wie bisher / neu“ am iPhone ausprobiert (15.11.2026): „neu“ funktioniert. Beschlossen:
- Die Tasten reagieren **auf das Berühren selbst**, nicht mehr auf den Klick des Browsers: Die Ziffer erscheint sofort beim
  Berühren (wie bei der Telefon-Tastatur des iPhones); der Tastenton (Punkt 11) klickt im selben Moment.
- Welche Taste zählt, bestimmt die App **selbst aus der Fingerposition**: Liegt der Punkt auf einer Taste, ist es diese;
  liegt er in einer Lücke, die nächstgelegene – die Lücken sind in der Mitte geteilt, kein Tipp geht verloren.
- **Genau die getippte Taste wird grau** (eigene Markierung statt der Browser-Darstellung); das Grau bleibt auch bei sehr
  schnellem Tippen kurz sichtbar (mindestens etwa 0,1 s) und verschwindet beim Loslassen.
- Jeder Tipp zählt genau einmal (der nachfolgende Klick des Browsers wird für die Tastatur nicht mehr ausgewertet).
- Gilt für die Zahlentastatur im Wertungsfenster und im D-Note-Rechner, mit dem Finger wie mit der Maus
  („Zahlentastatur immer“ am Laptop).
- In den Browser-Tests prüfen: Tipp auf Taste, Rand und Lücke (beide Seiten der Mitte), jeweils genau ein Zeichen.

## Liste nach Beta 83 – umgesetzt in Beta 84 (veröffentlicht 15.11.2026, Commit `356e885`)

Umgesetzt 15.11.2026 (Punkte 1–10, Punkt 7 zuerst). Rückkehrpunkt: Beta 83 (Commit `1c44a76`).
Hinweise zur Umsetzung:
- Punkt 7: 64 Selektoren mit toten Klassen und die Klasse `chip` entfernt, dazu die Funktion `colorChip`. Wirklich
  überflüssig waren nur 3 überschriebene Angaben (`.topbar` gap/flex-wrap, eine Schriftgröße des Tafel-Titels) – die übrigen
  Mehrfach-Festlegungen sind Varianten für Handy/iPad/Laptop und bleiben. Bildvergleich vorher/nachher (55 Aufnahmen):
  pixelgleich bis auf Messrauschen (Speicheranzeige, Fokus). 21 Browser-Tests in `tests/e2e` (`npm run test:e2e`).
- Punkt 2: Statt zweier Knöpfe „Standard / Groß“ ein Umschalter **„Groß“** (an = große Tafel), gespeichert im Wettkampf wie
  Hell/Dunkel – mit zwei Knöpfen wäre das Menüband am iPad hochkant bei laufender Pause zu breit gewesen (am kleinen iPad
  zusätzlich etwas engere Abstände). Das Geräteergebnis bleibt nach der Haltezeit stehen, bis am nächsten Gerät ein Turner
  gewählt oder etwas eingetragen ist; dann zeigt die Tafel dort das Duell 1 „als Nächstes“. Am Handy hochkant funktioniert
  die große Tafel, ist aber nicht dafür gedacht.
- Punkt 1: Bildschirmfüllend nur auf der Tafel; in der App bleiben Turnervorstellung und Ergebnis Fenster. Die
  Korrektur-Einblendung auf einer hochkant gestellten Tafel (Handy) war zu eng und passt jetzt.
- Punkt 5: „Laptop und Tablet“ = Fenster ab 561 × 501 px; darunter (Handy hoch und quer) bleibt der Sturz-Timer oben rechts.
- Punkt 9: Anleitung Oberliga 311, Landesliga 318 Wörter (vorher rund 1.800); am Handy rund 1.800 statt 7.900 px.

### 1. Einblendungen der Tafel auf großen Auflösungen (4K-Beamer mit 100 % Skalierung)
Beobachtet im Wettkampf am 14.11.2026: Der Beamer lief mit 3840 × 2160 bei 100 % Skalierung. Die Tafel und die
Scorepunkte-Einblendung passten, die übrigen Einblendungen waren aber zu klein, und in der Turnervorstellung passte der
Text nicht mehr ins Fenster (der Mannschaftsname oben war abgeschnitten).

Ursache: Tafel und Scorepunkte wachsen mit der Bildschirmgröße. Die Fenster haben dagegen eine feste Höchstgröße in
Pixeln, die auf Full HD ausgelegt ist. Nachgestellt (Anteil am Bild):

| Fenster | Full HD | 4K bei 100 % |
|---|---|---|
| Turnervorstellung | 59 % × 65 % | 30 % × 33 %, Text abgeschnitten |
| Sturz-Timer | 57 % × 57 % | 29 % × 29 % |
| Wettkampfergebnis | 89 % × 60 % | 44 % × 30 % |
| Korrektur | ebenso betroffen | |

Beschlossen:
- **Turnervorstellung und Wettkampfergebnis/Zwischenstand werden bildschirmfüllend**, wie die Scorepunkte-Einblendung.
  Zu diesem Zeitpunkt muss der Wettkampf im Hintergrund nicht zu sehen sein. Das gilt auf allen Bildschirmen.
- **Sturz-Timer und Korrektur bleiben Fenster über der Tafel, wachsen aber mit der Bildschirmgröße mit.** Bis Full HD
  bleibt alles genau wie jetzt (Laptop, iPad, normaler Beamer). Darüber wächst alles gleichmäßig mit, sodass das
  Fenster bei 4K mit 100 % genauso aussieht wie heute bei Full HD.

### 2. Zweite Anzeigetafel „Groß“ für kleine Leinwände
Beobachtet im Wettkampf am 14.11.2026: Auf der relativ kleinen Leinwand waren die kleinen Schriften (die Liste der
8 Turner mit ihren Wertungen und die Gerätespalte links) aus dem Zuschauerraum nicht lesbar. Größere Beamer oder
Fernseher kann man in den Hallen nicht voraussetzen. Heutige Schriftgrößen (Anteil an der Bildhöhe, Full HD):
Gerätespalte 2,2 %, Liste der Duelle 2,9 %, Duell-Karte 3,3 %, Mannschaftsnamen 3,7 %, Stand 11,2 %.

Beschlossen (Vorschaubild 8 für die Oberliga, Vorschaubild 10 für die Landesliga, Entwürfe vom 15.11.2026):
- **Die heutige Tafel bleibt unverändert.** Zusätzlich gibt es eine große Tafel mit weniger Informationen gleichzeitig,
  dafür deutlich größerer Schrift. Umschaltung im Menü Anzeigetafel: Standard / Groß.
- **Aufbau der großen Tafel** (von oben nach unten):
  - Keine Zeile mit Liga und Datum.
  - Kopf: Mannschaften und Stand. Oberliga in einer Zeile (Heim · Stand · Gast). Landesliga: die Mannschaften oben in den
    Ecken, die Summen groß darunter (die Summen sind zu breit für eine Zeile).
  - Keine Gerätespalte links und keine Liste der Duelle.
  - **Nächstes Duell bzw. nächster Turner oben** in einem gestrichelten Rahmen, eine Zeile hoch: Namen links und rechts in
    der Mannschaftsfarbe, in der Mitte klein „Duell 4 · als Nächstes“ bzw. „4. Übung · als Nächstes“. In der Landesliga
    steht der nächste Turner allein auf der Seite seiner Mannschaft. Die Namen erscheinen, sobald sie eingetragen sind.
  - **Darunter die heutige Duell-Karte, vergrößert auf die volle Breite:** je Seite Name, D-Note (mit +SB), E-Note,
    Neutr. Abzug und Endnote untereinander. Die Zeile Neutr. Abzug erscheint wie heute nur, wenn es einen Abzug gibt
    (der Platz bleibt frei). Oberliga: Scorepunkte als einzelne Zahl in der Mitte, in der Farbe des Siegers.
  - **Landesliga-Karte:** die letzte Übung auf der Seite ihrer Mannschaft. Auf der anderen Seite bleibt die letzte Übung
    der Gegenmannschaft blass stehen (oben rechts deren Übungsnummer, z. B. „2. Übung“). In der Mitte keine Scorepunkte.
  - Fußzeile wie im Entwurf: links das Gerät mit seinem Zwischenstand (Oberliga Scorepunkte, Landesliga Summen), rechts
    die Gerätepunkte.
- **Ablauf:** Bei einer Freigabe kommt wie gewohnt die Scorepunkte-Einblendung. Danach rückt das freigegebene Duell in die
  Karte, und oben erscheint das folgende. Damit bleibt die vorige Wertung sichtbar, während das nächste Duell bzw. der
  nächste Turner turnt. Am Anfang eines Geräts steht oben Duell 1, die Karte zeigt „Noch keine Wertung angezeigt“.
  Nach dem letzten Duell bleibt der Rahmen oben leer.
- **Schriftgrößen im Entwurf** (Anteil an der Bildhöhe, Full HD): Namen in der Karte 7 %, D-/E-Note und Neutr. Abzug
  5,6 %, Endnote 9,8 %, Scorepunkte in der Mitte 22 %, nächstes Duell 6,2 %, Stand 16 % (Landesliga-Summen 12 %).
  Insgesamt etwa doppelt so groß wie heute. Sehr lange Namen werden so weit verkleinert, dass sie passen.
- **Seiten der großen Tafel, wenn kein Duell läuft** (Vorschaubilder 3, 4 Oberliga, 6, 7 Landesliga):
  - Nach dem letzten Duell eines Geräts (nach der Haltezeit, bis das nächste Gerät beginnt): **Geräteergebnis** mit
    allen Duellen bzw. Übungen in großer Schrift (Oberliga: Namen, Endnoten, Scorepunkte je Duell, darunter Summe
    Scorepunkte und Gerätepunkte; Landesliga: Endnoten je Mannschaft, Streichwertung durchgestrichen, darunter
    „Summe (beste 3)“ und Gerätepunkte).
  - In der Wettkampfpause bzw. beim Einturnen: **Übersicht aller Geräte** mit den Ergebnissen je Gerät und den
    Gerätepunkten, daneben die Uhr („Wettkampfpause und Einturnen“ bzw. „Einturnen“).
- **Fester mittlerer Rand gegen Overscan – für beide Tafeln:** rundum etwa 3 % je Seite frei (wie in den Entwürfen),
  bei der großen Tafel und auch bei der Standardtafel, und für alle Einblendungen (Scorepunkte, Turnervorstellung,
  Ergebnis, Sturz-Timer, Korrektur). Manche Beamer und Fernseher schneiden ab Werk den Rand ab (beim Wettkampf am Beamer
  und an einem Fernseher nachgestellt). Es gibt dafür keine Einstellung in der App. Die Standardtafel wird dadurch
  rundum etwas kleiner (rund 6 %), ihre Aufteilung bleibt gleich.

Verworfen: große Tafel mit dem nächsten Duell unter der Wertung und nur Endnote/D/E nebeneinander (Vorschaubilder 1, 2, 5),
Landesliga-Karte mit leerer zweiter Hälfte (Vorschaubild 9), Einstellung „Rand“ mit mehreren Stufen.

### 3. Wettkampfprotokoll: alle Turner gleich dargestellt, Kopf mit Wettkampfjahr
Heute ist im Protokoll jede Zeile ein Duell, die Spalten des Gasts sind gespiegelt
(Name | D SB E1 E2 E3 E NA End | SP 2:0 | End NA E E3 E2 E1 SB D | Name). Das macht die DTL zwar auch so, gefällt aber
nicht, und in der Landesliga hat es keinen besonderen Sinn.

Beschlossen (beide Ligen):
- **Jeder Turner wird gleich dargestellt:** In jeder Zeile stehen zwei gleich aufgebaute Blöcke nebeneinander, links
  Heim, rechts Gast, jeweils von links nach rechts: Name, D, SB, E1, E2, (E3), E, NA, Endnote und – nur in der
  Oberliga – die Scorepunkte des Turners als einzelne Zahl (z. B. Sieger 3, Verlierer 0; bei Unentschieden beide 0).
  Die Spalte SP mit „2:0“ in der Mitte entfällt.
- **Waagerechte Linien zwischen den beiden Blöcken unterbrochen**, damit man sieht, wo der nächste Turner anfängt.
- **Landesliga:** gleich aufgebaut, Startposition vor dem Namen (z. B. „2. Wagner, Lukas“), keine Scorepunkte; die
  Streichwertung bleibt durchgestrichen.
- **Vorlegender Turner (Oberliga):** ▶ bleibt vor dem Namen; das gespiegelte ◀ hinter dem Namen entfällt.
- **Spaltenüberschrift über den Namen** bleibt der Mannschaftsname, zusätzlich in der Mannschaftsfarbe.
- **Kopf oben rechts:** die beiden Mannschaftsnamen der Begegnung in ihrer Mannschaftsfarbe.
- **Überschrift neben dem WTB-Logo mit Wettkampfjahr:** „Oberliga 2026“ bzw. „Landesliga 2026“; das Jahr kommt
  automatisch aus dem Wettkampfdatum.

### 4. Wertungs- und Korrektureinblendung 8 statt 10 Sekunden
Die Scorepunkte- bzw. Wertungseinblendung und die Korrektureinblendung auf der Tafel dauern heute je 10 Sekunden; künftig
je **8 Sekunden**. Die Haltezeit von 10 Sekunden danach bleibt (Beta 83): Nach der letzten Freigabe eines Geräts bleibt
die Tafel damit 8 + 10 = 18 Sekunden auf diesem Gerät (bisher 20). Hilfetexte und README entsprechend anpassen.

### 5. Wertungsfenster: Sturz-Timer neben „Abbrechen“ (Laptop und Tablet)
Heute steht der Knopf „Sturz-Timer“ klein oben rechts im Wertungsfenster (neben „Ringe · Duell 1 · 1.“).

Beschlossen (Position wie Vorschaubilder 1 und 2 vom 15.11.2026, dort aber mit größerem Knopf):
- **Laptop und Tablet (iPad quer und hochkant):** Der Knopf steht in der Knopfzeile links neben „Abbrechen“:
  [Sturz-Timer] [Abbrechen] [Wertung freigeben]. **Die Größe bleibt wie heute** (klein, so groß wie der Sturz-Timer in
  der Turnerkachel – damit sind beide gleich groß; die zunächst gewünschte Vergrößerung ist zurückgenommen). Der laufende
  Timer („⏱ 23 · Abzug 0,3 – Stopp“, gelb bzw. rot) passt in die Zeile; die Breite bleibt während des Laufs gleich. Das
  Fenster wird nicht höher. An Boden und Sprung gibt es den Knopf wie bisher nicht.
- **Handy (hochkant und quer): alles bleibt wie heute** – der Sturz-Timer bleibt klein oben rechts. Die Zahlentastatur
  darf sich am Handy nicht verschieben und muss an derselben Stelle bleiben wie im D-Note-Rechner.

Verworfen: am Handy eine eigene Zeile für den Sturz-Timer bzw. [Sturz-Timer] [Abbrechen] mit „Wertung freigeben“ darunter
(Vorschaubilder 3–6) – beides hätte die Zahlentastatur um rund 30 px nach unten verschoben.

### 6. Freigegebene Wertung wieder komplett zurücknehmen (ohne zusätzlichen Knopf)
Anlass (Wettkampf 14.11.2026): Der Bediener hat sich mit der App vertraut gemacht und dazu im gleich beginnenden
Wettkampf eine Wertung eingegeben und freigegeben – in dem Glauben, sie danach einfach wieder löschen zu können. Das geht
bisher nicht (nur Korrektur, Notlösung „kein Turner“ – zählt aber als nicht angetreten). Am 11.11.2026 noch als zu
kompliziert zurückgestellt, jetzt beschlossen; Ablauf wie damals ausgearbeitet:

- **Bedienung ohne neuen Knopf:**
  1. Bei der freigegebenen Wertung „Wertung ändern“ antippen.
  2. In der Turnerauswahl ganz oben „– Turner –“ wählen. Damit leeren sich alle Felder (auch Standbonus und die
     Anzahlen aus dem D-Note-Rechner); ohne Turner sind die Felder gesperrt.
  3. Der vorhandene Knopf „Korrektur freigeben“ heißt dann **„Wertung zurücknehmen“**.
  4. Rückfrage: „Wertung zurücknehmen? Die freigegebene Wertung verschwindet von der Anzeigetafel, die Kachel steht
     danach wieder im Grundzustand.“ [Abbrechen] [Zurücknehmen].
  5. Danach ist die Kachel wie neu: kein Turner gewählt, keine Werte, der Knopf heißt wieder „Wertung eingeben“.
  „Abbrechen“ im Fenster stellt vorher jederzeit alles wieder her. „kein Turner“ bleibt davon getrennt (zählt weiter als
  nicht angetreten).
- **Anzeigetafel:** Die Wertung verschwindet ohne Einblendung, als wäre sie nie gezeigt worden. Summen, Scorepunkte,
  Gerätepunkte, Topscorer und Protokoll rechnen sich sofort neu.
- **Oberliga:** Auf die Tafel kommt immer das ganze Duell. Nimmt man einen Turner zurück, verschwindet das ganze Duell von
  der Tafel; der andere Turner bleibt gespeichert. Ist das Duell wieder vollständig freigegeben, erscheint es erneut mit
  großer Einblendung.
- **Landesliga:** Es verschwindet nur diese Übung; die Streichwertung wird neu bestimmt.
- **Gerätereiter:** Ein fertiges Gerät verliert den grünen Haken (gelber Punkt, wenn dort noch etwas eingetragen ist,
  sonst keine Markierung). Bleiben an dem Gerät andere Freigaben, gilt es wieder als angefangen – nach der Tafel-Regel
  aus Beta 82 kann die Tafel dann dorthin zurückspringen.
- **Abgeschlossener Wettkampf:** Zurücknehmen erst nach „Wieder öffnen“.
- Hilfetext und README ergänzen.

### 7. Aufräumen und Tests sichern (ohne sichtbare Änderung) – als Erstes umsetzen
Durchsicht am 15.11.2026 (Stand Beta 83): Keine Fehler aus Altlasten gefunden; Start/Sperre/Statuszeile sind aus der
Programmlogik vollständig entfernt. Die 22 Tests der Wertungsberechnung laufen fehlerfrei.

Beschlossen:
- **Ungenutzten Code entfernen:** die nicht mehr aufgerufene Funktion `colorChip` und die Gestaltungsregeln für Elemente,
  die es nicht mehr gibt (rund 25 Klassen, u. a. `board-bar`, `board-group`, `board-sub`, `board-switch`, `bs-main`,
  `pw-title`, `pw-sub`, `pw-score`, `export-box`, `export-grid`, `inline-form`, `judge-hint`, `seg`, `score-field`,
  `score-grp`, `struck-tag`, `ps-struck`, `print-scorers`, `cd-dns`, `bonus-box`, `hidden-keep`, `tool-right`,
  `team-name`, `radio-row`, `color-pick`, `duel-sep` – vor dem Löschen jeweils noch einmal prüfen, dass sie wirklich
  nirgends erzeugt werden; `phase1/2`, `st-done/run` und `menu-open-…` werden zusammengesetzt und bleiben).
- **Gestaltungsdatei zusammenfassen**, wo spätere Regeln frühere nur überschreiben (rund 150 mehrfach festgelegte
  Elemente, ein Teil davon zu Recht für Handy/iPad/Laptop).
- **Bleibt:** die Lesbarkeit alter Daten (Wettkämpfe ohne Liga oder Anwesenheitsliste, altes E-Noten-Format, ältere
  verschlüsselte Sicherungsdateien, ältere Sicherungspunkte).
- **Browser-Tests ins Projekt** (`tests/`): ein kompakter Satz von etwa 10–15 Kernabläufen, der auch in späteren
  Sitzungen läuft – u. a. Freigabe in beiden Ligen, Tafel mit Haltezeit, Korrektur, Einturnzeit/Pause/Sturz-Timer,
  Turnervorstellung, Ergebnis, Protokoll, Datensicherung, Passung der Tafel auf Laptop/iPad/Handy. Bisher liegen die
  Browser-Tests nur im temporären Arbeitsordner der jeweiligen Sitzung.
- **Prüfung:** Bildvergleich vorher/nachher – Tafel, Wertungsfenster und Protokoll müssen pixelgleich bleiben.
- **Reihenfolge:** als Erstes umsetzen, vor den Punkten 1–6.

### 8. „← zurück“ bleibt beim Scrollen stehen
Beschlossen:
- **Seiten:** alle Seiten mit „← zurück“ – Wettkämpfe, Datensicherung, Mannschaften, Regeln und Anleitung (wenn man vom
  Wettkampf kommt), Setup und Protokoll.
- **Verhalten:** Die Zeile mit „← zurück“ bleibt beim Scrollen direkt unter der dunklen Kopfzeile stehen (wie der obere
  Bereich der Wettkampfseite), mit Seitenhintergrund, damit der Inhalt sauber darunter durchläuft. Handy, iPad und
  Laptop.
- **Protokoll:** Die ganze Zeile mit „← zurück“ und „Drucken / als PDF speichern“ bleibt stehen; auf dem Ausdruck
  erscheint sie weiterhin nicht.
- Seiten ohne Zurück-Knopf bleiben unverändert.

### 9. Anleitung Oberliga und Landesliga wesentlich kürzen
Heute rund 1.800 Wörter je Liga (am Handy fast 8.000 px Scrollen). Ziel: etwa ein Viertel (rund 400 Wörter).

**Grundsatz:** Drin bleibt nur, was man in der App nicht sieht oder leicht falsch macht (Regeln und Abläufe, z. B. wann
die Tafel ein Duell zeigt, Korrektur, „kein Turner“ gegenüber „Wertung 0,00“, Mannschaftsabzüge, Tafelfenster auf den
Beamer ziehen und Doppelklick). **Raus:** Erklärung einzelner Felder und Knöpfe, Tastatur- und Zahlentastatur-
Bedienung, Rechenregeln des D-Note-Rechners, Formeln (stehen unter „Regeln“), Farben und Töne der Timer,
Sekundenangaben, wo welche Menüs liegen.

**Entwurf Oberliga (beschlossen als Grundlage, 15.11.2026):**

*1. Vorbereitung*
- Turnernamen und Startnummern unter **Mannschaften** pflegen.
- **Neuer Wettkampf:** Mannschaften, anwesende Turner, Kampfgericht und die per Los beginnende Mannschaft eintragen –
  die Startreihenfolge an allen Geräten ergibt sich daraus. Alles lässt sich später unter **Setup** ändern.

*2. Wertungen*
- Gerät oben wählen, **Wertung eingeben** antippen. E-Note und Endnote rechnet die App; **berechnen** unter der D-Note
  hilft beim Zusammenzählen.
- Die Wertung des ersten Turners eines Duells wird nur gespeichert. Erst mit der Freigabe des zweiten Turners zählen die
  Scorepunkte und das Duell erscheint auf der Tafel.
- **Korrektur:** Wertung ändern → Korrektur freigeben; die Tafel zeigt die Änderung an.
- **Zurücknehmen:** Wertung ändern → „– Turner –“ wählen → Wertung zurücknehmen; die Kachel ist danach wieder leer.
  (kommt mit Punkt 6)
- **kein Turner** = nicht angetreten, zählt 0. **Wertung 0,00** = angetreten, Endnote 0.
- **Mannschaftsabzüge** als neutralen Abzug beim Turner eintragen, der zuletzt am Gerät war bzw. bei dem der Abzug
  aufgefallen ist.

*3. Anzeigetafel*
- **Anzeigetafel öffnen**, das Fenster auf Beamer oder Fernseher ziehen, Doppelklick = Vollbild. Hell oder Dunkel je
  nach Raum, **Groß** für kleine Leinwände (kommt mit Punkt 2).
- Die Tafel folgt dem gewählten Gerät. Ab der ersten Freigabe an einem Gerät bleibt sie dort, bis alles freigegeben ist,
  und danach noch kurz.
- Turnervorstellung, Einturnzeit, Wettkampfpause und Ergebnis/Siegerehrung im Menü Anzeigetafel; ein erneuter Klick
  beendet sie. Turnervorstellung weiter mit ◀ ▶, Pfeiltasten oder Presenter.

*4. Timer*
- **Einturnzeit** 4 Minuten (Punkt 10), **Wettkampfpause** 10/15/20 Minuten. In der Pause wird schon eingeturnt, deshalb laufen nie
  beide gleichzeitig.
- **Sturz-Timer** (nicht an Boden und Sprung): nach 30 Sekunden 0,3 Abzug, nach 60 Sekunden ist die Übung beendet;
  erneuter Klick stoppt.

*5. Abschluss*
- **Wettkampf abschließen** sperrt die Eingabe und bietet die Sicherung an; **Wieder öffnen** hebt das auf.
- **Protokoll / Drucken** erstellt das Protokoll auf einer DIN-A4-Seite (auch als PDF).

**Landesliga:** gleich aufgebaut, mit drei Unterschieden:
- Geturnt wird abwechselnd; die Zahl vor dem Turner ist seine Startposition.
- Jede Übung wird einzeln freigegeben und erscheint sofort auf der Tafel. Je Mannschaft und Gerät zählen die drei
  höchsten Wertungen; die Streichwertung ist durchgestrichen.
- **Mannschaftsabzug** über die Links unten im Gerätebereich: einer je Mannschaft für den ganzen Wettkampf, mindert nur
  die Gesamtpunktzahl.

Beim Umsetzen an den dann aktuellen Stand anpassen (Punkte 2, 5 und 6). Der Hinweis auf „Installation und
Datensicherung“ oben bleibt.

### 10. Einturnzeit wieder 4 Minuten
Die Einturnzeit dauert seit Beta 60 6:40 (8 Turner × 50 Sekunden); künftig wieder **4:00 Minuten** wie vor Beta 60.
Alles andere bleibt (ein einziger Timer im Menü Anzeigetafel, Schelle am Ende, „Einturnen beendet“, gegenseitige Sperre
mit der Wettkampfpause). Hilfetext und README anpassen (dort steht 6:40 bzw. „8 Turner × 50 Sekunden“).

## Liste nach Beta 82 – umgesetzt in Beta 83 (veröffentlicht 12.11.2026, Commit `1c44a76`)

Umgesetzt 12.11.2026 (Punkte 1–11). Rückkehrpunkt: Beta 82 (Commit `fd2c4e0`).
Hinweise zur Umsetzung:
- Punkt 9: Weil der Knopf während des ganzen Laufs so breit ist wie „⏱ 00 · Abzug 0,3 – Stopp“, steht der laufende
  Sturz-Timer in der Kachel am iPhone (390 px) schon ab dem Start in einer eigenen Zeile über „Wertung eingeben“ (bisher
  erst ab Sekunde 30); bei 360 px war das schon immer so. Laptop und iPad unverändert einzeilig.
- Punkt 10: Am Handy hochkant wird die Karte rund 55 px niedriger; die Liste darunter bekommt den Platz (Tafel passt
  weiter genau, gemessen 390 × 844).

1. **Rückfrage bei „Wertung 0,00“, wenn schon Werte eingetragen sind** (beschlossen 01.11.2026): Bis Beta 76 (Eingabe in
   der Kachel) fragte die App „Wertung 0,00: Die bereits eingegebenen Wertungen dieser Übung werden gelöscht. Fortfahren?“
   (seit Beta 65); mit dem Wertungsfenster (Beta 77) ging die Rückfrage verloren – das Häkchen leert seitdem sofort alle
   Notenfelder und den Standbonus (Wegnehmen des Häkchens bringt sie nicht zurück). Künftig im Wertungsfenster:
   - Sind schon Werte eingetragen (E1, E2, E3, D-Note, Standbonus oder neutraler Abzug), kommt beim Ankreuzen dieselbe
     Rückfrage wie früher. „Ja“: Felder werden geleert (wie heute). „Nein“: Häkchen bleibt aus, alle Werte bleiben.
   - Sind noch keine Werte eingetragen, wird ohne Rückfrage angekreuzt.
   - Beide Ligen, auch bei „Wertung ändern“ einer bereits freigegebenen Wertung (wie die Rückfrage bei „kein Turner“).
2. **D-Note-Rechner: nach „Übernehmen“ bleibt die Auswahl auf der D-Note** (beschlossen 03.11.2026): Bisher springt sie
   auf „Neutr. Abzug“ und überspringt den Standbonus (der Rechner nimmt das nächste Zahlenfeld, der Standbonus ist ein
   Schalter). Künftig bleibt die Auswahl auf der D-Note (gelbe Umrandung bzw. aktives Feld der Zahlentastatur, die
   übernommene Note ist gleich zu sehen); „Weiter ▶“ bzw. Enter/→ führt von dort zum Standbonus, an Geräten ohne
   Standbonus (Pauschenpferd) zum neutralen Abzug. Gilt für Zahlentastatur und Hardware-Tastatur; „Abbrechen“ im Rechner
   bleibt wie heute.
3. **D-Note-Rechner: Auswahl auch mit ↑ / ↓ bewegen** (beschlossen 03.11.2026, Hardware-Tastatur): Die Felder stehen
   untereinander, ↑/↓ bewirken dort bisher nichts. Künftig wählt ↓ das nächste Feld wie Enter und → (≥ D → C → B → A → EG
   → „Übernehmen“, nur wenn möglich → wieder ≥ D), ↑ das vorige wie ← (derselbe Kreis rückwärts). → und ← bleiben wie
   bisher. Im Wertungsfenster bleibt alles unverändert (↑/↓ schalten den Standbonus, auf der D-Note wählt ↓ „berechnen“).
4. **D-Note-Rechner: Hinweis, wenn Elemente eingetragen sind, aber keine Elementgruppen** (beschlossen 03.11.2026): Wird
   ein Element anerkannt, ist immer auch eine Elementgruppe anerkannt – eine Wertung mit Elementen, aber EG leer oder 0,0
   kann nicht stimmen. Bei „Übernehmen“ (bzw. Enter darauf) mit mindestens einem Element (≥ D, C, B oder A größer 0) und
   EG leer oder 0,0 erscheint ein Hinweis „Elementgruppen fehlen – es sind Elemente eingetragen, aber keine
   Elementgruppen.“ mit nur einem Knopf „Elementgruppen eintragen“: Er schließt den Hinweis, die Auswahl steht im Feld EG.
   Kein „Trotzdem übernehmen“. Keine rote Markierung beim Tippen (EG kommt ja noch), „Übernehmen“ bleibt antippbar.
   Ohne Elemente kein Hinweis. Zahlentastatur und Hardware-Tastatur.
5. **D-Note-Rechner: ohne Eingaben ist D-Note 0,0 übernehmbar** (beschlossen 03.11.2026): Ein regulärer Fall (z. B. nur
   Teile unterhalb von A, die keinen Wert haben und im Rechner nicht aufgeführt sind). Bisher zeigt der Rechner bei leeren
   Feldern „–“ und „Übernehmen“ ist gesperrt. Künftig zählen leere Felder als 0: gleich beim Öffnen steht „D-Note 0,0“,
   „Übernehmen“ ist möglich und trägt 0,0 ins Wertungsfenster ein (die Felder bleiben leer, keine Nullen tippen).
   Mit Hardware-Tastatur gehört „Übernehmen“ damit immer zum Kreis (außer bei Fehlern wie mehr als 8 Elementen). Ohne
   Elemente kein Hinweis aus Punkt 4. Eine von Hand eingetragene D-Note wird nur beim Tippen auf „Übernehmen“ überschrieben.
6. **Anzeigetafel: Strich bei „kein Turner“ sofort, nicht erst nach der Freigabe** (beschlossen 03.11.2026): Vor der
   Freigabe übernimmt die Tafel bisher nur Name und Startnummer des gewählten Turners, „kein Turner“ erst mit der Freigabe.
   Künftig steht bei „kein Turner“ sofort „–“ in der Liste des Geräts (Oberliga und Landesliga), wie ein gewählter Name
   sofort erscheint; wird doch ein Turner gewählt, steht sofort wieder sein Name da. Endnote 0,00 und Punkte erscheinen
   weiterhin erst mit der Freigabe. Umsetzung nur in der Namensanzeige der Tafel, nicht in der Berechnung (sonst zählte
   ein nicht freigegebenes „kein Turner“ schon als 0, z. B. beim grünen Haken).
7. **Haltezeit der Tafel nach der letzten Wertung: 10 Sekunden erst nach der großen Einblendung** (beschlossen 03.11.2026,
   Korrektur zu Beta 82 Punkt 4): Bisher überschneiden sich die 10 Sekunden Haltezeit mit der 10-sekündigen großen
   Einblendung der letzten Wertung – danach wechselt die Tafel sofort, die 8 Wertungen des Geräts sind praktisch nie frei
   zu sehen. Künftig zählen die 10 Sekunden ab dem Ende der Einblendung: Nach der letzten Freigabe bleibt die Tafel
   mindestens 20 Sekunden auf dem Gerät (davon 10 s mit freiem Blick auf alle Wertungen). Ohne große Einblendung (letzte
   Übung in der Landesliga „kein Turner“) 10 Sekunden ab der Freigabe. Eine Freigabe am nächsten Gerät schaltet weiter
   sofort um; ohne Reiterwechsel bleibt das Gerät ohnehin stehen.
8. **Menüband: beim Öffnen eines Wettkampfs immer Reiter „Anzeigetafel“** (beschlossen 03.11.2026): Bisher merkt sich
   die App den zuletzt gewählten Reiter je Gerät. Künftig ist beim Öffnen eines Wettkampfs immer „Anzeigetafel“ gewählt –
   aus der Wettkampfliste, beim Start der App und bei der Rückkehr mit „← zurück“ aus Setup oder Protokoll. Innerhalb der
   Wettkampfseite bleibt ein gewählter Reiter „Wettkampf“ stehen (kein Zurückspringen beim Speichern oder beim Wechsel der
   Gerätereiter). Das Merken des Reiters entfällt. Handy (Aufklappmenüs) unverändert.
9. **Sturz-Timer-Knopf: Darstellungsfehler am iPad beheben** (gemeldet 03.11.2026 mit Fotos, iPad; am iPhone nicht
   beobachtet): Beim laufenden Timer bleiben Reste der roten Umrandung stehen – während des Laufs doppelte Ränder, nach dem
   Stopp ein roter Rahmenrest an der früheren, breiteren Stelle. Vermutete Ursache: Der Knopf ändert seine Breite
   („Sturz-Timer“ → „⏱ 23 – Stopp“ → „⏱ 9 · Abzug 0,3 – Stopp“ …), und in den letzten 10 Sekunden blinkt der ganze Knopf
   (eigene Bildschicht in Safari), deren alte Fläche das iPad nicht sauber neu zeichnet. Künftig:
   - In den letzten 10 Sekunden blinkt nur die Sekundenzahl, nicht der ganze Knopf.
   - Die Sekunden haben im Knopf einen festen Platz für zwei Ziffern – während des Laufs ändert der Knopf seine Breite
     nicht mehr (Kachel und Wertungsfenster).
   - Beschriftungen, Farben und Töne unverändert. Nur in Safari am iPad prüfbar – nach dem Update dort einmal einen
     Sturz-Timer bis zum Ende laufen lassen.
   Beobachtung (nicht Teil des Punkts): gelegentlich verschobenes Wertungsfenster am iPhone, nicht reproduzierbar, seither
   nicht wieder aufgetreten. Zwei-Finger-Gesten am Handy wieder zu sperren, scheidet aus (entschieden 03.11.2026): Wer
   vorher groß gezoomt hat, sähe das Fenster ebenfalls vergrößert, „Abbrechen“ läge womöglich außerhalb des Bildschirms und
   man könnte nicht mehr zurückzoomen. Abwarten, ob es wieder vorkommt.
10. **Anzeigetafel am Handy hochkant: beide Hälften der Duell-Karte gleich breit und einzeilig** (beschlossen 05.11.2026,
    Variante B, gemeldet mit Foto): Die Hälften wurden nach Inhalt verteilt – der längere Name holte sich mehr Breite
    (iPhone 164 zu 139 px), rechts brachen „+0,1“ und „Neutr. Abzug“ um, links nicht. Künftig:
    - Beide Hälften immer gleich breit (unabhängig von den Namen); zu lange Namen enden mit „…“.
    - Nur am Handy hochkant: Zeilen D-Note, E-Note, Neutr. Abzug etwa 8 % kleiner und etwas engerer Abstand vor dem Wert –
      alles einzeilig, auch „D-Note +SB 1,0 +0,1“; die Karte wird rund 50 px niedriger. Name und Endnote unverändert.
    - Gemessen (Vorschau): iPhone 390 px und Android 360 px einzeilig, kein Scrollen; iPad hochkant und Querformat
      unverändert. Gilt auch für die Karte der Landesliga (gleicher Aufbau). Passung der Tafel beim Umsetzen erneut prüfen.
11. **Laufender Pause-Knopf unter dem Mauszeiger lesbar** (gemeldet 09.11.2026 mit Foto, Laptop): Fährt die Maus über den
    laufenden Knopf „Wettkampfpause“, wird er hellgrau hinterlegt, die Schrift bleibt weiß und ist nicht lesbar. Ursache:
    Der Pause-Knopf steckt mit der Auswahl der Pausendauer in einer eigenen Gruppe, dadurch setzt sich die Regel für den
    Mauszeiger gegen „orange“ durch (beim Einturnzeit-Knopf nicht). Künftig bleibt ein laufender Timer-Knopf unter dem
    Mauszeiger orange mit weißer Schrift, nur etwas dunkler als Rückmeldung – Wettkampfpause und Einturnzeit, Menüband und
    Aufklappmenü. Andere Knöpfe unverändert.

## Liste nach Beta 81 – umgesetzt in Beta 82 (veröffentlicht 01.11.2026, Commit `fd2c4e0`)

Umgesetzt 01.11.2026 (Punkte 1, 2, 4–11; Punkt 3 entfällt). Rückkehrpunkt: Beta 81 (Commit `b102b5c`).
Hinweise zur Umsetzung:
- Punkt 4: Werte im offenen Wertungsfenster werden erst mit „Wertung freigeben“ gespeichert – der gelbe Punkt kommt daher mit
  der ersten Freigabe im Fenster (Oberliga: schon beim gespeicherten ersten Turner eines Duells; die Tafel wird erst mit dem
  ganzen Duell fixiert). Ohne gemerkten Reiter (ältere Wettkämpfe) zeigt die Tafel das Gerät mit der letzten Freigabe.
- Punkt 7: Unter 600 px Fensterhöhe (iPhone SE) entfällt der freie Streifen – dort bleibt alles wie in Beta 81.
- Punkt 4 (Platz für die Einturnzeit, wegen Punkt 8 auch bei 360 px Breite): Am Handy zeigt der orange Menüknopf bei
  laufender Pause bzw. Einturnzeit nur noch die Restzeit („4:12 ▾“ statt „Pause 4:12“ – das war bei 360 px schon in Beta 81
  zu breit); im Aufklappmenü steht weiter „Wettkampfpause 4:12 – beenden“ bzw. „Einturnzeit 6:40 – beenden“. Im Menüband am
  iPad hochkant entfällt das Wort „Design“ vor Hell/Dunkel, damit die Leiste mit laufendem Timer einzeilig bleibt.


1. **Knopf „← zurück“ auf den Seiten, die man vom Wettkampf aus öffnet – statt eines Eintrags im Ligamenü** (beschlossen
   01.11.2026; ersetzt die frühere Fassung „Zurück zum Wettkampf“ im Ligamenü, zuletzt geöffneter Wettkampf je Liga):
   - Überall derselbe Knopf wie heute im Protokoll: „← zurück“ oben links über der Seite.
   - **Wettkampf Setup und Protokoll:** immer (gehören zum Wettkampf). Im Setup wirkt er wie „Abbrechen“ – bei ungespeicherten
     Änderungen kommt die bekannte Frage „speichern oder verwerfen“.
   - **Wettkämpfe, Mannschaften, Regeln, Anleitung:** nur, wenn man von einem Wettkampf kommt – auch über mehrere Seiten
     hinweg (Wettkampf → Mannschaften → Regeln → „← zurück“ führt zum Wettkampf). Von der Startseite aus kein Zurück-Knopf.
     Die App vergisst den Wettkampf, sobald die Startseite oder ein anderer Wettkampf geöffnet wird (oder er gelöscht ist).
   - **Ligamenü:** Der Eintrag „Startseite (Liga wechseln)“ entfällt ganz; das Menü enthält nur noch Wettkämpfe,
     Mannschaften, Regeln, Anleitung und die Versionszeile. Zur Startseite führt das Logo links in der Kopfzeile (allgemein
     bekanntes Prinzip, reicht so).
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
11. **Zoomen mit zwei Fingern auch bei offenem Wertungsfenster / Rechner** (beschlossen 01.11.2026, beobachtet am iPad):
    Die Sperre aus Beta 78, die verhindert, dass die Seite hinter dem Fenster mitrutscht, blockierte jede Fingerbewegung –
    auch das Zoomen mit zwei Fingern. Nach dem Drehen des iPads (das iPad behält dabei manchmal die Zoomstufe) ließ sich das
    Bild deshalb erst nach „Abbrechen“ wieder passend zoomen. Künftig gehen Bewegungen mit zwei Fingern durch, Wischen mit
    einem Finger verschiebt die Seite dahinter weiterhin nicht. Gemessen: Die Seite ist hoch und quer, mit und ohne Fenster,
    genau bildschirmbreit (nichts ragt heraus). Nach dem Update am iPad prüfen (hier nur im nachgestellten Browser testbar).
    Nicht umgesetzt: Zoom beim Drehen automatisch auf 100 % zurücksetzen (am Gerät nicht prüfbar, würde gewollten Zoom
    zurücknehmen).

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

- **Später, gemerkt 21.11.2026: Daten als Dateien auf der Festplatte (statt nur im Browserspeicher).** Wunsch: Wettkämpfe
  der Vereine und den Ligabericht wie bei anderen Programmen als Datei anlegen, speichern und wieder öffnen – auch nach
  einem Browserwechsel. Erst einmal wird mit dem jetzigen Stand gearbeitet; danach wieder aufgreifen.
  - Technik: Direkt in eine Datei schreiben (File System Access API) können nur **Chrome und Edge am PC/Mac** (Chrome auf
    Android erst in neueren Versionen). **Safari (iPad, iPhone, Mac) und Firefox nicht** – dort bleibt es bei „Sichern“
    und „Einlesen“. Heute liegen die Daten im Speicher des jeweiligen Browsers (getrennt je Browser).
  - Möglichkeit 1 (heute): Browserspeicher plus Sicherungsdateien von Hand – geht überall.
  - Möglichkeit 2: **Arbeitsdatei mit automatischem Speichern** (Chrome/Edge): Datei anlegen/öffnen, jede Änderung wird
    sofort hineingeschrieben; kopierbar, auf USB-Stick, in Chrome/Edge an jedem Rechner zu öffnen; mit installierter App
    öffnet ein Doppelklick die App. Nach einem Neustart fragt der Browser einmal nach der Erlaubnis (bei der installierten
    App dauerhaft erlaubbar). Browserspeicher bleibt als Sicherheitsnetz darunter.
  - Möglichkeit 3: **Ligabericht mit Ordner** statt „Einlesen“ (Chrome/Edge): einmal einen Ordner wählen (z. B.
    „Oberliga 2026“), der Bericht liest alle Wettkampfdateien darin selbst und speichert Termine und kampflose Wettkämpfe als
    Datei im selben Ordner; neue Dateien der Vereine nur noch hineinlegen. Mit OneDrive/Dropbox überall derselbe Stand.
  - Empfehlung: Ligabericht → Möglichkeit 3; App der Vereine → Möglichkeit 2 als Zusatz am Rechner (Wettkampf wird
    automatisch in seiner Datei aktuell gehalten, gleiches Format wie „Sichern“); iPad/iPhone unverändert („Sichern“ über
    Teilen). Die spätere Netzwerkfunktion würde „anderes Gerät/anderer Browser“ grundsätzlicher lösen.

- **Später, gemerkt 15.11.2026: Netzwerkfunktion und Webseite für Zuschauer.** Heute laufen Eingabe und Tafel nur auf
  demselben Gerät (zweites Fenster, Abgleich über BroadcastChannel/IndexedDB). Idee: Daten über das Netzwerk teilen, sodass
  z. B. Zuschauer die Tafel auf dem eigenen Handy sehen. Die ausführliche Tafel im Hochformat (Punkt 8 der Liste nach
  Beta 84) ist dafür die passende Handy-Ansicht und bleibt deshalb erhalten. Planung und Diskussion der Möglichkeiten in
  einem eigenen Chat.
- **Später, gemerkt 01.11.2026 (nicht auf der aktuellen Liste): Drucken in der installierten App am iPhone.**
  Befund (getestet vom Nutzer): Der Druckknopf funktioniert am iPad (Browser und installierte App) und am iPhone im
  Browser; nur in der vom Home-Bildschirm installierten App am iPhone passiert nichts – unabhängig vom Pop-up-Blocker.
  Grenze von iOS, über `window.print()` nicht lösbar. Die Abfrage „Diese Website wurde für das automatische Drucken
  gesperrt“ beim zweiten Drucken ist ein Schutz von Safari (erstes Mal ohne Frage, danach mit „Erlauben“), harmlos.
  Gemerkte Lösungen:
  1. **„Als PDF teilen / drucken“** (nur installierte App am iPhone): Protokollseite per html2canvas scharf abbilden, mit
     jsPDF als A4-PDF erzeugen, über `navigator.share` das Teilen-Menü öffnen (dort „Drucken“, „In Dateien sichern“, Mail …);
     falls iOS das Teilen nach dem Erzeugen nicht direkt zulässt, zweiter Tipp auf „PDF fertig – jetzt teilen“. Schon
     einmal gebaut (Commit `5849a98`, Entwurf Beta 57, zurückgenommen mit `73d4a48`) – müsste an die heutige Protokollseite
     angepasst und am iPhone getestet werden; App ca. 0,5 MB größer, Bibliotheken erst beim Antippen geladen, offline.
  2. **Nur ein Hinweis** statt des wirkungslosen Knopfs in der installierten App am iPhone, z. B. „Drucken ist in der
     installierten App am iPhone nicht möglich – bitte am iPad, PC oder in Safari drucken.“
  Geprüft und verworfen (Vorschläge von Gemini): Manifest „minimal-ui“ (iOS kennt den Modus nicht, fällt auf normales
  Safari zurück – getrennte Daten, Löschung nach 7 Tagen ohne Nutzung möglich, gilt für alle Geräte) und PDF per
  `window.open(blobUrl)` (Pop-up-Sperre nach der Erzeugung, leere Fenster in installierten Apps, im App-Fenster kein Zurück).

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
