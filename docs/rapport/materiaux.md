# Matériaux — Rapport de stage « Musée des Transmissions »

Document de travail **purement factuel** (Phase 1). Chaque affirmation renvoie à
un fichier du dépôt ou à une commande Git/shell reproductible. Les informations
que le dépôt ne peut pas fournir sont marquées `[À COMPLÉTER : …]` ; les
hypothèses à confirmer, `[À VÉRIFIER : …]`.

Dépôt analysé : `C:\Users\MasterChen\Documents\RESSOURCESSTAGE\Stage\MuseeTransmission`
État Git au moment de l'analyse : branche `main`, arbre propre, HEAD `16f95e1`.

---

## 1. Stack réelle

### 1.1 Métadonnées et scripts (`package.json`)

- `name` : `musee-transmissions` — `private: true` — `type: module` — `version: 0.0.0`.
- Application **React 19 + TypeScript**, empaquetage **Vite**, lint **Oxlint**.

| Script npm | Commande | Rôle (vérifié dans le code) |
|---|---|---|
| `dev` | `vite` | Serveur de développement Vite (HMR). |
| `build` | `tsc -b && vite build` | Vérification de types projet-références puis build de production dans `dist/`. |
| `lint` | `oxlint` | Analyse statique (config `.oxlintrc.json`). |
| `preview` | `vite preview` | Sert le `dist/` déjà construit. |
| `import-docx` | `node scripts/import-docx.mjs` | **Chaîne morte** (voir §3.4) : convertissait `public/data/A.docx` en `src/data/memorial-1gm.json`. Les deux fichiers sont absents du dépôt ; le script subsiste. |
| `memorial-extract` | `python scripts/memorial/extract_from_ods.py` | Découpe un ODS maître « Morts pour la France » en **5** Excel « propres » (`FICHIERS_CATEGORIE` de `common.py` : 1GM, 2GM, Indochine, Algérie, Opex ; docstring « -> 5 Excel propres »). **N'inclut PAS l'Entre-deux-guerres** (cf. incohérence §6.5). 4 colonnes, tri alphabétique, filtrage daté « validé le 18/07/2026 ». |
| `import-memorial` | `node server/import-cli.mjs` | CLI : `data-memorial/*.xlsx` → `public/data/memorial/*.json` via la validation partagée `server/memorial-import.mjs` (dépendance `exceljs`). |
| `borne` | `node server/borne-server.mjs` | Serveur local hors-ligne (port 3210) : sert `dist/` + API de l'écran d'administration du Mémorial. |

### 1.2 Dépendances — versions déclarées et résolues

Versions déclarées lues dans `package.json` ; versions résolues lues dans
`package-lock.json` (commande : `grep -A3 '"node_modules/<paquet>":' package-lock.json`).

| Paquet | Déclaré | Résolu (lock) | Usage |
|---|---|---|---|
| `react` | `^19.2.7` | `19.2.7` | UI. |
| `react-dom` | `^19.2.7` | `19.2.7` | Rendu DOM (`createRoot`, `src/main.tsx`). |
| `react-icons` | `^5.7.0` | `5.7.0` | Icône fauteuil `FaWheelchair` (bouton PMR, `src/App.tsx:2`) — seul usage repéré. |
| `exceljs` | `^4.4.0` | `4.4.0` | Lecture/validation des `.xlsx` du Mémorial (`server/memorial-import.mjs`). |

Dépendances de développement :

| Paquet | Déclaré | Résolu (lock) | Note |
|---|---|---|---|
| `vite` | `^8.1.0` | `8.1.0` | Empaquetage. |
| `@vitejs/plugin-react` | `^6.0.2` | `6.0.3` | Plugin React pour Vite. |
| `typescript` | `~6.0.2` | `6.0.3` | Compilateur. |
| `oxlint` | `^1.69.0` | `1.72.0` | Linter. |
| `mammoth` | `^1.12.0` | `1.12.0` | **Uniquement** pour la chaîne morte `import-docx` (§3.4). |
| `@types/geojson` | `^7946.0.16` | — | Types GeoJSON (carte). |
| `@types/node` | `^24.13.2` | — | Types Node (scripts/serveur). |
| `@types/react` | `^19.2.17` | `19.2.17` | — |
| `@types/react-dom` | `^19.2.3` | — | — |

Aucune bibliothèque cartographique (Leaflet, etc.) ni framework UI/CSS n'est
présent dans les dépendances finales (voir la trace de retrait en §6.1).

### 1.3 Configuration TypeScript

- `tsconfig.json` : projet à références, délègue à `tsconfig.app.json` (code `src/`)
  et `tsconfig.node.json` (outillage).
- `tsconfig.app.json` : `target/lib` **ES2023 + DOM**, `module esnext`,
  `moduleResolution "bundler"`, `jsx "react-jsx"`, `noEmit`, `verbatimModuleSyntax`.
  Contrôles activés : `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`.
- `[À VÉRIFIER : le mode global "strict": true n'apparaît pas explicitement dans
  tsconfig.app.json (seuls des contrôles ciblés y figurent). Vérifier s'il est
  hérité ailleurs ; sinon, la formule « TypeScript strict » du guide projet est
  à nuancer dans la rédaction.]`

### 1.4 Lint (`.oxlintrc.json`)

- Plugins `react`, `typescript`, `oxc`.
- Règles : `react/rules-of-hooks: error`,
  `react/only-export-components: warn` (avec `allowConstantExport`).

---

## 2. Arborescence commentée de `src/` (profondeur 3)

Commentaires établis à partir de la **lecture du code**, non des noms de fichiers.
Comptage : `find src -maxdepth 3 -type f`.

### 2.1 Racine applicative

| Fichier | Rôle | CSS associé |
|---|---|---|
| `src/main.tsx` | Point d'entrée : `createRoot` en `StrictMode` ; **bloque le menu contextuel** (`contextmenu`) pour le mode kiosque ; importe `fonts.css` puis `index.css`. | `fonts.css`, `index.css` |
| `src/App.tsx` | Compose l'écran scindé 50/50, gère le **mode veille** (`INACTIVITY_MS = 3 min`, retour à l'onglet Mémorial), le **mode PMR** (bascule de la barre d'onglets avec animation FLIP), et l'**accès administration** (appui long 5 s coin haut-droit → `AdminPin`/`AdminHub`/`MemorialAdmin`, retour auto après 5 min). Précharge les images des fiches au démarrage. | `App.css` |
| `src/types.ts` | Types partagés du domaine : `TimelineEvent`, `UniteMedia`, `Unite`, `City`, `ZoneProps`, `LabelDirection`. | — |
| `src/index.css`, `src/App.css`, `src/fonts.css` | Reset/box-sizing, plein écran sans défilement de page, `user-select:none` (sauf champs), déclarations `@font-face` (Raleway, Nunito). | — |
| `src/vite-env.d.ts` | Déclaration d'ambiance Vite. | — |

`App.tsx` — props clés : `LeftPanel` sans props ; `InteractiveMap` reçoit
`pmrMode: boolean` ; `AdminPin`/`AdminHub`/`MemorialAdmin` reçoivent des
callbacks de navigation (`onValide`, `onAnnule`, `onBorne`, `onMemorial`, `onRetour`).

### 2.2 `src/components/map/` — panneau gauche, onglet Carte

| Fichier | Rôle | CSS | Props principales |
|---|---|---|---|
| `InteractiveMap.tsx` | Carte SVG de la France sans bibliothèque : **projection Web Mercator écrite à la main** (§4.1), placement d'étiquettes avec évitement de collisions, **zones régionales tactiles** avec zoom animé du `viewBox` (`requestAnimationFrame`), tiroir-index des villes (mode PMR). | `InteractiveMap.css` | `pmrMode: boolean` |
| `CardDialog.tsx` | Pop-up d'une ville : onglets d'unités, corps défilant avec indicateur de fin, **lightbox** (pucelle + galerie image/vidéo), **piège de focus** clavier et restauration du focus à la fermeture. | `CardDialog.css` | `city: City`, `onClose: () => void` |

### 2.3 `src/components/Memorial/` — panneau gauche, onglet Mémorial

| Fichier | Rôle | CSS | Props principales |
|---|---|---|---|
| `Memorial.tsx` | Liste défilante des noms (rAF), 6 catégories, **roue 3D** de sélection de guerre (rotation continue, glissement tactile), voile de transition en boucle, recherche filtrante temps réel, chargement des données **par `fetch`** à l'exécution. | `Memorial.css` | aucune |
| `VirtualKeyboard.tsx` | Clavier AZERTY maison (la borne n'a pas de clavier physique) : produit la prochaine valeur via `onChange`, aucune logique de recherche embarquée. | `VirtualKeyboard.css` | `value`, `onChange`, `onClose` |

### 2.4 `src/components/Timeline/` — panneau droit, frise

| Fichier | Rôle | CSS | Props principales |
|---|---|---|---|
| `Timeline.tsx` | Frise verticale à défilement automatique **en boucle sans couture** (deux copies + jalon de fin), `IntersectionObserver` pour les animations d'entrée (pas de re-render par frame), index de sections escamotable, saut animé vers une section. | `Timeline.css` | aucune |
| `TimelineDialog.tsx` | Fiche d'un jalon : navigation précédent/suivant circulaire, barre de progression chronologique, **fermeture automatique** après 3 min d'inactivité, gestion du focus/Échap. | `TimelineDialog.css` | `event`, `prevEvent`, `nextEvent`, `contentKey`, `progress`, `onPrev`, `onNext`, `onClose` |

### 2.5 `src/components/Admin/` — administration (accès personnel)

| Fichier | Rôle | CSS | Props principales |
|---|---|---|---|
| `AdminPin.tsx` | Pavé numérique tactile ; PIN en dur `ADMIN_PIN = '1205'` ; validation au dernier chiffre via effet (anti double-validation). | `Admin.css` | `onValide`, `onAnnule` |
| `AdminHub.tsx` | Hub à deux choix : « Affichage borne » / « Modifier le mémorial ». | `Admin.css` | `onBorne`, `onMemorial` |
| `MemorialAdmin.tsx` | Dépôt d'un `.xlsx` (glisser-déposer), choix de catégorie, **validation + aperçu** via l'API borne (`POST /validate`, `PUT /<catégorie>`), machine à états `depot→analyse→apercu→remplacement→succes`. | `Admin.css` | `onRetour`, `onBorne` |

### 2.6 `src/utils/`

| Fichier | Rôle |
|---|---|
| `ordinals.tsx` | `Ord`/`formatOrdinals` : passe les suffixes ordinaux français (`28e`, `1er`, `1ère`…) en exposant `<sup>` par expression régulière. |
| `richText.tsx` | `RichText` : balisage léger `_mot_` → `<em>` (mots étrangers en italique), puis délègue aux ordinaux. |
| `preloadImages.ts` | `preloadCardImages` : précharge (idempotent) toutes les images des fiches déclarées dans `villes.json`. |

### 2.7 `src/data/` et `src/assets/`

- `src/data/` : `villes.json`, `france-contour.json`, `regions-zones.json`,
  `timeline.json` (détails en §3).
- `src/assets/fonts/` : 6 fichiers `.woff2` (Raleway, Nunito, sous-ensembles
  latin/latin-ext) ; `hero.png`, `react.svg`, `vite.svg` (ces deux SVG
  paraissent hérités du gabarit Vite — `[À VÉRIFIER : encore référencés ?]`).

---

## 3. Architecture des données

### 3.1 `villes.json` — carte des unités

- Format : GeoJSON `FeatureCollection<Point, City>` (typé
  `InteractiveMap.tsx:11`). Chaque `Feature` = une ville (`geometry.coordinates`
  en `[lng, lat]`) portant `properties: City` (`nom`, `labelDir?`, `entites: Unite[]`).
- Volume vérifié : **24 villes** (`grep -c '"type": "Feature"'`) pour
  **32 unités/onglets** (`grep -c '"regiment"'`).
- `Unite` (`src/types.ts:25`) : `regiment`, `abrege?`, `texte` (devise),
  `histoire`, `specificite`, `garnison`, `photo?`, `photoDescription?`,
  `medias?` (`{ type: 'image'|'video', src, legende?, poster? }`).
- Origine : saisie manuelle. L'historique la relie à l'« Almanach 2026 »
  (commit `18e1e8b`, 2026-07-15, « Intègre les unités de l'Almanach 2026 »,
  +639/−45 lignes). `[À VÉRIFIER : intitulé/édition exacts de cette source
  documentaire fournie par le musée.]`
- **Exactitude du contenu** : le guide projet signale que des numéros/noms
  d'unités restent à corriger d'après une liste validée par le musée, et que
  deux `medias` du 8ᵉ RT sont des exemples de substitution. → à ne pas présenter
  comme définitif. `[À VÉRIFIER : version de villes.json validée par le musée.]`

### 3.2 `france-contour.json` — tracé du littoral/frontières

- Format : GeoJSON `Feature<MultiPolygon>` (typé `InteractiveMap.tsx:10`),
  coordonnées géographiques haute précision (~2 000 points ;
  `grep -o ',' … | wc -l` → 4056 séparateurs). Sur une seule ligne (minifié).
- Utilisé uniquement pour tracer le contour et **calculer les bornes** de la
  projection (`bounds`, `InteractiveMap.tsx:24-38`).
- Introduit au commit `48b6625` (2026-06-30, « contour de la map »).
- `[À COMPLÉTER : provenance exacte du tracé (fournisseur, licence, niveau de
  généralisation) — non déductible du dépôt.]`

### 3.3 `regions-zones.json` et `timeline.json`

- `regions-zones.json` : `FeatureCollection<Polygon, ZoneProps>` (`code`, `nom`),
  minifié. **4 zones** : Île-de-France (`11`), Puy-de-Dôme (`63`), Alsace (`67`),
  Ille-et-Vilaine (`35`). L'Île-de-France est **exclue** des zones tactiles par
  un filtre `code !== '11'` (`InteractiveMap.tsx:265`). Sert à zoomer sur les
  secteurs denses. `[À VÉRIFIER : provenance des polygones départementaux.]`
- `timeline.json` : tableau de `TimelineEvent` (`section`, `annee`, `titre`,
  `texte`). **14 jalons** (`grep -c '"annee"'`), de 1875 à aujourd'hui. Texte
  historique rédigé (mentionne p. ex. la loi du 13 mars 1875, G. Ferrié, la TSF
  depuis la Tour Eiffel). `[À VÉRIFIER : sources historiques de ces notices —
  à faire valider par le musée, cf. contrainte « ne rien inventer ».]`

### 3.4 Mémorial — deux pipelines (l'un mort, l'un vivant)

**Pipeline mort (`import-docx`)** — remplacé, vestiges à supprimer :
`public/data/A.docx` → `scripts/import-docx.mjs` (via `mammoth`, analyse
heuristique : NOM en majuscules, année `19\d\d`, rôle par mots-clés de grade)
→ `src/data/memorial-1gm.json`.
État vérifié : `A.docx` **absent**, `src/data/memorial-1gm.json` **absent**
(supprimé au commit `2a23a94`, −9374 lignes) ; en revanche
`scripts/import-docx.mjs` et le script npm `import-docx` **subsistent** (code mort).

**Pipeline vivant (Excel → JSON → fetch)** :

1. `scripts/memorial/extract_from_ods.py` (+ `common.py`) : un ODS maître
   « Morts pour la France » → **5** `.xlsx` « propres » dans `data-memorial/`
   (colonnes imposées **Nom, Prénom, Date de décès, Grade** ; l'Opex ajoute
   une 5ᵉ colonne **Conflit**). Le dossier `data-memorial/` contient pourtant
   **6** fichiers : le 6ᵉ, `memorial-entre-deux-guerres.xlsx`, ne provient pas de
   ce script (cf. incohérence §6.5). Filtrage documenté et daté dans le script.
2. `server/import-cli.mjs` (`npm run import-memorial`) : `data-memorial/*.xlsx`
   → `public/data/memorial/*.json`, via `server/memorial-import.mjs`.
3. `server/memorial-import.mjs` — **source de vérité unique de validation**,
   partagée par le CLI et le serveur borne : 1 feuille, colonnes exactes,
   date `JJ/MM/AAAA` ou `AAAA`, `Nom` obligatoire, **refus si aucun nom valide**
   (garde-fou anti-écrasement), tri alphabétique insensible aux accents,
   `Nom` mis en capitales.
4. À l'exécution, `Memorial.tsx` charge `public/data/memorial/<cat>.json` par
   `fetch` (`Memorial.tsx:81-91`) — plus aucune donnée dans le bundle.
5. Sur la borne, `server/borne-server.mjs` sert d'abord la version déposée via
   l'admin (`borne-data/`), sinon celle du build ; l'`.xlsx` déposé est archivé
   renommé dans `borne-data/uploads/`.

Volumes actuels (`grep -c '"nom"' public/data/memorial/*.json`) :
1GM **1742**, 2GM **1450**, Indochine **283**, Algérie **122**,
Opex **11**, Entre-deux-guerres **7**.
(Comptages techniques ; aucun nom de personne n'est reproduit dans ce document.)

### 3.5 Types TypeScript et points de validation

- Types de la carte : `City`, `Unite`, `UniteMedia`, `ZoneProps`,
  `LabelDirection` (`src/types.ts`). Type de la frise : `TimelineEvent`.
- Le type `Soldat` du Mémorial est défini **localement** dans `Memorial.tsx:8`
  (pas dans `types.ts`), avec une fonction `normalizeSoldat` tolérante
  (accepte `nom`/`Nom`, filtre les entrées sans nom).
- **Validation présente** : côté Excel (`memorial-import.mjs`) — structure,
  colonnes, dates, garde-fou « aucun nom ». Côté carte/frise : **aucune
  validation à l'exécution** ; les JSON sont importés directement et castés
  (`as FeatureCollection…`, `as TimelineEvent[]`). Une donnée `villes.json`
  malformée n'est pas détectée au chargement. `[À VÉRIFIER : est-ce un choix
  assumé (données maîtrisées, build vérifié) à documenter ?]`

---

## 4. Points techniques non triviaux

### 4.1 Projection Web Mercator écrite à la main

- `mercator([lng,lat])` (`InteractiveMap.tsx:18-22`) : formule standard
  (`x = λ·π/180`, `y = ln(tan(π/4 + φ·π/360))`).
- `bounds` calculées en parcourant tout le contour (`:24-38`), puis `scale` et
  `project()` ramènent les coordonnées dans un `viewBox` SVG de largeur `800`
  avec marge `PAD = 24` (`:40-48`). Aucune dépendance cartographique.
- Test **point-dans-polygone par lancer de rayon** `pointInRing` (`:131-139`)
  pour rattacher une ville à une zone et pour placer le filigrane de région.

### 4.2 Placement d'étiquettes anti-collision

- `placeLabels` (`:146-205`) : essaie la direction préférée `labelDir`, puis les
  autres axes, puis 8 diagonales sur deux rayons, en refusant tout chevauchement
  avec étiquettes, marqueurs, zones et bords (`hit`, `inter`). Facteur d'unité
  `u = view.w / VIEW_W` pour garder des **tailles constantes à l'écran** au zoom.
- `watermarkSpot` (`:214-243`) cherche un point du département où le nom tient
  entièrement dans le polygone et loin des villes.

### 4.3 Défilement/animation en `requestAnimationFrame` + nettoyage

- Mémorial (`Memorial.tsx:219-250`) : défilement par rAF piloté par un booléen
  `shouldScroll` (pause si recherche, survol, toucher, clavier, transition,
  menu) ; `cancelAnimationFrame` au changement d'état et au démontage.
- Frise (`Timeline.tsx:63-124`) : **une seule** boucle rAF gère défilement, saut
  animé, recalage de boucle infinie et détection de section ; annulée au
  démontage. Animations d'entrée déléguées à un `IntersectionObserver`
  (`:128-141`) pour éviter un re-render par frame.
- Carte (`InteractiveMap.tsx:413-430`) : `animateTo` interpole le `viewBox`
  (ease-in-out cubique) ; `rafRef` annulé dans le cleanup (`:406-411`).
- Timers : transitions du Mémorial purgées au démontage
  (`Memorial.tsx:156-159`) ; minuteurs de veille/admin nettoyés
  (`App.tsx:63-84`, `:158-173`) ; fermeture auto de `TimelineDialog`
  (`:54-65`). Cohérent avec la contrainte « app en continu, pas de fuite ».

### 4.4 Tactile plutôt que survol ; blocages kiosque

- Toutes les actions passent par `onClick`/`onTouch*`/`onPointer*` + gestion
  clavier (`Enter`/`Espace`) sur les éléments `role="button"`
  (villes et zones, `InteractiveMap.tsx:466-475`, `:576-581`).
- `:hover` reste présent dans les CSS (34 occurrences,
  `grep -rn ':hover' src --include=*.css`) mais **en complément** du toucher,
  jamais comme unique accès à une information.
- Kiosque : `main.tsx:9` bloque le menu contextuel ; `index.css:19-28`
  désactive la sélection de texte (sauf champs) ; l'input de recherche porte
  `inputMode="none"` (`Memorial.tsx:373`) pour bloquer le clavier tactile
  Windows ; le lanceur `scripts/borne/start-borne-kiosk.ps1` ouvre Edge
  `--kiosk` avec gestes tactiles neutralisés et relance automatique.

### 4.5 Dimensionnement / rendu 4K — état réel

- **La consigne évoquait `clamp()` : il n'y en a aucun** — ni `clamp()`, ni
  unités `vw`/`vh` dans les CSS (`grep -rl 'clamp(\|vw\|vh' src --include=*.css`
  → aucun résultat exploitable). Les tailles sont en `rem`/`px` fixes.
- La mise à l'échelle sur le 65″ 3840×2160 repose donc sur : le plein écran
  kiosque d'Edge, le zoom éventuel du navigateur, et — pour la carte — le
  `viewBox` SVG en `preserveAspectRatio="xMidYMid meet"` (`InteractiveMap.tsx:528`)
  qui met la carte à l'échelle du conteneur, avec le facteur `u` pour garder
  marqueurs et étiquettes à taille d'écran constante.
- `[À VÉRIFIER : comment la taille de caractères est réglée pour le 4K —
  commits `9836efb` « maj taille caractere » (ajuste des valeurs dans
  `Memorial.css`/`InteractiveMap.css`) mais pas de stratégie responsive
  centralisée. À décrire honnêtement comme « valeurs ajustées empiriquement ».]`

### 4.6 Recherche filtrante du Mémorial

- Filtre en temps réel sur `nom`/`prenom`, insensible à la casse
  (`Memorial.tsx:270-275`) ; la saisie remet le défilement à zéro et le met en
  pause ; compteur « X résultats · Y inscrits » (`:437-445`).

### 4.7 Autres points notables

- **Animation FLIP** de la barre d'onglets au basculement PMR
  (`App.tsx:44-61`) : capture de position avant le flip `column`/`column-reverse`,
  rejeu du déplacement, respect de `prefers-reduced-motion`.
- **Roue 3D** de sélection de guerre : rotation cumulée jamais remise à zéro
  pour toujours tourner « du plus court côté » (`Memorial.tsx:185-197`),
  glissement tactile qualifié (seuil + dominante horizontale, `:199-204`).
- **Piège de focus** et restauration du focus dans `CardDialog`
  (`:66-100`) — accessibilité clavier des modales.

---

## 5. Analyse Git

### 5.1 Cadre temporel

Commande : `git log --reverse --date=short --pretty="%ad %h %s"`.

- Premier commit : **2026-06-30** `bf7ccc4` « création du projet ».
- Dernier commit : **2026-07-22** `16f95e1` « retrait selection tactile ».
- Total : **107 commits** (`git rev-list --count HEAD`).
- Jours actifs : **10** (`git log --date=short --pretty=%ad | sort -u | wc -l`) :
  30/06, 01/07, 02/07, 06/07, 07/07, 08/07, 15/07, 20/07, 21/07, 22/07.
- Contributeurs (`git shortlog -sn --all`) : **cadji 47**, **JockoBesne 38**,
  **rkNyAvo 24**, **Jaffré Paul 2**. **L'auteur du rapport est `cadji` (alias
  BBCypher)** — contributeur le plus actif (43 commits hors fusion). Périmètre
  détaillé en §5.5. `[À COMPLÉTER : rôles/identités réelles des autres
  contributeurs si tu souhaites les nommer dans le rapport.]`
- **20 commits de fusion** (`grep -ci merge`) : travail par branches
  (`feature-carte-interactive`, `features/split-screen`, `features/design`,
  `features/accessibilté`…), donc collaboratif.

### 5.2 Répartition thématique

Comptage indicatif par mots-clés sur les messages (`git log --pretty=%s | grep -ci …` ;
les catégories se recoupent, un commit pouvant porter plusieurs thèmes) :

| Thème | ~Occurrences | Messages réels représentatifs |
|---|---|---|
| Carte / villes / zones / pop-up / PMR | ~53 | « contour de la map », « ajout label villes », « zones regionales tactiles … + zoom anime », « Retire tout désencombrement » |
| Mémorial / guerres / roue | ~16 | « Memorial », « Mémorial 5guerres … », « caroussel memorial », « roue de sélection élargie » |
| Style / design / polices / typo | ~13 | « polices Raleway et Nunito auto-hébergées », « maj taille caractere », « mettre en minuscule les exposants » |
| Données / import / insignes | ~5 | « Intègre les unités de l'Almanach 2026 », « Ajout des insignes BANC et CATNC » |
| Admin / borne / kiosque | ~4 | « Admin mdp hub et modif en local », « mode kiosque » |
| Frise | ~2 | « Ajout timeline », « Frise modifié demarquation … fin » |
| Correctifs (`fix`/`corr`) | ~8 | « fix zoom de la carte », « fix: la mise en veille réinitialise le Mémorial » |
| Documentation | ~10 | commits `docs:` de mise à jour du guide projet |

Lecture : la **carte** concentre l'essentiel de l'effort, le **Mémorial** vient
ensuite, la **frise** est plus ponctuelle. Beaucoup de fusions → intégration
continue de plusieurs branches.

### 5.3 Qualité des messages

Hétérogène : certains sont précis et conventionnels (`feat:`, `fix:`, `docs:`),
d'autres très pauvres (« memo », « commit mer », « changement mineur »,
« f1c7988 commit mer »). Pour reconstruire les jalons, on s'appuie donc sur le
**contenu des diffs** (`git show --stat`) plus que sur les libellés.

### 5.4 Commits structurants (date · hash · message · fichiers)

`git show --stat` sur chaque commit.

1. **2026-06-30 `bf7ccc4`** « création du projet » — squelette Vite+React+TS
   (19 fichiers, +1965 ; `App.tsx`, `App.css`, `index.css`, configs).
2. **2026-06-30 `0af5b49`** « add leaflet » — ajout de **Leaflet** à
   `package.json`/lock (piste ensuite abandonnée, cf. §6.1).
3. **2026-06-30 `48b6625`** « contour de la map » — **carte SVG maison** :
   première version d'`InteractiveMap.tsx` + `france-contour.json`.
4. **2026-06-30 `aa7e152`** « Memorial » — premier Mémorial + **chaîne
   `import-docx`** (`scripts/import-docx.mjs`, `public/data/memorial-1gm.json`
   à 9374 lignes, `Memorial.tsx`/`.css`).
5. **2026-07-02 `35e3858`** « intégration CardDialog avec zoom photo » —
   pop-up `CardDialog`, refonte d'`InteractiveMap`, **retrait de Leaflet**,
   ajout de `src/types.ts`, déplacement de `memorial-1gm.json` vers `src/data/`.
6. **2026-07-06 `efdbd18`** « polices Raleway et Nunito auto-hébergées » —
   6 `.woff2` + `fonts.css` (hors-ligne strict).
7. **2026-07-06 `9ea5580`** « clavier virtuel AZERTY » — `VirtualKeyboard.tsx`/`.css`.
8. **2026-07-07 `acc8f24`** « Ajout timeline » — `Timeline`/`TimelineDialog`
   + `timeline.json` (+1225).
9. **2026-07-15 `18e1e8b`** « Intègre les unités de l'Almanach 2026 » —
   `villes.json` (+639/−45).
10. **2026-07-20 `1564d4e`** « zones regionales tactiles … + zoom anime » —
    `regions-zones.json` + gros remaniement d'`InteractiveMap` (+453/−79 sur le `.tsx`).
11. **2026-07-20 `7115376`** « Mémorial 5guerres … Admin mdp hub et modif en
    local » — **le plus gros commit** (34 fichiers, +45685) : serveur borne,
    validation `exceljs` partagée, écrans Admin, pipeline Python, Mémorial
    multi-guerres.
12. **2026-07-22 `2a23a94`** « memorial a jour + suppression de l'ancien fichier
    1er GM » — **suppression** de `src/data/memorial-1gm.json` (−9374).
13. **2026-07-22 `a36b60c`** « roue de sélection élargie … » — refonte visuelle
    du sélecteur de guerre (`Memorial.css` +117/−22).
14. **2026-07-22 `829a11b`** « mode kiosque » — `start-borne-kiosk.ps1`
    + `README-borne.md`.

### 5.5 Périmètre de l'auteur (cadji / BBCypher)

Attribution par auteur des commits (`git log --author=cadji --no-merges`,
`git log --pretty=%an -- <chemin>`). **Réserve** : l'auteur d'un commit n'est pas
forcément l'auteur de chaque ligne (travail en binôme, fusions) —
`[À VÉRIFIER : confirmer ce partage, en particulier sur le fichier carte partagé.]`

**Réalisé par l'auteur (à mettre en avant dans « Contributions ») :**

- **Architecture de l'écran scindé 50/50** — `0f09a9e` « split screen v0 »,
  `0c7ac1d ` (App.tsx, 5 commits).
- **Pop-up de fiche `CardDialog` + zoom photo/lightbox** — `35e3858`, précédé
  du remplissage des pop-up (`02d8190`, `a88f121`, `cbfbbd3`, `45bbcdf`).
- **Étiquettes de la carte : de l'anti-encombrement aux zones tactiles
  zoomables** — `3e704cd` → `cfca630` → `010f89a` → `1564d4e` → `1100bb7`
  → `a364266` (voir aussi §6.2). Préchargement des pucelles
  (`utils/preloadImages.ts`, `1100bb7`).
- **Intégration des données `villes.json`** (Almanach 2026, `18e1e8b` ;
  corrections 8ᵉ RT `8578d97`) et **insignes BANC/CATNC** (`3da7c1e`).
- **Cartouche de titre animé de la carte** — `2583d06`, `9b5780a`, `5058baf`.
- **Mémorial (interface)** : clavier virtuel AZERTY (`9ea5580`), catégorie
  Entre-deux-guerres + glissement du sélecteur (`01b090e`), **roue/carrousel de
  sélection de guerre** (`a36b60c`, `8c0259f`, `77150a4`), correctif veille
  (`3498ead`), répartition/typographie (`60636ac`, `9836efb`).
- **Polices auto-hébergées (hors-ligne)** — `efdbd18` (`fonts.css` + 6 `.woff2`).
- **Déploiement kiosque** — `829a11b`, `978caf2`, `4dcc72a`, `16f95e1`
  (`start-borne-kiosk.ps1`, `README-borne.md`).

Fréquence des fichiers les plus touchés par l'auteur (hors fusions) :
`InteractiveMap.tsx` ×12, `InteractiveMap.css` ×11, `Memorial.css` ×7,
`villes.json` ×6, `Memorial.tsx` ×6, `App.tsx` ×5.

**Réalisé par l'équipe (à décrire comme *existant*/contexte, NE PAS s'attribuer) :**

- **Projection Web Mercator + contour initial de la carte** — `48b6625`,
  auteur **rkNyAvo** : socle sur lequel l'auteur a ensuite bâti. Le fichier
  `InteractiveMap.tsx` est **partagé** (cadji 9 / rkNyAvo 7 / JockoBesne 4).
- **Premier Mémorial défilant + ancienne chaîne `import-docx`** — `aa7e152`,
  **JockoBesne**.
- **Frise chronologique (`Timeline`, `TimelineDialog`, `timeline.json`)** —
  `acc8f24`, **entièrement JockoBesne** (3/3 commits sur le dossier).
- **Pipeline Excel validé + serveur borne + écrans Admin** — `7115376`,
  **JockoBesne** (dossiers `server/` et `scripts/memorial/` : JockoBesne 3,
  cadji 1 retouche mineure).

Conséquence pour la rédaction : la partie « Contributions » doit être centrée
sur la **carte** (co-conçue, l'auteur en chef de file après le socle de rkNyAvo),
l'**interface du Mémorial** (clavier, sélecteur roue), le **hors-ligne**
(polices) et le **kiosque**. La **frise** et le **pipeline de données/admin**
relèvent du travail d'équipe et doivent être présentés comme tels.

---

## 6. Traces de difficultés (matière première, sans invention)

**Aucun marqueur** `TODO`/`FIXME`/`HACK`/`workaround` dans `src`, `server`,
`scripts` (`grep -rn 'TODO\|FIXME\|HACK\|workaround' …` → vide). Les difficultés
se lisent donc dans l'**historique Git** (commits de correction, retraits,
remaniements), pas dans des commentaires de contournement.

### 6.1 Leaflet ajouté puis retiré au profit d'une carte SVG maison

`git log -S"leaflet" --oneline -- package.json` : ajouté en `0af5b49`
(2026-06-30), retiré en `35e3858` (2026-07-02). Le contour SVG maison existait
déjà depuis `48b6625` : la bibliothèque a donc été essayée puis abandonnée au
profit de la projection écrite à la main. → décision technique documentable.

### 6.2 Encombrement des marqueurs de villes : trois approches successives

Chaîne visible dans le log du 15 → 20 juillet :
`3e704cd` « Désencombre les marqueurs … trop proches » → `cfca630`
« Alternative : encart de zoom sur l'Île-de-France … » → `010f89a`
« Retire tout désencombrement : chaque ville sur son vrai point » → `1564d4e`
« zones regionales tactiles … + zoom anime » → `1100bb7` « masque la zone
Île-de-France » → `a364266` « Île-de-France exclue des zones tactiles ».
Itération nette : désencombrement automatique tenté, puis **abandonné**, au
profit de **zones tactiles zoomables**, l'Île-de-France devenant un cas
particulier (villes affichées directement). → difficulté réelle et sa résolution.

### 6.3 Refonte du pipeline de données du Mémorial

D'une extraction heuristique d'un `.docx` (`import-docx`, fragile : devine NOM,
année, grade) vers une chaîne Excel validée (`memorial-import.mjs`) avec
garde-fous. L'ancien fichier généré (9374 lignes) a été supprimé (`2a23a94`) ;
la chaîne `import-docx` n'est plus branchée mais **traîne encore** (script npm +
`scripts/import-docx.mjs`) — dette de nettoyage identifiée.

### 6.4 Correctifs ponctuels révélateurs

- `3498ead` « fix: la mise en veille réinitialise le Mémorial même s'il était
  déjà affiché » → d'où le compteur `idleCount` intégré à la `key` de remontage
  (`App.tsx:114`).
- `541f8a0` « fix: mettre en minuscule les exposants qui étaient en maj » →
  correction typographique des ordinaux.
- `b5afd81` « fix zoom de la carte », `c1f4388` « fix: suppression du fond
  visible … », `209ed97` « fix bord de l'index de villes », `3c40a6a`
  « fix: animer/modifier l'index des villes … plus voyant ».

`[À COMPLÉTER : difficultés vécues mais non tracées dans Git (essais sur
matériel réel, réglages tactiles sur la borne, retours du musée) — à me
fournir ; ne rien inventer.]`

### 6.5 Incohérence « 5 vs 6 catégories » du Mémorial

La chaîne de données du Mémorial n'est pas homogène sur le nombre de catégories :

- **Pipeline Python** (`extract_from_ods.py` docstring « -> 5 Excel » ;
  `common.py` `FICHIERS_CATEGORIE` = **5** : 1GM, 2GM, Indochine, Algérie, Opex).
- **Application et admin** = **6** catégories : `Memorial.tsx` `WARS`,
  `memorial-import.mjs` `CATEGORIES`, `MemorialAdmin.tsx` incluent en plus
  **Entre-deux-guerres**.
- **`data-memorial/`** contient **6** `.xlsx` (dont `memorial-entre-deux-guerres.xlsx`,
  7 noms), alors que l'extracteur n'en produit que 5.

Explication historique (Git) : le pipeline « 5 guerres » a été introduit le
2026-07-20 (`7115376`, JockoBesne, message « Mémorial 5guerres ajouté ») ;
l'Entre-deux-guerres a été **ajoutée le lendemain** (2026-07-21, `01b090e`
puis `8e6cccf`, par l'auteur cadji), côté application. Son `.xlsx` a donc été
constitué **hors** du script d'extraction Python (saisie manuelle ou via l'écran
admin). `npm run import-memorial` fonctionne quand même car il itère sur les
6 `CATEGORIES` et le fichier existe — mais sa provenance diffère des cinq autres.

Conséquence pour la rédaction : ne pas écrire que « les 6 catégories sont
générées par le script Python ». Décrire une chaîne à **5 catégories
automatisées + 1 ajoutée manuellement**. `[À VÉRIFIER : comment
`memorial-entre-deux-guerres.xlsx` a été produit — à confirmer par l'auteur.]`

*(Cette incohérence corrige une erreur de mes premières notes, qui parlaient de
« 6 Excel produits par l'extracteur ».)*

---

## 7. Métriques (avec commandes)

| Mesure | Valeur | Commande |
|---|---|---|
| Fichiers `.tsx` (src) | 13 | `find src -name '*.tsx' \| wc -l` |
| Lignes `.tsx` (src) | 2690 | `find src -name '*.tsx' -exec cat {} + \| wc -l` |
| Fichiers `.ts` hors `.d.ts` (src) | 2 | `find src -name '*.ts' ! -name '*.d.ts' \| wc -l` |
| Lignes `.ts` hors `.d.ts` (src) | 83 | idem `-exec cat … \| wc -l` |
| Fichiers `.css` (src) | 10 | `find src -name '*.css' \| wc -l` |
| Lignes `.css` (src) | 3202 | `find src -name '*.css' -exec cat {} + \| wc -l` |
| Fichiers `.json` (src/data) | 4 | `find src/data -name '*.json' \| wc -l` |
| Lignes `.json` (src/data) | 793 | idem `-exec cat … \| wc -l` |
| Fichiers `.mjs`/`.py` (server + scripts) | 6 | `find server scripts -name '*.mjs' -o -name '*.py' \| wc -l` |
| Composants React (fichiers avec `export … function`) | 11 fichiers | `grep -rln 'export default function\|export function' src --include=*.tsx` |

Détail des 11 fichiers de composants/utilitaires exportant une fonction :
`App.tsx` (via `export default`), `InteractiveMap`, `CardDialog`, `Memorial`,
`VirtualKeyboard`, `Timeline`, `TimelineDialog`, `AdminHub`, `AdminPin`,
`MemorialAdmin`, plus les utilitaires `ordinals.tsx` et `richText.tsx`.
`[À VÉRIFIER : `App.tsx` compte plusieurs composants internes (`LeftPanel`,
`RightPanel`, `App`) ; le décompte « 11 fichiers » n'égale pas le nombre de
composants React réels — préciser la définition retenue dans le rapport.]`

Données Mémorial servies (hors `src`) :
`grep -c '"nom"' public/data/memorial/*.json` → 1GM 1742, 2GM 1450,
Indochine 283, Algérie 122, Opex 11, Entre-deux-guerres 7.

---

## 8. Questionnaire — informations non fournies par le dépôt

À compléter par tes soins ; sans réponse, la section correspondante du rapport
restera en `[À COMPLÉTER]` plutôt qu'inventée.

### Réponses reçues (1re salve)

- **Organisme d'accueil** : Musée des Transmissions.
- **Service d'affectation** : service informatique.
- **Dates du stage** : 29/06 au 21/08 (`[À VÉRIFIER : année — 2026 déduite des
  dates Git et de la date courante ; stage encore en cours au moment de
  l'analyse]`) — soit ~8 semaines.
- **Tuteur entreprise** : Capitaine A. Noirée (désignée « Mme Noiré[e] » —
  `[À VÉRIFIER : orthographe exacte Noirée/Noiré]`).
- **Formation** : Licence 3, ISTIC, campus de Beaulieu, Rennes.
  `[À VÉRIFIER : intitulé exact (mention informatique ?) et établissement de
  rattachement (Université de Rennes) — à écrire tel que fourni.]`
- **Auteur du rapport** : `cadji` / BBCypher (voir §5.5 pour le périmètre).
- **Commande initiale** : émane de **Mme A. Noirée** (tutrice).
  `[À COMPLÉTER : formulation exacte du besoin initial. À défaut, le produit
  réalisé sert de périmètre de fait : borne tactile hors-ligne sur l'Arme des
  Transmissions — carte des unités, mémorial des morts pour la France, frise
  chronologique.]`
- **Public visé** : **tous les visiteurs du musée** (grand public, tous profils
  d'âge, usage bref et sans formation).

Restent ouverts (indispensables à la rédaction, cf. questions ci-dessous) :
tuteur/référent universitaire ; exposition (thème, dates, caractère
permanent/temporaire) ; confirmation matériel ; sources documentaires et
autorisations (Almanach 2026, ODS « Mémoire des hommes / SHD », tracés carto) ;
retours d'essai ; bibliographie disponible ; enseignements mobilisés.

**Organisme d'accueil et cadre du stage**
1. Nom exact de l'organisme d'accueil, statut, activité, effectif approximatif.
2. Service/atelier d'affectation et sa mission.
3. Dates de début et de fin du stage ; durée en semaines ; temps plein/partiel.
4. Nom et fonction du tuteur entreprise ; du tuteur/référent universitaire.
5. Intitulé exact de ta formation, établissement, niveau (année, diplôme visé).

**Commande et cadrage du projet**
6. Commande initiale du musée : quel était le besoin formulé au départ ?
7. Périmètre confié à *toi* précisément vs travail des trois autres
   contributeurs Git (cadji, JockoBesne, rkNyAvo, Jaffré Paul) — qui a fait quoi ?
8. Le projet existait-il avant ton arrivée (prototype, cahier des charges) ?
9. Contraintes imposées par le musée (délais, charte graphique, validation du
   contenu historique, langues).

**Exposition et public**
10. Nom, thème et dates de l'exposition ; caractère permanent ou temporaire.
11. Public visé (tranches d'âge, familles, scolaires, anciens militaires…) et
    durée d'usage typique attendue par visiteur.
12. Emplacement de la borne, présence ou non de médiateurs à proximité.

**Matériel et environnement de la borne**
13. Confirmation du modèle d'écran (Samsung WM65B 65″, 3840×2160, paysage) et
    du poste qui l'anime (OS, navigateur, RAM) — la partie logicielle indique
    Windows 11 + Edge kiosque + Node.
14. Présence effective d'une clé USB pour la mise à jour, d'un tableur
    hors-ligne installé sur la borne (point ouvert dans le guide projet).
15. Mode de démarrage retenu (Planificateur de tâches Windows ?).

**Contenu historique et sources**
16. Source(s) documentaire(s) fournie(s) par le musée : « Almanach 2026 »
    (référence exacte), fichier ODS « Morts pour la France », liste validée des
    unités. Le Mémorial cite « Mémoire des hommes / Service historique de la
    défense » — confirmer l'autorisation d'usage.
17. Contenu de `france-contour.json` et `regions-zones.json` : d'où viennent
    ces tracés (fournisseur/licence) ?

**Retours et validation**
18. Y a-t-il eu des essais sur la borne réelle ? Retours (visiteurs, personnel,
    commanditaire) ? Réglages tactiles ou de lisibilité qui en ont découlé ?
19. Le contenu (villes, frise, mémorial) a-t-il été validé par le musée, et à
    quelle date/version ?

**Bibliographie et enseignements**
20. Références documentaires réellement disponibles (ergonomie tactile,
    cartographie web, applications hors-ligne) que tu pourras citer — je
    n'inventerai aucune référence.
21. Cours/modules universitaires mobilisés (développement web, IHM, gestion de
    projet, algorithmique/graphes, etc.) à relier aux contributions.

---

## Récapitulatif des marqueurs à lever

**`[À COMPLÉTER]`**
- Correspondance pseudonymes Git ↔ personnes/rôles ; identité du stagiaire auteur (§5.1, §8-7).
- Provenance de `france-contour.json` et `regions-zones.json` (§3.2, §3.3, §8-17).
- Toutes les informations du questionnaire §8 (organisme, dates, tuteurs, commande, exposition, matériel, retours, sources, enseignements).
- Difficultés vécues mais non tracées dans Git (§6.4).

**`[À VÉRIFIER]`**
- `"strict": true` réellement actif en TypeScript (§1.3).
- SVG hérités du gabarit Vite encore référencés (`react.svg`, `vite.svg`) (§2.7).
- Édition/intitulé exact de l'« Almanach 2026 » et version de `villes.json` validée par le musée (§3.1).
- Sources historiques de `timeline.json` (§3.3).
- Absence de validation à l'exécution côté carte/frise : choix assumé ? (§3.5).
- Stratégie de dimensionnement 4K (valeurs empiriques, pas de responsive centralisé) (§4.5).
- Définition retenue de « composant React » pour le décompte (§7).
