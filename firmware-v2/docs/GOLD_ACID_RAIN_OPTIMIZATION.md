# Optimisation de GoldRain et AcidRain

## Identification

| Élément | GoldRain | AcidRain |
| --- | --- | --- |
| ID historique | `40` | `39` |
| Symbole | `GOLDRAIN` | `ACIDRAIN` |
| État | actif | entrée de mode désactivée |
| Implémentation | `src/animations/rain_salvos.cpp` | fichier partagé |
| Paramètres | vitesse et switch microphone | mêmes paramètres historiques |

Les deux modes partagent intégralement `salvos[8]`. Optimiser cette famille
réduit donc la RAM statique même si AcidRain reste masqué.

## Audit avant optimisation

La représentation historique réserve huit salves de 128 gouttes. Sur l'ABI
Photon, la disposition attendue est :

| Structure | Composition | Taille attendue |
| --- | --- | ---: |
| `raindrop` | `Point` 12, `float` 4, `Color` 3, deux `bool` et padding | 24 octets |
| `salvo` | 128 gouttes, un `bool` et padding | 3 076 octets |
| `salvos[8]` | huit salves | 24 608 octets |

Le booléen `flipped` est écrit mais jamais lu. Les sentinelles X/Z à `-1` ne
sont pas nécessaires lorsque le nombre de gouttes valides est explicite. Le
booléen `dead` peut être remplacé par le signe de la position verticale.

Les sept vitesses possibles sont toutes des multiples exacts de `0,05` :
`0,10`, `0,15`, `0,20`, `0,25`, `0,30`, `0,35` et `0,50`. Une représentation en
vingtièmes conserve donc exactement positions, seuils de couleur et vitesse,
sans approximation Q8.8.

La densité historique maximale de 8 × 128 gouttes est conservée pendant cette
optimisation. La réduire nécessiterait une comparaison visuelle spécifique.

## Baseline avant modification

La baseline inclut les optimisations Snake et CrumblingPlane :

| Mesure | Avant |
| --- | ---: |
| Flash | 114 424 octets |
| RAM statique | 39 876 octets |
| Taille binaire | 114 428 octets |
| Marge Flash | 16 648 octets |

Commande GoldRain utilisée :

```powershell
particle call chicken_turkey SetMode "M:GoldRain,S:4,B:1,T1:0,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 9 280 octets |
| Mémoire libre à la demande | 9 264 octets |
| Minimum du mode | 9 264 octets |
| Frames observées | 146 |
| Dernière frame | 57 003 µs |
| Temps moyen de frame | 56 934 µs |
| Pire frame | 57 004 µs |
| FPS moyen | 17,5 |
| OOM | 0 |

AcidRain ne peut pas recevoir de baseline matérielle sans réactiver son entrée,
ce qui reste hors du périmètre de cette passe.

## Optimisation retenue

- conserver huit salves et 128 emplacements par salve ;
- remplacer `Point` par X/Z sur un octet et Y signé en vingtièmes ;
- remplacer la vitesse `float` par un nombre de vingtièmes sur un octet ;
- supprimer `flipped`, les sentinelles et les booléens par goutte ;
- stocker seulement le nombre de gouttes d'une salve ;
- parcourir uniquement les gouttes réellement initialisées ;
- utiliser le signe de Y pour ignorer une goutte terminée ;
- convertir Y en coordonnée logique seulement au moment du rendu.

La structure compacte visée occupe 8 octets par goutte et 1 026 octets par
salve, soit 8 208 octets au total. Le gain statique attendu est d'environ
16 400 octets sans modifier la capacité historique.

Les soustractions historiques en `float32` passent juste sous deux frontières
entières pour les vitesses `0,15` et `0,30`, aux hauteurs 5 et 2. La conversion
de rendu reproduit explicitement ces quatre passages. Un test compare toutes
les coordonnées visibles de chaque trajectoire avant et après optimisation.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 114 424 | 113 816 | −608 |
| RAM statique | 39 876 | 23 476 | −16 400 |
| Taille binaire | 114 428 | 113 820 | −608 |
| Mémoire libre à la demande | 9 264 | 25 664 | +16 400 |
| Minimum du mode | 9 264 | 25 664 | +16 400 |
| Temps moyen de frame | 56 934 µs | 52 669 µs | −4 265 µs |
| Pire temps de frame | 57 004 µs | 53 006 µs | −3 998 µs |
| FPS moyen | 17,5 | 18,9 | +1,4 |

La mesure après flash porte sur 201 frames, sans OOM. La mémoire libre après
initialisation est passée de 9 280 à 25 680 octets, soit le même gain de
16 400 octets que la RAM statique. Le test court ne remplace pas la validation
visuelle physique, qui reste à confirmer.

## Validation

- [x] Les tailles compactes sont garanties par assertions statiques.
- [x] Les sept vitesses sont représentées exactement.
- [x] La capacité historique de 1 024 gouttes est conservée.
- [x] Les seuils Y et incréments RGB sont comparés avant/après côté hôte.
- [x] La suite complète des tests hôte réussit : 31 tests sur 31.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] GoldRain est flashé et mesuré à `B:1` (`brightness=2`).
- [ ] La comparaison physique GoldRain est validée à `B:1`.
- [x] AcidRain reste désactivé.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
