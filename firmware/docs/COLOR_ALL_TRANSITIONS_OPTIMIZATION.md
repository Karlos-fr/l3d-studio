# Optimisation de ColorAll, Off et des transitions partagées

## Périmètre

Cette passe couvre `ColorAll` (ID 2), `Off` (ID 0), les transitions communes
et la séquence interne `CubeGreeting`. `ColorAll` utilise la courbe polaire,
tandis que `Off` utilise la courbe linéaire vers le noir.

Les huit étapes, les troncatures de canaux, les courbes historiques, les délais
et les appels à `Particle.process()` restent identiques.

## Optimisation de la boucle chaude

Les facteurs polaires ne dépendent que de l'étape courante. Ils sont maintenant
calculés une fois par étape puis réutilisés par les 512 pixels et leurs trois
canaux. Auparavant, le carré de progression était recalculé par canal croissant
et la racine par canal décroissant.

La branche linéaire conserve sa division entière historique. Un test hôte
compare exhaustivement les 256 valeurs initiales, les 256 valeurs cibles, les
huit étapes et les deux méthodes, soit 1 048 576 comparaisons d'incréments.

`Off` ne possède aucun état autonome à réduire. `CubeGreeting` utilise déjà le
buffer C borné partagé, ne possède aucun buffer permanent et n'effectue qu'un
appel de longueur dans chacune de ses trois branches défilantes. Une nouvelle
optimisation de sa longue orchestration n'est pas retenue sans cycle de
démonstration complet.

## Mesures de compilation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 110 864 | 110 752 | −112 |
| RAM statique | 18 812 | 18 812 | 0 |
| Taille binaire | 110 868 | 110 756 | −112 |
| Marge Flash | 20 208 | 20 320 | +112 |

## Mesures ColorAll à 1 %

Les deux mesures utilisent `M:ColorAll,S:4,B:1,C1:804020,` et une remise à
zéro des diagnostics après l'entrée dans le mode.

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Frames observées | 14 | 15 | +1 |
| Temps moyen | 447 989 µs | 431 988 µs | −16 001 µs |
| Pire temps | 448 238 µs | 432 988 µs | −15 250 µs |
| FPS ×10 | 22 | 23 | +1 |
| Minimum libre observé | 30 376 | 31 640 | +1 264 |

Le minimum libre est sensible aux buffers Cloud transitoires et ne constitue
pas un gain statique. La RAM statique inchangée est la mesure de référence pour
ce point.

## Validation

- les 92 tests hôte réussissent ;
- la compilation Photon Device OS 2.3.1 réussit ;
- le binaire optimisé a été flashé sur `chicken_turkey` ;
- les mesures avant et après ont été prises avec la même commande à `B:1` ;
- le cube a été remis sur `M:Off,B:1,` et `brightness` valait `2` ;
- les sept branches de `CubeGreeting` et leurs copies bornées sont contrôlées
  statiquement ;
- `git diff --check` ne signale aucune erreur autre que les avertissements de
  conversion de fin de ligne ;
- les références upstream et les secrets locaux n'ont pas été modifiés.

La comparaison visuelle de ColorAll et le cycle complet de CubeGreeting restent
non cochés. Le passage matériel court ne vaut pas validation visuelle longue.
