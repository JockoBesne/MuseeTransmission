# Déploiement de la borne — Windows 11, 100 % hors-ligne

PC Windows 11 relié à l'écran tactile, navigateur en mode kiosque sur le
serveur local `npm run borne`. Une fois installé, **plus aucun accès réseau
n'est nécessaire**.

## 1. À FAIRE MAINTENANT (tant que le PC est CONNECTÉ)

Tout ce qui télécharge doit être fait en ligne — après, ce sera impossible.

1. **Installer Node.js LTS** (https://nodejs.org) — teste : `node -v` doit répondre.
2. Copier le projet sur le PC (p. ex. `C:\borne\MuseeTransmission`).
3. Dans ce dossier :
   ```powershell
   npm install      # récupère node_modules (réseau requis)
   npm run build    # génère dist/ (à refaire à chaque changement de contenu)
   ```
4. Vérifier que ça tourne : `npm run borne`, puis ouvrir `http://localhost:3210`.

Après ça, le PC peut être débranché du réseau : `node_modules/` + `dist/` sont
locaux, les polices sont auto-hébergées, aucune ressource distante (CDN/API).

## 2. Démarrage automatique (session ouverte → borne à l'écran)

Le script [start-borne-kiosk.ps1](start-borne-kiosk.ps1) lance le serveur,
attend qu'il réponde, puis ouvre Edge en plein écran (relancé s'il se ferme).

Enregistrer la tâche **à l'ouverture de session** (adapter le chemin) — dans
un PowerShell **en administrateur**, en une seule ligne :

```powershell
schtasks /Create /TN "Borne Musee" /SC ONLOGON /F /TR 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\borne\MuseeTransmission\scripts\borne\start-borne-kiosk.ps1"'
```

Vérifier : `schtasks /Query /TN "Borne Musee"`.

**Alternative sans droits admin** — dossier Démarrage (un `.ps1` ne s'y exécute
pas directement, d'où le `.cmd` relais) :

```powershell
Set-Content "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\borne.cmd" '@start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\borne\MuseeTransmission\scripts\borne\start-borne-kiosk.ps1"'
```

Dans les deux cas, le lancement n'a lieu **qu'à l'ouverture de session** :
la connexion automatique (§3) est indispensable.

> Chrome à la place d'Edge : remplacer `msedge.exe` par
> `chrome.exe` dans le script et retirer `--edge-kiosk-type=fullscreen`.
> Quitter le kiosque pour l'admin : `Ctrl`+`Alt`+`Suppr` puis fermer la session,
> ou brancher un clavier et `Alt`+`F4`.

## 3. Réglages machine pour un fonctionnement 24/7

> **L'électricité du musée est coupée chaque soir.** La borne doit donc
> repartir seule chaque matin, sans personne pour appuyer sur un bouton. La
> chaîne complète est : secteur rétabli → le PC se rallume → Windows démarre →
> la session s'ouvre → la tâche ONLOGON part → le serveur répond → Edge
> s'ouvre. Les deux premiers maillons se règlent dans le BIOS, les suivants
> ci-dessous. Corollaire : inutile de prévoir un redémarrage nocturne de
> l'application, la coupure le fait déjà.

- **Reprise après coupure secteur — réglage BIOS/UEFI, le maillon amont de
  tout le reste.** Par défaut un PC coupé au secteur *reste éteint* au retour
  du courant : sans ce réglage, rien de ce qui suit ne se déclenche jamais.
  Au démarrage, `F2` ou `Suppr` selon la machine, menu *Power* /
  *Power Management*, passer **AC Recovery** (aussi nommé *After Power
  Failure* ou *Restore on AC Power Loss*) sur **Power On**. Le nom exact
  dépend du constructeur : `Get-CimInstance Win32_ComputerSystem | Select
  Manufacturer, Model`. *(À faire à la main : aucun script ne peut écrire ce
  réglage, il vit dans la NVRAM de l'UEFI, que Windows n'expose pas.)*
- **Connexion automatique** (sinon la tâche ONLOGON ne se déclenche pas seule) :
  `netplwiz` → décocher « Les utilisateurs doivent entrer un nom… » → saisir le
  mot de passe du compte. *(À faire par toi : réglage de compte.)*
- **Échelle d'affichage — ne pas la régler dans Windows.** L'écran est une
  dalle **3840×2160 en DisplayPort**. L'app est écrite et mesurée pour un
  viewport CSS de **1280×720**, obtenu par le drapeau
  `--force-device-scale-factor=3` du script de démarrage (3840 ÷ 3 = 1280).
  Edge ignore alors le réglage « Mise à l'échelle » de Windows : la borne
  garde exactement le même rendu même si ce réglage change un jour (mise à
  jour, écran rebranché, manipulation). Le laisser à 300 % reste cohérent
  pour le bureau Windows lui-même, mais ça n'a plus d'effet sur la borne.
  **Si l'écran est un jour remplacé**, recalculer le facteur
  (définition horizontale ÷ 1280) et le corriger dans
  [start-borne-kiosk.ps1](start-borne-kiosk.ps1) — sinon la mise en page est
  faussée. Vérification sur la borne : `F12` → console → `innerWidth` doit
  répondre **1280**.
- **Ne jamais éteindre l'écran / se mettre en veille** (PowerShell admin) :
  ```powershell
  powercfg /change monitor-timeout-ac 0
  powercfg /change standby-timeout-ac 0
  powercfg /change hibernate-timeout-ac 0
  ```
- **Pas de verrouillage au réveil** : Paramètres → Comptes → Options de
  connexion → « En cas d'absence, exiger une reconnexion » → **Jamais**.
- **Éviter un redémarrage Windows Update pendant l'expo** : Paramètres →
  Windows Update → suspendre les mises à jour, ou régler les « heures d'activité ».
- **Marquage d'écran (rémanence)** — réglage de l'écran lui-même, pas de
  Windows. L'affichage comporte des zones strictement fixes (bandeau
  d'onglets, titre MÉMORIAL, séparateur central, barre de recherche) montrées
  10 h par jour pendant des semaines. Sur un LCD professionnel comme le WM65B
  la rémanence est temporaire, pas définitive comme sur OLED, mais activer
  **Pixel Shift** dans le menu interne de l'écran coûte une case à cocher.
- **Écran tactile : désactiver le balayage depuis les bords** (centre de
  notifications, bureaux virtuels — le script ne peut pas le faire, stratégie
  machine, admin requis) puis redémarrer :
  ```powershell
  reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v AllowEdgeSwipe /t REG_DWORD /d 0 /f
  ```

## 4. Vérifier le mode hors-ligne

Débrancher le câble réseau / couper le Wi-Fi, redémarrer le PC, et confirmer
que la borne s'ouvre seule et que **le Mémorial affiche bien les noms**
(c'est lui qui charge ses données en `fetch` local — le vrai test hors-ligne).

## 5. Le test qui valide toute la chaîne (à faire une fois avant l'ouverture)

Borne allumée et fonctionnelle : **couper la multiprise, la remettre, et ne
plus toucher à rien.** Si le Mémorial s'affiche seul quelques minutes plus
tard, les six maillons du §3 sont bons d'un coup. Si l'écran reste noir, c'est
le réglage BIOS ; s'il s'arrête sur l'écran de connexion, c'est la connexion
automatique ; s'il ouvre le bureau sans la borne, c'est la tâche planifiée.

C'est le test à refaire après tout changement sur la machine — c'est
exactement ce qui se produit chaque soir pendant l'exposition.

## 6. Diagnostic du tactile à deux utilisateurs

[test-tactile.html](test-tactile.html) s'ouvre par double-clic (aucun serveur,
aucun réseau) et dessine un disque sous chaque doigt. Deux personnes touchent
les deux moitiés en même temps, plusieurs fois : la page affiche l'écart médian
entre le premier et le second contact.

À lire ainsi — **c'est le préalable à toute optimisation du code**, une latence
matérielle ne se corrigeant pas en logiciel :

- écart proche de 0 ms → la dalle rapporte bien les contacts simultanément,
  une lenteur ressentie dans l'application vient de l'application ;
- écart de plusieurs dizaines de ms, reproductible → l'écran ou son pilote
  sérialise les contacts éloignés ;
- « doigts simultanés (max) » bloqué à 1 → le multi-touch n'est pas actif.

## 7. En cas de plantage pendant la journée

L'application se recharge toute seule : [src/utils/watchdog.ts](../../src/utils/watchdog.ts)
écoute les erreurs non rattrapées et rappelle la page. Après trois
rechargements consécutifs — donc une panne qui se reproduit — elle renonce et
affiche un écran sobre « Borne momentanément indisponible », avec le détail
technique en petit en bas de l'écran : **c'est ce texte qu'il faut relever ou
photographier** avant de redémarrer, il est perdu ensuite.

Redémarrer la borne : fermer la session (`Ctrl`+`Alt`+`Suppr`) et la rouvrir,
ou redémarrer le PC — la tâche ONLOGON refait le reste.
