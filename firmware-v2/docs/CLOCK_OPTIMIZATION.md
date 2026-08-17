# Optimisation de Clock

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `37` |
| Symbole | `CLOCK` |
| Nom Particle | `Clock` |
| État | actif |
| Implémentation | `src/animations/clock.cpp` |
| Paramètres | 3 couleurs, 4 switches, vitesse |

Le switch 1 choisit l'horloge texte ou 3D, le switch 2 le format 24/12 h, le
switch 3 les couleurs variables et le switch 4 le fond noir. L'horloge texte
partage `marquee()` et `scrollText()` avec Text, IFTTT et CubeGreeting.

## Audit avant optimisation

- `clockMessage[11]` est déjà borné pour `HH:MM:SSAM` et son terminateur ;
- heures, minutes, secondes, plans et lignes sont déjà sur un octet ;
- les positions `h`, `m`, `s` restent provisoirement en `Point`, car trois
  écritures historiques utilisent des couleurs non initialisées avant leur
  calcul : compacter cet état serait mêlé à la correction de ce défaut visuel ;
- les glyphes numériques `bool[10][5][3]` occupent 150 octets de pile et sont
  reconstruits à chaque appel de `display_digits()` ;
- le marqueur AM/PM `bool[2][3][2]` ajoute 12 octets de pile par frame 3D ;
- trois helpers `std::string` et leurs includes `string`/`bitset` ne sont appelés
  nulle part dans le firmware actif.

Les glyphes seront encodés en masques de trois bits constants en Flash. Les
helpers morts seront supprimés. L'API texte partagée passera de `String` par
valeur à `const char*`, sans modifier les caractères rendus.

## Baseline avant modification

| Mesure build | Avant |
| --- | ---: |
| Flash | 112 456 octets |
| RAM statique | 19 652 octets |
| Taille binaire | 112 460 octets |
| Marge Flash | 18 616 octets |

Commandes représentatives :

```powershell
particle call chicken_turkey SetMode "M:Clock,S:4,B:1,C1:FF0000,C2:00FF00,C3:0000FF,T1:0,T2:1,T3:0,T4:0,"
particle call chicken_turkey SetMode "M:Clock,S:4,B:1,C1:FF0000,C2:00FF00,C3:0000FF,T1:1,T2:1,T3:0,T4:0,"
```

| Mesure runtime | Texte | 3D |
| --- | ---: | ---: |
| Mémoire libre après initialisation | 29 552 | 29 552 |
| Minimum du mode | 29 136 | 29 536 |
| Frames observées | 721 | 311 |
| Temps moyen de frame | 3 054 µs | 27 034 µs |
| Pire frame | 3 984 µs | 27 989 µs |
| FPS moyen | 327,4 | 36,9 |
| OOM | 0 | 0 |

Les deux essais utilisaient `brightness=2`, correspondant à `B:1`. La mesure
texte a suivi CheerLights sans redémarrage et conserve donc son minimum global
antérieur ; la mesure 3D a été prise après reflash. Les comparaisons visuelles
restent à valider par l'utilisateur.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 112 456 | 112 072 | −384 partagé |
| RAM statique | 19 652 | 19 652 | 0 |
| Taille binaire | 112 460 | 112 076 | −384 partagé |
| Minimum Clock texte | 29 136 | 29 536 | baseline polluée |
| Minimum Clock 3D | 29 536 | 29 536 | 0 |

La famille Clock/Text libère 384 octets de Flash sans modifier la RAM statique.
Ce gain regroupe les masques Clock, les helpers standard morts et l'API texte ;
il n'est pas artificiellement réparti entre les deux modes.

Après flash, Clock texte couvre 580 frames à 3 025 µs de moyenne, 3 984 µs au
pire et 330,5 FPS, contre 3 054 µs et 327,4 FPS avant. Clock 3D couvre 249
frames à 27 027 µs de moyenne, 27 988 µs au pire et 37,0 FPS, pratiquement
identique à la baseline. Les deux variantes restent sans OOM. Le minimum texte
avant optimisation avait conservé le minimum CheerLights précédent ; seule la
valeur après reflash est retenue comme état propre.

## Validation

- [x] Les dix glyphes et les marqueurs AM/PM sont bit-à-bit équivalents.
- [x] Aucun tableau local supérieur à 64 octets ne reste dans Clock.
- [x] Les helpers `std::string` morts et leurs includes sont supprimés.
- [x] Les formats 24 h et 12 h restent bornés dans 11 octets.
- [x] L'API texte partagée ne construit plus de `String` par frame.
- [x] La suite complète des tests hôte réussit : 54 tests sur 54.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Les variantes texte et 3D sont flashées et mesurées à `B:1` (`brightness=2`).
- [ ] La comparaison physique Clock est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
