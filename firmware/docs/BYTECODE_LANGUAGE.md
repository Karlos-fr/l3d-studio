# Langage procédural L3D version 1

## À quoi sert ce langage ?

Le langage `.l3d` décrit une animation calculée directement par le Photon. Il
ne contient ni JavaScript, ni TypeScript, ni image, ni suite de frames. L3D
Studio transforme le texte en un petit conteneur binaire, le simule localement,
puis peut l'installer sur le cube par le réseau local.

Une seule animation procédurale est installée sur le Photon à la fois. Les
sources et leurs noms restent dans la bibliothèque locale de L3D Studio ; le
Photon conserve uniquement le programme compilé.

## Premier programme

Ce programme fait clignoter un voxel bleu au centre du cube :

```text
# Les coordonnées sont placées dans trois registres.
SET_U8 R0, 3
SET_U8 R1, 3
SET_U8 R2, 3
COLOR_RGB 0, 0, 32

boucle:
CLEAR
VOXEL R0, R1, R2
SHOW
WAIT 500
CLEAR
SHOW
WAIT 500
JUMP boucle
```

`CLEAR` modifie seulement le framebuffer logique. `SHOW` est nécessaire pour
envoyer cette image aux LED. `WAIT` attend sans bloquer Particle Cloud ou le
serveur LAN.

## Écrire et tester une animation

Dans L3D Studio :

1. ouvrir **Animations procédurales** ;
2. choisir un exemple ou saisir une source `.l3d` ;
3. cliquer sur **Compiler** et vérifier taille, capacités et erreur éventuelle ;
4. utiliser **Démarrer** dans l'aperçu pour simuler localement ;
5. configurer l'adresse LAN du Photon ;
6. cliquer sur **Installer**, confirmer un éventuel remplacement et attendre la
   validation du CRC relu ;
7. cliquer sur **Lancer**.

Pour les essais sur le cube réel, conserver une luminosité de 1 %, soit `B:1`
dans une commande Spark Pixels. La luminosité n'appartient pas au bytecode.

## Syntaxe source

- une instruction par ligne ;
- un label sous la forme `nom:` ;
- un label peut précéder une instruction sur la même ligne ;
- mnémotechniques, registres et labels insensibles à la casse ;
- registres `R0` à `R15` ;
- opérandes séparés par des espaces ou des virgules ;
- entiers décimaux ou hexadécimaux préfixés par `0x` ;
- commentaires commençant par `#` ou `//` ;
- saut vers un label recommandé, l'assembleur calculant l'offset relatif.

La version 1 ne possède ni variable nommée, expression, multiplication,
division, fonction, macro, pile d'appels, flottant ou allocation dynamique.
Les registres sont signés sur 16 bits et remis à zéro à chaque lancement.

## Exemples simples

### Balayer un voxel sur l'axe X

```text
SET_U8 R0, 0
SET_U8 R1, 3
SET_U8 R2, 3
SET_I8 R3, 1
COLOR_RGB 24, 0, 0

boucle:
CLEAR
VOXEL R0, R1, R2
SHOW
WAIT 100
BOUNCE R0, R3, 0, 7
JUMP boucle
```

### Faire varier une couleur

```text
SET_U8 R0, 0
SET_U8 R1, 3
SET_U8 R2, 3
SET_U8 R3, 0

boucle:
CLEAR
COLOR_WHEEL R3
VOXEL R0, R1, R2
SHOW
WAIT 40
ADD_I8 R3, 3
JUMP boucle
```

### Dessiner une sphère rebondissante

```text
SET_U8 R0, 3
SET_U8 R1, 3
SET_U8 R2, 3
SET_I8 R3, 1
SET_I8 R4, 1
SET_I8 R5, 1
SET_U8 R6, 0

boucle:
CLEAR
COLOR_WHEEL R6
SPHERE R0, R1, R2, 2
SHOW
WAIT 100
BOUNCE R0, R3, 2, 5
BOUNCE R1, R4, 2, 5
BOUNCE R2, R5, 2, 5
ADD_I8 R6, 4
JUMP boucle
```

Rain, Sphère, Fireworks et Plasma sont disponibles comme exemples complets dans
L3D Studio et dans `app/src/bytecode/examples/`.

## Référence des instructions

Les bornes sont inclusives. `registre` désigne toujours `R0` à `R15`.

| Instruction | Bornes et comportement |
| --- | --- |
| `HALT` | termine normalement en conservant la dernière frame affichée |
| `CLEAR` | met le framebuffer logique à noir sans l'afficher immédiatement |
| `SHOW` | envoie le framebuffer aux LED et rend la main au firmware |
| `YIELD` | rend la main sans affichage ni attente |
| `FADE facteur` | `facteur` de 0 à 255 ; multiplie chaque canal par `facteur / 255` |
| `SET_I8 dst, valeur` | `valeur` de -128 à 127 |
| `SET_U8 dst, valeur` | `valeur` de 0 à 255 |
| `COPY dst, src` | copie les 16 bits signés de `src` vers `dst` |
| `ADD_I8 dst, valeur` | ajoute -128 à 127 avec rebouclage signé sur 16 bits |
| `ADD_REG dst, src` | addition signée sur 16 bits avec rebouclage |
| `SUB_REG dst, src` | soustraction signée sur 16 bits avec rebouclage |
| `SIN8 dst, src` | transforme l'octet bas de `src` en sinus 0 à 255, centré sur 128 |
| `RAND_U8 dst, min, max` | bornes de 0 à 255, `min <= max`, tirage uniforme inclusif |
| `COLOR_RGB r, g, b` | composantes immédiates de 0 à 255 |
| `COLOR_WHEEL src` | couleur issue de l'octet bas de `src` |
| `COLOR_REGS r, g, b` | couleur issue de l'octet bas de trois registres |
| `VOXEL x, y, z` | coordonnées lues dans trois registres et exigées entre 0 et 7 |
| `SPHERE x, y, z, rayon` | centre entre 0 et 7 ; rayon immédiat de 1 à 7 ; volume écrêté aux bords |
| `BOUNCE pos, vitesse, min, max` | bornes signées -128 à 127 avec `min <= max` ; avance puis inverse la vitesse au bord |
| `PARTICLE_CONFIG nombre, gravité, freinage, durée` | nombre 1 à 32 ; gravité -128 à 127 en Q4.4 ; freinage 0 à 255 ; durée 1 à 255 |
| `PARTICLE_EMIT x, y, z, vx, vy, vz` | positions 0 à 7 ; vitesses issues de l'octet bas signé des registres en Q4.4 |
| `PARTICLE_STEP` | avance, vieillit et dessine au plus 32 particules ; n'appelle pas `SHOW` |
| `JUMP cible` | saut relatif -128 à 127 octets vers une frontière d'instruction |
| `JLT gauche, droite, cible` | saute si `gauche < droite`, avec les mêmes bornes de cible |
| `WAIT millisecondes` | durée de 0 à 60 000 ms ; `WAIT 0` équivaut à `YIELD` |

Les détails binaires, tailles d'instruction et numéros d'opcode sont la
référence normative de [`BYTECODE_FORMAT.md`](BYTECODE_FORMAT.md).

## Capacités déclarées automatiquement

L'assembleur calcule le masque de capacités ; il ne se saisit pas dans la
source :

| Capacité | Instructions concernées |
| --- | --- |
| cœur | contrôle, registres, couleur, voxel et attente |
| `GEOMETRY` | `SPHERE` |
| `PARTICLES` | `PARTICLE_CONFIG`, `PARTICLE_EMIT`, `PARTICLE_STEP` |
| `MATH8` | `SIN8` |

Un programme demandant une capacité inconnue ou absente est refusé avant son
exécution.

## Sandbox et quotas

La VM n'accède ni au réseau, ni à Particle, ni à l'EEPROM. Elle ne peut appeler
que les primitives bornées du framebuffer. Elle utilise 16 registres, au plus
32 particules et le scratch partagé de 1 536 octets, sans allocation dynamique.

Le validateur contrôle intégralement le conteneur, les instructions, registres,
coordonnées immédiates, capacités, branchements et CRC avant le changement de
mode. Les coordonnées calculées dans les registres sont contrôlées à nouveau au
moment du rendu.

Une tranche exécute au plus 64 instructions. Le programme doit atteindre
`SHOW`, `YIELD` ou `WAIT` au plus tard après 256 instructions cumulées, sinon il
est arrêté avec `BYTECODE_ERROR_QUOTA`. `SPHERE` visite au plus 512 voxels et
`PARTICLE_STEP` traite au plus 32 entrées.

Une faute runtime arrête la VM, efface le cube, enregistre le code et demande un
retour coopératif vers `Off`. Elle ne redémarre pas le Photon.

## Fautes publiques

| Code | Nom | Signification et action utile |
| ---: | --- | --- |
| `-300` | `BYTECODE_ERROR_CONTAINER` | signature ou en-tête invalide ; recompiler la source |
| `-301` | `BYTECODE_ERROR_FORMAT_VERSION` | format inconnu ; utiliser un assembleur compatible |
| `-302` | `BYTECODE_ERROR_VM_VERSION` | firmware trop ancien pour le programme |
| `-303` | `BYTECODE_ERROR_LENGTH` | taille vide, excessive ou différente de l'en-tête |
| `-304` | `BYTECODE_ERROR_CRC` | binaire altéré ; recompiler puis réinstaller |
| `-305` | `BYTECODE_ERROR_CAPABILITY` | capacité inconnue, absente ou indisponible |
| `-306` | `BYTECODE_ERROR_INSTRUCTION` | opcode, taille ou opérande invalide |
| `-307` | `BYTECODE_ERROR_JUMP` | saut hors payload ou au milieu d'une instruction |
| `-308` | `BYTECODE_ERROR_ENTRY_POINT` | point d'entrée hors instruction |
| `-309` | `BYTECODE_ERROR_REGISTER` | registre hors `R0..R15` ou bits réservés non nuls |
| `-310` | `BYTECODE_ERROR_COORDINATE` | coordonnée calculée ou rayon hors du cube |
| `-311` | `BYTECODE_ERROR_VALUE` | borne, attente ou résultat runtime interdit |
| `-312` | `BYTECODE_ERROR_QUOTA` | plus de 256 instructions sans frontière coopérative |
| `-313` | `BYTECODE_ERROR_PARTICLE_LIMIT` | configuration dépassant 32 particules |
| `-314` | `BYTECODE_ERROR_NO_PROGRAM` | aucun programme valide n'est installé |
| `-315` | `BYTECODE_ERROR_STATE` | opération incompatible avec l'état courant |
| `-316` | `BYTECODE_ERROR_STORAGE` | écriture ou relecture EEPROM non confirmée |

Une erreur d'assemblage est affichée avec son numéro de ligne avant toute
installation. Les correspondances HTTP des fautes sont décrites dans
[`BYTECODE_STORAGE_API.md`](BYTECODE_STORAGE_API.md#erreurs).

## Limites de stockage et versions

- format binaire : version 1 ;
- VM minimale actuelle : version 1 ;
- layout EEPROM : version 1 ;
- conteneur : 13 à 197 octets ;
- en-tête : 12 octets ;
- payload : 1 à 185 octets ;
- programme installé : un seul ;
- banques physiques : deux, pour remplacer sans exposer un programme partiel.

Le CRC-16/CCITT-FALSE protège les champs utiles de l'en-tête et le payload. La
signature est écrite en dernier et n'est volontairement pas couverte par le
CRC, afin de servir de marqueur transactionnel. Le format exact et les adresses
EEPROM sont détaillés dans [`BYTECODE_FORMAT.md`](BYTECODE_FORMAT.md) et
[`BYTECODE_STORAGE_API.md`](BYTECODE_STORAGE_API.md).

## Sécurité du réseau local

La version actuelle ne possède volontairement ni authentification, ni TLS, ni
signature de programme. Toute machine pouvant joindre le Photon sur le port
8080 peut lire, remplacer, lancer ou supprimer le programme. Le serveur doit
rester sur un LAN de confiance et ne doit jamais être exposé par redirection de
port vers Internet.

Cette absence d'authentification réseau ne retire pas la sandbox : un programme
reçu reste intégralement validé et ne peut pas accéder au réseau ou à l'EEPROM.

## Installation et rollback

Le cycle de lecture, installation, remplacement, lancement, arrêt et
suppression est documenté avec les commandes `curl` dans
[`BYTECODE_STORAGE_API.md`](BYTECODE_STORAGE_API.md). L3D Studio automatise la
confirmation de remplacement et la comparaison du CRC après relecture.

Pour retirer toute la fonctionnalité du firmware, définir
`L3D_BYTECODE_ENABLED=0` dans `firmware/src/config/build_config.h`, recompiler
et reflasher. Le mode 77, la VM, le stockage et les routes sont alors absents du
binaire. Les octets EEPROM existants ne sont ni déplacés ni effacés et seront à
nouveau reconnus après réactivation.
