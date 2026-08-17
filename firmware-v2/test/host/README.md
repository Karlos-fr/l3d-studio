# Tests hôte du firmware

Ce dossier accueillera les tests exécutables sans Photon. Pendant la phase 0,
les fixtures réelles sont conservées dans `../fixtures/protocol-fixtures.json`.

Les premières cibles de tests après le découpage mécanique seront :

- parsing des segments `SetMode` ;
- validation des commandes `FnRouter` ;
- mapping logique `x,y,z` vers index LED ;
- compatibilité des listes de modes ;
- validation des bornes CubePainter ;
- migration du layout EEPROM.

Aucun framework de test C++ n'est ajouté pendant la baseline afin de ne pas
modifier la compilation Particle de référence.

À partir de la phase 3, les contrats de sécurité indépendants du hardware sont
testés avec le runner `node:test` fourni par Node.js :

```powershell
node --test firmware-v2/test/host/*.test.mjs
```

Ces tests couvrent les fixtures historiques, les commandes vides, maximales,
tronquées et malformées, les bornes CubePainter, les invariants statiques des
buffers partagés, le mapping des 512 voxels et les comparaisons numériques de
phase 4. La compilation cloud reste le test autoritatif du C++ Particle.
