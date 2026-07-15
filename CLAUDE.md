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

## Architecture

Écran scindé 50/50 dans [src/App.tsx](src/App.tsx), qui gère aussi le mode
veille (`INACTIVITY_MS` : sans interaction pendant 3 min, retour automatique
à l'onglet Mémorial) :

- **Panneau gauche** — deux onglets :
  - `components/map/InteractiveMap.tsx` : carte SVG de la France, projection
    Web Mercator maison (pas de Leaflet). Les villes viennent de
    `src/data/villes.json` (GeoJSON `FeatureCollection<Point, City>`, types
    `City`/`Unite`/`UniteMedia` dans [src/types.ts](src/types.ts)) ;
    `labelDir` contrôle la position de l'étiquette. Une ville porte une liste
    `entites` (plusieurs unités possibles sur un même point). Dix
    implantations : huit RT, le 18e RIT (Dieuze) et le régiment de
    cyberdéfense (Rennes). Toucher une ville ouvre `CardDialog` : pop-up de
    **taille fixe** (fond blanc légèrement grisé) dont seul le corps défile
    (indicateur flèche + fondu quand du contenu dépasse). En-tête = ville +
    onglets d'unités (toujours affichés, l'onglet actif est rempli en bleu
    carte `#0f70b7` ; libellé court : champ `abrege`, sinon sigle entre
    parenthèses du nom) ; le nom complet de l'unité et sa devise ouvrent le
    corps défilant. Zoom sur la pucelle (pointillés dorés `#fecc30`, images
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
- **Panneau droit** — vide : accueillera la frise chronologique (voir « À faire »).

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
- Données mémorial 2GM.
- Remplacer les textes provisoires (lorem ipsum) de villes.json — histoire,
  spécificité, photoDescription — par les contenus validés par le musée.
- villes.json : la « Seconde unité du site » de Rennes et les `medias` de
  Paris sont des EXEMPLES (démonstration multi-unités et galerie) — à
  remplacer ou supprimer avec les contenus validés par le musée. Les vraies
  images/vidéos iront dans `public/media/` (hors-ligne strict).
- Déploiement borne : ajouter `base: './'` dans vite.config.ts si le `dist`
  doit s'ouvrir sans serveur web.
 