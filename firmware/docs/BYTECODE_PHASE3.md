# Interpréteur bytecode — bilan de phase 3

## Périmètre livré

Le firmware contient désormais quatre modules séparés dans
`firmware/src/bytecode/` : format et CRC, validation statique, diagnostics et
machine virtuelle. La VM exécute le contrat version 1 défini dans
[`BYTECODE_FORMAT.md`](BYTECODE_FORMAT.md), sans allocation dynamique et sans
accès à l'EEPROM.

Le mode `L3DProgram` utilise l'ID 77, après tous les IDs historiques. Il est
exclu du Shuffle et de la mémorisation du dernier mode tant que la persistance
n'est pas réalisée. Il est aussi omis du catalogue Particle historique, dont
les 621 caractères sont déjà occupés ; la phase 4 l'exposera par l'API LAN
dédiée sans tronquer ou renommer un mode existant. Pour ce jalon, il lance une
Sphère procédurale immuable
stockée en Flash. La sélection d'un autre programme reste transitoire : le
buffer source doit rester valide jusqu'à la prochaine entrée dans le mode. La
phase 4 remplacera ce mécanisme par un chargement transactionnel depuis
l'EEPROM.

## Mémoire et coopération

Le conteneur actif, les 16 registres et l'état borné de 32 particules occupent
le scratch partagé de 1 536 octets uniquement pendant ce mode. Aucun second
framebuffer n'est créé. Une assertion de compilation interdit à cet état de
dépasser le scratch disponible.

Chaque passage exécute au plus 64 instructions. Une exécution dépassant 256
instructions sans `WAIT`, `YIELD` ou `SHOW` est arrêtée à la 257e instruction.
Ces frontières rendent la main à Particle et au serveur LAN. Les changements
de mode demandés pendant le rendu sont appliqués à une frontière sûre, avant
la réutilisation du scratch par une autre animation.

## Validation et fautes

Avant activation, le validateur contrôle signature, versions, longueur, CRC,
capacités, opcodes, opérandes, frontières d'instructions et cibles de saut. Il
utilise un bitset local de 24 octets et n'alloue pas de mémoire dynamique. Une
validation refusée conserve le programme et le mode courants.

Une faute d'exécution efface le cube, mémorise le code, le compteur ordinal et
les compteurs d'exécution, puis demande un retour différé vers `Off`. Les
coordonnées sont validées avant toute écriture. La VM n'appelle aucune fonction
EEPROM.

## Tests automatisés

Le banc hôte compile et exécute directement les fichiers C++ destinés au
Photon avec des primitives de rendu simulées. Il couvre notamment :

- opcode inconnu et saut vers un opérande ;
- Sphère, `WAIT`, `SHOW`, graine xorshift32 et table `SIN8` identiques au contrat TypeScript ;
- coordonnée invalide sans écriture hors framebuffer ;
- boucle infinie arrêtée exactement à la limite contractuelle ;
- demande de retour vers `Off` après une faute.

Les contrôles statiques vérifient aussi la modularité, le flag de compilation,
l'absence d'allocation et d'EEPROM, le scratch partagé et la présence de tous
les opcodes version 1.

## Mesures Photon 2.3.1

| Configuration | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| Baseline avant phase 3 | 118 296 | 15 204 | 118 300 | 12 776 |
| VM active | 121 904 | 15 228 | 121 908 | 9 168 |
| VM désactivée | 118 328 | 15 204 | 118 332 | 12 744 |

Le coût actif est donc de 3 608 octets de Flash et 24 octets de RAM statique
par rapport à la baseline. Le rollback désactivé conserve 32 octets de Flash
pour le changement de mode différé partagé avec le streaming.

## Validation matérielle du 19 août 2026

Le binaire final des phases 3 à 5 a été flashé sur le Photon, puis les deux
programmes ont été installés et lancés à `B:1` :

| Programme | Conteneur | CRC relu | Capacité | Mode confirmé |
| --- | ---: | ---: | ---: | ---: |
| Sphère | 61 octets | `142D` | géométrie | 77 |
| Rain | 55 octets | `6E02` | particules | 77 |

Pendant Rain, le diagnostic LAN a relevé 33 384 octets libres, un minimum
global de 28 888 octets, une durée de frame moyenne de 1 157 µs, un pire cas
de 120 168 µs et aucun OOM. Le pire cas inclut les transitions et attentes
coopératives observées depuis l'entrée du mode ; il ne représente pas le seul
calcul de Rain.

Les routes LAN sont restées disponibles pendant l'exécution. La commande
Particle `GETDIAG` puis la lecture de `deviceInfo` ont également répondu avec
le mode 77, Wi-Fi et Particle connectés. Les passages `Off` → bytecode → `Off`
→ bytecode ont réussi sans redémarrage.

La conformité visuelle exacte avec l'aperçu TypeScript reste à confirmer par
observation humaine du cube. Le critère de sortie visuel demeure donc non
coché dans le plan, même si l'exécution et les transports ont été mesurés.
