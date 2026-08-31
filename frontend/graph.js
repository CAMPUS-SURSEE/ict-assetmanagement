/* graph.js — Zugriff auf die SharePoint-Listen «Geraete» und «Verlauf»
   der Site mgmts-ict-s über Microsoft Graph.

   Die Berechtigung ist delegiert: das Token kann nur das, was die angemeldete
   Person in SharePoint ohnehin darf. Es ist kein Generalschlüssel.

   Setzt konfig.js und auth.js voraus. Wird von admin.html, etikette.html und
   setup.html geladen — NICHT von geraet.html, die kommt ohne Anmeldung aus. */

/* ==================================================================== */
/* Hilfsfunktionen                                                      */
/* ==================================================================== */

const Hilfe = (function () {

  /* ---- Text und Sicherheit ---- */

  /* Alles, was aus SharePoint oder aus einem Formular kommt, gilt als
     fremder Text. Vor jedem Einsetzen in innerHTML durch diese Funktion
     schicken (Schutz gegen Cross-Site-Scripting). Wo immer möglich wird in
     den Seiten ohnehin textContent verwendet, das ist von sich aus sicher. */
  function escape(wert) {
    if (wert === null || wert === undefined) return "";
    return String(wert)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Auswahlspalten kommen je nach Konfiguration als Text oder als Objekt. */
  function wert(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return v.Value || v.value || "";
    return String(v);
  }

  /* ---- Datum ---- */

  /* SharePoint liefert Datumswerte in UTC. Je nachdem, womit ein Eintrag
     angelegt wurde, steht dort «2026-08-27T22:00:00Z» oder
     «2026-08-28T12:00:00Z» für denselben Tag. Deshalb wird immer über die
     lokale Zeitzone in ein Datum ohne Uhrzeit umgerechnet. */
  function datumAusSp(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return jahrMonatTag(d);
  }

  /* Umgekehrt: beim Schreiben wird Mittag UTC gesetzt. Damit landet der Wert
     auch bei Zeitzonenverschiebung sicher auf dem gewünschten Tag. */
  function datumFuerSp(jjjjMmTt) {
    if (!jjjjMmTt) return null;
    return jjjjMmTt + "T12:00:00Z";
  }

  function jahrMonatTag(d) {
    return d.getFullYear() + "-"
      + String(d.getMonth() + 1).padStart(2, "0") + "-"
      + String(d.getDate()).padStart(2, "0");
  }

  function heute() {
    return jahrMonatTag(new Date());
  }

  /* Datum in n Monaten, als «JJJJ-MM-TT». */
  function inMonaten(n) {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    return jahrMonatTag(d);
  }

  /* «2026-08-28» -> «28.08.2026» */
  function datumKurz(jjjjMmTt) {
    if (!jjjjMmTt) return "";
    const t = String(jjjjMmTt).split("-");
    return t.length === 3 ? t[2] + "." + t[1] + "." + t[0] : jjjjMmTt;
  }

  /* Zeitstempel «2026-08-28T14:05:00Z» -> «28.08.2026, 16:05» (lokal). */
  function zeitpunktText(v) {
    if (!v) return "";
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return String(d.getDate()).padStart(2, "0") + "."
      + String(d.getMonth() + 1).padStart(2, "0") + "."
      + d.getFullYear() + ", "
      + String(d.getHours()).padStart(2, "0") + ":"
      + String(d.getMinutes()).padStart(2, "0");
  }

  /* ---- Adressen ---- */

  /* Öffentliche Adresse eines Geräts — Inhalt des QR-Codes auf der Etikette.
     Die Umleitung /g/:id -> geraet.html?id=:id steht in _redirects. */
  function geraetLink(id) {
    return KONFIG.BASIS_URL.replace(/\/+$/, "") + "/g/" + encodeURIComponent(id);
  }

  return {
    escape: escape,
    wert: wert,
    datumAusSp: datumAusSp,
    datumFuerSp: datumFuerSp,
    jahrMonatTag: jahrMonatTag,
    heute: heute,
    inMonaten: inMonaten,
    datumKurz: datumKurz,
    zeitpunktText: zeitpunktText,
    geraetLink: geraetLink
  };
})();


/* ==================================================================== */
/* Fachliche Konstanten                                                 */
/* ==================================================================== */

const KATEGORIEN = ["PC", "Notebook", "Monitor", "Drucker", "Netzwerk",
                    "Mobile", "Peripherie", "Server", "Sonstiges"];

const STATUS = ["Aktiv", "Lager", "Reparatur", "Ausgemustert"];


/* ==================================================================== */
/* Graph-Zugriff                                                        */
/* ==================================================================== */

const Graph = (function () {

  const WURZEL = "https://graph.microsoft.com/v1.0";

  const FELDER_GERAET = "Title,AssetNr,Kategorie,Status,Seriennummer,Hersteller,"
    + "Modell,IPAdresse,MACAdresse,Owner,Standort,Anschaffungsdatum,EndOfLife,"
    + "GarantieBis,Preis,NotizenIntern,BeschreibungOeffentlich";

  const FELDER_VERLAUF = "Title,GeraetId,Datum,Text,Wer";

  /* Einmal aufgelöst, danach für die Lebensdauer der Seite gemerkt. */
  let siteIdPromise = null;


  /* ---------- Grundlage: eine Anfrage an Graph ---------- */

  async function anfrage(pfad, optionen) {
    optionen = optionen || {};
    const zugriff = await Auth.token();
    const kopf = Object.assign({
      "Authorization": "Bearer " + zugriff,
      "Accept": "application/json"
    }, optionen.headers || {});
    if (optionen.body) kopf["Content-Type"] = "application/json";

    const antwort = await fetch(pfad.indexOf("http") === 0 ? pfad : WURZEL + pfad, {
      method: optionen.method || "GET",
      headers: kopf,
      body: optionen.body ? JSON.stringify(optionen.body) : undefined
    });

    if (antwort.status === 204) return null;
    const daten = await antwort.json().catch(() => null);

    if (!antwort.ok) {
      const fehler = new Error(lesbarerFehler(antwort.status, daten));
      fehler.status = antwort.status;
      fehler.rohdaten = daten;
      throw fehler;
    }
    return daten;
  }

  function lesbarerFehler(status, daten) {
    const meldung = daten && daten.error && (daten.error.message || daten.error.code);
    if (status === 401) return "Die Anmeldung ist abgelaufen. Bitte die Seite neu laden.";
    if (status === 403) return "Keine Berechtigung. Bitte prüfen, ob das Konto "
      + "Zugriff auf die SharePoint-Site «mgmts-ict-s» hat.";
    if (status === 404) return "Site, Liste oder Eintrag nicht gefunden. "
      + "Bitte sitePfad und die Listennamen in konfig.js prüfen.";
    if (status === 429) return "Zu viele Anfragen. Bitte einen Moment warten "
      + "und die Seite neu laden.";
    return meldung || ("Fehler von Microsoft Graph (HTTP " + status + ")");
  }


  /* ---------- Site und Listen auflösen ---------- */

  /* Die Site-ID wird zur Laufzeit aus dem Pfad aufgelöst und danach
     zwischengespeichert. So muss in konfig.js keine GUID gepflegt werden. */
  async function siteId() {
    if (!siteIdPromise) {
      siteIdPromise = anfrage("/sites/" + KONFIG.sitePfad + "?$select=id")
        .then(s => s.id)
        .catch(e => { siteIdPromise = null; throw e; });
    }
    return siteIdPromise;
  }

  /* Baut den Pfad zu einer Liste. «bezeichner» darf ein Anzeigename oder eine
     GUID sein — Graph akzeptiert beides an derselben Stelle. */
  async function listenPfad(bezeichner) {
    return "/sites/" + (await siteId()) + "/lists/" + bezeichner;
  }

  async function geraetePfad() { return listenPfad(KONFIG.listeGeraete); }
  async function verlaufPfad() { return listenPfad(KONFIG.listeVerlauf); }


  /* ---------- Alle Elemente einer Liste holen ---------- */

  /* Bewusst immer die ganze Liste, mit $top=999 und Folgeseiten; gefiltert
     wird danach im Browser. Serverseitige $filter auf Listenspalten setzen in
     SharePoint einen Index voraus und schlagen sonst sporadisch fehl.
     Wenn die Feldauswahl scheitert (etwa weil eine Spalte umbenannt wurde),
     wird ohne $select erneut versucht. */
  async function alleElemente(pfad, felder) {
    async function holen(mitAuswahl) {
      const auswahl = mitAuswahl
        ? "$expand=fields($select=" + felder + ")"
        : "$expand=fields";
      let url = pfad + "/items?$select=id,createdDateTime,lastModifiedDateTime&"
        + auswahl + "&$top=999";
      const treffer = [];
      while (url) {
        const seite = await anfrage(url);
        for (const el of (seite.value || [])) treffer.push(flach(el));
        url = seite["@odata.nextLink"] || null;
      }
      return treffer;
    }
    try {
      return await holen(true);
    } catch (e) {
      if (e.status === 400) return await holen(false);
      throw e;
    }
  }

  /* Graph verschachtelt die Listenspalten unter «fields». Für die Seiten ist
     ein flaches Objekt bequemer. */
  function flach(element) {
    const f = element.fields || {};
    const satz = Object.assign({}, f);
    satz.id = element.id;
    satz.erstellt = element.createdDateTime || f.Created || null;
    satz.geaendert = element.lastModifiedDateTime || f.Modified || null;
    return satz;
  }


  /* ---------- Geräte ---------- */

  function ausSp(g) {
    return {
      id:                     g.id,
      name:                   g.Title || "",
      assetNr:                g.AssetNr || "",
      kategorie:              Hilfe.wert(g.Kategorie),
      status:                 Hilfe.wert(g.Status) || "Lager",
      seriennummer:           g.Seriennummer || "",
      hersteller:             g.Hersteller || "",
      modell:                 g.Modell || "",
      ipAdresse:              g.IPAdresse || "",
      macAdresse:             g.MACAdresse || "",
      owner:                  g.Owner || "",
      standort:               g.Standort || "",
      anschaffungsdatum:      Hilfe.datumAusSp(g.Anschaffungsdatum),
      endOfLife:              Hilfe.datumAusSp(g.EndOfLife),
      garantieBis:            Hilfe.datumAusSp(g.GarantieBis),
      preis:                  (g.Preis === null || g.Preis === undefined || g.Preis === "")
                                ? "" : Number(g.Preis),
      notizenIntern:          g.NotizenIntern || "",
      beschreibungOeffentlich: g.BeschreibungOeffentlich || "",
      erstellt:               g.erstellt,
      geaendert:              g.geaendert
    };
  }

  /* Nur die tatsächlich mitgegebenen Felder werden geschrieben. So kann
     geraetAendern() auch nur eine einzelne Spalte anfassen. */
  function felderAusGeraet(d) {
    const f = {};
    if (d.name                    !== undefined) f.Title                   = d.name;
    if (d.assetNr                 !== undefined) f.AssetNr                 = d.assetNr;
    if (d.kategorie               !== undefined) f.Kategorie               = d.kategorie;
    if (d.status                  !== undefined) f.Status                  = d.status;
    if (d.seriennummer            !== undefined) f.Seriennummer            = d.seriennummer;
    if (d.hersteller              !== undefined) f.Hersteller              = d.hersteller;
    if (d.modell                  !== undefined) f.Modell                  = d.modell;
    if (d.ipAdresse               !== undefined) f.IPAdresse               = d.ipAdresse;
    if (d.macAdresse              !== undefined) f.MACAdresse              = d.macAdresse;
    if (d.owner                   !== undefined) f.Owner                   = d.owner;
    if (d.standort                !== undefined) f.Standort                = d.standort;
    if (d.anschaffungsdatum       !== undefined) f.Anschaffungsdatum       = Hilfe.datumFuerSp(d.anschaffungsdatum);
    if (d.endOfLife               !== undefined) f.EndOfLife               = Hilfe.datumFuerSp(d.endOfLife);
    if (d.garantieBis             !== undefined) f.GarantieBis             = Hilfe.datumFuerSp(d.garantieBis);
    if (d.preis                   !== undefined) f.Preis                   = (d.preis === "" || d.preis === null) ? null : Number(d.preis);
    if (d.notizenIntern           !== undefined) f.NotizenIntern           = d.notizenIntern;
    if (d.beschreibungOeffentlich !== undefined) f.BeschreibungOeffentlich = d.beschreibungOeffentlich;
    return f;
  }

  async function geraete() {
    const roh = await alleElemente(await geraetePfad(), FELDER_GERAET);
    return roh.map(ausSp).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "de-CH"));
  }

  async function geraet(id) {
    const el = await anfrage((await geraetePfad()) + "/items/" + encodeURIComponent(id)
      + "?$expand=fields($select=" + FELDER_GERAET + ")");
    return ausSp(flach(el));
  }

  async function geraetAnlegen(daten) {
    const antwort = await anfrage((await geraetePfad()) + "/items", {
      method: "POST",
      body: { fields: felderAusGeraet(daten) }
    });
    return antwort ? antwort.id : null;
  }

  async function geraetAendern(id, daten) {
    return anfrage((await geraetePfad()) + "/items/" + encodeURIComponent(id) + "/fields", {
      method: "PATCH",
      body: felderAusGeraet(daten)
    });
  }

  async function geraetLoeschen(id) {
    return anfrage((await geraetePfad()) + "/items/" + encodeURIComponent(id), {
      method: "DELETE"
    });
  }


  /* ---------- Verlauf ---------- */

  /* Ohne Argument: alle Einträge. Mit geraetId: nur die eines Geräts.
     Gefiltert wird im Browser, siehe Kommentar bei alleElemente(). */
  async function verlauf(geraetId) {
    const roh = await alleElemente(await verlaufPfad(), FELDER_VERLAUF);
    return roh
      .filter(v => geraetId === undefined || String(v.GeraetId) === String(geraetId))
      .map(v => ({
        id:       v.id,
        aktion:   v.Title || "",
        geraetId: v.GeraetId === null || v.GeraetId === undefined ? "" : String(v.GeraetId),
        datum:    v.Datum || v.erstellt || null,
        text:     v.Text || "",
        wer:      v.Wer || ""
      }))
      .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));
  }

  async function verlaufAnlegen(daten) {
    const f = {};
    f.Title    = daten.aktion || "Notiz";
    f.GeraetId = String(daten.geraetId === undefined ? "" : daten.geraetId);
    f.Datum    = daten.datum || new Date().toISOString();
    f.Text     = daten.text || "";
    f.Wer      = daten.wer || werBinIch();
    const antwort = await anfrage((await verlaufPfad()) + "/items", {
      method: "POST",
      body: { fields: f }
    });
    return antwort ? antwort.id : null;
  }

  /* Name und Adresse der angemeldeten Person, für die Verlauf-Spalte «Wer». */
  function werBinIch() {
    const k = (typeof Auth !== "undefined" && Auth.konto) ? Auth.konto() : null;
    if (!k) return "";
    if (k.name && k.adresse) return k.name + " (" + k.adresse + ")";
    return k.name || k.adresse || "";
  }

  /* Schreibt einen Verlaufseintrag, ohne die aufrufende Seite scheitern zu
     lassen, wenn die Verlauf-Liste fehlt oder gesperrt ist. Der Verlauf ist
     eine Chronik, kein Teil der Datenhaltung. */
  async function verlaufVersuchen(daten) {
    try {
      return await verlaufAnlegen(daten);
    } catch (e) {
      if (typeof console !== "undefined") {
        console.warn("Verlaufseintrag konnte nicht geschrieben werden:", e);
      }
      return null;
    }
  }



  /* ==================================================================
     Einrichtung: Listen anlegen (wird nur von setup.html gebraucht)
     ================================================================== */

  /* Spaltendefinitionen im Format von Microsoft Graph. «Title» besteht in
     jeder generischen Liste bereits und wird deshalb nicht mit angelegt. */

  function textSpalte(name, mehrzeilig) {
    return {
      name: name,
      text: mehrzeilig
        ? { allowMultipleLines: true, appendChangesToExistingText: false,
            linesForEditing: 6, maxLength: 8000, textType: "plain" }
        : { allowMultipleLines: false, appendChangesToExistingText: false,
            linesForEditing: 0, maxLength: 255 }
    };
  }

  function auswahlSpalte(name, werte, pflicht, standard) {
    const s = {
      name: name,
      required: !!pflicht,
      choice: { allowTextEntry: false, choices: werte, displayAs: "dropDownMenu" }
    };
    if (standard) s.defaultValue = { value: standard };
    return s;
  }

  function datumSpalte(name) {
    return { name: name, dateTime: { displayAs: "standard", format: "dateOnly" } };
  }

  function zahlSpalte(name) {
    return { name: name, number: { decimalPlaces: "two", displayAs: "number" } };
  }

  const SPALTEN_GERAETE = [
    textSpalte("AssetNr", false),
    auswahlSpalte("Kategorie", KATEGORIEN, true, null),
    auswahlSpalte("Status", STATUS, true, "Lager"),
    textSpalte("Seriennummer", false),
    textSpalte("Hersteller", false),
    textSpalte("Modell", false),
    textSpalte("IPAdresse", false),
    textSpalte("MACAdresse", false),
    textSpalte("Owner", false),
    textSpalte("Standort", false),
    datumSpalte("Anschaffungsdatum"),
    datumSpalte("EndOfLife"),
    datumSpalte("GarantieBis"),
    zahlSpalte("Preis"),
    textSpalte("NotizenIntern", true),
    textSpalte("BeschreibungOeffentlich", true)
  ];

  const SPALTEN_VERLAUF = [
    textSpalte("GeraetId", false),
    { name: "Datum", dateTime: { displayAs: "standard", format: "dateTime" } },
    textSpalte("Text", true),
    textSpalte("Wer", false)
  ];

  /* Sucht eine Liste anhand des Anzeigenamens. Gefiltert wird im Browser,
     es sind ohnehin nur wenige Listen. */
  async function listeSuchen(anzeigename) {
    const antwort = await anfrage("/sites/" + (await siteId())
      + "/lists?$select=id,name,displayName&$top=999");
    const suche = String(anzeigename).toLowerCase();
    return (antwort.value || []).find(l =>
      String(l.displayName || "").toLowerCase() === suche ||
      String(l.name || "").toLowerCase() === suche) || null;
  }

  /* Ergänzt fehlende Spalten in einer bestehenden Liste. Vorhandene Spalten
     werden nicht angefasst — die Funktion ist damit wiederholbar (idempotent). */
  async function spaltenErgaenzen(listenId, spalten, melden) {
    const vorhanden = await anfrage("/sites/" + (await siteId())
      + "/lists/" + listenId + "/columns?$select=name,displayName&$top=999");
    const namen = new Set((vorhanden.value || []).map(c => String(c.name).toLowerCase()));
    const ergaenzt = [];
    for (const spalte of spalten) {
      if (namen.has(spalte.name.toLowerCase())) continue;
      await anfrage("/sites/" + (await siteId()) + "/lists/" + listenId + "/columns", {
        method: "POST", body: spalte
      });
      ergaenzt.push(spalte.name);
      if (melden) melden("Spalte «" + spalte.name + "» angelegt.");
    }
    return ergaenzt;
  }

  /* Legt eine Liste an, falls sie noch nicht besteht, und ergänzt in jedem
     Fall die fehlenden Spalten. Liefert { id, neu, ergaenzt }. */
  async function listeSicherstellen(anzeigename, spalten, melden) {
    let liste = await listeSuchen(anzeigename);
    let neu = false;

    if (!liste) {
      if (melden) melden("Liste «" + anzeigename + "» wird angelegt …");
      liste = await anfrage("/sites/" + (await siteId()) + "/lists", {
        method: "POST",
        body: {
          displayName: anzeigename,
          columns: spalten,
          list: { template: "genericList" }
        }
      });
      neu = true;
      if (melden) melden("Liste «" + anzeigename + "» angelegt.");
    } else {
      if (melden) melden("Liste «" + anzeigename + "» besteht bereits, Spalten werden geprüft …");
    }

    const ergaenzt = await spaltenErgaenzen(liste.id, spalten, melden);
    return { id: liste.id, name: anzeigename, neu: neu, ergaenzt: ergaenzt };
  }

  /* Einmalige Einrichtung. «melden» ist eine Funktion, die Fortschrittstexte
     entgegennimmt (setup.html schreibt sie ins Protokoll). */
  async function listenAnlegen(melden) {
    melden = melden || function () {};
    melden("Site wird aufgelöst: " + KONFIG.sitePfad);
    const sid = await siteId();
    melden("Site-ID: " + sid);

    const geraeteListe = await listeSicherstellen("Geraete", SPALTEN_GERAETE, melden);
    const verlaufListe = await listeSicherstellen("Verlauf", SPALTEN_VERLAUF, melden);

    melden("Fertig.");
    return { siteId: sid, geraete: geraeteListe, verlauf: verlaufListe };
  }


  return {
    /* Geräte */
    geraete: geraete,
    geraet: geraet,
    geraetAnlegen: geraetAnlegen,
    geraetAendern: geraetAendern,
    geraetLoeschen: geraetLoeschen,
    /* Verlauf */
    verlauf: verlauf,
    verlaufAnlegen: verlaufAnlegen,
    verlaufVersuchen: verlaufVersuchen,
    werBinIch: werBinIch,
    /* Sonstiges */
    siteId: siteId,
    listenAnlegen: listenAnlegen
  };
})();
