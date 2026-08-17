# Optimisation de CheerLights

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `31` |
| Symbole | `CHEERLIGHTS` |
| Nom Particle | `CheerLights` |
| État | actif, dépendant du réseau externe |
| Implémentation | `src/network/cheerlights.cpp` |
| Paramètres | aucun paramètre de mode |

CheerLights interroge en HTTP le canal ThingSpeak historique, lit une couleur
`#RRGGBB` puis choisit une transition visuelle aléatoire. Cette passe conserve
l'hôte, le chemin, les délais réseau et les six transitions.

## Audit avant optimisation

Trois objets `String` globaux portent l'hôte, le chemin et la réponse HTTP.
L'hôte et le chemin sont immuables, tandis que la réponse utile contient
exactement sept caractères. La boucle réseau construit pourtant une nouvelle
`String` temporaire pour chaque caractère avec `response.concat(String(c))`.
Ce chemin alloue et réalloue sur le tas pendant une animation déjà bloquante.

L'optimisation retenue remplace :

- l'hôte et le chemin par deux tableaux `const char[]` en Flash ;
- la réponse par huit octets fixes, terminateur nul inclus ;
- la longueur dynamique par un compteur saturé à huit pour distinguer une
  réponse exacte d'une réponse trop longue ;
- les reconnexions dupliquées par un helper sans allocation.

`cheerLightsEnabled`, jamais lu, est supprimé. Les timestamps passent en
`uint32_t` pour suivre le domaine de `millis()` sans modifier les intervalles.

## Baseline avant modification

La baseline inclut l'optimisation Squarrel :

| Mesure | Avant |
| --- | ---: |
| Flash | 113 256 octets |
| RAM statique | 19 692 octets |
| Taille binaire | 113 260 octets |
| Marge Flash | 17 816 octets |

Commande utilisée :

```powershell
particle call chicken_turkey SetMode "M:CheerLights,B:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 29 464 octets |
| Mémoire libre à la demande | 31 536 octets |
| Minimum du mode | 30 272 octets |
| Frames observées | 1 |
| Temps de frame | 13 569 631 µs |
| FPS moyen | inférieur à 0,1 |
| OOM | 0 |
| Réponse externe | `#800080` |

La luminosité brute relevée était `2`, correspondant à `B:1`. La latence est
fortement dépendante du réseau et l'échantillon d'une frame ne constitue pas un
benchmark CPU. La comparaison visuelle reste à valider par l'utilisateur.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 113 256 | 112 456 | −800 |
| RAM statique | 19 692 | 19 652 | −40 |
| Taille binaire | 113 260 | 112 460 | −800 |
| Mémoire libre minimale dans le mode | 30 272 | 29 136 | non comparable |
| Temps de frame observé | 13 569 631 µs | 140 515 µs moyen | réseau |
| OOM | 0 | 0 | 0 |

La suppression des trois objets dynamiques et du code mort associé libère
40 octets de RAM statique et 800 octets de Flash. Le gain principal attendu
reste la disparition des allocations et réallocations réseau sur le tas.

Après flash, la première connexion externe a expiré, puis une seconde tentative
a reçu `#800080`. La mesure prolongée couvre 430 frames, avec 29 552 octets
libres après initialisation, 31 664 octets avant/après la dernière frame et un
minimum transitoire de 29 136 octets pendant les connexions TCP. Ce minimum ne
se compare pas honnêtement à la baseline d'une seule frame ; aucun gain runtime
ne lui est attribué. Il est resté stable pendant l'essai, sans OOM.

## Validation

- [x] Aucun `String`, `new`, `malloc` ou conteneur dynamique ne reste dans CheerLights.
- [x] Les réponses de 0, 6, 7, 8 caractères et plus sont bornées et classées correctement.
- [x] Une réponse valide conserve exactement le parsing `#RRGGBB` historique.
- [x] L'hôte, le chemin, les délais et les six transitions restent inchangés.
- [x] La suite complète des tests hôte réussit : 49 tests sur 49.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] CheerLights reçoit `#800080` et est mesuré à `B:1` (`brightness=2`).
- [ ] La comparaison physique CheerLights est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
