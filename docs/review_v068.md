# Robinson — Rundum-Review des Hauptspiels (Stand v068, 2026-11-10)

Geprüft: Technik (auch Android), Spielmechanik, Erzähllogik, Erklärlogik. Grundlage sind der Quellcode, das Geschichtsbuch (v6 + Nachtrag v7), das Regelbuch und neue Testläufe: `test_android.py` (emuliertes Pixel 7, Touch, gedrosselte CPU) und `test_haupt_v069.py` (beschädigter Spielstand, Speichern und Laden, acht Fluten ohne Aktion).

**Grenze der Prüfung:** Android ist emuliert (Chromium mit Touch, Pixel-7-Maßen und 4-fach gedrosselter CPU). Auf einem echten Gerät habe ich nichts gemessen. Bildraten aus der Emulation sind nur untereinander vergleichbar, weil dort ohne Grafikchip gezeichnet wird.

---

## 1. Themenliste

### A. Sollte auf jeden Fall umgesetzt werden

| # | Thema | Befund | Vorschlag |
|---|---|---|---|
| A1 | **Fortschritt geht innerhalb einer Ebbe verloren** | Gespeichert wird nur einmal pro Flut. Im Test: Änderung in der Ebbe, Seite neu geladen → Änderung weg. Android beendet Hintergrund-Tabs regelmäßig; es gibt auch keinen Handler für `pagehide`. | Zusätzlich speichern, wenn die App in den Hintergrund geht (`visibilitychange`/`pagehide`), und nach jeder Aktion, die Tide oder Währung kostet. |
| A2 | **Speichern scheitert lautlos** | Jeder Schreibfehler wird verschluckt (`catch {}`), z. B. voller Speicher oder gesperrter Speicher. Der Spieler merkt es erst beim nächsten Start. Der Spielstand hält bis zu 50 volle Zustände (≈ 26 KB je Tide bei Tide 40, also bis ≈ 1,3 MB). | Sichtbare Warnung, wenn das Schreiben scheitert; nur die letzten 5–10 vollen Zustände behalten. |
| A3 | **Android: als Datei geöffnet kann das Spiel evtl. nicht speichern** | Eine heruntergeladene HTML öffnet Chrome auf Android als `content://`-Seite; dort ist der Speicher oft gesperrt. Im Test mit gesperrtem Speicher startet und läuft das Spiel fehlerfrei, behält aber nichts — ohne Hinweis. | Auf Android nur über die Pages-Adresse spielen (https). Beim Start prüfen, ob Speichern geht, und sonst deutlich warnen. **Auf einem echten Gerät gegenprüfen.** |
| A4 | **Beschädigter Spielstand wirft einen Fehler** | Ist der letzte Zustand im Spielstand abgeschnitten, bricht `ladeAutosave` mit einem JSON-Fehler ab (Test 1 in `test_haupt_v069.py`). | Abfangen, auf den vorletzten Zustand zurückfallen, Meldung zeigen. |
| A5 | **Logbuch lädt mit +1 Ausdauer** | Autosave → neu laden → Logbuch schreiben → Logbuch laden: maximale Ausdauer 19 wird 20 (Test 2). Direkt nach dem Katzensprung tritt es nicht auf. | Ursache im Logbuch-Grundzustand suchen und beheben; der Test bleibt als Wächter. |
| A6 | **Erste Minute auf dem Handy** | Nach dem Anschwimmen liegt Robinson im Dunkeln. Der einzige Hinweis „Crawl: A / D or hold the screen edges“ ist dunkelgrau auf Schwarz, klein und nennt Tasten. 70 s Tippen brachten im Test keinen Fortschritt; man muss die Ränder *halten*. | Hinweis hell und groß, auf Touch-Geräten ohne Tastennamen, mit Pfeilen an den Rändern; Tippen sollte auch zählen. |
| A7 | **Lektion Flammenwerfer war veraltet** — *in v069 behoben* | Die Karte sagte noch „keep A held while you climb“. Seit v065 brennt er bis zum Eintauchen. | Erledigt; der Test bleibt als Wächter. |
| A8 | **Lektionen hängen an der Stage-Nummer** | Wolken (20/21) und Barrel (27/28) werden nur in genau diesen Stages erklärt. Der Turm reitet Stages automatisch, Katzensprünge überspringen sie: Dann trifft man die Mechanik ohne Erklärung. | Lektion bei den ersten zwei *erlebten* Begegnungen zeigen (im Spielstand merken), nicht nach Stage-Nummer. |
| A9 | **Der Koffer sagt „darling“** | „darling“ ist das Wort der Schildkröte; der Koffer sagt „Mr. Robinson“. Zwei Koffer-Texte verwenden „darling“ (Kofferfund; „Who is on the radio“ aus v063). | „Who is on the radio“ ist in v069 korrigiert (mein Text aus v063). Der Kofferfund ist älter und bleibt deine Entscheidung. |
| A10 | **Echtes Android-Gerät testen** | Inselkarte: in der Emulation ≈ 200 ms pro Bild gegenüber ≈ 3 ms im Surf; sie setzt jedes Bild mehrere bildschirmgroße Ebenen neu zusammen, auch wenn nichts passiert. Das Barrel kostet in der Emulation etwa das Dreifache des normalen Surfs — auch nach dem Umbau in v069, der das Wasser klein zeichnet und vergrößert. Ob das auf einem Gerät mit Grafikchip spürbar ist, zeigt nur der Gerätetest. | Auf einem Mittelklasse-Gerät Bildrate und Wärme auf Karte, Surf und Barrel prüfen. Je nach Ergebnis A-Thema oder erledigt. |

### B. Sehr empfohlen

| # | Thema | Befund | Vorschlag |
|---|---|---|---|
| B1 | **Die Insel verteidigt sich fast von selbst** | Acht Fluten ab Tide 40 ohne eine einzige Aktion: 19 → 16 Wurzeln, der Banyan wächst von Ring 9 auf 14, die Insel fällt nie. Der Nachschub steigt zwar alle 10 Tiden, aber die Zahl der Speerspitzen ist ab Tide 50 durch die Ziele gedeckelt (8). | Entweder Druck erhöhen (z. B. Banyan wächst nur mit gehaltenen Angriffen, Nachschub ohne Deckel) oder das als gewollte Ruhephase benennen und der Insel dafür Ziele geben. Ist eine Richtungsentscheidung. |
| B2 | **Währungen stauen sich im späten Spiel** | Bei Tide 40: Stempel-Upgrades alle auf dem Maximum (6/6/6), Katzen-Upgrades fertig, dazu 6 314 💚 und 235 🐟 ungenutzt. Die Stages werden weiter schwerer, der Schaden wächst nicht mehr mit. | Neue Senken: weitere Stufen, Insel-Projekte gegen 💚, etwas für Fischschwänze. |
| B3 | **Turm-Chance fällt zwangsläufig auf das Minimum** | Formel: 72 % + 3 % × (Upgrade-Stufen − 2 × Stage). Mit allen Upgrades (70 Stufen) liegt die Chance ab Stage 35 unter 72 %, bei Stage 45 bei 42 %, ab ≈ Stage 55 am Boden von 10 %. Bei Tide 40 (Stage 27, 49 Stufen): 64 % bei voller Ausdauer. | Stage-Glied abflachen oder an neue Upgrades koppeln (siehe B2). |
| B4 | **„Tide“ hat zwei Bedeutungen** | „Tide 40“ ist der Tag, „8 tides“ sind die Aktionspunkte einer Ebbe; dazu „spring tides“. Regelkarte: „Every low tide gives you a number of tides“. | Aktionspunkte umbenennen (z. B. „hours“ oder „low water“). Entscheidung nötig, weil viele Texte betroffen sind. |
| B5 | **Ein Zug, drei Namen** | Lektion „WAVE CYCLE“, Upgrade und Regelkarte „Wall Leap“, in Boss-Texten „dash-dive“. | Einen Namen festlegen. |
| B6 | **Tutorials aus = auch keine Karten für neue Gegner** | „TUTORIALS: OFF“ schaltet auch die „NEW:“-Karten für Aale, Wolken und Barrel ab. | Schalter trennen: Übungstexte aus, Neuheiten-Karten bleiben. |
| B7 | **Fi ist stillgelegt, die Spuren sind noch da** | Seit v063 kommt das Lösch-Memo nie; der Elfen-Knoten im Traum bleibt verborgen, die dritte Persönlichkeitsstufe des Koffers („Angst“) ist unerreichbar. Die Funk-Drohung („remote recall“) kündigt etwas an, das nie passiert. Das Geschichtsbuch führt Fi weiter als vereinbart. | Entscheiden: Auslöser wieder einbauen (z. B. nach der zweiten Absage am Funk) oder dem Koffer einen Abschlusssatz geben und das Geschichtsbuch anpassen. |
| B8 | **Nachschub-Kahn passt nicht zur Geschichte** | Ab Tide 20 landet ein Kahn „with the Board's flag“, gezeichnet mit Figuren. Laut Geschichtsbuch gibt es noch keine Menschen, und das Board erfährt erst mit der ersten Bestechung, dass Jasper lebt. | Kahn unbemannt machen (Text und Bild) oder die erste Landung an das Wissen des Boards koppeln. |
| B9 | **Kein Sparmodus auf schwachen Geräten** | Der Schalter `P.lite` existiert, wird im Hauptspiel aber nie eingeschaltet. | Automatisch einschalten, wenn die Bildrate einige Sekunden unter ≈ 40 liegt; dazu ein Schalter im Menü. |
| B10 | **Zurück-Taste auf Android** | Keine Behandlung: „Zurück“ verlässt das Spiel sofort (mit A1 geht dabei die laufende Ebbe verloren). | Zurück schließt zuerst offene Fenster; beim Verlassen speichern (A1). |
| B11 | **Verlorene Testreihe** | `test_schnittstelle.py` fehlt seit dem Quellcode-Verlust; die Schnittstelle zwischen Strand, Surf und Insel ist nur indirekt getestet. | Neu schreiben (Übergaben, Ergebnisobjekte, Währungen). |

### C. Nice to have (entscheidungsfähig)

| # | Thema | Befund | Vorschlag |
|---|---|---|---|
| C1 | Kleine Touch-Flächen | „TUTORIALS“ 131×26, Ton 25×24 (quer 17×17), Insel-Menü ☰ 30×20; Richtwert sind 40–48. Erfasst sind nur HTML-Knöpfe, nicht die gezeichneten. | Vergrößern. |
| C2 | Deutsche Wörter im englischen Spiel | „Wandel“ (38 Texte) und „Befall“ (14) als Spielbegriffe. | Als Eigenart behalten oder übersetzen. |
| C3 | Kein Lexikon der Gegner | Regelkarten gibt es für Züge, nicht für Aale, Kielläuse, Wespen, Tentakel. | Kleine Gegnerkarten im Regelbildschirm. |
| C4 | Schadenssprung bei Stage 8 | Treffer kosten ×1 (Stage 1–3), ×1,5 (4–7), ×3 (ab 8) — die Verdopplung fällt mit den ersten Wänden zusammen. | Stufen glätten (z. B. ×2 bei 8, ×3 bei 12). |
| C5 | Als App installierbar | Kein Manifest, kein Offline-Cache; „Zum Startbildschirm“ ergibt nur ein Lesezeichen. | Manifest und Service Worker über Pages. |
| C6 | Regelbuch ist ein Änderungsprotokoll | 146 KB, nach Versionen sortiert; den aktuellen Regelstand muss man sich zusammensuchen. | Einmal einen Stand „Regeln heute“ schreiben, Protokoll getrennt führen. |
| C7 | Geschichtsbuch nachziehen | Chat-Seiten sind seit v063 vertauscht (Koffer links); Funk-Dialog, Nachschub und Barrel fehlen im Nachtrag. | Nachtrag v8. |
| C8 | Vibration bei Treffern | Wird nicht genutzt. | Kurzer Impuls bei Schaden und beim SPIT, abschaltbar. |
| C9 | Bildschirm wach halten | Kein Wake Lock; in langen Insel-Ebben kann das Display abdunkeln. | Wake Lock, solange das Spiel im Vordergrund ist. |

---

## 2. Technik (auch Android)

**In Ordnung**
- Layout: Titel, Strand und Insel passen hoch und quer auf das Pixel 7, nichts liegt außerhalb, kein Querscrollen. Kleingedrucktes unter 12 px kommt praktisch nicht vor.
- Touch im Surf: links = A, rechts = D; zwei Finger gleichzeitig werden getrennt gehalten und gelöst. Der Surf pausiert, wenn die App in den Hintergrund geht; der Ton wird dabei angehalten.
- Zoom und Scrollen sind gesperrt, Aussparungen (Notch) sind berücksichtigt, Bildschärfe ist auf 2-fach begrenzt.
- Alle Zugriffe auf den Speicher sind abgesichert: Mit gesperrtem Speicher startet das Spiel fehlerfrei.
- Speichern und Laden: Autosave → neu laden ergibt denselben Strand und dieselbe Insel (Tide, Währungen, Upgrades, jedes Feld). Kaputter Text und ein Spielstand ohne Zustand werden sauber ignoriert.
- Acht Fluten hintereinander laufen ohne Hänger, ohne Seitenfehler, ohne kaputte Zahlen.
- Build: eine Datei (≈ 1,6 MB), Wächter gegen verschluckten Code, Tests je Version.

**Auffällig** (Einordnung in der Liste oben)
- Speichern nur je Flut (A1), lautlose Fehler (A2), Datei-Start auf Android (A3), abgeschnittener Zustand (A4), Logbuch +1 Ausdauer (A5).
- Kosten je Bild in der Emulation mit 4-fach langsamerer CPU: Strand 2,7 ms, Surf Stage 12 2,2 ms, Surf Stage 27 2,7 ms, Barrel 9,4 ms Rechenzeit (und sichtbar weniger Bilder), Inselkarte ≈ 850 ms. Unverzögert braucht die Inselkarte ≈ 200 ms je Bild. Der Hauptanteil ist reines Zeichnen der Ebenen, nicht Spiellogik (A10, B9).
- Kein Verhalten für die Zurück-Taste (B10), kein Sparmodus (B9), nicht installierbar (C5).
- Neuere Browser-Funktionen: `roundRect` (48 Stellen) und `deflate-raw` für das Logbuch brauchen Chrome ab ≈ 103 bzw. Firefox ab 113. Auf aktuellen Geräten unkritisch; auf alten Tablets fällt das Logbuch aus.

## 3. Spielmechanik

- **Insel, spätes Spiel:** siehe B1. Zahlen der Spielstände: Tide 20 — 7 Wurzeln, 1 Speerspitze; Tide 30 — 11 Wurzeln, 6 Speerspitzen + 3 Katapulte, im Schnitt 19 % Haltechance; Tide 40 — 19 Wurzeln, 7 + 5, im Schnitt 50 %. Dem stehen 8 Tiden + 9 Springtiden je Ebbe gegenüber. Der Druck steigt bis Tide 30 deutlich und flacht dann ab, während Banyan und Wurzeln weiterwachsen.
- **Nachschub:** +1 Speerspitze je Netz alle 10 Tiden, auf dem Stand von Tide 40 aber ab Tide 50 bei 8 gedeckelt, weil es nicht mehr Ziele gibt. Die Regel verspricht „every ten tides a little better“, wirkt dann aber nicht mehr.
- **Katapulte:** laden/feuern im Wechsel; auf dem Stand von Tide 40 5 Schüsse in geraden, 3 in ungeraden Tiden. Funktioniert wie beschrieben.
- **Surf:** Gegner-Leben +8 % je Stage, Stempel-Schaden endet bei Stufe 6. Bis etwa Stage 75 bleiben Kaulquappen trotzdem Ein-Treffer-Gegner; die Schwierigkeit kommt aus Dichte und Tempo. Das ist tragfähig, nimmt aber den Upgrades ab Tide 40 die Wirkung (B2).
- **Turm:** B3.
- **Schadensstufen:** C4.
- **Wolken, Schild, Barrel:** laufen in den Tests wie beschrieben; die offenen Barrel-Punkte (Startkarte, Ruhe davor, Welle wartet) kommen mit v069.

## 4. Erzähllogik

- **Rückgrat stimmt:** Akt 1 (Strand, First Mate, Vermessung) und Akt 2 (Banyan, Fäulnis, Board, Degradierung, „Restructuring“, Ferrants Anruf, die Katze geht) sind im Spiel in der Reihenfolge des Geschichtsbuchs. Ferrants Name taucht früh nur als Schriftzug und Visitenkarte auf, also als gezeigtes Geheimnis — das passt zum Prinzip „wer auftritt, wird vorgestellt“. Der „handler“ am Funk bereitet seinen Anruf sauber vor.
- **Brüche:** Fi (B7), Nachschub-Kahn mit Besatzung (B8), „darling“ beim Koffer (A9).
- **Offene Fäden, die das Spiel anlegt und (noch) nicht einlöst:** die Sprachnachricht der Mutter („not urgent“), Jana auf Position, das Tor unter dem Berg. Für eine Demo in Ordnung; wichtig ist nur, dass nichts davon vorher versehentlich aufgelöst wird.
- **Neue Mechaniken ohne Platz in der Geschichte:** Giftwolken, Barrel und Nachschub haben keine erzählte Ursache. Ein Satz der Schildkröte je Neuheit würde reichen (z. B. warum die Welle ab jetzt bricht).
- **Dokumente:** Nachtrag v7 beschreibt den Chat noch mit vertauschten Seiten (C7).

## 5. Erklärlogik

- **Stark:** Der Surf führt eine Sache je Stage ein (reiten, springen, Boost, Nosegrab, Backflip, VOID, Wand), mit Schildern in der Welle und einer Regelkarte zum Nachlesen. Die Insel hat ein geführtes Tutorial und schaltet Regelkarten beim ersten Auftreten frei.
- **Lücken:** erste Minute am Strand auf dem Handy (A6); Lektionen an Stage-Nummern statt an Erlebtem (A8); veraltete Flammenwerfer-Karte (A7); Tutorial-Schalter zu grob (B6); „Tide“ doppelt (B4); drei Namen für den A-Zug (B5); kein Gegner-Lexikon (C3).
- **Begriffe sonst einheitlich:** „stage“ nur im Surf, „ebb/flood“ für die Phasen, „Bad Omen/Overflow“ für die beiden Angriffsarten.

---

## 6. Testläufe dieser Runde

| Test | Was | Ergebnis |
|---|---|---|
| `test_android.py` | Pixel 7 hoch/quer: Layout, Touch-Flächen, Kleingedrucktes; gesperrter Speicher; Touch und zwei Finger im Surf; Pause im Hintergrund; Bildkosten bei 4-fach langsamerer CPU; Verlust bei beendetem Tab; Größe des Spielstands | läuft durch; Zahlen stehen oben |
| `test_haupt_v069.py` | beschädigte Spielstände, Speichern/Laden, Logbuch-Rundlauf, acht Fluten ohne Aktion, Lektionstexte | 3 Befunde: A4, A5, A7. A7 ist behoben; A4 und A5 meldet der Test als „OPEN“, ohne den Lauf scheitern zu lassen. |
| bestehende Reihen | Insel v058–v063, Traum, Surf v065, Barrel-Baustelle | grün |

## 7. Mit v069 umgesetzt (Barrel im Hauptspiel)

- Stage 27 beginnt mit „NEW: THE BARREL“, Stage 28 mit „THE BARREL AGAIN“ statt „more of everything“.
- Vor jedem Barrel liegen mindestens 3,5 s freies Wasser (gemessen 4 s und mehr).
- Die Welle wartet: Steckt Robinson kurz vor dem Überrollen noch im A-Zyklus, an einer Wand oder unter einer Wolke, hält sich der Kamm (höchstens 9 s), bis er frei ist. Ein D-Hüpfer hält nichts auf.
- Röhre im Bogen: Das Auge sitzt rechts der Mitte, die fernen Ringe schwenken immer schneller dorthin; Gegner, Herzen und Robinson folgen dem Bogen.
- Weiche Kanten: zwölf Farbstufen statt drei harter Flächen, weiches Auge, weiche Öffnung oben rechts, weicher Rand beim Ein- und Ausrollen.
- Ein- und Ausfahrt: Die offene Welle sinkt unter der wachsenden Röhre in die Wasserfarbe, sodass am Ende nichts springt; beim Ausrollen umgekehrt. Der Flug nach dem SPIT ist durch den Schild sichtbar geschützt statt durch Blinken.
- Zwei eigene Texte korrigiert (A7, ein Teil von A9).
- Offen aus der Liste bleiben insbesondere A1–A6, A8 und A10.

## 8. Mit v070 umgesetzt (2026-11-12)

Alle Themen der Liste außer C8 (Vibration) und C9 (Bildschirm wach halten). Deine Entscheidungen: Aktionspunkte heißen „hours“, Insel-Druck moderat erhöhen, Fi wieder einschalten, „Wandel“/„Befall“ übersetzen (Kinship/Blight).

| Thema | Stand |
|---|---|
| A1 Speichern in der Ebbe | umgesetzt; im Test bleibt die Änderung nach dem Neuladen erhalten |
| A2 Speichern scheitert lautlos | umgesetzt (Warnung, zweiter Versuch, 8 statt 50 Zustände) |
| A3 Android als Datei | Warnung auf dem Titel, wenn nichts gespeichert werden kann; echtes Gerät weiter ungeprüft |
| A4 Beschädigter Spielstand | umgesetzt (fällt auf den Zustand davor zurück) |
| A5 Logbuch +1 Ausdauer | Ursache war nicht das Logbuch: Jedes Laden würfelte die Krabben neu, und der Turm erledigte die Strandarbeit noch einmal. Behoben mit A1 |
| A6 Erste Minute | umgesetzt (heller Hinweis, Gesten statt Tasten, Pfeile, Tippen zählt) |
| A7, A9 Texte | umgesetzt |
| A8, B6 Lektionen | umgesetzt (nach Erlebtem; Neuheiten-Karten auch bei „Tutorials aus“) |
| A10 echtes Gerät | **offen** — kann nur an einem Gerät geprüft werden |
| B1 Insel-Druck | umgesetzt wie gewählt, **wirkt aber kaum**: 19 → 15 Wurzeln, Banyan Ring 14 nach acht Fluten ohne Aktion. Bei sieben Speerspitzen mit rund 50 % wird fast immer etwas gehalten |
| B2, B3 Senken und Turm | längere Upgrade-Leitern (bis Stufe 8), Turm-Formel mit 1,5 × Stage |
| B4, B5, C2 Begriffe | hours, Wall Leap, Kinship, Blight |
| B7 Fi | wieder eingeschaltet (zweite Funk-Absage) |
| B8 Kahn | unbemannt |
| B9 Sparmodus | auto / lite / full |
| B10 Zurück-Taste | umgesetzt |
| B11 Schnittstellen-Test | neu geschrieben |
| C1, C3–C7 | umgesetzt (Touch-Flächen, Gegnerkarte, installierbar über `play.html`, `regeln_heute.md`, Nachtrag v8) |

