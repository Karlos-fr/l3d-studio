# Optimisation de CubeClassics

## Périmètre

Cette passe couvre le dispatcher `CubeClassics` (34) et ses modes `UpDown`
(43), `Worms` (45), `Planes` (46), `VoxelDrop` (47), `PlaneFill` (48),
`BuildAWall` (49), `VoxelRandom` (50), `SineWave` (51), `LineSpin` (52),
`SineLines` (53), `MovingSphere` (54), `RandomPath` (66), `Pyramid` (67),
`Folder` (68) et `DiagonalPlanes` (69). `RopeCoil` (44) possède encore une
branche interne mais aucune entrée dans les métadonnées. `Fireworks` (55), dans
le même fichier, a été traité dans sa passe dédiée.

Les IDs, commandes, couleurs, switches, nombres d'itérations, tirages
aléatoires, délais et ordres de rendu restent compatibles.

## Optimisations retenues

- l'ordre mélangé du dispatcher utilise 17 octets de pile au lieu de 68. Le
  mélange compact consomme exactement un tirage `random(0, 17)` par entrée,
  comme le helper historique;
- les deux sommets de `DiagonalPlanes` ne résident plus en permanence dans la
  RAM globale. Ils vivent sur la pile uniquement pendant le décodage de
  l'arête et l'appel de l'effet;
- la traînée locale de `VoxelRandom` utilise 24 octets de coordonnées bornées
  au lieu de 96 octets d'entiers. Sa copie parcourt désormais les indices 7 à
  1 : l'ancienne itération à zéro lisait `snake[-1]`, puis écrasait aussitôt la
  valeur obtenue;
- `LineSpin` calcule une fois par frame le sinus dont dépendent ses huit lignes,
  au lieu de huit fois;
- `SineLines` calcule ses deux paramètres invariants une fois par frame au lieu
  de huit, et supprime un cosinus dont le résultat était immédiatement écrasé;
- `MovingSphere` compare des distances et rayons au carré. Il retire 512
  racines carrées par frame sans modifier les trois sinus/cosinus qui animent
  le centre et le diamètre.

Les 1 500 frames et les 512 voxels de `MovingSphere`, soit 768 000 décisions,
ont été comparés en simple précision : aucun voxel ne diffère du prédicat avec
racine carrée.

## Décisions conservatrices

- les paires de tableaux de 64 octets de `UpDown`, `VoxelDrop` et `BuildAWall`
  restent locales. Leur total de 128 octets respecte la limite de pile et leurs
  durées de vie ne justifient pas un nouvel état résident;
- le chemin de `RandomPath` conserve son buffer local borné de 28 octets;
- `SineWave` garde sa distance réelle, utilisée comme phase d'un sinus. Une
  comparaison au carré ne serait pas équivalente et une table ajouterait de la
  Flash pour un gain non mesuré;
- les calculs géométriques de `Pyramid`, `Folder`, `Planes` et `Worms` ne
  possèdent ni allocation dynamique, ni gros buffer, ni état permanent à
  mutualiser;
- les tests `mode | 0x01` et `mode | 0x02` de `VoxelRandom` sont historiques et
  toujours vrais. Les corriger en opérations binaires `&` changerait les
  trajectoires; cette évolution ne fait pas partie de l'optimisation mémoire.

## Mesures de compilation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 288 | 111 288 | 0 |
| RAM statique | 19 052 | 19 020 | −32 |
| Taille binaire | 111 292 | 111 292 | 0 |
| Marge Flash | 19 784 | 19 784 | 0 |

Le retrait des deux `Point` globaux explique la baisse de RAM statique, avec
l'effet d'alignement visible dans le rapport Particle. Les réductions des
tableaux locaux diminuent la pointe de pile mais n'apparaissent pas dans la RAM
statique.

## Validation

- 80 tests hôte réussis;
- équivalence exhaustive de `MovingSphere` sur un cycle complet;
- décodage des douze arêtes et bornes de la traînée vérifiés;
- compilation Photon Device OS 2.3.1 réussie;
- aucune allocation dynamique et aucun buffer local supérieur à 256 octets;
- aucune référence upstream modifiée et aucun secret ajouté;
- `git diff --check` sans erreur après correction du diff.

Une demande de diagnostic de la baseline `MovingSphere` à `B:1,S:1` n'a pas
produit de frame complète dans la fenêtre courte : `runCubeClassics` conserve
la main pendant les 1 500 sous-frames. Le test a été interrompu et le cube
remis sur `M:Off,B:1,`, avec `brightness=2`. Conformément à la mise en attente
des essais coûteux, les baselines temporelles longues, les cycles complets et
la validation visuelle restent explicitement non cochés dans le suivi.

Le binaire optimisé a ensuite été flashé sur `chicken_turkey`. Des smoke tests
courts ont démarré puis interrompu `LineSpin`, `SineLines`, `MovingSphere` et
`VoxelRandom` avec `S:1,B:1`; les quatre commandes ont été acceptées et le
Photon est resté joignable. Le cube a de nouveau été placé sur `Off,B:1`, avec
`brightness=2`. Ces essais ne valent pas validation visuelle d'un cycle complet.

Le rollback consiste à reflasher le binaire du jalon précédent en suivant
`ROLLBACK.md`.
