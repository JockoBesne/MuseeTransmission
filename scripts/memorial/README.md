# Mémorial — modifier les listes de noms

Deux publics, deux procédures :

- **Personnel du musée** : tout se fait **sur la borne**, à l'écran, avec une
  clé USB — aucune compétence technique requise (section 1).
- **Développeur** : outils en ligne de commande et resynchronisation depuis le
  fichier de recherche (sections 2 et 3).

---

## 1. Personnel du musée : modifier depuis la borne

### Préparer le fichier

Un fichier Excel `.xlsx`, **nommé comme vous voulez**, avec une seule feuille
et **exactement ces 4 colonnes en ligne 1** :

| A | B | C | D |
|---|---|---|---|
| Nom | Prénom | Date de décès | Grade |

- **Nom** : obligatoire (mis en majuscules automatiquement).
- **Prénom**, **Grade** : facultatifs.
- **Date de décès** : `JJ/MM/AAAA`, ou l'année `AAAA`, ou vide.
- **Colonne E « Conflit » (facultative)** : théâtre d'opération affiché sous le
  nom (utilisée par le fichier Opex : Levant, Ex-Yougoslavie, Tchad,
  Afghanistan…). Si elle existe, son en-tête doit être exactement `Conflit` ;
  les quatre autres fichiers n'en ont pas besoin.
- L'ordre des lignes n'a pas d'importance (tri alphabétique automatique).
- Pas de formules, pas de cellules fusionnées, pas d'autres feuilles.

Ce format a été volontairement figé pour que la borne puisse vérifier le
fichier de façon sûre : tout écart (colonnes renommées, déplacées…) est
refusé avec un message explicite, rien n'est écrasé en cas d'erreur.

Astuce : le plus simple est de repartir du dernier fichier importé — il est
conservé sur la borne dans `borne-data/uploads/` (déjà au bon format, avec
tous les noms) — et d'y ajouter les nouvelles lignes à la fin.

⚠️ **Le fichier déposé remplace TOUTE la liste de la catégorie choisie** —
la borne affiche uniquement les noms qu'il contient. Il doit donc contenir la
liste complète (les noms existants + les ajouts), jamais seulement les
nouveaux noms. C'est voulu : une seule source par catégorie, aucun risque de
doublon par fusion. D'où l'astuce ci-dessus : repartir du dernier fichier
importé et y ajouter les nouvelles lignes.

### Sur la borne

1. Maintenir le doigt **5 secondes sur le coin en haut à droite** de l'écran,
   puis saisir le **code du personnel** sur le pavé numérique
   (code par défaut : `1205` — modifiable dans
   `src/components/Admin/AdminPin.tsx`, constante `ADMIN_PIN`, puis rebuild).
2. Toucher **« Modifier le mémorial »**.
3. Brancher la clé USB et **glisser le fichier** dans la zone de dépôt
   (ou toucher la zone pour le chercher).
4. **Toucher la liste à remplacer** (1ère GM, 2ème GM, Indochine, Algérie ou
   Opex). Le fichier est automatiquement associé et renommé pour cette liste.
5. Lire les **vérifications** : nombre de noms, lignes à corriger (chaque
   problème indique le numéro de ligne Excel), aperçu du résultat.
   - Fichier refusé (mauvais type ou mauvaises colonnes) : rien n'est modifié.
   - Avertissements : les lignes concernées sont importées sans date ou
     ignorées, au choix de corriger avant ou après.
6. Toucher **« Remplacer les N noms »** → le Mémorial est à jour
   immédiatement, sans redémarrage.
7. Toucher **« Terminer — affichage borne »** pour rendre l'écran aux
   visiteurs (retour automatique après 5 minutes d'inactivité de toute façon).

---

## 2. Développeur : fonctionnement et outils

```
Écran admin de la borne ──► borne-data/data/memorial/*.json   (prioritaire)
                            borne-data/uploads/memorial-<cat>.xlsx (copie renommée)
data-memorial/*.xlsx  ──► npm run import-memorial ──► public/data/memorial/*.json
                                                      (version par défaut du build)
```

- Le serveur de la borne (`npm run borne`, port 3210) sert `dist/` **et**
  l'API admin ; il sert les JSON du Mémorial en privilégiant `borne-data/`
  (écrit par l'écran admin) sur la version du build. `Memorial.tsx` charge
  ces JSON en `fetch` à l'exécution — ils ne sont plus bundlés.
- La validation (colonnes exactes, Nom obligatoire, formats de dates) vit à
  UN seul endroit : [server/memorial-import.mjs](../../server/memorial-import.mjs),
  partagé entre l'API et le CLI `npm run import-memorial`
  (data-memorial/*.xlsx → public/data/memorial/*.json).
- **Ne jamais éditer les JSON à la main** — toujours via un Excel + import.
- Rien ne tourne au lancement de l'app : import uniquement sur action humaine.
- Pour rapatrier dans le dépôt les modifications faites sur la borne :
  récupérer `borne-data/uploads/memorial-<cat>.xlsx`, le copier dans
  `data-memorial/`, lancer `npm run import-memorial`.

### Déploiement borne

```bash
npm install && npm run build
npm run borne        # http://localhost:3210
```

Configurer Windows pour lancer `npm run borne` au démarrage (Planificateur de
tâches : « Au démarrage », `npm --prefix C:\chemin\musee-transmissions run borne`),
puis ouvrir Chrome/Edge en mode kiosque sur `http://localhost:3210`.
Le serveur n'écoute qu'en local : la borne reste 100 % hors-ligne.
Variables : `PORT` (défaut 3210), `BORNE_DATA` (défaut `<projet>/borne-data`).

---

## 3. Cas exceptionnel : resynchroniser depuis l'ODS de la recherche

Si le classeur ODS historique (« Mort_pour_la_France-8_Genie… ») évolue :

```bash
npm run memorial-extract -- "C:\chemin\vers\le\fichier.ods"
npm run import-memorial
```

⚠️ Écrase les 5 Excel de `data-memorial/` (retouches manuelles perdues).
Prérequis : Python 3 + `pip install openpyxl pandas odfpy`.
Règles de filtrage (validées le 18/07/2026) : flag colonne A = 1 sur les
feuilles à flag numérique ; lignes nominatives sur les petites feuilles Opex
sans flag ; `Feuille25` exclue ; Riff / AOF / Cameroun vides (aucun flag 1).

## Format du JSON généré

Tableau trié d'objets `{nom, prenom, role, annee, date}` (`role` = grade,
`annee` déduite de la date).
