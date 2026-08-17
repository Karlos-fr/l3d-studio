# Optimisation de Fireworks

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `55` |
| Symbole | `FIREWORKS` |
| Nom Particle | `Fireworks` |
| État | actif, famille CubeClassics |
| Implémentation | `src/animations/cube_classics.cpp` |
| Paramètres | vitesse, balayage de couleur partagé |

Fireworks lance une fusée puis anime jusqu'à 50 particules pendant 25 étapes
d'explosion.

## Audit et optimisation

Les 300 floats de position et vitesse occupent 1 200 octets mais réutilisent
déjà la branche `particles` du scratch partagé. Les positions et vitesses
fractionnaires rendent une conversion entière risquée sans comparaison visuelle
plus complète.

Chaque étape calculait deux fois `tan((e + 0.1) / 20)` avec exactement le même
argument. Une valeur `double` commune alimente maintenant `slowrate` et
`gravity`. Les 25 couples float32 produits sont strictement identiques dans le
test hôte. Les délais, les 50 particules et les tirages aléatoires restent
inchangés.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 768 | 111 688 | −80 |
| RAM statique | 19 108 | 19 108 | stable |
| Taille binaire | 111 772 | 111 692 | −80 |

Le jalon inclut aussi la réduction des boucles PacMan.

```powershell
particle call chicken_turkey SetMode "M:Fireworks,S:8,B:1,"
```

Avant modification, l'essai de 12 secondes ne contenait aucune frame complète
et indiquait 32 608 octets libres. Après modification, une frame de 4 272 803 µs
a été relevée, soit 0,2 FPS, avec le même minimum de 32 608 octets et aucun OOM.
Les fenêtres n'étant pas alignées sur le début d'une frame, cette différence ne
prouve pas à elle seule un facteur d'accélération. Elle confirme que le mode
reste interruptible et stable. La luminosité brute valait `2`, puis le Photon a
été replacé en mode `Off` avec `B:1`.

## Validation

- [x] Les 1 200 octets de particules restent dans le scratch partagé.
- [x] La capacité de 50 particules et les 25 étapes sont conservées.
- [x] Les coefficients float32 avant/après sont identiques sur les 25 étapes.
- [x] Un seul appel `tan()` reste par étape d'explosion.
- [x] La suite complète des 69 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Fireworks est lancé et interrompu à `B:1` sans OOM.
- [ ] Un cycle et l'apparence physique Fireworks sont validés.
- [x] Le Photon est replacé en mode `Off` avec `B:1`.
