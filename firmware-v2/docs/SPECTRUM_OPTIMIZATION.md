# Optimisation de Spectrum

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `20` |
| Symbole | `SPECTRUM` |
| Nom Particle | `Spectrum` |
| État | actif, microphone |
| Implémentation | `src/animations/spectrum.cpp` |
| Paramètres | 2 switches, vitesse |

Spectrum échantillonne 16 valeurs, exécute une FFT complexe puis dessine huit
bandes avec leurs traînées. Le switch 1 active le fondu et le switch 2 les pics.

## Audit avant optimisation

Les tableaux `real[16]` et `imaginary[16]` occupent 128 octets permanents mais
ne sont utilisés que pendant Spectrum. Ils peuvent partager le scratch de
1 536 octets avec Snake, Crumble, transitions et autres animations, car
`transitionAll()` termine avant la première frame FFT.

La magnitude a déjà remplacé `pow(x, 2)` par des multiplications en phase 4.
Les racines restantes appartiennent à l'algorithme FFT et à sa normalisation ;
elles sont conservées faute d'équivalence visuelle démontrée. Les délais
d'échantillonnage de 120 µs et de traînée restent inchangés.

## Baseline avant modification

| Mesure build | Avant |
| --- | ---: |
| Flash | 112 072 octets |
| RAM statique | 19 652 octets |
| Taille binaire | 112 076 octets |

```powershell
particle call chicken_turkey SetMode "M:Spectrum,S:4,B:1,T1:1,T2:1,"
```

| Mesure runtime | Avant |
| --- | ---: |
| Mémoire libre à la demande | 29 216 octets |
| Minimum du mode | 29 216 octets |
| Frames observées | 296 |
| Temps moyen de frame | 28 976 µs |
| Pire frame | 29 168 µs |
| FPS moyen | 34,5 |
| OOM | 0 |

La luminosité brute relevée était `2`, correspondant à `B:1`.

## Mesures après optimisation

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 112 072 | 111 976 | −96 |
| RAM statique | 19 652 | 19 524 | −128 |
| Taille binaire | 112 076 | 111 980 | −96 |
| Minimum du mode | 29 216 | 29 344 | +128 |
| Temps moyen de frame | 28 976 µs | 28 969 µs | −7 µs |
| FPS moyen | 34,5 | 34,5 | stable |

Le build après optimisation contient également la simplification Plasma du
même jalon. La baisse de 128 octets de RAM statique provient entièrement du
placement des deux tableaux FFT dans le scratch partagé. Après flash, le relevé
Spectrum couvre 332 frames, avec 29 331 µs au pire, sans OOM. La luminosité
brute vaut `2` et le Photon a ensuite été replacé en mode `Off` avec `B:1`.

## Validation

- [x] Les deux tableaux FFT occupent exactement 128 octets du scratch partagé.
- [x] Aucune transition et aucune frame Spectrum n'utilisent le scratch simultanément.
- [x] Les 16 échantillons, la FFT et les délais historiques restent inchangés.
- [x] La suite complète des 57 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Spectrum est flashé et mesuré à `B:1`.
- [ ] La comparaison physique Spectrum est validée à `B:1`.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
