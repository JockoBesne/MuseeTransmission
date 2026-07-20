# Musée des Transmissions

Application commémorative sur l'histoire des transmissions militaires françaises,
destinée à une borne d'exposition : écran tactile Samsung WM65B (65", paysage),
mode kiosque, **100 % hors-ligne**, fonctionnement continu pendant l'exposition.

## Commandes

- `npm run dev` — serveur de développement Vite
- `npm run build` — `tsc -b` puis build Vite (le build doit toujours passer)
- `npm run lint` — Oxlint
- `npm run import-docx` — régénère `src/data/memorial-1gm.json` depuis
  `public/data/A.docx` (via mammoth). **Ne jamais éditer ce JSON à la main** :
  modifier le .docx ou le script, puis régénérer.
- `npm run import-memorial` — régénère `public/data/memorial/*.json`
  (5 catégories : 1GM, 2GM, Indochine, Algérie, Opex) depuis les Excel
  « propres » de `data-memorial/` (4 colonnes imposées : Nom, Prénom,
  Date de décès, Grade ; tri alphabétique automatique). La validation vit à un
  seul endroit, [server/memorial-import.mjs](server/memorial-import.mjs)
  (dépendance `exceljs`), partagée avec l'API de la borne. **Ne jamais éditer
  ces JSON à la main** ; aucun script ne tourne au lancement de l'app.
  Mode d'emploi complet : [scripts/memorial/README.md](scripts/memorial/README.md).
- `npm run borne` — serveur local de la borne (port 3210, 100 % hors-ligne) :
  sert `dist/` + API de l'écran admin ; les JSON du Mémorial déposés via
  l'admin sont écrits dans `borne-data/` (prioritaire sur la version du
  build) avec copie de l'Excel renommée dans `borne-data/uploads/`.
  Memorial.tsx charge ces JSON en fetch à l'exécution (plus de bundle).
  L'ancienne chaîne `import-docx` / `memorial-1gm.json` n'est plus branchée —
  à supprimer après validation.

## Architecture

Écran scindé 50/50 dans [src/App.tsx](src/App.tsx), qui gère aussi le mode
veille (`INACTIVITY_MS` : sans interaction pendant 3 min, retour automatique
à l'onglet Mémorial) :

- **Panneau gauche** — deux onglets :
  - `components/map/InteractiveMap.tsx` : carte SVG de la France, projection
    Web Mercator maison (pas de Leaflet). Les villes viennent de
    `src/data/villes.json` (GeoJSON `FeatureCollection<Point, City>`, types
    `City`/`Unite`/`UniteMedia` dans [src/types.ts](src/types.ts)) ;
    `labelDir` contrôle la position de l'étiquette (placement automatique
    avec évitement de collisions si la direction préférée est prise). Une
    ville porte une liste `entites` (plusieurs unités possibles sur un même
    point). Les secteurs trop denses sont délimités par les polygones de
    `src/data/regions-zones.json` (GeoJSON `Polygon`, type `ZoneProps`) :
    en vue d'ensemble, leurs villes sont masquées et la zone (pointillés
    orange translucides + nom) est tactile — la toucher anime le viewBox
    pour zoomer sur la région, où chaque ville retrouve son point et son
    étiquette (tailles constantes à l'écran, posées en style inline car la
    CSS l'emporterait sur les attributs SVG) ; retour par le bouton « Vue
    d'ensemble » ou en touchant la carte hors d'une ville.
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
    défilement automatique (requestAnimationFrame), onglets 1GM/2GM (données
    2GM absentes pour l'instant), recherche qui filtre en temps réel et
    stoppe le défilement ; le toucher met le défilement en pause 1,5 s.
    Le champ de recherche ouvre un clavier virtuel AZERTY maison
    (`VirtualKeyboard.tsx`) — `inputMode="none"` sur l'input pour bloquer
    le clavier tactile de Windows en mode kiosque.
- **Panneau droit** — frise chronologique (`components/Timeline/`).
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

- Cibles tactiles ≥ 48×48 px (boutons, onglets, marqueurs, touches).
- Aucune information accessible uniquement au survol : tout au toucher.
- Feedback visuel immédiat à chaque interaction.
- Hors-ligne strict : aucune ressource distante (polices, CDN, API).
- L'app tourne en continu : toujours nettoyer intervalles, animations
  (requestAnimationFrame) et listeners — les fuites mémoire sont critiques ici.

## Contenu historique

Ton sobre et respectueux, en particulier pour le mémorial. Ne jamais inventer
de faits historiques (noms, dates, régiments) : utiliser les données de
`src/data`, ou signaler explicitement qu'une vérification par l'équipe du
musée est nécessaire.

## À faire (mettre à jour au fur et à mesure)

- Frise chronologique verticale dans le panneau droit : jalons = cartes
  tactiles dépliables (accordéon ou modale), flèches Haut/Bas en plus du
  scroll natif.
- Remplacer les textes provisoires (lorem ipsum) de villes.json — histoire,
  spécificité, photoDescription — par les contenus validés par le musée.
- villes.json : la « Seconde unité du site » de Rennes et les `medias` de
  Paris sont des EXEMPLES (démonstration multi-unités et galerie) — à
  remplacer ou supprimer avec les contenus validés par le musée. Les vraies
  images/vidéos iront dans `public/media/` (hors-ligne strict).
- Déploiement borne : ajouter `base: './'` dans vite.config.ts si le `dist`
  doit s'ouvrir sans serveur web.
 