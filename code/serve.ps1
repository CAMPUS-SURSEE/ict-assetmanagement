<#
  serve.ps1 — kleiner lokaler Webserver zum Testen.

  Aufruf (von überall her, der Pfad wird selbst gefunden):
      .\code\serve.ps1

  Danach im Browser: http://localhost:8000/

  Ausgeliefert wird der Ordner «frontend» neben diesem Skript — also genau
  das, was auch Netlify ausliefert. Die Dokumentation in «anleitung» und
  dieses Skript selbst bleiben aussen vor.

  Warum überhaupt ein Server? Die Seiten dürfen nicht über file:// geöffnet
  werden: MSAL braucht einen echten Ursprung (Origin) für die Anmeldung, und
  die Umleitungsadresse in der App-Registrierung lautet auf
  http://localhost:8000/... — genau diese Adresse muss der Browser sehen.

  Der Server bildet auch die Netlify-Umleitung /g/:id nach, damit sich die
  QR-Codes lokal ausprobieren lassen. Die Kopfzeilen aus _headers setzt er
  bewusst NICHT — die Content-Security-Policy lässt sich nur auf Netlify
  richtig prüfen.

  Beenden mit Strg+C.
#>

param(
  [int]$Port = 8000
)

$ErrorActionPreference = "Stop"

# Der Skriptordner ist «code», ausgeliefert wird das Geschwisterverzeichnis.
$wurzel = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\frontend"))

if (-not (Test-Path $wurzel -PathType Container)) {
  Write-Error "Ordner nicht gefunden: $wurzel"
  exit 1
}

$typen = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json; charset=utf-8"
  ".md"   = "text/plain; charset=utf-8"
  ".ico"  = "image/x-icon"
  ".png"  = "image/png"
}

$zuhoerer = New-Object System.Net.HttpListener
$zuhoerer.Prefixes.Add("http://localhost:$Port/")
$zuhoerer.Start()

Write-Host ""
Write-Host "  ICT Lager - lokaler Test" -ForegroundColor Green
Write-Host "  http://localhost:$Port/"
Write-Host "  Ordner: $wurzel"
Write-Host "  Beenden mit Strg+C"
Write-Host ""

try {
  while ($zuhoerer.IsListening) {
    $kontext  = $zuhoerer.GetContext()
    $anfrage  = $kontext.Request
    $antwort  = $kontext.Response
    $pfad     = [System.Uri]::UnescapeDataString($anfrage.Url.AbsolutePath)

    # Netlify-Umleitung /g/:id nachbilden
    if ($pfad -match '^/g/(.+)$') {
      $antwort.StatusCode = 302
      $antwort.RedirectLocation = "/geraet.html?id=$($Matches[1])"
      $antwort.Close()
      continue
    }

    if ($pfad -eq "/") { $pfad = "/index.html" }

    # Ausbruch aus dem ausgelieferten Ordner verhindern. Der Vergleich läuft
    # gegen "$wurzel\", sonst würde ein Nachbarordner mit demselben Anfang
    # (z.B. ...\frontend-alt) fälschlich als innerhalb gelten.
    $datei = Join-Path $wurzel ($pfad.TrimStart("/") -replace "/", "\")
    $sicher = $false
    try {
      $voll = [System.IO.Path]::GetFullPath($datei)
      $praefix = $wurzel.TrimEnd("\") + "\"
      $sicher = $voll.StartsWith($praefix, [System.StringComparison]::OrdinalIgnoreCase)
    } catch {
      # Ungültige Zeichen im Pfad: gilt als nicht gefunden.
      $sicher = $false
    }

    if (-not $sicher -or -not (Test-Path $voll -PathType Leaf)) {
      $antwort.StatusCode = 404
      $inhalt = [System.Text.Encoding]::UTF8.GetBytes("404 - nicht gefunden: $pfad")
      $antwort.ContentType = "text/plain; charset=utf-8"
      $antwort.ContentLength64 = $inhalt.Length
      $antwort.OutputStream.Write($inhalt, 0, $inhalt.Length)
      $antwort.Close()
      Write-Host "404 $pfad" -ForegroundColor DarkYellow
      continue
    }

    $endung = [System.IO.Path]::GetExtension($voll).ToLower()
    $typ = $typen[$endung]
    if (-not $typ) { $typ = "application/octet-stream" }

    $bytes = [System.IO.File]::ReadAllBytes($voll)
    $antwort.ContentType = $typ
    $antwort.Headers.Add("Cache-Control", "no-store")
    $antwort.ContentLength64 = $bytes.Length
    $antwort.OutputStream.Write($bytes, 0, $bytes.Length)
    $antwort.Close()
    Write-Host "200 $pfad" -ForegroundColor DarkGray
  }
}
finally {
  $zuhoerer.Stop()
  $zuhoerer.Close()
}
