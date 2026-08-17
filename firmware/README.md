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
- `docs/CUBETUBE_IMPORTS.md` : portage et optimisation des quatre animations CubeTube ;
- `docs/GYROPHARE_FR.md` : conception, switches et validation du gyrophare tournant ;
- `docs/SHARED_ANIMATION_STATE.md` : cycle de vie et union d'etats de la phase 6 ;
- `docs/DYNAMIC_ALLOCATION_REMOVAL.md` : parsing fixe et bilan de la phase 7 ;
- `docs/SCHEDULER_AND_DISPATCH.md` : choix du dispatcher et ordonnanceur coopératif de phase 8 ;
- `docs/DIAGNOSTICS.md` : format et garanties des mesures runtime ;
- `docs/SAFETY.md` : pile, buffers bornes et validation des commandes ;
- `docs/RENDERING_TYPES.md` : types compacts, mapping et comparaisons de phase 4 ;
- `docs/ROLLBACK.md` : retour au firmware stable ;
- `docs/VISUAL_VALIDATION.md` : comparaison sur le cube réel.
