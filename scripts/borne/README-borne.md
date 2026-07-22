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

Enregistrer la tâche **à l'ouverture de session** (adapter le chemin) :

```powershell
schtasks /Create /TN "Borne Musee" /SC ONLOGON /F /TR ^
 "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"C:\borne\MuseeTransmission\scripts\borne\start-borne-kiosk.ps1\""
```

> Chrome à la place d'Edge : remplacer `msedge.exe` par
> `chrome.exe` dans le script et retirer `--edge-kiosk-type=fullscreen`.
> Quitter le kiosque pour l'admin : `Ctrl`+`Alt`+`Suppr` puis fermer la session,
> ou brancher un clavier et `Alt`+`F4`.

## 3. Réglages Windows pour un fonctionnement 24/7

- **Connexion automatique** (sinon la tâche ONLOGON ne se déclenche pas seule) :
  `netplwiz` → décocher « Les utilisateurs doivent entrer un nom… » → saisir le
  mot de passe du compte. *(À faire par toi : réglage de compte.)*
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

## 4. Vérifier le mode hors-ligne

Débrancher le câble réseau / couper le Wi-Fi, redémarrer le PC, et confirmer
que la borne s'ouvre seule et que **le Mémorial affiche bien les noms**
(c'est lui qui charge ses données en `fetch` local — le vrai test hors-ligne).
