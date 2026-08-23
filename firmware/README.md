# Firmware L3D Studio

Firmware actif du cube L3D 8 × 8 × 8 piloté par un Particle Photon. Cette
version conserve la compatibilité Spark Pixels historique tout en ajoutant un
serveur HTTP local, des diagnostics runtime et une architecture découpée par
responsabilité.

L’installation et l’utilisation de l’IHM sont décrites dans
[../app/README.md](../app/README.md).

## Cible et état actuel

- Particle Photon Gen 2 ;
- Device OS 2.3.1 ;
- 512 LED RGB avec pilote NeoPixel local ;
- IDs historiques conservés, avec l'ID 33 réservé après retrait de CubePainter ;
- Particle Cloud toujours disponible ;
- API HTTP locale v1 active par défaut sur le port `8080` ;
- streaming web RGB332 sur `/api/v1/stream/frame` via le mode `Stream` 76 ;
- peinture web RGB332 maintenue sur `/api/v1/painter/frame`, sans EEPROM ;
- VM procédurale L3D, mode interne 77 et stockage transactionnel d'un programme
  de 197 octets sur deux banques EEPROM ;
- aucune allocation dynamique dans le code applicatif actif ;
- animations servies par un ordonnanceur coopératif qui maintient Particle et
  le serveur LAN pendant les attentes historiques.

La compilation Photon 2.3.1 avec la VM, la persistance et ses routes LAN indique
122 688 octets de Flash, 15 228 octets de RAM statique, un binaire de 122 692
octets et 8 384 octets de marge Flash. Les mesures détaillées se trouvent dans
[docs/BYTECODE_BASELINE.md](docs/BYTECODE_BASELINE.md).

## Compilation et tests

Les commandes suivantes s’exécutent depuis la racine du dépôt.

Installer au préalable le CLI Particle, puis créer un fichier `.env.local` non
versionné avec `PARTICLE_TOKEN` ou, en repli, `PARTICLE_USERNAME` et
`PARTICLE_PASSWORD`.

Compiler pour la cible de référence :

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

Le binaire, le journal et les mesures sont produits dans `firmware/build/`.
Le binaire actif se nomme
`l3d-studio-firmware-1.4-photon-2.3.1-bytecode-v1.bin`. Le manifeste
`release.json` contient ses versions, l'état de la VM, ses mesures et son
SHA-256. Les secrets
chargés depuis `.env.local` ne sont ni affichés, ni ajoutés au manifeste.

Exécuter tous les tests hôte :

```powershell
node --test firmware/test/host/*.test.mjs
```

Flasher le binaire déjà compilé :

```powershell
particle flash <nom-ou-id-du-photon> firmware/build/l3d-studio-firmware-1.4-photon-2.3.1-bytecode-v1.bin
```

Toute validation visuelle doit utiliser une luminosité demandée de 1 %, soit
`B:1` dans les commandes Spark Pixels.

## Serveur HTTP local

Le serveur écoute sur le réseau local :

```text
http://<adresse-ip-du-photon>:8080/api/v1
```

Routes de lecture :

```text
GET /health
GET /diagnostics
GET /state
GET /modes
GET /aux-switches
GET /bytecode
GET /bytecode/program
```

Routes qui modifient explicitement l’état :

```text
POST /diagnostics/reset
POST /command
POST /mode
POST /text
POST /stream/frame
POST /painter/frame
POST /bytecode/program
POST /bytecode/delete
POST /bytecode/run
POST /bytecode/stop
```

Le serveur accepte un seul client à la fois, utilise uniquement des buffers
fixes, traite les données progressivement et ferme chaque connexion après sa
réponse. Il prend en charge les preflights CORS et l’en-tête d’accès au réseau
privé requis par certains navigateurs.

Cette première version ne possède ni authentification ni TLS. Elle doit rester
sur un réseau local de confiance et ne doit jamais être exposée par une
redirection de port Internet. Toute machine capable de joindre le port 8080
peut appeler les routes de lecture et de commande. Le détail des risques et des
contraintes des navigateurs figure dans
[docs/LOCAL_API_PROTOCOL.md](docs/LOCAL_API_PROTOCOL.md#sécurité-volontairement-absente).

Vérifier rapidement la santé du serveur :

```powershell
curl.exe -i http://<adresse-ip-du-photon>:8080/api/v1/health
```

Le contrat complet des routes, formats, limites et codes d’erreur est décrit
dans [docs/LOCAL_API_PROTOCOL.md](docs/LOCAL_API_PROTOCOL.md). L’architecture,
les mesures et les commandes de validation se trouvent dans
[docs/LOCAL_API_SERVER.md](docs/LOCAL_API_SERVER.md).

Le format procédural, le stockage transactionnel et les commandes manuelles
sont documentés dans le guide
[docs/BYTECODE_LANGUAGE.md](docs/BYTECODE_LANGUAGE.md), la référence binaire
[docs/BYTECODE_FORMAT.md](docs/BYTECODE_FORMAT.md) et
[docs/BYTECODE_STORAGE_API.md](docs/BYTECODE_STORAGE_API.md).

Le rollback propre à cette fonctionnalité consiste à définir
`L3D_BYTECODE_ENABLED=0`, puis à recompiler et reflasher. Cela retire du binaire
le mode 77, la VM et les routes bytecode sans effacer les banques EEPROM. Ce
rollback est indépendant de `L3D_LOCAL_API_ENABLED=0`, qui retire tout le
serveur LAN. Les deux procédures sont détaillées dans
[docs/BYTECODE_STORAGE_API.md](docs/BYTECODE_STORAGE_API.md#migration-et-rollback).

Le rollback fonctionnel consiste à définir `L3D_LOCAL_API_ENABLED=0` dans
`src/config/build_config.h`, puis à recompiler et flasher normalement. Le
serveur, ses routes et ses buffers sont alors retirés du binaire ; Particle
Cloud, les animations natives, les IDs et l'EEPROM restent inchangés. Ce n'est
pas un retour à une ancienne version du firmware. La procédure complète est
décrite dans
[docs/LOCAL_API_PROTOCOL.md](docs/LOCAL_API_PROTOCOL.md#rollback-fonctionnel).

## Diagnostics

Les mêmes mesures sont accessibles par les deux transports :

- LAN : `GET /api/v1/diagnostics` ;
- Particle : appel `GETDIAG`, puis lecture différée de `deviceInfo` ;
- remise à zéro explicite : route LAN `/diagnostics/reset` ou commande
  Particle `RESETDIAG`.

Les mesures comprennent notamment la mémoire libre et ses minimums, l’uptime,
la durée des frames, les FPS, le mode courant, les connexions Wi-Fi/Particle,
la cause du dernier reset et les événements OOM. Leur format et leurs garanties
sont documentés dans [docs/DIAGNOSTICS.md](docs/DIAGNOSTICS.md).

## Architecture

```text
firmware/
  src/
    animations/   animations ou familles d’animations
    bytecode/     format, validation, stockage et VM procédurale
    cloud/        adaptateurs Particle et métadonnées historiques
    config/       drapeaux de build, limites et IDs stables
    core/         cycle de vie, commandes, ordonnanceur et état partagé
    diagnostics/  instrumentation runtime
    network/      serveur HTTP, parseur et services réseau historiques
    platform/     pilote NeoPixel
    rendering/    framebuffer logique, mapping et primitives
    storage/      persistance EEPROM
  test/host/      tests exécutables sans Photon
  tools/          compilation et mesure reproductibles
  docs/           références techniques et validations
```

Les implémentations restent assemblées en unity build par `src/main.cpp` pour
préserver la compatibilité avec la compilation Particle de cette génération.

## Documentation de référence

### Firmware et mémoire

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) : plan du refactor firmware ;
- [docs/BASELINE.md](docs/BASELINE.md) : mesures Flash, RAM et validations ;
- [docs/SAFETY.md](docs/SAFETY.md) : buffers, pile et validation des commandes ;
- [docs/DYNAMIC_ALLOCATION_REMOVAL.md](docs/DYNAMIC_ALLOCATION_REMOVAL.md) :
  suppression des allocations applicatives ;
- [docs/SHARED_ANIMATION_STATE.md](docs/SHARED_ANIMATION_STATE.md) : état partagé
  entre animations ;
- [docs/SCHEDULER_AND_DISPATCH.md](docs/SCHEDULER_AND_DISPATCH.md) : ordonnanceur
  coopératif et dispatcher.

### Serveur LAN et protocoles

- [LOCAL_SERVER_IMPLEMENTATION_PLAN.md](LOCAL_SERVER_IMPLEMENTATION_PLAN.md) :
  plan et état d’avancement du serveur local ;
- [docs/LOCAL_API_PROTOCOL.md](docs/LOCAL_API_PROTOCOL.md) : contrat HTTP v1 ;
- [docs/LOCAL_API_SERVER.md](docs/LOCAL_API_SERVER.md) : architecture et tests ;
- [docs/COMMAND_TRANSPORT.md](docs/COMMAND_TRANSPORT.md) : séparation entre
  commandes métier, Particle et HTTP ;
- [docs/DIAGNOSTICS.md](docs/DIAGNOSTICS.md) : instrumentation LAN et Particle.
- [docs/WEB_STREAMING.md](docs/WEB_STREAMING.md) : format RGB332, baseline et
  architecture du mode Stream.

### Animations et rendu

- [L3D_BYTECODE_IMPLEMENTATION_PLAN.md](L3D_BYTECODE_IMPLEMENTATION_PLAN.md) :
  plan et état d'avancement des animations installables ;
- [docs/BYTECODE_LANGUAGE.md](docs/BYTECODE_LANGUAGE.md) : tutoriel, exemples,
  opcodes, bornes, fautes et sandbox ;
- [docs/BYTECODE_FORMAT.md](docs/BYTECODE_FORMAT.md) : contrat binaire, CRC et
  versions ;
- [docs/BYTECODE_STORAGE_API.md](docs/BYTECODE_STORAGE_API.md) : banques EEPROM,
  routes LAN, installation et rollback ;
- [docs/INVENTORY.md](docs/INVENTORY.md) : inventaire fonctionnel ;
- [docs/ANIMATION_INDEX.md](docs/ANIMATION_INDEX.md) : IDs, noms et fichiers ;
- [docs/RENDERING_TYPES.md](docs/RENDERING_TYPES.md) : framebuffer, types et
  mapping ;
- [docs/CUBETUBE_IMPORTS.md](docs/CUBETUBE_IMPORTS.md) : animations CubeTube ;
- [docs/GYROPHARE_FR.md](docs/GYROPHARE_FR.md) : animation GyrophareFR ;
- [docs/VISUAL_VALIDATION.md](docs/VISUAL_VALIDATION.md) : contrôles sur le
  cube réel ;
- [docs/ROLLBACK.md](docs/ROLLBACK.md) : retour au firmware stable.
