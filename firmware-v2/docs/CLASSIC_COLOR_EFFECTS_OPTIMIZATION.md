# Optimisation des effets couleur classiques

## Périmètre

Cette passe couvre les modes actifs `AcidDream` (7), `Breathe` (15), `Burst`
(13), `Chaser` (3), `DualChase` (17), `Flicker` (14), `Police` (16), `Pulse`
(5), `Rainbow` (8), `Stripes` (6), `TheaterChase` (9) et `Transition` (12).
Elle concerne `classic_color_effects.cpp`, `color_all.cpp` et la primitive
d'atténuation partagée avec `Rain`.

Les IDs, noms Particle, paramètres, temporisations et parcours physiques sont
conservés. Aucun second framebuffer, conteneur dynamique ou buffer local de
plus de 256 octets n'est présent dans cette famille.

## Audit et décisions

- `Transition` remplace son compteur `int` avec sentinelle `-1` par une teinte
  `uint8_t` initialisée à 255. Le débordement modulo 256 reproduit exactement
  la séquence historique.
- `Breathe` conserve son calcul fractionnaire visible, mais compacte son
  intensité en `int16_t` et son sens en `bool`.
- `Police` compacte son compteur de demi-cube en `uint8_t`, son état lumineux
  en `bool` et ses bornes physiques en constantes `uint16_t` locales.
- `Chaser` et `DualChase` utilisent des index `uint16_t` et la même atténuation
  entière à sept huitièmes que `Rain`. Les 256 valeurs de canal sont
  exhaustivement équivalentes à la troncature flottante précédente.
- `Burst` compacte le compteur de voxels en `uint16_t`, l'index global en
  `uint16_t` et la teinte globale en `uint8_t`.
- `Flicker`, `AcidDream`, `Pulse`, `Stripes`, `Rainbow` et `TheaterChase` ne
  possèdent pas de gros état résident ni d'allocation dynamique applicative.
  Leurs longues boucles et leurs calculs couleur déterminent directement le
  rythme et le rendu historiques ; ils restent inchangés faute d'équivalence
  visuelle démontrée pour une réécriture plus agressive.

Les boucles bloquantes historiques restent interruptibles grâce aux contrôles
`stop` ou `stopDemo` et aux appels de rendu qui traitent Particle. Leur
découpage en machines à états constituerait une évolution comportementale
distincte, pas une optimisation mémoire sûre de cette passe.

## Mesures de compilation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 512 | 111 288 | −224 |
| RAM statique | 19 076 | 19 052 | −24 |
| Taille binaire | 111 516 | 111 292 | −224 |
| Marge Flash | 19 560 | 19 784 | +224 |

La réduction de RAM correspond aux états compacts de la famille. La
suppression du code d'atténuation dupliqué explique l'essentiel du gain Flash.

## Diagnostics matériels à 1 %

Le binaire après optimisation a été flashé sur `chicken_turkey` avec Device OS
2.3.1. Chaque commande ci-dessous contenait `B:1`; la variable `brightness`
valait `2`. Les statistiques ont été remises à zéro après la transition
d'entrée du mode.

| Mode | Minimum libre avant | Minimum libre après | Frame moyenne avant | Frame moyenne après | FPS ×10 avant | FPS ×10 après |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Transition | 30 112 | 30 136 | 52 951 µs | 52 940 µs | 188 | 188 |
| Breathe | 30 112 | 30 136 | 52 005 µs | 52 001 µs | 192 | 192 |
| Police | 30 112 | 30 136 | 51 974 µs | 52 004 µs | 192 | 192 |
| Chaser | 30 112 | 32 664 | 368 237 µs | 364 031 µs | 27 | 27 |
| DualChase | 31 376 | 30 136 | 363 974 µs | 364 078 µs | 27 | 27 |
| Burst | 30 112 | 30 136 | 75 358 µs | 76 042 µs | 132 | 131 |

Les minima observés pendant une requête Cloud dépendent du moment où le buffer
`deviceInfo` partagé est occupé ; ils ne permettent pas d'attribuer les grands
écarts de `Chaser` ou `DualChase` au mode. Le gain fiable est la baisse de 24
octets de RAM statique, tandis que les temps et cadences confirment l'absence
de régression mesurable.

`Flicker` a également été exécuté après flash à `B:1` : 45 frames, moyenne
135 835 µs, pire frame 324 987 µs et 7,3 FPS. Sa variabilité est attendue car
sa durée et son intensité sont aléatoires. Les baselines des longues boucles
inchangées sont conservées : `Pulse` environ 6,45 s par frame, `Rainbow`
environ 1,02 s et `TheaterChase` environ 2,31 s. Les essais longs de
`AcidDream` et `Stripes` restent en attente conformément à la décision de ne
pas prolonger ces démonstrations coûteuses.

Le cube a été remis sur `M:Off,B:1,` après les relevés. La validation physique
des couleurs, trajectoires et cycles complets reste à faire par l'utilisateur;
elle n'est donc pas cochée dans le tableau de suivi.

## Vérifications

- 75 tests hôte réussis, dont l'équivalence exhaustive de l'atténuation et les
  bornes des états compacts;
- compilation cloud Photon 2.3.1 réussie;
- aucun changement d'ID, de nom, de paramètres ou de valeur de retour;
- aucun changement dans `download/` et aucun secret ajouté;
- `git diff --check` sans erreur;
- rollback disponible en réappliquant le firmware du commit précédent selon
  `ROLLBACK.md`.
