# Bedienung und Betrieb

Alles für den Alltag: wie man mit der Verwaltung arbeitet, wie man häufige
Aufgaben erledigt und was hilft, wenn etwas nicht geht.

[← zurück zur Übersicht](../README.md)

**Inhalt:**
[Bedienung](#bedienung) ·
[Häufige Aufgaben](#häufige-aufgaben) ·
[Veröffentlichen](#änderungen-veröffentlichen) ·
[Lokal testen](#lokal-testen) ·
[Wenn etwas nicht geht](#wenn-etwas-nicht-geht)

---

## Bedienung

Die Verwaltung liegt unter
**<https://ictlager.campus-sursee.ch/admin.html>**. Die Anmeldung läuft mit
dem Campus-Sursee-Konto, meist ohne Eingabe.

| Reiter | Was man dort macht |
|---|---|
| **Dashboard** | Kennzahlen, Verteilung nach Kategorie und die Geräte, deren *End of Life* in den nächsten 6 Monaten erreicht ist oder schon vorbei ist |
| **Geräte** | alle Geräte als Tabelle: suchen, filtern, sortieren, öffnen, neu erfassen |
| **Etiketten** | Geräte auswählen und Etiketten drucken |

### Gerät erfassen oder ändern

1. Reiter **Geräte** → **Neues Gerät** (oder ein bestehendes Gerät anklicken).
2. Felder ausfüllen. Pflicht sind nur **Gerätename**, **Kategorie** und
   **Status**.
3. **Speichern**.

Der Verlauf schreibt sich dabei selbst: «Erstellt», «Geändert» (mit altem
und neuem Wert) oder «Gelöscht». Eigene Einträge wie «Reparatur» oder
«Ausgeliehen» lassen sich unten im Gerät unter **Verlauf** ergänzen.

> [!WARNING]
> **«Öffentliche Beschreibung»** kann jede Person lesen, die den QR-Code
> scannt. Alles Vertrauliche gehört in **«Interne Notizen»**.

### Suchen

Das Suchfeld durchsucht Name, Asset-Nr., Seriennummer, IP, MAC und Owner.
Mehrere Wörter grenzen weiter ein: `notebook muster` findet das Notebook
von Herrn Muster.

### Etiketten drucken

1. Reiter **Etiketten** → Geräte anhaken → **Druckvorschau**.
   (Für ein einzelnes Gerät geht es auch direkt im Gerät mit **Etikette
   drucken**.)
2. Format wählen:

   | Format | Wofür |
   |---|---|
   | **Etikettendrucker** | eine Etikette pro Seite, 62 × 29 mm |
   | **A4-Bogen** | mehrere Etiketten nebeneinander auf A4 |

3. **Drucken**.

Auf der Etikette stehen nur der QR-Code, das Campus-Sursee-Logo und die
Adresse des Servicedesks. Absichtlich kein Gerätename und keine Nummer:
eine Etikette soll nur zeigen, wer kontaktiert werden kann, und sonst
nichts verraten.

---

## Häufige Aufgaben

| Aufgabe | So geht es |
|---|---|
| **Neue Person berechtigen** | 1. In Entra ID der Unternehmensanwendung **«ICT Lager Verwaltung»** zuweisen ([Entra → Unternehmensanwendungen](https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview) → *Benutzer und Gruppen*), oder in die Gruppe `SG-ICT-Lager` aufnehmen, falls vorhanden.<br>2. Zugriff auf die [SharePoint-Site «mgmts-ict-s»](https://campussursee.sharepoint.com/sites/mgmts-ict-s) geben. **Beides** ist nötig. |
| **Gelöschtes Gerät zurückholen** | [Papierkorb der SharePoint-Site](https://campussursee.sharepoint.com/sites/mgmts-ict-s/_layouts/15/RecycleBin.aspx) öffnen und wiederherstellen (93 Tage lang möglich). Der Verlauf bleibt auch ohne Wiederherstellung erhalten. |
| **Daten direkt ansehen oder exportieren** | In SharePoint: [Liste «Geraete»](https://campussursee.sharepoint.com/sites/mgmts-ict-s/Lists/Geraete/AllItems.aspx) · [Liste «Verlauf»](https://campussursee.sharepoint.com/sites/mgmts-ict-s/Lists/Verlauf/AllItems.aspx). Dort gibt es auch *Exportieren → CSV/Excel*. |
| **Neue Kategorie oder neuer Status** | 1. In SharePoint in der Liste «Geraete» bei der Spalte `Kategorie` bzw. `Status` den Wert ergänzen.<br>2. In [`frontend/graph.js`](../frontend/graph.js) die Liste `KATEGORIEN` bzw. `STATUS` ergänzen.<br>3. [Veröffentlichen](#änderungen-veröffentlichen). |
| **Neue Spalte (neues Feld)** | Braucht Anpassungen im Code, siehe [Technische Dokumentation, Wartung](03_Technische_Dokumentation.md#8-wartung). |
| **Kontaktangaben ändern** | E-Mail an **drei** Stellen: `servicedeskMail` in [`frontend/konfig.js`](../frontend/konfig.js) sowie direkt im HTML von [`index.html`](../frontend/index.html) und [`geraet.html`](../frontend/geraet.html). Die Telefonnummer steht nur in den beiden HTML-Dateien. |

> [!CAUTION]
> Der Power-Automate-Flow liest SharePoint mit dem Dienstkonto
> **`powerplatform@campus-sursee.ch`**. Dieses Konto braucht dauerhaft
> Zugriff auf die Site «mgmts-ict-s». **Beim Aufräumen von Berechtigungen
> nicht entfernen**, sonst zeigt jeder QR-Code «Gerät nicht gefunden».

---

## Änderungen veröffentlichen

Online ist immer genau der Ordner **`frontend`**. Es gibt nichts zu
kompilieren oder zu installieren.

| Weg | So geht es |
|---|---|
| **Drag & Drop** | [Netlify](https://app.netlify.com) öffnen → Site wählen → **Deploys** → den **ganzen Ordner `frontend`** ins Feld ziehen. |
| **Aus Git** | Ist die Site mit diesem Repository verbunden, genügt ein Push. Die Einstellungen kommen aus [`netlify.toml`](../netlify.toml). |

> [!WARNING]
> Nur den Ordner **`frontend`** hochladen, nie den ganzen Projektordner.
> Sonst liegt die Anwendung unter der falschen Adresse und die
> Dokumentation wäre öffentlich. Die Dateien `_headers` und `_redirects`
> müssen mit (sie beginnen mit `_` und werden manchmal als versteckt
> behandelt).

---

## Lokal testen

Unter Windows im Projektordner:

```powershell
.\code\serve.ps1
```

Dann <http://localhost:8000/> öffnen, beenden mit `Strg+C`.

| Gut zu wissen | |
|---|---|
| Nicht per Doppelklick öffnen | Über `file://` funktioniert die Anmeldung nicht, es braucht den lokalen Server. |
| QR-Codes lokal | Das Skript leitet `/g/1` wie Netlify auf `geraet.html?id=1` um. |
| Ohne PowerShell | `cd frontend` und `python -m http.server 8000` (dann ohne `/g/`-Umleitung). |
| Sicherheits-Kopfzeilen | werden lokal nicht gesetzt, sie lassen sich nur auf Netlify prüfen. |

---

## Wenn etwas nicht geht

### In der Verwaltung

| Meldung oder Problem | Ursache | Lösung |
|---|---|---|
| Entra zeigt bei der Anmeldung einen Fehler (z.B. `AADSTS50105`) | Person ist der Unternehmensanwendung nicht zugewiesen | [Person berechtigen](#häufige-aufgaben) |
| «Keine Berechtigung … mgmts-ict-s» | Person hat keinen Zugriff auf die SharePoint-Site | Zugriff auf die [Site](https://campussursee.sharepoint.com/sites/mgmts-ict-s) geben |
| «Die Anmeldung ist abgelaufen» | Sitzung ist abgelaufen | Seite neu laden |
| «Zu viele Anfragen» | SharePoint bremst kurzzeitig | einen Moment warten, neu laden |
| «Site, Liste oder Eintrag nicht gefunden» | Liste umbenannt oder gelöscht, oder falscher Eintrag in `konfig.js` | Listen in SharePoint und Werte in [`konfig.js`](../frontend/konfig.js) prüfen |
| Seite bleibt leer | meist eine falsche Prüfsumme nach einem Update von MSAL oder QR-Bibliothek | Prüfsumme neu berechnen, siehe [Technische Dokumentation](03_Technische_Dokumentation.md#24-fremdbibliotheken) |

### Auf der öffentlichen Geräteseite

| Meldung | Ursache | Lösung |
|---|---|---|
| «Gerät nicht gefunden» bei **einem** Gerät | Gerät gelöscht oder Etikette falsch | Gerät in der Verwaltung suchen, ggf. aus dem Papierkorb holen |
| «Gerät nicht gefunden» bei **allen** Geräten | Dienstkonto `powerplatform@campus-sursee.ch` hat keinen Zugriff mehr auf die Site | Zugriff wieder geben |
| «Die Geräteauskunft ist gerade nicht erreichbar» oder «… antwortet nicht richtig» | keine Internetverbindung, Flow ausgeschaltet oder Power Automate gestört | Flow «API Geraet laden» in [Power Automate](https://make.powerautomate.com/environments/Default-2553fb74-5dcc-4072-8bb5-399d18f72af9/flows) prüfen und einschalten |
| «Die Geräteauskunft ist noch nicht eingerichtet» | `FLOW_GERAET_URL` in `konfig.js` fehlt | siehe [Einrichtung, Schritt C](01_Einrichtung.md#schritt-c-power-automate-flow) |

Die Kontaktangaben des Servicedesks sind auf der Geräteseite in jedem Fall
sichtbar, auch wenn die Geräteangaben nicht geladen werden können.
