# Netzwerkfunktion – Planung

Stand: 15.11.2026 · Status: **Planung, noch nicht umgesetzt**. Diskussion in einem eigenen Chat, getrennt von der
App-Entwicklung.

## Ziel

1. **Schritt 1 (wird umgesetzt): Netzwerktafel.** Die Anzeigetafel läuft auf einem **eigenen Gerät** am Beamer, z. B. ein
   Vereinslaptop oder ein einfach aufgestellter Laptop oder Tablet. Eingegeben wird am Kampfrichtertisch auf Laptop, Tablet
   oder Handy.
2. **Schritt 2 (mitgeplant, noch nicht umgesetzt): Zuschauer.** Zuschauer sehen den Wettkampf über Link oder QR-Code auf
   dem eigenen Handy.

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
- Jede Kopplung bekommt einen eigenen, zufälligen **Raum**. Mehrere Wettkämpfe gleichzeitig sind dadurch kein Problem.
- **Ende-zu-Ende-verschlüsselt** mit der vorhandenen AES-Verschlüsselung (`js/crypto.js`): Der Dienst leitet nur Daten
  weiter, die er nicht lesen kann.
- Der Dienst hält nur den **letzten Stand** eines Raums, damit ein neu verbundenes Gerät sofort etwas zeigt. Er löscht alles
  automatisch, z. B. 24 Stunden nach der letzten Änderung.
- **Vorgesehener Anbieter:** Cloudflare Workers mit einem Raum je Kopplung. Vor der Umsetzung sind die Grenzen des
  kostenlosen Rahmens zu prüfen. Kosten: voraussichtlich 0 €, mit Zuschauern zur Sicherheit etwa 5 $ im Monat.
- **Datenvolumen:** pro Wettkampf und Gerät voraussichtlich unter 10 MB.

## Schritt 1: Netzwerktafel

**Rollen**
- **Eingabegerät:** wie heute, hält alle Daten.
- **Tafelgerät:** zeigt nur an und speichert keine Wettkampfdaten. Die bestehende Regel gilt auch hier: Querformat zeigt die
  große Tafel, Hochformat die ausführliche.

**Koppeln (Code am Tafelgerät)**
1. Das Tafelgerät öffnet die App und wählt auf der Startseite „Als Anzeigetafel verwenden“. Es zeigt groß einen Code mit
   etwa 8 Zeichen, z. B. `4K7P-9XQ2`, dazu einen QR-Code. Der Code enthält Raum und Schlüssel.
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
- Die Kopplung gilt für diesen Wettkampf und endet mit dem Abschluss oder per „Tafel trennen“.

**Technische Punkte**
- Timer wie Pause und Einturnzeit werden als Restzeit übertragen, damit unterschiedlich gestellte Uhren der Geräte keine
  Rolle spielen.
- Einblendungen, z. B. die 8 Sekunden nach einer Freigabe, tragen eine fortlaufende Nummer. So erscheinen sie genau einmal,
  auch nach dem Wiederverbinden.
- **Schreibrecht nur für das Eingabegerät** über ein geheimes Schreibrecht je Raum. Tafel und Zuschauer können nur lesen.
- Browser-Tests mit zwei Browserfenstern als Eingabe und Tafel.

## Schritt 2: Zuschauer (mitgeplant, noch nicht umgesetzt)

Schritt 1 wird so gebaut, dass Schritt 2 ohne Umbau folgen kann:
- **Ein gemeinsames Datenpaket** für Tafel und Zuschauer: alle Noten aller Geräte, Namen, Vereine und Farben. Ohne
  Kampfrichternamen und ohne interne Daten.
- **Lesen und Schreiben getrennt** von Anfang an.

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
- Erwartung: kein grundsätzliches Hindernis.

## Vor der Umsetzung zu prüfen

- Grenzen und Kosten von Cloudflare Workers mit Durable Objects, vor allem für WebSockets und viele Zuschauer.
- Aufbau des Codes: Länge und Zeichen (gut abzulesen, keine Verwechslung von 0/O, 1/I), Sicherheit gegen Erraten und
  Gültigkeitsdauer.
- Verhalten von iPad und iPhone bei gesperrtem Bildschirm und im Hintergrund: Wiederverbinden und Bildschirm wach halten am
  Tafelgerät.
- Wo der Dienst-Code liegt und wie er veröffentlicht wird, z. B. als eigener Ordner im Repository.

## Mögliche spätere Ergänzungen

- Live-Übersicht aller laufenden Wettkämpfe für die Liga-Webseite.
- Direkte Verbindung von Gerät zu Gerät für Hallen-WLAN ohne Internet.
- Mehrere Eingabegeräte, z. B. je Kampfgericht. Das ist bewusst nicht geplant und wäre deutlich aufwendiger.
