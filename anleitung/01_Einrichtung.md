# Einrichtung — ICT Lager Campus Sursee

Diese Anleitung führt einmal von oben nach unten durch. Danach läuft die
Anwendung unter `https://ictlager.campus-sursee.ch`.

Reihenfolge einhalten — Schritt B braucht die Client-ID aus Schritt A,
Schritt C braucht die Listen aus Schritt B.

| Schritt | Was | Wer | Dauer |
|---|---|---|---|
| A | App-Registrierung in Entra ID | Globaler Administrator | ca. 20 Min. |
| B | SharePoint-Listen anlegen | ICT, Besitzer der Site | ca. 5 Min. |
| C | Power-Automate-Flow bauen | ICT | ca. 20 Min. |
| D | Netlify-Deploy und Domain | ICT | ca. 15 Min. |
| E | `frontend/konfig.js` fertig ausfüllen | ICT | ca. 5 Min. |

---

## Schritt A — App-Registrierung in Entra ID

Für die Anmeldung an den internen Seiten (`admin.html`, `etikette.html`,
`setup.html`) braucht es eine eigene App-Registrierung. Die bestehende
Registrierung der Menüwahl darf **nicht** wiederverwendet werden: die
Berechtigungen und der Personenkreis sind andere.

### A.1 Registrierung anlegen

1. <https://entra.microsoft.com> öffnen, mit einem Konto mit
   Administratorrechten anmelden.
2. **Identität → Anwendungen → App-Registrierungen → Neue Registrierung**
3. Ausfüllen:
   - **Name:** `ICT Lager Verwaltung`
   - **Unterstützte Kontotypen:** *Nur Konten in diesem Organisationsverzeichnis
     (Campus Sursee — Einzelmandant)*
   - **Umleitungs-URI:** Plattform **Einzelseitenanwendung (SPA)** wählen —
     nicht «Web»! Als Adresse eintragen:
     `https://ictlager.campus-sursee.ch/admin.html`

   > Die Plattform **muss** SPA sein. Nur dort erlaubt Entra den
   > Authorization Code Flow mit PKCE ohne Geheimnis. Bei «Web» verlangt
   > Entra ein Client Secret, das in einer rein statischen Seite nicht
   > geheim bleiben könnte.

4. **Registrieren** klicken.
5. Auf der Übersichtsseite die **Anwendungs-ID (Client)** kopieren. Sie kommt
   später in `frontend/konfig.js` unter `clientId`.
   Die **Verzeichnis-ID (Mandant)** muss
   `2553fb74-5dcc-4072-8bb5-399d18f72af9` lauten; sie steht bereits in
   `frontend/konfig.js`.

### A.2 Weitere Umleitungsadressen

**Authentifizierung → Einzelseitenanwendung → URI hinzufügen.** Es braucht
jede Seite einzeln, weil MSAL die Adresse ohne Abfragezeichenfolge meldet:

```
https://ictlager.campus-sursee.ch/admin.html
https://ictlager.campus-sursee.ch/etikette.html
https://ictlager.campus-sursee.ch/setup.html
http://localhost:8000/admin.html
http://localhost:8000/etikette.html
http://localhost:8000/setup.html
```

Die drei `localhost`-Adressen sind für lokale Tests mit `code\serve.ps1`
(siehe README). Sie können nach der Einführung entfernt werden; solange die
Anwendung weiterentwickelt wird, sind sie praktisch. `http://` ist bei
`localhost` erlaubt, sonst nicht.

Weiter unten auf derselben Seite:

- **Implizite Genehmigung:** beide Haken (Zugriffstoken, ID-Token) **leer**
  lassen. Der Code Flow mit PKCE braucht sie nicht, und sie wären eine
  unnötige Schwächung.
- **Abmelde-URL:** `https://ictlager.campus-sursee.ch/`

### A.3 Berechtigungen

**API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph →
Delegierte Berechtigungen.** Genau diese zwei:

| Berechtigung | Wofür |
|---|---|
| `Sites.ReadWrite.All` | Lesen und Schreiben der Listen `Geraete` und `Verlauf` |
| `User.Read` | Name der angemeldeten Person für die Verlauf-Spalte «Wer» |

**Anwendungsberechtigungen** («Application permissions») nicht verwenden.
Delegiert heisst: das Token kann nur, was die angemeldete Person in
SharePoint ohnehin darf. Eine Anwendungsberechtigung wäre ein
Generalschlüssel auf sämtliche Sites des Mandanten.

Danach **«Administratorzustimmung für Campus Sursee erteilen»** klicken. Ohne
diesen Klick sieht jede Person beim ersten Aufruf einen
Zustimmungsdialog — und darf ihn je nach Mandanteneinstellung gar nicht
bestätigen.

### A.4 Zugriff auf zugewiesene Personen beschränken

Das ist der eigentliche Zugriffsschutz. Ohne diesen Schritt kann sich
**jede** Person des Mandanten an der Verwaltung anmelden.

1. **Identität → Anwendungen → Unternehmensanwendungen** (nicht
   App-Registrierungen!) → `ICT Lager Verwaltung` suchen.
2. **Eigenschaften → Zuweisung erforderlich? → Ja** → Speichern.
3. **Benutzer und Gruppen → Benutzer/Gruppe hinzufügen** → die Mitarbeitenden
   der Informatik zuweisen. Am besten eine Sicherheitsgruppe, z.B.
   `SG-ICT-Lager`, dann muss die Liste hier nie wieder angefasst werden.

Nicht zugewiesene Personen erhalten von Entra eine Fehlermeldung und kommen
gar nie zur Anwendung zurück. Die Prüfung passiert also vor der Anwendung,
nicht in ihr.

### A.5 Client-ID eintragen

In `frontend/konfig.js`:

```js
clientId: "die-kopierte-anwendungs-id",
```

---

## Schritt B — SharePoint-Listen anlegen

Ziel-Site: <https://campussursee.sharepoint.com/sites/mgmts-ict-s>

Das erledigt `setup.html` selbst. Voraussetzung: das angemeldete Konto darf
auf dieser Site Listen anlegen (Website-Besitzer oder Mitglied mit
Vollzugriff).

1. `setup.html` öffnen — entweder bereits auf Netlify oder lokal über
   `.\code\serve.ps1` unter <http://localhost:8000/setup.html>.
2. Anmelden.
3. **«Listen anlegen»** klicken. Das Protokoll zeigt jeden Schritt.
4. Am Schluss erscheinen die beiden Listen-IDs. Diese in `frontend/konfig.js`
   eintragen:

```js
listeGeraete: "8c0a1f3e-…",
listeVerlauf: "9d1b2e4f-…",
```

Der Vorgang ist wiederholbar: bestehende Listen und Spalten werden nicht
angefasst, es werden nur fehlende ergänzt. Ein zweiter Klick richtet keinen
Schaden an.

### Was angelegt wird

**Liste `Geraete`**

| Spalte | Typ | Bemerkung |
|---|---|---|
| `Title` | Text | Gerätename, Pflichtfeld |
| `AssetNr` | Text | Inventarnummer |
| `Kategorie` | Auswahl | PC, Notebook, Monitor, Drucker, Netzwerk, Mobile, Peripherie, Server, Sonstiges — Pflicht |
| `Status` | Auswahl | Aktiv, Lager, Reparatur, Ausgemustert — Pflicht, Vorgabe *Lager* |
| `Seriennummer` | Text | |
| `Hersteller` | Text | |
| `Modell` | Text | |
| `IPAdresse` | Text | |
| `MACAdresse` | Text | |
| `Owner` | Text | Name oder E-Mail |
| `Standort` | Text | |
| `Anschaffungsdatum` | Datum (ohne Zeit) | |
| `EndOfLife` | Datum (ohne Zeit) | |
| `GarantieBis` | Datum (ohne Zeit) | |
| `Preis` | Zahl, 2 Nachkommastellen | CHF |
| `NotizenIntern` | Text, mehrzeilig | verlässt nie die Verwaltung |
| `BeschreibungOeffentlich` | Text, mehrzeilig | erscheint auf der Geräteseite |

**Liste `Verlauf`**

| Spalte | Typ | Bemerkung |
|---|---|---|
| `Title` | Text | Aktion, z.B. «Erstellt», «Geändert», «Reparatur» |
| `GeraetId` | Text | Item-ID des Geräts aus der Liste `Geraete` |
| `Datum` | Datum mit Zeit | |
| `Text` | Text, mehrzeilig | was passiert ist |
| `Wer` | Text | wird aus dem angemeldeten Konto gefüllt |

> **Warum keine Nachschlagespalte (Lookup) statt `GeraetId`?**
> Eine Nachschlagespalte würde beim Löschen eines Geräts entweder das Löschen
> blockieren oder die Verlaufseinträge mitreissen. Der Verlauf soll aber auch
> dann bestehen bleiben, wenn ein Gerät ausgemustert und entfernt wird.

### Hinweis zu «Owner»

`Owner` ist bewusst eine Textspalte und keine Personenspalte. Eine
Personenspalte gäbe über Graph ein verschachteltes Objekt zurück, das je nach
Zustand des Kontos unterschiedlich aussieht, und liesse sich nicht mit einem
einfachen Textfeld befüllen. Für eine Lagerverwaltung reicht Name oder
E-Mail-Adresse.

---

## Schritt C — Power-Automate-Flow «API Geraet laden»

Dieser Flow ist die einzige Stelle, an der jemand **ohne Anmeldung** Daten
aus SharePoint bekommt. Er ist deshalb bewusst eng gebaut: er gibt nur sechs
Felder zurück, und diese sechs bereitet er von Hand auf. Es gibt keinen Pfad,
über den ein internes Feld versehentlich mitgeht.

Umgebung: Standardumgebung Campus Sursee.
<https://make.powerautomate.com>

### C.1 Flow anlegen

1. **Erstellen → Sofortiger Cloud-Flow**
2. Name: `API Geraet laden`
3. Trigger: **«Wenn eine HTTP-Anforderung empfangen wird»**
   (englisch: *When an HTTP request is received*) → **Erstellen**

### C.2 Trigger einstellen

Im Trigger auf **«…» → Einstellungen** bzw. direkt im Trigger:

- **Wer kann auslösen / Who can trigger the flow:** `Jeder` (Anyone).
  Das ist der anonyme Zugriff. Der Schutz liegt darin, dass der Flow nur
  sechs harmlose Felder herausgibt.
- **Methode / Method:** `GET`
- **Anforderungstext-JSON-Schema:** leer lassen (bei GET gibt es keinen Body)

Die Geräte-ID kommt als Abfrageparameter. In den Ausdrücken erreicht man sie
mit:

```
triggerOutputs()['queries']['id']
```

### C.3 Aktion «Elemente abrufen»

**Neuer Schritt → SharePoint → Elemente abrufen** (*Get items*)

Die Aktion **umbenennen** in `Elemente abrufen` (falls sie anders heisst) —
die Ausdrücke weiter unten sprechen sie über diesen Namen an. Power Automate
ersetzt Leerzeichen intern durch Unterstriche, deshalb steht in den
Ausdrücken `outputs('Elemente_abrufen')`.

| Feld | Wert |
|---|---|
| Websiteadresse | `https://campussursee.sharepoint.com/sites/mgmts-ict-s` |
| Listenname | `Geraete` |
| Filterabfrage (erweiterte Optionen) | siehe unten |
| Anzahl der Elemente abrufen | `1` |

**Filterabfrage:**

```
ID eq @{int(coalesce(triggerOutputs()['queries']['id'], '0'))}
```

`ID` ist die eingebaute Spalte und immer indiziert — hier ist ein
serverseitiger Filter also unbedenklich (anders als bei den selbst
angelegten Spalten, siehe technische Dokumentation).
`coalesce(…, '0')` fängt den Fall ab, dass gar keine `id` mitkommt.

> **Wichtig:** `int('abc')` bricht ab. Ruft jemand die Adresse mit
> `&id=abc` auf, scheitert diese Aktion. Damit daraus kein HTTP 502
> («Bad Gateway») wird, bekommt der Flow in Schritt C.6 einen Fehlerzweig,
> der genau in diesem Fall sauber ein 404 zurückgibt. Diesen Schritt bitte
> nicht überspringen — sonst zeigt `geraet.html` bei einem vertippten
> QR-Code eine unverständliche Meldung.

### C.4 Antwort verfassen — Aktion «Verfassen»

Jetzt kommt der sicherheitsrelevante Teil: hier wird festgelegt, welche
sechs Felder nach draussen gehen.

**Neuer Schritt → Datenvorgang → Verfassen** (*Compose*). Die Aktion
**`Antwort`** nennen.

In das einzige Feld der Aktion den **Ausdruck** (nicht dynamischen Inhalt)
einsetzen:

```
addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(json('{}'),
  'name',         coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Title'], '')),
  'kategorie',    coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Kategorie']?['Value'], '')),
  'status',       coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Status']?['Value'], '')),
  'hersteller',   coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Hersteller'], '')),
  'modell',       coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Modell'], '')),
  'beschreibung', coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['BeschreibungOeffentlich'], ''))
```

*(Der Ausdruckseditor nimmt keine Zeilenumbrüche an — den Ausdruck in einem
Texteditor zusammensetzen und als eine einzige Zeile einfügen.)*

**Warum so umständlich und nicht einfach ein JSON-Text?**

Der naheliegende Weg wäre, im Antworttext direkt JSON zu schreiben und die
Werte mit `@{…}` hineinzusetzen:

```json
{ "beschreibung": "@{…BeschreibungOeffentlich…}" }     ← FALSCH
```

Das geht so lange gut, bis in einem Feld ein Anführungszeichen oder ein
Zeilenumbruch steht — und genau das kommt in `BeschreibungOeffentlich`
regelmässig vor, es ist ja ein mehrzeiliges Textfeld. Der Wert wird dann
unverändert in den JSON-Text geklebt, und heraus kommt kaputtes JSON:

```json
{ "beschreibung": "Leihgerät für Kurse.
Ladegerät fehlt." }                                    ← ungültig
```

`geraet.html` zeigt daraufhin «Unerwartete Antwort» — und zwar ausgerechnet
bei den Geräten, deren Beschreibung jemand sorgfältig gepflegt hat.

`addProperty()` baut dagegen ein echtes Objekt auf. Power Automate
serialisiert es am Schluss selbst und maskiert dabei Anführungszeichen,
Zeilenumbrüche und Sonderzeichen korrekt.

`coalesce(…, '')` sorgt dafür, dass leere Felder als `""` erscheinen statt
als `null` — `geraet.html` blendet leere Werte dann sauber aus.

Bei Auswahlspalten liefert SharePoint ein Objekt; deshalb `?['Value']` bei
`Kategorie` und `Status`.

> **Die Regel dahinter:** niemals das ganze Element durchreichen
> (`first(...)` allein oder `body('Elemente_abrufen')`). Damit gingen
> Seriennummer, IP, MAC, Owner, Preis und die internen Notizen an jeden, der
> einen QR-Code scannt. Die sechs Felder einzeln aufzuzählen ist mehr
> Tipparbeit — und genau das ist die Absicherung.

### C.5 Bedingung: gefunden oder nicht

**Neuer Schritt → Bedingung** (*Condition*)

```
length(outputs('Elemente_abrufen')?['body/value'])   ist grösser als   0
```

#### Zweig «Wenn ja» — Antwort mit den öffentlichen Feldern

**Aktion → Anforderung → Antwort** (*Response*), benannt `Antwort 200`.

- **Statuscode:** `200`
- **Header:**

  | Schlüssel | Wert |
  |---|---|
  | `Content-Type` | `application/json` |
  | `Access-Control-Allow-Origin` | `*` |

- **Text (Body):** in das Feld **nur** diesen einen Ausdruck einsetzen,
  sonst nichts — keine geschweiften Klammern drumherum, kein zusätzlicher
  Text:

```
outputs('Antwort')
```

  Enthält das Body-Feld ausschliesslich einen einzigen Ausdruck, gibt Power
  Automate den Wert in seinem eigenen Typ weiter — also als JSON-Objekt.
  Steht noch irgendetwas daneben, wird daraus wieder ein Text, und das
  Maskierungsproblem aus C.4 wäre zurück.

#### Zweig «Wenn nein» — 404

**Aktion → Anforderung → Antwort**, benannt `Antwort 404`.

- **Statuscode:** `404`
- **Header:** `Content-Type: application/json`,
  `Access-Control-Allow-Origin: *`
- **Text:**

```json
{ "ok": false, "fehler": "Gerät nicht gefunden" }
```

Hier ist fester JSON-Text unbedenklich: es kommt kein einziger fremder Wert
darin vor.

`geraet.html` wertet sowohl den Statuscode 404 als auch `ok: false` aus.

### C.6 Fehlerzweig — ungültige oder fehlende `id`

Ohne diesen Schritt antwortet der Flow bei `&id=abc` mit HTTP 502, weil
`int('abc')` in C.3 abbricht. Der Fehlerzweig fängt das ab — und gleich auch
jeden anderen unerwarteten Fehler (SharePoint nicht erreichbar, Drosselung).

1. **Neuer Schritt → Anforderung → Antwort**, benannt `Antwort 404 Fehler`.
   Sie kommt **nach** der Bedingung, auf der äussersten Ebene.
2. Inhalt genau gleich wie `Antwort 404` in C.5 (Statuscode `404`, dieselben
   beiden Header, derselbe feste JSON-Text).
3. Jetzt das Entscheidende: bei dieser Aktion auf **«…» → Ausführen nach
   konfigurieren** (*Configure run after*). Als Vorgängeraktion die
   **Bedingung** wählen und dort die Haken setzen bei:
   - **ist fehlgeschlagen** (*has failed*)
   - **wurde übersprungen** (*is skipped*)
   - **Zeitüberschreitung** (*has timed out*)

   Den Haken bei **ist erfolgreich** (*is successful*) **entfernen** —
   sonst würde bei einem normalen Treffer zweimal geantwortet.

Damit gilt: läuft alles glatt, antwortet C.5. Bricht irgendwo etwas ab,
antwortet C.6 mit einem sauberen 404. In beiden Fällen bekommt
`geraet.html` eine Antwort, die es versteht.


### C.7 Speichern und URL kopieren

Nach dem Speichern erscheint im Trigger die **HTTP-POST-URL**. Sie sieht so
aus (der Name stimmt, es ist trotzdem die URL für den GET-Aufruf):

```
https://default2553fb745dcc40728bb5399d18f72a.f9.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/25/workflows/…/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=…
```

Diese URL vollständig — inklusive `?api-version=…&sig=…` — in
`frontend/konfig.js` unter `FLOW_GERAET_URL` eintragen. `geraet.html` hängt `&id=…` an, deshalb
muss die URL bereits eine Abfragezeichenfolge haben (hat sie immer).

### C.8 Prüfen

Im Browser aufrufen (mit einer echten Element-ID aus der Liste `Geraete`):

```
<FLOW_GERAET_URL>&id=1
```

Erwartet: ein JSON mit genau sechs Schlüsseln. Steht dort mehr, stimmt der
Ausdruck in C.4 nicht.

Diese fünf Fälle müssen alle stimmen, bevor es weitergeht:

| Aufruf | Erwartet |
|---|---|
| `&id=1` (vorhandenes Gerät) | `200`, JSON mit genau den sechs Schlüsseln `name`, `kategorie`, `status`, `hersteller`, `modell`, `beschreibung` |
| `&id=999999` (unbekannt) | `404` mit `{"ok": false, …}` |
| `&id=abc` (keine Zahl) | `404` — **nicht** `502`. Kommt hier ein 502, fehlt der Fehlerzweig aus C.6. |
| ganz ohne `&id=` | `404` |
| Gerät mit «schwieriger» Beschreibung | `200` mit gültigem JSON — siehe unten |

**Der wichtigste Test: Sonderzeichen in der Beschreibung.**

Bei einem Testgerät in `BeschreibungOeffentlich` bewusst etwas eintragen,
das den naiven Weg zerlegen würde — mit einem echten Zeilenumbruch und
einem Anführungszeichen:

```
Leihgerät für Kurse.
Achtung: Ladegerät "65 W" fehlt.
```

Dann den Flow mit der ID dieses Geräts aufrufen. Erwartet wird gültiges
JSON, in dem der Zeilenumbruch als `\n` und das Anführungszeichen als `\"`
maskiert sind:

```json
{"name":"…","kategorie":"…","status":"…","hersteller":"…","modell":"…","beschreibung":"Leihgerät für Kurse.\nAchtung: Ladegerät \"65 W\" fehlt."}
```

Zeigt der Browser stattdessen einen Fehler beim Anzeigen des JSON, wurde in
C.4 doch ein JSON-Text statt der `addProperty`-Kette verwendet.

Zum Schluss dasselbe Gerät über `geraet.html` aufrufen: der Zeilenumbruch
muss in der Beschreibung sichtbar erhalten bleiben (die Seite stellt sie mit
`white-space: pre-wrap` dar), und das Anführungszeichen muss als
Anführungszeichen erscheinen.

### C.9 Der Host in der CSP

Der Host der Flow-URL steht in `frontend/_headers` unter `connect-src` als
`https://*.environment.api.powerplatform.com`. Liegt der Flow in einer
anderen Umgebung mit einem anderen Host, muss dieser Eintrag angepasst
werden — sonst blockiert der Browser den Aufruf stillschweigend.

---

## Schritt D — Netlify und Domain

Kein Build-Prozess. Ausgeliefert wird **ausschliesslich der Ordner
`frontend`** — er enthält genau die Dateien, die im Web stehen sollen. Alles
andere im Projekt (`anleitung/`, `code/`, `README.md`) bleibt bewusst
draussen: die Dokumentation gehört nicht ins öffentliche Web.

Es gibt zwei Wege. Wer es wie bei der Menüwahl halten will, nimmt D.1a.

### D.1a Ablage per Drag & Drop (wie bei der Menüwahl)

1. <https://app.netlify.com> → **Add new site → Deploy manually**
2. Den **Ordner `frontend`** in das Feld ziehen. Netlify nimmt ihn dann als
   Wurzel, und `index.html` liegt richtig auf oberster Ebene.

   > Nicht den Projektordner ziehen und nicht dessen Inhalt einzeln —
   > sonst landet die Anwendung unter `/frontend/index.html` statt unter `/`,
   > und `anleitung/` wäre öffentlich abrufbar.

3. Wichtig: `_headers` und `_redirects` müssen mitkommen. Beide beginnen mit
   einem Unterstrich und werden von manchen Werkzeugen als versteckt
   behandelt.

### D.1b Ablage aus Git

Wer das Projekt in Git hat, kann die Site stattdessen anbinden:
**Add new site → Import an existing project**.

Die Einstellungen kommen aus `netlify.toml` im Projektstamm und müssen nicht
von Hand gesetzt werden:

```toml
[build]
  publish = "frontend"
  command = ""
```

Falls Netlify trotzdem nachfragt: **Build command** leer lassen,
**Publish directory** auf `frontend` setzen.

### D.2 Domain

1. In Netlify: **Site configuration → Domain management → Add a domain** →
   `ictlager.campus-sursee.ch`
2. Im DNS von `campus-sursee.ch` einen CNAME setzen:

   | Name | Typ | Wert |
   |---|---|---|
   | `ictlager` | CNAME | `<site-name>.netlify.app` |

3. Zurück in Netlify warten, bis das Zertifikat (Let's Encrypt) ausgestellt
   ist — dauert meist wenige Minuten.
4. **Force HTTPS** einschalten.

### D.3 Prüfen

- <https://ictlager.campus-sursee.ch/> zeigt die Startseite.
- <https://ictlager.campus-sursee.ch/g/1> leitet auf
  `/geraet.html?id=1` um — damit stimmt `_redirects`.
- In den Entwicklerwerkzeugen (F12) unter **Netzwerk** bei einer beliebigen
  Seite prüfen, dass die Kopfzeile `Content-Security-Policy` gesetzt ist —
  damit stimmt `_headers`.

### D.4 Änderungen später

Immer den **ganzen** Ordner `frontend` neu hochladen (Netlify ersetzt die
Site komplett), nicht einzelne Dateien. Bei einer Git-Anbindung genügt ein
Push auf den verbundenen Zweig.

---

## Schritt E — `frontend/konfig.js` fertig ausfüllen

Am Schluss müssen in `frontend/konfig.js` alle Platzhalter ersetzt sein:

```js
const KONFIG = {
  mandantId: "2553fb74-5dcc-4072-8bb5-399d18f72af9",   // steht bereits
  clientId:  "…",                                       // aus Schritt A.1
  sitePfad:  "campussursee.sharepoint.com:/sites/mgmts-ict-s",  // steht bereits
  listeGeraete: "…",                                    // aus Schritt B
  listeVerlauf: "…",                                    // aus Schritt B
  FLOW_GERAET_URL: "https://…powerplatform.com/…&sig=…", // aus Schritt C.5
  BASIS_URL: "https://ictlager.campus-sursee.ch",       // steht bereits
  servicedeskMail: "servicedesk@campus-sursee.ch",
  servicedeskTelefon: "+41 41 926 23 69"
};
```

Nach jeder Änderung an `frontend/konfig.js`: den Ordner `frontend` neu auf
Netlify ablegen (Schritt D.1a) bzw. den Stand pushen (D.1b).

---

## Abnahme

Zum Schluss die ganze Kette einmal durchspielen:

1. `admin.html` öffnen → Anmeldung läuft ohne Eingabe durch (SSO).
2. **Neues Gerät** anlegen, speichern.
3. Gerät wieder öffnen → im Verlauf steht «Erstellt» mit Name und Zeit.
4. Ein Feld ändern, speichern, erneut öffnen → «Geändert» mit dem alten und
   dem neuen Wert.
5. **Etikette drucken** → Druckvorschau erscheint, QR-Code sichtbar.
6. QR-Code mit dem Handy scannen (nicht im WLAN der Verwaltung, ruhig über
   Mobilfunk — die Seite muss ohne Anmeldung gehen) → die öffentliche
   Geräteseite erscheint mit Name, Kategorie, Status, Hersteller, Modell,
   Beschreibung und den Kontaktangaben. **Sonst nichts.**
7. Ein Konto, das der Unternehmensanwendung *nicht* zugewiesen ist,
   probeweise auf `admin.html` schicken → Entra weist es ab.

---

## Was der Betrieb später wissen muss

- **Neue Person berechtigen:** Entra → Unternehmensanwendungen →
  `ICT Lager Verwaltung` → Benutzer und Gruppen (oder in die Gruppe
  `SG-ICT-Lager` aufnehmen). Zusätzlich braucht die Person Zugriff auf die
  SharePoint-Site `mgmts-ict-s` — das Token ist delegiert und kann nicht
  mehr als die Person selbst.
- **Versehentlich gelöschtes Gerät:** SharePoint-Papierkorb der Site
  `mgmts-ict-s`, 93 Tage.
- **Spalte ergänzen:** in `frontend/graph.js` bei `SPALTEN_GERAETE` eintragen, dann
  `setup.html` nochmals ausführen — die Spalte wird ergänzt, bestehende
  Daten bleiben.
