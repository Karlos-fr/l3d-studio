# Optimisation de Collide2

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `42` |
| Symbole | `COLLIDE2` |
| Nom Particle | `Collide2` |
| État | actif |
| Implémentation | `src/animations/collide2.cpp` |
| Paramètres | vitesse uniquement |

Le mode anime 72 points colorés sur un espace toroïdal 8×8×8. Chaque point se
déplace sur un seul axe à la fois. Une collision dessine une petite forme grise
puis replace le point aléatoirement. Le mode ne partage pas son état avec une
autre animation.

## Audit avant optimisation

L'état historique utilise deux tableaux de 72 `Point` de 12 octets et un
tableau de 72 `Color` de 3 octets :

| État | Taille |
| --- | ---: |
| Positions `COdots` | 864 octets |
| Directions `COdir` | 864 octets |
| Couleurs `COclr` | 216 octets |
| Total | 1 944 octets |

Les positions sont toujours comprises entre 0 et 7 et les directions entre −1
et 1. Une structure compacte de 9 octets peut donc réunir trois
`CubeAxisIndex`, trois `int8_t` et une `Color`, soit 648 octets pour 72 points.
Le gain statique attendu est de 1 296 octets.

La fonction historique `sphere(center, 1, color)` parcourt 30×30 angles et
effectue trigonométries et 900 tentatives d'écriture. Sa conversion tronquée
dépend toutefois de la position du centre, notamment près de la coordonnée
zéro : pré-calculer de simples offsets changerait alors certains voxels. Cette
boucle chaude est donc identifiée, mais volontairement conservée pendant la
passe mémoire. Son remplacement demandera une comparaison numérique distincte
sur les 512 centres et une validation visuelle dédiée.

## Baseline avant modification

La baseline inclut l'optimisation Matrix :

| Mesure | Avant |
| --- | ---: |
| Flash | 113 864 octets |
| RAM statique | 21 484 octets |
| Taille binaire | 113 868 octets |
| Marge Flash | 17 208 octets |

Commande utilisée :

```powershell
particle call chicken_turkey SetMode "M:Collide2,S:4,B:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 27 672 octets |
| Mémoire libre à la demande | 27 656 octets |
| Minimum du mode | 27 656 octets |
| Frames observées | 104 |
| Dernière frame | 197 979 µs |
| Temps moyen de frame | 115 191 µs |
| Pire frame | 245 988 µs |
| FPS moyen | 8,6 |
| OOM | 0 |

La luminosité brute relevée était `2`, correspondant à `B:1`. La séquence
visuelle reste à valider par l'utilisateur.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 113 864 | 113 576 | −288 |
| RAM statique | 21 484 | 20 188 | −1 296 |
| Taille binaire | 113 868 | 113 580 | −288 |
| Mémoire libre à la demande | 27 656 | 28 952 | +1 296 |
| Minimum du mode | 27 656 | 28 952 | +1 296 |
| Temps moyen de frame | 115 191 µs | 101 659 µs | −13 532 µs |
| Pire temps de frame | 245 988 µs | 342 988 µs | +97 000 µs |
| FPS moyen | 8,6 | 9,8 | +1,2 |

Le gain RAM atteint exactement les 1 296 octets attendus. La factorisation du
tirage de direction et les types compacts réduisent également la Flash de
288 octets, avec une marge portée à 17 496 octets.

La mesure après flash porte sur 90 frames, sans OOM. La mémoire libre après
initialisation passe de 27 672 à 28 968 octets. Le pire temps de frame dépend
du nombre aléatoire de collisions et régresse sur cet échantillon court ; aucun
gain de performance n'est donc attribué à la seule compaction mémoire.

## Validation

- [x] Les 72 points compacts occupent exactement 648 octets.
- [x] Les domaines position et direction sont bornés par leurs types.
- [x] Les tirages aléatoires conservent leur ordre et leur distribution.
- [x] La boucle trigonométrique est conservée pour une tâche mesurée distincte.
- [x] La suite complète des tests hôte réussit : 40 tests sur 40.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Collide2 est flashé et mesuré à `B:1` (`brightness=2`).
- [ ] La comparaison physique Collide2 est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
