# Types compacts et mapping de rendu

## Périmètre

La phase 4 sépare les représentations numériques des animations et centralise
la conversion d'un voxel logique vers le buffer NeoPixel. Elle ne crée aucun
framebuffer supplémentaire et ne change ni les IDs de modes ni le protocole
Particle.

## Types numériques

`src/core/numeric_types.h` définit quatre usages distincts :

- `CubeCoordinate`, signé sur 8 bits, pour les coordonnées discrètes pouvant
  atteindre les sentinelles `-1` et `8` ;
- `CubeAxisIndex`, non signé sur 8 bits, réservé aux valeurs déjà garanties
  entre `0` et `7` ;
- `FixedQ8_8`, signé sur 16 bits, pour les futures positions et vitesses
  fractionnaires de Rain en phase 5 ; son facteur d'échelle vaut `256` ;
- `GeometryScalar`, alias explicite de `float`, conservé pour les animations
  géométriques.

Des assertions de compilation garantissent notamment `Color == 3` octets,
`Point == 12` octets, `PackedPoint == 3` octets et `FixedQ8_8 == 2` octets.
Le voxel interne de Snake passe de trois `int` à trois `CubeCoordinate`, soit de
12 à 3 octets par élément de ses conteneurs dynamiques historiques.

## Mapping logique et physique

Le mapping unique se trouve dans `src/rendering/voxel_mapping.h` :

```text
index = z × 64 + x × 8 + y
```

`tryVoxelIndex()` refuse chaque coordonnée hors de `0..7` avant de produire un
index. Les primitives de lecture et d'écriture utilisent cette fonction ; les
animations ne portent plus leur propre conversion pour ces accès.

Le buffer alloué par `Adafruit_NeoPixel` reste le framebuffer principal de
1 536 octets. `Color` et les valeurs empaquetées restent logiquement RGB. Le
pilote stocke physiquement les octets WS2812B en GRB, puis les restitue en RGB à
la lecture. Aucun second framebuffer permanent n'a été ajouté.

## Calculs modifiés

- Snake compare désormais des distances entières au carré. La racine carrée et
  les trois appels à `pow()` étaient inutiles pour classer les directions.
- Crumble remplace son ratio `double` par une mise à l'échelle entière 64 bits
  qui conserve les seuils du tirage historique.
- Spectrum utilise `ARRAY_SIZE` au lieu de recalculer `2^M` et multiplie les
  composantes pour leurs carrés.
- WarmFade remplace `pow(value / 255, 2)` par une multiplication en `float`.

Les fonctions trigonométriques des animations géométriques restent inchangées.
La compilation n'a montré aucun gain de taille justifiant une approximation ou
une table supplémentaire. Les divisions constantes restantes ne sont pas
remplacées sans mesure de temps démontrant leur intérêt.

## Tests hôte

Commande :

```powershell
node --test firmware-v2/test/host/*.test.mjs
```

Les tests de phase 4 couvrent :

- les huit coins, les arêtes implicites et chacun des huit plans ;
- l'unicité et la continuité des 512 index ;
- le refus des sentinelles `-1` et `8` sur chaque axe ;
- les assertions de taille ;
- le contrat RGB logique et GRB physique du pilote ;
- les comparaisons avant/après de Snake, Crumble, Spectrum et des 256 valeurs
  WarmFade.

## Mesures

| Variante | Flash | RAM statique | Taille binaire |
| --- | ---: | ---: | ---: |
| Phase 3 | 115 896 | 39 932 | 115 900 |
| Phase 4 | 115 944 | 39 932 | 115 948 |

La représentation compacte de Snake réduit son heap lorsqu'il contient des
éléments, mais pas la RAM statique annoncée par le linker. Les 48 octets de
flash supplémentaires bornent les accès Spectrum et suppriment ses formules de
mapping dupliquées. La phase 7 supprimera complètement ses `vector`.

## Validation matérielle restante

Après flash, la vérification physique du mapping et des couleurs doit être
faite à luminosité 1 % avec une commande contenant explicitement `B:1`. Elle
reste distincte des tests hôte et ne doit être cochée qu'après observation du
cube.

Commandes de contrôle :

```powershell
particle call chicken_turkey SetMode "M:ColorAll,B:1,C1:FF0000,"
particle call chicken_turkey SetMode "M:Chaser,B:1,C1:FF0000,"
particle call chicken_turkey SetMode "M:Off,B:1,"
```
