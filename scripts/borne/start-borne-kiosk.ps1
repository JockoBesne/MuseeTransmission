# Démarrage de la borne TACTILE (100 % hors-ligne) — Windows 11.
# À lancer À L'OUVERTURE DE SESSION (Planificateur de tâches, voir README-borne.md).
# 1) sert dist/ + l'API mémorial via server/borne-server.mjs ;
# 2) attend que le serveur réponde ; 3) ouvre Edge en kiosque plein écran,
#    gestes tactiles neutralisés, relancé automatiquement s'il est fermé (24/7).

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

# 3. Edge en kiosque plein écran, profil isolé (pas d'invite « restaurer les
#    onglets »). Écran tactile : pincer-zoomer, balayage précédent/suivant et
#    tirer-pour-actualiser sont désactivés — seule l'app gère le toucher.
#    (Le clavier tactile Windows est bloqué côté app : inputMode="none".)
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
$argsEdge = @(
  $url, '--kiosk', '--edge-kiosk-type=fullscreen',
  "--user-data-dir=$env:LOCALAPPDATA\borne-kiosk",
  '--no-first-run', '--disable-session-crashed-bubble',
  '--touch-events=enabled',                 # force le mode tactile
  '--disable-pinch',                        # pas de pincer-zoomer navigateur
  '--overscroll-history-navigation=0',      # pas de balayage retour/avant
  '--pull-to-refresh=0',                    # pas de tirer-pour-actualiser
  '--disable-touch-drag-drop',              # pas de glisser-déposer tactile
  '--disable-background-networking'
)
while ($true) {
  Start-Process $edge -ArgumentList $argsEdge -Wait
  Start-Sleep -Seconds 2
}
