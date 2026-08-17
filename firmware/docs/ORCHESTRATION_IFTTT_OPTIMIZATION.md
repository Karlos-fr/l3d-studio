# Optimisation de l'orchestration Shuffle et de l'affichage IFTTT

## Périmètre

Cette passe couvrait le mode `Shuffle` (ID 26), le registre partagé de 62 modes
actifs et l'affichage `IFTTT` (ID 35). Elle touche aussi la primitive de mélange
réutilisée par `CubeClassics` et `SlideShow`.

Les IDs, les exclusions propres à `Shuffle`, le nombre et l'ordre des tirages
aléatoires, les paramètres Particle et le retour automatique d'IFTTT vers le
mode précédent sont conservés.

## Optimisations et invariants

- l'ordre permanent de `Shuffle` passe de 62 `int`, soit 248 octets, à 62
  `uint8_t`, soit 62 octets ;
- l'index permanent du prochain mode passe de quatre à un octet ;
- l'assertion statique imposait exactement 62 entrées actives afin qu'un ajout
  de mode oblige à réexaminer la représentation compacte. Elle impose maintenant
  67 entrées après les quatre imports CubeTube et le mode GyrophareFR ;
- `arrayShuffle` mélange désormais des index `uint8_t` et reste commun à
  `Shuffle`, `CubeClassics` et `SlideShow` ;
- le buffer de débogage local mort de la primitive de mélange est retiré ;
- IFTTT calcule une seule fois la longueur bornée du message C et la réutilise
  pour le rendu et les seuils de défilement ;
- les durées IFTTT utilisent explicitement des entiers non signés de 32 bits ;
- IFTTT reste un affichage sans socket, buffer réseau ou allocation dynamique
  propre.

Le mélange conserve exactement un tirage aléatoire par entrée et la même
permutation pour une même suite de tirages. La borne de 62 reste inférieure à
la capacité de 256 valeurs d'un octet.

## Mesures de compilation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 110 928 | 110 864 | −64 |
| RAM statique | 19 004 | 18 812 | −192 |
| Taille binaire | 110 932 | 110 868 | −64 |
| Marge Flash | 20 144 | 20 208 | +64 |

Le gain statique de 192 octets correspond à la réduction des 186 octets du
tableau, aux trois octets de son index et à l'alignement global résultant.
L'affichage IFTTT apporte surtout une réduction de calcul répétitif et ne crée
aucun état permanent.

## Validation

- les 89 tests hôte réussissent, dont l'équivalence des permutations et les
  invariants statiques d'IFTTT ;
- la compilation Photon Device OS 2.3.1 réussit ;
- le binaire a été flashé sur `chicken_turkey` ;
- `Shuffle` a sélectionné `SineLines` après la commande
  `M:Shuffle,B:1,` ;
- IFTTT a accepté `M:IFTTT,S:4,B:1,C6:00A0FF,` après le texte `Weather` ;
- le cube a été remis sur `M:Off,B:1,` et `brightness` valait `2`, valeur
  interne historique correspondant à 1 % ;
- `git diff --check` ne signale aucune erreur autre que les avertissements de
  conversion de fin de ligne du dépôt ;
- aucune référence upstream ni aucun secret n'ont été modifiés.

Ces commandes constituent uniquement des smoke tests. Un cycle Shuffle complet
et une comparaison visuelle IFTTT restent volontairement non cochés dans le
tracker.
