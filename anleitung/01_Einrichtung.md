# Einrichtung

Die einmalige Einrichtung von Entra ID, SharePoint, Power Automate und
Netlify. Nur nötig beim Neuaufbau oder zum Nachprüfen, im Alltag braucht es
diese Seite nicht.

[← zurück zur Übersicht](../README.md)

---

## Überblick

Die Schritte bauen aufeinander auf und werden der Reihe nach erledigt.

| Schritt | Was | Wer | Stand |
|---|---|---|---|
| [A](#schritt-a-app-registrierung-in-entra-id) | App-Registrierung in Entra ID | Globaler Administrator | ✅ erledigt, Einstellungen [nachprüfen](#nachprüfen) |
| [B](#schritt-b-sharepoint-listen) | SharePoint-Listen anlegen | ICT, Besitzer der Site | ✅ erledigt 31.08.2026 |
| [C](#schritt-c-power-automate-flow) | Power-Automate-Flow bauen | ICT | ✅ erledigt 31.08.2026 |
| [D](#schritt-d-netlify-und-domain) | Netlify und Domain | ICT | ⏳ offen (Stand 31.08.2026) |
| [E](#schritt-e-konfigjs-ausfüllen) | `frontend/konfig.js` ausfüllen | ICT | ✅ erledigt 31.08.2026 |

Zum Schluss die [Abnahme](#abnahme) durchspielen.

### Wichtige Werte auf einen Blick

| Was | Wert |
|---|---|
| Mandant (Tenant) | `2553fb74-5dcc-4072-8bb5-399d18f72af9` |
| App-Registrierung «ICT Lager Verwaltung» (Client-ID) | [`58384569-7580-4617-ad5c-2bf5a81d397d`](https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/58384569-7580-4617-ad5c-2bf5a81d397d) |
| SharePoint-Site | [mgmts-ict-s](https://campussursee.sharepoint.com/sites/mgmts-ict-s) |
| Liste [«Geraete»](https://campussursee.sharepoint.com/sites/mgmts-ict-s/Lists/Geraete/AllItems.aspx) | `9fb53d45-26c9-4d72-9297-696231048d69` |
| Liste [«Verlauf»](https://campussursee.sharepoint.com/sites/mgmts-ict-s/Lists/Verlauf/AllItems.aspx) | `a63f4b50-3a2d-43b6-8878-a271667fa351` |
| Power-Automate-Umgebung | [Default-2553fb74-5dcc-4072-8bb5-399d18f72af9](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows) («CAMPUS SURSEE (default)») |
| Flow «API Geraet laden» | [`5552f8c7-e2de-49b6-a256-4c9649b1bc2c`](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows/5552f8c7-e2de-49b6-a256-4c9649b1bc2c/details), Besitzer und SharePoint-Verbindung: `powerplatform@campus-sursee.ch` |
| Öffentliche Adresse | <https://ictlager.campus-sursee.ch> |

Alle Werte, die die Website braucht, stehen in
[`frontend/konfig.js`](../frontend/konfig.js). Die Datei enthält keine
Geheimnisse: Mandanten- und Client-ID sind bei solchen Anwendungen
öffentlich, geschützt wird über die Anmeldung.

---

## Schritt A: App-Registrierung in Entra ID

Die Verwaltung (`admin.html`, `etikette.html`, `setup.html`) meldet sich
über eine eigene App-Registrierung an. Die Registrierung der Menüwahl darf
**nicht** wiederverwendet werden, dort sind Berechtigungen und
Personenkreis andere.

In <https://entra.microsoft.com> unter **Identität → Anwendungen →
App-Registrierungen → Neue Registrierung**:

| Einstellung | Wert |
|---|---|
| Name | `ICT Lager Verwaltung` |
| Unterstützte Kontotypen | Nur Konten in diesem Organisationsverzeichnis (Einzelmandant) |
| Plattform | **Einzelseitenanwendung (SPA)**, nicht «Web» |
| Umleitungs-URIs | alle sechs Adressen aus dem Kasten unten |
| Implizite Genehmigung | beide Haken **leer** lassen |
| Abmelde-URL | `https://ictlager.campus-sursee.ch/` |
| API-Berechtigungen | Microsoft Graph, **delegiert**: `Sites.ReadWrite.All` und `User.Read`, danach **Administratorzustimmung erteilen** |

```text
https://ictlager.campus-sursee.ch/admin.html
https://ictlager.campus-sursee.ch/etikette.html
https://ictlager.campus-sursee.ch/setup.html
http://localhost:8000/admin.html
http://localhost:8000/etikette.html
http://localhost:8000/setup.html
```

Die drei `localhost`-Adressen dienen nur dem [lokalen Test](02_Betrieb.md#lokal-testen).

Danach unter **Unternehmensanwendungen** (nicht App-Registrierungen!) →
`ICT Lager Verwaltung`:

1. **Eigenschaften → Zuweisung erforderlich? → Ja** → Speichern.
2. **Benutzer und Gruppen** → die Mitarbeitenden der Informatik zuweisen,
   am besten als Gruppe (z.B. `SG-ICT-Lager`).

> [!IMPORTANT]
> **«Zuweisung erforderlich = Ja» ist der eigentliche Zugriffsschutz.**
> Ohne diese Einstellung kann sich jede Person von Campus Sursee an der
> Verwaltung anmelden.

<details>
<summary><b>Warum so und nicht anders?</b></summary>

| Entscheid | Grund |
|---|---|
| Plattform SPA statt «Web» | Nur so geht die Anmeldung ohne Client Secret. Ein Secret bliebe in einer reinen HTML-Seite nicht geheim. |
| Delegierte Berechtigungen | Das Token kann nur, was die angemeldete Person in SharePoint ohnehin darf. Anwendungsberechtigungen wären ein Generalschlüssel auf alle Sites. |
| Administratorzustimmung | Sonst sieht jede Person beim ersten Aufruf einen Zustimmungsdialog, den sie je nach Einstellung nicht bestätigen darf. |
| Jede Seite als eigene Umleitungs-URI | Die Anmeldebibliothek meldet die Adresse ohne `?…`, deshalb braucht es jede Seite einzeln. |

</details>

### Nachprüfen

Die Registrierung besteht, einige Einstellungen lassen sich aber nur im
Portal prüfen:

- [ ] Plattform ist *Einzelseitenanwendung (SPA)* mit allen sechs Umleitungs-URIs
- [ ] Beide delegierten Berechtigungen sind eingetragen, Administratorzustimmung ist erteilt
- [ ] Unternehmensanwendung: *Zuweisung erforderlich = Ja*, die richtigen Personen sind zugewiesen

---

## Schritt B: SharePoint-Listen

Die Anwendung speichert alles in zwei Listen auf der Site
[mgmts-ict-s](https://campussursee.sharepoint.com/sites/mgmts-ict-s):

| Liste | Inhalt |
|---|---|
| [`Geraete`](https://campussursee.sharepoint.com/sites/mgmts-ict-s/Lists/Geraete/AllItems.aspx) | ein Eintrag pro Gerät |
| [`Verlauf`](https://campussursee.sharepoint.com/sites/mgmts-ict-s/Lists/Verlauf/AllItems.aspx) | die Chronik aller Änderungen |

Die Listen legt die Seite `setup.html` selbst an:

1. `https://ictlager.campus-sursee.ch/setup.html` öffnen (oder
   [lokal](02_Betrieb.md#lokal-testen)) und anmelden. Das Konto muss auf
   der Site Listen anlegen dürfen.
2. **«Listen anlegen»** klicken.
3. Die angezeigten Listen-IDs in [`frontend/konfig.js`](../frontend/konfig.js)
   unter `listeGeraete` und `listeVerlauf` eintragen.

Der Vorgang lässt sich gefahrlos wiederholen: Bestehendes bleibt, nur
Fehlendes wird ergänzt. So werden auch später neu definierte Spalten
ausgerollt.

Alle Spalten und ihre Bedeutung stehen in der
[Technischen Dokumentation, Datenmodell](03_Technische_Dokumentation.md#3-datenmodell).

---

## Schritt C: Power-Automate-Flow

Der Flow **«API Geraet laden»** liefert der öffentlichen Geräteseite die
Daten. Er ist die **einzige** Stelle, an der jemand ohne Anmeldung etwas aus
SharePoint bekommt, und gibt deshalb nur sechs Felder heraus: Name,
Kategorie, Status, Hersteller, Modell und öffentliche Beschreibung.

Eine vollständige Sicherungskopie der Definition liegt in
[`code/flow_api-geraet-laden.json`](../code/flow_api-geraet-laden.json)
(ohne Trigger-URL und Signatur).

### Aufbau

In [Power Automate](https://make.powerautomate.com) → **Erstellen →
Sofortiger Cloud-Flow**, Name `API Geraet laden`:

| # | Aktion | Einstellung |
|---|---|---|
| 1 | **Wenn eine HTTP-Anforderung empfangen wird** | Wer kann auslösen: **Jeder** · Methode: **GET** · kein Schema |
| 2 | **SharePoint → Elemente abrufen**, Name `Elemente abrufen` | Site: `https://campussursee.sharepoint.com/sites/mgmts-ict-s` · Liste: `Geraete` · Anzahl: `1` · Filter: siehe unten |
| 3 | **Datenvorgang → Verfassen**, Name `Antwort` | Ausdruck mit genau den sechs Feldern, siehe unten |
| 4 | **Bedingung** | `length(outputs('Elemente_abrufen')?['body/value'])` ist grösser als `0` |
| 4a | ↳ Ja: **Antwort**, Name `Antwort 200` | Status `200` · Text: nur `outputs('Antwort')`, sonst nichts |
| 4b | ↳ Nein: **Antwort**, Name `Antwort 404` | Status `404` · Text: `{ "ok": false, "fehler": "Gerät nicht gefunden" }` |
| 5 | **Antwort**, Name `Antwort 404 Fehler` (nach der Bedingung) | wie 4b · **Ausführen nach:** Bedingung *ist fehlgeschlagen*, *wurde übersprungen*, *Zeitüberschreitung*; *ist erfolgreich* **abwählen** |

Alle drei Antworten bekommen dieselben zwei Header:
`Content-Type: application/json` und `Access-Control-Allow-Origin: *`.

**Filter in Schritt 2:**

```text
ID eq @{int(coalesce(triggerOutputs()['queries']['id'], '0'))}
```

<details>
<summary><b>Ausdruck für Schritt 3 «Antwort»</b> (als eine einzige Zeile einfügen)</summary>

```text
addProperty(addProperty(addProperty(addProperty(addProperty(addProperty(json('{}'),
  'name',         coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Title'], '')),
  'kategorie',    coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Kategorie']?['Value'], '')),
  'status',       coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Status']?['Value'], '')),
  'hersteller',   coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Hersteller'], '')),
  'modell',       coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['Modell'], '')),
  'beschreibung', coalesce(first(outputs('Elemente_abrufen')?['body/value'])?['BeschreibungOeffentlich'], ''))
```

Der Ausdruckseditor nimmt keine Zeilenumbrüche an: den Ausdruck im
Texteditor zu einer Zeile zusammensetzen.

</details>

> [!IMPORTANT]
> **Drei Regeln, die den Flow sicher machen:**
>
> 1. **Nie das ganze Element zurückgeben**, sondern nur die sechs Felder
>    einzeln. Sonst gehen Seriennummer, IP, Owner, Preis und Notizen an
>    jede Person, die einen QR-Code scannt.
> 2. **Die Antwort mit `addProperty()` bauen, nicht als JSON-Text** mit
>    `@{…}`. Sonst zerlegt der erste Zeilenumbruch oder das erste
>    Anführungszeichen in der Beschreibung die Antwort.
> 3. **Den Fehlerzweig (Schritt 5) nicht weglassen.** Sonst antwortet der
>    Flow bei einer ungültigen Nummer wie `&id=abc` mit HTTP 502 statt mit
>    «Gerät nicht gefunden».

### URL eintragen

Nach dem Speichern zeigt der Trigger die **HTTP-URL** (inklusive
`?api-version=…&sig=…`). Sie kommt vollständig in
[`frontend/konfig.js`](../frontend/konfig.js) unter `FLOW_GERAET_URL`.

Liegt der Flow einmal in einer anderen Umgebung mit anderem Host, muss der
Host auch in [`frontend/_headers`](../frontend/_headers) unter
`connect-src` stehen. Der heutige Eintrag
`https://*.environment.api.powerplatform.com` deckt die
Standardumgebung ab.

> [!CAUTION]
> Der Flow liest SharePoint mit dem Dienstkonto
> `powerplatform@campus-sursee.ch`. Dieses Konto braucht dauerhaft Zugriff
> auf die Site «mgmts-ict-s». Fehlt er, zeigt jeder QR-Code «Gerät nicht
> gefunden».

### Prüfen

Die Flow-URL im Browser aufrufen und `&id=…` anhängen:

| Aufruf | Erwartet |
|---|---|
| `&id=1` (vorhandenes Gerät) | `200`, JSON mit genau `name`, `kategorie`, `status`, `hersteller`, `modell`, `beschreibung` |
| `&id=999999` (unbekannt) | `404` mit `{"ok": false, …}` |
| `&id=abc` (keine Zahl) | `404`, **nicht** `502` (sonst fehlt Schritt 5) |
| ohne `&id=` | `404` |
| Gerät mit Zeilenumbruch und `"` in der Beschreibung | `200` mit gültigem JSON (`\n` und `\"`) |

Alle fünf Fälle wurden am 31.08.2026 erfolgreich geprüft.

---

## Schritt D: Netlify und Domain

Online geht nur der Ordner **`frontend`**. Es gibt keinen Build-Schritt.

1. **Site anlegen** in [Netlify](https://app.netlify.com):
   - *Add new site → Deploy manually* und den **Ordner `frontend`**
     hineinziehen, **oder**
   - *Add new site → Import an existing project* und dieses Repository
     verbinden. Die Einstellungen kommen aus
     [`netlify.toml`](../netlify.toml) (Publish directory `frontend`, kein
     Build command).
2. **Domain:** *Site configuration → Domain management → Add a domain* →
   `ictlager.campus-sursee.ch`, dann im DNS von `campus-sursee.ch`:

   | Name | Typ | Wert |
   |---|---|---|
   | `ictlager` | CNAME | `<site-name>.netlify.app` |

3. Warten, bis das Zertifikat ausgestellt ist (meist wenige Minuten), dann
   **Force HTTPS** einschalten.

**Prüfen:**

- [ ] <https://ictlager.campus-sursee.ch/> zeigt die Startseite
- [ ] <https://ictlager.campus-sursee.ch/g/1> leitet auf `/geraet.html?id=1` um (`_redirects` wirkt)
- [ ] In den Entwicklerwerkzeugen (F12 → Netzwerk) ist die Kopfzeile `Content-Security-Policy` gesetzt (`_headers` wirkt)

Wie spätere Änderungen online gehen, steht unter
[Bedienung und Betrieb, Veröffentlichen](02_Betrieb.md#änderungen-veröffentlichen).

---

## Schritt E: `konfig.js` ausfüllen

In [`frontend/konfig.js`](../frontend/konfig.js) müssen alle Werte
eingetragen sein. Stand heute ist das der Fall:

| Eintrag | Herkunft |
|---|---|
| `mandantId` | fest, Mandant Campus Sursee |
| `clientId` | Schritt A |
| `sitePfad` | fest, `campussursee.sharepoint.com:/sites/mgmts-ict-s` |
| `listeGeraete`, `listeVerlauf` | Schritt B |
| `FLOW_GERAET_URL` | Schritt C |
| `BASIS_URL` | fest, `https://ictlager.campus-sursee.ch` (Adresse in den QR-Codes) |
| `servicedeskMail` | fest, `servicedesk@campus-sursee.ch` |

Nach jeder Änderung den Ordner `frontend` neu veröffentlichen.

---

## Abnahme

Zum Schluss die ganze Kette einmal durchspielen:

- [ ] `admin.html` öffnen: die Anmeldung läuft ohne Eingabe durch
- [ ] **Neues Gerät** anlegen und speichern
- [ ] Gerät wieder öffnen: im Verlauf steht «Erstellt» mit Name und Zeit
- [ ] Ein Feld ändern und speichern: im Verlauf steht «Geändert» mit altem und neuem Wert
- [ ] **Etikette drucken**: die Druckvorschau zeigt den QR-Code
- [ ] QR-Code mit dem Handy über Mobilfunk scannen: die Geräteseite zeigt Name, Kategorie, Status, Hersteller, Modell, Beschreibung und Kontakt, **sonst nichts**
- [ ] Mit einem **nicht** zugewiesenen Konto `admin.html` öffnen: Entra weist es ab
