# Optimisation de Whirlwind

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `28` |
| Symbole | `WHIRLWIND` |
| Nom Particle | `Whirlwind` |
| État | actif |
| Implémentation | `src/animations/whirlwind.cpp` |
| Paramètres | vitesse |

Whirlwind anime 19 points autour d'un centre. Chaque point possède une couleur,
un angle, un rayon et une hauteur.

## Audit et optimisation

Les quatre tableaux globaux représentaient un bloc temporaire aligné de
288 octets, présent même hors du mode. Ils sont regroupés dans
`WhirlwindScratch`, puis placés dans le scratch partagé de 1 536 octets. Une
couleur triviale `PackedColor` conserve exactement les trois octets RGB sans
introduire de constructeur interdit dans une union C++14.

Le code historique répète 19 fois le dessin et le déplacement des 19 points
avant chaque affichage. Cette répétition coûteuse est volontairement conservée :
la retirer changerait la vitesse, le nombre de tirages aléatoires et les
trajectoires visibles.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 976 | 111 944 | −32 |
| RAM statique | 19 524 | 19 132 | −392 |
| Taille binaire | 111 980 | 111 948 | −32 |

Le gain RAM inclut aussi les 102 octets Frozen et leur alignement historique.

```powershell
particle call chicken_turkey SetMode "M:Whirlwind,S:4,B:1,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 29 344 | 30 056 | +712 |
| Frames observées | 263 | 264 | +1 |
| Temps moyen de frame | 40 254 µs | 40 179 µs | −75 µs |
| Pire frame | 41 175 µs | 41 992 µs | +817 µs |
| FPS moyen | 24,8 | 24,8 | stable |
| OOM | 0 | 0 | stable |

La mémoire runtime varie aussi avec les allocations système après redémarrage ;
seuls les 392 octets statiques du build constituent un gain attribuable exact.
La luminosité brute était `2`. Le Photon a ensuite été replacé en mode `Off`
avec `B:1`.

## Validation

- [x] L'état temporaire Whirlwind occupe exactement 288 octets du scratch.
- [x] Les couleurs gardent trois octets RGB et le même générateur aléatoire.
- [x] Les 19 passes historiques par frame sont conservées.
- [x] La suite complète des 60 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Whirlwind est flashé et mesuré à `B:1` sans OOM.
- [ ] La comparaison physique Whirlwind est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
