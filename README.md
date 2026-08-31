# ICT Lager — Campus Sursee

Inventarverwaltung für die Informatikgeräte von Campus Sursee.

<https://ictlager.campus-sursee.ch>

Rein statische Website: kein Build-Prozess, kein Framework, keine
Abhängigkeiten zum Installieren. Der Ordner `frontend/` ist genau der
Ordner, der auf Netlify liegt.

---

## Was die Anwendung macht

**Für die Informatik** (Anmeldung mit dem Campus-Sursee-Konto):
Geräte erfassen, suchen, filtern, ändern und löschen; ein Dashboard mit
Kennzahlen und den Geräten, deren *End of Life* näher rückt; für jedes Gerät
eine Chronik, die sich bei jeder Änderung selbst fortschreibt; Etiketten mit
QR-Code drucken.

**Für alle anderen** (ohne Anmeldung): Wer den QR-Code auf einer Etikette
scannt, sieht eine kurze Geräteseite — Name, Kategorie, Status, Hersteller,
Modell, Beschreibung — und die Kontaktangaben des ICT Servicedesks.
Interne Angaben wie Seriennummer, IP-Adresse, Owner, Preis oder Notizen
erscheinen dort nie: sie verlassen SharePoint gar nicht erst.

---

## Aufbau des Projekts

```
frontend/     wird von Netlify ausgeliefert — und nur das
code/         Werkzeuge für die Entwicklung, nicht im Web
anleitung/    Einrichtung und technische Dokumentation
netlify.toml  publish = "frontend", kein Build-Befehl
README.md     diese Datei
```

Die Trennung ist Absicht: was in `frontend/` liegt, ist öffentlich
erreichbar. Alles andere gehört nicht ins Web.

### `frontend/`

| Datei | Anmeldung | Zweck |
|---|---|---|
| `index.html` | nein | Startseite |
| `admin.html` | ja | Verwaltung: Dashboard, Geräte, Etiketten |
| `geraet.html` | **nein** | öffentliche Geräteseite hinter dem QR-Code |
| `etikette.html` | ja | Druckansicht der Etiketten |
| `setup.html` | ja | einmalige Einrichtung der SharePoint-Listen |
| `konfig.js` | | alle Einstellungen an einem Ort |
| `auth.js` | | Anmeldung an Entra ID (Aufsatz auf MSAL) |
| `graph.js` | | Zugriff auf die SharePoint-Listen über Microsoft Graph |
| `_headers` | | Kopfzeilen für Netlify, vor allem die CSP |
| `_redirects` | | `/g/:id` → `/geraet.html?id=:id` |

Daten liegen in zwei SharePoint-Listen (`Geraete`, `Verlauf`) auf der Site
<https://campussursee.sharepoint.com/sites/mgmts-ict-s>.

---

## Lokal testen

Aus dem Projektstamm:

```powershell
.\code\serve.ps1
```

Dann <http://localhost:8000/> öffnen. Beenden mit `Strg+C`.

Das Skript liefert den Ordner `frontend/` aus — also genau das, was auch
Netlify ausliefert — und bildet zusätzlich die Umleitung `/g/:id` nach, so
dass sich die QR-Codes auch lokal ausprobieren lassen.

Alternativ, wenn Python vorhanden ist (dann allerdings ohne die
`/g/:id`-Umleitung):

```bash
cd frontend
python -m http.server 8000
```

**Die Seiten dürfen nicht per Doppelklick über `file://` geöffnet werden.**
MSAL braucht einen echten Ursprung, und die Umleitungsadresse in der
App-Registrierung lautet auf `http://localhost:8000/…` — genau diese Adresse
muss der Browser sehen.

Damit die Anmeldung lokal funktioniert, müssen in der App-Registrierung die
`localhost`-Umleitungsadressen eingetragen sein (siehe
[anleitung/01_Einrichtung.md](anleitung/01_Einrichtung.md), Schritt A.2).

Die Kopfzeilen aus `_headers` setzt der lokale Server bewusst nicht — die
Content-Security-Policy lässt sich nur auf Netlify richtig prüfen.

---

## Veröffentlichen

**Per Drag & Drop** (wie bei der Menüwahl): <https://app.netlify.com>
öffnen, die betreffende Site wählen, **Deploys → Drag and drop**, und den
Ordner **`frontend`** hineinziehen.

> Nicht den Projektstamm ziehen — sonst landet die Anwendung unter
> `/frontend/index.html` statt unter `/`, und `anleitung/` wäre öffentlich
> abrufbar.

`_headers` und `_redirects` müssen mitkommen. Beide beginnen mit einem
Unterstrich und werden von manchen Werkzeugen als versteckt behandelt.

**Aus Git:** Site mit dem Repository verbinden. Die Einstellungen kommen aus
`netlify.toml` (`publish = "frontend"`, kein Build-Befehl) und müssen nicht
von Hand gesetzt werden.

Beim manuellen Weg immer den ganzen Ordner `frontend` ablegen, nicht
einzelne Dateien — Netlify ersetzt die Site vollständig.

---

## Einrichtung

Vor dem ersten Einsatz sind fünf Schritte nötig: App-Registrierung in Entra
ID, SharePoint-Listen anlegen, Power-Automate-Flow bauen, Netlify und
Domain, `frontend/konfig.js` ausfüllen.

Alles Schritt für Schritt in
**[anleitung/01_Einrichtung.md](anleitung/01_Einrichtung.md)**.

Die Platzhalter in `frontend/konfig.js` (`HIER_CLIENT_ID_EINTRAGEN`,
`HIER_FLOW_URL_EINTRAGEN`) zeigen, was noch fehlt.

---

## Weiterentwickeln

**[anleitung/02_Technische_Dokumentation.md](anleitung/02_Technische_Dokumentation.md)**
erklärt Architektur, Datenmodell, Sicherheitsmodell und Code-Struktur — und
vor allem, warum die Dinge so gebaut sind, wie sie gebaut sind.

Drei Regeln, die beim Ändern nie verletzt werden dürfen:

1. **Fremder Inhalt geht nie über `innerHTML` ins Dokument**, sondern immer
   über `textContent`. Für den Ausnahmefall steht `Hilfe.escape()` bereit.
2. **Die öffentliche Seite bekommt nur, was der Flow herausgibt.** Wer ein
   Feld öffentlich machen will, ändert den Flow — nicht die Seite. Im
   Browser ausgeblendete Felder sind nicht geschützt, sondern nur unsichtbar.
3. **Der Flow baut sein JSON mit `addProperty()`**, nie als
   zusammengeklebten Text. Sonst zerlegt der erste Zeilenumbruch in einer
   Beschreibung die Antwort.

---

## Kontakt

ICT Servicedesk Campus Sursee
<servicedesk@campus-sursee.ch> · +41 41 926 23 69
