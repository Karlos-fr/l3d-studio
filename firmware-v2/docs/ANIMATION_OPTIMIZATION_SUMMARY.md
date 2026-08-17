# Bilan de la passe d'optimisation des animations

## Résultat du passage code

À la clôture de la passe initiale, les 70 modes inventoriés et les six éléments
partagés possédaient un audit, une décision d'optimisation, des tests hôte, une
compilation Photon 2.3.1 et une documentation. Les IDs et le registre de 62
modes alors actifs restaient compatibles avec le protocole historique.

| Mesure | Début de la passe | État actuel | Différence |
| --- | ---: | ---: | ---: |
| Flash | 115 944 | 109 360 | −6 584 |
| RAM statique | 39 932 | 18 732 | −21 200 |
| Taille binaire | 115 948 | 109 364 | −6 584 |
| Marge Flash | 15 128 | 21 712 | +6 584 |

Par rapport à l'import upstream initial, la RAM statique passe de 39 852 à
18 732 octets, soit `−21 120` octets. La légère différence avec le début de la
passe correspond au coût des diagnostics ajouté avant les optimisations.

## Principaux gains

- les salves GoldRain/AcidRain économisent 16 400 octets de RAM statique ;
- Matrix économise 1 992 octets et Collide2 1 296 octets ;
- Snake et CrumblingPlane n'allouent plus dynamiquement ;
- le scratch unique de 1 536 octets remplace plusieurs états temporaires et sa
  durée de vie est maintenant contractualisée ;
- Listener, déjà inaccessible, ne conserve plus son objet UDP dans le build ;
- les chaînes applicatives dynamiques ont été retirées de CheerLights, Text,
  Clock et CubePainter ; seules les signatures `String` imposées par Particle
  et le parseur Cloud historique subsistent ;
- plusieurs calculs par voxel ou canal sont mutualisés, notamment Plasma,
  MovingSphere, ColorAll, Fireworks, LineSpin et SineLines.

## Vérifications actuelles

- 99 tests hôte réussissent ;
- la compilation cloud Photon Device OS 2.3.1 réussit ;
- le binaire final a été flashé sur `chicken_turkey` ;
- le dernier essai matériel a laissé le cube sur `M:Off,B:1,` avec la valeur
  interne `brightness=2` ;
- `git diff --check` ne signale aucune erreur ;
- aucun fichier de `download/` et aucun secret local n'ont été modifiés.

## Vérifications volontairement en attente

La passe code n'est pas la clôture complète de la checklist. Conformément à la
décision de mettre les essais coûteux en stand-by, le tracker conserve :

- 22 baselines longues de modes actifs ou sous-effets ;
- une baseline longue de l'élément interne CubeGreeting ;
- 63 validations physiques ou visuelles de modes accessibles ;
- six validations physiques d'éléments partagés ;
- les commits dédiés non encore demandés.

Ces cases restent ouvertes et ne sont pas remplacées par les smoke tests courts
à `B:1`. Elles pourront être reprises sans ambiguïté depuis
`ANIMATION_OPTIMIZATION_TRACKER.md`.

## Imports CubeTube postérieurs à la passe

Quatre modes ont ensuite rejoint le registre : LightningBox (71), FFTMeteors
(72), FFTJoy (73) et Tranquility (74). Ils utilisent des états statiques
compacts, aucune allocation dynamique, des temporisations non bloquantes pour
LightningBox et Tranquility, ainsi que le scratch FFT existant pour les deux
spectres.

La mise en `const` des tables de modes et de switches compense leur ajout en
RAM. Le nouvel état mesuré est de 111 856 octets de Flash, 16 228 octets de RAM
statique et 19 216 octets de marge Flash. Les 106 tests hôte réussissent. Le
détail du portage et des compromis est consigné dans `CUBETUBE_IMPORTS.md`.
Le binaire a été flashé et les quatre modes ont passé un smoke test à `B:1` ;
leur comparaison visuelle avec les exports reste ouverte.

## Évolution GyrophareFR

Le mode GyrophareFR (75) ajoute deux faisceaux verticaux opposés tournant sur
huit orientations entières. Il reste bleu par défaut et propose les switches
`Bicolore`, `Reactif au son` et `Trainee`. La réaction sonore repose sur quatre
lectures d'amplitude et une enveloppe entière, sans FFT.

Cette évolution porte le firmware à 112 624 octets de Flash et 16 236 octets de
RAM statique, soit respectivement +768 et +8 octets. La marge Flash reste de
18 448 octets et les 112 tests hôte réussissent. Les trois combinaisons de
switches ont passé un smoke test à `B:1` ; l'appréciation visuelle reste ouverte.
