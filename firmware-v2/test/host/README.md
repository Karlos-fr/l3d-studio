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
