# Musée des Transmissions

Application commémorative sur l'histoire des transmissions militaires françaises,
destinée à une borne d'exposition : écran tactile Samsung WM65B (65", paysage),
mode kiosque, **100 % hors-ligne**, fonctionnement continu pendant l'exposition.

## Commandes

- `npm run dev` — serveur de développement Vite
- `npm run build` — `tsc -b` puis build Vite (le build doit toujours passer)
- `npm run lint` — Oxlint
- `npm run memorial-extract -- "<fichier.ods>"` — étape amont, facultative et
  hors chaîne npm (Python + pandas/openpyxl) :
  [scripts/memorial/extract_from_ods.py](scripts/memorial/extract_from_ods.py)
  convertit l'ODS maître « Morts pour la France » en Excel « propres » dans
  `data-memorial/`. À ne relancer que si la source brute change.
- `npm run import-memorial` — régénère `public/data/memorial/*.json`
  (6 catégories : 1GM, Entre-deux-guerres, 2GM, Indochine, Algérie, Opex) depuis les Excel
  « propres » de `data-memorial/` (4 colonnes imposées : Nom, Prénom,
  Date de décès, Grade ; tri alphabétique automatique). Une 5e colonne existe,
  propre à chaque registre et refusée ailleurs : `Conflit` pour l'Opex
  (obligatoire, théâtre affiché à la suite du nom) et `Section` pour la 2GM
  (facultative, intertitre de sous-groupe — les 66 radioamateurs 1939-1945).
  La validation vit à un seul endroit,
  [server/memorial-import.mjs](server/memorial-import.mjs) (constante
  `COLONNE5`, dépendance `exceljs`), partagée avec l'API de la borne.
  **Ne jamais éditer ces JSON à la main** ; aucun script ne tourne au lancement
  de l'app. Les Excel de `data-memorial/` sont corrigés à la main par le musée :
  `memorial-extract` refuse donc de les écraser sans `--force`.
  Mode d'emploi complet : [scripts/memorial/README.md](scripts/memorial/README.md).
- `npm run borne` — serveur local de la borne (port 3210, 100 % hors-ligne) :
  sert `dist/` + API de l'écran admin ; les JSON du Mémorial déposés via
  l'admin sont écrits dans `borne-data/` (prioritaire sur la version du
  build) avec copie de l'Excel renommée dans `borne-data/uploads/`.
  Memorial.tsx charge ces JSON en fetch à l'exécution (plus de bundle).
  `borne-data/` est de l'état d'exécution local à la borne : non versionné
  (.gitignore), la source de vérité versionnée reste `data-memorial/`.
  Le serveur n'écoute que sur `127.0.0.1` — l'API admin n'est pas exposée au
  réseau du musée. Les deux fichiers d'un import (JSON publié + copie Excel)
  sont écrits via `ecritAtomique` (`.tmp` puis `rename`) : la coupure de
  courant du soir ne peut pas laisser un JSON à moitié écrit. L'Excel est
  écrit **avant** le JSON, pour qu'une coupure entre les deux laisse la
  sauvegarde de ce qui n'a pas encore été publié.

## Architecture

Écran scindé 50/50 dans [src/App.tsx](src/App.tsx), qui gère aussi le mode
veille (`INACTIVITY_MS` : sans interaction pendant 3 min, retour automatique
à l'onglet Mémorial).

Les deux panneaux portent `contain: layout` (App.css) : le navigateur n'a
qu'un seul fil principal, et deux visiteurs se servent des deux moitiés en
même temps — cette règle empêche qu'un recalcul de mise en page déclenché
d'un côté fasse retravailler l'autre. Conséquence à connaître avant d'ajouter
du CSS : **un panneau est le bloc conteneur de ses descendants
`position: fixed`**, qui couvrent donc le panneau et non l'écran (voulu pour
`.war-menu-backdrop`). `paint` est délibérément omis — les deux panneaux sont
toujours visibles, il n'y a rien à économiser, et il rognerait les ombres
portées.

- **Panneau gauche** — deux onglets :
  - `components/map/InteractiveMap.tsx` : carte SVG de la France, projection
    Web Mercator maison (pas de Leaflet). Les villes viennent de
    `src/data/villes.json` (GeoJSON `FeatureCollection<Point, City>`, types
    `City`/`Unite`/`UniteMedia` dans [src/types.ts](src/types.ts)) ;
    `labelDir` contrôle la position de l'étiquette (placement automatique
    avec évitement de collisions si la direction préférée est prise). Une
    ville porte une liste `entites` (plusieurs unités possibles sur un même
    point). Bilingue : contrairement à la frise, `src/data/villes_en.json`
    n'est **pas** une copie de `villes.json` mais un **calque de textes**
    anglais (types `UniteTraduite`/`VillesTraduction`), indexé par le `nom`
    de la ville, ses `entites` suivant l'ordre de `villes.json` ; la fusion
    se fait au chargement (fonction `traduire` dans `InteractiveMap.tsx`).
    `villes.json` reste donc la seule source de la structure — coordonnées,
    `labelDir`, pucelles, fichiers `medias` — et une ville ajoutée ou
    corrigée côté français apparaît aussitôt sur la carte anglaise, avec ses
    textes français tant qu'ils ne sont pas traduits (jamais de ville
    manquante en anglais). Champs traduisibles : `regiment`, `abrege`,
    `texte`, `histoire`, `specificite`, `garnison`, `photoDescription`, plus
    `legendes[]` (légendes des `medias`, dans l'ordre) ; champ absent = texte
    français conservé. Les onglets de la pop-up sont classés par échelon
    (`ECHELONS` dans `CardDialog.tsx`) : ajouter le mot-clé dans les deux
    langues à toute nouvelle catégorie. Les secteurs trop denses sont
    délimités par les polygones de
    `src/data/regions-zones.json` (GeoJSON `Polygon`, type `ZoneProps`) :
    en vue d'ensemble, leurs villes sont masquées et la zone (pointillés
    orange translucides + nom) est tactile — la toucher anime le viewBox
    pour zoomer sur la région, où chaque ville retrouve son point et son
    étiquette (tailles constantes à l'écran, posées en style inline car la
    CSS l'emporterait sur les attributs SVG) ; retour par le bouton « Vue
    d'ensemble » ou en touchant la carte hors d'une ville. Le polygone
    Île-de-France (`code` « 11 ») reste dans `regions-zones.json` mais est
    exclu des zones tactiles (filtre dans `InteractiveMap.tsx`) : Paris et
    les autres villes franciliennes s'affichent directement à leur point.
    Les images de pucelles (`public/pucelles/`) sont préchargées au
    démarrage (`utils/preloadImages.ts`, branché dans App.tsx). Elles sont
    **normalisées à la source** par `python scripts/normalise-pucelles.py
    --appliquer` : le script rogne la marge vide autour de l'insigne (les
    images d'origine allaient de 53 % à 100 % d'occupation, soit un rapport
    de 1,9 en taille apparente), réintroduit 3 % de marge uniforme, plafonne
    le plus grand côté à 1000 px et convertit les formats mal étiquetés
    (GIF/SVG renommés en `.png`, qu'un navigateur peut refuser d'afficher).
    **À relancer après tout ajout de pucelle** ; ne pas compenser au CSS.
    Toucher une ville ouvre `CardDialog` : pop-up de
    **taille fixe** (fond blanc légèrement grisé) dont seul le corps défile
    (indicateur flèche + fondu quand du contenu dépasse). En-tête = ville +
    onglets d'unités (toujours affichés, l'onglet actif est rempli en bleu
    carte `#0f70b7` ; libellé court : champ `abrege`, sinon sigle entre
    parenthèses du nom) ; le nom complet de l'unité et sa devise ouvrent le
    corps défilant. En mode PMR (`.panel-left--pmr`, App.tsx), ce bandeau
    passe sous la fiche (cascade CSS, `flex-direction: column-reverse`)
    pour rester à portée d'un utilisateur assis. Zoom sur la pucelle (pointillés dorés `#fecc30`, images
    dans `public/pucelles/`), et galerie optionnelle par
    unité via `medias` : `{ "type": "image"|"video", "src", "legende"?,
    "poster"? }` — images zoomables dans le lightbox, vidéos lues en ligne
    (contrôles natifs, `playsInline`, fichiers locaux dans `public/media/`). À l'ouverture de l'onglet, un cartouche de titre
    flottant (haut-gauche, « Carte intéractive » / « Régiments de
    transmission ») est poussé sur l'écran depuis le bord gauche, reste
    `TITLE_HOLD_MS` (~10 s), puis est tiré hors de l'écran : séquence
    `titlePhase` (in → out → gone) animée en CSS, minuteurs nettoyés au
    démontage. Le composant se remonte à chaque ouverture de l'onglet, donc
    la séquence rejoue à chaque visite.
  - `components/Memorial/Memorial.tsx` : noms des soldats morts au combat,
    défilement automatique (requestAnimationFrame), 6 onglets 1GM /
    Entre-deux-guerres / 2GM / Indochine / Algérie / Opex (Opex affiche le
    théâtre d'opération via le champ `conflit`) ; en bas d'une liste, un voile
    plein panneau enchaîne sur
    la catégorie suivante en boucle. Recherche qui filtre en temps réel et
    stoppe le défilement ; le toucher met le défilement en pause 1,5 s.
    Le champ de recherche ouvre un clavier virtuel AZERTY maison
    (`VirtualKeyboard.tsx`) — `inputMode="none"` sur l'input pour bloquer
    le clavier tactile de Windows en mode kiosque.
- **Panneau droit** — frise chronologique (`components/Timeline/`) : jalons
  issus de `src/data/timeline.json` (type `TimelineEvent`), défilement
  automatique en boucle, sections d'ancrage + index de navigation ; toucher un
  jalon ouvre `TimelineDialog` (fiche dépliable). Le texte du `.docx` fourni par
  le musée se répartit en `texte` (résumé, affiché en entier sur la carte de la
  frise — jamais tronqué) et `detail[]` (le « en savoir plus », affiché dans la
  pop-up). Les dimensions du jalon sont en **cqh et non en px**
  (`Timeline.css`) : le viewport CSS que reçoit Edge dépend de la mise à
  l'échelle Windows de l'écran 4K, et en px le texte débordait dès qu'il
  passait sous 1920×1080 ; relatives à la hauteur de la frise, elles gardent
  la même taille physique. Repère : 1cqh = 10,02 px quand la frise fait
  1002 px de haut. Le tiroir d'index est posé **par-dessus** la
  frise (`position: absolute`) pour que son ouverture ne rétrécisse pas les cartes.
  Bilingue : `src/data/timeline_en.json` décalque `timeline.json` jalon par
  jalon (même ordre, mêmes sections, mêmes `detail`) et le bouton de langue du
  panneau droit bascule de l'un à l'autre. Tout jalon ajouté ou corrigé côté
  français doit l'être aussi côté anglais, sous peine de désynchroniser les
  deux frises. Terminologie anglaise de l'Arme : le musée a tranché pour
  « Signal Corps » (et non « Transmissions »). **Appliquée aux 23 jalons** et au
  `soustitre` anglais de Timeline.tsx ; `villes_en.json` reste à aligner.
  Règle de traduction, à tenir pour toute retouche : « Signal Corps » est un
  **nom propre d'institution**, toujours avec l'article et au singulier (*the
  Signal Corps is…*, *its own organisation*) — il désigne l'Arme créée en 1942.
  Avant 1942, les emplois génériques du mot français « transmissions » (le
  domaine, le métier) se traduisent par *military communications* ou *signals*
  (*signals units*, *signals personnel*), jamais par « Signal Corps », qui
  serait un anachronisme — la frise dit elle-même que l'Arme n'existe qu'à
  partir de 1942. Les noms propres français restent en français, suivis d'une
  glose anglaise (`École des liaisons et transmissions (ELT), the school of
  liaison and signals`) ; les unités se traduisent (*54th Signal Regiment*,
  *the signal brigade*). Orthographe **britannique** dans tout le fichier
  (organisation, specialised, centre, kilometre, defence) et typographie
  courbe comme côté français : apostrophes `’` (jamais `'`) et guillemets
  `“ ”`, y compris dans les possessifs anglais (*Ferrié’s*, *the women’s
  Signal Corps*).
- **Administration** (accès personnel) : appui maintenu 5 s sur le coin
  haut-droit de l'écran (`.admin-hotspot` dans App.tsx) → code PIN sur pavé
  tactile (`AdminPin.tsx`, constante `ADMIN_PIN`, défaut 1205) → hub
  `components/Admin/AdminHub.tsx` (« Affichage borne » = retour à la
  configuration par défaut / « Modifier le mémorial ») ;
  `MemorialAdmin.tsx` = dépôt d'un Excel (nom libre, glisser-déposer clé
  USB), choix de la catégorie à remplacer (renommage automatique),
  vérifications + aperçu, remplacement via l'API du serveur borne. Retour
  automatique à l'affichage public après 5 min d'inactivité en admin.

## Conventions

- Réponds en français. Le code (identifiants) reste en anglais ; les
  commentaires et tous les textes d'interface sont en français.
- React 19, composants fonction + hooks uniquement, TypeScript strict.
- CSS pur, un fichier `.css` par composant — pas de bibliothèque UI, pas de
  framework CSS, pas de styles inline sauf valeurs dynamiques.
- Aucune nouvelle dépendance npm sans la proposer et la justifier d'abord.
- Ordinaux français (28e, 1ère…) : toujours afficher le suffixe en exposant
  via le composant `Ord` de [src/utils/ordinals.tsx](src/utils/ordinals.tsx)
  (utilisé dans Memorial et CardDialog).

## Design

- Polices : Raleway et Nunito, auto-hébergées (woff2 dans src/assets/fonts,
  déclarées dans src/fonts.css) — ne pas réintroduire de lien Google Fonts.
- Pas de variables CSS : les couleurs sont écrites en dur dans chaque
  fichier — réutiliser exactement ces valeurs :
  - Fond bleu nuit `#0D3151` (panneaux), `#021b2e` (barre d'onglets),
    bleu carte `#0f70b7`.
  - Accent doré `#fecc30` (mémorial, onglets/éléments actifs, marqueurs) ;
    accent orange `#ff8200` (carte uniquement — plus aucun orange dans la
    pop-up CardDialog).
  - Textes clairs `#ffffff` / `#e0e0e0` sur fond sombre.
  - Exception : la pop-up CardDialog est en thème clair (fond `#f2f2f2`,
    texte `#1a1a1a`), avec en-tête bleu nuit `#0D3151` à liseré doré,
    accents bleu carte `#0f70b7` (onglet actif, galons de sections,
    indicateur de défilement) et pointillés dorés autour de la pucelle.

## Contraintes borne tactile

- **Viewport de référence : 1280×720 px CSS.** Dalle 3840×2160 en DisplayPort,
  échelle figée à 3 au lancement d'Edge (`--force-device-scale-factor=3`,
  scripts/borne/start-borne-kiosk.ps1) : 1 px CSS = 3 px écran. C'est contre
  cette taille que tout le CSS est écrit et vérifié — mesurer à 1280×720, pas
  à 1920×1080. Ne jamais compenser l'échelle côté CSS (`zoom`, `font-size`
  racine) : elle se multiplierait avec celle d'Edge. Seule la frise fait
  exception et se dimensionne sur sa propre boîte (unités `cqh`), donc à
  taille physique constante quelle que soit l'échelle.
- Cibles tactiles ≥ 48×48 px (boutons, onglets, marqueurs, touches).
- Aucune information accessible uniquement au survol : tout au toucher.
- Feedback visuel immédiat à chaque interaction.
- **Écran de 65 pouces : deux visiteurs s'en servent en même temps.** Tout
  geste doit donc être écrit en multi-touch :
  - **Ne jamais lire `e.touches[0]`** — cette liste contient tous les contacts
    de la dalle entière, y compris le doigt de quelqu'un d'autre à l'autre
    bout de l'écran. Utiliser `e.changedTouches[0]` (le doigt qui vient
    d'agir *ici*) et mémoriser son `identifier` pour le retrouver à la fin du
    geste — voir `finDuGeste` dans Memorial.tsx.
  - Une mise en pause déclenchée au toucher (défilement du Mémorial,
    `pausedRef` de la frise) doit compter les doigts posés et ne reprendre
    qu'au départ du dernier : sinon le premier qui lâche relance le
    défilement sous le doigt de l'autre. Toujours brancher `touchcancel` /
    `pointercancel` avec la fin normale, faute de quoi un doigt annulé par le
    système reste compté et fige le défilement jusqu'au soir.
  - Écouter la fin d'un geste sur `window` plutôt que sur l'élément : sur une
    dalle de cette taille, un doigt est souvent relâché ailleurs.
  - **Chromium n'émet aucun `click` tant que deux doigts sont posés** : son
    détecteur de gestes annule le tap dès le second contact (il guette un
    pincement), donc un visiteur qui garde le doigt appuyé sur un panneau
    bloquait tous les boutons de l'autre. `utils/multiTouchTap.ts` (installé
    dans main.tsx) refabrique le tap à partir des événements pointer, qui,
    eux, arrivent par doigt, et ne synthétise le click que si le natif n'est
    pas venu. Les `onClick` de l'app restent donc la façon normale d'écrire un
    bouton — ne pas les convertir en `onPointerUp`.
- Hors-ligne strict : aucune ressource distante (polices, CDN, API).
- **Aucun pictogramme ne doit dépendre d'un glyphe fourni par le système.**
  La borne tourne sous Windows, dont la police Segoe UI Emoji ne contient
  aucun drapeau national : les emoji 🇫🇷 et 🇬🇧 y sont deux « indicateurs
  régionaux » qui, faute de ligature, s'affichent « FR » et « GB ». Le piège
  est invisible en développement sous Linux, où Noto Color Emoji les dessine.
  Les pictogrammes sont donc tracés en SVG dans `src/components/icons/` :
  `Drapeau.tsx` (bouton de langue, tricolore ou Union Jack selon la langue du
  panneau) et `IconePMR.tsx` (fauteuil roulant, glyphe Font Awesome Free 5,
  CC BY 4.0 — attribution en en-tête du fichier). Les flèches et symboles
  géométriques (`✕ ← → ↺ ⌫ ▾ ✦`) viennent des polices texte et ne posent pas
  ce problème.
- L'app tourne en continu : toujours nettoyer intervalles, animations
  (requestAnimationFrame) et listeners — les fuites mémoire sont critiques ici.
- **L'électricité du musée est coupée chaque soir** : la borne redémarre donc
  de zéro tous les matins (pas de redémarrage applicatif à prévoir, l'uptime
  maximum est d'une journée), mais elle doit repartir *seule* — chaîne de
  démarrage et réglage BIOS de reprise après coupure dans
  [scripts/borne/README-borne.md](scripts/borne/README-borne.md).
- Aucune surveillance humaine en journée : une exception non rattrapée
  laisserait un écran blanc jusqu'au lendemain. D'où le garde-fou
  [src/utils/watchdog.ts](src/utils/watchdog.ts), installé dans main.tsx avant
  le rendu : les erreurs remontées à `window` (rendu React *et* asynchrone —
  rAF, minuteurs, promesses) rechargent la page, puis, après `MAX_ESSAIS`
  rechargements consécutifs, laissent place à un écran de panne sobre. Le
  compteur vit en `sessionStorage` et se remet à zéro dès que la page a tenu
  `STABLE_MS`, pour que des incidents isolés ne se cumulent pas. Volontairement
  hors React (React peut être mort) : DOM à la main et styles en ligne — seule
  entorse admise à la règle « un .css par composant ». Pas d'`ErrorBoundary` :
  il n'attraperait que le rendu, pas les boucles rAF ni les minuteurs.

## Contenu historique

Ton sobre et respectueux, en particulier pour le mémorial. Ne jamais inventer
de faits historiques (noms, dates, régiments) : utiliser les données de
`src/data`, ou signaler explicitement qu'une vérification par l'équipe du
musée est nécessaire.

## À faire (mettre à jour au fur et à mesure)

### Carte

- Pop-up (`CardDialog`) : classer les onglets d'unités d'une même ville par
  hiérarchie **Brigade → Régiment → Compagnie**.
- Unités **BANC** et **CATNC** : entrées créées dans `villes.json`
  (Cesson-Sévigné) — contenu encore à faire valider par le musée.
- Corriger le contenu des « régiments de transmissions » de `villes.json` :
  numéros/noms d'unités erronés à rectifier d'après la liste validée par le
  musée (données historiques — ne rien inventer). Reporter ensuite la
  correction dans `villes_en.json` : sans ça, la fiche reste affichée en
  anglais avec l'ancien texte traduit (le calque l'emporte sur le français).
- `villes.json` : les deux `medias` du 8e RT / Paris (villes.json:298 et 303)
  sont des placeholders EXEMPLE pointant vers `/pucelles/` — remplacer par de
  vrais fichiers `public/media/` + légendes validées, ou supprimer (hors-ligne
  strict).
- `villes.json` : 5 unités ont une devise (`texte`) vide — CATNC, BANC et ETNC
  (Cesson-Sévigné), 44e RT (Mutzig), 738e CGE (Paris). Le sous-titre est masqué
  tant qu'elle est vide ; devises à fournir par le musée (ne rien inventer).
- Typographie : ne pas terminer une ligne par un nombre (espace insécable avant
  le nombre pour ne pas le laisser orphelin en fin de ligne).
- Retirer le mot « fanion » des pop-up.
- Mettre les mots anglais en italique dans les textes français.
- Ordinaux (composant `Ord`) : exposant en minuscules, jamais en majuscules
  (« 1ᵉʳ » et non « 1ᴱᴿ »).
- Mode PMR : marquer davantage la section de sélection des villes (tiroir-index).

### Mémorial

- Sélecteur de guerre : remplacer le simple bouton par un carrousel (case guerre
  sélectionnée).
- Sous la case, ne garder que la date comme descriptif.

### Frise

- Marquer visuellement la fin de la frise.
- N'afficher le nom des sections que sur la frise, pas dans les pop-up
  (`TimelineDialog`).

### App

- Marquer davantage la séparation entre les deux panneaux (gauche / droite).
- Installer un tableur sur la borne (Excel ou LibreOffice Calc, gratuit et
  hors-ligne) pour que l'équipe du musée puisse ouvrir et compléter les `.xlsx`
  du mémorial (ajout de noms) directement sur place, avant de les réimporter via
  l'écran admin.

### Technique / nettoyage

- ~~`base: './'` dans vite.config.ts~~ — **abandonné, ne pas refaire.** Cela ne
  rendrait pas le `dist` ouvrable en double-clic pour autant : les chemins
  d'images de `villes.json` (`/pucelles/…`) sont des données, que Vite ne
  réécrit pas, et le Mémorial charge ses JSON en `fetch`, bloqué en `file://`.
  La borne passe de toute façon toujours par `npm run borne` (tâche planifiée),
  donc le besoin n'existe pas.
- Le `dist/` et `node_modules/` encaissent une coupure brutale chaque soir : si
  le musée peut fournir un onduleur ou une prise pilotée avec extinction
  propre, ça évite une corruption du système de fichiers à la longue.
- Mémorial : 1742 + 1516 noms montés d'un coup dans le DOM, remontés à chaque
  retour de veille (3 min) avec refetch `no-store` de ~600 Ko. Deux correctifs
  natifs si le défilement montre des à-coups sur la machine réelle :
  `content-visibility: auto` + `contain-intrinsic-size` sur `.memorial-name`,
  et un cache module-level des JSON. À mesurer sur la borne avant d'agir.
- **Ne pas optimiser le poids du bundle** (découpage, chargement différé,
  WebP pour les pucelles, simplification du contour de la France) : la borne
  sert en `localhost` depuis un disque local et charge tout une fois par jour.
  Le gain est invisible. Sur cette machine, seul compte ce qui tourne *en
  continu* (boucles rAF) ou ce qui *plante*.
 