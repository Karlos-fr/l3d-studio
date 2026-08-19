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
- IDs, noms de modes et commandes Spark Pixels historiques conservés ;
- Particle Cloud toujours disponible ;
- API HTTP locale v1 active par défaut sur le port `8080` ;
- aucune allocation dynamique dans le code applicatif actif ;
- animations servies par un ordonnanceur coopératif qui maintient Particle et
  le serveur LAN pendant les attentes historiques.

La dernière mesure du serveur complet indique 117 608 octets de Flash, 15 196
octets de RAM statique et 13 464 octets de marge Flash. Le détail et les
comparaisons se trouvent dans [docs/BASELINE.md](docs/BASELINE.md).

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
Les secrets chargés depuis `.env.local` ne sont pas affichés.

Exécuter tous les tests hôte :

```powershell
node --test firmware/test/host/*.test.mjs
```

Flasher le binaire déjà compilé :

```powershell
particle flash <nom-ou-id-du-photon> firmware/build/l3d-studio-photon-2.3.1.bin
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
```

Routes qui modifient explicitement l’état :

```text
POST /diagnostics/reset
POST /command
POST /mode
POST /text
POST /cube-painter
```

Le serveur accepte un seul client à la fois, utilise uniquement des buffers
fixes, traite les données progressivement et ferme chaque connexion après sa
réponse. Il prend en charge les preflights CORS et l’en-tête d’accès au réseau
privé requis par certains navigateurs.

Cette première version ne possède ni authentification ni TLS. Elle doit rester
sur un réseau local de confiance et ne doit jamais être exposée par une
redirection de port Internet.

Vérifier rapidement la santé du serveur :

```powershell
curl.exe -i http://<adresse-ip-du-photon>:8080/api/v1/health
```

Le contrat complet des routes, formats, limites et codes d’erreur est décrit
dans [docs/LOCAL_API_PROTOCOL.md](docs/LOCAL_API_PROTOCOL.md). L’architecture,
les mesures et les commandes de validation se trouvent dans
[docs/LOCAL_API_SERVER.md](docs/LOCAL_API_SERVER.md).

Le serveur peut être retiré du binaire en définissant
`L3D_LOCAL_API_ENABLED=0` dans `src/config/build_config.h`. Particle Cloud reste
alors disponible.

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

### Animations et rendu

- [docs/INVENTORY.md](docs/INVENTORY.md) : inventaire fonctionnel ;
- [docs/ANIMATION_INDEX.md](docs/ANIMATION_INDEX.md) : IDs, noms et fichiers ;
- [docs/RENDERING_TYPES.md](docs/RENDERING_TYPES.md) : framebuffer, types et
  mapping ;
- [docs/CUBETUBE_IMPORTS.md](docs/CUBETUBE_IMPORTS.md) : animations CubeTube ;
- [docs/GYROPHARE_FR.md](docs/GYROPHARE_FR.md) : animation GyrophareFR ;
- [docs/VISUAL_VALIDATION.md](docs/VISUAL_VALIDATION.md) : contrôles sur le
  cube réel ;
- [docs/ROLLBACK.md](docs/ROLLBACK.md) : retour au firmware stable.
