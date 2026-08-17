# Optimisation de Plasma

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `22` |
| Symbole | `PLASMA` |
| Nom Particle | `Plasma` |
| État | actif |
| Implémentation | `src/animations/plasma.cpp` |
| Paramètres | vitesse |

Plasma calcule trois centres de Lissajous puis, pour chacun des 512 voxels,
trois distances et une modulation sinusoïdale.

## Audit avant optimisation

Chaque voxel exécute trois racines carrées. Les trois distances sont ensuite
mises au carré pour produire les canaux RGB. La troisième distance n'intervient
pas dans la modulation : sa racine peut donc être remplacée par la distance au
carré déjà calculée, après comparaison numérique des canaux finaux.

Les deux premières distances alimentent `sin(distance1 * distance2 *
colorStretch)`. Leur fusion éventuelle en une seule racine modifie l'ordre des
arrondis float ; elle ne sera retenue que si les tests quantifient l'écart et si
la validation physique est possible. À `B:1`, le mapping historique de
luminosité donne toutefois zéro pour Plasma : la validation matérielle sera
limitée au rythme et à la stabilité, pas aux couleurs visibles.

## Baseline avant modification

| Mesure build | Avant |
| --- | ---: |
| Flash | 112 072 octets |
| RAM statique | 19 652 octets |
| Taille binaire | 112 076 octets |

```powershell
particle call chicken_turkey SetMode "M:Plasma,S:4,B:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre à la demande | 29 216 octets |
| Minimum du mode | 29 216 octets |
| Frames observées | 348 |
| Temps moyen de frame | 22 216 µs |
| Pire frame | 23 005 µs |
| FPS moyen | 45,0 |
| OOM | 0 |

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 112 072 | 111 976 | −96 |
| RAM statique | 19 652 | 19 524 | −128 |
| Taille binaire | 112 076 | 111 980 | −96 |
| Minimum du mode | 29 216 | 29 344 | +128 |
| Temps moyen de frame | 22 216 µs | 16 001 µs | −6 215 µs |
| FPS moyen | 45,0 | 62,4 | +17,4 |

Le build après optimisation contient également le déplacement des tableaux
Spectrum du même jalon, qui explique les 128 octets gagnés. La formule Plasma
réduit trois appels à `sqrt` à un seul par voxel. La simulation float32 compare
393 216 canaux sur 128 phases : l'écart maximal est de 1 et au plus deux canaux
diffèrent. Après flash, le relevé couvre 472 frames, avec 16 984 µs au pire et
aucun OOM. Le gain de débit est de 38,7 %.

À `B:1`, la luminosité brute vaut bien `2`, mais le coefficient interne propre
à Plasma produit toujours une sortie noire. Le test matériel valide donc le
rythme et la stabilité, pas une comparaison physique des couleurs. Le Photon a
ensuite été replacé en mode `Off` avec `B:1`.

## Validation

- [x] Les sorties RGB avant/après sont comparées sur les 512 voxels et 128 phases.
- [x] Toute tolérance numérique et tout écart de canal sont documentés.
- [x] Le nombre de racines par voxel est réduit sans modifier les trois centres.
- [x] La suite complète des 57 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Plasma est flashé et mesuré à `B:1` pour le rythme et la stabilité.
- [x] La limite visuelle liée à `B:1` est explicitement conservée.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
