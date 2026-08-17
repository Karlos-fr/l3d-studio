# Optimisation de Snake

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `60` |
| Symbole | `SNAKE` |
| Nom Particle | `Snake` |
| Implémentation | `src/animations/snake.cpp` |
| État historique | `src/core/legacy_state.h` |
| Paramètres | vitesse globale ; aucune couleur ni switch propre |
| Réseau | aucun accès propre au mode |

Le comportement à préserver est le déplacement autonome dans le cube, la
priorité historique des six directions, la cible verte, la croissance initiale
jusqu'à dix segments, le clignotement rouge/blanc après collision et le délai
commandé par la vitesse globale.

## Audit avant optimisation

Snake utilise actuellement :

- `SNsnake`, un `std::vector<voxel>` dont la capacité peut atteindre les 512
  positions du cube ;
- `treats`, un `std::vector<voxel>` qui contient en pratique une cible ;
- `possibleDirections`, un `std::vector<voxel>` de six éléments constants ;
- `allowedDirections`, un `std::vector<voxel*>` local recréé lors des
  changements de direction ;
- trois compteurs `int` et un pointeur de direction.

Un `voxel` occupe trois octets depuis la phase 4. Les éléments des vecteurs
sont donc compacts, mais leurs allocations, réallocations et libérations
fragmentent encore le heap. L'insertion en tête déplace déjà tous les segments,
quelle que soit la représentation du conteneur.

Le mode n'alloue pas de gros buffer sur la pile, n'utilise ni `String`, ni
trigonométrie, ni framebuffer supplémentaire. Les écritures passent par
`setPixelColor()`, qui valide le mapping logique.

## Baseline de compilation

Compilation Photon avec Device OS 2.3.1 le 2026-08-17 :

| Mesure | Avant |
| --- | ---: |
| Flash | 115 944 octets |
| RAM statique | 39 932 octets |
| Taille binaire | 115 948 octets |
| Marge Flash | 15 128 octets |

## Baseline runtime

Commande utilisée :

```powershell
particle call chicken_turkey SetMode "M:Snake,S:4,B:1,"
```

Mesure courte après remise à zéro des diagnostics :

| Mesure | Avant |
| --- | ---: |
| Luminosité interne | 2, correspondant à `B:1` |
| Mémoire libre après initialisation | 9 192 octets |
| Mémoire libre à la demande | 9 056 octets |
| Minimum global et du mode | 9 056 octets |
| Frames observées | 157 |
| Dernière frame | 51 988 µs |
| Temps moyen de frame | 51 999 µs |
| Pire frame | 52 111 µs |
| FPS moyen | 19,2 |
| OOM | 0 |

Cette mesure ne constitue pas encore une validation visuelle. Le Photon a été
replacé en mode `Off` avec `B:1` après le relevé.

## Optimisation retenue

- utiliser les 1 536 octets du scratch partagé comme tableau borné de 512
  voxels lorsque Snake est actif ;
- stocker la longueur courante sur un compteur fixe ;
- représenter la cible par un voxel unique et un drapeau de présence ;
- placer les six directions dans un tableau constant sans allocation ;
- utiliser au maximum six indices locaux pour les directions autorisées ;
- définir explicitement le comportement du cube plein et borner la recherche
  aléatoire d'une cible avant un parcours déterministe de repli.

`transitionAll()` utilise le même scratch avant l'entrée dans Snake, puis
`snakeResetCube()` initialise l'état. Les deux durées de vie ne se chevauchent
donc pas.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 115 944 | 115 288 | -656 octets |
| RAM statique | 39 932 | 39 900 | -32 octets |
| Taille binaire | 115 948 | 115 292 | -656 octets |
| Mémoire libre après initialisation | 9 192 | 9 256 | +64 octets |
| Mémoire libre à la demande | 9 056 | 9 240 | +184 octets |
| Minimum du mode | 9 056 | 9 240 | +184 octets |
| Temps moyen de frame | 51 999 µs | 51 987 µs | -12 µs |
| Pire temps de frame | 52 111 µs | 52 011 µs | -100 µs |
| FPS moyen | 19,2 | 19,2 | 0 |

Le relevé après optimisation couvre 155 frames, sans OOM. Le gain runtime est
supérieur au seul gain statique parce que les capacités des anciens `vector`
ne résident plus sur le heap.

## Validation

- [x] Aucun `vector`, `String` ou allocation dynamique ne reste dans Snake.
- [x] Les capacités vide, pleine et maximale sont testées côté hôte.
- [x] L'ordre de choix des directions reste identique.
- [x] La suite complète des tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Le flash et le retour en ligne réussissent.
- [ ] La comparaison physique est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
