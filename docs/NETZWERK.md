# Netzwerkfunktion – Planung

Stand: 22.11.2026 · Status: **Planung, noch nicht umgesetzt**. Diskussion in einem eigenen Chat, getrennt von der
App-Entwicklung.

## Ziel

1. **Schritt 1 (wird umgesetzt): Netzwerktafel.** Die Anzeigetafel läuft auf einem **eigenen Gerät** am Beamer, z. B. ein
   Vereinslaptop oder ein einfach aufgestellter Laptop oder Tablet. Eingegeben wird am Kampfrichtertisch auf Laptop, Tablet
   oder Handy.
2. **Schritt 2 (mitgeplant, noch nicht umgesetzt): Zuschauer.** Zuschauer sehen den Wettkampf über Link oder QR-Code auf
   dem eigenen Handy.
3. **Schritt 3 (mitgeplant, noch nicht umgesetzt): Kampfrichter-Handys.** Die E-Kampfrichter geben ihre Abzüge am eigenen
   Handy ein, der Oberkampfrichter prüft und gibt am Handy frei; Mischbetrieb mit der Eingabe am Laptop jederzeit möglich.

## Ausgangslage

- Kein Server und keine Cloud: Alle Daten liegen in IndexedDB auf dem Eingabegerät.
- Die Tafel ist heute ein zweites Fenster auf demselben Gerät, abgeglichen über BroadcastChannel und IndexedDB. Für den
  Beamer braucht man ein Kabel oder Funk-HDMI, und das geht praktisch nur mit einem Laptop als Eingabegerät.
- Die ausführliche Tafel im Hochformat (Punkt 8 der Liste nach Beta 84) bleibt als Zuschaueransicht erhalten.

## Festgelegte Anforderungen

- **An einem Ort immer nur ein Wettkampf.** Gleichzeitig realistisch **bis zu 3 Wettkämpfe an verschiedenen Orten**.
- **Kein Router in der Halle.** Die Voraussetzungen sollen so einfach sein, dass jeder Verein die Funktion nutzen kann.
- **Hallen-WLAN kann nicht vorausgesetzt werden, Handyempfang schon.** Ein vorhandenes Hallen-WLAN darf genutzt werden,
  ist aber nicht erste Wahl.
- **Das zweite Fenster per Kabel bleibt unverändert erhalten.** Die Netzwerktafel ist ein zusätzlicher Weg und dient auch
  als Rückfallebene.
- **Die Eingabe bleibt vollständig offline-fähig.** Speichern, Sicherung und Protokoll hängen nie am Netzwerk.
- **Den Weiterleitungsdienst betreibt der Entwickler der App zentral.** Vereine brauchen kein Konto.

## Betrachtete Möglichkeiten

| Variante | Bewertung |
|---|---|
| Kabel / Funk-HDMI (heutiges zweites Fenster) | Bleibt als Rückfallebene. Nur mit Laptop als Eingabegerät. |
| Eigenes WLAN mit Router oder Raspberry Pi in der Halle | Verworfen: Aufbau, Anschaffung und Pflege je Verein; Zuschauer müssten sich ins WLAN einwählen. |
| **Weiterleitung über das Internet** | **Gewählt.** Jedes Gerät braucht nur irgendeinen Internetzugang. |
| Direkt von Gerät zu Gerät (WebRTC) | Vorerst nicht. Braucht trotzdem einen Vermittler und ist in Hotspots unzuverlässig. Höchstens später für Hallen-WLAN ohne Internet. |
| Livestream bzw. Fotos der Tafel | Keine echte Lösung, am Handy kaum lesbar. |

## Gewählte Lösung: Weiterleitungsdienst

- Das Eingabegerät schickt bei jeder Änderung den **ganzen aktuellen Stand** an einen kleinen Onlinedienst. Die Tafel und
  später die Zuschauer empfangen ihn innerhalb von etwa einer Sekunde.
- **Die Geräte müssen nicht im selben Netz sein.** Jedes Gerät nutzt einen eigenen Internetzugang: SIM-Karte, Hotspot eines
  Handys oder ausnahmsweise Hallen-WLAN.
- Jeder Wettkampf bekommt einen eigenen, zufälligen **Raum**. Alle Tafeln, später auch Zuschauer und Kampfrichter-Handys,
  gehören zu diesem Raum. Mehrere Wettkämpfe gleichzeitig sind dadurch kein Problem.
- **Ende-zu-Ende-verschlüsselt** mit der vorhandenen AES-Verschlüsselung (`js/crypto.js`): Der Dienst leitet nur Daten
  weiter, die er nicht lesen kann.
- Der Dienst hält nur den **letzten Stand** eines Raums, damit ein neu verbundenes Gerät sofort etwas zeigt. Er löscht alles
  automatisch, z. B. 24 Stunden nach der letzten Änderung.
- **Vorgesehener Anbieter:** Cloudflare Workers mit Durable Objects, ein Raum je Wettkampf. Grenzen und Kosten geprüft
  (siehe „Cloudflare: Grenzen und Kosten“): kostenloser Tarif reicht, ab den Zuschauern bezahlter Tarif ab 5 $ im Monat.
- Der Dienst trägt auch den **Rückweg** von den Kampfrichter-Handys zum Eingabegerät (Schritt 3).
- **Datenvolumen:** pro Wettkampf und Gerät voraussichtlich unter 10 MB.

## Schritt 1: Netzwerktafel

**Rollen**
- **Eingabegerät:** wie heute, hält alle Daten.
- **Tafelgerät:** zeigt nur an und speichert keine Wettkampfdaten. Die bestehende Regel gilt auch hier: Querformat zeigt die
  große Tafel, Hochformat die ausführliche.

**Koppeln (Code am Tafelgerät)**
1. Das Tafelgerät öffnet die App und wählt auf der Startseite „Als Anzeigetafel verwenden“. Es zeigt groß einen Code mit
   8 Zeichen, z. B. `4K7P-9XQ2`, dazu einen QR-Code. Der Code dient nur dem einmaligen Koppeln (siehe „Kopplungscode“).
2. Am Eingabegerät gibt man im Menü Anzeigetafel unter „Tafel verbinden …“ den Code ein oder scannt den QR-Code mit Tablet
   oder Handy.

**Bis zu 3 Tafeln je Wettkampf** (festgelegt 15.11.2026)
- Technisch verteilt der Dienst den Stand an beliebig viele lesende Geräte; mehrere Tafeln kosten weder Leistung noch Geld.
  Begrenzt wird auf 3, damit die Übersicht am Eingabegerät handlich bleibt.
- Beispiele: Beamer plus zweiter Bildschirm an der anderen Hallenseite, ein Tablet für Kampfrichter oder Mannschaftsführer
  am Tisch, ein hochkant aufgestelltes Tablet mit der ausführlichen Tafel.
- Jede weitere Tafel zeigt wie die erste ihren eigenen Code; am Eingabegerät „Weitere Tafel verbinden …“ und Code eintippen
  bzw. scannen.
- Das Eingabegerät listet alle verbundenen Tafeln mit Status und kann jede einzeln trennen.
- Jede Tafel richtet sich nach ihrer eigenen Ausrichtung: Querformat zeigt die große Tafel, Hochformat die ausführliche.

**Betrieb**
- Das Eingabegerät steuert die Tafel wie heute das zweite Fenster: Turnervorstellung, Einturnzeit, Pause, Ergebnis und
  Siegerehrung, Hell und Dunkel.
- Eingabegerät und Tafeln zeigen ihren **Status**, z. B. „Tafel verbunden“ bzw. „Verbindung unterbrochen – letzter Stand 14:32“. Bei
  einer Unterbrechung zeigt die Tafel den letzten Stand weiter.
- **Automatisches Wiederverbinden** nach Aussetzer, Neustart oder Akkuwechsel, ohne neuen Code.
- Die Kopplung gilt für diesen Wettkampf und endet mit dem Abschluss, per „Tafel trennen“ bzw. „Kopplung lösen“ oder
  spätestens nach 24 Stunden ohne Änderung. Das Tafelgerät speichert dafür nur die Zugangsdaten, keine Wettkampfdaten.

**Technische Punkte**
- Timer wie Pause und Einturnzeit werden als Restzeit übertragen, damit unterschiedlich gestellte Uhren der Geräte keine
  Rolle spielen.
- Einblendungen, z. B. die 8 Sekunden nach einer Freigabe, tragen eine fortlaufende Nummer. So erscheinen sie genau einmal,
  auch nach dem Wiederverbinden.
- **Schreibrecht nur für das Eingabegerät** über ein geheimes Schreibrecht je Raum. Tafel und Zuschauer können nur lesen.
- Browser-Tests mit zwei Browserfenstern als Eingabe und Tafel.

## Schritt 2: Zuschauer (mitgeplant, noch nicht umgesetzt)

Schritt 1 wird so gebaut, dass Schritt 2 und Schritt 3 ohne Umbau folgen können:
- **Ein gemeinsames Datenpaket** für Tafel und Zuschauer: alle Noten aller Geräte, Namen, Vereine und Farben. Ohne
  Kampfrichternamen und ohne interne Daten.
- **Lesen und Schreiben getrennt** von Anfang an, mit Rollen und eigenen Schreibrechten (für Schritt 3).

Später hinzu kommen:
- Ein **Zuschauer-Link nur zum Lesen**, getrennt vom Kopplungscode. Der Schlüssel steht im Link-Teil nach `#` und wird nicht
  an den Server gesendet.
- Ein **QR-Code für die Zuschauer** auf der Hallentafel, z. B. vor Beginn und in der Pause, und als Ausdruck für den Eingang.
- Die **Zuschauerseite**: im Handybrowser ohne Installation, mit der ausführlichen Tafel im Hochformat. Vorschlag: Sie läuft
  standardmäßig live mit, Blättern zu anderen Geräten und zum Gesamtstand ist möglich, mit dem Knopf „zurück zu live“.
  Einblendungen gibt es am Handy keine oder nur dezent.
- **Gültigkeit:** z. B. bis zum Ende des Wettkampftags, danach wird alles gelöscht. Dauerhafte Ergebnisse gehören auf die
  Liga-Webseite.
- **Last:** etwa 50–300 Zuschauer je Wettkampf, bei bis zu 3 Wettkämpfen gleichzeitig.

## Schritt 3: Kampfrichter-Handys (mitgeplant, noch nicht umgesetzt)

Festgelegt 22.11.2026.

**Ziel:** Die E-Kampfrichter geben ihren E-Abzug auf dem eigenen Handy ein, statt ihn per Zettel oder Zuruf weiterzugeben.
Der Oberkampfrichter prüft, ändert und gibt am Handy frei. Das ist ein **Zusatz**: Der heutige Betrieb am Eingabegerät
bleibt jederzeit vollständig möglich.

**Grundprinzip**
- Das Eingabegerät des Wettkampfleiters, z. B. der Laptop, bleibt die **einzige Stelle, die Daten hält**.
- Jede Eingabe vom Handy ist eine Nachricht an das Eingabegerät. Es übernimmt sie, speichert sie wie heute sofort und
  verteilt den neuen Stand an alle Beteiligten.
- Ändern zwei Stellen dasselbe Feld, gilt die letzte Änderung, und alle sehen sie sofort.
- Es ist also **kein** Betrieb mit mehreren gleichberechtigten Eingabegeräten.
- Mögliche Aufstellungen:
  - Der Laptop steht fest an einer Stelle in der Halle, mit dem Beamer per Kabel (zweites Fenster), und die Kampfrichter
    werten am Handy. Die Hallentafel hängt dann nicht am Internet. Nur der Laptop und die Kampfrichter-Handys brauchen
    Netz, der Laptop z. B. über einen Handy-Hotspot.
  - Der Laptop steht wie heute am Kampfrichtertisch, und nur einzelne Kampfrichter werten am Handy.

**Mischbetrieb – jederzeit möglich**
- Jede Rolle wird **entweder** per Handy **oder** wie heute am Laptop bedient, unabhängig voneinander. Beispiel: E2 wertet
  am Handy, E3 ruft zu, und der Wettkampfleiter tippt ein.
- Ohne Handy des Oberkampfrichters gibt der Wettkampfleiter am Laptop frei, wie heute auf Zeichen des Oberkampfrichters.
- Wechsel sind **mitten im Wettkampf** möglich, z. B. wenn ein Akku leer ist: Der Laptop trägt den Wert einfach selbst ein,
  und das Handy kann später wieder einsteigen.
- Im Wertungsfenster am Laptop ist bei jedem Feld erkennbar, woher der Wert kommt (z. B. „📱 E2“ oder am Laptop
  eingegeben). Außerdem sieht man, wer für die aktuelle Übung schon geliefert hat.

**Rollen und Rechte**

| Rolle | Gerät | Aufgaben |
|---|---|---|
| Wettkampfleiter | Laptop (Eingabegerät) | Bestimmt den Ablauf: Aufstellung, aktueller Turner, „kein Turner“ (gibt ihn auch selbst frei, Endnote 0,00), Turnervorstellung, Einturnzeit, Pause, Ergebnis und Siegerehrung. Kann **jederzeit alle Felder ändern, freigeben und Wertungen ändern**. Das ist die Rückfallebene bei technischen Problemen und der Normalfall für Rollen ohne Handy. |
| E1 = Oberkampfrichter | eigenes Handy (optional) | Gibt E1, D-Note (mit D-Note-Rechner), Standbonus und neutrale Abzüge ein. Sieht E2 und E3 sofort beim Eingang und kann alle Werte ändern. Bedient den Sturz-Timer. Gibt frei und kann Wertungen nach der Freigabe ändern. Fachlich entscheidet nur er über die Freigabe. |
| E2, ggf. E3 | eigenes Handy (optional) | Gibt nur den eigenen E-Abzug ein. Bis zur Freigabe änderbar. |
| D-Kampfrichter der Vereine | kein Gerät | Stimmen die D-Note mündlich mit dem Oberkampfrichter ab, auch in der Doppelrolle D- und E-Kampfrichter bei nur 3 Personen im Kampfgericht. |

**Ablauf**
1. **Koppeln:** Der Laptop zeigt je Rolle einen QR-Code (Oberkampfrichter, E2, E3). Jeder Kampfrichter scannt seinen Code,
   und die Kampfrichterseite öffnet sich im Browser, ohne Installation. Der Code des Oberkampfrichters gibt mehr Rechte. Er
   wird deshalb nur am Tisch gezeigt und kann neu erzeugt werden. Rollen ohne Handy werden einfach nicht gekoppelt.
2. **Aktuelle Übung:** Der Wettkampfleiter bestimmt am Laptop, wer dran ist. Standardmäßig ist es die nächste offene Übung
   in der Reihenfolge, und der Wettkampfleiter kann eine andere wählen. Alle Handys zeigen oben Gerät, Duell bzw. Position,
   Startnummer, Name und Verein.
3. **Eingabe:** E2 und E3 tippen ihren Abzug auf der Zahlentastatur der App und senden ihn. Vor der Freigabe sehen sie nur
   ihren eigenen Wert.
4. **Prüfen:** Der Oberkampfrichter sieht alle Werte sofort und kann jeden ändern. Er sieht die Vorschau von E-Note und
   Endnote wie im Wertungsfenster, in der Oberliga auch die Scorepunkte des Duells.
5. **Freigabe:** Der Oberkampfrichter gibt am Handy frei, oder der Laptop gibt frei. Für die Tafel gilt dasselbe wie heute:
   In der Oberliga wird beim ersten Turner eines Duells nur gespeichert, das Duell wird freigegeben, wenn beide fertig sind.
6. **Nach der Freigabe:** E2 und E3 sehen **nur die zählende E-Note**, nicht die einzelnen Abzüge der anderen. Bei 2
   Kampfrichtern ergibt sie sich aus dem Mittelwert, bei 3 aus dem mittleren Abzug. Danach springen die Handys zur nächsten
   Übung.
7. **Wertung ändern** nach der Freigabe: Das geht beim Oberkampfrichter am Handy und am Laptop, mit denselben Regeln wie
   heute, einschließlich Zurücknehmen.

**Nicht vorgesehen**
- Wertungszettel als Beleg.
- Grenzwerte bzw. Warnungen bei weit auseinanderliegenden E-Abzügen.
- Eingabe durch die D-Kampfrichter.

**Technische Punkte**
- Der Weiterleitungsdienst braucht einen **Rückweg** von den Handys zum Eingabegerät. Jede Rolle bekommt ein eigenes
  Schreibrecht, das nur für ihre Felder gilt; der Oberkampfrichter hat mehr Rechte. Das wird schon in Schritt 1 so angelegt.
- Jede Eingabe trägt die Kennung der Übung. Werte für eine nicht mehr aktuelle oder schon freigegebene Übung werden
  abgewiesen und am Handy gemeldet.
- Bildschirmsperre, Anruf und Rückkehr in den Browser: Das Handy verbindet sich automatisch wieder und zeigt den aktuellen
  Stand.
- **Aufwand:** grob 5–8 Beta-Runden. Am aufwendigsten ist die Ansicht des Oberkampfrichters, die einem kleinen
  Wertungsfenster am Handy mit Freigabe, Korrektur und Sturz-Timer entspricht. Dazu kommt die Herkunftsanzeige im
  Wertungsfenster am Laptop.

## Datenschutz (wird noch besprochen)

- **Schritt 1:** Die Daten bleiben inhaltlich in der Halle. Der Dienst sieht nur verschlüsselte Daten und die IP-Adressen
  der beteiligten Geräte (Eingabegerät und bis zu 3 Tafeln).
- **Schritt 2:** Namen und Noten werden für jeden mit dem Link sichtbar, also faktisch veröffentlicht. Zu klären mit Liga
  und WTB:
  - Freigabe der Live-Veröffentlichung.
  - Hinweis an Vereine und Turner, z. B. in der Ausschreibung.
  - Gegebenenfalls ein Schalter „nur Startnummer statt Name“.
  - Impressum und Datenschutzerklärung auf der Zuschauerseite.
  - Vertrag zur Auftragsverarbeitung mit Cloudflare.
  - Umgang mit Minderjährigen, falls sie starten.
- **Schritt 3:** Kaum zusätzlich. Kampfrichternamen werden nicht übertragen; der Dienst sieht wie in Schritt 1 nur
  verschlüsselte Daten und die IP-Adressen der Handys.
- Erwartung: kein grundsätzliches Hindernis.

## Cloudflare: Grenzen und Kosten (geprüft 22.11.2026)

Nach der Dokumentation von Cloudflare (Stand 22.11.2026). Bedarf geschätzt für 3 Wettkämpfe an einem Tag mit Tafeln,
Kampfrichter-Handys und etwa 300 Zuschauern je Wettkampf.

| Grenze im kostenlosen Tarif (pro Tag, Rückstellung 00:00 UTC) | Wert | Geschätzter Bedarf |
|---|---|---|
| Anfragen | 100.000 | etwa 10.000–30.000 |
| Laufzeit („Duration“) | 13.000 GB-s | höchstens etwa 5.500 |
| Rechenzeit je Anfrage | 10 ms | wenige ms (Daten nur weiterreichen) |
| Schreibvorgänge in den Speicher | 100.000 Zeilen | etwa 6.000 |
| Speicher | 5 GB | wenige KB (nur der letzte Stand je Raum) |

**Grundlage der Schätzung**
- Ein Verbindungsaufbau zählt als eine Anfrage; ankommende WebSocket-Nachrichten zählen im Verhältnis 20 : 1, ausgehende gar
  nicht.
- Eingabegerät: etwa 1.000 Nachrichten je Wettkampf (rund 50 Anfragen). Kampfrichter-Handys: 48 Übungen × etwa 15
  Nachrichten (rund 36 Anfragen).
- Größter Posten sind neue Verbindungen der Zuschauer nach Bildschirmsperre: 300 Zuschauer × bis zu 30 = etwa 9.000 je
  Wettkampf.
- Mit der WebSocket-„Hibernation“ kosten ruhende Verbindungen keine Laufzeit. Selbst bei 4 Stunden ununterbrochen aktivem
  Raum je Wettkampf (128 MB) wären es nur etwa 5.500 GB-s.

**Risiken**
- Beim Erreichen einer Tagesgrenze verweigert der Dienst bis 00:00 UTC (keine Mehrkosten, aber Tafeln und Handys stehen;
  der Wettkampf am Eingabegerät läuft weiter). Realistisch nur durch einen Fehler, z. B. Endlosschleife beim Wiederverbinden
  – dagegen absichern (Wartezeiten zwischen Verbindungsversuchen) und testen.
- Die 10 ms Rechenzeit beim Verteilen an etwa 300 Zuschauer sind mit einem Lasttest zu bestätigen.

**Kosten und Empfehlung**
- Entwicklung, Tests und Schritt 1: **kostenloser Tarif**.
- Spätestens mit den Zuschauern: **bezahlter Tarif ab 5 $ im Monat** (etwa 60 $ im Jahr zzgl. MwSt.). Enthalten sind
  1 Mio. Anfragen und 400.000 GB-s im Monat, ohne harte Tagesgrenze; darüber 0,15 $ je Million Anfragen und 12,50 $ je
  Million GB-s. Bei unserer Menge bleibt es praktisch bei 5 $.
- Adresse unter `workers.dev` kostenlos, eigene Domain optional.

Quellen: [Durable Objects – Preise](https://developers.cloudflare.com/durable-objects/platform/pricing/),
[Durable Objects – Grenzen](https://developers.cloudflare.com/durable-objects/platform/limits/),
[Durable Objects – WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/),
[Workers – Preise](https://developers.cloudflare.com/workers/platform/pricing/),
[Workers – Grenzen](https://developers.cloudflare.com/workers/platform/limits/)

## Kopplungscode (geprüft 22.11.2026)

**Grundidee: kurzer Einmal-Code, danach lange Schlüssel**
1. Das Tafelgerät erzeugt einen kurzen Code und wartet damit beim Dienst.
2. Das Eingabegerät gibt den Code ein und übergibt der Tafel – **verschlüsselt mit dem Code** – die dauerhaften
   Zugangsdaten des Wettkampfs: Raumkennung (128 Bit, zufällig) und Leseschlüssel (AES 256 Bit). Das Schreibrecht behält
   nur das Eingabegerät.
3. Damit ist der Code **verbraucht**. Beide Geräte merken sich die langen Zugangsdaten und verbinden sich damit später
   automatisch wieder.

**Aufbau**
- **8 Zeichen**, angezeigt als `4K7P-9XQ2`.
- **Zeichenvorrat:** 32 Zeichen – Ziffern 2–9 und Buchstaben A–Z ohne I und O. Keine Verwechslung von 0/O und 1/I; wird
  trotzdem O, 0, I oder 1 getippt, erscheint ein Hinweis. Groß-/Kleinschreibung egal, den Bindestrich setzt die App.
- **Sicherheit:** 40 Bit (etwa 1 Billion Möglichkeiten); mit kurzer Gültigkeit und Begrenzung der Versuche ist Erraten
  praktisch ausgeschlossen. Verworfen: 6 Zeichen (30 Bit, ausreichend, aber weniger Reserve) und reine Ziffern (8 Ziffern
  nur etwa 27 Bit).
- **Gültigkeit:** 10 Minuten, danach zeigt die Tafel von selbst einen neuen Code. Jeder Code ist **nur einmal verwendbar**.
- **QR-Code daneben** mit demselben Code als Link: Tablet oder Handy als Eingabegerät scannen, am Laptop abtippen.
- Ende-zu-Ende: Der Dienst sieht nur eine aus dem Code abgeleitete Kennung, nie den Code selbst.
- **Begrenzung der Versuche** beim Dienst, z. B. höchstens 10 falsche Codes pro Minute und Gerät (schützt auch die
  Tagesgrenzen von Cloudflare).

**Schwachstelle: Code für alle sichtbar am Beamer** – ein Zuschauer könnte schneller tippen und die Tafel „übernehmen“.
Absicherung:
- Nur einmal verwendbar: Kommt jemand zuvor, meldet das Eingabegerät „Code bereits verwendet“ – fällt sofort auf.
- Sichtbare Bestätigung: Die Tafel zeigt kurz „Verbunden – Heim gegen Gast“, das Eingabegerät „Tafel 1 verbunden“.
- Knopf „Kopplung lösen“ am Tafelgerät, danach neuer Code.
- Gekoppelt wird in der Regel beim Aufbau, bevor Zuschauer da sind; danach zeigt die Tafel keinen Code mehr.
- Eine gekoppelte Tafel nimmt keinen zweiten Sender an.
- Eine zusätzliche Prüfzahl zum Vergleichen auf beiden Geräten ist deshalb nicht nötig.

**Abgrenzung zu den anderen Codes**
- **Kampfrichter (Schritt 3):** Das Eingabegerät zeigt je Rolle einen QR-Code, die Handys scannen. Nichts wird abgetippt,
  deshalb enthalten diese QR-Codes direkt die langen Zugangsdaten samt Schreibrecht der Rolle; kein kurzer Code. Der
  QR-Code des Oberkampfrichters lässt sich neu erzeugen (der alte wird ungültig). Gezeigt nur am Eingabegerät, nie am Beamer.
- **Zuschauer (Schritt 2):** langer Lese-Link bzw. QR-Code, nur lesen, ohne kurzen Code.

## Vor der Umsetzung zu prüfen

- ~~Grenzen und Kosten von Cloudflare Workers mit Durable Objects~~ – erledigt 22.11.2026, siehe oben. Offen bleibt der
  Lasttest mit vielen Zuschauern.
- ~~Aufbau des Kopplungscodes~~ – erledigt 22.11.2026, siehe „Kopplungscode“.
- Verhalten von iPad und iPhone bei gesperrtem Bildschirm und im Hintergrund: Wiederverbinden und Bildschirm wach halten am
  Tafelgerät.
- Wo der Dienst-Code liegt und wie er veröffentlicht wird, z. B. als eigener Ordner im Repository.

## Mögliche spätere Ergänzungen

- Live-Übersicht aller laufenden Wettkämpfe für die Liga-Webseite.
- Direkte Verbindung von Gerät zu Gerät für Hallen-WLAN ohne Internet.
- Mehrere **gleichberechtigte** Eingabegeräte (gemeinsames Bearbeiten des Wettkampfs) – weiterhin nicht geplant; die
  Kampfrichter-Handys aus Schritt 3 liefern nur zu, die Daten bleiben auf einem Gerät.
