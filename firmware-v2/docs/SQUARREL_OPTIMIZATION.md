# Optimisation de Squarrel

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `21` |
| Symbole | `SQUARRAL` |
| Nom Particle | `Squarrel` |
| État | actif |
| Implémentation | `src/animations/squarral.cpp` |
| Paramètres | vitesse uniquement |

Squarrel déplace un voxel sur des carrés imbriqués et conserve une traînée de
50 positions. Un axe aléatoire change l'orientation du parcours à chaque cycle
vertical complet. Le mode utilise les couleurs arc-en-ciel partagées, mais son
état de déplacement et sa traînée lui sont propres.

## Audit mémoire avant optimisation

La traînée historique contient 50 `Point` de 12 octets, soit 600 octets. Les
trois autres `Point` (`position`, `increment`, `pixel`) ajoutent 36 octets. Ces
floats ne portent pourtant que :

- des coordonnées logiques entières entre 0 et 7 ;
- des incréments signés parmi −1, 0 et 1.

Une position compacte X/Y/Z occupe 3 octets et une direction signée également
3 octets. La traînée passe donc à 150 octets et les trois points à 9 octets,
pour un gain attendu de 477 octets. Les compteurs étroits `bound`, `boundInc`
et `squarral_zInc` peuvent libérer 9 octets supplémentaires. Le gain total
attendu est de 486 octets.

La traînée reste dédiée au mode pendant cette passe. La placer immédiatement
dans le scratch partagé entrerait en conflit avec `transition()` lors du fondu
initial et modifierait son contenu avant la première frame utile.

## Baseline avant modification

La baseline inclut l'optimisation Collide2 :

| Mesure | Avant |
| --- | ---: |
| Flash | 113 576 octets |
| RAM statique | 20 188 octets |
| Taille binaire | 113 580 octets |
| Marge Flash | 17 496 octets |

Commande utilisée :

```powershell
particle call chicken_turkey SetMode "M:Squarrel,S:4,B:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 28 968 octets |
| Mémoire libre à la demande | 28 952 octets |
| Minimum du mode | 28 952 octets |
| Frames observées | 310 |
| Dernière frame | 26 989 µs |
| Temps moyen de frame | 26 966 µs |
| Pire frame | 27 123 µs |
| FPS moyen | 37,0 |
| OOM | 0 |

La luminosité brute relevée était `2`, correspondant à `B:1`. La comparaison
visuelle reste à valider par l'utilisateur.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 113 576 | 113 256 | −320 |
| RAM statique | 20 188 | 19 692 | −496 |
| Taille binaire | 113 580 | 113 260 | −320 |
| Mémoire libre à la demande | 28 952 | 29 448 | +496 |
| Minimum du mode | 28 952 | 29 448 | +496 |
| Temps moyen de frame | 26 966 µs | 26 986 µs | +20 µs |
| Pire temps de frame | 27 123 µs | 26 995 µs | −128 µs |
| FPS moyen | 37,0 | 37,0 | 0 |

Le compilateur libère 496 octets de RAM statique, soit 10 octets de plus que
le calcul isolé grâce à la disposition finale des globaux. La simplification
des accès compacts réduit aussi la Flash de 320 octets et porte sa marge à
17 816 octets.

La mesure après flash porte sur 250 frames, sans OOM. La mémoire libre après
initialisation passe de 28 968 à 29 464 octets. Le rythme reste inchangé à
37,0 FPS. La première commande après reconnexion a expiré ; la mesure reportée
provient de la relance réussie une fois le Photon stabilisé.

## Validation

- [x] La traînée compacte de 50 positions occupe exactement 150 octets.
- [x] Positions et incréments respectent leurs domaines signés ou non signés.
- [x] Le décalage conserve exactement l'ordre historique des 50 positions.
- [x] Le mapping des six axes produit les mêmes coordonnées.
- [x] La suite complète des tests hôte réussit : 44 tests sur 44.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Squarrel est flashé et mesuré à `B:1` (`brightness=2`).
- [ ] La comparaison physique Squarrel est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
