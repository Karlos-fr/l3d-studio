# Journal des changements

Ce document recense les changements notables de L3D Studio depuis la création
du dépôt. Le projet ne possède pas encore de tags de version publiés : les
jalons ci-dessous suivent donc les dates et les commits Git.

## Non publié

### Aperçu 3D du streaming

- Transparence de tous les voxels afin de laisser apparaître les lumières
  situées derrière les cubes de premier plan.
- Mise en cache de la projection et du tri des 512 voxels entre les frames,
  mutualisation des calculs trigonométriques et suppression des allocations RGB
  temporaires.
- Limitation raisonnable de la densité Canvas sur les écrans HiDPI et retrait
  des ombres et contours recalculés pour chaque face.
- Remplacement des 1 536 tracés polygonaux par frame par des sprites RGB332
  réutilisables, avec cœur lumineux et halo radial précalculé pour chaque LED.
- Retrait de l'indicateur décoratif à quatre points des vues 3D et par couches.
- Extension du plein écran à toute la colonne d'aperçu afin de conserver les
  onglets Vue 3D et Couches z pendant la peinture sur les différentes coupes.
- Redessin du Canvas après les transitions plein écran pour garder coordonnées
  et pixels alignés, et dimensionnement sans plafond des huit grandes grilles.
- Doublement de la définition des sprites LED et densité Canvas 3D renforcée
  uniquement en plein écran pour des cubes plus nets sans perdre la fluidité.
- Passage des sprites LED à 192 × 192, suréchantillonnage plein écran à 1,5×
  minimum et recentrage vertical empêchant de rogner le haut des halos.

### Refonte de l'écran Cube

- Recentrage du panneau de connexion, remplacement de la fermeture textuelle
  par un SVG et fusion de **Tester le LAN** avec **Lire le cube** dans une
  action unique **Connexion**.
- Retrait de l'entrée Connexion de la barre latérale, ajout de son icône dans
  l'état LAN de l'en-tête et option de connexion automatique persistée dans le
  navigateur.
- Regroupement sur une ligne de l'adresse, du port, de la connexion automatique
  et du bouton Connexion/Déconnexion, avec une aide contextuelle non permanente.
- Ajout de la version Device OS dans le bandeau de l'écran Cube et retrait du
  message de connexion technique sous le formulaire LAN.
- Séparation des animations embarquées dans un espace dédié placé après Cube.
- Centrage des quatre indicateurs Mode, Luminosité, Vitesse et RSSI avec des
  pictogrammes SVG colorés.
- Ajout d'un bandeau affichant le statut synthétique, la révision du firmware
  et l'uptime du Photon.
- Extension additive de `GET /api/v1/state` avec le moteur de rendu courant
  (`native`, `streaming`, `painting` ou `procedural`) et le RSSI local.
- Lecture conjointe de `/state` et `/health` par L3D Studio afin de conserver
  le mode, la version, Device OS, l'uptime et les états de connexion.
- Compilation Photon 2.3.1 validée à 120 752 octets de Flash, 14 596 octets de
  RAM statique et 10 320 octets de marge Flash, soit +192 octets de Flash et
  aucune RAM statique supplémentaire.

### Pilotage applicatif exclusivement par le LAN

- Suppression des fonctions et variables applicatives publiées sur Particle.
- Suppression du client Cloud, de la session, du choix de device et des
  transports Particle/Automatique dans L3D Studio.
- Suppression du chemin Particle des diagnostics et du buffer `deviceInfo`.
- Conservation de la connexion système Particle uniquement pour Device OS, la
  synchronisation horaire et le flash OTA.
- Mise à jour des tests et de la documentation autour de l'API LAN unique.

### Peinture web RGB332 et retrait de CubePainter

- Ajout dans L3D Studio d'un atelier **Peinture** avec couleur, crayon, gomme,
  effacement complet, clic-glisser, aperçu par couches et brouillon persistant
  dans `localStorage`.
- Ajout de `POST /api/v1/painter/frame`, qui réutilise le décodeur RGB332 de
  512 octets du streaming mais maintient la dernière image sans timeout.
- Envoi réactif sur chaque changement : première frame immédiate, regroupement
  des gestes rapides à 12,5 FPS maximum, une seule requête active et uniquement
  la frame la plus récente en attente.
- Retrait de l'ancien mode CubePainter, de sa fonction Particle, de sa route
  texte LAN, de son parseur, de son fichier d'animation et de ses écritures
  EEPROM. L'ID historique 33 reste réservé et une valeur persistée devenue
  inconnue revient sur `Off` au démarrage.
- Conservation du scratch partagé de 1 536 octets utilisé par les transitions,
  Snake, les FFT et la VM ; aucune nouvelle allocation ni framebuffer résident.
- Compilation Photon 2.3.1 : 122 688 octets de Flash, 15 228 octets de RAM
  statique, binaire de 122 692 octets et 8 384 octets de marge Flash, soit
  1 024 octets de Flash économisés sans variation de RAM.
- Validation OTA à `B:1` : frame acceptée et maintenue après cinq secondes,
  ancienne route en `404`, puis retour du cube sur `Off`.

### Bytecode procédural L3D — phases 0 à 5 et documentation de livraison

- Validation d'un emplacement EEPROM transactionnel de 197 octets, avec deux
  banques et un payload maximal de 185 octets sans réutiliser CubePainter.
- Définition du conteneur version 1, du CRC, des 16 registres, des capacités,
  des opcodes procéduraux, des quotas coopératifs et des erreurs `-300` à
  `-316`.
- Ajout d'un assembleur `.l3d` en deux passes, d'un validateur, d'un
  désassembleur et d'une VM TypeScript de référence indépendante du DOM.
- Ajout des programmes procéduraux Rain, sphère, Fireworks et Plasma ; leurs
  payloads assemblés occupent respectivement 43, 49, 45 et 75 octets.
- Ajout de tests déterministes couvrant les opcodes, branchements, limites,
  conteneurs corrompus, quotas, rendu et exécution du corpus.
- Ajout dans le firmware d'un validateur sans allocation et d'une VM
  coopérative utilisant le scratch d'animation partagé, avec quotas, attentes,
  diagnostics et retour sûr vers `Off` après une faute fatale.
- Ajout du mode `L3DProgram` (ID 77), qui charge le programme transactionnel
  installé et utilise une Sphère embarquée uniquement en absence de stockage.
- Conservation du catalogue Particle historique sous sa limite de 621
  caractères : le nouveau mode reste interne à Particle et est exposé par son
  API LAN dédiée, sans renommer ni retirer un mode existant.
- Validation native du véritable code C++ de la VM : parité de la Sphère, du
  générateur aléatoire et de `SIN8`, erreurs de validation, coordonnées et
  arrêt d'une boucle infinie à la 257e instruction.
- Mesure avec la VM active : 121 904 octets de Flash, 15 228 octets de RAM
  statique et 9 168 octets de marge Flash. Le rollback par flag conserve
  15 204 octets de RAM statique et retire le mode ainsi que la VM.
- Ajout du stockage transactionnel sur les banques EEPROM A et B, avec
  génération modulo 256, CRC relu, signature écrite en dernier et conservation
  automatique de la dernière génération complète après une coupure.
- Ajout des routes LAN de capacité, lecture binaire, installation, suppression,
  lancement et arrêt ; le buffer HTTP existant reçoit les programmes de 197
  octets sans allocation ni protocole fragmenté supplémentaire.
- Ajout dans L3D Studio d'un éditeur assembleur, des quatre exemples, de la VM
  locale dans l'aperçu 3D et des commandes démarrer, pause, arrêter et graine.
- Ajout d'une bibliothèque locale avec création, duplication, renommage,
  suppression, export et import JSON ne contenant aucune donnée Particle.
- Ajout du parcours d'installation LAN avec confirmation du remplacement,
  progression, lecture du statut et comparaison du CRC après relecture.
- Mesure firmware après phase 4 : 123 584 octets de Flash, 15 228 octets de RAM
  statique et 7 488 octets de marge Flash, soit +1 680 octets de Flash et
  aucune RAM statique supplémentaire depuis la phase 3.
- Ajout du guide du langage avec exemples, référence des 25 instructions,
  bornes, 17 fautes, sandbox, quotas, stockage, sécurité LAN et rollback.
- Production de l'artefact identifié
  `l3d-studio-firmware-1.4-photon-2.3.1-bytecode-v1.bin` et de son manifeste
  SHA-256 sans secret ni configuration personnelle.

### Serveur LAN v1 et diagnostics

- Ajout d'un serveur HTTP local optionnel sur le port 8080, sans allocation
  dynamique applicative, avec parseur borné, client unique, timeouts et CORS.
- Exposition de la santé, des diagnostics, de l'état, des catalogues et des
  commandes historiques par des routes versionnées partageant la logique
  métier Particle.
- Ajout des transports **LAN**, **Particle** et **Automatique** dans L3D Studio,
  avec configuration locale de l'adresse et test de `/health`.
- Ajout de la surveillance ponctuelle ou périodique, de l'historique circulaire
  et des courbes SVG mémoire, temps de frame et FPS.
- Maintien best effort de la surveillance dans un onglet en arrière-plan, sans
  requêtes superposées ni rafale de rattrapage.
- Documentation du contrat HTTP, des limites, erreurs, exemples `curl`, KPI,
  contraintes navigateur, absence volontaire de sécurité et rollback par
  `L3D_LOCAL_API_ENABLED=0`.
- Mesure finale de compilation : 118 296 octets de Flash, 15 204 octets de RAM
  statique, binaire de 118 300 octets et marge Flash de 12 776 octets.

### Streaming web

- Ajout du mode `Stream` 76 et de la route binaire RGB332 de 512 octets, avec
  timeout de trois secondes et retour automatique au mode `Off`.
- Ajout d'un moteur web sans file d'attente, d'un aperçu 3D rotatif et d'une vue
  par couches, avec cadence, vitesse et luminosité modifiables à chaud.
- Ajout d'un registre d'animations, de la sphère rebondissante et du lecteur de
  sprites 8x8 avec les cinq séquences CC0 de Lil' Birb.

### Nettoyage de la documentation firmware

- Suppression des rapports d'optimisation détaillés animation par animation,
  devenus redondants avec la baseline, le changelog et l'historique Git.
- Conservation des documents fonctionnels, architecturaux et opérationnels du
  firmware.

### Correction de la saisie des textes

- Conservation du focus et de la position du curseur pendant la saisie du
  message persistant et du paramètre texte de l'animation `Text`.
- Mise à jour et sauvegarde de ces valeurs sans reconstruction complète du DOM
  à chaque caractère.

### Réorganisation du dépôt

- Fusion de `firmware/` et de l'ancien répertoire de refactor dans un unique
  projet Particle situé sous `firmware/`.
- Conservation du pilote canonique dans `firmware/src/platform/neopixel.cpp`
  et suppression de ses anciennes copies à la racine du firmware.
- Déplacement de l'application TypeScript dans `app/src/`.
- Suppression de l'archive upstream `download/`, devenue inutile après
  conservation des empreintes, mesures et artefacts de rollback.

### Dispatcher et ordonnanceur coopératif

- Conservation du `switch` d'exécution après comparaison avec une table de 67
  pointeurs qui aurait ajouté au moins 268 octets de Flash.
- Redirection des attentes historiques vers des tranches coopératives de 20 ms
  qui servent Particle Cloud sans changer les durées visuelles demandées.
- Différé des changements de mode reçus pendant un rendu jusqu'à la frontière
  sûre suivante, avant le remplacement de l'état d'animation partagé.
- Protection des noms de modes invalides avant tout accès au registre.
- Coût mesuré par rapport à la phase 7 : +280 octets de Flash et +8 octets de
  RAM statique ; 127 tests hôte réussis.
- Interruptions de `BuildAWall` et `SlideShow` validées à `B:1`, puis OTA
  réussie pendant `BuildAWall`, sans OOM, avant le retour du cube sur `Off`.

### Allocations dynamiques applicatives supprimees

- Suppression des dernieres sous-chaines `String` temporaires du parseur Cloud ;
  les commandes sont lues directement dans le buffer fourni par Particle.
- Conversion bornee des nombres, couleurs, noms de modes et textes sans copie
  dynamique, y compris pour Shuffle et l'initialisation EEPROM.
- Ajout d'un garde-fou interdisant `vector`, `std::string`, `new`, `malloc`,
  `realloc` et `substring` dans le code applicatif.
- Flash reduite de 112 608 a 111 600 octets sans augmentation de RAM statique.
- Smoke test du protocole complet réussi sur le Photon à `B:1`, sans OOM, puis
  retour du cube sur `Off`.

### Etats d'animations mutualises

- Ajout du cycle de vie central `enter`, `tick` et `exit` pour encadrer chaque
  changement de mode et fermer les sockets CheerLights ou Listener.
- Mutualisation de Rain, du scratch historique, de Matrix, Squarrel, Collide2,
  Whirlwind, CubePainter, Spectrum, Snake, transitions et Listener dans une
  union unique de 8 220 octets.
- Rechargement de CubePainter depuis l'EEPROM a son entree et inspection directe
  de la persistance au demarrage, sans conserver son buffer resident.
- RAM statique reduite de 16 236 a 13 780 octets, soit 2 456 octets liberes ;
  Flash reduite de 16 octets sur Photon Device OS 2.3.1.
- Flash OTA et changements rapides entre six familles d'etats valides a `B:1`,
  sans reset ni OOM, puis retour du cube sur `Off`.

### Gyrophare français

- Ajout de `GyrophareFR` (ID 75), un double faisceau vertical tournant sur huit
  orientations entières autour de l'axe du cube.
- Bleu seul par défaut, avec switches `Bicolore`, `Reactif au son` et `Trainee`.
- Réaction sonore par enveloppe d'amplitude sur quatre lectures, sans FFT,
  trigonométrie runtime, allocation dynamique ni attente bloquante.
- Coût mesuré : +768 octets de Flash et +8 octets de RAM statique.
- Flash OTA et smoke tests des trois variantes réussis à `B:1` ; cube replacé
  sur `Off` avec la luminosité interne `2`.

### Imports CubeTube

- Ajout de `LightningBox` (ID 71), `FFTMeteors` (ID 72), `FFTJoy` (ID 73)
  et `Tranquility` (ID 74), sans réutiliser ni décaler les IDs historiques.
- Portage non bloquant de LightningBox et Tranquility avec états statiques
  compacts et suppression des calculs ou tirages aléatoires sans effet visible.
- Mutualisation de la capture, des 128 octets de scratch FFT et de la palette
  entière entre FFTJoy et FFTMeteors ; aucune allocation dynamique ajoutée.
- Passage des tables immuables de modes et de switches en `const`, ce qui
  compense les quatre imports et réduit la RAM statique de 18 732 à 16 228
  octets. La Flash passe de 109 360 à 111 856 octets.
- Compilation Photon 2.3.1, flash OTA et smoke test des quatre modes réussis
  avec `B:1` ; cube replacé sur `Off` avec la luminosité interne `2`.

### Validation matérielle

- Comparaison ponctuelle de `Spectrum` entre Spark Pixels Mega 1.4 et le
  firmware refactoré : son rendu historique combine des barres FFT verticales
  sur l'axe `y` et leur propagation dans la profondeur sur l'axe `z`.
- Rollback OTA vers Spark Pixels Mega 1.4 vérifié sur le Photon, puis retour OTA
  au firmware refactoré.
- Firmware refactoré actuellement déployé avec Device OS 2.3.1.
- Cube replacé après les essais en mode `Off` avec `B:1`, soit la valeur interne
  de luminosité `2`.

### En attente

- Baselines longues et validations visuelles exhaustives des animations,
  volontairement reportées.
- Tests d'endurance, de reconnexion Wi-Fi et Particle Cloud.
- Validation du parcours d'authentification avec un compte Particle utilisant
  la MFA.
- Protocole firmware v2, EEPROM versionnée et réactivation éventuelle des modes
  archivés.

## 2026-08-17 — Refactorisation et optimisation du firmware

Commits principaux : `e38b664`, `32d5486`, `51a0283`, `d92b9a0`, `2adb3ff`.

### Projet firmware reproductible

- Création initiale du projet de refactor sans modification de l'archive
  upstream alors présente dans le dépôt de travail.
- Conservation de Particle Photon Gen 2 et de Device OS 2.3.1 comme cible de
  référence.
- Ajout du projet Particle, de la bibliothèque NeoPixel corrigée et d'un script
  de compilation chargeant silencieusement les identifiants de `.env.local`.
- Ajout de l'extraction automatique des tailles Flash, RAM statique et binaire.
- Établissement d'une baseline initiale : 114 328 octets de Flash, 39 852 octets
  de RAM statique et 10 200 octets de mémoire libre publiée au démarrage.
- Création d'un inventaire des modes, commandes Cloud, variables Particle,
  allocations, buffers, usages réseau et données EEPROM.
- Ajout de fixtures du protocole historique et d'une procédure de comparaison
  visuelle.
- Création et validation d'une procédure de rollback OTA vers Spark Pixels
  Mega 1.4, avec conservation d'un binaire stable.

### Découpage du monolithe

- Remplacement du fichier monolithique par des modules ciblés : `animations/`,
  `cloud/`, `config/`, `core/`, `diagnostics/`, `network/`, `platform/`,
  `rendering/` et `storage/`.
- Déplacement des animations dans des fichiers individuels ou dans de petites
  familles partageant réellement leur algorithme.
- Création d'un index reliant les IDs, noms historiques et fichiers source.
- Isolation du parsing Cloud, des métadonnées, de l'EEPROM, de CheerLights, du
  Listener UDP, du pilote NeoPixel et des primitives de rendu.
- Réduction de `main.cpp` à l'enregistrement Particle et à l'orchestration de
  `setup()` et `loop()`.
- Conservation des 62 modes actifs, des IDs historiques, des commandes, du
  format EEPROM et des métadonnées attendues par L3D Studio.

### Diagnostics

- Ajout de mesures actualisables de mémoire libre et de minimum mémoire.
- Suivi de l'uptime, de la cause de reset, des changements de mode et des
  entrées/sorties d'animation.
- Mesure du temps moyen et maximal des frames ainsi que des FPS.
- Exposition de diagnostics compacts générés à la demande.
- Ajout d'un handler de manque de mémoire minimal qui ne publie, n'alloue et ne
  redémarre pas directement le Photon.
- Possibilité de désactiver les diagnostics détaillés à la compilation.

### Sécurisation

- Suppression du buffer local de 2 048 octets auparavant placé sur la pile par
  `transitionAll()`.
- Introduction d'un scratch statique partagé de 1 536 octets, avec assertions
  de taille et contrats de durée de vie.
- Remplacement des formatages et concaténations non bornés par des écritures
  bornées.
- Validation des commandes Cloud vides, maximales, tronquées, malformées et
  hors plage avant modification de l'état, du framebuffer ou de l'EEPROM.
- Centralisation de la validation des coordonnées avant les écritures de voxel.
- Ajout de codes d'erreur négatifs tout en conservant les retours historiques
  pour les commandes valides.
- Suppression des gros buffers locaux interdits dans les chemins actifs.

### Types et rendu

- Conservation de `Color` sur trois octets RGB.
- Ajout de types compacts pour coordonnées signées, axes bornés, couleurs et
  positions fixed-point.
- Ajout d'assertions statiques sur les structures critiques.
- Centralisation du mapping logique `8 × 8 × 8` vers les 512 index NeoPixel.
- Séparation des coordonnées logiques et du stockage physique GRB du pilote.
- Ajout de tests couvrant les coins, arêtes, plans, 512 index uniques, bornes et
  restitution des couleurs RGB.
- Remplacement de plusieurs `double`, `pow()` et racines carrées inutiles par
  des calculs entiers ou `float` comparés à la référence.

### Optimisation des animations

- Audit des 70 modes inventoriés et de six éléments partagés.
- Création d'une checklist, d'un tracker et de comptes rendus de mesure par
  animation ou famille d'animations.
- Compactage de GoldRain et AcidRain, avec une économie de 16 400 octets de RAM
  statique pour leurs salves.
- Compactage des états Matrix, Collide2, Squarrel, BouncyCube, Rain,
  SlidingPlanes, LineSpiral, PacMan et Whirlwind.
- Remplacement des allocations dynamiques de Snake et CrumblingPlane par des
  tableaux fixes utilisant le scratch partagé.
- Mutualisation des buffers temporaires de Spectrum, Frozen, Fireworks,
  transitions, Digi, PacMan et autres animations mutuellement exclusives.
- Suppression des chaînes applicatives dynamiques dans CheerLights, Text,
  Clock et CubePainter ; maintien uniquement des signatures `String` imposées
  par Particle et du parseur historique encore nécessaire.
- Compactage de l'ordre Shuffle de 248 à 62 octets et de l'ordre SlideShow de
  92 à 23 octets.
- Mutualisation de calculs dans Plasma, MovingSphere, ColorAll, Fireworks,
  LineSpin, SineLines, Rain et plusieurs effets de couleur.
- Désactivation au build de l'objet et du buffer UDP du Listener inaccessible.
- Conservation de Lightning, encore utilisé par le quatrième switch de Rain.
- Archivage sans empreinte active de Life, Hyper et RomanCandle.
- Correction de l'ordre d'initialisation du scratch Whirlwind afin que la
  transition ne détruise pas son état.

### Résultats mesurés

| Mesure | Début de la passe animations | Résultat | Écart |
| --- | ---: | ---: | ---: |
| Flash | 115 944 | 109 360 | −6 584 |
| RAM statique | 39 932 | 18 732 | −21 200 |
| Taille binaire | 115 948 | 109 364 | −6 584 |
| Marge Flash | 15 128 | 21 712 | +6 584 |

- Réduction de la RAM statique de 39 852 à 18 732 octets par rapport à l'import
  upstream initial, soit un gain net de 21 120 octets.
- Compilation cloud réussie pour Photon avec Device OS 2.3.1.
- 99 tests hôte réussis à la fin de la passe.
- Flash et smoke tests réalisés sur le Photon avec une luminosité limitée à
  `B:1`.
- Aucune archive upstream ni aucun secret local modifié pendant cette phase.

### Documentation et règles de travail

- Ajout de règles firmware dans `AGENT.md` : commentaires structurés en
  français, sécurité des buffers, absence d'allocation dans le rendu, mesures
  obligatoires et tests matériels à `B:1`.
- Documentation des commandes CLI de compilation, flash, diagnostics, tests et
  rollback.
- Documentation des diagnostics, de la sécurité, des types de rendu, des
  validations visuelles et des optimisations par animation.
- Maintien explicite dans le tracker des baselines longues et comparaisons
  physiques qui n'ont pas encore été réalisées.

## 2026-08-17 — Application L3D Studio 0.1.0

Commits principaux : `bb64b18`, `b47a7df`, `495c33e`, `400c547`, `3b4728d`,
`b463ca8`, `49f76fb`.

### Analyse du firmware et du protocole

- Documentation des fonctions et variables Particle exposées par Spark Pixels
  Mega.
- Documentation de `SetMode`, `Function`/`FnRouter`, `SetText` et
  `CubePainter`.
- Inventaire des modes, couleurs, vitesses, luminosité, switches et commandes
  auxiliaires.
- Comparaison avec l'ancienne application Android Spark Pixels.
- Création d'une table de compatibilité entre variables, types, usages UI et
  endpoints Particle.

### API Particle Cloud

- Adoption de `https://api.particle.io/v1` et du header
  `Authorization: Bearer <token>`.
- Abandon de l'ancien domaine `api.spark.io` et du token transmis dans l'URL.
- Validation de la création d'un token via `POST /oauth/token`.
- Utilisation du paramètre `arg` pour les fonctions Particle à la place de
  l'ancien paramètre Android `params`.
- Validation authentifiée de la connexion et de la liste des devices.
- Documentation des erreurs de login, MFA, token, device hors ligne, variable,
  fonction et timeout.
- Documentation du risque lié au stockage local d'un token et interdiction de
  conserver le mot de passe.

### Socle TypeScript

- Initialisation d'une application Vite sans framework UI.
- Ajout de TypeScript 5.9.2, Vite 8.2.1 et Vitest 4.1.10.
- Création des scripts `dev`, `build`, `test` et `preview`.
- Séparation entre client Particle, protocole Spark Pixels, état UI, rendu,
  événements et préférences.
- Ajout d'une feuille de styles globale et d'une interface responsive.
- Validation TypeScript avec `tsc --noEmit` et contrôle des dépendances avec
  `npm audit` sans vulnérabilité connue au moment du jalon.

### Client Particle et session

- Implémentation du login, de la déconnexion, de la liste des devices, de la
  lecture des variables et de l'appel des fonctions Particle.
- Stockage local du token, du refresh token et du device sélectionné, sans
  stockage du mot de passe.
- Gestion centralisée des erreurs et des sessions expirées.
- Ajout de tests unitaires avec transport HTTP simulé.

### Protocole Spark Pixels

- Génération des commandes `SetMode` avec mode, vitesse, luminosité, couleurs,
  switches et texte.
- Conversion de la luminosité utilisateur `0..100` vers le format attendu par
  le firmware.
- Gestion des presets de vitesse et des couleurs RGB hexadécimales.
- Parsing de `modeList`, `modeParmList`, `auxSwtchList` et `deviceInfo`.
- Fusion des métadonnées reçues pour construire les contrôles adaptés à chaque
  mode.
- Génération des commandes `GETSWITCHSTATE`, `GETCOLOR`, `SETTIMEZONE`,
  `SETAUXSWITCH` et `REBOOT`.
- Ajout de tests de parsing et de génération basés sur des valeurs réelles du
  firmware.

### Interface MVP

- Écran de connexion Particle et sélection du Photon.
- Lecture de l'état courant, des modes, de la luminosité, de la vitesse et des
  capacités du firmware.
- Sélection d'une animation et génération dynamique de ses couleurs, switches
  et champs texte.
- Contrôles explicites de luminosité et de vitesse sans appels réseau pendant
  le déplacement des sliders.
- Envoi manuel des commandes et affichage du dernier retour Particle.
- Sauvegarde locale du device et des derniers réglages utilisateur.
- Indicateur online/offline, bouton de rafraîchissement et blocage des commandes
  incomplètes ou envoyées vers un Photon indisponible.
- Messages utilisateur pour identifiants invalides, MFA non prise en charge,
  token expiré, cube hors ligne, timeout et commande refusée.

### Fonctions avancées

- Ajout de l'interface des switches auxiliaires globaux.
- Ajout du contrôle du texte persistant via `SetText`.
- Ajout des commandes avancées `FnRouter`.
- Ajout d'un panneau Device Info pour les informations firmware, réseau et
  diagnostic.
- Étude de CubePainter ; maintien hors du MVP dans l'attente d'une interface 3D
  dédiée évitant les écritures accidentelles de voxels et d'EEPROM.

### Déploiement

- Configuration du chemin public Vite `/l3d-studio/`.
- Ajout du workflow GitHub Actions de construction et de publication Pages.
- Validation du build statique par GitHub Actions.
- Publication de l'application sur
  <https://karlos-fr.github.io/l3d-studio/>.
- Documentation de la procédure GitHub Pages et des limites de sécurité.

## 2026-08-16 — Initialisation du projet

Commits principaux : `4253992`, `7f70c83`, `707496c`.

- Création du dépôt L3D Studio.
- Définition de l'objectif : remettre en service et moderniser un cube L3D
  8 × 8 × 8 de 512 LED RGB piloté par un Particle Photon.
- Choix d'une application TypeScript minimale destinée à remplacer l'ancienne
  application Android Spark Pixels.
- Décision de conserver d'abord le firmware Spark Pixels Mega et Particle Cloud
  afin d'obtenir rapidement un contrôle fonctionnel du cube.
- Choix de Vite, TypeScript, HTML et CSS sans React ni backend initial.
- Création du plan d'implémentation de l'application, depuis l'analyse du
  protocole jusqu'au déploiement et à l'étude future d'une API LAN locale.
- Ajout des références vers Spark Pixels, le firmware L3D historique et
  l'application Android d'origine.
- Définition des premières règles de sécurité pour le mot de passe et le token
  Particle.
