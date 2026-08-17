# Procédure de rollback vers Spark Pixels Mega 1.4

## Préconditions

- Photon alimenté de manière stable ;
- CLI Particle authentifié ;
- Device OS 2.3.1 conservé ;
- source stable et pilote NeoPixel corrigé disponibles dans le dépôt ;
- aucune commande contenant un secret enregistrée dans un journal versionné.

## Construire le binaire stable

Assembler dans un dossier temporaire :

```text
SparkPixelsMega.ino
neopixel/neopixel.cpp
neopixel/neopixel.h
```

Puis compiler :

```powershell
particle compile photon <dossier-temporaire> --target 2.3.1 --saveTo SparkPixelsMega-1.4.bin
```

Les mesures attendues sont :

```text
Flash : 114328
RAM   : 39852
```

## Rollback OTA

Quand le Photon est en ligne :

```powershell
particle flash <nom-ou-id-du-device> SparkPixelsMega-1.4.bin
```

- [x] Attendre la fin complète du flash OTA.
- [x] Attendre que le Photon revienne en ligne dans Particle Cloud.
- [x] Vérifier `deviceInfo`, `modeList` et le mode courant.
- [x] Envoyer la commande `ColorAll` de référence via le protocole Cloud.

## Rollback USB

Si le Photon ne revient pas en ligne :

- [ ] Connecter le Photon directement en USB.
- [ ] Passer le Photon en mode DFU, clignotement jaune.
- [ ] Exécuter `particle flash --usb SparkPixelsMega-1.4.bin`.
- [ ] Attendre le redémarrage et la reconnexion Cloud.
- [ ] Revalider une commande simple depuis L3D Studio.

## Données persistantes

Le firmware baseline et `firmware` utilisent encore le même layout EEPROM.
Un flash applicatif ne doit donc pas effacer les réglages. Ne pas lancer
`EEPROM.clear()` pendant un rollback normal.

## État de validation

Rollback OTA exécuté le 2026-08-17 sur `chicken_turkey` :

- compilation de Spark Pixels Mega 1.4 pour Device OS 2.3.1 ;
- mesures conformes : 114 328 octets de Flash et 39 852 octets de RAM statique ;
- retour en ligne confirmé ;
- `Firmware Rev` 1.4 et `Particle Build Version` 2.3.1 confirmés ;
- `modeList` identique à la fixture ;
- commande `ColorAll` acceptée avec l'ID 2 et mode courant confirmé.

Le rollback USB n'a pas été exécuté, l'appareil ayant retrouvé normalement sa
connexion Cloud.
