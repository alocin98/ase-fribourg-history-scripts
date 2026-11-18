# Présentation Manuscript AI (ASE, groupe 6, 28/10/2026)

14 diapos en HTML, en anglais, avec le même moteur et le même style que `~/Desktop/actuelle/slides` : le texte à gauche, une animation à droite (SVG/CSS). Tout fonctionne **hors ligne** (pas de CDN, pas de police externe).

## Lancer
Double-cliquer sur `start.command`, ou :
```bash
cd ~/Desktop/presentationASE && python3 -m http.server 8766 --bind 127.0.0.1
# puis ouvrir http://localhost:8766
```

## Touches
| Touche | Action |
|---|---|
| → / espace / clic | étape suivante |
| ← | étape précédente |
| ↓ / ↑ | diapo suivante / précédente |
| N | notes orales (en anglais, pour chaque présentateur) |
| P | fenêtre présentateur (notes, diapo suivante, chrono), synchronisée |
| F | plein écran |
| numéro + Entrée | aller à une diapo |

## Plan (12,5 min)
| # | Diapo | Qui | Temps |
|---|---|---|---|
| 1–2 | Titre, agenda | Ali | — |
| 3 | Live demo (+ écrans de secours si l'app ne répond pas) | Ali | 2 min |
| 4–5 | Architecture, modèle (BLLA + TrOCR) | Polina | 5 min |
| 6 | Backend (diagramme de séquence) | Amaury | à partager |
| 7 | ML backend (vraie réponse `/predict`) | Ali | |
| 8 | Frontend (vue document, confiances) | Fatou | |
| 9–11 | User stories : gestion, exemple #19, road to the MVP (tableau GitHub) | Nicolas | 2 min |
| 12 | Git workflow et CI (une seule diapo) | Nicolas | 1,5 min |
| 13 | Outlook | Ali | 2 min |
| 14 | Thanks | — | — |

**Démo** : avant de présenter, transcrire un document entier à l'avance (les pages déjà faites sont sautées, il revient tout de suite). En direct, ne transcrire qu'une page courte : une page complète prend environ 35 s sur CPU.

## D'où viennent les contenus
- **Diapos reprises** de `Manuscript AI.pdf` : l'exemple de user story (capture de l'issue #19, `assets/img/story.jpg`), le tableau des user stories (`track.jpg`, fourni par Nicolas), le git workflow (redessiné et animé) et le texte CI/CD. Le plan et les rôles viennent de `ASE Project.pdf`.
- **Dépôt** `alocin98/ase-fribourg-history-scripts` (branche `dev`) : stack, routes, workflows CI, `documents/deployment.md`, issues et PR. La maquette du MVP est `documents/mvp-mockups.svg`.
- **Sortie du modèle** : `assets/predict.json` est la vraie réponse de `POST /predict` sur `webapp/ml-backend/samples/english_page_test.jpg` (= `assets/img/page.jpg`). Elle a été obtenue le 27/10 avec l'image Docker du ML backend construite depuis `dev`, en 37,9 s. Les boîtes, textes et confiances des diapos 1, 3, 5, 7, 8 et 14 sont lus dans ce fichier.
- Les écrans de l'app (diapos 3 et 8) sont des **schémas** (ce ne sont pas des captures), mais leurs données sont réelles. Les miniatures sont des pages de `data/testdata/pages`.

## Vérifier
Avec le serveur lancé :
```bash
./tools/check.sh                 # charge chaque étape en headless : erreurs JS
./tools/shots.sh /tmp/shots      # capture 1920×1080 de chaque étape
```

## Structure
```
index.html        diapos, textes et notes (<aside class="notes">)
css/deck.css      mise en page 1920×1080 (reprise de CubiCasa) + éléments Manuscript AI
js/deck.js        moteur : étapes, navigation, notes, présentateur
js/util.js        utilitaires DOM/SVG, tweens, bandes de confiance de l'app (≥ 90 / 70–89 / < 70)
js/viz/anims.js   une animation par data-viz
assets/           predict.json, img/
```
