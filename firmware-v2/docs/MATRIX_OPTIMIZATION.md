# Optimisation de Matrix

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `64` |
| Symbole | `MATRIX` |
| Nom Particle | `Matrix` |
| État | actif |
| Implémentation | `src/animations/matrix.cpp` |
| Paramètres | vitesse uniquement |

`matrix_setup()` initialise huit coordonnées X/Z pour chacun des quatre flux.
`matrix()` dessine dix niveaux de traîne par flux, fait descendre leurs quatre
positions verticales puis renouvelle les coordonnées d'un flux terminé. Le
mode ne partage pas cet état avec une autre animation.

Le rendu, l'ordre des appels aléatoires, les quatre décalages de départ
`7, 10, 15, 19`, les couleurs et le rythme doivent rester inchangés.

## Audit mémoire avant optimisation

Les huit tableaux X/Z sont dimensionnés à 64 `int`, mais seuls les index 1 à 8
sont utilisés. Ils réservent donc 2 048 octets pour 64 coordonnées utiles de
valeur 0 à 7. Les quatre positions verticales occupent 16 octets en `int` alors
que leur domaine observé est compris entre −10 et 19. `voxDelay` réserve quatre
octets et n'est jamais lu.

La représentation retenue conserve neuf cases par tableau afin de garder les
index historiques 1 à 8 sans modifier les boucles ni l'ordre des tirages :

- huit tableaux de neuf `CubeAxisIndex`, soit 72 octets ;
- quatre positions verticales en `int8_t`, soit 4 octets ;
- suppression de `voxDelay` inutilisé.

Le gain statique attendu est de 1 992 octets, sans allocation dynamique, sans
nouveau buffer de pile et sans changement du framebuffer.

## Baseline avant modification

La baseline inclut les optimisations Snake, CrumblingPlane et GoldRain :

| Mesure | Avant |
| --- | ---: |
| Flash | 113 816 octets |
| RAM statique | 23 476 octets |
| Taille binaire | 113 820 octets |
| Marge Flash | 17 256 octets |

Commande utilisée :

```powershell
particle call chicken_turkey SetMode "M:Matrix,S:4,B:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 25 680 octets |
| Mémoire libre à la demande | 25 664 octets |
| Minimum du mode | 25 664 octets |
| Frames observées | 196 |
| Dernière frame | 51 989 µs |
| Temps moyen de frame | 51 954 µs |
| Pire frame | 52 011 µs |
| FPS moyen | 19,2 |
| OOM | 0 |

La luminosité brute relevée était `2`, correspondant à `B:1`. La comparaison
visuelle reste à valider par l'utilisateur.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 113 816 | 113 864 | +48 |
| RAM statique | 23 476 | 21 484 | −1 992 |
| Taille binaire | 113 820 | 113 868 | +48 |
| Mémoire libre à la demande | 25 664 | 27 656 | +1 992 |
| Minimum du mode | 25 664 | 27 656 | +1 992 |
| Temps moyen de frame | 51 954 µs | 51 992 µs | +38 µs |
| Pire temps de frame | 52 011 µs | 52 161 µs | +150 µs |
| FPS moyen | 19,2 | 19,2 | 0 |

Le léger coût Flash de 48 octets vient du code d'accès aux coordonnées sur un
octet et reste très inférieur au gain RAM ciblé. La marge Flash demeure de
17 208 octets, sous la limite de 131 072 octets.

La mesure après flash porte sur 188 frames, sans OOM. La mémoire libre après
initialisation passe de 25 680 à 27 672 octets. `RESETDIAG` a expiré pendant la
reconnexion, mais les statistiques étaient déjà vierges après le redémarrage.

## Validation

- [x] Les huit tableaux occupent exactement 72 octets.
- [x] Les index historiques 1 à 8 restent valides.
- [x] Les quatre positions verticales tiennent dans `int8_t`.
- [x] L'ordre et le nombre de tirages aléatoires restent inchangés.
- [x] La suite complète des tests hôte réussit : 35 tests sur 35.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Matrix est flashé et mesuré à `B:1` (`brightness=2`).
- [ ] La comparaison physique Matrix est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
