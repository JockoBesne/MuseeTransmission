# Matériau technique — dépôt « MuseeTransmission »

Document de travail. **Aucune phrase de rapport ici** : uniquement des faits
traçables à un commit, un fichier ou une ligne de code.

- `[déduction]` = interprétation de ma part, non écrite dans le dépôt.
- `[à vérifier : …]` = le dépôt ne permet pas de trancher.

**Périmètre de l'analyse** — dépôt local
`C:\Users\MasterChen\Documents\RESSOURCESSTAGE\Stage\MuseeTransmission`,
branche `main` à `b7e129e`, arbre propre hors un PDF non suivi
(`public/pucelles/2025-2026-indications-rapport-stage-L3info.pdf`).
Les statistiques portent sur **toutes les branches** (`git log --all`) sauf
mention contraire, car une partie du travail n'est pas fusionnée dans `main`.

**Conventions de rédaction** — deux fichiers du dépôt sont désignés ici par une
périphrase plutôt que par leur nom : le fichier de consignes projet à la racine
est appelé « le **guide d'architecture** » (24 modifications, cf. §2.8), et
`docs/rapport/materiaux.md` est un document de travail antérieur du même type
que celui-ci (cf. §7). Les hachages de commits restent donnés, la traçabilité
est intacte.

**Point de contexte majeur** — le dépôt compte **quatre identités d'auteur pour
trois personnes** :

| Identité Git | Courriel | Commits (toutes branches) |
|---|---|---|
| `cadji` | `chene.adji@etudiant.univ-rennes.fr` | 52 |
| `JockoBesne` | `paul.pj1904@gmail.com` | 42 |
| `Jaffré Paul` | `paul.pj1904@gmail.com` | 2 |
| `rkNyAvo` | `ramiandrisoa.nyavo@gmail.com` | 29 |

`JockoBesne` et `Jaffré Paul` partagent le même courriel → même personne, deux
configurations Git. **Le projet est donc un travail à trois**, et non un projet
individuel. Tout ce document distingue systématiquement ce qui est attribuable à
`cadji` du reste.
`[à vérifier : le rôle exact de chacun, la répartition décidée en amont, et si les deux autres sont également stagiaires ou personnels du musée.]`

---

## 1. Cadre temporel

### 1.1 Bornes et volume

| Fait | Valeur | Source |
|---|---|---|
| Premier commit | **2026-06-30 09:01:51 +0200** — `bf7ccc4` « création du projet » (JockoBesne) | `git log --reverse` |
| Dernier commit (toutes branches) | **2026-08-05** — `17656cc` « paufinner la traduction » (rkNyAvo, branche `features/traduction`) | `git log --all` |
| Dernier commit de `main` local | **2026-08-04 09:32** — `b7e129e` « ordre adresse » (cadji) | `git log main` |
| Dernier commit de `origin/main` | **2026-08-05** — `0b27dbd` « fix pmr icon » (rkNyAvo) | `git log origin/main` |
| Total commits (toutes branches) | **125** dont **23 commits de fusion** | `git log --all --oneline \| wc -l` |
| Total commits sur `main` | 117 | `git shortlog -sn main` |
| Durée couverte | 30 juin → 5 août 2026, soit **37 jours calendaires**, 5 semaines ISO | — |

Le premier commit de `cadji` est `0f09a9e` « split screen v0 », le
2026-06-30 à 11:33, soit ~2 h 30 après la création du dépôt.

### 1.2 Répartition hebdomadaire

| Semaine ISO | Dates | Commits | Densité |
|---|---|---|---|
| W27 | 30 juin – 2 juil. | **37** | très dense — démarrage |
| W28 | 6 – 8 juil. | **29** | dense |
| W29 | 15 juil. | **10** | creuse (1 seul jour actif) |
| W30 | 20 – 22 juil. | **35** | très dense |
| W31 | 29 juil. | **5** | très creuse (1 seul jour actif) |
| W32 | 4 – 5 août | **9** | faible |

### 1.3 Jours d'activité et interruptions

Seuls **13 jours calendaires** portent des commits :

```
30/06 (16)  01/07 (12)  02/07 (9)   06/07 (14)  07/07 (13)  08/07 (2)
15/07 (10)  20/07 (10)  21/07 (6)   22/07 (19)  29/07 (5)   04/08 (6)   05/08 (3)
```

**Interruptions notables** (jours ouvrés sans aucun commit, toutes branches) :

| Trou | Jours ouvrés perdus | Remarque |
|---|---|---|
| 03/07 | 1 (ven.) | — |
| 09/07 → 14/07 | 4 (jeu., ven., lun., mar.) | **plus long trou du stage** ; le 14/07 est férié |
| 16/07 → 19/07 | 2 (jeu., ven.) | — |
| 23/07 → 28/07 | 4 (jeu., ven., lun., mar.) | — |
| 30/07 → 03/08 | 3 (jeu., ven., lun.) | — |
| 06/08 → aujourd'hui (10/08) | 2 (jeu., ven.) | dépôt figé depuis 5 jours à la date d'analyse |

### 1.4 Structure hebdomadaire du travail (signal fort)

Répartition par jour de semaine, toutes branches :

| Lun | Mar | Mer | Jeu | Ven | Sam | Dim |
|---|---|---|---|---|---|---|
| 24 | 41 | **51** | 9 | 0 | 0 | 0 |

**116 des 125 commits (93 %) tombent lundi, mardi ou mercredi. Zéro commit un
vendredi, un samedi ou un dimanche.** Les 9 commits du jeudi sont tous
concentrés sur le seul 2 juillet 2026.

Répartition horaire : 100 % des commits entre **09 h et 17 h**, aucun le soir
ni la nuit (pics à 10 h : 31 commits, et 15 h : 27 commits).

`[déduction]` Ces deux distributions décrivent une présence sur site de trois
jours par semaine en horaires de bureau, et non un rythme de développement
continu. C'est le fait le plus structurant pour interpréter les « trous » du
§1.3 : ce ne sont probablement pas des blocages mais des jours d'absence.
`[à vérifier : convention de stage — nombre de jours de présence hebdomadaire, congés, jours de cours ou d'examens.]`

### 1.5 Écart avec la période de stage

La période de stage documentée est **29/06 → 21/08/2026**. Le dépôt s'arrête au
05/08 : **il reste ~2 semaines et demie de stage après le dernier commit**.
`[à vérifier : le travail postérieur au 05/08 (installation sur site, recette, rédaction, formation de l'équipe du musée) n'a laissé aucune trace Git — à documenter hors dépôt.]`

---

## 2. Cartographie des chantiers

Regroupement thématique par chemins de fichiers, indépendamment des dates.
Les volumes sont mesurés sur toutes les branches
(`git log --all --numstat -- <chemins>`).

### 2.1 Carte interactive de France — *chantier n°1*

| | |
|---|---|
| **Période** | 30/06 → 04/08 (toute la durée) |
| **Commits** | **62** (cadji 29, rkNyAvo 20, JockoBesne 13) |
| **Volume** | +5 307 / −1 230 lignes |
| **Fichiers** | `src/components/map/InteractiveMap.tsx` (674 l., **30 modifications — fichier le plus retouché du dépôt**), `InteractiveMap.css` (475 l., 23 mod.), `CardDialog.tsx` (341 l.), `CardDialog.css` (607 l.), `src/data/villes.json` (710 l., 21 mod.), `src/data/france-contour.json` (79 Ko), `src/data/regions-zones.json` (31 Ko), `public/pucelles/` (32 images) |

**Apporté à l'application** : carte SVG de la France dessinée à la main
(projection Web Mercator implémentée dans le composant, `InteractiveMap.tsx:18`),
marqueurs de villes avec placement automatique d'étiquettes évitant les
collisions (`placeLabels`, `InteractiveMap.tsx:146`), zones régionales tactiles
avec zoom animé sur le `viewBox` (`animateTo`, `InteractiveMap.tsx:413`),
fiche unité en pop-up (`CardDialog`) avec onglets multi-unités, zoom sur
l'insigne et galerie médias optionnelle.

État des données au 04/08 : **24 villes, 32 unités**
(`python -c` sur `villes.json`). Le guide d'architecture et une note de travail
antérieure évoquent « 27 villes / 40 onglets » issus de l'Almanach 2026 —
l'écart de 3 villes / 8 unités provient au moins en partie du nettoyage de Paris
en `1100bb7` (villes.json : −179 lignes).
`[à vérifier : pourquoi 8 unités ont disparu — retrait volontaire par le musée, ou perte lors d'une fusion.]`

### 2.2 Mémorial — données et chaîne d'import — *chantier n°2*

| | |
|---|---|
| **Période** | 30/06 (première version) puis refonte 20/07 → 04/08 |
| **Commits** | **11** sur `public/data/memorial`, `data-memorial`, `scripts/memorial`, `server` (JockoBesne 8, cadji 3) |
| **Volume** | **+37 774 / −3 750 lignes** — de loin le plus gros volume, mais essentiellement des **données** |
| **Fichiers** | `server/memorial-import.mjs` (205 l.), `server/borne-server.mjs` (154 l.), `server/import-cli.mjs` (50 l.), `scripts/memorial/extract_from_ods.py` (252 l.), `scripts/memorial/common.py` (65 l.), `data-memorial/*.xlsx` (6), `public/data/memorial/*.json` (6) |

**Apporté** : une chaîne de production de données en deux étages —
(1) Python/pandas découpe l'ODS maître du musée en 6 Excel « propres »
(`extract_from_ods.py`), (2) Node/exceljs valide ces Excel et produit les JSON
consommés par l'application (`memorial-import.mjs`, partagé entre le CLI
`import-cli.mjs` et l'API du serveur borne).

Contenu final : **3 682 noms** répartis en 6 catégories —
1GM 1 742 · 2GM 1 516 · Indochine 283 · Algérie 122 · Opex 12 · Entre-deux-guerres 7.

### 2.3 Mémorial — interface — *chantier n°3*

| | |
|---|---|
| **Période** | 30/06 → 04/08 |
| **Commits** | **22** (cadji 13, JockoBesne 7, rkNyAvo 2) |
| **Volume** | +1 631 / −400 |
| **Fichiers** | `Memorial.tsx` (477 l., 13 `useRef`, 10 `useState`, 5 `useEffect` — **le composant le plus chargé en état du projet**), `Memorial.css` (524 l., 15 mod.), `VirtualKeyboard.tsx` (70 l.), `VirtualKeyboard.css` |

**Apporté** : défilement automatique en `requestAnimationFrame`, enchaînement en
boucle sur la catégorie suivante, recherche filtrante temps réel, clavier
virtuel AZERTY maison (`9ea5580`, 06/07), sélecteur de guerre transformé en
carrousel/roue (`8c0259f` + `a36b60c`, 22/07).

### 2.4 Administration de la borne — *chantier n°4*

| | |
|---|---|
| **Période** | 20/07 → 04/08 (concentré) |
| **Commits** | **8** (cadji 5, JockoBesne 3) |
| **Volume** | +1 106 / −14 |
| **Fichiers** | `src/components/Admin/MemorialAdmin.tsx` (348 l.), `Admin.css` (491 l.), `AdminPin.tsx` (87 l.), `AdminHub.tsx` (40 l.), `scripts/borne/README-borne.md`, `scripts/borne/start-borne-kiosk.ps1` (48 l.) |

**Apporté** : parcours d'accès caché (appui 5 s sur le coin haut-droit →
`ADMIN_PRESS_MS`, `App.tsx:150`), PIN sur pavé tactile, hub, écran de dépôt
d'un Excel par glisser-déposer avec validation et aperçu avant remplacement,
retour automatique à l'affichage public après 5 min (`ADMIN_IDLE_MS`).
Livré en un seul très gros commit, `7115376` du 20/07 (voir §4.6).

### 2.5 Coque applicative, kiosque et mode veille — *chantier n°5*

| | |
|---|---|
| **Période** | 30/06 → 04/08 |
| **Commits** | **40** (JockoBesne 17, cadji 12, rkNyAvo 11) |
| **Volume** | +1 118 / −566 |
| **Fichiers** | `App.tsx` (238 l., **23 modifications**), `App.css` (195 l., 16 mod.), `index.css`, `main.tsx`, `index.html` |

**Apporté** : écran scindé 50/50, barre d'onglets du panneau gauche, mise en
veille à 3 min avec remontage forcé du Mémorial via une clé de composant
(`idleCount`, `App.tsx:44` et `App.tsx:129`), durcissement kiosque
(`contextmenu` bloqué dans `main.tsx:9`, `user-select: none` dans
`index.css:18`), routage des vues admin par une simple union de chaînes
(`type AdminView`, `App.tsx:145`).

### 2.6 Accessibilité PMR — *chantier n°6*

| | |
|---|---|
| **Période** | 07/07 → 05/08 |
| **Commits** | ~8 identifiables au message (`59b119f`, `55e5d3d`, `3431748`, `7fc5a7d`, `c0953e3`, `ceee4b0`, `209ed97`, `3c40a6a`, `0b27dbd`) — quasi exclusivement **rkNyAvo** |
| **Fichiers** | `App.tsx`, `App.css`, `InteractiveMap.tsx/.css` |

**Apporté** : bouton fauteuil basculant la barre d'onglets en bas de l'écran
(`panel-left--pmr`), index latéral des villes pour atteindre une fiche sans
viser la carte, remontée des pop-up au-dessus du bouton. Une animation FLIP a
été écrite pour rendre le basculement haut/bas fluide malgré un simple
`flex-direction: column-reverse` (`App.tsx:52-83` — commentaire explicite).

### 2.7 Frise chronologique — *chantier n°7*

| | |
|---|---|
| **Période** | 07/07 (création) → 22/07 (finitions) |
| **Commits** | **5** (JockoBesne 3, rkNyAvo 2) — cadji : **0** |
| **Volume** | +1 363 / −59 |
| **Fichiers** | `Timeline.tsx` (294 l.), `Timeline.css` (470 l.), `TimelineDialog.tsx` (116 l.), `TimelineDialog.css` (270 l.), `src/data/timeline.json` |

**Apporté** : frise défilante en boucle avec index de navigation par sections.
Contenu : **14 jalons** en 4 sections (Les origines 5, Guerres mondiales 3,
Guerre froide 3, Ère numérique 3). Livré quasi entièrement en un commit
(`acc8f24`, 07/07, +1 225 lignes).

### 2.8 Documentation et typographie — *chantier n°8*

| | |
|---|---|
| **Période** | 06/07 → 04/08 |
| **Commits** | guide d'architecture : **24 modifications** (2ᵉ fichier le plus retouché du dépôt), toutes de cadji sauf 3 ; typographie : 6 commits, +158/−2 |
| **Fichiers** | guide d'architecture (racine), `scripts/memorial/README.md`, `scripts/borne/README-borne.md`, `src/utils/ordinals.tsx` (28 l.), `src/utils/richText.tsx` (33 l.), `src/fonts.css`, `src/assets/fonts/*.woff2` (6) |

**Apporté** : ordinaux français en exposant par expression régulière
(`ORDINAL_RE`, `ordinals.tsx:5`), marquage italique léger `_mot_` dans les
données (`richText.tsx:9`), polices Raleway/Nunito auto-hébergées pour le
hors-ligne strict (`efdbd18`, 06/07), procédure d'installation de la borne
Windows 11 en 4 étapes (`README-borne.md`, 60 lignes puis complétée).

### 2.9 Traduction anglaise — *chantier abandonné ou en cours*

| | |
|---|---|
| **Période** | 21/07 → 05/08 |
| **Commits** | **6 hors `main`**, tous rkNyAvo, sur `origin/features/traduction` |
| **Volume** | ~+570 lignes sur `App.tsx`, `Memorial.tsx`, `VirtualKeyboard.tsx`, `Timeline.tsx`, `CardDialog.tsx`, `InteractiveMap.tsx`, `ordinals.tsx` + 2 fichiers de données neufs `src/data/timeline_en.json`, `src/data/villes_en.json` |

**Non fusionné dans `main` à ce jour.** Voir §5.2.

### 2.10 Classement par poids réel dans le stage

Critère : nombre de commits × durée d'implication × surface de code applicatif
(les données brutes du Mémorial gonflent artificiellement le §2.2).

1. **Carte interactive** (62 commits, 5 semaines, 3 contributeurs) — le cœur du projet
2. **Mémorial (données + chaîne d'import)** — le plus gros enjeu technique côté outillage
3. **Mémorial (interface)** — le composant le plus complexe en état React
4. **Coque applicative / kiosque** — transversal, 40 commits mais petits diffs
5. **Administration de la borne** — fort en valeur d'usage, court en durée
6. **Accessibilité PMR** — chantier propre, mono-contributeur
7. **Documentation / typographie**
8. **Frise chronologique** — livrée d'un bloc, peu retouchée
9. **Traduction anglaise** — non intégrée

**Périmètre propre de `cadji`** (52 commits, +5 005 / −15 704 lignes) :
dominant sur la carte (29 commits), l'interface du Mémorial (13), la coque (12)
et l'administration (5) ; **absent de la frise** (0 commit) et marginal sur la
chaîne de données du Mémorial (3).

---

## 3. Décisions techniques observables

### 3.1 Socle : React 19 + TypeScript + Vite + Oxlint

Visible dans `package.json` (créé tel quel au commit `bf7ccc4`) et
`.oxlintrc.json`. Le `README.md` du dépôt est **resté le template Vite d'origine,
en anglais, jamais réécrit** — voir §5.1.

Le build passe : `npm run build` → `tsc -b && vite build`, ✅ 41 modules,
`dist/assets/index-*.js` 394 Ko (139 Ko gzip), CSS 44 Ko (8,7 Ko gzip), en 1,49 s
(exécuté le 10/08/2026).

### 3.2 Trois dépendances ajoutées puis retirées

C'est la décision la plus lisible du dépôt.

| Paquet | Ajouté | Retiré | Remplacé par |
|---|---|---|---|
| `leaflet` + `react-leaflet` + `@types/leaflet` | `0af5b49` — **30/06, 13:50** | `35e3858` — **02/07** | carte SVG maison + `@types/geojson` |
| `mammoth` (lecture .docx) | `aa7e152` — 30/06 | `2baa719` — **04/08** | `exceljs` (ajouté le 20/07, `7115376`) |
| `react-icons` | `59b119f` — 07/07 (bouton PMR) | `2baa719` — 04/08 | SVG écrit à la main (`IconePmr`, `App.tsx:13-30`) |

**Dépendances finales de production : `react`, `react-dom`, `exceljs`. Trois.**
Aucune bibliothèque cartographique, aucun framework UI, aucun framework CSS,
aucune bibliothèque d'icônes, aucun gestionnaire d'état.

Le commentaire de `App.tsx:11` explicite le troisième retrait :
« *pas de bibliothèque d'icônes pour un seul glyphe* ».

### 3.3 Carte : projection maison plutôt que bibliothèque

`InteractiveMap.tsx:18` — `function mercator([lng, lat])` : conversion Web
Mercator écrite en 5 lignes, suivie d'un calcul de `bounds` sur le GeoJSON
(`InteractiveMap.tsx:24`), d'une échelle (`scale`, ligne 40) et d'une fonction
`project` (ligne 43). Le tracé du littoral passe par `ringToPath` (ligne 50)
qui produit directement un attribut `d` de `<path>` SVG.

Conséquence architecturale visible : le zoom n'est pas un zoom de carte mais une
**animation du `viewBox` SVG** (`animateTo`, ligne 413, en `requestAnimationFrame`),
avec compensation des tailles de texte et de marqueur pour qu'elles restent
constantes à l'écran.

### 3.4 Structure des données : GeoJSON typé, pas de base de données

`src/types.ts` (52 lignes) définit tout le domaine :
`City` (`nom`, `labelDir?`, `entites: Unite[]`), `Unite`, `UniteMedia`,
`ZoneProps`, `TimelineEvent`, `LabelDirection`.

- `villes.json` est un `FeatureCollection<Point, City>` — une ville porte une
  **liste** d'unités, ce qui a produit les onglets de la pop-up.
- `regions-zones.json` est un `FeatureCollection<Polygon, ZoneProps>`.
- Le Mémorial est le seul jeu de données **non embarqué** : chargé en `fetch`
  à l'exécution depuis `/data/memorial/*.json` — décision imposée par
  l'administration en ligne (§3.7).

Le champ `abrege` optionnel (`types.ts:29`) est un exemple de choix visible :
libellé court d'onglet, avec repli sur le sigle entre parenthèses du nom complet.

### 3.5 Gestion de l'état : hooks locaux, zéro store

Aucun Redux/Zustand/Context. Décompte des hooks par composant :

| Composant | useState | useEffect | useRef | useMemo |
|---|---|---|---|---|
| `Memorial.tsx` | 10 | 5 | **13** | 0 |
| `InteractiveMap.tsx` | 9 | 4 | 3 | 2 |
| `MemorialAdmin.tsx` | 7 | 2 | 2 | 0 |
| `App.tsx` | 5 | 4 | 4 | 0 |
| `CardDialog.tsx` | 4 | 4 | 8 | 2 |
| `Timeline.tsx` | 4 | 3 | 9 | 0 |

`[déduction]` La densité de `useRef` (13 dans `Memorial.tsx`, 9 dans
`Timeline.tsx`) est cohérente avec des animations pilotées en
`requestAnimationFrame` plutôt qu'en état React.

Deux mécanismes d'état notables et non triviaux :
- **Remontage par clé** : `key={\`${activeTab}-${idleCount}\`}` (`App.tsx:129`)
  force le Mémorial à se réinitialiser à la mise en veille *même s'il était déjà
  affiché* — le commentaire ligne 42-45 le dit explicitement.
- **Technique FLIP** pour animer un flip CSS non transitionnable
  (`App.tsx:52-83`), avec `useLayoutEffect`, lecture de
  `getBoundingClientRect`, reflow forcé, et respect de
  `prefers-reduced-motion`.

### 3.6 Conventions de nommage : identifiants en français côté outillage

Le code React est en anglais (`activeTab`, `pmrMode`, `startPress`) mais **le
serveur et les scripts sont intégralement en français** : `RACINE`, `DONNEES`,
`TAILLE_MAX`, `litCorps`, `sertFichier`, `analyseClasseur`, `versJson`
(`server/borne-server.mjs`, `server/memorial-import.mjs`). Les commentaires
sont en français partout.
`[à vérifier : convention décidée en équipe ou dérive ? Le mélange est net entre `src/` et `server/`.]`

Un fichier CSS par composant, sans exception (10 fichiers `.css` pour 10
composants). Aucune variable CSS : les couleurs sont écrites en dur.

### 3.7 Articulation kiosque / administration

Elle est **dans le même dépôt et le même bundle**, pas dans un projet séparé.
Trois pièces :

1. **Client** — `App.tsx` route entre 4 vues via
   `type AdminView = 'borne' | 'pin' | 'hub' | 'memorial'` (ligne 145).
   L'entrée est un `<div className="admin-hotspot">` invisible (`aria-hidden`)
   avec appui long de 5 s.
2. **Serveur** — `server/borne-server.mjs` sert `dist/` **et** expose deux
   routes : `POST /api/memorial/validate` (analyse sans écrire) et
   `PUT /api/memorial/<categorie>` (écrit JSON + archive l'Excel).
   Il **n'écoute que sur `127.0.0.1`** et plafonne les corps à 20 Mo
   (`TAILLE_MAX`, ligne 30).
3. **Priorité de données** — le serveur sert le JSON de `borne-data/` s'il
   existe, sinon celui du build (commentaire ligne 8-11). `borne-data/` est
   ignoré par Git.

Point de couture visible : `vite.config.ts` définit un proxy `/api →
http://localhost:3210` **uniquement pour pouvoir tester l'écran admin en
développement** (commentaire dans le fichier).

La validation métier est **factorisée en un seul endroit**,
`server/memorial-import.mjs`, importé à la fois par le CLI et par le serveur
HTTP (`import { CATEGORIES, analyseClasseur, versJson } from './memorial-import.mjs'`,
`borne-server.mjs:22`).

### 3.8 Stratégie tactile et hors-ligne

| Décision | Où c'est visible |
|---|---|
| Aucun `console.log` en production | `grep -rn "console\." src` → **0 résultat** |
| Aucun `TODO`/`FIXME`/`HACK`/`@ts-ignore` dans le code | `grep -rn` sur `src`, `server`, `scripts` → **0 résultat** |
| Menu contextuel bloqué | `main.tsx:9` |
| Sélection de texte désactivée sauf champs de saisie | `index.css:18-30` |
| Clavier Windows bloqué en kiosque | `inputMode="none"` sur le champ de recherche + clavier AZERTY maison |
| Polices auto-hébergées | `src/fonts.css`, 6 `.woff2` dans `src/assets/fonts/`, commentaire dans `index.html:8` |
| Déploiement documenté | `scripts/borne/README-borne.md` : Node LTS, `npm install`/`npm run build` **avant** débranchement réseau, tâche `schtasks ONLOGON`, `powercfg`, désactivation du balayage de bord par clé de registre |
| Test hors-ligne prescrit | §4 du même README : débrancher le réseau et vérifier que **le Mémorial affiche les noms**, « c'est lui qui charge ses données en `fetch` local » |

---

## 4. Traces de difficulté

Section descriptive uniquement. Les séquences sont décrites, pas expliquées.

### 4.1 Leaflet ajouté puis retiré en 48 h

```
30/06 13:50  0af5b49  rkNyAvo   add leaflet              (+leaflet, +react-leaflet, +@types/leaflet)
30/06 13:50  48b6625  rkNyAvo   contour de la map
30/06 14:37  eb9e0ff  rkNyAvo   ajout des points
30/06        7b22272  rkNyAvo   update villes
30/06        3433caa  rkNyAvo   carte intégrer onglet 1
30/06        b5afd81  rkNyAvo   fix zoom de la carte
01/07        9266bad  JockoBesne map
02/07        35e3858  cadji     intégration CardDialog…   (−leaflet, −react-leaflet, −@types/leaflet, +@types/geojson)
                                 9 fichiers, +682 / −172
```

**Ce qui est touché** : `package.json`, `package-lock.json`, le composant carte
entier. **Durée** : 2 jours. La séquence contient un commit `b5afd81` « fix zoom
de la carte » avant l'abandon. La branche `origin/dev` et
`origin/feature/carte/pop-up` pointent toutes deux sur `b5afd81`, c'est-à-dire
sur le dernier état Leaflet — **elles n'ont jamais été rebasées depuis**.

### 4.2 Encombrement des marqueurs : cinq approches en cinq jours

C'est la séquence la plus explicite du dépôt. Tous les messages de commit sont
détaillés, ce qui est rare ici.

```
15/07  18e1e8b  cadji  Intègre les unités de l'Almanach 2026 dans villes.json   +639/−45 (1 fichier)
15/07  3e704cd  cadji  Désencombre les marqueurs de villes trop proches         +71/−8
                       → MARKER_OFFSETS : marqueurs déportés + lignes de rappel
                       → distance mini portée de 7,4 à 29 unités SVG
15/07  cfca630  cadji  ALTERNATIVE : encart de zoom sur l'Île-de-France         +209/−28
                       → « branche de comparaison avec features/design »
                       → système générique ZOOM_REGIONS
15/07  010f89a  cadji  RETIRE TOUT désencombrement : chaque ville sur son point +10/−253
                       → « À la demande du musée : ni encart, ni marqueurs
                          déportés, ni lignes de rappel »
20/07  1564d4e  cadji  Zones régionales tactiles + zoom animé                   +525/−79
                       → nouvelle donnée regions-zones.json, +7 lignes dans types.ts
                       → InteractiveMap.tsx : +453 lignes
20/07  1100bb7  cadji  Masque la zone Île-de-France                             +65/−160
                       → villes.json −179 lignes
```

**Ce que ça touche** : `InteractiveMap.tsx` et `.css` réécrits quatre fois en
5 jours, `villes.json` deux fois, `types.ts` une fois, plus un fichier de
données neuf.
**Signal explicite dans un message** : `010f89a` cite une demande du musée comme
motif d'annulation complète de deux jours de travail — et le commit suivant
(`1564d4e`, 5 jours plus tard) réintroduit un mécanisme de regroupement,
différent, puis `1100bb7` en retire à nouveau une partie (l'Île-de-France).

`[à vérifier : la réunion ou l'échange du 15/07 avec le musée, et ce qui a été demandé exactement.]`

### 4.3 Ordinaux en exposant — correction 16 jours après

```
06/07 10:59  aed1ebd  rkNyAvo  affiche les 'e' en exposant       (crée src/utils/ordinals.tsx)
22/07        541f8a0  rkNyAvo  fix: mettre en minuscule les exposants qui étaient en maj
                               (+4 lignes dans CardDialog.css uniquement)
```

Le correctif final ne touche **que du CSS**, pas la logique. Le guide
d'architecture liste toujours « exposant en minuscules, jamais en majuscules
(« 1ᵉʳ » et non « 1ᴱᴿ ») » dans sa liste « À faire ».
`[à vérifier : l'item est-il résolu et non retiré de la liste, ou reste-t-il un cas non couvert ?]`

### 4.4 Six commits dupliqués le 6 juillet (incident de branche)

Trois messages existent **deux fois**, avec la même date d'auteur à la seconde
près mais des hachages différents :

| Message | Sur `main` | Sur `features/design` | Date d'auteur |
|---|---|---|---|
| « docs: ajout de …, guide du projet… » | `88a4a51` | `3f90770` | 06/07 09:39:29 |
| « docs: … à jour des derniers commits de main » | `80a800e` | `fe8a43b` | 06/07 09:40:25 |
| « docs: … ajout de la section Design » | `6965d5e` | `dbcf423` | 06/07 09:44:55 |

Le graphe montre ensuite une fusion `8e5cb72` « Merge remote-tracking branch
'origin/main' into features/design » à 11:06, puis `1d11ddb` « docs: …
**post-fusion** ».

**Trace** : dates d'auteur identiques + hachages différents = commits rejoués
(cherry-pick ou rebase) sur une seconde branche. `[déduction]`

### 4.5 Mode kiosque — quatre commits le même jour, messages dégradés

```
22/07  829a11b  cadji  mode kiosque          (crée README-borne.md 60 l. + start-borne-kiosk.ps1 41 l.)
22/07  978caf2  cadji  kiosk tactile         (+30/−11 sur les deux mêmes fichiers)
22/07  4dcc72a  cadji  maj kioskk            (+6 lignes de README ; faute de frappe dans le message)
22/07  16f95e1  cadji  retrait selection tactile  (src/index.css +13, src/main.tsx +4)
```

Le 22/07 est le jour le plus chargé du dépôt (**19 commits**) et celui où les
messages de `cadji` se dégradent le plus : « maj memo », « maj taille caractere »,
« maj kioskk », « mode kiosque », « kiosk tactile », « caroussel memorial ».
Le dernier commit du jour retire une fonctionnalité tactile.

### 4.6 Deux commits « fourre-tout » très volumineux

| Commit | Date | Auteur | Fichiers | Lignes |
|---|---|---|---|---|
| `7115376` « Mémorial 5guerres ajouté , Admin mdp hub et modif en local du mémorial » | 20/07 | JockoBesne | **34** | **+45 685 / −43** |
| `30dcfe7` « memorial radioamateur » | 29/07 | JockoBesne | 17 | +8 038 / −3 658 |

`7115376` introduit **en une seule fois** : les 5 fichiers Excel sources, les 5
JSON générés, les 3 fichiers du serveur, les 2 scripts Python, les 4 composants
d'administration, le proxy Vite, et 27 lignes de guide d'architecture.
Il commet aussi `borne-data/data/memorial/1gm.json` (13 938 lignes) et
`borne-data/uploads/memorial-1gm.xlsx` — **des fichiers d'état d'exécution**,
ainsi que deux `.pyc` de `__pycache__/`.

`30dcfe7` réécrit **tous** les JSON du Mémorial (1gm : 5 226 lignes modifiées,
2gm : 4 944) et modifie `extract_from_ods.py` (+78) et `memorial-import.mjs`
(+67) pour introduire la 5ᵉ colonne `Section` (les radioamateurs 1939-1945).

### 4.7 Nettoyage tardif du 4 août

`2baa719` « changement adressage, dead code, ordre régiment et pucelle 54e5cie »
(cadji) — **19 fichiers, +144 / −14 244** :

- suppression de `borne-data/` du suivi Git (−13 938 + un `.xlsx` binaire)
- suppression des deux `.pyc`
- suppression de `scripts/import-docx.mjs` (101 lignes) et du script npm
  `import-docx` — chaîne morte depuis le 20/07
- retrait de `mammoth` et `react-icons` de `package.json`
- suppression de `public/icons.svg` (24 lignes)
- ajout de 9 lignes à `.gitignore`

**`.gitignore` porte la trace d'une fusion** : les règles `__pycache__/` et
`borne-data/` y figurent **deux fois**, sous deux commentaires rédigés
différemment (« Python (scripts/memorial) » et « Python (outils de maintenance
des donnees) » ; « État d'exécution de la borne… » et « Donnees ecrites par la
borne a l execution »). Le second bloc est sans accents.

`[déduction]` Deux personnes ont écrit les mêmes règles séparément, et la fusion
les a concaténées sans dédoublonnage.

### 4.8 Aucun commit `revert` ni `hotfix` formel

`git log --all --grep=revert` → 0. `git log --all --grep=hotfix` → 0.
Les annulations sont faites par commits ordinaires (`010f89a`, `2baa719`,
`16f95e1`, `0b27dbd` « fix pmr icon » qui retire 23 lignes de `App.tsx`),
jamais par `git revert`.

Commits préfixés `fix:` ou contenant « fix » : 8 sur 125 (6 %).

### 4.9 Messages de commit : deux régimes cohabitent

| Style | Exemples | Auteurs |
|---|---|---|
| Conventionnel + corps explicatif de 5-15 lignes | `3e704cd`, `cfca630`, `010f89a`, `1564d4e`, `1100bb7` | cadji (juillet, chantier carte) |
| Une ligne, souvent abrégée ou fautive | « memo », « commit mer », « map », « maj kioskk », « point ajoute catnc et banc », « bleau modifié pour mémorial », « paufinner la traduction », « ajout du mode d'emploie » | les trois |

`[déduction]` Le régime détaillé est concentré sur les commits de la carte à
mi-stage ; il disparaît fin juillet chez tous les contributeurs.

### 4.10 Divergence `main` locale / distante non résolue

À la date d'analyse, `main` local est **en retard de 2 commits** sur
`origin/main` (`fe71b7c` « ajout du mode d'emploie » et `0b27dbd` « fix pmr
icon », tous deux de rkNyAvo, 4-5 août). L'un des deux ajoute au dépôt un PDF
binaire de 626 Ko (« Mode d'emploi – Borne Mémorial.pdf ») à la racine.

---

## 5. Écart entre prévu et livré

### 5.1 Le `README.md` n'a jamais été écrit

`README.md` à la racine est **intégralement le template Vite d'origine, en
anglais** : « React + TypeScript + Vite / This template provides a minimal
setup… », avec les sections « React Compiler » et « Expanding the Oxlint
configuration ». Aucun mot sur le musée, la borne ou le déploiement.

La documentation réelle du projet vit ailleurs : guide d'architecture à la
racine (24 modifications), `scripts/borne/README-borne.md`,
`scripts/memorial/README.md`.

### 5.2 Branches ouvertes non fusionnées

| Branche distante | Commits hors `main` | Dernier commit | État |
|---|---|---|---|
| `origin/features/traduction` | **6** | 05/08 | Traduction anglaise complète en cours (`timeline_en.json`, `villes_en.json`, boutons de langue dans `App.tsx`) — **absente de l'application livrée** |
| `origin/main` | 2 | 05/08 | En avance sur le `main` local |
| `origin/features/marqueurs-pucelles` | 1 | 20/07 | `2b55d5a` « test marqueurs pucelles » : afficher les insignes comme marqueurs sur la carte (+33 lignes dans `InteractiveMap.tsx`) — **piste testée, jamais fusionnée** |
| `origin/features/accessibilté` | 1 | 08/07 | `3431748` index des villes en mode PMR — le contenu a été refait autrement, mais ce commit précis reste hors `main` |
| `origin/dev`, `origin/feature/carte/pop-up` | 0 | 30/06 | Pointent sur l'état **Leaflet** (`b5afd81`), jamais mis à jour |
| 6 autres branches (`feature-carte-interactive`, `feature-timeline`, `features/carte-pop-up`, `features/design`, `features/memorial`, `features/split-screen`) | 0 | — | Fusionnées, jamais supprimées |

**15 branches vivent encore dans le dépôt. Deux fonctionnalités écrites ne sont
pas dans l'application : la traduction anglaise et les marqueurs-insignes.**

### 5.3 Liste « À faire » du guide d'architecture, confrontée au code

La liste (dernière mise à jour `2baa719`, 04/08) contient **17 items non
cochés**. Vérification faite dans le code au 10/08 :

| Item annoncé | État réel constaté |
|---|---|
| Classer les onglets d'unités par Brigade → Régiment → Compagnie | Partiellement fait : `af8e2a5` (29/07) mentionne « affichage hierarchique des pop up carte » et `2baa719` « ordre régiment » |
| BANC et CATNC à faire valider par le musée | Entrées présentes dans `villes.json` (Cesson-Sévigné) ; **devise vide** |
| 5 unités sans devise | **Confirmé : exactement 5** — CATNC, BANC, ETNC (Cesson-Sévigné), 44ᵉ RT (Mutzig), 738ᵉ CGE (Paris) |
| 2 `medias` placeholder du 8ᵉ RT / Paris | **Confirmé** : `villes.json:333` et `:338`, légendes commençant par « EXEMPLE de média image — remplacer par… », pointant vers `/pucelles/` au lieu de `/media/`. **Seule unité du projet à avoir des médias.** |
| Corriger les numéros/noms d'unités erronés | Non vérifiable dans le dépôt |
| Retirer le mot « fanion » des pop-up | `grep -i fanion src/` → 0 résultat. **Fait, item non retiré de la liste** |
| Mots anglais en italique | Mécanisme livré (`richText.tsx`, `02301d5` du 22/07) ; application au contenu non vérifiable |
| Espace insécable avant les nombres en fin de ligne | Non implémenté |
| Mode PMR : marquer davantage le tiroir-index | `3c40a6a` (22/07) « fix: animer/modifier l'index des villes pour qu'il soit plus voyant » — probablement fait |
| Mémorial : carrousel de sélection de guerre | **Fait** (`8c0259f`, `a36b60c`, 22/07) — item non retiré |
| Frise : marquer visuellement la fin | **Fait** (`3d62c9e`, 22/07) — item non retiré |
| Frise : nom des sections seulement sur la frise | Non vérifié |
| App : marquer la séparation entre panneaux | `<div className="divider" />` existe (`App.tsx:222`) — état d'avancement inconnu |
| **Installer un tableur sur la borne** (Excel ou LibreOffice) | **Tâche d'installation, hors dépôt. Aucune trace.** |
| **`base: './'` dans `vite.config.ts`** | **Non fait** — `vite.config.ts` ne contient que `plugins` et `server.proxy` |

`[déduction]` La liste n'est pas tenue à jour : au moins 3 items y figurent
alors que le code montre qu'ils sont livrés. Elle ne peut donc pas servir
d'inventaire fiable du reste-à-faire.

### 5.4 Ce qui était envisagé et n'existe pas

1. **Carte Leaflet** — abandonnée au 2ᵉ jour (§4.1).
2. **Import depuis Word (.docx)** — `scripts/import-docx.mjs` + `mammoth`,
   présents du 30/06 au 04/08 (36 jours) sans jamais être branchés à la chaîne
   finale ; supprimés en `2baa719`. Le fichier source `public/data/A.docx` n'est
   jamais entré dans le dépôt.
3. **Version anglaise** — écrite, non fusionnée (§5.2).
4. **Marqueurs = insignes sur la carte** — prototypé, non fusionné.
5. **Encart de zoom « loupe » Île-de-France** — écrit puis supprimé en 4 h le
   15/07 (§4.2).
6. **Marqueurs déportés + lignes de rappel** — écrits puis supprimés le 15/07.
7. **`public/icons.svg`** — sprite d'icônes créé puis supprimé le 04/08.
8. **`base: './'`** — annoncé comme nécessaire au déploiement, non fait.

### 5.5 Aucun test, aucune CI

`git ls-files` : pas de `*.test.*`, pas de `*.spec.*`, pas de `.github/`,
pas de `vitest`/`jest` dans `package.json`. Le seul garde-fou automatisé est
`tsc -b` dans le script `build` et `oxlint`.

---

## 6. Volumétrie

Ordres de grandeur, pour hiérarchiser — pas destinés au rapport tels quels.

### 6.1 Taille du projet

| Mesure | Valeur |
|---|---|
| Fichiers suivis par Git | **109** |
| Total lignes (tous fichiers texte suivis) | ~43 300, dont **~40 000 de données JSON générées** |
| Code source `src/` (hors polices et images) | **~7 100 lignes** |
| Composants React | **10** (`App`, `InteractiveMap`, `CardDialog`, `Memorial`, `VirtualKeyboard`, `Timeline`, `TimelineDialog`, `AdminHub`, `AdminPin`, `MemorialAdmin`) + 2 modules utilitaires |
| Fichiers CSS | 10 (~3 300 lignes au total) |
| Scripts hors application | 3 Node (`server/`, 409 l.), 3 Python (`scripts/`, 458 l.), 1 PowerShell (48 l.) |
| Images d'insignes | 32 PNG dans `public/pucelles/` |
| Bundle de production | JS 394 Ko (139 Ko gzip) + CSS 44 Ko (8,7 Ko gzip) + 6 polices (188 Ko) |

### 6.2 Lignes par chantier (toutes branches)

| Chantier | Commits | + | − |
|---|---|---|---|
| Mémorial — données & import | 11 | **37 774** | 3 750 |
| Carte interactive | 62 | **5 307** | 1 230 |
| Mémorial — interface | 22 | 1 631 | 400 |
| Frise | 5 | 1 363 | 59 |
| Coque / kiosque | 40 | 1 118 | 566 |
| Administration | 8 | 1 106 | 14 |
| Typographie / polices | 6 | 158 | 2 |
| Configuration | 16 | 134 | 17 |

⚠️ La première ligne est trompeuse : **~36 000 des 37 774 lignes sont des JSON
de noms générés automatiquement**, pas du code écrit.

### 6.3 Volumétrie par auteur

| Auteur | Commits | Lignes + | Lignes − |
|---|---|---|---|
| cadji | 52 | 5 005 | **15 704** |
| JockoBesne (+ Jaffré Paul) | 44 | **69 086** | 14 064 |
| rkNyAvo | 29 | 2 048 | 291 |

Le bilan négatif de `cadji` (−15 704 pour +5 005) s'explique par les gros
commits de suppression : `2baa719` (−14 244) et `010f89a` (−253).
Le bilan de `JockoBesne` est porté par `7115376` (+45 685) et `30dcfe7`
(+8 038), soit **78 % de ses ajouts en deux commits de données**.

### 6.4 Les 6 plus gros commits

| Commit | Date | Auteur | Fichiers | + / − |
|---|---|---|---|---|
| `7115376` | 20/07 | JockoBesne | 34 | +45 685 / −43 |
| `aa7e152` | 30/06 | JockoBesne | 10 | +10 257 / −131 |
| `30dcfe7` | 29/07 | JockoBesne | 17 | +8 038 / −3 658 |
| `bf7ccc4` | 30/06 | JockoBesne | 19 | +1 965 / −0 |
| `acc8f24` | 07/07 | JockoBesne | 9 | +1 225 / −5 |
| `3fd838b` | 15/07 | JockoBesne | 7 | +765 / −266 |

Le plus gros commit de `cadji` est `af8e2a5` (29/07, +706 / −17), suivi de
`35e3858` (02/07, +682 / −172) et `18e1e8b` (15/07, +639 / −45).

---

## 7. Zones d'ombre — ce que le dépôt ne peut pas expliquer

À documenter par toi-même, hors dépôt.

1. **La répartition des rôles dans l'équipe de trois.** Le dépôt montre qui a
   touché quoi, pas qui a décidé quoi, ni si la répartition a été négociée,
   imposée, ou improvisée.
2. **Le statut des deux autres contributeurs** (co-stagiaires ? personnel du
   musée ? autre formation ?) et le mode de coordination (réunions, canal de
   discussion, revue de code — aucune Pull Request n'apparaît au-delà des deux
   du 30/06, `98d4d27` et `09d32db`).
3. **Ce qui s'est passé pendant les 24 jours sans commits** (§1.3-1.4) — le
   rythme lun/mar/mer est un fait, sa cause ne l'est pas.
4. **Les deux semaines et demie de stage après le 05/08** : installation
   physique sur la borne, recette avec le musée, formation de l'équipe.
5. **Le contenu des échanges avec le musée**, en particulier la demande du
   15/07 qui a annulé le travail de désencombrement de la carte (`010f89a`).
6. **La provenance et la validation des données historiques** : d'où vient
   l'Almanach 2026, qui a validé les 32 unités, qui corrige les Excel du
   Mémorial (le guide dit « corrigés à la main par le musée »).
7. **Pourquoi 8 unités et 3 villes ont disparu** entre l'import de l'Almanach
   et l'état actuel (§2.1).
8. **La cause de l'abandon de Leaflet** — le dépôt montre le retrait, pas le
   motif (poids ? hors-ligne ? tuiles ? rendu ?).
9. **Le sort de la traduction anglaise** : commandée par le musée puis annulée,
   ou simplement pas finie à temps ?
10. **Les contraintes matérielles réelles** : l'écran Samsung WM65B, la
    résolution de travail, si tu as testé sur le matériel définitif ou sur un
    écran de substitution.
11. **Le choix de React/Vite lui-même** : imposé par le tuteur, hérité,
    ou décidé par l'équipe le 30/06 ?
12. **Ce que le musée a validé ou refusé** parmi les 17 items « à faire ».

---

## 8. Éléments visuels disponibles pour le rapport

### 8.1 Captures d'écran à produire (aucune n'existe dans le dépôt)

| Capture | Comment l'obtenir |
|---|---|
| L'écran scindé complet (carte + frise) | `npm run dev`, plein écran |
| La carte en vue d'ensemble, zones régionales visibles | onglet Carte |
| Le zoom animé sur une région (Alsace ou Puy-de-Dôme) | toucher une zone en pointillés |
| La pop-up `CardDialog` avec ses onglets d'unités | ville à plusieurs entités : **Cesson-Sévigné** (3 unités) ou **Paris** |
| Le zoom sur un insigne (pointillés dorés) | dans la pop-up |
| Le Mémorial avec son carrousel de guerres | onglet Mémorial |
| Le clavier virtuel AZERTY | champ de recherche du Mémorial |
| Le mode PMR (barre d'onglets en bas + index des villes) | bouton fauteuil |
| Le parcours admin : PIN → hub → dépôt d'Excel | appui 5 s coin haut-droit, PIN par défaut dans `AdminPin.tsx` |
| La borne installée au musée | photo sur site |

### 8.2 Extraits de code qui portent une décision

| Extrait | Fichier:ligne | Ce qu'il illustre |
|---|---|---|
| `function mercator([lng, lat])` + `project` | `src/components/map/InteractiveMap.tsx:18-48` | La projection écrite à la main — remplace Leaflet en ~30 lignes |
| `placeLabels` / `rectFor` / `hit` | `src/components/map/InteractiveMap.tsx:146-212` | Placement anti-collision des étiquettes |
| `animateTo` | `src/components/map/InteractiveMap.tsx:413-431` | Zoom = animation de `viewBox` en `requestAnimationFrame` |
| Bloc `useLayoutEffect` FLIP | `src/App.tsx:52-83` | Animer un `column-reverse` CSS non transitionnable, avec `prefers-reduced-motion` |
| `key={\`${activeTab}-${idleCount}\`}` | `src/App.tsx:129` | Réinitialisation par remontage — 1 ligne pour un comportement de veille |
| `useEffect` d'inactivité + `return () => …removeEventListener` | `src/App.tsx:85-107` | Nettoyage systématique (contrainte 24/7) |
| `IconePmr` + son commentaire | `src/App.tsx:11-30` | Justification écrite du retrait de `react-icons` |
| `ORDINAL_RE` et `formatOrdinals` | `src/utils/ordinals.tsx:5-23` | Typographie française par regex, avec le piège de l'ordre des alternatives (commenté) |
| `ITALIC_RE` + commentaire sur les clés React | `src/utils/richText.tsx:5-12` | Micro-langage de balisage dans les données + un bug de clés évité |
| En-tête de `borne-server.mjs` (rôles 1-2-3) | `server/borne-server.mjs:1-21` | L'architecture kiosque/admin en 20 lignes de commentaire |
| `litCorps` avec `TAILLE_MAX` | `server/borne-server.mjs:30, 55-70` | Garde-fou sur les téléversements |
| `import { CATEGORIES, analyseClasseur, versJson }` | `server/borne-server.mjs:22` | Validation factorisée entre CLI et serveur |
| Proxy `/api` + son commentaire | `vite.config.ts:8-13` | La couture dev / borne |
| `document.addEventListener('contextmenu', …)` | `src/main.tsx:9` | Durcissement kiosque |
| `user-select: none` + exception `input, textarea` | `src/index.css:18-30` | Durcissement kiosque, côté CSS |
| `interface City` / `Unite` | `src/types.ts:26-45` | Le modèle de données en 20 lignes |

### 8.3 Schémas à dessiner (rien d'équivalent n'existe dans le dépôt)

1. **Chaîne de données du Mémorial** :
   `ODS maître` → *(Python/pandas)* → `data-memorial/*.xlsx` → *(Node/exceljs,
   `memorial-import.mjs`)* → `public/data/memorial/*.json` → *(fetch)* →
   `Memorial.tsx`, **avec la branche parallèle** :
   `écran admin` → `PUT /api/memorial/<cat>` → `borne-data/` *(prioritaire)*.
2. **Arborescence des composants** : `App` → `LeftPanel` (onglets →
   `InteractiveMap`/`Memorial`) + `RightPanel` (`Timeline`), et les 4 vues
   `AdminView` en dérivation.
3. **Machine à états de l'écran** : `borne` ⇄ `pin` → `hub` → `memorial`, avec
   les deux minuteries `INACTIVITY_MS` (3 min) et `ADMIN_IDLE_MS` (5 min).
4. **Frise du projet** : les 13 jours actifs sur 37, avec les 8 chantiers en
   bandes et les 3 contributeurs en couleurs (données en §1.3 et §2).
5. **Le cycle des dépendances** : leaflet / mammoth / react-icons, entrées et
   sorties datées (§3.2) — un schéma en 3 lignes de temps.

### 8.4 Tableaux directement réutilisables

- §1.2 répartition hebdomadaire, §1.4 jours de semaine (fort effet visuel)
- §3.2 dépendances ajoutées puis retirées
- §3.5 hooks par composant
- §4.2 la séquence des 5 approches de la carte (la meilleure histoire du dépôt)
- §6.1 taille du projet

### 8.5 Documents existants à ne pas refaire

- `scripts/borne/README-borne.md` — procédure d'installation complète,
  réutilisable telle quelle en annexe.
- `scripts/memorial/README.md` — mode d'emploi de la chaîne de données.
- `docs/rapport/materiaux.md` (672 lignes, 40 Ko, écrit le 28/07) — document de
  travail antérieur du même type, arrêté au commit `16f95e1` (22/07). Il couvre
  la stack, l'arborescence, les données et les points non triviaux avec plus de
  détail que le présent document sur les §1-3, mais **ignore tout ce qui s'est
  passé après le 22/07** (nettoyage du 04/08, radioamateurs, traduction) et
  **ne distingue pas les trois contributeurs**. Il contient aussi un
  questionnaire avec des réponses déjà obtenues — à récupérer.
- « Mode d'emploi – Borne Mémorial.pdf » (626 Ko), présent uniquement sur
  `origin/features/traduction` (`fe71b7c`, 04/08) — à récupérer, il n'est pas
  sur `main`.

---

*Document produit le 10/08/2026 par analyse du dépôt à `b7e129e` (+ branches distantes).
Commandes reproductibles : `git log --all`, `git shortlog -sne --all`,
`git log --all --numstat`, `git show --stat <hash>`.*
