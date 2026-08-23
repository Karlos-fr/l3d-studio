# Format du bytecode procédural L3D

## Statut et portée

Ce document fige le contrat version 1 du conteneur et de la machine virtuelle
L3D. Il est commun au compilateur TypeScript et au firmware Photon.

Pour apprendre à écrire une animation, commencer par le guide pratique
[`BYTECODE_LANGUAGE.md`](BYTECODE_LANGUAGE.md). Le présent document reste la
référence normative des octets, opcodes, bornes et fautes.

Le format décrit uniquement des animations procédurales. Il ne transporte ni
image, ni sprite, ni frame pré-calculée. Un conteneur version 1 possède une
taille maximale de 197 octets, dont 12 octets d'en-tête et au plus 185 octets
d'instructions.

Les entiers multioctets sont stockés en little-endian. Un champ ou un bit
réservé non nul rend le conteneur invalide.

## Conteneur version 1

| Offset | Taille | Champ | Règle version 1 |
| ---: | ---: | --- | --- |
| 0 | 3 | `magic` | octets ASCII `L3D`, soit `4C 33 44` |
| 3 | 1 | `formatVersion` | doit valoir `1` |
| 4 | 1 | `minimumVmVersion` | doit être inférieur ou égal à la VM présente |
| 5 | 1 | `capabilities` | masque des capacités utilisées |
| 6 | 1 | `generation` | compteur modulo 256 utilisé par les banques A/B |
| 7 | 1 | `payloadLength` | longueur comprise entre 1 et 185 |
| 8 | 1 | `entryPoint` | offset d'une instruction dans le payload |
| 9 | 1 | `flags` | doit valoir zéro en version 1 |
| 10 | 2 | `crc16` | CRC-16/CCITT-FALSE en little-endian |
| 12 | 1 à 185 | `payload` | suite d'instructions complète et validée |

Le CRC utilise le polynôme `0x1021`, une valeur initiale `0xFFFF`, aucune
réflexion et aucune valeur XOR finale. Il couvre les octets d'en-tête 3 à 9,
puis exactement `payloadLength` octets. La signature n'est pas couverte afin de
pouvoir être écrite en dernier comme marqueur de validation transactionnelle.

Un emplacement vide ou invalidé ne commence pas par `L3D`. Un payload vide,
un octet après la longueur annoncée ou un point d'entrée hors instruction est
invalide.

Le nom et la source ne sont pas stockés sur le Photon. L3D Studio les conserve
dans sa bibliothèque locale et associe le programme installé à son CRC.

## Compatibilité

`formatVersion` décrit le découpage binaire. Une VM doit refuser une version de
format inconnue, même si les autres champs paraissent valides.

`minimumVmVersion` décrit la sémantique minimale nécessaire. Une VM plus récente
peut exécuter un programme ancien tant que tous ses opcodes et capacités sont
encore pris en charge. La version 1 n'autorise aucune redéfinition d'un opcode
existant ; une évolution incompatible impose une nouvelle version de format.

La génération ne participe pas à la sémantique du programme. Le gestionnaire de
stockage l'incrémente lors d'une installation réussie et compare les valeurs
modulo 256. Le choix exact entre les banques A/B appartient à la phase de
persistance.

## Capacités

| Bit | Nom | Autorise |
| ---: | --- | --- |
| 0 | `GEOMETRY` | `SPHERE` et futures primitives géométriques versionnées |
| 1 | `PARTICLES` | configuration, émission et progression des particules |
| 2 | `MATH8` | `SIN8` et futures fonctions cycliques sur huit bits |
| 3 à 7 | réservés | doivent rester à zéro |

Les instructions de contrôle, registres, couleurs et voxels forment le cœur de
la VM et ne demandent aucun bit. Une instruction optionnelle sans sa capacité
est refusée. Une capacité inconnue est refusée avant l'exécution.

## Registres et valeurs

La VM contient exactement 16 registres signés de 16 bits, nommés `R0` à `R15`.
Ils sont tous initialisés à zéro à chaque entrée dans le mode bytecode. Les
additions et soustractions utilisent le complément à deux et rebouclent sur 16
bits de manière identique dans TypeScript et en C++.

Les identifiants de deux registres sont regroupés dans un octet : le registre
du premier opérande occupe le nibble haut et le second le nibble bas. Pour trois
registres, le troisième occupe le nibble haut de l'octet suivant et son nibble
bas réservé doit être nul. Six registres occupent donc trois octets.

Les immédiats `i8` sont encodés en complément à deux. Les immédiats `u8` sont
compris entre 0 et 255. La version 1 ne possède ni flottant, ni division, ni
allocation, ni pile d'appels.

## Jeu d'instructions version 1

Les offsets relatifs sont des `i8` calculés depuis l'octet qui suit
l'instruction courante. Leur destination doit être une frontière d'instruction
validée dans le payload.

| Opcode | Mnémotechnique | Octets après opcode | Taille | Effet |
| ---: | --- | --- | ---: | --- |
| `00` | `HALT` | aucun | 1 | arrête normalement le programme en conservant la dernière frame affichée |
| `01` | `CLEAR` | aucun | 1 | remplit le framebuffer logique de noir |
| `02` | `SHOW` | aucun | 1 | envoie une frame aux LED et rend la main au firmware |
| `03` | `YIELD` | aucun | 1 | rend la main sans afficher ni attendre |
| `04` | `FADE factor` | `u8 factor` | 2 | multiplie chaque canal par `factor / 255` avec troncature entière |
| `10` | `SET_I8 dst,value` | `0D`, `i8` | 3 | charge une valeur signée dans `dst` |
| `11` | `SET_U8 dst,value` | `0D`, `u8` | 3 | charge une valeur non signée dans `dst` |
| `12` | `COPY dst,src` | `DS` | 2 | copie `src` dans `dst` |
| `13` | `ADD_I8 dst,value` | `0D`, `i8` | 3 | ajoute l'immédiat signé à `dst` |
| `14` | `ADD_REG dst,src` | `DS` | 2 | ajoute `src` à `dst` |
| `15` | `SUB_REG dst,src` | `DS` | 2 | soustrait `src` de `dst` |
| `16` | `SIN8 dst,src` | `DS` | 2 | convertit l'octet bas de `src` en sinus non signé 0 à 255 |
| `17` | `RAND_U8 dst,min,max` | `0D`, `u8 min`, `u8 max` | 4 | tire une valeur uniforme entre `min` et `max` inclus |
| `20` | `COLOR_RGB r,g,b` | trois `u8` | 4 | définit la couleur courante RGB888 |
| `21` | `COLOR_WHEEL src` | `0S` | 2 | définit la couleur depuis l'octet bas de `src` |
| `22` | `COLOR_REGS r,g,b` | `RG`, `B0` | 3 | utilise les octets bas des trois registres comme couleur courante |
| `30` | `VOXEL x,y,z` | `XY`, `Z0` | 3 | écrit la couleur courante au voxel indiqué |
| `31` | `SPHERE x,y,z,radius` | `XY`, `Z0`, `u8 radius` | 4 | dessine une sphère pleine bornée |
| `32` | `BOUNCE pos,vel,min,max` | `PV`, `i8 min`, `i8 max` | 4 | avance `pos` et inverse `vel` avant une sortie de plage |
| `38` | `PARTICLE_CONFIG count,gravity,drag,life` | `u8 count`, `i8 gravity`, `u8 drag`, `u8 life` | 5 | configure le moteur entier de particules |
| `39` | `PARTICLE_EMIT x,y,z,vx,vy,vz` | `XY`, `ZVx`, `VyVz` | 4 | crée une particule avec la couleur courante |
| `3A` | `PARTICLE_STEP` | aucun | 1 | avance, dessine et vieillit les particules actives |
| `40` | `JUMP offset` | `i8 offset` | 2 | effectue un saut relatif |
| `41` | `JLT left,right,offset` | `LR`, `i8 offset` | 3 | saute si `left` est strictement inférieur à `right` |
| `50` | `WAIT milliseconds` | `u16` | 3 | rend la main jusqu'à l'échéance non bloquante |

Les octets notés `0D` ou `0S` ont un nibble haut réservé nul. Une valeur non
nulle dans un nibble réservé rend l'instruction mal formée.

Toutes les valeurs d'opcode absentes du tableau sont réservées à une version
future et doivent être refusées par la VM version 1.

### Sémantique du rendu

La couleur courante commence à noir. `VOXEL` exige trois coordonnées comprises
entre 0 et 7 ; une coordonnée invalide déclenche une faute sans écriture.
`SPHERE` exige un centre valide et un rayon compris entre 1 et 7. Les voxels de
la sphère situés hors du cube sont simplement écrêtés par la primitive bornée.

`SHOW` est une frontière coopérative : une seule instruction `SHOW` est traitée
par passage de service, même s'il reste un budget d'instructions. Le mode
bytecode efface et affiche le cube une fois à son entrée ; le programme reste
responsable des effacements suivants.

`WAIT 0` équivaut à `YIELD`. Les autres valeurs sont comprises entre 1 et
60 000 millisecondes. La comparaison de l'échéance doit supporter le
rebouclage de `millis()`.

### Sémantique des calculs

`RAND_U8` exige `min <= max`. La graine appartient à la session d'exécution et
peut être imposée par les tests. Elle n'est pas persistée dans le conteneur.

`SIN8` traite 0 à 255 comme un tour complet et retourne 0 à 255, centré sur
128. Sa table ou son approximation native doit donner exactement les mêmes
256 résultats que la VM TypeScript.

`BOUNCE` exige `min <= max`. Il calcule la prochaine position ; si elle sort de
la plage, il inverse d'abord la vitesse puis applique le déplacement. Une
vitesse encore incapable de produire une position valide déclenche une faute.

### Particules

Le moteur accepte de 1 à 32 particules. `PARTICLE_CONFIG` définit :

- `count` : capacité active, comprise entre 1 et 32 ;
- `gravity` : accélération verticale signée Q4.4 ;
- `drag` : multiplicateur de vitesse `drag / 255` ;
- `life` : durée initiale de 1 à 255 passages `PARTICLE_STEP`.

Les positions données à `PARTICLE_EMIT` doivent être comprises entre 0 et 7.
Les vitesses sont des valeurs Q4.4 signées lues dans l'octet bas des registres.
La particule capture la couleur courante. Une émission lorsque la capacité est
pleine remplace la particule ayant la plus faible durée restante ; cette règle
évite une allocation et reste déterministe.

`PARTICLE_STEP` ajoute d'abord la gravité à la vitesse verticale, applique
ensuite le drag aux trois vitesses, puis ajoute les vitesses aux positions Q4.4.
Les vitesses sont bornées entre -128 et 127. L'instruction décrémente enfin la
durée, élimine les particules expirées ou sorties du cube et dessine les
survivantes avec la partie entière de leurs positions. Elle n'appelle pas
`SHOW` implicitement.

Le programme, l'état VM et au plus 32 particules doivent tenir ensemble dans le
scratch partagé de 1 536 octets. L'implémentation firmware devra le garantir par
des `static_assert` avant activation de cette capacité.

## Validation avant exécution

Le firmware valide entièrement le conteneur avant de changer de mode :

1. signature, versions, capacités, flags et longueur ;
2. CRC ;
3. décodage complet sans instruction tronquée ni opcode inconnu ;
4. registres et nibbles réservés ;
5. frontières de toutes les instructions ;
6. point d'entrée ;
7. destinations de tous les branchements ;
8. limites statiques des opérandes et des capacités.

Aucune validation ne doit écrire dans le framebuffer ou dans l'EEPROM. Les
coordonnées issues de registres sont à nouveau contrôlées à l'exécution.

## Quotas coopératifs

Un passage de service exécute au maximum 64 instructions. Atteindre cette
limite rend la main au firmware sans perdre l'état de la VM.

Le programme doit rencontrer `SHOW`, `YIELD` ou `WAIT` au plus tard après 256
instructions cumulées. Dépasser ce second quota provoque une faute définitive.
`HALT`, une faute et un changement de mode arrêtent immédiatement la tranche.

Les primitives internes restent elles-mêmes bornées : une sphère visite au plus
512 voxels et un passage de particules traite au plus 32 entrées. La VM ne peut
appeler ni Particle, ni le serveur HTTP, ni l'EEPROM.

## Codes d'erreur version 1

| Code | Nom | Cause |
| ---: | --- | --- |
| `-300` | `BYTECODE_ERROR_CONTAINER` | signature ou en-tête invalide |
| `-301` | `BYTECODE_ERROR_FORMAT_VERSION` | version de format inconnue |
| `-302` | `BYTECODE_ERROR_VM_VERSION` | VM installée trop ancienne |
| `-303` | `BYTECODE_ERROR_LENGTH` | longueur vide, excessive ou incohérente |
| `-304` | `BYTECODE_ERROR_CRC` | CRC incorrect |
| `-305` | `BYTECODE_ERROR_CAPABILITY` | capacité inconnue, absente ou indisponible |
| `-306` | `BYTECODE_ERROR_INSTRUCTION` | opcode inconnu, instruction tronquée ou opérande invalide |
| `-307` | `BYTECODE_ERROR_JUMP` | branchement hors payload ou hors frontière |
| `-308` | `BYTECODE_ERROR_ENTRY_POINT` | point d'entrée invalide |
| `-309` | `BYTECODE_ERROR_REGISTER` | identifiant de registre ou nibble réservé invalide |
| `-310` | `BYTECODE_ERROR_COORDINATE` | coordonnée ou rayon runtime invalide |
| `-311` | `BYTECODE_ERROR_VALUE` | plage, attente ou valeur runtime invalide |
| `-312` | `BYTECODE_ERROR_QUOTA` | absence prolongée de frontière coopérative |
| `-313` | `BYTECODE_ERROR_PARTICLE_LIMIT` | configuration de particules excessive |
| `-314` | `BYTECODE_ERROR_NO_PROGRAM` | aucun conteneur valide installé |
| `-315` | `BYTECODE_ERROR_STATE` | opération incompatible avec l'état courant |
| `-316` | `BYTECODE_ERROR_STORAGE` | écriture ou relecture EEPROM incohérente |

Une faute de validation laisse le mode courant inchangé. Une faute runtime
arrête la VM, mémorise code et compteur ordinal fautif dans les diagnostics,
efface le cube et demande le passage coopératif vers `Off`.

## Exemples d'assemblage

### Pluie minimale

```text
CLEAR
PARTICLE_CONFIG 10, -16, 255, 8

loop:
RAND_U8 R0, 0, 7
SET_I8 R1, 7
RAND_U8 R2, 0, 7
RAND_U8 R3, 0, 255
COLOR_WHEEL R3
SET_I8 R4, 0
SET_I8 R5, -16
SET_I8 R6, 0
PARTICLE_EMIT R0, R1, R2, R4, R5, R6
PARTICLE_STEP
FADE 224
SHOW
WAIT 150
JUMP loop
```

### Sphère rebondissante

```text
SET_I8 R0, 3
SET_I8 R1, 3
SET_I8 R2, 3
SET_I8 R3, 1
SET_I8 R4, 1
SET_I8 R5, 0
SET_U8 R6, 0

loop:
CLEAR
COLOR_WHEEL R6
SPHERE R0, R1, R2, 2
SHOW
WAIT 100
BOUNCE R0, R3, 2, 5
BOUNCE R1, R4, 2, 5
BOUNCE R2, R5, 2, 5
ADD_I8 R6, 5
JUMP loop
```

Ces exemples sont compilés et simulés par L3D Studio. Les sources complètes du
corpus et les mesures reproductibles sont décrites dans
[`BYTECODE_ASSEMBLY.md`](BYTECODE_ASSEMBLY.md).
