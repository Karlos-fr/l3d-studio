# Optimisation de Text

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `27` |
| Symbole | `TEXT` |
| Nom Particle | `Text` |
| État | actif |
| Implémentation | `src/animations/text.cpp` |
| Paramètres | 2 couleurs, 4 switches, vitesse, texte borné à 63 caractères |

Text alterne entre défilement et chapiteau à chaque entrée. Ses primitives sont
aussi appelées par Clock, IFTTT et CubeGreeting.

## Audit avant optimisation

`message` et `textInputString` sont déjà des buffers fixes de `TEXT_LENGTH`.
Cependant `scrollText(String text, ...)` et `marquee(String text, ...)` prennent
leur argument par valeur. Chaque appel depuis un buffer C construit donc un
objet `String` et peut allouer sur le tas. Les boucles rappellent également
`strlen()` à chaque caractère ou plusieurs fois par frame.

L'optimisation retenue remplace les paramètres par `const char*`, lit les
caractères par index et calcule la longueur une seule fois par appel et par
frame. Positions, vitesses float, fontes et switches restent inchangés.

## Baseline avant modification

| Mesure build | Avant |
| --- | ---: |
| Flash | 112 456 octets |
| RAM statique | 19 652 octets |
| Taille binaire | 112 460 octets |

```powershell
particle call chicken_turkey SetText "CODEX"
particle call chicken_turkey SetMode "M:Text,S:4,B:1,C1:FF0000,C2:000020,T1:0,T2:0,T3:0,T4:0,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre après initialisation | 29 552 octets |
| Mémoire libre à la demande | 29 536 octets |
| Minimum du mode | 29 536 octets |
| Frames observées | 758 |
| Temps moyen de frame | 2 226 µs |
| Pire frame | 2 998 µs |
| FPS moyen | 449,2 |
| OOM | 0 |

La luminosité brute relevée était `2`, correspondant à `B:1`.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 112 456 | 112 072 | −384 partagé |
| RAM statique | 19 652 | 19 652 | 0 |
| Taille binaire | 112 460 | 112 076 | −384 partagé |
| Minimum du mode | 29 536 | 29 536 | 0 |
| Temps moyen de frame | 2 226 µs | 2 094 µs | −132 µs |
| Pire frame | 2 998 µs | 2 990 µs | −8 µs |
| FPS moyen | 449,2 | 477,5 | +28,3 |

La famille Clock/Text libère 384 octets de Flash sans modifier la RAM statique.
La mesure est volontairement partagée, car les changements ont été compilés
ensemble dans le même unity build et les primitives ont plusieurs appelants.

Après flash, le texte `CODEX` couvre 764 frames, sans OOM. La suppression des
copies ne change pas le minimum libre de 29 536 octets : le palier observé ne
provenait donc pas uniquement de `String`. Le temps moyen baisse de 5,9 % sur
cet échantillon court, principalement grâce aux longueurs mises en cache.

## Validation

- [x] `marquee` et `scrollText` n'acceptent plus de `String` par valeur.
- [x] Les textes vide, 1, 5 et 63 caractères sont bornés.
- [x] Les positions produites pour chaque caractère restent identiques.
- [x] Les deux variantes Text et les appels Clock/IFTTT/CubeGreeting compilent.
- [x] La suite complète des tests hôte réussit : 54 tests sur 54.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Text est flashé et mesuré à `B:1` avec `CODEX` et `brightness=2`.
- [ ] La comparaison physique Text est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1` (`brightness=2`).
