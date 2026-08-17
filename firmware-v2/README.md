# Firmware L3D Studio v2

Ce répertoire contient la nouvelle version refactorée du firmware du cube L3D.
La source historique présente dans `download/` reste une référence upstream et
ne doit pas être modifiée.

## Cible

- Particle Photon Gen 2 ;
- Device OS 2.3.1 ;
- pilote NeoPixel local corrigé ;
- Particle Cloud conservé pendant le refactor.

## Compilation

Depuis la racine du dépôt :

```powershell
powershell -ExecutionPolicy Bypass -File firmware-v2/tools/compile.ps1
```

Le script lit `.env.local` à la racine, privilégie `PARTICLE_TOKEN`, puis utilise
`PARTICLE_USERNAME` et `PARTICLE_PASSWORD` en repli. Il ne journalise jamais les
valeurs de ces secrets.

Le binaire et le rapport de mesure sont placés dans `firmware-v2/build/`, qui ne
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
- `docs/ROLLBACK.md` : retour au firmware stable ;
- `docs/VISUAL_VALIDATION.md` : comparaison sur le cube réel.
