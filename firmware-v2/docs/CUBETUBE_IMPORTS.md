# Imports des animations CubeTube

## Périmètre

Quatre anciennes animations CubeTube ont été portées dans le firmware v2.
Les sources externes restent inchangées et ne sont pas copiées dans le dépôt :

| Source CubeTube | ID | Nom Cloud | Module firmware |
| --- | ---: | --- | --- |
| `Lightning_in_a_box/Lightning_in_a_box.pde` | 71 | `LightningBox` | `src/animations/lightning_in_a_box.cpp` |
| `FFT_Meteors_Rainbow.cpp` | 72 | `FFTMeteors` | `src/animations/fft_meteors_rainbow.cpp` |
| `FFTJoy.cpp` | 73 | `FFTJoy` | `src/animations/fft_joy_legacy.cpp` |
| `Tranquility.cpp` | 74 | `Tranquility` | `src/animations/tranquility.cpp` |

Les IDs 0 à 70 et leurs comportements restent inchangés. Les nouveaux modes
n'exposent ni couleur, ni switch, ni texte dans les métadonnées Particle.

## Adaptations réalisées

### LightningBox

- conservation des trois branches, des trois impulsions colorées et des
  temporisations de la source PDE ;
- remplacement des `delay()` par une machine d'état pilotée par `millis()` ;
- stockage des quatre points en coordonnées `int8_t` compactes et de la couleur
  initiale sur trois octets ;
- validation des coordonnées laissée à la primitive de ligne commune, car les
  deux extrémités basses peuvent historiquement sortir du cube.

### FFTJoy et FFTMeteors

- conservation de l'échantillonnage sur 16 points et des intervalles
  historiques de 212 µs et 120 µs ;
- réutilisation des tableaux `spectrumReal` et `spectrumImaginary` du scratch
  FFT existant : aucun second buffer de 128 octets ;
- capture et calcul de magnitude mutualisés dans
  `cubetube_fft_common.cpp` ;
- palette bleue→cyan→verte→jaune→rouge→magenta réécrite en entier,
  sans interpolation flottante ;
- barres conservées sur l'axe vertical `y`, dessinées sur le plan `z=7`, puis
  copiées vers la profondeur décroissante ;
- niveau audio adaptatif propre à chaque animation pour éviter qu'un changement
  de mode ne partage un maximum obsolète.

FFTMeteors conserve directement les options visibles de l'export (`smooth` et
points de crête actifs). Elles ne sont pas publiées comme switches afin de
reproduire le fichier fourni sans ajouter une nouvelle variante fonctionnelle.

### Tranquility

- conservation du cycle visible de 256 couleurs, plafonné à 75 par canal et
  cadencé à 20 ms ;
- suppression des couleurs de début et de fin aléatoires, calculées mais jamais
  utilisées par le rendu exporté ;
- remplacement du compteur et des calculs flottants par un index `uint8_t` et
  la palette entière commune ;
- remplacement du `delay()` par une échéance `millis()` non bloquante.

## Mémoire et robustesse

Les nouveaux chemins n'utilisent ni `String`, ni `vector`, ni allocation
dynamique. Leurs tableaux temporaires FFT sont mutualisés avec Spectrum. Le
registre `modeStruct` et les titres de switches, qui n'étaient jamais destinés
à être modifiés, sont maintenant `const`. Le générateur de métadonnées borne
ses compteurs dans des variables locales au lieu de modifier ces tables.

| Mesure | Avant imports | Après imports | Écart |
| --- | ---: | ---: | ---: |
| Flash | 109 360 | 111 856 | +2 496 |
| RAM statique | 18 732 | 16 228 | −2 504 |
| Taille binaire | 109 364 | 111 860 | +2 496 |
| Marge Flash | 21 712 | 19 216 | −2 496 |

Le gain de RAM provient principalement de la mise en Flash des métadonnées
immuables. Le coût Flash de 2 496 octets correspond aux quatre animations et à
leurs primitives partagées. La marge Flash restante est de 19 216 octets.

## Vérification

Tests hôte complets :

```powershell
node --test firmware-v2/test/host/*.test.mjs
```

Compilation Photon 2.3.1 :

```powershell
powershell -ExecutionPolicy Bypass -File firmware-v2/tools/compile.ps1
```

Les tests hôte verrouillent les IDs, le registre actuel de 67 modes, la taille de la
liste Cloud, le dispatcher, les resets, l'absence d'allocation dynamique, le
scratch FFT commun, les bornes des palettes et l'orientation des deux spectres.

Le smoke test matériel doit appeler chaque nom avec une luminosité limitée :

```text
M:LightningBox,B:1,
M:FFTMeteors,B:1,
M:FFTJoy,B:1,
M:Tranquility,B:1,
M:Off,B:1,
```

Ce smoke test vérifie l'accessibilité et la stabilité courte. La comparaison
visuelle avec les anciens exports CubeTube reste une validation distincte à
faire sur le cube physique.

Le 2026-08-17, le binaire a été flashé par OTA sur `chicken_turkey`. Les quatre
commandes ont répondu avec `B:1`. FFTMeteors a produit 378 frames pendant le
contrôle diagnostics sans reset ni manque de mémoire signalé. Le test s'est
terminé par `M:Off,B:1,` et la variable `brightness` valait `2`. Un premier
appel FFTMeteors a expiré pendant la reprise de connexion suivant le flash ; le
même appel, relancé depuis `Off`, puis le contrôle diagnostics ont réussi.
