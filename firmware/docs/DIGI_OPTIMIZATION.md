# Optimisation de Digi

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `36` |
| Symbole | `DIGI` |
| Nom Particle | `Digi` |
| État | actif |
| Implémentation | `src/animations/digi.cpp` |
| Paramètres | une couleur, trois switches, vitesse |

Digi mélange les 512 index, remplit chaque voxel, attend 400 ms puis répète le
même processus pour effacer le cube.

## Audit et décision

Le tableau d'ordre `uint16_t[512]` occupe 1 024 octets mais doit représenter les
index 0 à 511. Il réutilise déjà `pixelOrder` dans le scratch partagé et ne peut
pas être réduit à `uint8_t`. Le mélange de Fisher-Yates conserve ses bornes et
la distribution des tirages.

Les variables locales inutilisées `i` et `pulseRate` ont été retirées. Les
1 024 appels `showPixels()` d'un cycle sans fondu sont coûteux, mais ils
constituent le rendu progressif historique. Ils ne sont pas regroupés dans ce
jalon afin de préserver le comportement visible.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 896 | 111 768 | −128 |
| RAM statique | 19 108 | 19 108 | stable |
| Taille binaire | 111 900 | 111 772 | −128 |

Le gain Flash du jalon provient principalement du parseur CubePainter voisin.

```powershell
particle call chicken_turkey SetMode "M:Digi,S:8,B:1,C1:00FF00,T1:0,T2:0,T3:0,"
```

Avant et après modification, un essai limité à 12 secondes au preset le plus
rapide indique 32 608 octets libres, aucun OOM et aucune frame terminée (`c=0`).
La frame longue est cohérente avec les 1 024 transmissions NeoPixel. La
luminosité brute valait `2`, puis le Photon a été replacé en mode `Off` avec
`B:1`.

## Validation

- [x] L'ordre des 512 pixels reste dans le scratch partagé.
- [x] Le type `uint16_t` nécessaire aux index 256 à 511 est conservé.
- [x] Le mélange et les deux remplissages historiques sont testés statiquement.
- [x] Aucun état ou buffer permanent propre à Digi n'est ajouté.
- [x] La suite complète des 66 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Digi est lancé avant/après uniquement à `B:1`, avec essai long suspendu.
- [ ] Un cycle complet et l'apparence physique Digi sont validés.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
