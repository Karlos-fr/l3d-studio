# Firmware L3D Studio

Ce répertoire contient la version refactorée et active du firmware du cube L3D.
La baseline historique reste traçable par les empreintes et mesures conservées
dans `docs/BASELINE.md` ; l'ancienne archive de téléchargement a été supprimée.

## Cible

- Particle Photon Gen 2 ;
- Device OS 2.3.1 ;
- pilote NeoPixel local corrigé ;
- Particle Cloud conservé pendant le refactor.

## Compilation

Depuis la racine du dépôt :

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

Le script lit `.env.local` à la racine, privilégie `PARTICLE_TOKEN`, puis utilise
`PARTICLE_USERNAME` et `PARTICLE_PASSWORD` en repli. Il ne journalise jamais les
valeurs de ces secrets.

Le binaire et le rapport de mesure sont placés dans `firmware/build/`, qui ne
doit pas être versionné.

## Architecture de la phase 1

- `src/main.cpp` : enregistrement Particle, `setup()`, `loop()` et assemblage ;
- `src/config/` : constantes de build et IDs historiques ;
- `src/core/` : types, état historique temporaire et sélection des modes ;
- `src/animations/` : une paire `.h`/`.cpp` par animation ou famille liée ;
- `src/cloud/`, `src/network/`, `src/storage/` : services historiques ;
- `src/rendering/` : transitions et primitives de rendu partagées.

Les implémentations sont encore incluses en unity build. Ce choix garantit une
phase de déplacement sans variation du binaire ; il ne s'agit pas encore d'une
optimisation ou d'une nouvelle architecture d'exécution.

## Références

- `IMPLEMENTATION_PLAN.md` : phases et tâches du refactor ;
- `docs/BASELINE.md` : mesures de compilation ;
- `docs/INVENTORY.md` : inventaire fonctionnel et mémoire ;
- `docs/ANIMATION_INDEX.md` : correspondance IDs, noms et modules ;
- `docs/ANIMATION_OPTIMIZATION_CHECKLIST.md` : contrôles et commentaires obligatoires par animation ;
- `docs/ANIMATION_OPTIMIZATION_TRACKER.md` : inventaire et suivi de passage ;
- `docs/ANIMATION_OPTIMIZATION_SUMMARY.md` : bilan mémoire et validations restantes ;
- `docs/CUBETUBE_IMPORTS.md` : portage et optimisation des quatre animations CubeTube ;
- `docs/GYROPHARE_FR.md` : conception, switches et validation du gyrophare tournant ;
- `docs/SHARED_ANIMATION_STATE.md` : cycle de vie et union d'etats de la phase 6 ;
- `docs/DYNAMIC_ALLOCATION_REMOVAL.md` : parsing fixe et bilan de la phase 7 ;
- `docs/SCHEDULER_AND_DISPATCH.md` : choix du dispatcher et ordonnanceur coopératif de phase 8 ;
- `docs/DIAGNOSTICS.md` : format et garanties des mesures runtime ;
- `docs/SAFETY.md` : pile, buffers bornes et validation des commandes ;
- `docs/RENDERING_TYPES.md` : types compacts, mapping et comparaisons de phase 4 ;
- `docs/SNAKE_OPTIMIZATION.md` : audit, mesures et optimisation bornée de Snake ;
- `docs/CRUMBLING_PLANE_OPTIMIZATION.md` : audit et mesures de CrumblingPlane ;
- `docs/GOLD_ACID_RAIN_OPTIMIZATION.md` : état compact partagé de GoldRain et AcidRain ;
- `docs/MATRIX_OPTIMIZATION.md` : coordonnées et compteurs compacts de Matrix ;
- `docs/COLLIDE2_OPTIMIZATION.md` : état compact et collision sans trigonométrie ;
- `docs/SQUARREL_OPTIMIZATION.md` : traînée et déplacements compacts de Squarrel ;
- `docs/CHEERLIGHTS_OPTIMIZATION.md` : réponse HTTP bornée sans `String` dynamique ;
- `docs/CLOCK_OPTIMIZATION.md` : glyphes en Flash et suppression des helpers morts ;
- `docs/TEXT_OPTIMIZATION.md` : rendu texte partagé sans copie `String` ;
- `docs/SPECTRUM_OPTIMIZATION.md` : buffers FFT dans le scratch partagé ;
- `docs/PLASMA_OPTIMIZATION.md` : réduction mesurée des racines par voxel ;
- `docs/FROZEN_OPTIMIZATION.md` : positions des flocons dans le scratch partagé ;
- `docs/WHIRLWIND_OPTIMIZATION.md` : état temporaire du tourbillon mutualisé ;
- `docs/BOUNCY_CUBE_OPTIMIZATION.md` : positions et directions compactes ;
- `docs/CUBE_PAINTER_OPTIMIZATION.md` : parsing borné sans sous-chaînes ;
- `docs/DIGI_OPTIMIZATION.md` : audit du remplissage et du scratch partagé ;
- `docs/PACMAN_OPTIMIZATION.md` : sprites utiles et boucles PacMan bornées ;
- `docs/FIREWORKS_OPTIMIZATION.md` : particules partagées et tangente mutualisée ;
- `docs/RAIN_OPTIMIZATION.md` : atténuations entières exhaustivement comparées ;
- `docs/SLIDING_PLANES_OPTIMIZATION.md` : position et incrément compacts ;
- `docs/LINE_SPIRAL_OPTIMIZATION.md` : état entier borné et variables mortes retirées ;
- `docs/COLLIDE_OPTIMIZATION.md` : audit conservateur du mode bloquant ;
- `docs/CLASSIC_COLOR_EFFECTS_OPTIMIZATION.md` : états compacts et atténuation partagée des effets couleur ;
- `docs/CUBE_CLASSICS_OPTIMIZATION.md` : pile compacte et calculs géométriques mutualisés de CubeClassics ;
- `docs/SMALL_ACTIVE_MODES_OPTIMIZATION.md` : états compacts des petits modes actifs ;
- `docs/ORCHESTRATION_IFTTT_OPTIMIZATION.md` : ordre Shuffle compact et longueur IFTTT bornée ;
- `docs/COLOR_ALL_TRANSITIONS_OPTIMIZATION.md` : facteurs de transition ColorAll mutualisés ;
- `docs/DISABLED_MODES_AND_SCRATCH_OPTIMIZATION.md` : modes masqués et durée de vie du scratch ;
- `docs/ROLLBACK.md` : retour au firmware stable ;
- `docs/VISUAL_VALIDATION.md` : comparaison sur le cube réel.
