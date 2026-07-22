# Démarrage de la borne (100 % hors-ligne) — Windows 11.
# À lancer À L'OUVERTURE DE SESSION (Planificateur de tâches, voir README-borne.md).
# 1) sert dist/ + l'API mémorial via server/borne-server.mjs ;
# 2) attend que le serveur réponde ; 3) ouvre Edge en plein écran tactile,
#    relancé automatiquement s'il est fermé (fonctionnement 24/7).

$ErrorActionPreference = 'Stop'
$racine = (Resolve-Path "$PSScriptRoot\..\..").Path
$url = 'http://localhost:3210'

# dist/ absent = rien à servir : refaire « npm run build » (connecté) d'abord.
if (-not (Test-Path "$racine\dist")) { exit 1 }

# 1. Serveur borne (Node) en arrière-plan — une seule instance.
$dejaLance = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*borne-server.mjs*' }
if (-not $dejaLance) {
  Start-Process node -ArgumentList 'server\borne-server.mjs' `
    -WorkingDirectory $racine -WindowStyle Hidden
}

# 2. Attendre que le serveur réponde (max ~30 s).
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 1 | Out-Null; break }
  catch { Start-Sleep -Milliseconds 500 }
}

# 3. Edge en mode kiosque plein écran, profil isolé (pas d'invite « restaurer
#    les onglets »), gestes tactiles carte-only. Relancé s'il se ferme/plante.
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$args = @(
  $url, '--kiosk', '--edge-kiosk-type=fullscreen',
  "--user-data-dir=$env:LOCALAPPDATA\borne-kiosk",
  '--no-first-run', '--disable-session-crashed-bubble',
  '--disable-pinch', '--overscroll-history-navigation=0',
  '--disable-background-networking'
)
while ($true) {
  Start-Process $edge -ArgumentList $args -Wait
  Start-Sleep -Seconds 2
}
