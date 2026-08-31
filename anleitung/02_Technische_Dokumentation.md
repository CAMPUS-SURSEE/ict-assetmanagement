# Technische Dokumentation — ICT Lager Campus Sursee

Stand: August 2026

Diese Dokumentation richtet sich an die Person, die die Anwendung später
warten muss. Sie erklärt vor allem das *Warum* — das *Was* steht im Code
selbst.

---

## 1. Überblick

ICT Lager ist die Inventarverwaltung für die Informatikgeräte von Campus
Sursee. Sie besteht aus zwei getrennten Welten:

**Innen** — die Verwaltung. Nur für zugewiesene Mitarbeitende der
Informatik. Spricht direkt mit Microsoft Graph und sieht alle Felder.

**Aussen** — eine Seite pro Gerät, erreichbar über den QR-Code auf der
Etikette. Ohne Anmeldung, ohne Graph, mit genau sechs Feldern.

Diese Trennung ist die zentrale Entwurfsentscheidung. Sie zieht sich durch
die ganze Anwendung und wird in Abschnitt 5 ausführlich begründet.

```
                            Browser
                               |
        +----------------------+-----------------------+
        |                                              |
   INTERN (Anmeldung)                          ÖFFENTLICH (keine)
   admin.html                                  geraet.html
   etikette.html                                    |
   setup.html                                       |
        |                                           |
   MSAL -> Entra ID                          anonymer HTTP-Trigger
        | Zugriffstoken                      Power Automate
        |                                    «API Geraet laden»
        v                                           |
   Microsoft Graph                                  | nur 6 Felder
   /v1.0/sites/{site}/lists/{liste}/items           |
        |                                           |
        +---------------> SharePoint <--------------+
                          Site mgmts-ict-s
                          Listen: Geraete, Verlauf
```

---

## 2. Architektur

### 2.1 Rein statische Site

Kein Build-Prozess, kein Bundler, kein Framework, keine
`node_modules`. Der Ordner `frontend/` ist exakt der Ordner, der
auf Netlify liegt. Ablage per Drag & Drop.

Das ist bewusst so gewählt — dieselbe Entscheidung wie bei der bestehenden
Anwendung «Menüwahl BAULÜÜT». Die Begründung:

- Wer in fünf Jahren eine Kleinigkeit ändern muss, öffnet eine Datei und
  ändert sie. Er muss nicht zuerst herausfinden, welche Node-Version das
  Projekt einmal gebraucht hat und ob die Abhängigkeiten noch installierbar
  sind.
- Es gibt keine Lieferkette, die verwundbar sein könnte. Die einzigen
  Fremdbibliotheken sind zwei CDN-Dateien mit fest gepinnter Prüfsumme.
- Der Betrieb ist eine Handvoll Dateien auf einem CDN. Nichts kann abstürzen,
  nichts braucht Wartungsfenster.

Der Preis: kein Code-Sharing über Module, mehr Wiederholung im CSS. Bei fünf
Seiten ist das der bessere Handel.

### 2.2 Eine Seite = eine Datei

Jede Seite enthält ihr eigenes HTML, CSS und JavaScript inline. Geteilt sind
nur drei Dateien:

| Datei | Inhalt |
|---|---|
| `konfig.js` | alle Einstellungen an einem Ort |
| `auth.js` | Anmeldung (Aufsatz auf MSAL) |
| `graph.js` | Datenzugriff plus Hilfsfunktionen |

Der Vorteil: um `geraet.html` zu verstehen, reicht `geraet.html`. Man muss
nicht durch fünf Dateien springen, um herauszufinden, wo eine CSS-Klasse
herkommt.

### 2.3 Die Seiten

| Datei | Anmeldung | Zweck |
|---|---|---|
| `index.html` | nein | Startseite, zwei Links |
| `admin.html` | ja | Dashboard, Geräteliste, Detail, Etikettenauswahl |
| `etikette.html` | ja | Druckansicht der Etiketten |
| `geraet.html` | **nein** | öffentliche Geräteseite hinter dem QR-Code |
| `setup.html` | ja | einmalige Einrichtung der SharePoint-Listen |

`admin.html` ist eine kleine Einzelseitenanwendung: drei Ansichten, die über
`hidden` umgeschaltet werden, plus eine Detail-Tafel, die von rechts
einfährt. Kein Router, nur `location.hash`.

### 2.4 Fremdbibliotheken

Zwei, beide über `cdn.jsdelivr.net`, beide mit `integrity`-Prüfsumme und
`crossorigin="anonymous"` gepinnt:

| Bibliothek | Version | Wofür |
|---|---|---|
| `@azure/msal-browser` | 4.30.0 | OAuth 2, Authorization Code Flow mit PKCE |
| `qrcode-generator` | 1.4.4 | QR-Codes für die Etiketten |

Die Prüfsummen (`sha384-…`) stehen direkt im `<script>`-Tag. Ändert sich die
Datei auf dem CDN, lädt der Browser sie gar nicht erst. Beim Aktualisieren
auf eine neue Version muss die Prüfsumme neu berechnet werden:

```bash
curl -sL https://cdn.jsdelivr.net/npm/<paket>@<version>/<datei> \
  | openssl dgst -sha384 -binary | openssl base64 -A
```

**Kein Eigenbau.** Weder die Anmeldung noch die QR-Erzeugung wurden selbst
geschrieben. Beides sind Felder, in denen ein selbstgebauter Ansatz still
und leise falsch sein kann.

---

## 3. Datenmodell

SharePoint-Site: <https://campussursee.sharepoint.com/sites/mgmts-ict-s>

### 3.1 Liste `Geraete`

Ein Eintrag pro Gerät. Die Item-ID von SharePoint ist zugleich die
öffentliche Geräte-Nummer im QR-Code.

| Spalte | Typ | Öffentlich? |
|---|---|---|
| `Title` (Gerätename) | Text, Pflicht | **ja** |
| `Kategorie` | Auswahl, Pflicht | **ja** |
| `Status` | Auswahl, Pflicht, Vorgabe *Lager* | **ja** |
| `Hersteller` | Text | **ja** |
| `Modell` | Text | **ja** |
| `BeschreibungOeffentlich` | Text mehrzeilig | **ja** |
| `AssetNr` | Text | nein |
| `Seriennummer` | Text | nein |
| `IPAdresse` | Text | nein |
| `MACAdresse` | Text | nein |
| `Owner` | Text | nein |
| `Standort` | Text | nein |
| `Anschaffungsdatum` | Datum | nein |
| `EndOfLife` | Datum | nein |
| `GarantieBis` | Datum | nein |
| `Preis` | Zahl (CHF) | nein |
| `NotizenIntern` | Text mehrzeilig | nein |

Auswahlwerte:

- `Kategorie`: PC, Notebook, Monitor, Drucker, Netzwerk, Mobile, Peripherie,
  Server, Sonstiges
- `Status`: Aktiv, Lager, Reparatur, Ausgemustert

Beide Listen stehen als Konstanten `KATEGORIEN` und `STATUS` in `graph.js`.
Wer einen Wert ergänzt, muss ihn an beiden Orten ergänzen: in SharePoint
(Spalteneinstellung) und in `graph.js`. Die Auswahlfelder und die Filter in
`admin.html` bauen sich daraus automatisch auf.

### 3.2 Liste `Verlauf`

Chronik. Wird nie überschrieben, nur ergänzt.

| Spalte | Typ | Inhalt |
|---|---|---|
| `Title` | Text | Aktion: «Erstellt», «Geändert», «Gelöscht», «Reparatur», «Notiz», … |
| `GeraetId` | Text | Item-ID aus `Geraete` |
| `Datum` | Datum mit Zeit | |
| `Text` | Text mehrzeilig | was passiert ist |
| `Wer` | Text | aus `Auth.konto()`: «Anna Muster (anna.muster@campus-sursee.ch)» |

`GeraetId` ist bewusst eine **Textspalte** und keine Nachschlagespalte
(Lookup). Eine Nachschlagespalte würde beim Löschen eines Geräts entweder
das Löschen blockieren oder die Verlaufseinträge mitreissen. Genau das soll
nicht passieren: der Verlauf soll überleben, auch wenn das Gerät weg ist —
sonst lässt sich hinterher nicht mehr nachvollziehen, was mit dem Gerät
geschehen ist.

### 3.3 Automatische Verlaufseinträge

`admin.html` schreibt bei jeder Änderung selbst:

| Auslöser | Aktion | Text |
|---|---|---|
| Neues Gerät gespeichert | `Erstellt` | «Gerät angelegt: *Name* (Asset-Nr. …)» |
| Gerät geändert | `Geändert` | eine Zeile je geändertes Feld: «Standort: «Lager 1» → «Raum B12»» |
| Gerät gelöscht | `Gelöscht` | «Gerät gelöscht: *Name*» |
| Von Hand erfasst | frei | frei |

Bei den beiden langen Textfeldern (`NotizenIntern`,
`BeschreibungOeffentlich`) steht nur «… geändert» — der ganze alte und neue
Text würde den Verlauf unlesbar machen.

Wird beim Speichern kein Unterschied festgestellt, wird weder geschrieben
noch ein Verlaufseintrag erzeugt. Das verhindert, dass die Chronik mit
Leereinträgen zuwächst.

Die Verlaufseinträge laufen über `Graph.verlaufVersuchen()`: schlägt das
Schreiben fehl, wird das nur in der Konsole vermerkt, aber die eigentliche
Änderung gilt trotzdem. Die Chronik ist eine Beigabe, nicht die
Datenhaltung — sie darf nie der Grund sein, dass eine Gerätemutation
scheitert.

---

## 4. Datenzugriff

### 4.1 Site-ID zur Laufzeit

In `frontend/konfig.js` steht kein GUID-Salat, sondern der lesbare Pfad:

```js
sitePfad: "campussursee.sharepoint.com:/sites/mgmts-ict-s"
```

`Graph.siteId()` löst ihn beim ersten Zugriff über
`GET /v1.0/sites/{sitePfad}?$select=id` auf und merkt sich das Ergebnis für
die Lebensdauer der Seite (ein `Promise` als Zwischenspeicher, damit
parallele Aufrufe nicht mehrfach anfragen). Schlägt die Auflösung fehl, wird
der Zwischenspeicher geleert, damit ein späterer Versuch es nochmals
probiert.

Die Listen dürfen in `konfig.js` als Anzeigename **oder** als GUID stehen —
Graph nimmt beides an derselben Stelle. Empfohlen ist die GUID: sie
überlebt, wenn jemand die Liste in SharePoint umbenennt. `setup.html` zeigt
sie nach dem Anlegen an.

### 4.2 Immer die ganze Liste, gefiltert wird im Browser

`Graph.geraete()` und `Graph.verlauf()` holen **alle** Einträge mit
`$expand=fields($select=…)&$top=999` und folgen `@odata.nextLink`. Gefiltert
und sortiert wird danach in JavaScript.

Der Grund: serverseitige `$filter` auf selbst angelegten Listenspalten
setzen in SharePoint einen Index voraus. Ohne Index wirft SharePoint ab
5000 Einträgen einen Fehler — und zwar erst dann, also lange nach der
Einführung, wenn niemand mehr an diese Stelle denkt. Bei einigen hundert bis
wenigen tausend Geräten ist das Laden der ganzen Liste ohnehin schneller als
mehrere gefilterte Abfragen.

Ausnahme: der Power-Automate-Flow filtert serverseitig auf `ID` — die
eingebaute Spalte ist immer indiziert.

Wenn die Feldauswahl scheitert (HTTP 400, etwa weil eine Spalte umbenannt
wurde), wird automatisch ohne `$select` erneut versucht. Dann kommen zwar
mehr Daten über die Leitung, aber die Anwendung funktioniert weiter.

### 4.3 Datumswerte

SharePoint speichert Datumswerte als UTC-Zeitstempel. Je nachdem, womit ein
Eintrag angelegt wurde, steht dort `2026-08-27T22:00:00Z` oder
`2026-08-28T12:00:00Z` — beides meint denselben Tag in der Schweiz.

Deshalb:

- **Lesen:** `Hilfe.datumAusSp()` rechnet über die lokale Zeitzone auf
  `JJJJ-MM-TT` um.
- **Schreiben:** `Hilfe.datumFuerSp()` setzt `T12:00:00Z` — Mittag UTC liegt
  in jeder relevanten Zeitzone am richtigen Tag.

Diese beiden Funktionen sind der einzige Ort, an dem mit
SharePoint-Zeitstempeln gerechnet wird.

### 4.4 Fassade in `graph.js`

Die Seiten kennen kein Graph, keine Pfade und keine SharePoint-Feldnamen.
Sie kennen nur:

```js
Graph.geraete()                  // alle Geräte, nach Name sortiert
Graph.geraet(id)
Graph.geraetAnlegen(felder)      // -> neue ID
Graph.geraetAendern(id, felder)  // nur die mitgegebenen Felder
Graph.geraetLoeschen(id)
Graph.verlauf(geraetId)          // ohne Argument: alle
Graph.verlaufAnlegen(felder)
Graph.verlaufVersuchen(felder)   // wie oben, scheitert aber nie laut
Graph.listenAnlegen(melden)      // nur für setup.html
```

Die Übersetzung zwischen kleingeschriebenen JavaScript-Feldern
(`endOfLife`) und SharePoint-Spalten (`EndOfLife`) passiert in `ausSp()`
und `felderAusGeraet()`. `felderAusGeraet()` schreibt nur Felder, die
tatsächlich mitgegeben wurden — dadurch kann `geraetAendern()` auch nur eine
einzelne Spalte anfassen.

Auswahlspalten kommen je nach Konfiguration als Text oder als Objekt
(`{Value: "Aktiv"}`) zurück. `Hilfe.wert()` glättet beides.

---

## 5. Sicherheitsmodell

### 5.1 Zwei Zugriffswege, mit Absicht getrennt

|  | intern | öffentlich |
|---|---|---|
| Seiten | `admin.html`, `etikette.html`, `setup.html` | `geraet.html` |
| Anmeldung | Entra ID, SSO | keine |
| Weg zu den Daten | Microsoft Graph, direkt | Power-Automate-Flow |
| Sichtbare Felder | alle | sechs |
| Schreibrechte | ja | nein |

**Die öffentliche Seite spricht nie mit Microsoft Graph.** Sie hat kein
Token, könnte keines bekommen und kennt die Site-ID nicht. Der einzige Weg
nach aussen führt über den Flow, und der gibt sechs von Hand aufgebaute
Felder zurück.

Das ist der wichtigste Punkt der ganzen Anwendung: die internen Felder
werden nicht im Browser ausgeblendet, sie **verlassen SharePoint gar nie**.
Wer im Browser die Entwicklerwerkzeuge öffnet und den Netzwerkverkehr von
`geraet.html` anschaut, sieht genau das, was auch auf dem Bildschirm steht.

Eine Filterung im Browser wäre keine Filterung, sondern eine optische
Täuschung.

### 5.2 Anmeldung

- **Ablauf:** OAuth 2 Authorization Code Flow mit PKCE, über MSAL.
- **Registrierung:** als *Einzelseitenanwendung (SPA)*, ohne Client Secret.
  Ein Secret könnte in einer statischen Seite nicht geheim bleiben, und PKCE
  ersetzt es sauber.
- **Berechtigungen:** delegiert — `Sites.ReadWrite.All` und `User.Read`. Das
  Token kann nur das, was die angemeldete Person in SharePoint ohnehin darf.
  Es ist kein Generalschlüssel. Anwendungsberechtigungen wären genau das und
  werden deshalb nicht verwendet.
- **Ablage:** `sessionStorage`. Beim Schliessen des Tabs ist alles weg.
  Kein `localStorage`, keine Cookies.
- **Stille Erneuerung:** MSAL holt neue Token über ein verstecktes iframe auf
  `login.microsoftonline.com`. Darum steht dieser Host in der CSP unter
  `frame-src`.

### 5.3 Wer darf hinein

Nicht die Anwendung entscheidet das, sondern Entra ID: die
Unternehmensanwendung steht auf **«Zuweisung erforderlich = Ja»**, und
zugewiesen sind die Mitarbeitenden der Informatik.

Nicht zugewiesene Personen bekommen von Entra eine Fehlerantwort und kommen
gar nie zur Anwendung zurück. Die Prüfung passiert also *vor* der Anwendung,
nicht *in* ihr — es gibt keine Rollenlogik im JavaScript, die man umgehen
könnte.

Zweite Schranke: das Token ist delegiert. Selbst wer zugewiesen ist, aber
keinen Zugriff auf die SharePoint-Site `mgmts-ict-s` hat, bekommt von Graph
ein 403.

`clientId` und `mandantId` stehen offen in `konfig.js`. Das ist bei
Einzelseitenanwendungen so vorgesehen und kein Fehler — beides sind
Bezeichner, keine Geheimnisse.

### 5.4 Content-Security-Policy

`_headers` setzt für alle Pfade:

```
default-src 'none';
script-src  'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src   'self' 'unsafe-inline';
img-src     'self' data:;
connect-src 'self' https://graph.microsoft.com
                   https://login.microsoftonline.com
                   https://*.environment.api.powerplatform.com;
frame-src   https://login.microsoftonline.com;
form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'
```

Grundhaltung `default-src 'none'`: erlaubt ist nur, was ausdrücklich
aufgeführt ist.

`'unsafe-inline'` bei `script-src` ist der Preis für das Muster «eine Seite =
eine Datei». Er wird abgefedert durch:

- `default-src 'none'` — eingeschleuster Code könnte nirgendwo hin,
- die `integrity`-Prüfsummen der beiden CDN-Dateien,
- und vor allem dadurch, dass nirgends fremder Inhalt als HTML ins Dokument
  gelangt (Abschnitt 5.5).

Wer `'unsafe-inline'` loswerden will, müsste jeden Script-Block in eine
eigene `.js`-Datei auslagern. Das ist möglich, kostet aber die
Selbsterklärungs-Eigenschaft der Seiten. Nonces gehen nicht, weil eine
statische Site keinen Server hat, der pro Anfrage einen Wert erzeugen
könnte.

### 5.5 Cross-Site-Scripting

Alle Inhalte aus SharePoint, aus dem Flow und aus Formularen gelten als
fremder Text. Sie werden **ausschliesslich über `textContent`** ins Dokument
gesetzt, nie über `innerHTML`.

`innerHTML` kommt an genau zwei Stellen vor, beide harmlos:

1. Das von `qrcode-generator` erzeugte SVG (`createSvgTag`) in `admin.html`
   und `etikette.html`. Es besteht nur aus Rechtecken; die kodierte Adresse
   erscheint nicht als Text im SVG.
2. Die Logo-Vorlage in `etikette.html` — ein festes, im Quelltext stehendes
   SVG.

Zusätzlich gibt es in `graph.js` `Hilfe.escape()` für den Fall, dass jemand
später doch einmal `innerHTML` braucht.

Auch CSS-Klassen werden nicht aus fremden Werten gebaut. In `geraet.html`
und `admin.html` läuft der Statuswert durch eine Tabelle bzw. eine Prüfung
gegen `STATUS`, bevor daraus eine Klasse wird — sonst könnte ein
manipulierter Wert wie `x" onload="…` ins `class`-Attribut wandern.

### 5.6 Der anonyme Flow

Er ist absichtlich anonym: die Geräteseite muss von jedem Handy aus gehen,
ohne Anmeldung, auch von Externen auf dem Areal.

Angriffsfläche und Antwort darauf:

| Frage | Antwort |
|---|---|
| Kann jemand IDs durchprobieren? | Ja. Er sieht dann Name, Kategorie, Status, Hersteller, Modell und die öffentliche Beschreibung von Geräten — genau das, was auch auf dem Gerät selbst steht. |
| Kann jemand schreiben? | Nein. Der Flow kennt nur «Elemente abrufen». |
| Kann jemand interne Felder sehen? | Nein. Sie sind nicht Teil der Antwort. |
| Kann jemand den Flow überlasten? | Power Automate drosselt selbst. Ein Ausfall macht die Geräteseite unbrauchbar, aber nicht die Verwaltung. |

Daraus folgt eine Regel für den Betrieb: **`BeschreibungOeffentlich` ist
öffentlich.** Was dort steht, kann jeder lesen, der einen QR-Code scannt
oder eine Nummer errät. Alles andere gehört nach `NotizenIntern`.

Der Aufruf ist bewusst ein «simple request» im Sinne von CORS: `GET`, keine
eigenen Kopfzeilen. Damit fragt der Browser vorher nicht per `OPTIONS` nach,
was ein anonymer Flow nicht beantworten würde.

**Der Flow baut sein JSON mit `addProperty()`, nicht als Text.** Das ist
kein Schönheitsentscheid. Würde die Antwort als JSON-Text mit `@{…}`
zusammengeklebt, zerlegte der erste Zeilenumbruch oder das erste
Anführungszeichen in `BeschreibungOeffentlich` die Antwort — und zwar
ausgerechnet bei den Geräten, deren Beschreibung jemand gepflegt hat. Mit
`addProperty()` entsteht ein echtes Objekt, das Power Automate selbst
korrekt serialisiert und maskiert. Die genaue Anleitung samt Testfall steht
in `anleitung/01_Einrichtung.md`, Schritt C.4 und C.8.

Ebenso hat der Flow einen **Fehlerzweig** («Ausführen nach: ist
fehlgeschlagen / übersprungen / Zeitüberschreitung»), der ein sauberes 404
liefert. Ohne ihn führte ein Aufruf mit `&id=abc` zu HTTP 502, weil
`int('abc')` im Filter abbricht — und `geraet.html` zeigte eine
unverständliche Meldung statt «Gerät nicht gefunden».

### 5.7 Was auf der Etikette steht

Nur der QR-Code, das Campus-Sursee-Logo und `servicedesk@campus-sursee.ch`.

Kein Gerätename, keine Asset-Nummer, keine Seriennummer. Eine Etikette klebt
auf einem Gerät, das herumgereicht, verliehen und verloren wird. Sie soll
dem Finder sagen, wen er anrufen kann — und sonst nichts verraten.

---

## 6. Code-Struktur

```
/
├── frontend/           ausgeliefert von Netlify — und NUR das
│   ├── index.html      Startseite
│   ├── admin.html      Verwaltung (Dashboard, Geräte, Etiketten, Detail)
│   ├── geraet.html     öffentliche Geräteseite
│   ├── etikette.html   Druckansicht
│   ├── setup.html      einmalige Einrichtung
│   ├── konfig.js       alle Einstellungen
│   ├── auth.js         Anmeldung
│   ├── graph.js        Hilfe + KATEGORIEN/STATUS + Graph-Fassade
│   ├── _headers        CSP und weitere Kopfzeilen (Netlify)
│   └── _redirects      /g/:id -> /geraet.html?id=:id (Netlify)
├── code/               Werkzeuge, die nicht ausgeliefert werden
│   └── serve.ps1       lokaler Testserver (serviert ../frontend)
├── anleitung/
│   ├── 01_Einrichtung.md
│   └── 02_Technische_Dokumentation.md
├── netlify.toml        publish = "frontend", kein Build-Befehl
└── README.md
```

### 6.1 `auth.js`

Vier Funktionen, mehr braucht keine Seite:

```js
await Auth.anmeldungSicherstellen()  // -> {name, adresse}, oder leitet weiter
await Auth.token()                   // -> gültiges Zugriffstoken
Auth.konto()                         // -> {name, adresse} | null
await Auth.abmelden()
```

`anmeldungSicherstellen()` löst entweder mit den Kontodaten auf oder leitet
zu Entra weiter und löst dann **nie** auf (es wird ein `Promise`
zurückgegeben, das offen bleibt). Dadurch läuft der Code nach dem Aufruf
nicht mit halb aufgebautem Zustand weiter.

Die Umleitungsadresse ist immer `origin + pathname`, ohne
Abfragezeichenfolge — sonst müsste jede Variante wie
`?ids=1,2,3` einzeln in der App-Registrierung stehen. MSAL merkt sich die
vollständige Adresse selbst und kehrt am Ende dorthin zurück.

### 6.2 `graph.js`

Drei Teile:

1. **`Hilfe`** — Text (`escape`, `wert`), Datum (`datumAusSp`,
   `datumFuerSp`, `datumKurz`, `zeitpunktText`, `heute`, `inMonaten`),
   Adressen (`geraetLink`).
2. **`KATEGORIEN` / `STATUS`** — die beiden Auswahllisten, einmal definiert
   und überall verwendet.
3. **`Graph`** — die Fassade aus Abschnitt 4.4, dazu am Ende die
   Spaltendefinitionen und `listenAnlegen()` für `setup.html`.

`listenAnlegen()` steht bewusst hier und nicht in `setup.html`: die
Spaltendefinitionen gehören an denselben Ort wie das Lesen und Schreiben
derselben Spalten. Wer eine Spalte ergänzt, sieht beides nebeneinander.

Die Funktion ist wiederholbar (idempotent): bestehende Listen werden gesucht
statt neu angelegt, bestehende Spalten übersprungen. Ein zweiter Klick auf
«Listen anlegen» richtet keinen Schaden an — und ist der bequemste Weg, eine
neu ergänzte Spalte auszurollen.

### 6.3 `admin.html`

Zustand:

```js
let geraete = [];          // einmal geladen, danach im Browser gefiltert
let aktuell = null;        // Gerät in der Detail-Tafel, null = neu
let sortierFeld, sortierAb;
const etikettenWahl = new Set();
```

Ablauf: `starten()` → `Auth.anmeldungSicherstellen()` → `ladenGeraete()` →
`dashboardZeichnen()`, `tabelleZeichnen()`, `etikettenZeichnen()`. Nach jeder
Änderung wird `ladenGeraete()` neu aufgerufen; es gibt keine lokale
Aktualisierung des Zustands, die auseinanderlaufen könnte.

Bemerkenswerte Stellen:

- **`passt(g, suchtext)`** — Sofortsuche über Name, Asset-Nr.,
  Seriennummer, IP, MAC und Owner. Mehrere Wörter werden mit UND verknüpft:
  «notebook muster» findet das Notebook von Herrn Muster.
- **`eolZustand(g)`** — `""`, `"bald"` (in unter 6 Monaten) oder `"vorbei"`.
  Der Vergleich läuft über Zeichenketten im Format `JJJJ-MM-TT`; die sind
  lexikografisch sortierbar, es braucht keine Datumsarithmetik.
- **`unterschiede(alt, neu)`** — baut den Text für den Verlaufseintrag.
- **`knoten(tag, klasse, text)`** — der kleine Helfer, der überall den
  Dreisatz aus `createElement` / `className` / `textContent` ersetzt. Er ist
  auch der Grund, warum `innerHTML` nirgends nötig ist.

Das Dashboard zeichnet die Kategorieverteilung mit CSS-Balken
(`width: n%`) — bewusst ohne Diagrammbibliothek. Für neun Balken lohnt sich
keine.

### 6.4 `etikette.html`

Aufruf: `etikette.html?ids=12,13,14`. Die IDs werden gegen `\d+` geprüft,
bevor sie weiterverwendet werden.

Die Druckgrösse lässt sich in CSS nicht über eine Klasse umschalten
(`@page` kennt keine Selektoren). Deshalb liegen zwei `<style>`-Blöcke im
Dokument, von denen jeweils einer über das `media`-Attribut scharf
geschaltet wird:

```js
el("stil-einzeln").media = einzeln ? "print" : "not all";
el("stil-bogen").media   = einzeln ? "not all" : "print";
```

- **Etikettendrucker:** `@page { size: 62mm 29mm; margin: 0 }`, eine
  Etikette pro Seite (`page-break-after: always`).
- **A4-Bogen:** `@page { size: A4 }`, Etiketten fliessen nebeneinander,
  `break-inside: avoid` verhindert das Zerreissen am Seitenumbruch.

Die Wahl merkt sich der Browser in `localStorage` — eine reine
Bequemlichkeit, jeder Zugriff darauf steht in `try/catch`.

Die Seite lädt die Geräte, obwohl sie für den QR-Code nur die IDs bräuchte.
Grund: so fällt vor dem Druck auf, wenn eine ausgewählte ID gar nicht mehr
existiert. Schlägt das Laden fehl, werden die Etiketten trotzdem erzeugt —
der QR-Code hängt nicht an den Gerätedaten.

### 6.5 `geraet.html`

Die einzige Seite ohne Anmeldung und ohne `graph.js`. Sie lädt nur
`konfig.js`, und daraus nur `FLOW_GERAET_URL` und die Kontaktangaben.

Fünf klar getrennte Zustände, alle mit einem lesbaren deutschen Text:

| Zustand | Meldung |
|---|---|
| keine `id` in der Adresse | «Keine Geräte-Nummer angegeben» |
| `FLOW_GERAET_URL` nicht gesetzt | «Die Geräteauskunft ist noch nicht eingerichtet» |
| `fetch` wirft (offline, CSP, DNS) | «Die Geräteauskunft ist gerade nicht erreichbar» |
| HTTP 404 oder `ok: false` | «Gerät nicht gefunden» |
| anderer HTTP-Fehler | «Die Geräteauskunft antwortet nicht richtig» |

Die Kontaktkarte ist in **jedem** Zustand sichtbar — auch wenn gar nichts
geladen werden konnte. Wer ein Gerät findet, soll den Servicedesk erreichen,
selbst wenn Power Automate gerade streikt. Die Betreffzeile der Mail wird
mit Gerätename und Nummer vorbereitet.

Die Seite ist mobile-first entworfen: sie wird fast ausschliesslich per
Handy aufgerufen, direkt aus der Kamera-App.

---

## 7. Gestaltung

- Akzentfarbe `#84B819` (Campus-Sursee-Grün, entnommen aus dem Punkt im
  offiziellen Logo). Sonst ausschliesslich Graustufen, plus ein gedämpftes
  Rot `#a13b1e` für Warnungen und das Löschen.
- Alle Farben als CSS-Variablen in `:root`.
- Systemschriften, kein Webfont — nichts nachzuladen, nichts zu blockieren.
- Radius 10 px, 1 px Rahmen, keine Schatten ausser an der Detail-Tafel.
- Die Verwaltung hat eine dunkle Seitenleiste (`#1a1a1a`) und einen hellen
  Inhaltsbereich (`#f5f6f4`) — damit fühlt sie sich wie eine Anwendung an und
  nicht wie ein Dokument.
- Das Logo ist als Inline-SVG eingebettet und nimmt über `currentColor` die
  Textfarbe an; deshalb funktioniert dasselbe SVG auf der dunklen
  Seitenleiste wie auf weissem Grund. Der grüne Punkt behält seine Farbe.
- Kein Framework, kein Tailwind, kein Icon-Paket. Die wenigen Symbole in der
  Seitenleiste sind handgeschriebene SVG-Pfade.

Ansprechverhalten: unter 820 px klappt die Seitenleiste in eine waagrechte
Leiste um, die Beschriftungen weichen den Symbolen. `geraet.html` ist von
Grund auf für das Handy gebaut.

---

## 8. Bekannte Grenzen

| Grenze | Auswirkung | Wann sie stört |
|---|---|---|
| Alle Geräte werden bei jedem Laden geholt | ca. 1–2 s bei 1000 Geräten | ab ca. 5000 Geräten spürbar; dann Auslagern in einen Suchindex prüfen |
| `'unsafe-inline'` in der CSP | siehe 5.4 | wenn eine externe Prüfung es beanstandet |
| Kein gleichzeitiges Bearbeiten | zwei Personen am selben Gerät: die letzte Speicherung gewinnt | selten, bei zwei bis drei Personen im ICT-Team praktisch nie |
| Verlauf wird nie aufgeräumt | Liste wächst | in Jahren; SharePoint verträgt das |
| Keine Bilder / Anhänge | | wenn Fotos gewünscht sind — SharePoint-Anhänge wären der Weg |
| Nur Deutsch | | |

---

## 9. Wartung

**Neue Kategorie oder neuer Status**
In SharePoint die Auswahlspalte ergänzen, dann `KATEGORIEN` bzw. `STATUS`
in `graph.js` ergänzen. Auswahlfelder und Filter bauen sich daraus
automatisch.

**Neue Spalte**
1. In `graph.js` bei `SPALTEN_GERAETE` die Definition ergänzen.
2. `setup.html` aufrufen und «Listen anlegen» klicken — die Spalte wird in
   SharePoint ergänzt, bestehende Daten bleiben.
3. In `graph.js` in `ausSp()` und `felderAusGeraet()` eintragen.
4. In `admin.html` in `FELD_BEZEICHNUNG` und ein Eingabefeld `f-<name>` im
   Formular ergänzen. Der Rest (Formular lesen/füllen, Verlauf-Unterschiede)
   läuft über `FELDER` automatisch mit.

**MSAL oder qrcode-generator aktualisieren**
Version im `<script>`-Tag ändern **und** die Prüfsumme neu berechnen
(Befehl in Abschnitt 2.4). Eine falsche Prüfsumme führt dazu, dass der
Browser die Datei stillschweigend nicht lädt — die Seite bleibt dann leer.

**Kontaktangaben ändern**
Die **Adresse** steht in `konfig.js` unter `servicedeskMail` — von dort
liest sie `etikette.html` (Aufdruck) und `geraet.html` (Betreffzeile).
Zusätzlich steht sie fest im HTML von `index.html` und `geraet.html`, damit
beide Seiten auch ohne JavaScript vollständig sind. Beim Ändern also **drei
Stellen** anpassen.

Die **Telefonnummer** steht bewusst *nur* im HTML von `index.html` und
`geraet.html` und nicht in `konfig.js`: `index.html` lädt `konfig.js` gar
nicht, ein Eintrag dort wäre also nur für eine der beiden Seiten nutzbar —
und ein Wert, den kein Code liest, wird beim Ändern zuverlässig übersehen.

**Domain ändern**
`BASIS_URL` in `konfig.js`. Achtung: bereits gedruckte Etiketten zeigen
weiterhin auf die alte Adresse. Eine Umleitung von der alten auf die neue
Domain aufrechterhalten.
