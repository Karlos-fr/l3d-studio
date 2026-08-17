# Optimisation de SlidingPlanes

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `61` |
| Symbole | `CLASSICPLANES` |
| Nom Particle | `SlidingPlanes` |
| État | actif |
| Implémentation | `src/animations/classic_planes.cpp` |
| Paramètres | vitesse |

SlidingPlanes fait glisser trois plans colorés sur les axes du cube.

## Audit et optimisation

`CPinc` ne vaut que −1 ou 1 et `CPpos` reste entre 0 et 8, la valeur 8 étant la
sentinelle de retournement historique. Ces deux `int` deviennent des `int8_t`,
soit deux octets au total au lieu de huit. `CPframe` reste un compteur 32 bits
afin de conserver les longues périodes de couleur.

Les trois parcours 8 × 8 × 8 et la frame où la position vaut 8 sont conservés.
Supprimer cette sentinelle modifierait le cycle visible.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 688 | 111 512 | −176 |
| RAM statique | 19 108 | 19 076 | −32 |
| Taille binaire | 111 692 | 111 516 | −176 |

Le gain RAM inclut LineSpiral ; le gain direct attendu de `CPinc` et `CPpos`
est de six octets avant alignement global.

```powershell
particle call chicken_turkey SetMode "M:SlidingPlanes,S:4,B:1,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 30 080 | 30 112 | +32 |
| Frames observées | 164 | 166 | +2 |
| Temps moyen de frame | 63 144 µs | 63 218 µs | +74 µs |
| Pire frame | 64 495 µs | 64 988 µs | +493 µs |
| FPS moyen | 15,8 | 15,8 | stable |
| OOM | 0 | 0 | stable |

La luminosité brute valait `2`, puis le Photon a été replacé en mode `Off` avec
`B:1`.

## Validation

- [x] Position et incrément occupent exactement deux octets.
- [x] La sentinelle 8 et l'inversion de direction sont conservées.
- [x] Le compteur de couleur reste sur 32 bits.
- [x] La suite complète des 72 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] SlidingPlanes est flashé et mesuré à `B:1` sans OOM.
- [ ] La comparaison physique SlidingPlanes est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
