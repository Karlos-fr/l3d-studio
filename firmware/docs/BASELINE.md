# Journal de référence du firmware

## Sources importées

| Élément | Source | SHA-256 de la source |
| --- | --- | --- |
| Firmware 1.4 | Archive upstream supprimée après import | `969B061F0EA3D0885739A2DA8516C689F6F0C5E33596914A8997D4409C0B2BA1` |
| Pilote NeoPixel importé | `firmware/src/platform/neopixel.cpp` sans son en-tête documentaire | `E1CEB47E6561358808FBDA4D02452D3C060048E2D8DE109A28C9A4767800AD77` |
| Déclaration NeoPixel importée | `firmware/src/platform/neopixel.h` sans son en-tête documentaire | `25DDE13BFFC579880971CF1471113AD600BD4901AB6DFC023D87B980C0401EE7` |

L'import dans `firmware` ne change aucun corps de fonction. Les seules
adaptations nécessaires pour compiler le monolithe comme un fichier `.cpp`
sont :

- l'ajout d'un en-tête de module en français ;
- le changement de l'include NeoPixel vers `platform/neopixel.h` ;
- l'ajout des prototypes que le préprocesseur Particle générait pour le `.ino`.

## Commande reproductible

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

Commande Particle exécutée par le script :

```text
particle compile photon firmware --target 2.3.1 --saveTo <binaire>
```

## Mesures

| Date | Variante | Device OS | Flash | RAM statique | Taille binaire | Marge Flash |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 2026-08-17 | Source upstream + pilote corrigé, projet temporaire | 2.3.1 | 114 328 | 39 852 | 114 332 | 16 744 |
| 2026-08-17 | Import initial `firmware` | 2.3.1 | 114 328 | 39 852 | 114 332 | 16 744 |
| 2026-08-17 | Phase 1, découpage mécanique unity build | 2.3.1 | 114 328 | 39 852 | 114 332 | 16 744 |
| 2026-08-17 | Phase 2, diagnostics désactivés | 2.3.1 | 114 328 | 39 852 | 114 332 | 16 744 |
| 2026-08-17 | Phase 2, diagnostics activés et endpoints historiques réutilisés | 2.3.1 | 115 368 | 39 932 | 115 372 | 15 704 |
| 2026-08-17 | Phase 3, pile et commandes sécurisées | 2.3.1 | 115 896 | 39 932 | 115 900 | 15 176 |
| 2026-08-17 | Phase 4, types compacts et mapping centralisé | 2.3.1 | 115 944 | 39 932 | 115 948 | 15 128 |
| 2026-08-17 | Passe animations, Snake sans allocation dynamique | 2.3.1 | 115 288 | 39 900 | 115 292 | 15 784 |
| 2026-08-17 | Passe animations, CrumblingPlane sans allocation dynamique | 2.3.1 | 114 424 | 39 876 | 114 428 | 16 648 |
| 2026-08-17 | Passe animations, salves GoldRain et AcidRain compactes | 2.3.1 | 113 816 | 23 476 | 113 820 | 17 256 |
| 2026-08-17 | Passe animations, coordonnées Matrix compactes | 2.3.1 | 113 864 | 21 484 | 113 868 | 17 208 |
| 2026-08-17 | Passe animations, état Collide2 compact | 2.3.1 | 113 576 | 20 188 | 113 580 | 17 496 |
| 2026-08-17 | Passe animations, traînée Squarrel compacte | 2.3.1 | 113 256 | 19 692 | 113 260 | 17 816 |
| 2026-08-17 | Passe animations, CheerLights sans `String` | 2.3.1 | 112 456 | 19 652 | 112 460 | 18 616 |
| 2026-08-17 | Passe animations, Clock/Text sans copies `String` | 2.3.1 | 112 072 | 19 652 | 112 076 | 19 000 |
| 2026-08-17 | Passe animations, scratch Spectrum et calcul Plasma | 2.3.1 | 111 976 | 19 524 | 111 980 | 19 096 |
| 2026-08-17 | Passe animations, scratch Frozen et Whirlwind | 2.3.1 | 111 944 | 19 132 | 111 948 | 19 128 |
| 2026-08-17 | Passe animations, état BouncyCube compact | 2.3.1 | 111 896 | 19 108 | 111 900 | 19 176 |
| 2026-08-17 | Passe animations, CubePainter sans sous-chaînes et audit Digi | 2.3.1 | 111 768 | 19 108 | 111 772 | 19 304 |
| 2026-08-17 | Passe animations, sprites PacMan et tangente Fireworks | 2.3.1 | 111 688 | 19 108 | 111 692 | 19 384 |
| 2026-08-17 | Passe animations, Rain entier et états de plans compacts | 2.3.1 | 111 512 | 19 076 | 111 516 | 19 560 |
| 2026-08-17 | Passe animations, états et atténuation des effets couleur | 2.3.1 | 111 288 | 19 052 | 111 292 | 19 784 |
| 2026-08-17 | Passe animations, états et calculs CubeClassics | 2.3.1 | 111 288 | 19 020 | 111 292 | 19 784 |
| 2026-08-17 | Passe animations, petits modes actifs compacts | 2.3.1 | 110 928 | 19 004 | 110 932 | 20 144 |
| 2026-08-17 | Passe animations, ordre Shuffle compact et IFTTT borné | 2.3.1 | 110 864 | 18 812 | 110 868 | 20 208 |
| 2026-08-17 | Passe animations, facteurs ColorAll mutualisés | 2.3.1 | 110 752 | 18 812 | 110 756 | 20 320 |
| 2026-08-17 | Passe animations, Listener retiré du build actif | 2.3.1 | 109 344 | 18 732 | 109 348 | 21 728 |
| 2026-08-17 | Passe animations, durée de vie du scratch Whirlwind corrigée | 2.3.1 | 109 360 | 18 732 | 109 364 | 21 712 |
| 2026-08-17 | Quatre imports CubeTube et métadonnées constantes | 2.3.1 | 111 856 | 16 228 | 111 860 | 19 216 |
| 2026-08-17 | Nouveau mode GyrophareFR | 2.3.1 | 112 624 | 16 236 | 112 628 | 18 448 |
| 2026-08-17 | Phase 6, etats d'animations mutualises | 2.3.1 | 112 608 | 13 780 | 112 612 | 18 464 |
| 2026-08-17 | Phase 7, allocations applicatives supprimees | 2.3.1 | 111 600 | 13 780 | 111 604 | 19 472 |
| 2026-08-17 | Phase 8, dispatcher et ordonnanceur cooperatif | 2.3.1 | 111 880 | 13 788 | 111 884 | 19 192 |
| 2026-08-17 | Serveur LAN phase 0, avant implementation | 2.3.1 | 111 880 | 13 788 | 111 884 | 19 192 |
| 2026-08-17 | Serveur LAN phase 1, commandes separees des transports | 2.3.1 | 111 672 | 13 788 | 111 676 | 19 400 |

Les mesures identiques confirment que le passage de `.ino` à `.cpp`, les
prototypes explicites et le déplacement du pilote n'ont pas changé le binaire
mesuré par le compilateur cloud.

La compilation de phase 2 avec `L3D_DIAGNOSTICS_ENABLED=0` retrouve exactement
la référence de phase 1. L'instrumentation activée coûte 1 040 octets de flash
et 80 octets de RAM statique. Aucun endpoint Particle supplémentaire n'est
enregistré : les commandes passent par `Function` et la réponse par
`deviceInfo`. Cette simplification n'a pas changé la mesure runtime de 9 144
octets libres ; la cause du Kio manquant reste à isoler.

## Mesure runtime de phase 2

| Variante | Démarrage | Frame stabilisée observée | Minimum observé | OOM |
| --- | ---: | ---: | ---: | ---: |
| Diagnostics activés, réponse via `deviceInfo` | 9 144 | 11 656 | 9 144 | 0 |

La mesure a été obtenue sur `chicken_turkey`, Device OS 2.3.1, après flash OTA.
La réponse compacte a confirmé un reset de mise à jour normal (`r=70`, `d=0`).
Le seuil de 10 Kio n'est pas validé au démarrage, même si la marge observée
entre les frames est supérieure.

La phase 4 conserve la RAM statique et ajoute 48 octets de flash pour borner les
accès Spectrum et centraliser leur mapping. Le gain du voxel Snake, réduit de
12 à 3 octets, concerne le heap de ses `vector` et n'apparait donc pas dans la
RAM statique du rapport de compilation.

## Mesure sur le Photon stable

La variable `deviceInfo` du firmware 1.4 actuellement installé a indiqué :

| Mesure | Valeur |
| --- | ---: |
| Device OS | 2.3.1 |
| Mémoire libre construite pendant `setup()` | 10 200 octets |

Cette valeur n'est pas une mesure courante ou minimale. Elle est conservée
comme repère historique jusqu'à l'instrumentation de la phase 2.

## Reproductibilité

Les artefacts locaux suivants sont régénérés dans `firmware/build/` :

- `l3d-studio-photon-2.3.1.bin` ;
- `compile.log` ;
- `measurement.json`.

Le dossier `build/` est ignoré par Git. Une compilation est considérée
reproductible lorsque `flashBytes`, `staticRamBytes` et `binaryBytes` sont
identiques aux valeurs de ce journal avec le même Device OS et les mêmes
sources.

## État de validation

- Compilation cloud : validée.
- Égalité des mesures avec la source upstream : validée.
- Flash OTA du binaire `firmware` sur `chicken_turkey` : réalisé le 2026-08-17.
- Vérification post-flash : Photon revenu en ligne, Device OS 2.3.1, firmware 1.4,
  fonctions Cloud présentes et listes `modeList`, `modeParmList` et
  `auxSwtchList` identiques aux fixtures.
- Flash OTA de la phase 1 réalisé le 2026-08-17 : Photon revenu en ligne et
  contrat Cloud de nouveau vérifié après redémarrage.
- Flash OTA de la phase 4 réalisé le 2026-08-17 : Photon revenu en ligne avec
  les fonctions et variables historiques ; mode `Off` rétabli avec `B:1`
  (`brightness=2` dans la représentation interne historique).
- Comparaison visuelle sur le matériel : validée par l'utilisateur le 2026-08-17.
- Rollback matériel OTA : exécuté et validé le 2026-08-17 avec Spark Pixels
  Mega 1.4 ; la voie USB n'a pas été nécessaire.
- Flash OTA des quatre imports CubeTube réalisé le 2026-08-17 : commandes
  LightningBox, FFTMeteors, FFTJoy et Tranquility acceptées à `B:1`, puis mode
  `Off` rétabli avec la valeur interne `brightness=2`.
- Flash OTA de GyrophareFR réalisé le 2026-08-17 : bleu seul, bicolore avec
  traînée et bicolore réactif au son acceptés à `B:1`, puis mode `Off` rétabli
  avec `brightness=2`.
- Flash OTA de la phase 6 réalisé le 2026-08-17 : huit changements rapides
  entre GoldRain, Matrix, Squarrel, Collide2, Whirlwind et CubePainter acceptés
  à `B:1`, minimum libre de 35 408 octets, aucun OOM, puis retour sur `Off`
  avec `brightness=2`.
- Flash OTA de la phase 7 réalisé le 2026-08-17 : parsing direct validé pour
  mode, vitesse, luminosité, six couleurs, quatre switches, texte et commandes
  génériques à `B:1`. Minimum libre de 35 408 octets, aucun OOM, erreur
  CubePainter hors plage `-103`, puis retour sur `Off` avec `brightness=2`.
- Flash OTA de la phase 8 réalisé le 2026-08-17 : `BuildAWall` et `SlideShow`
  interrompus par une commande Cloud à `B:1`, minimum libre de 35 400 octets,
  aucun OOM, OTA réussie pendant `BuildAWall`, puis retour sur `Off` avec
  `brightness=2`.

## Baseline du serveur LAN avant implementation

La phase 0 du serveur LAN a recompilé sans modification fonctionnelle le
firmware de phase 8. Les mesures Flash, RAM statique et taille du binaire sont
strictement identiques à la ligne précédente.

Les contrôles runtime ont été réalisés sur `chicken_turkey`, sans flash, avec
Device OS 2.3.1. Le cube était initialement sur `LineSpin`, vitesse 0 et
luminosité interne 2. Cet état a été restauré après les essais.

| Mode | Luminosité | Libre courante | Minimum du mode | Minimum global | Frame moyenne | FPS moyen | OOM |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ColorAll | `B:1` / 2 interne | 36 664 | 35 400 | 34 024 | 432 026 us | 2,3 | 0 |
| Rain | `B:1` / 2 interne | 35 400 | 35 400 | 34 024 | 152 282 us | 6,5 | 0 |

La mémoire libre enregistrée à la fin de `setup()` est de 37 944 octets. Le
minimum global de 34 024 octets couvre l'activité déjà exécutée depuis le
dernier démarrage et n'est pas attribué à une animation unique.

Sur `ColorAll`, la première lecture de `deviceInfo`, environ trois secondes
après `GETDIAG`, contenait la séquence demandée. Sur `LineSpin`, la fonction
Cloud a retourné la séquence 2, mais 17 lectures successives pendant plus de
60 secondes ont conservé le contenu historique de `deviceInfo`. La demande est
donc acceptée par le thread Cloud mais son formatage reste retardé tant que le
mode ne rend pas la main à `diagnosticsProcessRequests()`.

Cette observation devient une contrainte du serveur LAN : appeler uniquement
`localApiProcess()` au début de `loop()` ne suffira pas. Les traitements longs
devront appeler un service coopératif commun assez souvent pour respecter les
timeouts du protocole local.

Un redémarrage logiciel par `Function("REBOOT:")` a ensuite validé le retour de
l'accès Particle Cloud : la première lecture a expiré vers 38 secondes et la
première réponse valide a été obtenue vers 45 secondes. La luminosité interne 2
et la vitesse 0 ont été conservées. Le mode chargé au redémarrage était toutefois
`AcidDream` au lieu du `LineSpin` demandé avant le reset. `LineSpin`, vitesse 0
et `B:1` ont été réappliqués après le contrôle. Cette anomalie de restauration
du mode est consignée mais n'est pas corrigée dans la phase 0 du serveur LAN.

## Phase 2 — Socle HTTP local borné

La phase 2 ajoute un `TCPServer` optionnel, un parseur progressif à buffers
fixes et le service LAN coopératif pendant les animations. Les mesures Photon
Device OS 2.3.1 du 17 août 2026 sont :

| Variante | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| `L3D_LOCAL_API_ENABLED=0` | 111 640 | 13 788 | 111 644 | 19 432 |
| `L3D_LOCAL_API_ENABLED=1` | 115 992 | 15 164 | 115 996 | 15 080 |

Le coût mesuré du socle actif est de 4 352 octets de Flash et 1 376 octets de
RAM statique. Sur le Photon réel, 100 appels `/api/v1/health`, une requête
interrompue et un appel pendant `BuildAWall,S:0,B:1` ont conservé le minimum
mémoire à 31 928 octets. Particle Cloud est resté accessible et le cube a été
remis sur `M:Off,B:1,`. Le détail reproductible figure dans
`firmware/docs/LOCAL_API_SERVER.md`.
