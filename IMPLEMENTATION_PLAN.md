# Plan de realisation - L3D Studio

Objectif : creer une application TypeScript simple, sans React, pour remplacer l'ancienne application Android Spark Pixels et piloter un cube L3D 8x8x8 via Particle Photon et le firmware existant `SparkPixelsMega`.

## Contraintes de depart

- L'application doit fonctionner avec le firmware existant avant toute modification du Photon.
- L'ancienne app Android n'est plus une reference API fiable : elle utilise l'ancien domaine `api.spark.io` et passe le token dans l'URL.
- La cible moderne doit utiliser l'API Particle Cloud actuelle, avec le domaine `api.particle.io` et un header `Authorization: Bearer <token>`.
- L'application doit rester minimale : Vite, TypeScript, HTML, CSS, tests Vitest.
- Aucun backend au depart. L'utilisateur s'authentifie avec son login et son mot de passe Particle, puis l'application recupere un token Particle.
- L'authentification doit etre revalidee avec l'API Particle actuelle, notamment en cas de MFA active ou de changement des regles OAuth.

## Phase 1 - Analyse fonctionnelle et protocole firmware

### Taches

- [x] Lire et documenter les fonctions Particle declarees par `SparkPixelsMega`.
- [x] Lire et documenter les variables Particle declarees par `SparkPixelsMega`.
- [x] Identifier les commandes acceptees par `SetMode`.
- [x] Identifier les commandes acceptees par `Function` / `FnRouter`.
- [x] Identifier le role exact de `SetText` et `CubePainter`.
- [x] Comparer le comportement attendu par l'ancienne app Android avec le firmware L3D actuel.
- [x] Produire une table de compatibilite :
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

- [x] Verifier les endpoints Particle Cloud actuels.
- [x] Tester manuellement la creation d'un token avec login et mot de passe Particle.
- [ ] Verifier le comportement avec un compte Particle utilisant MFA.
- [x] Verifier si le client OAuth `particle:particle` est encore utilisable pour une app installee.
- [x] Identifier les limites de securite d'un flux login/mot de passe depuis une app navigateur sans backend.
- [x] Tester manuellement la lecture des devices avec le token obtenu.
- [ ] Tester manuellement la lecture d'une variable, par exemple `mode`.
- [ ] Tester manuellement l'appel de `SetMode`.
- [x] Confirmer le format attendu du body pour les fonctions Particle :
  - `arg=<commande>` si requis par l'API actuelle
  - `params=<commande>` est l'ancien nom utilise par l'app Android et ne doit pas etre repris pour le nouveau client
- [x] Verifier les erreurs possibles :
  - identifiants invalides
  - MFA requise
  - token invalide
  - token expire
  - device offline
  - variable inconnue
  - fonction inconnue
  - timeout Photon

### Etat de validation

- Validation documentaire terminee dans `docs/particle-cloud-api.md`.
- Validation reseau non authentifiee terminee : Particle repond sur les endpoints actuels et retourne `invalid_request` sans token.
- Validation authentifiee partielle terminee : login Particle, creation de token et liste des devices fonctionnent.
- Le compte teste ne declenche pas MFA ; le comportement d'un compte avec MFA activee reste a valider.
- Lecture de variable et appel `SetMode` testes mais non valides fonctionnellement : le Photon cible est actuellement offline et Particle retourne `Timed out`.

### Livrables

- `docs/particle-cloud-api.md`
- Flux d'authentification documente.
- Commandes `curl` de reference validees.
- Decision documentee sur le format exact des appels POST.

## Phase 3 - Initialisation de l'application TypeScript

### Taches

- [x] Creer un projet Vite TypeScript minimal.
- [x] Ajouter une structure de dossiers simple.
- [x] Ajouter un CSS global.
- [x] Ajouter Vitest pour les tests unitaires.
- [x] Ajouter des scripts npm :
  - `dev`
  - `build`
  - `test`
  - `preview`
- [ ] Verifier que l'application demarre localement.

### Etat de validation

- Initialisation Vite, TypeScript et Vitest terminee.
- Les dependances sont gardees sur des versions modernes sans vulnerabilite connue par `npm audit` au moment de l'installation :
  - `vite@8.2.1`
  - `vitest@4.1.10`
  - `typescript@5.9.2`
- `npm install` fonctionne avec un Node portable local.
- `npm run test` et `npm run build` ne peuvent pas etre valides dans cet environnement : Vite/Vitest declenchent une erreur WebAssembly `Out of memory`, connue comme une contrainte memoire environnementale.
- Le demarrage local et le build devront etre revalides sur une machine Node standard.

### Structure cible

```text
app/src/
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

- [x] Application Vite initialisee.
- [x] Page vide ou minimale definie dans le code source.
- [ ] Page minimale chargee dans le navigateur.
- [ ] Build TypeScript/Vite valide sur une machine Node standard.

## Phase 4 - Client Particle Cloud

### Taches

- [x] Implementer un client HTTP Particle minimal.
- [x] Centraliser la configuration :
  - base URL `https://api.particle.io/v1`
  - token utilisateur obtenu apres login Particle
  - device selectionne
- [x] Implementer l'authentification :
  - `login(email, password)`
  - stockage local du token
  - lecture du token courant au demarrage
  - suppression du token a la deconnexion
- [x] Implementer :
  - `listDevices()`
  - `getDevice(deviceId)`
  - `getVariable(deviceId, variableName)`
  - `callFunction(deviceId, functionName, command)`
- [x] Ajouter une gestion d'erreurs lisible.
- [x] Ajouter des tests avec fetch mocke.

### Etat de validation

- `app/src/particle/client.ts` implemente le transport Particle Cloud avec `arg=<commande>` pour les fonctions.
- `app/src/particle/session.ts` gere le stockage local du token, du refresh token et du device selectionne sans stocker le mot de passe.
- Les tests unitaires de contrat sont ajoutes dans `app/src/particle/client.test.ts` et `app/src/particle/session.test.ts`.
- `npx tsc --noEmit` passe dans l'environnement courant.
- `npm audit --audit-level=moderate` passe avec `0 vulnerabilities`.
- `npm run test` reste non executable dans cet environnement a cause de la limite memoire WebAssembly deja documentee en phase 3.

### Livrables

- [x] `app/src/particle/client.ts`
- [x] `app/src/particle/types.ts`
- [x] `app/src/particle/session.ts`
- [x] Tests unitaires du client Particle.

## Phase 5 - Protocole Spark Pixels

### Taches

- [x] Implementer le generateur de commande `SetMode`.
- [x] Implementer le parsing de `modeList`.
- [x] Implementer le parsing de `modeParmList`.
- [x] Implementer le parsing de `auxSwtchList`.
- [x] Convertir la luminosite :
  - app : `0..100`
  - firmware : conversion interne vers `1..255`
- [x] Convertir la vitesse :
  - app : index `0..8`
  - firmware : presets internes
- [x] Gerer les couleurs en hex RGB `RRGGBB`.
- [x] Ajouter des tests sur les cas reels issus du firmware.

### Etat de validation

- `app/src/sparkpixels/protocol.ts` construit les commandes `SetMode` et `SETAUXSWITCH`.
- `app/src/sparkpixels/parsers.ts` parse `modeList`, `modeParmList`, `auxSwtchList` et fusionne les definitions de modes.
- `app/src/sparkpixels/types.ts` decrit les modes, parametres, interrupteurs auxiliaires et options de commande.
- Les tests unitaires de contrat sont ajoutes dans `app/src/sparkpixels/protocol.test.ts` et `app/src/sparkpixels/parsers.test.ts`.
- `npx tsc --noEmit` passe dans l'environnement courant.
- `npm audit --audit-level=moderate` passe avec `0 vulnerabilities`.
- `npm run test` reste non executable dans cet environnement a cause de la limite memoire WebAssembly deja documentee.

### Exemples de commandes

```text
M:ColorAll,S:4,B:80,C1:FF0000,
S:4,B:80,
M:Text,S:4,B:80,C1:FFFFFF,C2:000000,W:HELLO,
SETAUXSWITCH:1,0;
```

### Livrables

- [x] `app/src/sparkpixels/protocol.ts`
- [x] `app/src/sparkpixels/parsers.ts`
- [x] `app/src/sparkpixels/types.ts`
- [x] Tests unitaires couvrant les commandes principales.

## Phase 6 - Interface MVP

### Taches

- [x] Creer un ecran de connexion Particle :
  - email/login
  - mot de passe
  - bouton connexion
  - message d'erreur explicite
- [x] Stocker le token obtenu localement apres connexion.
- [x] Ajouter une action de deconnexion qui supprime le token local.
- [x] Creer une liste des devices.
- [x] Permettre la selection du Photon associe au cube.
- [x] Lire l'etat initial :
  - mode courant
  - luminosite
  - vitesse
  - liste des modes
  - parametres des modes
- [x] Afficher les modes disponibles.
- [x] Afficher les controles du mode selectionne :
  - couleurs necessaires
  - switches si disponibles
  - texte si disponible
- [x] Ajouter les sliders :
  - luminosite
  - vitesse
- [x] Ajouter un bouton d'envoi de commande.
- [x] Afficher le dernier retour Particle.

### Etat de validation

- `app/src/ui/state.ts` porte l'etat applicatif du MVP.
- `app/src/ui/render.ts` rend la connexion Particle, les devices, l'etat du cube et les controles de mode.
- `app/src/ui/events.ts` branche login, deconnexion, rafraichissement devices, lecture firmware et envoi `SetMode`.
- `app/src/ui/preferences.ts` sauvegarde les derniers reglages locaux dans `localStorage`.
- `app/src/main.ts` charge la session locale et hydrate les devices quand un token existe.
- `npx tsc --noEmit` passe dans l'environnement courant.
- `npm audit --audit-level=moderate` passe avec `0 vulnerabilities`.
- Le lancement navigateur avec Vite reste non valide dans cet environnement a cause de la limite memoire WebAssembly deja documentee.

### Livrables

- [x] Interface implementee pour choisir un mode et l'envoyer au cube.
- [x] Etat sauvegarde en `localStorage` :
  - token obtenu apres authentification
  - device selectionne
  - derniers reglages locaux

## Phase 7 - Robustesse et ergonomie

### Taches

- [x] Ajouter des messages clairs pour :
  - [x] utilisateur non connecte
  - [x] identifiants invalides
  - [x] MFA requise ou non supportee
  - [x] token invalide
  - [x] token expire
  - [x] cube offline
  - [x] appel Particle echoue
  - [x] commande refusee par le firmware
- [x] Ajouter un bouton de rafraichissement de l'etat.
- [x] Ajouter un indicateur online/offline du device.
- [x] Eviter les appels API inutiles pendant le deplacement des sliders.
- [x] Envoyer luminosite/vitesse seulement via bouton explicite.
- [x] Ajouter une protection contre les commandes incompletes.

### Etat de validation

- Les erreurs Particle courantes sont traduites en messages utilisateur dans `app/src/ui/events.ts`.
- Les sessions expirees ou refusees par Particle sont supprimees localement et forcent une reconnexion.
- Les boutons d'action sont bloques pendant une action asynchrone.
- La lecture firmware et l'envoi `SetMode` sont bloques quand aucun Photon online n'est selectionne.
- Le rendu affiche un indicateur online/offline et explique pourquoi une commande ne peut pas partir.
- Les sliders et champs locaux ne declenchent aucun appel Particle ; seul le bouton d'envoi transmet la commande.
- `npx tsc --noEmit` passe dans l'environnement courant.
- `npm audit --audit-level=moderate` passe avec `0 vulnerabilities`.
- `npm run test` reste non executable dans cet environnement a cause de la limite memoire WebAssembly deja documentee.

### Livrables

- [x] UX stable pour un usage quotidien.
- [x] Pas d'envoi accidentel en boucle vers Particle Cloud.

## Phase 8 - Fonctions avancees du firmware

### Taches

- [x] Ajouter le support complet de `FnRouter`.
- [x] Ajouter la gestion des interrupteurs auxiliaires.
- [x] Ajouter le mode texte.
- [x] Etudier `CubePainter`.
- [x] Decider si `CubePainter` doit etre expose dans le MVP ou dans une version ulterieure.
- [x] Ajouter une page "Device Info" utilisant `deviceInfo`, `wifi`, `debug`, etc.

### Etat de validation

- `app/src/sparkpixels/protocol.ts` construit les commandes `GETSWITCHSTATE`, `GETCOLOR`, `SETTIMEZONE`, `SETAUXSWITCH` et `REBOOT`.
- `app/src/sparkpixels/parsers.ts` parse `auxSwtchList` et `deviceInfo`.
- `app/src/ui/render.ts` affiche les switches globaux, `SetText`, les commandes FnRouter et le panneau `Device Info`.
- `app/src/ui/events.ts` appelle la fonction Particle `Function` pour FnRouter et `SetText` pour le texte persistant.
- `CubePainter` reste hors MVP : la fonction ne repond que si le mode courant est `CubePainter`, manipule un buffer 8x8x8 et demande une UI 3D dediee pour eviter des commandes voxel accidentelles.
- `npx tsc --noEmit` passe dans l'environnement courant.
- `npm audit --audit-level=moderate` passe avec `0 vulnerabilities`.
- `npm run test` reste non executable dans cet environnement a cause de la limite memoire WebAssembly deja documentee.

### Livrables

- [x] Controle des switches globaux.
- [x] Controle du mode texte.
- [x] Documentation des limites restantes.

## Phase 9 - Packaging et deploiement

### Taches

- [x] Verifier le build statique.
- [x] Ajouter une documentation utilisateur courte.
- [ ] Documenter comment se connecter avec un compte Particle.
- [ ] Documenter comment trouver le device ID du Photon.
- [ ] Documenter les limites de securite :
  - [x] le mot de passe Particle ne doit jamais etre stocke
  - [x] le token donne acces au compte Particle
  - [x] ne pas publier le token
  - [x] ne pas committer de token
  - [x] eviter d'utiliser l'application depuis une machine non fiable
- [x] Choisir le mode de distribution :
  - [ ] app locale lancee par `npm run dev`
  - [x] build statique
  - [x] GitHub Pages

### Etat de validation

- `vite.config.ts` utilise le chemin public `/l3d-studio/` attendu par GitHub Pages.
- `.github/workflows/pages.yml` construit l'application avec `npm ci` puis `npm run build`.
- Le build local reste bloque par l'erreur WebAssembly `Out of memory` deja documentee ; la validation du build statique est confiee au runner GitHub Actions.
- GitHub Actions a valide le build et le deploiement Pages.
- GitHub Pages est configure pour deployer l'artefact `dist` depuis GitHub Actions.
- Le repository est public pour rendre la page accessible.
- URL de deploiement : `https://karlos-fr.github.io/l3d-studio/`.

### Livrables

- [x] `README.md` mis a jour.
- [x] Build statique deployable.

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

- L'utilisateur peut se connecter avec son compte Particle.
- L'application recupere et stocke localement un token Particle.
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
