# Inventaire fonctionnel et mémoire de Spark Pixels Mega 1.4

Cet inventaire décrit la baseline importée dans `firmware-v2/src/main.cpp`. Il
ne constitue pas encore une nouvelle architecture.

## Modes actifs

Les capacités proviennent directement de `modeStruct`. `Texte` indique si le
mode accepte le segment `W:` dans `SetMode`.

| ID | Symbole | Nom Cloud | Couleurs | Switches | Texte |
| ---: | --- | --- | ---: | ---: | --- |
| 0 | `STANDBY` | Off | 0 | 0 | non |
| 26 | `SHUFFLE` | Shuffle | 0 | 0 | non |
| 7 | `ACIDDREAM` | AcidDream | 0 | 0 | non |
| 15 | `COLORBREATHE` | Breathe | 1 | 1 | non |
| 65 | `CUBEBOUNCE` | BouncyCube | 0 | 0 | non |
| 13 | `RAINBOW_BURST` | Burst | 0 | 0 | non |
| 49 | `BUILDAWALL` | BuildAWall | 0 | 0 | non |
| 3 | `CHASER` | Chaser | 1 | 0 | non |
| 31 | `CHEERLIGHTS` | CheerLights | 0 | 0 | non |
| 25 | `CHRISTMASLIGHTS` | ChristmasLights | 0 | 0 | non |
| 24 | `CHRISTMASTREE` | ChristmasTree | 0 | 3 | non |
| 37 | `CLOCK` | Clock | 3 | 4 | non |
| 11 | `COLLIDE` | Collide | 0 | 0 | non |
| 42 | `COLLIDE2` | Collide2 | 0 | 0 | non |
| 2 | `COLORALL` | ColorAll | 1 | 0 | non |
| 57 | `CRUMBLE` | CrumblingPlane | 0 | 0 | non |
| 29 | `CUBES` | Cubes | 4 | 4 | non |
| 34 | `CUBE_CLASSICS` | CubeClassics | 1 | 1 | non |
| 33 | `CUBE_PAINTER` | CubePainter | 0 | 0 | non |
| 69 | `DIAGONAL_PLANES` | DiagonalPlanes | 0 | 0 | non |
| 36 | `DIGI` | Digi | 1 | 3 | non |
| 17 | `TWOCOLORCHASE` | DualChase | 2 | 0 | non |
| 32 | `FILLER` | Filler | 3 | 1 | non |
| 73 | `FFT_JOY_LEGACY` | FFTJoy | 0 | 0 | non |
| 72 | `FFT_METEORS_RAINBOW` | FFTMeteors | 0 | 0 | non |
| 55 | `FIREWORKS` | Fireworks | 0 | 0 | non |
| 14 | `FLICKER` | Flicker | 1 | 0 | non |
| 68 | `FOLDER` | Folder | 0 | 0 | non |
| 10 | `FROZEN` | Frozen | 0 | 0 | non |
| 40 | `GOLDRAIN` | GoldRain | 0 | 1 | non |
| 75 | `GYROPHARE_FR` | GyrophareFR | 0 | 3 | non |
| 35 | `IFTTTWEATHER` | IFTTT | 0 | 0 | non |
| 71 | `LIGHTNING_BOX` | LightningBox | 0 | 0 | non |
| 52 | `LINESPIN` | LineSpin | 0 | 0 | non |
| 62 | `DSPIRAL` | LineSpiral | 0 | 0 | non |
| 64 | `MATRIX` | Matrix | 0 | 0 | non |
| 54 | `SPHEREMOVE` | MovingSphere | 0 | 0 | non |
| 56 | `PUCKDUDE` | PacMan | 0 | 0 | non |
| 48 | `PLANESFILLCUBE` | PlaneFill | 0 | 0 | non |
| 46 | `MOREPLANES` | Planes | 0 | 0 | non |
| 22 | `PLASMA` | Plasma | 0 | 0 | non |
| 16 | `POLICELIGHTS` | Police | 0 | 0 | non |
| 5 | `COLORPULSE` | Pulse | 0 | 0 | non |
| 67 | `PYRAMID` | Pyramid | 0 | 0 | non |
| 30 | `RAIN` | Rain | 1 | 4 | non |
| 8 | `RAINBOW` | Rainbow | 0 | 0 | non |
| 66 | `RAND_PATH_AROUND` | RandomPath | 0 | 0 | non |
| 53 | `SINELINES` | SineLines | 0 | 0 | non |
| 51 | `SINEWAVE` | SineWave | 0 | 0 | non |
| 61 | `CLASSICPLANES` | SlidingPlanes | 0 | 0 | non |
| 70 | `SLIDESHOW` | SlideShow | 0 | 0 | non |
| 60 | `SNAKE` | Snake | 0 | 0 | non |
| 21 | `SQUARRAL` | Squarrel | 0 | 0 | non |
| 20 | `SPECTRUM` | Spectrum | 0 | 2 | non |
| 6 | `COLORSTRIPES` | Stripes | 0 | 0 | non |
| 27 | `TEXT` | Text | 2 | 4 | oui |
| 9 | `THEATERCHASE` | TheaterChase | 0 | 0 | non |
| 74 | `TRANQUILITY` | Tranquility | 0 | 0 | non |
| 12 | `COLORFADE` | Transition | 0 | 0 | non |
| 43 | `UPNDOWN` | UpDown | 0 | 0 | non |
| 47 | `VOXELSLEFTBEHIND` | VoxelDrop | 0 | 0 | non |
| 50 | `VOXELRANDOM` | VoxelRandom | 0 | 0 | non |
| 23 | `WARMFADE` | WarmFade | 0 | 0 | non |
| 28 | `WHIRLWIND` | Whirlwind | 0 | 0 | non |
| 45 | `WORMS` | Worms | 0 | 0 | non |
| 4 | `ZONE` | Zone | 4 | 3 | non |
| 19 | `ZONECHASER` | ZoneChase | 4 | 0 | non |

## Modes masqués ou désactivés

| ID historique | Symbole | Nom prévu | État dans la baseline |
| ---: | --- | --- | --- |
| 1 | `NORMAL` | Light | ID présent, entrée `modeStruct` commentée |
| 18 | `LISTENER` | Listener | ID et code UDP présents, entrée et appel principal commentés |
| 39 | `ACIDRAIN` | AcidRain | ID et implémentation partagée présents, entrée commentée |
| 41 | `LIGHTNING` | Lightning | ID et code présents, entrée commentée |
| 58 | `ROMAN` | RomanCandle | ID, état et appels commentés |
| 59 | `LIFE` | GameOfLife | ID, état et appels commentés |
| 63 | `HYPER` | HyperBall | ID, état et appels commentés |

`ROPECOIL` conserve l'ID 44 et une branche dans `runMode`, mais ne possède pas
d'entrée active ou commentée dans `modeStruct`.

## API Particle Cloud

### Fonctions exposées

| Nom Cloud | Handler | Argument |
| --- | --- | --- |
| `Function` | `FnRouter` | commande auxiliaire |
| `SetMode` | `SetMode` | segments séparés par des virgules |
| `SetText` | `SetText` | texte persistant, 63 caractères utiles maximum |
| `CubePainter` | `CubePainter` | opération voxel ou plage à effacer |

### Variables exposées

| Nom Cloud | Stockage | Type |
| --- | --- | --- |
| `micValue` | `micValue` | entier |
| `debug` | `debug[200]` | chaîne |
| `wifi` | `wifi` | entier |
| `hour` | `hour` | entier |
| `speed` | `speedIndex` | entier |
| `brightness` | `brightness` | entier |
| `modeList` | `modeNameList[622]` | chaîne |
| `modeParmList` | `modeParamList[622]` | chaîne |
| `auxSwtchList` | `auxSwitchList[622]` | chaîne |
| `mode` | `currentModeName[64]` | chaîne |
| `deviceInfo` | `deviceInfo[622]` | chaîne |

## Commandes

### `SetMode`

| Segment | Rôle | Exemple |
| --- | --- | --- |
| `M:` | nom historique du mode | `M:ColorAll,` |
| `S:` | index de vitesse | `S:4,` |
| `B:` | luminosité applicative 0 à 100 | `B:80,` |
| `C1:` à `C6:` | couleur RGB hexadécimale | `C1:FF0000,` |
| `T1:` à `T4:` | switch booléen du mode | `T1:1,` |
| `W:` | texte temporaire du mode | `W:HELLO,` |

La commande doit se terminer par une virgule. Les retours spéciaux sont 1000
pour aucun changement, 1001 pour luminosité changée et 1002 pour vitesse
changée. Un changement de mode retourne son ID.

### `FnRouter`

| Commande | Exemple | Rôle |
| --- | --- | --- |
| `SETTIMEZONE` | `SETTIMEZONE:1` | change le fuseau horaire |
| `GETSWITCHSTATE` | `GETSWITCHSTATE:1` | lit un switch du mode courant |
| `GETCOLOR` | `GETCOLOR:1` | lit une couleur courante |
| `SETAUXSWITCH` | `SETAUXSWITCH:1,0;` | change un ou plusieurs switches auxiliaires |
| `REBOOT` | `REBOOT:` | demande un redémarrage différé |

### `SetText`

Une chaîne non vide différente de la valeur persistée est copiée dans
`textInputString[64]` puis écrite en EEPROM. Une chaîne vide recharge la valeur
persistée ou initialise le texte par défaut.

### `CubePainter`

La fonction refuse toute commande lorsque le mode courant n'est pas
`CubePainter`.

| Forme | Exemple | Rôle |
| --- | --- | --- |
| index puis couleur | `I42,#FF0000,` | colore le voxel d'index 42 |
| plage | `C0:511,` | efface les voxels 0 à 511 |

## Layout EEPROM historique

Les adresses incluent volontairement des octets d'écart hérités du firmware.
Les tailles supposent `sizeof(int) == 4`, `sizeof(bool) == 1` et six couleurs
`uint32_t`.

| Zone | Début | Taille utile | Fin utile | Usage |
| --- | ---: | ---: | ---: | --- |
| CubePainter | 0 | 1 536 | 1 535 | RGB des 512 voxels |
| Octet d'écart | 1 536 | 1 | 1 536 | non utilisé |
| Texte | 1 537 | 64 | 1 600 | texte persistant |
| Octet d'écart | 1 601 | 1 | 1 601 | non utilisé |
| Switches du mode | 1 602 | 4 | 1 605 | `lastSwitchState` |
| Octet d'écart | 1 606 | 1 | 1 606 | non utilisé |
| Couleurs | 1 607 | 24 | 1 630 | `lastColors` |
| Octet d'écart | 1 631 | 1 | 1 631 | non utilisé |
| Dernier mode | 1 632 | 4 réservés | 1 635 | écrit actuellement sur un octet |
| Octet d'écart | 1 636 | 1 | 1 636 | non utilisé |
| Vitesse | 1 637 | 4 réservés | 1 640 | écrite actuellement sur un octet |
| Octet d'écart | 1 641 | 1 | 1 641 | non utilisé |
| Luminosité | 1 642 | 4 réservés | 1 645 | écrite actuellement sur un octet |
| Octet d'écart | 1 646 | 1 | 1 646 | non utilisé |
| Switch auxiliaire 0 | 1 647 | 1 | 1 647 | Auto Shut Off |
| Switch auxiliaire 1 | 1 649 | 1 | 1 649 | Run Last Mode |
| Switch auxiliaire 2 | 1 651 | 1 | 1 651 | Shuffle |

La capacité déclarée est de 2 047 octets, adresses 0 à 2 046. L'espace non
attribué après le dernier switch commence à 1 652, soit environ 395 octets.

## Effets réseau

| Service | Ressources | Comportement |
| --- | --- | --- |
| Particle Cloud | 4 fonctions, 11 variables | transport principal de L3D Studio |
| CheerLights | `TCPClient`, trois `String` globales | requête HTTP vers ThingSpeak |
| Listener | `UDP`, buffer de 1 543 octets | réception TPM2.NET sur le port 65506 |
| Synchronisation horaire | `Particle.syncTime()` | appelée périodiquement |

IFTTTWeather n'ouvre pas directement de socket : il reçoit sa couleur par une
commande `SetMode` utilisant `C6:` et éventuellement `W:`.

## Tableaux globaux et propriétaires

Les tailles marquées « estimée » devront être confirmées par `sizeof` sur la
cible pendant la phase 2.

| Tableau ou groupe | Taille estimée | Propriétaire |
| --- | ---: | --- |
| `modeStruct[61]` | 1 464 | métadonnées Cloud |
| `switchTitleStruct[16]` | 1 296 | métadonnées Cloud |
| `auxSwitchStruct[3]` | 186 | switches auxiliaires |
| `speedPresets[9]` | 36 | réglage de vitesse |
| `modeShuffleOrder[61]` | 244 | Shuffle |
| `lastSwitchState[4]` | 4 | réglages persistés |
| `lastColors[6]` | 24 | réglages persistés |
| buffers Cloud et debug | 2 752 | Particle Cloud |
| `randomFlakes[51]` | 102 | Frozen |
| `data[1543]` | 1 543 | UDP Listener |
| `real[16]`, `imaginary[16]` | 128 | Spectrum |
| `message[64]`, `textInputString[64]` | 128 | Text/IFTTT |
| `fontTable[2048]` | 2 048 en flash | Text |
| `trailPoints[50]` | 600 | Squarrel |
| couleurs, angles, rayons et Y de Whirlwind | 285 | Whirlwind |
| huit tableaux Matrix de 64 `int` | 2 048 | Matrix |
| tableaux direction/bornes CubeBounce | 36 | BouncyCube |
| points, directions et couleurs de Collide | 1 944 | Collide2 |
| `drawingBuffer[1536]` | 1 536 | CubePainter |
| `clockMessage[11]` | 11 | Clock |
| `paths[44]` | 44 en flash | CubeClassics |
| `cubeEdgeVertices[]` | en flash | CubeClassics |
| `validSideToFlipTo[][6]` | 36 | CubeClassics |
| `salvos[8]` avec 128 gouttes chacun | environ 24 584 | GoldRain/AcidRain |
| `table_3p[][8]` | 160 en flash | SlideShow |
| buffer interne NeoPixel | 1 536 sur le heap | pilote LED |

Tableaux locaux importants identifiés :

- `transitionAll()` crée 512 `uint32_t`, soit 2 048 octets sur la pile ;
- les modes CubeClassics utilisent plusieurs tableaux locaux de 64 octets ;
- PuckDude construit des tableaux locaux de points dont le coût de pile doit être mesuré.

## Allocations dynamiques

### Conteneurs et chaînes applicatives

- `SNsnake`, `treats` et `possibleDirections` utilisent `std::vector<voxel>` ;
- `remaining` utilise `std::vector<int>` dans Crumble ;
- `allowedDirections` est un `std::vector<voxel*>` local dans Snake ;
- CheerLights utilise `String hostname`, `String path` et `String response` ;
- les handlers Particle reçoivent obligatoirement un `String` ;
- Clock utilise plusieurs `std::string` et crée un temporaire dans `strRev` ;
- le parsing `SetMode`, `FnRouter` et CubePainter crée des `substring` dynamiques.

### Pilote NeoPixel

Le constructeur alloue `numBytes`, soit 1 536 octets, avec `malloc`. Le
destructeur appelle `free`. Cette allocation unique et durable est distincte
des allocations variables produites par `String` et `std::vector`.

## Chemins bloquants

L'inventaire lexical de la baseline trouve :

| Motif | Nombre d'occurrences |
| --- | ---: |
| `delay(` | 123, commentaires inclus |
| `while(` | 18 |
| `waitFor(` | 9 |
| `Particle.process()` | 11 |

Les principales familles bloquantes sont :

- transitions de couleurs ;
- CubeClassics et ses sous-effets ;
- CheerLights et ses attentes réseau ;
- Text, Matrix, Plasma, Rain, GoldRain, Snake et Fireworks ;
- remplissages, fades et chasers parcourant plusieurs frames dans un seul appel.

La liste exacte des appels `delay()` reste visible dans `main.cpp`. Leur
suppression est volontairement reportée à la phase 8 afin de ne pas mélanger
le découpage mécanique et le changement de scheduler.
