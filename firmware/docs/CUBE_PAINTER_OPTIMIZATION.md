# Optimisation de CubePainter

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `33` |
| Symbole | `CUBE_PAINTER` |
| Nom Particle | `CubePainter` |
| État | actif, endpoint Cloud dédié |
| Implémentation | `src/animations/cube_painter.cpp` |
| Paramètres | commandes d'index, couleur et effacement |

CubePainter affiche une image RGB persistée dans l'EEPROM et applique les
commandes reçues par la fonction Particle historique `CubePainter`.

## Audit et optimisation

Le framebuffer de 1 536 octets réutilise déjà le scratch partagé. Il est chargé
depuis l'EEPROM après la transition d'entrée, donc les deux usages ne se
chevauchent pas.

La signature `CubePainter(String command)` est imposée par l'API Particle
Device OS 2.3.1 et reste inchangée. En revanche, l'ancienne validation créait
plusieurs `String` avec `substring()`, puis les recréait lors de la passe
d'écriture avec `toInt()`. Les deux passes lisent désormais directement des
tranches du buffer retourné par `c_str()`. La validation complète précède
toujours toute écriture dans le framebuffer ou l'EEPROM.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 896 | 111 768 | −128 |
| RAM statique | 19 108 | 19 108 | stable |
| Taille binaire | 111 900 | 111 772 | −128 |

Le jalon inclut aussi le nettoyage de Digi, sans effet mesurable séparé.

```powershell
particle call chicken_turkey SetMode "M:CubePainter,B:1,"
```

| Mesure runtime | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Minimum du mode | 30 080 | 30 080 | stable |
| Frames observées | 127 | 123 | −4 |
| Temps moyen de frame | 101 960 µs | 101 957 µs | −3 µs |
| Pire frame | 102 018 µs | 102 008 µs | −10 µs |
| FPS moyen | 9,8 | 9,8 | stable |
| OOM | 0 | 0 | stable |

Deux commandes sans écriture ont vérifié le parseur après flash : `I0,` retourne
`0` et `I512,` retourne `-103`, le code historique hors limites. La luminosité
brute valait `2`.

## Validation

- [x] Le framebuffer de 1 536 octets reste dans le scratch partagé.
- [x] Aucune sous-chaîne applicative n'est créée pendant le parsing.
- [x] Toute la commande est validée avant la première écriture.
- [x] Les index 0 et 511 sont acceptés et 512 est rejeté par les tests hôte.
- [x] La suite complète des 66 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] CubePainter et son endpoint sont testés à `B:1` sans écriture EEPROM.
- [ ] L'image persistée est comparée physiquement à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
