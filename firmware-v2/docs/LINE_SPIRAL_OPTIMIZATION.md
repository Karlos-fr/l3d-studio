# Optimisation de LineSpiral

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `62` |
| Symbole | `DSPIRAL` |
| Nom Particle | `LineSpiral` |
| État | actif |
| Implémentation | `src/animations/d_spiral.cpp` |
| Paramètres | vitesse |

LineSpiral déplace une ligne lumineuse sur quatre côtés et quatre niveaux
intérieurs, tout en faisant varier l'atténuation RGB.

## Audit et optimisation

La cible `TARGET` était un float mais ne reçoit que des valeurs entières et un
pas constant de un. Elle devient `int8_t`. La luminosité, le niveau intérieur,
le côté et la phase de couleur deviennent des `uint8_t` selon leurs bornes
respectives. `fade_factor` et `PAUSE`, jamais lus, sont supprimés ; `STEPS`
devient la constante `SPIRAL_STEP`.

Les boucles historiques parcourent aussi la sentinelle 8 sur chaque axe. Elles
sont conservées car elles consomment des tirages aléatoires qui influencent les
voxels visibles suivants.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 688 | 111 512 | −176 |
| RAM statique | 19 108 | 19 076 | −32 |
| Taille binaire | 111 692 | 111 516 | −176 |

```powershell
particle call chicken_turkey SetMode "M:LineSpiral,S:4,B:1,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 30 080 | 30 112 | +32 |
| Frames observées | 179 | 179 | stable |
| Temps moyen de frame | 55 018 µs | 55 089 µs | +71 µs |
| Pire frame | 55 731 µs | 55 995 µs | +264 µs |
| FPS moyen | 18,1 | 18,1 | stable |
| OOM | 0 | 0 | stable |

La luminosité brute valait `2`, puis le Photon a été replacé en mode `Off` avec
`B:1`.

## Validation

- [x] La cible reste entière et bornée entre zéro et sept.
- [x] Les quatre états numériques bornés utilisent `uint8_t`.
- [x] Les deux variables mortes sont supprimées et le pas devient constant.
- [x] Les sentinelles et les tirages aléatoires des boucles sont conservés.
- [x] La suite complète des 72 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] LineSpiral est flashé et mesuré à `B:1` sans OOM.
- [ ] La comparaison physique LineSpiral est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
