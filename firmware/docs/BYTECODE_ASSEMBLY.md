# Assembleur L3D version 1

Ce document décrit l'assembleur du langage source procédural `.l3d`. Une
animation est écrite directement dans ce langage. TypeScript fournit seulement
l'assembleur, le validateur, le désassembleur et la VM de référence ; il n'est
pas nécessaire d'écrire l'animation en TypeScript.

Le tutoriel, les exemples simples et la référence orientée utilisateur sont
disponibles dans [`BYTECODE_LANGUAGE.md`](BYTECODE_LANGUAGE.md).

## Syntaxe volontairement minimale

- une instruction ou un label par ligne ;
- labels sous la forme `nom:` et insensibles à la casse ;
- commentaires commençant par `#` ou `//` ;
- opérandes séparés par des espaces ou des virgules ;
- registres `R0` à `R15` ;
- entiers décimaux ou hexadécimaux préfixés par `0x` ;
- branchements relatifs calculés automatiquement à partir des labels.

Exemple :

```text
SET_U8 R0, 0
SET_U8 R1, 8

boucle:
ADD_I8 R0, 1
JLT R0, R1, boucle
HALT
```

L'assembleur travaille en deux passes. La première calcule les offsets et
enregistre les labels ; la seconde encode les instructions et vérifie que tout
branchement signé tient entre -128 et 127 octets. Une erreur indique toujours
la ligne source et sa cause.

## Instructions

La syntaxe canonique est :

```text
HALT
CLEAR
SHOW
YIELD
FADE facteur
SET_I8 registre, valeur
SET_U8 registre, valeur
COPY destination, source
ADD_I8 destination, valeur
ADD_REG destination, source
SUB_REG destination, source
SIN8 destination, source
RAND_U8 destination, minimum, maximum
COLOR_RGB rouge, vert, bleu
COLOR_WHEEL registre
COLOR_REGS rouge, vert, bleu
VOXEL x, y, z
SPHERE x, y, z, rayon
BOUNCE position, vitesse, minimum, maximum
PARTICLE_CONFIG nombre, gravite, freinage, duree
PARTICLE_EMIT x, y, z, vx, vy, vz
PARTICLE_STEP
JUMP label
JLT gauche, droite, label
WAIT millisecondes
```

Les tailles, bornes et effets exacts restent définis par
[`BYTECODE_FORMAT.md`](BYTECODE_FORMAT.md). Le langage version 1 ne possède ni
expressions, ni macros, ni fonctions, ni optimisation de code mort. Cette
limite garde l'outil prévisible et le firmware futur petit.

## Modules TypeScript

- `format.ts` : constantes et types du contrat binaire ;
- `crc16.ts` : CRC-16/CCITT-FALSE ;
- `assembler.ts` : parsing en deux passes et création du conteneur ;
- `decoder.ts` et `validator.ts` : contrôle intégral avant exécution ;
- `disassembler.ts` : restitution canonique destinée aux diagnostics ;
- `reference_vm.ts` : sémantique indépendante du DOM ;
- `examples/*.l3d` : corpus procédural de référence.

## Mesures du corpus final de phase 2

Chaque taille inclut seulement le bytecode réellement produit, sans texte
source ni métadonnée d'interface.

| Animation | En-tête | Payload | Conteneur | Marge payload |
| --- | ---: | ---: | ---: | ---: |
| Rain | 12 | 43 | 55 | 142 |
| Sphère | 12 | 49 | 61 | 136 |
| Fireworks | 12 | 45 | 57 | 140 |
| Plasma | 12 | 75 | 87 | 110 |

Le plus gros programme utilise 40,5 % des 185 octets disponibles. Il reste donc
110 octets pour enrichir Plasma sans changer la stratégie EEPROM retenue.

## Reproductibilité et limites

À source, génération et option de point d'entrée identiques, le conteneur est
strictement identique octet par octet. Le désassembleur restitue un programme
recompilable, mais ne tente pas de retrouver les commentaires ou les noms de
labels d'origine.

La VM exécute au plus 64 instructions par tranche et déclenche une faute après
256 instructions sans `SHOW`, `YIELD` ou `WAIT`. Une trace déterministe expose
l'offset, l'opcode, les registres et le nombre d'écritures voxel après chaque
instruction. La même VM alimente désormais l'aperçu 3D de L3D Studio.
