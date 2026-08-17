# Optimisation de CrumblingPlane

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `57` |
| Symbole | `CRUMBLE` |
| Nom Particle | `CrumblingPlane` |
| Implémentation | `src/animations/crumble.cpp` |
| Paramètres | vitesse globale ; aucune couleur ni switch propre |
| Réseau | aucun accès propre au mode |

Le mode remplit un plan de 64 positions, retire ces positions dans un ordre
aléatoire, déplace chaque voxel sur huit profondeurs, puis alterne miroir et
axe. Les couleurs aléatoires et la temporisation historique doivent rester
identiques.

## Audit avant optimisation

`remaining` est un `std::vector<int>` contenant 64 valeurs de `0` à `63`. Ses
éléments occupent 256 octets sur le heap alors qu'un octet suffit. Chaque tirage
efface un élément au milieu du vecteur et déplace les suivants.

`resetCycle()` ne vide pas explicitement le vecteur avant de repousser les 64
positions. Une nouvelle entrée dans le mode après une sortie au milieu d'un
cycle peut donc conserver les positions restantes puis en ajouter 64 autres.
La nouvelle représentation devra réinitialiser entièrement son compteur.

Les coordonnées temporaires restent des `int` dans `setVoxel()` parce que les
permutations d'axes sont plus lisibles ainsi. Les états d'axe, d'offset, de
position et de compteur tiennent en revanche sur un octet.

## Baseline avant modification

La baseline de compilation inclut l'optimisation Snake terminée juste avant :

| Mesure | Avant |
| --- | ---: |
| Flash | 115 288 octets |
| RAM statique | 39 900 octets |
| Taille binaire | 115 292 octets |
| Marge Flash | 15 784 octets |

Commande matérielle :

```powershell
particle call chicken_turkey SetMode "M:CrumblingPlane,S:4,B:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 9 256 octets |
| Mémoire libre à la demande | 8 976 octets |
| Minimum du mode | 8 976 octets |
| Frames observées | 1 128 |
| Dernière frame | 51 988 µs |
| Temps moyen de frame | 6 709 µs |
| Pire frame | 52 006 µs |
| FPS moyen | 149,0 |
| OOM | 0 |

Le Photon a été replacé en mode `Off` avec `B:1` après le relevé.

## Optimisation retenue

- remplacer `vector<int>` par 64 `uint8_t` dans le scratch partagé ;
- stocker le nombre de positions restantes sur un octet ;
- décaler en place les éléments suivant la position retirée ;
- conserver la mise à l'échelle entière du tirage aléatoire ;
- réinitialiser explicitement le compteur à chaque nouveau cycle ;
- compacter l'axe, la position, l'offset et le nombre de retournements.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 115 288 | 114 424 | -864 octets |
| RAM statique | 39 900 | 39 876 | -24 octets |
| Taille binaire | 115 292 | 114 428 | -864 octets |
| Mémoire libre après initialisation | 9 256 | 9 280 | +24 octets |
| Mémoire libre à la demande | 8 976 | 9 264 | +288 octets |
| Minimum du mode | 8 976 | 9 264 | +288 octets |
| Temps moyen de frame | 6 709 µs | 6 704 µs | -5 µs |
| Pire temps de frame | 52 006 µs | 51 988 µs | -18 µs |
| FPS moyen | 149,0 | 149,1 | +0,1 |

Le relevé après optimisation couvre 1 120 frames, sans OOM. Le premier appel
`RESETDIAG` après le flash a expiré pendant la reconnexion Cloud ; la mesure
retournée ensuite appartient bien au mode 57 depuis le redémarrage courant.

## Validation

- [x] Aucun conteneur dynamique ne reste dans CrumblingPlane.
- [x] Les retraits aux deux extrémités et au milieu sont testés côté hôte.
- [x] Une réinitialisation partielle ne conserve aucun ancien élément.
- [x] La suite complète des tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Le flash et le relevé runtime réussissent à `B:1`.
- [ ] La comparaison physique est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
