# Baseline du bytecode procédural L3D

## Statut

Ce document archive les mesures de faisabilité de la phase 0. Le format utilisé
par l'encodeur TypeScript est volontairement expérimental : il sert à mesurer
les programmes avant de figer le contrat de la VM en phase 1.

Date de mesure : 19 août 2026.

## Baseline firmware

La compilation a été relancée avec :

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

| Cible | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| Photon, Device OS 2.3.1 | 118 296 | 15 204 | 118 300 | 12 776 |

Ces valeurs sont identiques à la dernière baseline du serveur LAN et du mode
Stream. Aucun code firmware n'a été modifié pour cette mesure.

Le Photon a ensuite été interrogé sans flash par
`GET /api/v1/diagnostics` sur le LAN :

| Mesure runtime | Valeur |
| --- | ---: |
| Mémoire libre courante `f` | 33 984 octets |
| Minimum global `n` | 30 192 octets |
| Minimum du mode `q` | 31 888 octets |
| OOM cumulés `z` | 0 |
| Uptime lors du relevé | 5 042 secondes |

Cette lecture ponctuelle confirme la marge runtime disponible ; elle ne
remplace pas les futurs tests d'endurance de la VM.

## Stockage persistant actuel

Particle documente 2 047 octets d'EEPROM émulée pour les appareils Gen 2. Le
firmware utilise également `MAX_EEPROM_SIZE = 2047` et borne ses effacements à
`i < MAX_EEPROM_SIZE`. Les adresses valides considérées sont donc 0 à 2 046.

Référence : [Particle Device OS — EEPROM](https://docs.particle.io/reference/device-os/api/eeprom/eeprom/).

La valeur de `EEPROM.length()` n'est pas exposée par le firmware actuellement
installé. Sa lecture directe sur ce Photon nécessiterait un firmware de mesure
et un flash temporaire ou l'ajout d'un diagnostic permanent. Cette opération
n'a pas été effectuée pendant la phase 0 afin de ne pas modifier l'appareil sans
demande explicite.

### Layout existant

| Zone | Première adresse | Octets effectivement utilisés | Dernière adresse utilisée |
| --- | ---: | ---: | ---: |
| CubePainter RGB | 0 | 1 536 | 1 535 |
| Texte persistant | 1 537 | 64 | 1 600 |
| Switches du mode | 1 602 | 4 | 1 605 |
| Six couleurs `uint32_t` | 1 607 | 24 | 1 630 |
| Dernier mode | 1 632 | 1 | 1 632 |
| Vitesse | 1 637 | 1 | 1 637 |
| Luminosité | 1 642 | 1 | 1 642 |
| Trois switches auxiliaires | 1 647, 1 649, 1 651 | 3 | 1 651 |

Les trous historiques compris avant l'adresse 1 652 restent réservés afin de
ne pas changer implicitement le layout. La plage contiguë 1 652 à 2 046 fournit
395 octets nouveaux sans chevaucher CubePainter ni un réglage existant.

## Mémoire de travail

`SharedAnimationScratch` contient un membre de 1 536 octets et une assertion de
compilation impose exactement cette taille. Il appartient à l'union des états
d'animations mutuellement exclusifs. La future VM peut donc y charger son
programme uniquement lorsqu'elle est active, sans créer un second framebuffer
ni augmenter la RAM statique pour ce buffer.

L'état partagé complet mesure actuellement 8 220 octets parce que RainSalvos
reste son plus gros membre. La version 1 ne doit pas considérer ces 8 220
octets comme un nouveau budget à consommer : son programme reste borné par les
1 536 octets du scratch explicitement audité.

## Corpus procédural

### Rain

Le programme configure des particules descendantes, choisit des coordonnées et
une couleur aléatoires, émet une goutte, avance les particules, atténue la
traînée, affiche la frame puis attend. Il nécessite le cœur de la VM, le hasard,
le fondu et le moteur générique de particules.

### Sphère

Le programme initialise un centre et une vitesse sur trois axes, efface le
framebuffer, choisit une couleur cyclique, dessine une sphère native, affiche la
frame puis applique trois rebonds bornés. Il nécessite le cœur de la VM et une
primitive géométrique `SPHERE`.

### Fireworks

Le programme réutilise le même moteur de particules que Rain avec une
configuration d'explosion, une origine et une couleur aléatoires, un fondu et
une temporisation entre deux salves. Aucun opcode spécifique `FIREWORKS` n'est
introduit.

### Plasma

Le programme parcourt les trois axes avec des boucles, calcule trois composantes
par sinus entier déphasé, sélectionne la couleur issue des registres et écrit
chaque voxel. Aucun opcode spécifique `PLASMA` ni calcul flottant n'est utilisé
dans ce prototype de taille.

## Opcodes expérimentaux retenus

| Famille | Opérations utilisées | Corpus concerné |
| --- | --- | --- |
| Contrôle | `JUMP`, `JUMP_IF_LESS`, `WAIT` | quatre programmes |
| Registres | `SET`, `COPY`, `ADD` | sphère et Plasma |
| Hasard | `RANDOM` | Rain et Fireworks |
| Couleur | RGB, roue, trois registres | quatre programmes |
| Rendu | `CLEAR`, `SHOW`, `VOXEL`, `FADE`, `SPHERE` | quatre programmes |
| Mouvement | `BOUNCE` | sphère |
| Particules | configuration, émission, progression | Rain et Fireworks |
| Mathématiques | `SIN8` | Plasma et futures animations cycliques |

Les primitives nommées `RAIN`, `FIREWORKS` et `PLASMA` ont été écartées : elles
réduiraient artificiellement le corpus en déplaçant chaque animation dans le
firmware. `SPHERE` est conservée malgré un seul usage dans ce corpus, car elle
remplace un parcours de 512 voxels et constitue une primitive géométrique
générale. `SIN8` reste générique et réutilisable par vagues, spirales et
rotations.

## Mesures du premier encodage

Le conteneur expérimental réserve douze octets : signature, version,
capacités, longueur, point d'entrée et CRC-16. Les programmes n'utilisent pas
encore de table de constantes séparée.

| Programme | Instructions | En-tête | Code | Constantes | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rain | 12 | 12 | 38 | 0 | 50 |
| Sphère | 17 | 12 | 53 | 0 | 65 |
| Fireworks | 15 | 12 | 49 | 0 | 61 |
| Plasma | 32 | 12 | 98 | 0 | 110 |

L'encodeur valide le nombre d'opérandes et leur représentation sur un octet.
Il ne constitue pas encore un compilateur complet : la résolution des labels,
la validation des branchements et l'exécution sémantique appartiennent aux
phases 1 et 2. Ces tailles mesurent donc l'expressivité et le stockage, pas la
correction visuelle finale.

## Décision de stockage de la version 1

La plage libre de 395 octets est divisée en deux banques transactionnelles :

| Banque | Adresses physiques | Taille physique | Taille contractuelle |
| --- | --- | ---: | ---: |
| A | 1 652 à 1 848 | 197 | 197 |
| B | 1 849 à 2 046 | 198 | 197 |

Le dernier octet physique de la banque B reste réservé. Chaque banque accepte
un conteneur maximal de 197 octets, soit 185 octets de code avec l'en-tête
expérimental de douze octets.

Une seule animation utilisateur est visible à la fois. Lors d'un remplacement,
le firmware écrit la banque inactive, vérifie son CRC, puis la rend courante.
La banque précédente reste valide en cas de coupure. Ce double-buffering est
préféré à plusieurs petits emplacements : il conserve une marge pour des
programmes plus riches et permet une mise à jour résistante aux interruptions.

Les quatre programmes mesurés tiennent individuellement dans une banque. Le cas
le plus grand, Plasma, utilise 110 octets sur 197 et laisse 87 octets de marge.
Rain et la sphère satisfont donc le critère minimal sans modifier CubePainter.

La zone CubePainter, une mémoire externe et une migration vers Photon 2 ne sont
pas nécessaires pour la version 1. Elles restent des options futures si un
programme réel dépasse 197 octets. L'application peut conserver plusieurs
sources localement et installer celle choisie dans l'unique emplacement logique
du cube.

## Conclusion de phase 0

Le prototype confirme qu'une VM procédurale spécialisée est compatible avec le
stockage actuel pour le corpus retenu. Le contrat de phase 1 doit préserver les
limites suivantes ou rouvrir explicitement la décision :

- conteneur persistant maximal : 197 octets ;
- cible de code après en-tête : 185 octets ;
- une animation installée et deux banques physiques transactionnelles ;
- aucune utilisation de la zone CubePainter ;
- scratch actif maximal : 1 536 octets ;
- aucun opcode propre à une animation du corpus.

## Mesure après l'assembleur de phase 2

Les tailles expérimentales ci-dessus ont été remplacées par des sources `.l3d`
réellement assemblées, validées et exécutées par la VM TypeScript de référence.
La mesure finale est détaillée dans
[`BYTECODE_ASSEMBLY.md`](BYTECODE_ASSEMBLY.md).

| Animation | En-tête | Payload final | Conteneur final | Marge payload |
| --- | ---: | ---: | ---: | ---: |
| Rain | 12 | 43 | 55 | 142 |
| Sphère | 12 | 49 | 61 | 136 |
| Fireworks | 12 | 45 | 57 | 140 |
| Plasma | 12 | 75 | 87 | 110 |

Plasma reste le cas le plus grand et occupe 75 octets sur les 185 disponibles.
Ces mesures confirment la décision de conserver une animation installée dans
deux banques transactionnelles, sans compression supplémentaire en version 1.
