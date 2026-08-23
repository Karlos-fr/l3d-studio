# Firmware L3D Studio

Firmware du cube L3D 8 × 8 × 8 pour Particle Photon Gen 2, compilé avec
Device OS 2.3.1. Les animations natives, le streaming, la peinture, le bytecode
procédural et les diagnostics sont pilotés par le serveur HTTP local.

Le Photon reste connecté au service système Particle pour la synchronisation de
l'heure et le flash OTA, mais le firmware ne publie aucune `Particle.function`
ni `Particle.variable` applicative.

## Compilation

Créer à la racine un `.env.local` non versionné contenant les identifiants pris
en charge par le script, puis lancer :

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

Le script compile la cible Photon 2.3.1, archive le journal et le binaire dans
`firmware/build/` sans afficher les secrets.

Pour flasher le binaire produit :

```powershell
particle flash <nom-ou-id-du-photon> firmware/build/<binaire>.bin
```

## API locale

Le serveur écoute sur le port `8080`. Il expose notamment :

- santé, état, modes et switches auxiliaires ;
- commandes génériques, changement de mode et texte persistant ;
- diagnostics et remise à zéro des minimums ;
- streaming et peinture RGB332 ;
- installation, lecture, lancement et suppression du bytecode.

Les formats, limites, codes d'erreur et exemples `curl` sont dans
[docs/LOCAL_API_PROTOCOL.md](docs/LOCAL_API_PROTOCOL.md). La désactivation de
`L3D_LOCAL_API_ENABLED` retire le serveur du binaire ; elle constitue le
rollback fonctionnel du serveur, sans restaurer les anciennes API Cloud.

## Architecture

```text
firmware/src/
  animations/   une responsabilité d'animation par module ou famille
  bytecode/     format, stockage EEPROM, validation et VM procédurale
  config/       capacités, tailles et drapeaux de compilation
  core/         état, commandes, ordonnanceur et cycle de vie
  diagnostics/  instrumentation runtime
  network/      serveur HTTP, streaming et parseur borné
  platform/     pilote NeoPixel et adaptation matérielle
  rendering/    framebuffer logique, mapping et primitives
```

Les commandes réseau sont validées dans des buffers statiques. Le chemin de
rendu n'utilise ni `String`, ni allocation dynamique applicative.

## Vérification

```powershell
npm test -- --run
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

Toute validation visuelle sur le cube doit utiliser une luminosité de `1 %`.
Voir aussi [docs/DIAGNOSTICS.md](docs/DIAGNOSTICS.md),
[docs/WEB_STREAMING.md](docs/WEB_STREAMING.md) et
[docs/BYTECODE_LANGUAGE.md](docs/BYTECODE_LANGUAGE.md).
