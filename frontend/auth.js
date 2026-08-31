/* auth.js, Anmeldung an Entra ID (Microsoft 365) für die internen Seiten
   admin.html, etikette.html und setup.html.

   Dünner Aufsatz auf MSAL, der offiziellen Anmeldebibliothek von Microsoft.
   MSAL wird per CDN eingebunden (siehe die Script-Zeile in den Seiten, mit
   integrity-Prüfsumme gepinnt). Hier steht nur die Übersetzung in die vier
   Funktionen, welche die Seiten benutzen. Den OAuth-2-Ablauf (Authorization
   Code Flow mit PKCE), das Zwischenspeichern der Token und die stille
   Erneuerung erledigt MSAL.

   Ablauf:
     1. Seite ruft Auth.anmeldungSicherstellen() auf.
     2. Keine Anmeldung vorhanden  ->  Weiterleitung an login.microsoftonline.com.
        Wer bereits an Microsoft 365 angemeldet ist, wird ohne Eingabe
        durchgereicht (Single Sign-on).
     3. MSAL kehrt danach von selbst auf die ursprüngliche Adresse zurück,
        samt Abfragezeichenfolge (z.B. ?ids=1,2,3).
     4. Auth.token() liefert jederzeit ein gültiges Zugriffstoken.

   Ablage: sessionStorage. Beim Schliessen des Tabs ist alles weg.

   Wer die Seiten überhaupt benutzen darf, wird NICHT hier entschieden,
   sondern in Entra ID: die Unternehmensanwendung ist auf
   «Zuweisung erforderlich = Ja» gestellt. Nicht zugewiesene Personen
   erhalten von Entra eine Fehlerantwort und kommen gar nie zurück. */

const Auth = (function () {

  /* Delegierte Berechtigungen. Sites.ReadWrite.All für die SharePoint-Listen.
     User.Read sorgt dafür, dass Entra ein vollständiges Benutzerprofil
     ausstellt: Name und Adresse für die Verlauf-Spalte «Wer» kommen aus dem
     ID-Token, das MSAL dabei mitliefert (Auth.konto()).
     Delegiert heisst: das Token kann nur das, was die angemeldete Person in
     SharePoint ohnehin darf. Es ist kein Generalschlüssel. */
  const BEREICHE = [
    "https://graph.microsoft.com/Sites.ReadWrite.All",
    "https://graph.microsoft.com/User.Read"
  ];

  let anwendungPromise = null;
  let konto = null;

  /* Die Umleitungsadresse muss exakt so in der App-Registrierung stehen.
     Ohne Abfragezeichenfolge, damit ?id=... nicht mitregistriert werden muss.
     MSAL merkt sich die vollständige Adresse selbst und kehrt am Ende
     dorthin zurück. */
  function zielUrl() {
    return location.origin + location.pathname;
  }

  async function anwendung() {
    if (anwendungPromise) return anwendungPromise;

    anwendungPromise = (async function () {
      if (typeof msal === "undefined") {
        throw new Error("Die Anmeldebibliothek konnte nicht geladen werden. "
          + "Bitte die Internetverbindung prüfen und die Seite neu laden.");
      }
      if (!KONFIG.clientId || KONFIG.clientId.indexOf("HIER_") === 0) {
        throw new Error("In konfig.js ist keine Client-ID eingetragen. "
          + "Bitte die App-Registrierung anlegen, siehe anleitung/01_Einrichtung.md.");
      }
      const app = new msal.PublicClientApplication({
        auth: {
          clientId:    KONFIG.clientId,
          authority:   "https://login.microsoftonline.com/" + KONFIG.mandantId,
          redirectUri: zielUrl(),
          // Nach der Anmeldung zurück auf die ursprünglich gewünschte Adresse.
          navigateToLoginRequestUrl: true
        },
        cache: {
          cacheLocation: "sessionStorage",
          storeAuthStateInCookie: false
        }
      });
      await app.initialize();
      return app;
    })();

    return anwendungPromise;
  }

  function merken(msalKonto) {
    konto = msalKonto
      ? { name: msalKonto.name || "", adresse: msalKonto.username || "" }
      : null;
    return konto;
  }

  /* Stellt sicher, dass eine gültige Anmeldung vorliegt. Löst mit den
     Kontodaten auf, oder leitet weiter und löst dann nie auf. */
  async function anmeldungSicherstellen() {
    const app = await anwendung();

    // Wirft bei einer Fehlerantwort von Entra, etwa wenn die Person der
    // Unternehmensanwendung nicht zugewiesen ist.
    const antwort = await app.handleRedirectPromise();

    let gefunden = antwort ? antwort.account : null;
    if (!gefunden) gefunden = app.getActiveAccount() || app.getAllAccounts()[0] || null;

    if (!gefunden) {
      await app.loginRedirect({ scopes: BEREICHE });
      // Danach passiert auf dieser Seite nichts mehr.
      return new Promise(function () {});
    }

    app.setActiveAccount(gefunden);
    return merken(gefunden);
  }

  /* Liefert ein gültiges Zugriffstoken. MSAL erneuert es still über ein
     verstecktes iframe auf login.microsoftonline.com (deshalb steht der Host
     in der CSP unter frame-src); sonst wird neu angemeldet. */
  async function token() {
    const app = await anwendung();
    const vorhanden = app.getActiveAccount() || app.getAllAccounts()[0];

    if (!vorhanden) {
      await app.loginRedirect({ scopes: BEREICHE });
      return new Promise(function () {});
    }
    try {
      const ergebnis = await app.acquireTokenSilent({ account: vorhanden, scopes: BEREICHE });
      return ergebnis.accessToken;
    } catch (e) {
      // Stille Erneuerung nicht möglich, etwa weil die Sitzung abgelaufen ist.
      await app.acquireTokenRedirect({ account: vorhanden, scopes: BEREICHE });
      return new Promise(function () {});
    }
  }

  function angemeldetesKonto() {
    return konto;
  }

  async function abmelden() {
    const app = await anwendung();
    await app.logoutRedirect({ postLogoutRedirectUri: location.origin + "/" });
  }

  return {
    anmeldungSicherstellen: anmeldungSicherstellen,
    token: token,
    konto: angemeldetesKonto,
    abmelden: abmelden
  };
})();
