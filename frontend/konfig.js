/* konfig.js, zentrale Einstellungen für das ICT-Lager Campus Sursee.

   Diese Datei enthält KEINE Geheimnisse. Mandanten- und Client-ID sind bei
   Single-Page-Anwendungen öffentlich sichtbar; der Schutz kommt aus der
   Anmeldung an Entra ID und aus der Benutzerzuweisung in der
   Unternehmensanwendung. Siehe anleitung/01_Einrichtung.md.

   Die Datei wird von admin.html, etikette.html und setup.html geladen.
   geraet.html (öffentlich) braucht daraus nur FLOW_GERAET_URL. */

const KONFIG = {

  /* ---- Entra ID (Microsoft 365) ---------------------------------------- */

  // Mandant (Directory/Tenant) Campus Sursee (fix, nicht ändern).
  mandantId: "2553fb74-5dcc-4072-8bb5-399d18f72af9",

  // Anwendungs-ID (Client-ID) der App-Registrierung «ICT Lager Verwaltung».
  // MUSS EINGETRAGEN WERDEN: neue SPA-App-Registrierung anlegen,
  // siehe anleitung/01_Einrichtung.md, Schritt A.
  clientId: "58384569-7580-4617-ad5c-2bf5a81d397d",


  /* ---- SharePoint ------------------------------------------------------ */

  /* Pfad zur Site «mgmts-ict-s». Die eigentliche Site-ID wird zur Laufzeit
     über GET /v1.0/sites/{sitePfad} aufgelöst und danach zwischengespeichert.
     So muss hier keine kryptische ID gepflegt werden. */
  sitePfad: "campussursee.sharepoint.com:/sites/mgmts-ict-s",

  /* Listen. Erlaubt ist entweder der Anzeigename («Geraete») oder die
     Listen-GUID. Die GUID ist stabiler: sie ändert sich nicht, wenn jemand
     die Liste in SharePoint umbenennt. Beide Listen wurden am 31.08.2026
     angelegt; hier stehen ihre GUIDs. */
  listeGeraete: "9fb53d45-26c9-4d72-9297-696231048d69",   // Liste «Geraete»
  listeVerlauf: "a63f4b50-3a2d-43b6-8878-a271667fa351",   // Liste «Verlauf»


  /* ---- Power Automate -------------------------------------------------- */

  /* Anonymer HTTP-Trigger-Flow «API Geraet laden». Liefert für eine Geräte-ID
     ausschliesslich die öffentlichen Felder. Wird von geraet.html ohne
     Anmeldung aufgerufen (GET, Query-Parameter &id=...).
     Eingerichtet am 31.08.2026, siehe anleitung/01_Einrichtung.md, Schritt C.
     Die Definition des Flows liegt als Referenz in
     code/flow_api-geraet-laden.json. */
  FLOW_GERAET_URL: "https://default2553fb745dcc40728bb5399d18f72a.f9.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/26/workflows/9c3d2df7ff6f4af3b605ffc4ec9fdb6a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=8wyU7l0d6QSfSvwuSA8XMl_xo-gx9NGc0FMJbA3sgxI",


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
