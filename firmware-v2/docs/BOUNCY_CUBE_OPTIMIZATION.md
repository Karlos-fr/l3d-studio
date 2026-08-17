# Optimisation de BouncyCube

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `65` |
| Symbole | `CUBEBOUNCE` |
| Nom Particle | `BouncyCube` |
| État | actif |
| Implémentation | `src/animations/cube_bounce.cpp` |
| Paramètres | vitesse |

BouncyCube déplace un cube de côté deux. Sa couleur change lors d'un rebond et
sa direction est retirée toutes les 25 frames.

## Audit et optimisation

Les trois positions, comprises entre −1 et 8 avant correction puis entre 0 et
6, passent de `int[3]` à `int8_t[3]`. Les trois directions, limitées à −1, 0 et
1, suivent la même conversion. Le tableau `bounds[3]`, toujours égal à deux,
devient une constante unique. Les variables globales `collided` et `delayTime`
deviennent respectivement locale et supprimée.

La borne supérieure exclusive de `random(-1, 1)` ne produit historiquement que
−1 et 0. Elle est conservée malgré son caractère surprenant afin de ne pas
modifier les trajectoires.

## Mesures

| Mesure build | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 944 | 111 896 | −48 |
| RAM statique | 19 132 | 19 108 | −24 |
| Taille binaire | 111 948 | 111 900 | −48 |

```powershell
particle call chicken_turkey SetMode "M:BouncyCube,S:4,B:1,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 30 056 | 30 080 | +24 |
| Frames observées | 218 | 217 | −1 |
| Temps moyen de frame | 52 003 µs | 51 973 µs | −30 µs |
| Pire frame | 52 237 µs | 52 010 µs | −227 µs |
| FPS moyen | 19,2 | 19,2 | stable |
| OOM | 0 | 0 | stable |

Après flash, une première commande a rencontré un mode bloquant restauré depuis
l'EEPROM et n'a pas été comptée. La seconde mesure a vérifié explicitement le
nom `BouncyCube`. La luminosité brute valait `2`, puis le Photon a été replacé
en mode `Off` avec `B:1`.

## Validation

- [x] Positions et directions occupent exactement six octets.
- [x] Les rebonds inférieur, supérieur et les déplacements internes sont testés.
- [x] La période de 25 frames et le tirage historique sont conservés.
- [x] La suite complète des 63 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] BouncyCube est flashé et mesuré à `B:1` sans OOM.
- [ ] La comparaison physique BouncyCube est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
