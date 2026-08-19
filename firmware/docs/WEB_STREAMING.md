# Streaming web RGB332

## Reference historique

Le premier protocole web reprend uniquement le format de frame de
[L3D-Library](https://github.com/enjrolas/L3D-Library/tree/master/L3D), et plus
precisement `src/L3D/Streaming.java`. La methode historique
`Streaming.serializeCube()` parcourt le cube dans cet ordre exact :

```text
for z
  for y
    for x
```

Chaque voxel devient un octet `RRR GGG BB` avec la formule historique :

```text
(red & 0xE0) | ((green & 0xE0) >> 3) | ((blue & 0xC0) >> 6)
```

Le datagramme UDP historique est remplace par un corps HTTP pour rester
accessible a l'API `fetch` du navigateur. L'ordre des voxels et la compression
RGB332 restent identiques.

## Baseline du 19 aout 2026

Mesures avant ajout du streaming :

| Mesure | Valeur |
| --- | ---: |
| Flash | 117 608 octets |
| RAM statique | 15 196 octets |
| Memoire libre runtime | 33 936 octets |
| Minimum runtime observe | 30 608 octets |
| Longueur des noms avec `Stream` | 620 caracteres |
| Longueur des parametres avec `Stream` | 579 caracteres |

Cent appels sequentiels a `/api/v1/health` ont ete mesures depuis la machine
locale avec l'API `fetch`, le navigateur integre n'etant pas disponible dans la
session de validation : minimum 120,34 ms, mediane 122,91 ms, moyenne 127,41 ms,
p95 135,02 ms et maximum 296,96 ms. Cette mesure concerne le firmware stable
executant une animation native. La cadence utile du mode Stream doit etre
mesuree sur le cube en phase 5, car ce mode ne contient aucune temporisation
d'animation.

Apres les phases 1 et 2, la compilation Photon Device OS 2.3.1 mesure :

| Mesure | Valeur | Ecart |
| --- | ---: | ---: |
| Flash | 118 296 octets | +688 |
| RAM statique | 15 204 octets | +8 |
| Marge Flash | 12 776 octets | -688 |

## Architecture retenue

- Le mode public `Stream` utilise l'ID stable 76.
- `Listener` 18 et son recepteur TPM2.net restent archives et desactives.
- Le serveur HTTP existant recoit exactement 512 octets.
- Son buffer de corps de 623 octets est reutilise directement ; aucun second
  buffer permanent de frame n'est reserve.
- Le firmware decode une frame complete vers les primitives logiques, puis
  appelle `showPixels()` une seule fois.
- Pendant cet affichage, le verrou LAN interdit de router recursivement la
  requete encore active lorsque `showPixels()` coopere avec les services.
- Le navigateur ne conserve qu'un POST actif. Une frame calculee pendant cet
  envoi est abandonnee, jamais mise en file.
- Apres trois secondes sans frame valide, le firmware efface le cube et revient
  au mode `Off`.

Le contrat HTTP detaille et ses erreurs se trouvent dans
[LOCAL_API_PROTOCOL.md](LOCAL_API_PROTOCOL.md).
