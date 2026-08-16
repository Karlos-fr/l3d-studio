# Plan de realisation - L3D Studio

Objectif : creer une application TypeScript simple, sans React, pour remplacer l'ancienne application Android Spark Pixels et piloter un cube L3D 8x8x8 via Particle Photon et le firmware existant `SparkPixelsMega`.

## Contraintes de depart

- L'application doit fonctionner avec le firmware existant avant toute modification du Photon.
- L'ancienne app Android n'est plus une reference API fiable : elle utilise l'ancien domaine `api.spark.io` et passe le token dans l'URL.
- La cible moderne doit utiliser l'API Particle Cloud actuelle, avec le domaine `api.particle.io` et un header `Authorization: Bearer <token>`.
- L'application doit rester minimale : Vite, TypeScript, HTML, CSS, tests Vitest.
- Aucun backend au depart. Le token Particle est fourni par l'utilisateur et stocke localement dans le navigateur.

## Phase 1 - Analyse fonctionnelle et protocole firmware

### Taches

- Lire et documenter les fonctions Particle declarees par `SparkPixelsMega`.
- Lire et documenter les variables Particle declarees par `SparkPixelsMega`.
- Identifier les commandes acceptees par `SetMode`.
- Identifier les commandes acceptees par `Function` / `FnRouter`.
- Identifier le role exact de `SetText` et `CubePainter`.
- Comparer le comportement attendu par l'ancienne app Android avec le firmware L3D actuel.
- Produire une table de compatibilite :
  - nom de variable Particle
  - type de valeur retournee
  - usage dans l'interface
  - endpoint Particle associe

### Livrables

- `docs/firmware-protocol.md`
- Liste des commandes supportees :
  - mode
  - vitesse
  - luminosite
  - couleurs
  - texte
  - interrupteurs auxiliaires

## Phase 2 - Validation de l'API Particle actuelle

### Taches

- Verifier les endpoints Particle Cloud actuels.
- Tester manuellement la lecture des devices avec un token Particle.
- Tester manuellement la lecture d'une variable, par exemple `mode`.
- Tester manuellement l'appel de `SetMode`.
- Confirmer le format attendu du body pour les fonctions Particle :
  - `arg=<commande>` si requis par l'API actuelle
  - ou `params=<commande>` si encore accepte
- Verifier les erreurs possibles :
  - token invalide
  - device offline
  - variable inconnue
  - fonction inconnue
  - timeout Photon

### Livrables

- `docs/particle-cloud-api.md`
- Commandes `curl` de reference validees.
- Decision documentee sur le format exact des appels POST.

## Phase 3 - Initialisation de l'application TypeScript

### Taches

- Creer un projet Vite TypeScript minimal.
- Ajouter une structure de dossiers simple.
- Ajouter un CSS global.
- Ajouter Vitest pour les tests unitaires.
- Ajouter des scripts npm :
  - `dev`
  - `build`
  - `test`
  - `preview`
- Verifier que l'application demarre localement.

### Structure cible

```text
src/
  main.ts
  styles.css
  particle/
    client.ts
    types.ts
  sparkpixels/
    protocol.ts
    parsers.ts
    types.ts
  ui/
    render.ts
    events.ts
    state.ts
```

### Livrables

- Application Vite fonctionnelle.
- Page vide ou minimale chargee dans le navigateur.
- Build TypeScript valide.

## Phase 4 - Client Particle Cloud

### Taches

- Implementer un client HTTP Particle minimal.
- Centraliser la configuration :
  - base URL `https://api.particle.io/v1`
  - token utilisateur
  - device selectionne
- Implementer :
  - `listDevices()`
  - `getDevice(deviceId)`
  - `getVariable(deviceId, variableName)`
  - `callFunction(deviceId, functionName, command)`
- Ajouter une gestion d'erreurs lisible.
- Ajouter des tests avec fetch mocke.

### Livrables

- `src/particle/client.ts`
- `src/particle/types.ts`
- Tests unitaires du client Particle.

## Phase 5 - Protocole Spark Pixels

### Taches

- Implementer le generateur de commande `SetMode`.
- Implementer le parsing de `modeList`.
- Implementer le parsing de `modeParmList`.
- Implementer le parsing de `auxSwtchList`.
- Convertir la luminosite :
  - app : `0..100`
  - firmware : conversion interne vers `1..255`
- Convertir la vitesse :
  - app : index `0..8`
  - firmware : presets internes
- Gerer les couleurs en hex RGB `RRGGBB`.
- Ajouter des tests sur les cas reels issus du firmware.

### Exemples de commandes

```text
M:ColorAll,S:4,B:80,C1:FF0000,
S:4,B:80,
M:Text,S:4,B:80,C1:FFFFFF,C2:000000,W:HELLO,
SETAUXSWITCH:1,0;
```

### Livrables

- `src/sparkpixels/protocol.ts`
- `src/sparkpixels/parsers.ts`
- Tests unitaires couvrant les commandes principales.

## Phase 6 - Interface MVP

### Taches

- Creer un ecran de configuration du token Particle.
- Creer une liste des devices.
- Permettre la selection du Photon associe au cube.
- Lire l'etat initial :
  - mode courant
  - luminosite
  - vitesse
  - liste des modes
  - parametres des modes
- Afficher les modes disponibles.
- Afficher les controles du mode selectionne :
  - couleurs necessaires
  - switches si disponibles
  - texte si disponible
- Ajouter les sliders :
  - luminosite
  - vitesse
- Ajouter un bouton d'envoi de commande.
- Afficher le dernier retour Particle.

### Livrables

- Interface utilisable pour choisir un mode et l'envoyer au cube.
- Etat sauvegarde en `localStorage` :
  - token
  - device selectionne
  - derniers reglages locaux

## Phase 7 - Robustesse et ergonomie

### Taches

- Ajouter des messages clairs pour :
  - token manquant
  - token invalide
  - cube offline
  - appel Particle echoue
  - commande refusee par le firmware
- Ajouter un bouton de rafraichissement de l'etat.
- Ajouter un indicateur online/offline du device.
- Eviter les appels API inutiles pendant le deplacement des sliders.
- Envoyer luminosite/vitesse seulement au relachement du slider ou via bouton explicite.
- Ajouter une protection contre les commandes incompletes.

### Livrables

- UX stable pour un usage quotidien.
- Pas d'envoi accidentel en boucle vers Particle Cloud.

## Phase 8 - Fonctions avancees du firmware

### Taches

- Ajouter le support complet de `FnRouter`.
- Ajouter la gestion des interrupteurs auxiliaires.
- Ajouter le mode texte.
- Etudier `CubePainter`.
- Decider si `CubePainter` doit etre expose dans le MVP ou dans une version ulterieure.
- Ajouter une page "Device Info" utilisant `deviceInfo`, `wifi`, `debug`, etc.

### Livrables

- Controle des switches globaux.
- Controle du mode texte.
- Documentation des limites restantes.

## Phase 9 - Packaging et deploiement

### Taches

- Verifier le build statique.
- Ajouter une documentation utilisateur courte.
- Documenter comment obtenir un token Particle.
- Documenter comment trouver le device ID du Photon.
- Documenter les limites de securite :
  - le token donne acces au compte Particle
  - ne pas publier le token
  - ne pas committer de token
- Choisir le mode de distribution :
  - app locale lancee par `npm run dev`
  - build statique
  - GitHub Pages

### Livrables

- `README.md` mis a jour.
- Build statique deployable.

## Phase 10 - Option future : API locale sans Particle Cloud

### Taches

- Evaluer la faisabilite d'un fork du firmware.
- Identifier les contraintes reseau du Photon.
- Ajouter une API locale HTTP, TCP, UDP ou WebSocket si realiste.
- Conserver le protocole applicatif TypeScript existant.
- Ajouter un second transport :
  - `ParticleCloudTransport`
  - `LocalPhotonTransport`
- Permettre a l'utilisateur de choisir le transport dans l'interface.

### Livrables

- Decision technique documentee.
- Prototype local si le firmware le permet.

## Definition du MVP

Le MVP est termine quand :

- L'utilisateur peut renseigner son token Particle.
- L'application liste les devices Particle accessibles.
- L'utilisateur peut choisir le Photon du cube.
- L'application lit le mode courant, la luminosite, la vitesse et la liste des modes.
- L'utilisateur peut selectionner un mode.
- L'utilisateur peut choisir luminosite, vitesse et couleurs.
- L'application envoie une commande `SetMode` valide au firmware `SparkPixelsMega`.
- Les erreurs courantes sont affichees clairement.
- Les fonctions de parsing et de generation de commandes sont couvertes par des tests unitaires.

## Ordre de priorite

1. Valider l'API Particle Cloud actuelle avec `curl`.
2. Coder le client Particle.
3. Coder le protocole Spark Pixels.
4. Construire l'interface MVP.
5. Ajouter les fonctions avancees.
6. Envisager le firmware local seulement apres avoir remplace l'app Android via Cloud.
