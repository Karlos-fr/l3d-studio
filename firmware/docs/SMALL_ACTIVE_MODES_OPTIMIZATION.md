# Optimisation des petits modes actifs

## Périmètre

Cette passe couvre `ChristmasTree` (24), `ChristmasLights` (25), `Cubes` (29),
`Filler` (32), `WarmFade` (23), `Zone` (4), `ZoneChase` (19) et `SlideShow`
(70). Ces modes partagent peu d'état et sont regroupés uniquement pour mesurer
leurs réductions simples avec un même binaire.

Les IDs, paramètres, switches, couleurs, tirages aléatoires, délais et ordres
de rendu historiques sont conservés.

## Optimisations et décisions

- `Zone` réutilise les huit bornes `uint16_t` déjà partagées avec les autres
  chasers au lieu de les recréer sur la pile;
- les quatre index persistants de `ZoneChase` passent de `int` à `uint16_t` et
  ses traînées utilisent l'atténuation entière commune à sept huitièmes;
- `Filler` conserve uniquement un index de couleur `uint8_t`. Son axe de
  remplissage est local à l'appel, sans modifier le nombre ni l'ordre des
  tirages aléatoires;
- `SlideShow` mélange 23 index `uint8_t` sur la pile au lieu de 23 `int`, soit
  23 octets au lieu de 92. Sa couleur temporaire globale est supprimée;
- `ChristmasTree` compacte l'intensité persistante de l'étoile et les
  coordonnées temporaires des flocons. Le calcul de `gradedGreen`, sans lecture
  ni effet de bord, est retiré;
- `ChristmasLights` utilise des compteurs et un facteur de délai bornés. Le
  modulo historique `SIDE-1`, y compris sa huitième couleur inatteignable,
  reste inchangé pour préserver le rendu;
- `WarmFade` parcourt les mêmes 511 niveaux entiers avec un `uint16_t` plutôt
  qu'un compteur flottant;
- `Cubes` est conservé : ses trois états globaux sont déjà des octets et ses
  deux tableaux locaux de quatre `Point` totalisent 96 octets, sous la limite
  de pile. Les convertir ajouterait des conversions au rendu sans gain de RAM
  statique démontré.

Les comportements historiques potentiellement surprenants, notamment les
valeurs intermédiaires de l'étoile et les longues boucles bloquantes, ne sont
pas corrigés dans cette passe d'optimisation.

## Mesures de compilation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 288 | 110 928 | −360 |
| RAM statique | 19 020 | 19 004 | −16 |
| Taille binaire | 111 292 | 110 932 | −360 |
| Marge Flash | 19 784 | 20 144 | +360 |

Les réductions de pile de `SlideShow` et des flocons ne figurent pas dans la
RAM statique. Le gain statique agrège les états compacts de `ZoneChase`,
`Filler`, `ChristmasTree` et la couleur globale retirée de `SlideShow`.

## Diagnostics matériels à 1 %

Les baselines et les mesures après optimisation utilisent les mêmes commandes
à `S:4,B:1`. Les statistiques ont été remises à zéro après la transition
d'entrée. Le binaire final a été flashé sur `chicken_turkey` avec Device OS
2.3.1.

| Mode | Minimum libre avant | Minimum libre après | Frame moyenne avant | Frame moyenne après | FPS ×10 avant | FPS ×10 après |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Zone | 32 696 | 32 712 | 1 455 955 µs | 1 455 749 µs | 6 | 6 |
| ZoneChase | 32 696 | 31 448 | 364 077 µs | 364 031 µs | 27 | 27 |
| Cubes | 30 168 | 30 184 | 63 390 µs | 63 302 µs | 157 | 157 |
| ChristmasTree | 30 168 | 30 184 | 401 949 µs | 401 948 µs | 24 | 24 |
| ChristmasLights | 32 696 | 32 712 | 9 630 802 µs | 9 631 892 µs | 1 | 1 |

Le minimum ponctuel de `ZoneChase` après optimisation inclut l'occupation du
buffer Cloud partagé et ne contredit pas le gain de 16 octets de RAM statique.
Les cadences sont équivalentes; la variation de `ChristmasLights` est de
0,011 %, très inférieure à la granularité visible de ce cycle de 9,6 secondes.

Les cycles matériels de `Filler`, `SlideShow` et `WarmFade` restent reportés
car ils sont longs. Le cube a été remis sur `M:Off,B:1,` après les relevés et
la variable `brightness` valait `2`. Aucun essai court n'est présenté comme une
validation visuelle complète.

## Vérifications

- 85 tests hôte réussis, dont les cycles de couleur Filler, le mélange des 23
  diapositives et les 511 niveaux WarmFade;
- compilation Photon 2.3.1 réussie;
- aucun buffer local supérieur à 256 octets ni allocation dynamique;
- aucune référence upstream modifiée et aucun secret ajouté;
- `git diff --check` sans erreur;
- rollback disponible avec le binaire précédent selon `ROLLBACK.md`.
