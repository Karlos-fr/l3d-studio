# Plan d'implementation du serveur LAN L3D

## Objectif

Ajouter au firmware Photon un premier serveur HTTP local, léger et optionnel,
puis permettre à L3D Studio de l'utiliser pour lire les diagnostics, suivre les
KPI et appeler progressivement les fonctions aujourd'hui exposées par Particle
Cloud.

Cette première version doit coexister avec Particle Cloud. Elle prépare son
remplacement éventuel sans le désactiver et sans modifier les IDs de modes, les
commandes historiques ou le comportement visuel des animations.

## Décisions de cette première version

- Le transport retenu est un sous-ensemble HTTP sur `TCPServer`, directement
  utilisable par `fetch()` dans l'application web.
- Le serveur est limité au réseau local et ne doit jamais être exposé par une
  redirection de port Internet.
- L'authentification et le chiffrement sont volontairement reportés hors de ce
  premier chantier.
- Particle Cloud reste compilé, actif et utilisable comme transport de secours.
- Le serveur, Particle Cloud et les futures interfaces doivent appeler une même
  logique métier ; aucun comportement de commande ne doit être dupliqué.
- Le firmware n'embarque ni bibliothèque HTTP complète, ni bibliothèque JSON,
  ni allocation dynamique applicative.
- Les réponses utilisent un format texte compact, versionné et borné.
- L'application conserve son architecture TypeScript sans framework UI.
- Les graphiques sont produits en SVG natif, sans nouvelle dépendance.

## API cible de la première version

Les noms et formats exacts sont figés pendant la phase de contrat avant leur
implémentation.

| Méthode et route | Fonction | Équivalent actuel |
| --- | --- | --- |
| `GET /api/v1/health` | Vérifier que le serveur et le firmware répondent | Aucun appel métier |
| `GET /api/v1/diagnostics` | Obtenir immédiatement un échantillon de KPI | `GETDIAG`, puis `deviceInfo` |
| `POST /api/v1/diagnostics/reset` | Réinitialiser les minimums et statistiques | `RESETDIAG`, puis `deviceInfo` |
| `GET /api/v1/state` | Lire le mode et les réglages courants | Variables Particle courantes |
| `GET /api/v1/modes` | Lire le catalogue dynamique des modes | `modeList` et `modeParmList` |
| `GET /api/v1/aux-switches` | Lire les switches auxiliaires | `auxSwtchList` |
| `POST /api/v1/command` | Appeler le routeur de commandes | `Function` / `FnRouter` |
| `POST /api/v1/mode` | Appliquer une commande Spark Pixels | `SetMode` |
| `POST /api/v1/text` | Modifier le texte persistant | `SetText` |
| `POST /api/v1/cube-painter` | Envoyer une commande CubePainter bornée | `CubePainter` |

Toutes les réponses doivent contenir au minimum une version de protocole et un
résultat exploitable. Une erreur doit employer un statut HTTP cohérent et un
code numérique stable, sans exposer de texte non borné.

## KPI suivis dans L3D Studio

| Groupe | Valeurs |
| --- | --- |
| Mémoire | mémoire libre courante, minimum global, minimum du mode, avant et après frame |
| Performance | durée dernière, moyenne et pire frame, FPS moyen |
| Exécution | uptime, ID du mode, compteur de frames et changements de mode |
| Stabilité | dernier refus d'allocation, nombre d'événements OOM, cause du dernier reset |
| Réseau | Wi-Fi prêt, Particle connecté, délai de réponse LAN, erreurs consécutives |

Les durées de frame sont converties de microsecondes en millisecondes uniquement
dans l'application. Les valeurs brutes du firmware restent entières.

## Budgets et règles transversales

- [ ] Conserver la cible de référence Photon avec Device OS 2.3.1.
- [ ] Conserver Particle Cloud opérationnel pendant toutes les phases.
- [ ] Protéger le serveur par `L3D_LOCAL_API_ENABLED`, désactivable à la compilation.
- [ ] Ne pas ajouter de `String`, `new`, `vector`, `malloc` ou allocation dynamique dans le serveur.
- [ ] Ne placer aucun buffer local supérieur à 256 octets sur la pile.
- [ ] Autoriser un seul client TCP et une seule requête en cours.
- [ ] Borner le chemin, les en-têtes, le corps et toutes les réponses.
- [ ] Fermer chaque connexion après la réponse ; ne pas implémenter le keep-alive.
- [ ] Limiter le travail réseau accompli pendant un passage de boucle.
- [ ] Conserver les commentaires de sources en français selon `AGENT.md`.
- [ ] Mesurer Flash, RAM statique et mémoire libre minimale après chaque phase firmware.
- [ ] Effectuer tous les tests visuels du cube avec une luminosité `B:1`.

## Phase 0 — Baseline et contrat du protocole

### Mesures initiales

- [x] Compiler le firmware inchangé avec `firmware/tools/compile.ps1` pour Device OS 2.3.1.
- [x] Relever Flash, RAM statique, taille du binaire et marge restante.
- [x] Relever `System.freeMemory()` au démarrage et le minimum après plusieurs animations représentatives.
- [x] Relever le comportement de `GETDIAG` pendant une animation courte et une animation longue.
- [x] Vérifier la reconnexion Wi-Fi et Particle Cloud avant ajout du serveur.
- [x] Enregistrer la baseline dans `firmware/docs/BASELINE.md`.

### Contrat HTTP

- [x] Fixer le port TCP local et le rendre configurable par une constante documentée.
- [x] Fixer les limites du chemin, d'une ligne d'en-tête, du corps et de la réponse.
- [x] Définir la grammaire exacte des réponses compactes version 1.
- [x] Définir les statuts HTTP pour succès, requête invalide, route inconnue, taille excessive et indisponibilité.
- [x] Définir les codes d'erreur firmware négatifs associés.
- [x] Définir les en-têtes CORS nécessaires à l'application locale et à l'application publiée.
- [x] Définir la réponse aux requêtes `OPTIONS` sans exécuter de commande.
- [x] Définir un timeout total de connexion et un timeout d'inactivité.
- [x] Documenter explicitement l'absence d'authentification dans cette version.

### Critère de sortie

- [x] La baseline est reproductible et le contrat peut être testé sans dépendre de son implémentation.

## Phase 1 — Séparation des commandes et du transport Particle

### Firmware

- [x] Inventorier les dépendances de `FnRouter`, `SetMode`, `SetText` et `CubePainter` envers `String` et Particle.
- [x] Définir des fonctions métier recevant un pointeur et une longueur bornée.
- [x] Adapter `FnRouter` pour déléguer à la fonction métier sans changer ses valeurs de retour.
- [x] Adapter `SetMode` pour déléguer à la fonction métier sans changer les commandes historiques.
- [x] Conserver `SetText` comme adaptateur Particle autour de `setTextFromBuffer()`.
- [x] Ajouter un adaptateur borné pour CubePainter sans modifier son protocole.
- [x] Vérifier que la logique métier ne connaît ni `Particle.function`, ni HTTP, ni le DOM.
- [x] Ajouter ou corriger les commentaires français de chaque fonction historique modifiée.

### Tests

- [x] Tester les commandes vides, maximales, trop longues, tronquées et malformées.
- [x] Tester que les adaptateurs Particle et buffer fixe retournent les mêmes résultats.
- [x] Tester que les erreurs ne modifient ni le mode, ni l'EEPROM, ni le framebuffer.
- [x] Compiler et comparer les mesures avec la phase 0.

### Critère de sortie

- [x] Une commande valide produit le même résultat par l'adaptateur Particle et par l'interface à buffer fixe.

## Phase 2 — Socle TCP et parseur HTTP borné

### Structure

- [x] Créer `src/network/local_api_server.h` pour l'interface publique du serveur.
- [x] Créer `src/network/local_api_server.cpp` pour le cycle de vie TCP.
- [x] Créer `src/network/local_http_parser.h` et `.cpp` pour le parseur borné indépendant des commandes.
- [x] Ajouter `L3D_LOCAL_API_ENABLED` et les capacités maximales dans `src/config/build_config.h`.
- [x] Ajouter des en-têtes et commentaires de fonctions conformes à `AGENT.md`.

### Cycle réseau

- [x] Démarrer `TCPServer` uniquement lorsque le Wi-Fi est prêt.
- [x] Redémarrer l'écoute après une perte et un retour du Wi-Fi.
- [x] Accepter un seul `TCPClient` à la fois.
- [x] Lire la requête progressivement sans boucle d'attente bloquante.
- [x] Limiter le nombre d'octets traité à chaque passage dans `loop()`.
- [x] Abandonner et fermer les connexions incomplètes après timeout.
- [x] Fermer explicitement le client après chaque réponse.
- [x] Traiter `GET`, `POST` et `OPTIONS`, puis refuser les autres méthodes.
- [x] Refuser un `Content-Length` absent lorsqu'un corps est obligatoire.
- [x] Refuser un corps supérieur à la limite avant de le copier.
- [x] Ignorer de façon bornée les en-têtes inconnus.

### Intégration à la boucle

- [x] Appeler `localApiProcess()` depuis la boucle principale sans ralentir le rendu.
- [x] Identifier les animations qui peuvent encore retarder le traitement local.
- [x] Faire coopérer les traitements longs avec un service réseau commun lorsque nécessaire.
- [x] Vérifier que `SYSTEM_THREAD(ENABLED)` n'est pas considéré comme un substitut à cette coopération.

### Tests

- [x] Tester les requêtes complètes, fragmentées octet par octet et interrompues.
- [x] Tester les chemins et en-têtes aux tailles limites.
- [x] Tester une longueur annoncée incorrecte et un corps excessif.
- [x] Tester les timeouts et la fermeture du client.
- [x] Tester les requêtes répétées sans croissance de la mémoire minimale.
- [x] Compiler avec le serveur activé puis désactivé et comparer les empreintes.

### Critère de sortie

- [x] Le serveur répond à une route de test, survit aux entrées invalides et ne bloque ni les animations ni Particle Cloud.

## Phase 3 — Santé et diagnostics locaux

### Firmware

- [x] Ajouter `GET /api/v1/health` avec version firmware, version API, uptime et état Wi-Fi.
- [x] Extraire la production des diagnostics compacts vers une fonction écrivant dans un buffer fourni et borné.
- [x] Conserver exactement le parcours Particle `GETDIAG`, séquence et `deviceInfo`.
- [x] Ajouter `GET /api/v1/diagnostics` avec génération directe entre deux frames.
- [x] Ajouter `POST /api/v1/diagnostics/reset` avec remise à zéro puis réponse actualisée.
- [x] Inclure un numéro d'échantillon local monotone dans chaque réponse.
- [x] Mesurer et exposer le délai de service de la requête sans utiliser de flottants.
- [x] Vérifier qu'aucune réponse LAN n'écrase prématurément le contenu historique de `deviceInfo`.

### Tests

- [x] Tester chaque clé du format compact et les valeurs aux bornes entières.
- [x] Comparer un échantillon LAN avec un échantillon Particle pris dans le même mode.
- [x] Vérifier que seul l'endpoint de reset efface les minimums.
- [x] Vérifier les diagnostics pendant les animations courtes et longues.
- [ ] Répéter les lectures pendant au moins une heure et surveiller le minimum mémoire — reporté à la phase 9.

### Critère de sortie

- [x] Un diagnostic LAN ne consomme aucune Data Operation Particle et reste cohérent avec `GETDIAG`.

## Phase 4 — Lecture de l'état et des capacités

### Firmware

- [x] Ajouter `GET /api/v1/state` avec mode ID, nom courant, luminosité, vitesse, couleurs et switches courants.
- [x] Ajouter l'état Wi-Fi, Particle et le dernier code de commande sans recopier de gros buffers.
- [x] Ajouter `GET /api/v1/modes` en réutilisant le catalogue dynamique historique.
- [x] Ajouter `GET /api/v1/aux-switches` en réutilisant les métadonnées historiques.
- [x] Décider et tester une pagination compacte si une réponse dépasse la capacité fixée.
- [x] Garantir un instantané cohérent même si un changement de mode est demandé pendant la lecture.
- [x] Versionner séparément le schéma d'état et le format des diagnostics.

### Application

- [x] Définir les types TypeScript des réponses LAN dans un module dédié.
- [x] Ajouter des parseurs purs pour santé, diagnostics, état, modes et switches.
- [x] Tester les champs inconnus, manquants, invalides et les versions non prises en charge.

### Critère de sortie

- [x] L'application peut reconstruire l'état actuellement obtenu par les variables Particle à partir du LAN.

## Phase 5 — Commandes locales

### Firmware

- [x] Ajouter `POST /api/v1/command` vers le routeur commun de `FnRouter`.
- [x] Ajouter `POST /api/v1/mode` vers le parseur commun de `SetMode`.
- [x] Ajouter `POST /api/v1/text` vers `setTextFromBuffer()`.
- [x] Ajouter `POST /api/v1/cube-painter` vers l'adaptateur borné CubePainter.
- [x] Retourner le code historique de chaque commande dans une enveloppe compacte commune.
- [x] Ne modifier aucun ID de mode, format de commande ou code de succès existant.
- [x] Refuser une seconde commande tant que la première n'est pas entièrement traitée.
- [x] Vérifier qu'un client déconnecté ne laisse aucune commande partielle applicable.

### Tests

- [x] Exécuter la même matrice de commandes via Particle et via le LAN.
- [x] Tester les commandes successives et les changements de mode rapides.
- [ ] Tester les commandes pendant une animation et pendant une reconnexion Particle — animation validée ; fenêtre LAN avec `Particle.connected()==false` non observée après reboot, reportée à la phase 9.
- [x] Tester les écritures EEPROM sans augmenter leur fréquence historique.
- [ ] Tester le rendu matériel avec `B:1` uniquement.

### Critère de sortie

- [x] Les fonctions historiques exposées dans la table API sont utilisables sur le LAN sans régression Particle.

## Phase 6 — Client LAN et abstraction de transport dans L3D Studio

### Modules

- [x] Créer `app/src/lan/client.ts` pour les appels HTTP LAN uniquement.
- [x] Créer `app/src/lan/types.ts` pour les contrats réseau LAN.
- [x] Créer une interface de transport Spark Pixels indépendante de Particle et du DOM.
- [x] Fournir un adaptateur Particle conservant le comportement actuel.
- [x] Fournir un adaptateur LAN utilisant les nouvelles routes.
- [x] Ajouter un mode `Automatique` essayant le LAN puis Particle sans dupliquer une commande incertaine.
- [x] Séparer les erreurs de connexion, timeout, protocole et commande refusée.
- [x] Ajouter des tests avec `fetch` simulé pour chaque route et chaque erreur.
- [x] Documenter toutes les fonctions, callbacks et constantes en français.

### Configuration utilisateur

- [x] Ajouter le choix de transport `Automatique`, `LAN` ou `Particle`.
- [x] Ajouter un champ d'adresse ou de nom local du Photon et le port.
- [x] Normaliser l'adresse sans accepter de chemin arbitraire.
- [x] Ajouter un bouton de test appelant uniquement `/api/v1/health`.
- [x] Enregistrer localement le transport et l'adresse, jamais un identifiant personnel dans le dépôt.
- [x] Afficher clairement le transport réellement utilisé pour la dernière opération.
- [x] Ne pas imposer une connexion Particle lorsque le mode LAN est explicitement sélectionné.

### Critère de sortie

- [x] L3D Studio peut lire et commander le cube par LAN, Particle ou fallback automatique.

## Phase 7 — Interface de surveillance des diagnostics

### Contrôles

- [ ] Ajouter un panneau `Diagnostics` distinct des informations historiques `Device Info`.
- [ ] Ajouter un bouton `Actualiser maintenant`.
- [ ] Ajouter un interrupteur `Surveillance périodique` désactivé par défaut.
- [ ] Proposer des intervalles LAN raisonnables, par exemple 5, 10, 30 et 60 secondes.
- [ ] Afficher l'heure du dernier échantillon, sa source et sa latence.
- [ ] Ajouter un bouton explicite de remise à zéro des minimums.
- [ ] Demander confirmation avant d'appeler la remise à zéro.
- [ ] Afficher le dernier échec sans effacer le dernier échantillon valide.

### Orchestration

- [ ] Utiliser un `setTimeout` récursif afin d'interdire les appels superposés.
- [ ] Annuler le timer au changement de transport, d'adresse, de device ou à la déconnexion.
- [ ] Suspendre les appels lorsque l'onglet est masqué et reprendre sans rafale.
- [ ] Ajouter un timeout borné et un ralentissement progressif après plusieurs échecs.
- [ ] Pour Particle, appeler `GETDIAG`, puis relire `deviceInfo` jusqu'à la séquence attendue.
- [ ] Pour le LAN, lire directement `/api/v1/diagnostics` sans séquence Particle.
- [ ] Comptabiliser et afficher l'estimation des Data Operations lorsque Particle est utilisé.
- [ ] Ne jamais appeler automatiquement `RESETDIAG`.
- [ ] Conserver un historique circulaire borné en nombre d'échantillons.

### KPI instantanés

- [ ] Afficher la mémoire libre et les minimums en octets et Kio.
- [ ] Afficher dernière, moyenne et pire durée de frame en millisecondes.
- [ ] Afficher les FPS, l'uptime, le mode et le nombre de frames.
- [ ] Afficher Wi-Fi, Particle, cause de reset et événements OOM.
- [ ] Signaler visuellement une baisse du minimum mémoire ou une hausse du compteur OOM.

### Critère de sortie

- [ ] La surveillance peut fonctionner durablement sans chevauchement, sans reset implicite et sans fuite de timers.

## Phase 8 — Graphiques de suivi des KPI

### Modèle de données

- [ ] Définir un type d'échantillon horodaté commun aux transports LAN et Particle.
- [ ] Conserver les valeurs firmware brutes et calculer séparément les unités affichées.
- [ ] Utiliser un buffer circulaire avec une capacité fixe configurable.
- [ ] Insérer une rupture de courbe après une interruption ou un redémarrage détecté.
- [ ] Réinitialiser l'historique sur changement de cube ou sur action utilisateur explicite.

### Rendu SVG

- [ ] Créer un module de graphique SVG sans dépendance et sans logique réseau.
- [ ] Ajouter une courbe `Mémoire` pour libre courante, minimum global et minimum du mode.
- [ ] Ajouter une courbe `Temps de frame` pour dernière, moyenne et pire durée.
- [ ] Ajouter une courbe `FPS` avec une échelle indépendante.
- [ ] Marquer les changements de mode, resets et événements OOM sur la chronologie.
- [ ] Ajouter axes, unités, légende, heure locale et indication des données manquantes.
- [ ] Adapter la largeur au conteneur sans relancer les appels réseau.
- [ ] Fournir une alternative textuelle résumant minimum, maximum et dernière valeur.
- [ ] Limiter le nombre de points SVG rendus afin de conserver une interface fluide.

### Interaction

- [ ] Permettre de sélectionner une fenêtre temporelle courte ou complète.
- [ ] Ajouter un bouton pour effacer uniquement l'historique graphique.
- [ ] Afficher la valeur et l'heure d'un point au survol ou au focus clavier.
- [ ] Ne pas rerendre les champs de formulaire sans rapport lors de l'ajout d'un échantillon.

### Tests

- [ ] Tester les échelles avec valeurs constantes, extrêmes et manquantes.
- [ ] Tester le passage de `micros()` à millisecondes et de FPS dixièmes à FPS.
- [ ] Tester le buffer circulaire et les ruptures de séries.
- [ ] Tester le rendu d'un historique vide, d'un point unique et de la capacité maximale.
- [ ] Vérifier le rendu sur écran étroit et large.

### Critère de sortie

- [ ] Les courbes permettent d'identifier une dérive mémoire, un ralentissement de frame et une perte de disponibilité.

## Phase 9 — Validation intégrée et endurance

### Automatisation

- [ ] Lancer tous les tests hôte du firmware.
- [ ] Ajouter les tests hôte du parseur HTTP, du routage et des formats compacts.
- [ ] Lancer tous les tests Vitest de l'application.
- [ ] Ajouter les tests du client LAN, du poller, des parseurs et du modèle graphique.
- [ ] Lancer `npm run build` et la compilation Particle 2.3.1.
- [ ] Vérifier automatiquement l'absence d'allocations dynamiques dans les nouveaux modules firmware.
- [ ] Vérifier les règles de commentaires de `AGENT.md` dans tous les nouveaux fichiers source.

### Photon réel

- [ ] Flasher une variante identifiée avec serveur LAN activé.
- [ ] Vérifier `/health`, diagnostics, état et toutes les commandes exposées.
- [ ] Vérifier le pilotage Particle avant, pendant et après les appels LAN.
- [ ] Tester une perte Wi-Fi, un changement d'adresse DHCP et une reconnexion.
- [ ] Tester un client qui ouvre une connexion sans terminer sa requête.
- [ ] Tester plusieurs heures de surveillance avec différentes animations à `B:1`.
- [ ] Tester des changements de mode pendant la surveillance et les graphiques.
- [ ] Relever Flash, RAM statique, mémoire libre courante et minimum observé.
- [ ] Comparer les mesures finales à la baseline de phase 0.
- [ ] Vérifier que le mode LAN ne consomme aucune Data Operation Particle imputable aux diagnostics.

### Critère de sortie

- [ ] Le Photon reste contrôlable par les deux transports, sans fuite mémoire, blocage réseau ou régression visuelle observée.

## Phase 10 — Documentation et livraison

- [ ] Documenter l'API LAN, ses formats, limites, erreurs et exemples `curl`.
- [ ] Documenter la configuration de l'adresse locale dans L3D Studio.
- [ ] Documenter les différences entre diagnostics LAN et Particle.
- [ ] Documenter les KPI et l'interprétation de chaque courbe.
- [ ] Documenter les contraintes des navigateurs pour l'accès au réseau local.
- [ ] Documenter l'absence volontaire de sécurité dans cette première version.
- [ ] Documenter la désactivation par `L3D_LOCAL_API_ENABLED=0` comme rollback fonctionnel.
- [ ] Mettre à jour `README.md`, `firmware/docs/DIAGNOSTICS.md` et `CHANGELOG.md`.
- [ ] Archiver les mesures finales dans `firmware/docs/BASELINE.md`.
- [ ] Produire un binaire de test identifié sans secret ni configuration personnelle.

### Critère de sortie

- [ ] Un utilisateur peut configurer, tester, surveiller et piloter son cube sur le LAN en suivant uniquement la documentation du dépôt.

## Définition de terminé

- [ ] Le serveur local est optionnel, borné, non bloquant et sans allocation dynamique applicative.
- [ ] Particle Cloud et le LAN partagent les mêmes fonctions métier.
- [ ] Tous les endpoints de la table API sont implémentés et testés.
- [ ] L3D Studio propose les transports LAN, Particle et Automatique.
- [ ] Les diagnostics ponctuels et périodiques fonctionnent avec les deux transports.
- [ ] Les courbes mémoire, temps de frame et FPS utilisent un historique borné.
- [ ] Le firmware reste compatible Photon Device OS 2.3.1.
- [ ] Les mesures finales n'indiquent ni fuite mémoire ni dégradation bloquante.
- [ ] Les tests matériels sont réalisés à `B:1` et distingués des tests automatisés.
- [ ] La documentation décrit clairement les limites de cette première version non sécurisée.
