# Optimisation de Rain

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `30` |
| Symbole | `RAIN` |
| Nom Particle | `Rain` |
| État | actif |
| Implémentation | `src/animations/rain.cpp` |
| Paramètres | une couleur, quatre switches, vitesse |

Rain déplace les gouttes directement dans le framebuffer. Il est distinct du
moteur de salves utilisé par GoldRain et AcidRain.

## Audit et optimisation

Les facteurs fixes `0,5`, `0,25` et `0,125` de la traînée deviennent des
décalages entiers. La diminution Matrix `canal -= canal * 0,125` devient
`canal * 7 / 8`. Les quatre conversions sont comparées exhaustivement sur les
256 valeurs possibles et reproduisent exactement la troncature historique.

La position locale `Point` d'une nouvelle goutte, composée de trois floats, est
remplacée par deux coordonnées `int8_t`. L'ordre des tirages X puis Z, les cinq
à dix nouvelles gouttes et les switches restent inchangés. Aucun buffer ou état
permanent propre à Rain n'est nécessaire.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 688 | 111 512 | −176 |
| RAM statique | 19 108 | 19 076 | −32 |
| Taille binaire | 111 692 | 111 516 | −176 |

Le gain RAM provient des états SlidingPlanes/LineSpiral du même jalon.

```powershell
particle call chicken_turkey SetMode "M:Rain,S:4,B:1,C1:0000FF,T1:0,T2:0,T3:0,T4:0,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 30 080 | 30 112 | +32 |
| Frames observées | 76 | 74 | −2 |
| Temps moyen de frame | 152 002 µs | 152 386 µs | +384 µs |
| Pire frame | 152 237 µs | 152 994 µs | +757 µs |
| FPS moyen | 6,5 | 6,5 | stable |
| OOM | 0 | 0 | stable |

La variation de temps reste inférieure à une milliseconde sur une frame de
152 ms. La luminosité brute valait `2`, puis le Photon a été replacé en mode
`Off` avec `B:1`.

## Validation

- [x] Les quatre facteurs sont identiques sur les 256 valeurs de canal.
- [x] La position temporaire n'utilise plus de `Point` flottant.
- [x] Les tirages aléatoires et les quatre switches sont conservés.
- [x] La suite complète des 72 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Rain est flashé et mesuré à `B:1` sans OOM.
- [ ] Les variantes des quatre switches et l'apparence sont validées physiquement.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
