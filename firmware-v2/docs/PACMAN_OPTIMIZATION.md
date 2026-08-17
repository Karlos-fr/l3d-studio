# Optimisation de PacMan

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `56` |
| Symbole | `PUCKDUDE` |
| Nom Particle | `PacMan` |
| État | actif |
| Implémentation | `src/animations/puck_dude.cpp` |
| Paramètres | vitesse |

PacMan construit à chaque frame un personnage, deux fantômes et leurs yeux,
puis les déplace autour du contour horizontal du cube.

## Audit et optimisation

Le scratch réservait quatre tableaux de 65 points, soit 780 octets dans sa
branche PacMan. Seuls 37 points PacMan, 37 points fantôme et quatre points pour
les yeux sont dessinés. Le tableau `ghostface` était initialisé et retourné,
mais jamais lu par le rendu. La nouvelle structure conserve une sentinelle zéro
par tableau et occupe exactement 243 octets.

La taille globale de l'union reste 1 536 octets à cause du framebuffer
CubePainter ; cette réduction améliore donc les boucles et clarifie la capacité,
sans réduire la RAM statique totale. La boucle de dessin conserve l'ordre
PacMan, yeux, fantômes pour chaque index utile. L'ancien overload
`rotate_x(Point&)`, sans appel actif, et la couleur globale inutilisée sont
supprimés.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 768 | 111 688 | −80 |
| RAM statique | 19 108 | 19 108 | stable |
| Taille binaire | 111 772 | 111 692 | −80 |

Le jalon inclut également la tangente mutualisée de Fireworks.

```powershell
particle call chicken_turkey SetMode "M:PacMan,S:4,B:1,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 30 080 | 30 080 | stable |
| Frames observées | 217 | 214 | −3 |
| Temps moyen de frame | 52 896 µs | 52 146 µs | −750 µs |
| Pire frame | 53 988 µs | 52 994 µs | −994 µs |
| FPS moyen | 18,9 | 19,1 | +0,2 |
| OOM | 0 | 0 | stable |

La luminosité brute valait `2`. Le Photon a ensuite été replacé en mode `Off`
avec `B:1`.

## Validation

- [x] Les trois sprites utiles occupent exactement 243 octets du scratch.
- [x] Le tableau non rendu `ghostface` est supprimé.
- [x] Les quatre yeux restent dessinés entre PacMan et les fantômes.
- [x] L'overload flottant inutilisé de rotation est supprimé.
- [x] La suite complète des 69 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] PacMan est flashé et mesuré à `B:1` sans OOM.
- [ ] La comparaison physique PacMan est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
