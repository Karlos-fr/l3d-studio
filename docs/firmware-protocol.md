# Protocole firmware SparkPixelsMega

Ce document decrit l'interface exposee par le firmware
`SparkPixelsMega.ino` afin de guider l'implementation TypeScript de L3D
Studio.

Source analysee :
`download/Spark_Pixels/Firmware/Neopixel_Library/SparkPixels_L3D_Cube/SparkPixelsMega.ino`

## Frontiere fonctionnelle

L'application TypeScript ne doit pas piloter directement les LED. Elle envoie
des commandes Particle Cloud au Photon. Le firmware reste responsable de :

- convertir les commandes en etat interne ;
- memoriser certains reglages dans l'EEPROM ;
- appliquer les protections de luminosite ;
- executer les animations ;
- rafraichir les variables publiees.

L'application TypeScript doit rester responsable de :

- authentifier l'utilisateur Particle ;
- lister les devices disponibles ;
- lire les variables publiees ;
- parser les listes compactes du firmware ;
- construire des commandes valides ;
- afficher les controles adaptes au mode selectionne.

## Fonctions Particle declarees

Le firmware declare quatre fonctions Particle dans `setup()`.

| Fonction Particle | Fonction firmware | Responsabilite | Commande attendue | Retour |
| --- | --- | --- | --- | --- |
| `Function` | `FnRouter` | Route les commandes generales non rattachees directement a un changement de mode. | Identifiant en majuscules suivi de `:` puis parametres. | Entier dependant de la commande, `-1` si inconnue. |
| `SetMode` | `SetMode` | Change le mode courant ou met a jour vitesse, luminosite, couleurs, texte et switches de mode. | Liste de segments separes par `,` et terminee par `,`. | Index du mode, `1000`, `1001`, `1002` ou `-1`. |
| `SetText` | `SetText` | Met a jour le texte persistant utilise par le mode `Text`. | Texte brut. | `1` si le texte est accepte. |
| `CubePainter` | `CubePainter` | Modifie le buffer de dessin du mode `CubePainter`. | Segments compacts avec index voxel, couleur ou plage a effacer. | `0`, ou `0` immediat si le mode courant n'est pas `CubePainter`. |

## Variables Particle declarees

| Variable Particle | Variable firmware | Type attendu | Usage dans L3D Studio |
| --- | --- | --- | --- |
| `micValue` | `micValue` | nombre | Diagnostic ou futurs modes reactifs au son. |
| `debug` | `debug` | chaine | Message de debug firmware. |
| `wifi` | `wifi` | nombre | Force Wi-Fi RSSI. |
| `hour` | `hour` | nombre | Heure locale connue par le Photon. |
| `speed` | `speedIndex` | nombre | Index de vitesse expose, de `0` a `8`. |
| `brightness` | `brightness` | nombre | Luminosite interne firmware, de `1` a `255`. |
| `modeList` | `modeNameList` | chaine | Liste des modes disponibles. |
| `modeParmList` | `modeParamList` | chaine | Liste parallele des parametres de chaque mode. |
| `auxSwtchList` | `auxSwitchList` | chaine | Liste des interrupteurs globaux. |
| `mode` | `currentModeName` | chaine | Nom du mode courant. |
| `deviceInfo` | `deviceInfo` | chaine | Informations device et firmware. |

## Format de `modeList`

`modeList` est assemblee par `makeModeList()`.

Format :

```text
NomMode1;NomMode2;NomMode3;
```

Exemple partiel :

```text
Off;Shuffle;AcidDream;Breathe;BouncyCube;
```

Contraintes :

- l'ordre correspond a l'ordre de `modeStruct[]` ;
- la liste est limitee par `MAX_PUBLISHED_STRING_SIZE` ;
- les noms doivent etre envoyes tels quels a `SetMode` ;
- les modes commentes dans le firmware ne sont pas publies.

## Format de `modeParmList`

`modeParmList` est assemblee par `makeModeList()` en parallele de `modeList`.
Chaque entree correspond au mode de meme index dans `modeList`.

Formats observes :

```text
N;
C:1;
C:4,S:4,"Fill""Sweep BG""Bleed Edges""Bleed Sides";
C:2,S:4,"Bolden""No BG""Black Text""Sweep BG",T:;
```

Signification :

- `N;` : aucun parametre particulier ;
- `C:n` : le mode attend `n` couleurs ;
- `S:n,"label1""label2"...` : le mode expose `n` switches locaux ;
- `T:` : le mode accepte une saisie texte.

Points d'attention :

- les titres de switches sont concatentes entre guillemets, sans virgule entre chaque titre ;
- une entree se termine par `;` ;
- `C`, `S` et `T` peuvent etre combines ;
- le parseur TypeScript devra rester tolerant aux entrees tronquees, car le firmware coupe la liste si la limite Particle est atteinte.

## Format de `auxSwtchList`

`auxSwtchList` est assemblee par `makeAuxSwitchList()`.

Format :

```text
id,titre,onName,offName,state;
```

Exemple theorique issu des structures firmware :

```text
2,Shuffle,ON,OFF,1;0,Auto Shut Off,ON,OFF,1;1,On Startup,Run Last Mode,Run Demo,0;
```

Interrupteurs globaux declares :

| ID | Titre | Etat `on` | Etat `off` | Effet firmware |
| --- | --- | --- | --- | --- |
| `2` | `Shuffle` | `ON` | `OFF` | Active ou desactive le mode shuffle global. |
| `0` | `Auto Shut Off` | `ON` | `OFF` | Active ou desactive l'extinction automatique. |
| `1` | `On Startup` | `Run Last Mode` | `Run Demo` | Choisit le comportement au demarrage. |

## Commande `SetMode`

La commande `SetMode` attend une chaine composee de segments separes par des
virgules. Le firmware indique qu'une virgule finale facilite le parsing ; elle
doit donc etre systematiquement ajoutee.

Segments supportes :

| Segment | Exemple | Effet |
| --- | --- | --- |
| `M:<mode>` | `M:ColorAll,` | Change le mode courant. Le nom doit correspondre a `modeStruct[].modeName`. |
| `S:<index>` | `S:4,` | Met a jour l'index de vitesse. Valeur attendue : `0..8`. |
| `B:<percent>` | `B:80,` | Met a jour la luminosite en pourcentage `0..100`. Le firmware convertit vers `1..255`. |
| `C1:<RRGGBB>` | `C1:FF0000,` | Met a jour la couleur 1. |
| `C2:<RRGGBB>` | `C2:00FF00,` | Met a jour la couleur 2. |
| `C3:<RRGGBB>` | `C3:0000FF,` | Met a jour la couleur 3. |
| `C4:<RRGGBB>` | `C4:FFFFFF,` | Met a jour la couleur 4. |
| `C5:<RRGGBB>` | `C5:FFFF00,` | Met a jour la couleur 5. |
| `C6:<RRGGBB>` | `C6:00FFFF,` | Met a jour la couleur 6. |
| `W:<texte>` | `W:HELLO,` | Met a jour le message texte temporaire utilise par certains modes. |
| `T1:<0|1>` | `T1:1,` | Met a jour le switch local 1 du mode. |
| `T2:<0|1>` | `T2:0,` | Met a jour le switch local 2 du mode. |
| `T3:<0|1>` | `T3:1,` | Met a jour le switch local 3 du mode. |
| `T4:<0|1>` | `T4:0,` | Met a jour le switch local 4 du mode. |

Exemples :

```text
M:ColorAll,S:4,B:80,C1:FF0000,
S:4,B:80,
M:Text,S:4,B:80,C1:FFFFFF,C2:000000,T1:1,T2:0,W:BONJOUR,
```

Retours connus :

| Retour | Signification |
| --- | --- |
| index de mode | Mode change avec succes. |
| `1000` | Vitesse/luminosite recues, mais aucune valeur nouvelle. |
| `1001` | Luminosite mise a jour. |
| `1002` | Vitesse mise a jour. |
| `-1` | Commande invalide ou mode introuvable. |

Effets de bord importants :

- met a jour `lastCommandReceived` ;
- ecrit vitesse, luminosite, couleurs et switches dans l'EEPROM ;
- force `run` et `stop` lors d'un changement de mode ;
- synchronise l'interrupteur global `Shuffle` quand le mode `Shuffle` est choisi ;
- applique `checkBrightness()`, qui peut reduire la luminosite pour proteger l'alimentation.

## Commande `Function` / `FnRouter`

`FnRouter` transforme la commande en majuscules avant traitement. Les commandes
texte envoyees a ce routeur ne doivent donc pas contenir de valeur sensible a la
casse.

Commandes supportees :

| Commande | Exemple | Retour | Effet |
| --- | --- | --- | --- |
| `SETTIMEZONE:<offset>` | `SETTIMEZONE:-6` | Offset applique | Met a jour le fuseau horaire Particle et la variable `hour`. |
| `GETSWITCHSTATE:<id>` | `GETSWITCHSTATE:1` | `0`, `1` ou `-1` | Lit un switch local de mode, pas un aux switch global. |
| `GETCOLOR:<id>` | `GETCOLOR:1` | Couleur entiere ou `-1` | Lit une couleur courante `1..6`. |
| `SETAUXSWITCH:<id>,<state>;` | `SETAUXSWITCH:1,0;` | Etat applique ou `-1` | Met a jour un interrupteur global et l'EEPROM. |
| `REBOOT:` | `REBOOT:` | `1` | Planifie un redemarrage du Photon. |

## Commande `SetText`

`SetText` recoit du texte brut et le stocke dans `textInputString`.

Usage recommande :

- utiliser `SetText` pour le texte persistant du mode `Text` ;
- utiliser `W:<texte>,` dans `SetMode` uniquement quand le firmware attend un texte dans la commande de mode.

Effets de bord :

- lit la zone EEPROM texte ;
- compare le texte existant ;
- ecrit le nouveau texte en EEPROM si necessaire ;
- retourne toujours `1`.

Point d'attention :

- `SetMode` limite le segment `W:` a 63 caracteres environ ;
- `SetText` ne montre pas de controle de longueur visible dans l'extrait analyse, donc l'application doit imposer une limite prudente cote UI.

## Commande `CubePainter`

`CubePainter` n'est actif que si le mode courant est `CubePainter`. Sinon, la
fonction retourne immediatement `0`.

Segments observes :

| Segment | Exemple | Effet |
| --- | --- | --- |
| `I<index>,` | `I42,` | Selectionne le voxel a modifier. |
| `#<RRGGBB>,` | `#FF00AA,` | Ecrit la couleur RGB dans le voxel selectionne. |
| `C<start>:<end>,` | `C0:511,` | Efface une plage de voxels. |

Effets de bord :

- modifie `drawingBuffer` ;
- modifie le pixel correspondant dans le strip ;
- ecrit chaque composante RGB en EEPROM ;
- retourne `0`.

Ce module doit etre considere avance. Le MVP peut piloter les modes classiques
sans exposer `CubePainter`.

## Comparaison avec l'ancienne app Android

L'ancienne application Android contient encore la logique utile de construction
de commande `SetMode` :

- mode : `M:`;
- vitesse : `S:`;
- luminosite : `B:`;
- couleurs : `C1:` a `C4:` dans l'ecran principal lu ;
- body HTTP nomme `params`.

Mais elle ne doit pas etre copiee telle quelle :

- elle cible l'ancien domaine `api.spark.io` ;
- elle passe le token dans l'URL ;
- son parsing principal de `modeList` attend une forme ancienne du type `MODE,nombreCouleurs,MODE,nombreCouleurs,` ;
- le firmware L3D actuel separe les noms (`modeList`) et les parametres (`modeParmList`) ;
- elle ne semble pas exploiter `modeParmList`, `auxSwtchList`, `SetText` et `CubePainter` dans l'ecran principal analyse.

Decision pour L3D Studio :

- reprendre l'intention des commandes Android ;
- ne pas reprendre son parsing `modeList` ;
- parser `modeList` et `modeParmList` comme deux listes paralleles ;
- exposer les commandes avancees seulement apres stabilisation du MVP.

## Table de compatibilite API

| Fonctionnalite UI | Variable ou fonction Particle | Type de valeur | Endpoint Particle attendu | Notes |
| --- | --- | --- | --- | --- |
| Liste des devices | API Particle | JSON | `GET /v1/devices` | Phase 2 doit valider l'authentification actuelle. |
| Mode courant | `mode` | chaine | `GET /v1/devices/:deviceId/mode` | Affiche le mode actif. |
| Liste des modes | `modeList` | chaine `;` | `GET /v1/devices/:deviceId/modeList` | A parser en liste de noms. |
| Parametres des modes | `modeParmList` | chaine compacte | `GET /v1/devices/:deviceId/modeParmList` | A aligner par index avec `modeList`. |
| Interrupteurs globaux | `auxSwtchList` | chaine compacte | `GET /v1/devices/:deviceId/auxSwtchList` | A parser en liste d'aux switches. |
| Luminosite initiale | `brightness` | nombre `1..255` | `GET /v1/devices/:deviceId/brightness` | Convertir vers `0..100` pour l'UI. |
| Vitesse initiale | `speed` | nombre `0..8` | `GET /v1/devices/:deviceId/speed` | Index direct de preset. |
| Informations device | `deviceInfo` | chaine compacte | `GET /v1/devices/:deviceId/deviceInfo` | Utile pour une page diagnostic. |
| Diagnostic Wi-Fi | `wifi` | nombre | `GET /v1/devices/:deviceId/wifi` | RSSI Particle. |
| Debug firmware | `debug` | chaine | `GET /v1/devices/:deviceId/debug` | Afficher seulement en diagnostic. |
| Changer mode/reglages | `SetMode` | retour entier | `POST /v1/devices/:deviceId/SetMode` | Commande terminee par `,`. |
| Texte persistant | `SetText` | retour entier | `POST /v1/devices/:deviceId/SetText` | Texte brut. |
| Aux switches | `Function` | retour entier | `POST /v1/devices/:deviceId/Function` | Exemple `SETAUXSWITCH:1,0;`. |
| CubePainter | `CubePainter` | retour entier | `POST /v1/devices/:deviceId/CubePainter` | Fonction avancee hors MVP initial. |

## Liste des commandes supportees pour le MVP

Commandes immediatement utiles :

- changer de mode avec `SetMode` et `M:<mode>,` ;
- regler la vitesse avec `SetMode` et `S:<index>,` ;
- regler la luminosite avec `SetMode` et `B:<percent>,` ;
- regler les couleurs avec `C1:` a `C6:` ;
- regler les switches locaux avec `T1:` a `T4:` ;
- envoyer un texte court avec `W:<texte>,` ou `SetText`.

Commandes avancees :

- `Function` avec `SETAUXSWITCH:<id>,<state>;` ;
- `Function` avec `SETTIMEZONE:<offset>` ;
- `Function` avec `GETSWITCHSTATE:<id>` ;
- `Function` avec `GETCOLOR:<id>` ;
- `Function` avec `REBOOT:` ;
- `CubePainter`.

## Points ouverts pour la phase 2

- Confirmer si Particle attend maintenant le parametre de fonction sous le nom
  `arg` ou accepte encore `params`.
- Confirmer le flux d'authentification login/mot de passe avec l'API Particle
  actuelle.
- Confirmer le comportement MFA pour l'application sans backend.
