# Journal de référence du firmware

## Sources importées

| Élément | Source | SHA-256 de la source |
| --- | --- | --- |
| Firmware 1.4 | `download/Spark_Pixels/Firmware/Neopixel_Library/SparkPixels_L3D_Cube/SparkPixelsMega.ino` | `969B061F0EA3D0885739A2DA8516C689F6F0C5E33596914A8997D4409C0B2BA1` |
| Pilote NeoPixel | `firmware/neopixel-fix.cpp` | `E1CEB47E6561358808FBDA4D02452D3C060048E2D8DE109A28C9A4767800AD77` |
| Déclaration NeoPixel | `firmware/neopixel.h` | `25DDE13BFFC579880971CF1471113AD600BD4901AB6DFC023D87B980C0401EE7` |

L'import dans `firmware-v2` ne change aucun corps de fonction. Les seules
adaptations nécessaires pour compiler le monolithe comme un fichier `.cpp`
sont :

- l'ajout d'un en-tête de module en français ;
- le changement de l'include NeoPixel vers `platform/neopixel.h` ;
- l'ajout des prototypes que le préprocesseur Particle générait pour le `.ino`.

## Commande reproductible

```powershell
powershell -ExecutionPolicy Bypass -File firmware-v2/tools/compile.ps1
```

Commande Particle exécutée par le script :

```text
particle compile photon firmware-v2 --target 2.3.1 --saveTo <binaire>
```

## Mesures

| Date | Variante | Device OS | Flash | RAM statique | Taille binaire | Marge Flash |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 2026-08-17 | Source upstream + pilote corrigé, projet temporaire | 2.3.1 | 114 328 | 39 852 | 114 332 | 16 744 |
| 2026-08-17 | Import initial `firmware-v2` | 2.3.1 | 114 328 | 39 852 | 114 332 | 16 744 |
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

Les artefacts locaux suivants sont régénérés dans `firmware-v2/build/` :

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
- Flash OTA du binaire `firmware-v2` sur `chicken_turkey` : réalisé le 2026-08-17.
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
