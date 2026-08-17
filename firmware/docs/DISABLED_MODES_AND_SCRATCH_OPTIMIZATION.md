# Audit des modes désactivés et du scratch partagé

## Périmètre

Cette passe couvre `Light` (ID 1), `Listener` (ID 18), `Lightning` (ID 41),
les archives `RomanCandle` (58), `GameOfLife` (59) et `HyperBall` (63), ainsi
que l'union temporaire commune aux animations.

## Décisions sur les modes masqués

- `Light` reste un fallback interne utilisant `defaultColor`. Son ID et sa
  branche sont conservés pour les valeurs EEPROM historiques, mais il n'est pas
  publié dans le registre ;
- `Listener` est absent du registre et du dispatcher. Son objet UDP, son reset
  et son code sont maintenant placés derrière `L3D_LISTENER_ENABLED=0` ;
- `Lightning` ne peut pas être retiré : malgré son absence du registre, le
  switch 4 du mode actif `Rain` appelle réellement son rendu ;
- `RomanCandle`, `GameOfLife` et `HyperBall` sont entièrement commentés. Leurs
  en-têtes ne déclarent plus de fonctions sans définition, tandis que les
  prototypes restent archivés dans leurs fichiers C++ ;
- aucune réactivation n'est tentée dans cette passe : elle demanderait une
  tâche fonctionnelle, des tests dédiés et une validation visuelle séparée.

Le tableau Listener de 1 543 octets apparaissait dans la source, mais le linker
l'éliminait déjà avec `listen()`, qui n'avait aucun appel actif. La mesure
montre que le vrai gain statique du drapeau est de 80 octets, correspondant à
l'objet et à l'état UDP encore retenus par la branche de reset.

## Audit du scratch partagé

L'union reste fixée à 1 536 octets, borne imposée à la fois par l'image RGB de
`CubePainter` et par les 512 positions compactes de `Snake`. Ses autres vues
mesurent :

| Vue | Taille |
| --- | ---: |
| Ordre de pixels Digi/Frozen | 1 024 |
| Particules Fireworks | 1 200 |
| Sprites PacMan | 243 |
| Ordre CrumblingPlane | 64 |
| Échantillons Spectrum | 128 |
| État Whirlwind | 288 |

Des assertions statiques imposent chaque taille. L'audit a aussi trouvé que
`resetVariables()` initialisait Whirlwind avant `transitionAll()`, alors que la
transition réutilise la même union. L'ordre est corrigé : la transition se
termine d'abord, puis l'état Whirlwind est initialisé, comme lorsque les buffers
étaient encore séparés dans la source upstream.

## Mesures de compilation

| Jalon | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| Avant retrait Listener | 110 752 | 18 812 | 110 756 | 20 320 |
| Listener derrière le drapeau | 109 344 | 18 732 | 109 348 | 21 728 |
| Durée de vie Whirlwind corrigée | 109 360 | 18 732 | 109 364 | 21 712 |

Le bilan cumulé est de `−1 392` octets de Flash et `−80` octets de RAM
statique. Le correctif de durée de vie coûte 16 octets de Flash et aucune RAM.

## Mesure Whirlwind à 1 %

| Mesure | Avant correction | Après correction |
| --- | ---: | ---: |
| Frames observées | 143 | 141 |
| Temps moyen | 40 121 µs | 40 205 µs |
| Pire temps | 41 990 µs | 41 013 µs |
| FPS ×10 | 249 | 248 |
| Minimum libre | 30 456 | 30 456 |

La variation moyenne de 0,2 % est négligeable. La correction porte sur le
contenu initial de l'état, pas sur la cadence.

## Validation

- les 99 tests hôte réussissent après ce jalon ;
- la compilation Photon Device OS 2.3.1 réussit ;
- le binaire a été flashé sur `chicken_turkey` ;
- Whirlwind a été mesuré avant et après avec `M:Whirlwind,S:4,B:1,` ;
- le cube a été remis sur `M:Off,B:1,` et `brightness` valait `2` ;
- les modes sans entrée active sont notés `N/A` pour le matériel ;
- la validation visuelle de Whirlwind et du switch Lightning de Rain reste à
  effectuer ;
- aucune référence upstream ni aucun secret n'ont été modifiés.
