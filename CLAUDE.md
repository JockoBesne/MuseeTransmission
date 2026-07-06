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

Écran scindé 50/50 dans [src/App.tsx](src/App.tsx) :

- **Panneau gauche** — deux onglets :
  - `components/map/InteractiveMap.tsx` : carte SVG de la France, projection
    Web Mercator maison (pas de Leaflet). Les villes viennent de
    `src/data/villes.json` (GeoJSON `FeatureCollection<Point, City>`, type
    `City` dans [src/types.ts](src/types.ts)) ; `labelDir` contrôle la position
    de l'étiquette. Dix implantations : huit RT, le 18e RIT (Dieuze) et le
    régiment de cyberdéfense (Rennes). Toucher une ville ouvre `CardDialog`
    (pop-up de détail avec zoom sur la pucelle du régiment ; images dans
    `public/pucelles/`).
  - `components/Memorial/Memorial.tsx` : noms des soldats morts au combat,
    défilement automatique (requestAnimationFrame), onglets 1GM/2GM (données
    2GM absentes pour l'instant), recherche qui filtre en temps réel et
    stoppe le défilement ; le toucher met le défilement en pause 1,5 s.
- **Panneau droit** — vide : accueillera la frise chronologique (voir « À faire »).

## Conventions

- Réponds en français. Le code (identifiants) reste en anglais ; les
  commentaires et tous les textes d'interface sont en français.
- React 19, composants fonction + hooks uniquement, TypeScript strict.
- CSS pur, un fichier `.css` par composant — pas de bibliothèque UI, pas de
  framework CSS, pas de styles inline sauf valeurs dynamiques.
- Aucune nouvelle dépendance npm sans la proposer et la justifier d'abord.

## Contraintes borne tactile

- Cibles tactiles ≥ 48×48 px (boutons, onglets, marqueurs, touches).
- Aucune information accessible uniquement au survol : tout au toucher.
- Feedback visuel immédiat à chaque interaction.
- Hors-ligne strict : aucune ressource distante (polices, CDN, API).
  Exception connue à résorber : index.html charge encore Raleway et Nunito
  depuis Google Fonts (voir « À faire »).
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
- Clavier virtuel AZERTY pour la recherche du mémorial (la borne n'a pas de
  clavier physique — le champ actuel dépend du clavier système).
- Mode veille : après 3 min d'inactivité, retour à l'onglet Mémorial avec
  défilement des noms.
- Données mémorial 2GM.
- Rapatrier les polices en local (Raleway, Nunito) : actuellement chargées
  depuis le CDN Google Fonts dans index.html — la borne étant hors-ligne,
  elles ne se chargeraient pas en exposition.
- Déploiement borne : ajouter `base: './'` dans vite.config.ts si le `dist`
  doit s'ouvrir sans serveur web.
