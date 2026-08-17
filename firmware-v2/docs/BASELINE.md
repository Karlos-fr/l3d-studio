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

Les mesures identiques confirment que le passage de `.ino` à `.cpp`, les
prototypes explicites et le déplacement du pilote n'ont pas changé le binaire
mesuré par le compilateur cloud.

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
- Comparaison visuelle sur le matériel : validée par l'utilisateur le 2026-08-17.
- Rollback matériel OTA : exécuté et validé le 2026-08-17 avec Spark Pixels
  Mega 1.4 ; la voie USB n'a pas été nécessaire.
