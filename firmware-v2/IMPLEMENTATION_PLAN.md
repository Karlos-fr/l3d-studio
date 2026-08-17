# Plan de refactorisation du firmware L3D Cube

## Objectif

Créer une nouvelle version modulaire et mesurable de `SparkPixelsMega` pour le
Particle Photon Gen 2, sans modifier la copie upstream située dans `download/`.

Le refactor doit en priorité :

- préserver le comportement visible du cube et la compatibilité avec L3D Studio ;
- réduire la consommation de RAM statique, de pile et de heap ;
- conserver une marge mémoire suffisante pour Particle Cloud et les reconnexions ;
- réduire la fragmentation mémoire et les risques de panic ;
- rendre les animations indépendantes et testables ;
- préparer, sans l'implémenter immédiatement, un futur transport LAN local ;
- permettre d'évaluer la réactivation des modes désactivés.

## Contraintes techniques

- Matériel cible : Particle Photon Gen 2, STM32F205, ARM Cortex-M3 à 120 MHz.
- Device OS cible figé : `2.3.1`.
- Taille maximale du firmware utilisateur : 128 Kio, soit 131 072 octets.
- RAM physique : 128 Kio, dont environ 80 Kio disponibles au firmware utilisateur.
- Taille de pile du thread principal : 6 144 octets.
- Taille de pile des callbacks de timers logiciels : 1 024 octets.
- Bibliothèque LED de référence : `firmware/neopixel-fix.cpp` et
  `firmware/neopixel.h`.
- Source upstream de référence :
  `download/Spark_Pixels/Firmware/Neopixel_Library/SparkPixels_L3D_Cube/SparkPixelsMega.ino`.
- La copie upstream dans `download/` ne doit jamais être modifiée.
- Particle Cloud reste le transport principal pendant ce refactor.
- Le chantier d'API LAN locale reste séparé du refactor mémoire et structurel.

## Mesures de référence

Compilation cloud de la source actuelle avec Device OS 2.3.1 :

| Mesure | Référence initiale |
| --- | ---: |
| Flash utilisateur | 114 328 octets |
| RAM statique | 39 852 octets |
| Mémoire libre publiée au démarrage | 10 200 octets |

La mesure de mémoire libre actuelle est construite une seule fois pendant
`setup()` et ne représente ni le minimum d'exécution, ni la fragmentation du
heap, ni les pics de pile.

## Budgets et critères globaux

- [ ] Ne jamais dépasser 131 072 octets de flash utilisateur.
- [ ] Viser au maximum 110 000 octets de flash avant de réactiver un mode.
- [ ] Viser au maximum 32 000 octets de RAM statique à la fin du refactor.
- [ ] Conserver au moins 15 000 octets de mémoire libre dans tous les modes.
- [ ] Viser au moins 20 000 octets de mémoire libre au démarrage.
- [ ] Ne tolérer aucune baisse continue de mémoire libre pendant un test de 24 h.
- [ ] Ne tolérer aucun panic, reset inattendu ou blocage Cloud pendant un test de 24 h.
- [ ] Mesurer la flash, la RAM statique et la mémoire libre après chaque phase.
- [ ] Refuser une optimisation qui change visiblement une animation sans décision documentée.

## Compatibilité à préserver

### API Particle Cloud existante

- [ ] Conserver la fonction Particle `SetMode`.
- [ ] Conserver la fonction Particle `Function` et les commandes `FnRouter`.
- [ ] Conserver la fonction Particle `SetText`.
- [ ] Conserver la fonction Particle `CubePainter` tant que sa migration n'est pas décidée.
- [ ] Conserver les variables Particle utilisées par L3D Studio pendant la transition.
- [ ] Conserver le format des commandes `SetMode` existantes.
- [ ] Conserver les noms de modes acceptés par `M:<nom>`.
- [ ] Conserver les IDs numériques historiques des modes.
- [ ] Conserver le comportement des réglages de vitesse, luminosité, couleurs et switches.
- [ ] Conserver le format EEPROM ou prévoir une migration versionnée et réversible.

### Protocole futur

- [ ] Ajouter un numéro de version du protocole firmware.
- [ ] Définir une représentation compacte des capacités des modes.
- [ ] Ajouter dans L3D Studio un registre local des noms, labels et descriptions.
- [ ] Ajouter un fallback TypeScript vers le protocole historique.
- [ ] Ne supprimer les métadonnées Cloud historiques qu'après déploiement du fallback.

## Architecture cible

```text
firmware-v2/
  IMPLEMENTATION_PLAN.md
  project.properties
  src/
    main.cpp
    config/
      build_config.h
      mode_ids.h
    core/
      animation.h
      animation_context.h
      animation_registry.cpp
      animation_registry.h
      scheduler.cpp
      scheduler.h
      shared_state.h
    rendering/
      color.cpp
      color.h
      coordinates.h
      framebuffer.cpp
      framebuffer.h
      cube_mapping.cpp
      cube_mapping.h
      led_driver.cpp
      led_driver.h
    animations/
      standby.cpp
      color_all.cpp
      rain.cpp
      ...
    cloud/
      particle_api.cpp
      particle_api.h
      command_parser.cpp
      command_parser.h
      legacy_metadata.cpp
      legacy_metadata.h
    storage/
      settings.cpp
      settings.h
      eeprom_layout.h
    network/
      cheerlights.cpp
      cheerlights.h
      udp_listener.cpp
      udp_listener.h
    diagnostics/
      diagnostics.cpp
      diagnostics.h
    platform/
      neopixel.cpp
      neopixel.h
  test/
    host/
    fixtures/
  tools/
    measure-build.ps1
    soak-test.md
```

La structure finale pourra être ajustée si la compilation Particle 2.3.1 impose
des contraintes, mais les responsabilités devront rester séparées.

## Phase 0 — Sécurisation et baseline reproductible

### Projet et compilation

- [x] Copier la source upstream dans `firmware-v2/src/main.cpp` sans modification fonctionnelle.
- [x] Copier la bibliothèque NeoPixel corrigée dans `firmware-v2/src/platform/`.
- [x] Ajouter `project.properties` avec les dépendances et la cible documentées.
- [x] Vérifier que le projet compile avec `particle compile photon --target 2.3.1`.
- [x] Vérifier que le binaire initial est fonctionnellement identique à la version 1.4.
- [x] Ajouter un script de compilation qui n'affiche jamais les secrets de `.env.local`.
- [x] Ajouter un script qui extrait les tailles flash et RAM de la sortie de compilation.
- [x] Enregistrer les mesures initiales dans un journal de benchmarks versionné.

### Inventaire fonctionnel

- [x] Inventorier tous les IDs, noms et capacités des modes actifs.
- [x] Inventorier les modes déclarés mais masqués dans `modeStruct`.
- [x] Inventorier toutes les commandes `SetMode`, `FnRouter`, `SetText` et `CubePainter`.
- [x] Inventorier toutes les variables et fonctions Particle exposées.
- [x] Inventorier les adresses EEPROM et la taille de chaque valeur persistée.
- [x] Inventorier les effets réseau : Particle Cloud, UDP Listener et CheerLights.
- [x] Identifier les animations bloquantes et leurs appels à `delay()`.
- [x] Identifier tous les tableaux globaux, leur taille et leur animation propriétaire.
- [x] Identifier toutes les allocations dynamiques, `String` et `std::vector`.

### Tests de référence

- [x] Capturer une commande valide représentative de chaque type de mode.
- [x] Capturer les valeurs réelles de `modeList`, `modeParmList` et `auxSwtchList`.
- [x] Ajouter des fixtures de protocole utilisables par les tests hôte.
- [x] Définir une procédure vidéo ou visuelle de comparaison des animations.
- [x] Définir une procédure de retour au firmware stable en cas d'échec.

### Critère de sortie

- [x] Le nouveau projet compile sans changement fonctionnel.
- [x] Les mesures de référence sont reproductibles.
- [x] Le retour au firmware stable est documenté et testé par rollback OTA.

## Phase 1 — Découpage mécanique du monolithe

Cette phase sert uniquement à réduire la taille des fichiers à lire et le
contexte nécessaire aux interventions futures. Elle ne doit contenir aucune
optimisation, correction fonctionnelle ou réécriture d'algorithme.

### Règles de déplacement

- [x] Déplacer le code à comportement strictement identique, sans changer les signatures.
- [x] Ne modifier ni types, ni constantes, ni structures, ni ordre d'initialisation.
- [x] Ne modifier ni boucle, ni condition, ni temporisation, ni appel NeoPixel.
- [x] Ne modifier ni protocole Particle, ni EEPROM, ni noms ou IDs de modes.
- [x] Conserver temporairement les variables globales existantes si leur refonte changerait le code.
- [x] Réaliser un déplacement mécanique distinct par animation ou petite famille indissociable.
- [x] Compiler après chaque déplacement pour détecter immédiatement une dépendance implicite.
- [x] Comparer flash et RAM avec la baseline après chaque groupe de fichiers.
- [x] Documenter toute variation de taille produite uniquement par le découpage.

### Core

- [x] Déplacer les IDs historiques dans `config/mode_ids.h` sans changer leurs valeurs.
- [x] Déplacer les constantes de build dans `config/build_config.h`.
- [x] Déplacer les types partagés existants dans des fichiers explicitement nommés.
- [x] Déplacer le changement de mode et son `switch` dans `core/` sans le remplacer.
- [x] Garder `main.cpp` limité à l'enregistrement Particle, `setup()` et `loop()`.
- [x] Ne pas introduire encore l'interface `enter`, `tick`, `exit`.

### Animations

- [x] Créer en priorité un fichier `.cpp` et un fichier `.h` par animation.
- [x] Regrouper plusieurs animations uniquement lorsqu'elles partagent réellement le même algorithme et le même état.
- [x] Placer les fonctions dans leur module sans les optimiser et conserver l'état global dans `core/legacy_state.h` lorsque son déplacement modifierait le linkage.
- [x] Conserver des déclarations et un état global temporaires lorsque leur suppression exigerait une refonte.
- [x] Créer un index Markdown reliant chaque ID, nom historique et fichier source.
- [x] Vérifier qu'une future intervention sur un mode ne nécessite pas de charger les autres implémentations d'animation.
- [x] Déplacer d'abord une animation simple afin de valider les conventions de fichiers.
- [x] Déplacer ensuite les animations par groupes compilables de petite taille.
- [x] Déplacer Rain/GoldRain sans modifier encore `salvos`.
- [x] Déplacer les modes désactivés dans des fichiers séparés sans les réactiver.

### Services

- [x] Déplacer Particle Cloud dans `cloud/` sans changer les fonctions exposées.
- [x] Déplacer le parsing des commandes dans `cloud/command_parser.*` sans changer le format.
- [x] Déplacer EEPROM dans `storage/` sans changer son layout.
- [x] Déplacer UDP Listener et CheerLights dans `network/` sans changer leur comportement.
- [x] Déplacer les primitives de rendu partagées dans `rendering/` sans changer le mapping.
- [x] Éviter les fichiers génériques `utils.*` et `helpers.*`.

### Validation du découpage

- [x] Compiler le projet complet avec Device OS 2.3.1.
- [x] Vérifier après flash que les fonctions et variables Particle exposées sont identiques.
- [x] Vérifier après flash que les listes de modes et paramètres sont octet pour octet identiques.
- [x] Tester au moins un mode simple, un mode texte, Rain et CubePainter sur le cube.
- [x] Comparer les mesures flash et RAM avec la baseline.
- [x] Conserver un commit ou point de retour contenant uniquement ce déplacement mécanique.

### Critère de sortie

- [x] Le monolithe est remplacé par des fichiers ciblés et faciles à inspecter.
- [x] Chaque animation active possède un emplacement source explicite.
- [x] Aucun changement fonctionnel volontaire n'a été introduit.
- [x] Le firmware compile et L3D Studio utilise toujours le protocole historique.

## Phase 2 — Diagnostics mémoire et performance

### Mesures runtime

- [x] Remplacer la mesure unique de `deviceInfo` par une mesure actualisable à la demande.
- [x] Mesurer `System.freeMemory()` au démarrage après initialisation complète.
- [x] Suivre le minimum de mémoire libre observé depuis le démarrage.
- [x] Mesurer la mémoire avant l'entrée et après la sortie de chaque animation.
- [x] Enregistrer le nombre de changements de mode.
- [x] Enregistrer l'uptime et la cause du dernier reset si disponible.
- [x] Ajouter un handler `out_of_memory` minimal et sûr.
- [x] Ne jamais publier, allouer ou redémarrer directement depuis le handler mémoire.

### Mesures de rendu

- [x] Mesurer la durée de calcul d'une frame.
- [x] Mesurer les FPS moyens et le pire temps de frame.
- [x] Rendre les diagnostics détaillés désactivables à la compilation.
- [x] Éviter toute construction dynamique de chaîne dans la boucle de rendu.
- [x] Exposer les diagnostics via une réponse compacte générée à la demande.

### Tests de stabilité

> En attente à la demande du mainteneur le 2026-08-17 : ces essais matériels
> longs seront repris après les travaux de code de la phase 2. Toute reprise
> devra imposer `B:1` (luminosité 1 %) aux commandes de démonstration.

- [ ] Exécuter chaque mode pendant au moins 10 minutes.
- [ ] Alterner rapidement les modes pendant au moins 30 minutes.
- [ ] Tester une déconnexion et une reconnexion Wi-Fi.
- [ ] Tester une déconnexion et une reconnexion Particle Cloud.
- [ ] Vérifier que les diagnostics ne réduisent pas la marge sous 10 Kio (la référence historique mesurée à 10 200 octets est déjà sous 10 Kio).

### Critère de sortie

- [x] Les minima mémoire et temps de frame sont observables par mode.
- [x] Aucun diagnostic ne réalise d'allocation dans le chemin chaud.

## Phase 3 — Sécurisation de la pile et des buffers

### Transition des couleurs

- [x] Supprimer le tableau local de 2 048 octets dans `transitionAll()`.
- [x] Utiliser un espace scratch statique partagé ou un algorithme sans copie complète.
- [ ] Vérifier que toutes les LED évoluent visuellement comme dans la version 1.4.
- [x] Mesurer le pic mémoire et la durée de transition avant et après modification.

### Chaînes et copies mémoire

- [x] Remplacer les `sprintf` non bornés par `snprintf`.
- [x] Remplacer les concaténations non bornées par un writer borné commun.
- [x] Vérifier systématiquement la terminaison nulle des buffers texte.
- [x] Refuser proprement toute commande Particle trop longue.
- [x] Ajouter des tests pour les commandes vides, maximales, tronquées et malformées.
- [x] Vérifier tous les indices de voxel avant écriture dans un buffer.

### Critère de sortie

- [x] Aucun buffer supérieur à 256 octets n'est alloué sur la pile.
- [x] Aucun chemin d'entrée Cloud ne peut écrire hors limites.
- [x] Le protocole historique reste accepté.

## Phase 4 — Types compacts et primitives de rendu

### Types

- [x] Conserver `Color` sur trois octets RGB.
- [x] Créer un type de coordonnées discrètes signé pour les valeurs `-1..8`.
- [x] Utiliser `uint8_t` uniquement pour les coordonnées garanties `0..7`.
- [x] Utiliser `int8_t` ou `int16_t` pour les sentinelles et calculs intermédiaires.
- [x] Créer un type fixed-point documenté pour les positions et vitesses fractionnaires.
- [x] Conserver un type flottant séparé uniquement pour les animations géométriques qui l'exigent.
- [x] Ajouter des assertions statiques sur la taille des structures critiques.

### Rendu et hardware

- [x] Séparer les coordonnées logiques du mapping physique NeoPixel.
- [x] Centraliser la validation et la conversion `x,y,z` vers l'index LED.
- [x] Définir une interface de rendu sans classe virtuelle ni allocation dynamique.
- [x] Éviter d'ajouter un second framebuffer permanent de 1 536 octets.
- [x] Utiliser le buffer NeoPixel comme framebuffer principal quand c'est possible.
- [ ] Vérifier l'ordre RGB et le mapping physique sur les 512 LED.
- [x] Ajouter des tests hôte du mapping pour les coins, arêtes et plans.

### Calculs

- [x] Remplacer les `double` inutiles par des entiers, fixed-point ou `float`.
- [x] Éviter `pow()` pour les carrés et petits exposants entiers.
- [x] Remplacer les divisions constantes fréquentes par des calculs précomputés si mesuré utile (aucun remplacement retenu sans gain mesuré).
- [x] Ne remplacer les fonctions trigonométriques qu'après comparaison visuelle et mesure flash/temps (fonctions conservées pendant cette phase).

### Critère de sortie

- [x] Le mapping logique et physique est indépendant des animations.
- [x] Chaque remplacement de flottant possède une comparaison avant/après.

## Phase 5 — Refonte prioritaire de Rain et GoldRain

### Structure des gouttes

- [ ] Mesurer précisément `sizeof(raindrop)` et `sizeof(salvo)` sur la cible.
- [ ] Remplacer les coordonnées flottantes inutiles par des types compacts.
- [ ] Remplacer la position Y et la vitesse par du fixed-point.
- [ ] Fusionner les booléens `flipped` et `dead` dans un champ de flags.
- [ ] Remplacer les 8 × 128 emplacements permanents par un pool borné de gouttes actives.
- [ ] Déterminer expérimentalement la capacité minimale qui conserve le rendu actuel.
- [ ] Ajouter une stratégie explicite quand le pool est plein.
- [ ] Initialiser uniquement les éléments utilisés.

### Compatibilité

- [ ] Conserver les IDs et noms `AcidRain` et `GoldRain`.
- [ ] Conserver les couleurs, switches, vitesse et densité visuelle.
- [ ] Comparer les animations par vidéo et mesures de frame.
- [ ] Exécuter Rain et GoldRain pendant au moins 2 h chacun.

### Critère de sortie

- [ ] Réduire fortement l'état Rain par rapport à son estimation initiale d'environ 24 Kio.
- [ ] N'introduire aucune allocation dynamique dans Rain ou GoldRain.
- [ ] Conserver un rendu visuellement équivalent.

## Phase 6 — États d'animations mutualisés

### Cycle de vie

- [x] Définir l'interface légère `enter`, `tick` et `exit` d'une animation.
- [x] Garantir que `enter` initialise entièrement son état.
- [x] Garantir que `exit` ferme les sockets et libère les ressources logiques.
- [x] Interdire les pointeurs vers l'état d'une animation après sa sortie.
- [x] Ajouter une réinitialisation contrôlée lors d'un changement de mode.

### Zone mémoire partagée

- [x] Inventorier la taille finale de chaque état d'animation.
- [x] Définir une union ou zone scratch alignée couvrant le plus gros état actif.
- [x] Mutualiser les états de Matrix, Squarral, Collide, Whirlwind et modes similaires.
- [x] Mutualiser les buffers CubePainter, UDP Listener et transition quand leurs durées de vie ne se chevauchent pas.
- [x] Recharger CubePainter depuis l'EEPROM à l'entrée si cela évite un buffer résident.
- [x] Ajouter des assertions statiques sur l'alignement et la taille de la zone partagée.
- [x] Effacer seulement la portion nécessaire lors d'un changement de mode.

### Critère de sortie

- [x] Une seule zone d'état volumineuse est résidente à la fois.
- [x] Les changements rapides de modes ne laissent aucun état invalide.
- [x] Le gain RAM est mesuré et documenté.

## Phase 7 — Suppression des allocations dynamiques applicatives

### Conteneurs

- [ ] Remplacer `std::vector` dans Snake par un tableau à capacité fixe et un compteur.
- [ ] Remplacer `std::vector` dans Crumble par un tableau à capacité fixe et un compteur.
- [ ] Remplacer les listes temporaires de pointeurs par des indices bornés.
- [ ] Définir explicitement le comportement lorsque la capacité est atteinte.
- [ ] Vérifier que les opérations insertion, suppression et mélange restent correctes.

### Chaînes

- [ ] Conserver `String` uniquement aux frontières imposées par Particle Cloud.
- [ ] Parser les commandes via `c_str()` sans créer de sous-chaînes dynamiques.
- [ ] Remplacer les `std::string` internes par des buffers fixes ou calculs directs.
- [ ] Remplacer les `String` globales CheerLights par des constantes et buffers bornés.
- [ ] Vérifier qu'aucune animation n'alloue après son `enter`.

### Critère de sortie

- [ ] Aucun `std::vector`, `std::string`, `new`, `malloc` ou `realloc` dans le code applicatif.
- [ ] Les allocations internes inévitables de Device OS et NeoPixel sont documentées.
- [ ] Le minimum de mémoire libre reste stable pendant 24 h.

## Phase 8 — Registre léger et scheduler non bloquant

### Registre

- [ ] Comparer la taille d'un registre `const` avec celle du `switch` actuel.
- [ ] Conserver le `switch` si le registre augmente la flash ou la RAM sans bénéfice suffisant.
- [ ] Si retenu, stocker le registre immuable en flash.
- [ ] Éviter les classes virtuelles, RTTI et allocations.
- [ ] Préserver les IDs clairsemés historiques sans créer un tableau inutile de grande taille.

### Scheduler

- [ ] Remplacer progressivement les longues boucles et `delay()` par des étapes `tick()`.
- [ ] Utiliser `millis()` avec des calculs sûrs lors du débordement du compteur.
- [ ] Permettre un changement de mode entre deux frames.
- [ ] Rendre régulièrement la main à Device OS et Particle Cloud.
- [ ] Conserver la vitesse visuelle historique de chaque animation.
- [ ] Éviter toute opération longue dans un callback de timer logiciel.
- [ ] Utiliser les callbacks uniquement pour poser des flags simples.

### Critère de sortie

- [ ] Aucun mode actif ne bloque volontairement plusieurs secondes.
- [ ] Une commande Cloud peut interrompre proprement une animation.
- [ ] Les reconnexions et mises à jour OTA restent possibles pendant les animations.

## Phase 9 — Métadonnées compactes et protocole v2

### Firmware

- [ ] Rendre les tables historiques immuables avant leur suppression.
- [ ] Mesurer leur placement réel dans `.rodata`, `.data` et `.bss`.
- [ ] Définir un descripteur minimal contenant ID et capacités.
- [ ] Ajouter une variable de version du protocole.
- [ ] Ajouter une variable compacte de capacités si nécessaire.
- [ ] Générer les diagnostics et réponses textuelles dans un buffer partagé.
- [ ] Garder temporairement `modeList`, `modeParmList` et `auxSwtchList` derrière une option de compatibilité.

### L3D Studio

- [ ] Ajouter un registre TypeScript indexé par ID et nom historique.
- [ ] Déplacer noms, labels, descriptions et configuration UI dans TypeScript.
- [ ] Utiliser le protocole v2 quand il est disponible.
- [ ] Conserver le fallback vers les variables historiques.
- [ ] Tester L3D Studio avec l'ancien et le nouveau firmware.

### Retrait progressif

- [ ] Déployer L3D Studio compatible v1 et v2 avant le firmware sans métadonnées.
- [ ] Mesurer le gain obtenu en désactivant les métadonnées historiques.
- [ ] Conserver une option de build `LEGACY_CLOUD_METADATA` pendant la période de transition.
- [ ] Documenter la version minimale de L3D Studio requise.

### Critère de sortie

- [ ] L3D Studio pilote le cube sans dépendre des gros buffers de métadonnées.
- [ ] L'ancien protocole peut encore être réactivé pour diagnostic ou rollback.

## Phase 10 — Fonctionnalités réseau optionnelles

### CheerLights et IFTTT

- [ ] Mesurer séparément la flash et la RAM de CheerLights.
- [ ] Remplacer hostname et path par des constantes en flash.
- [ ] Supprimer la réponse `String` dynamique.
- [ ] Ajouter un timeout et une fermeture explicite du `TCPClient`.
- [ ] Rendre CheerLights désactivable à la compilation.
- [ ] Mesurer séparément le coût réel d'IFTTTWeather.
- [ ] Ne supprimer IFTTTWeather qu'après décision fonctionnelle.

### UDP Listener

- [ ] Partager son buffer avec l'espace scratch si possible.
- [ ] Valider toutes les tailles et tous les numéros de paquets avant copie.
- [ ] Fermer UDP à la sortie du mode Listener.
- [ ] Vérifier que l'activation UDP ne dégrade pas Particle Cloud.

### Particle Cloud

- [ ] Conserver Particle Cloud activé dans la version principale.
- [ ] Mesurer le comportement mémoire pendant une reconnexion complète.
- [ ] Ne pas désactiver le thread système uniquement pour gagner de la RAM.
- [ ] Ne pas commencer l'API LAN dans cette phase.

### Critère de sortie

- [ ] Chaque fonction réseau optionnelle a un coût mémoire documenté.
- [ ] Les fonctions inutilisées peuvent être exclues sans modifier le core.

## Phase 11 — Stockage EEPROM versionné

### Layout

- [ ] Décrire le layout EEPROM historique octet par octet.
- [ ] Ajouter une version et une signature de configuration.
- [ ] Ajouter un contrôle d'intégrité simple pour les réglages persistés.
- [ ] Valider toutes les valeurs chargées avant utilisation.
- [ ] Conserver les réglages historiques lors de la première mise à jour si possible.
- [ ] Prévoir une migration idempotente de l'ancien layout.
- [ ] Prévoir une remise aux valeurs par défaut sûre en cas de données invalides.

### Usure et écritures

- [ ] Écrire uniquement lorsque la valeur change.
- [ ] Éviter toute écriture EEPROM dans la boucle de rendu.
- [ ] Documenter les écritures de CubePainter et leur fréquence.

### Critère de sortie

- [ ] Une mise à jour depuis Spark Pixels Mega 1.4 conserve les réglages attendus.
- [ ] Une interruption pendant la migration ne bloque pas le démarrage suivant.

## Phase 12 — Tests d'endurance et validation MVP

### Matrice de tests

- [ ] Tester chaque mode actif avec vitesse minimale et maximale.
- [ ] Tester chaque mode actif avec luminosité minimale et maximale sûre.
- [ ] Tester toutes les couleurs et tous les switches déclarés.
- [ ] Tester le texte vide, court, maximal et contenant des caractères non ASCII.
- [ ] Tester CubePainter et son stockage EEPROM.
- [ ] Tester Shuffle sur un cycle complet sans répétition incorrecte.
- [ ] Tester les changements de mode pendant une transition.
- [ ] Tester les commandes répétées et les commandes invalides.
- [ ] Tester un redémarrage à froid et un redémarrage logiciel.
- [ ] Tester une coupure réseau prolongée puis la reconnexion.

### Endurance

- [ ] Exécuter une séquence de tous les modes pendant 24 h.
- [ ] Exécuter Shuffle pendant 24 h.
- [ ] Enregistrer le minimum de mémoire libre par mode.
- [ ] Vérifier l'absence de dérive du temps de frame.
- [ ] Vérifier l'absence de fuite ou fragmentation croissante observable.
- [ ] Vérifier que le cube reste contrôlable depuis L3D Studio.

### Critère de sortie

- [ ] Tous les tests de compatibilité sont validés.
- [ ] Tous les budgets globaux sont respectés.
- [ ] Un binaire de rollback validé est conservé.

## Phase 13 — Évaluation des modes désactivés

Chaque mode doit être réactivé séparément et ne doit pas être fusionné avec le
refactor principal.

### Hyper

- [ ] Réactiver Hyper dans une branche ou option de build isolée.
- [ ] Mesurer son coût flash, RAM et temps de frame.
- [ ] Vérifier le rendu après optimisation des calculs flottants.
- [ ] Exécuter un test de 2 h.

### Life

- [ ] Définir une représentation compacte des 512 cellules.
- [ ] Utiliser un bitset de 64 octets par génération si le comportement le permet.
- [ ] Mutualiser les générations avec l'espace scratch.
- [ ] Mesurer et exécuter un test de 2 h.

### Listener

- [ ] Réactiver Listener avec le buffer UDP partagé.
- [ ] Valider strictement les paquets TPM2.NET.
- [ ] Tester les paquets cube complet et plan unique.
- [ ] Tester la coexistence avec Particle Cloud.

### Roman

- [ ] Compacter la structure Rocket.
- [ ] Réduire ou borner explicitement le nombre de fusées actives.
- [ ] Remplacer les coordonnées flottantes par fixed-point si le rendu le permet.
- [ ] Mesurer et exécuter un test de 2 h.

### Décision

- [ ] Réactiver uniquement les modes respectant les budgets globaux.
- [ ] Documenter les modes refusés et la raison mesurée.
- [ ] Ne pas dégrader la stabilité des modes déjà validés.

## Phase 14 — Préparation du futur transport LAN

Cette phase ne doit ajouter aucun serveur LAN au firmware actuel.

- [ ] Isoler les commandes métier du transport Particle Cloud.
- [ ] Définir une interface de transport sans allocation dynamique.
- [ ] Documenter les besoins de découverte, authentification et sécurité LAN.
- [ ] Estimer les buffers nécessaires pour HTTP, UDP, TCP et WebSocket.
- [ ] Comparer le coût mémoire de chaque option sur Photon Gen 2.
- [ ] Décider si le Photon dispose d'une marge suffisante après refactor.
- [ ] Envisager Photon 2/P2 si l'API LAN et Particle Cloud doivent coexister.
- [ ] Créer un plan séparé avant toute implémentation LAN.

## Phase 15 — Livraison

- [ ] Mettre à jour la version du firmware et son historique.
- [ ] Documenter la procédure de compilation Device OS 2.3.1.
- [ ] Documenter la procédure de flash et de rollback.
- [ ] Documenter le protocole v1 et le protocole v2.
- [ ] Documenter les budgets finaux flash et RAM.
- [ ] Documenter le minimum mémoire observé par mode.
- [ ] Publier un binaire de test identifié sans secret.
- [ ] Valider le binaire sur le Photon réel avant diffusion générale.
- [ ] Mettre à jour L3D Studio seulement après validation du firmware correspondant.

## Règles de travail pour chaque tâche

- [ ] Partir d'une mesure avant modification.
- [ ] Ne réaliser qu'une optimisation logique à la fois.
- [ ] Compiler après chaque modification significative.
- [ ] Comparer flash et RAM avec la mesure précédente.
- [ ] Tester le mode concerné sur le cube réel.
- [ ] Vérifier les commandes L3D Studio concernées.
- [ ] Enregistrer les gains, pertes et écarts visuels.
- [ ] Revenir en arrière si le gain n'est pas mesurable ou si la stabilité baisse.
- [ ] Ne jamais écrire un token, mot de passe ou device ID dans le projet.
- [ ] Ne jamais modifier la source upstream dans `download/`.

## Définition de terminé

Le refactor principal sera considéré terminé lorsque :

- [ ] le firmware est découpé en modules à responsabilité claire ;
- [ ] tous les modes précédemment actifs restent disponibles ;
- [ ] L3D Studio peut piloter l'ancien et le nouveau protocole ;
- [ ] les budgets flash, RAM statique et mémoire libre sont respectés ;
- [ ] aucune allocation dynamique applicative ne subsiste dans la boucle normale ;
- [ ] les transitions n'utilisent plus de gros buffer sur la pile ;
- [ ] les états des animations sont compacts et mutualisés ;
- [ ] les diagnostics mémoire et performance sont actualisables ;
- [ ] un test d'endurance de 24 h passe sans panic ni fuite observable ;
- [ ] une procédure de rollback validée est disponible ;
- [ ] la décision de réactivation de chaque mode désactivé est documentée par des mesures.
