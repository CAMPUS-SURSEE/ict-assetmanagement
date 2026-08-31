/* konfig.js — zentrale Einstellungen für das ICT-Lager Campus Sursee.

   Diese Datei enthält KEINE Geheimnisse. Mandanten- und Client-ID sind bei
   Single-Page-Anwendungen öffentlich sichtbar; der Schutz kommt aus der
   Anmeldung an Entra ID und aus der Benutzerzuweisung in der
   Unternehmensanwendung. Siehe anleitung/01_Einrichtung.md.

   Die Datei wird von admin.html, etikette.html und setup.html geladen.
   geraet.html (öffentlich) braucht daraus nur FLOW_GERAET_URL. */

const KONFIG = {

  /* ---- Entra ID (Microsoft 365) ---------------------------------------- */

  // Mandant (Directory/Tenant) Campus Sursee — fix, nicht ändern.
  mandantId: "2553fb74-5dcc-4072-8bb5-399d18f72af9",

  // Anwendungs-ID (Client-ID) der App-Registrierung «ICT Lager Verwaltung».
  // MUSS EINGETRAGEN WERDEN: neue SPA-App-Registrierung anlegen,
  // siehe anleitung/01_Einrichtung.md, Schritt A.
  clientId: "HIER_CLIENT_ID_EINTRAGEN",


  /* ---- SharePoint ------------------------------------------------------ */

  /* Pfad zur Site «mgmts-ict-s». Die eigentliche Site-ID wird zur Laufzeit
     über GET /v1.0/sites/{sitePfad} aufgelöst und danach zwischengespeichert.
     So muss hier keine kryptische ID gepflegt werden. */
  sitePfad: "campussursee.sharepoint.com:/sites/mgmts-ict-s",

  /* Listen. Erlaubt ist entweder der Anzeigename («Geraete») oder die
     Listen-GUID. Die GUID ist stabiler — sie ändert sich nicht, wenn jemand
     die Liste in SharePoint umbenennt. setup.html zeigt die GUIDs nach dem
     Anlegen an; danach hier eintragen. */
  listeGeraete: "Geraete",   // z.B. "8c0a1f3e-1234-4c8b-9a1e-abcdef012345"
  listeVerlauf: "Verlauf",   // z.B. "9d1b2e4f-5678-4d9c-8b2f-bcdef0123456"


  /* ---- Power Automate -------------------------------------------------- */

  /* Anonymer HTTP-Trigger-Flow «API Geraet laden». Liefert für eine Geräte-ID
     ausschliesslich die öffentlichen Felder. Wird von geraet.html ohne
     Anmeldung aufgerufen (GET, Query-Parameter &id=...).
     MUSS EINGETRAGEN WERDEN: URL aus dem Flow kopieren,
     siehe anleitung/01_Einrichtung.md, Schritt C. */
  FLOW_GERAET_URL: "HIER_FLOW_URL_EINTRAGEN",


  /* ---- Adressen -------------------------------------------------------- */

  // Öffentliche Basisadresse. Wird für die QR-Codes auf den Etiketten
  // verwendet: BASIS_URL + "/g/" + Geräte-ID
  BASIS_URL: "https://ictlager.campus-sursee.ch",

  /* ICT Servicedesk. Die Adresse wird von etikette.html auf jede Etikette
     gedruckt und von geraet.html für die Betreffzeile der Mail gebraucht.
     Die Telefonnummer steht bewusst nur im HTML von index.html und
     geraet.html: index.html lädt konfig.js gar nicht, und ein Wert, den
     niemand aus KONFIG liest, würde beim Ändern nur übersehen. */
  servicedeskMail: "servicedesk@campus-sursee.ch"
};
