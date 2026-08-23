# Plan d'implémentation des animations procédurales L3D

## Objectif

Permettre à L3D Studio de compiler, installer et lancer sur le cube une
animation procédurale sans reflasher le firmware. Le Photon exécute un bytecode
L3D compact, autonome et sandboxé, sans allocation dynamique.

Ce chantier ne traite ni sprites, ni images, ni frames pré-calculées. Les
animations natives C++ et le streaming existant restent disponibles.

## Architecture cible

```text
Source procédurale dans L3D Studio
        ↓
Compilateur et simulateur TypeScript
        ↓
Bytecode compact, versionné et contrôlé
        ↓ HTTP LAN
Stockage persistant borné du Photon
        ↓
VM coopérative L3D
        ↓
Primitives natives → framebuffer 8 × 8 × 8
```

## Décisions initiales

- Le bytecode décrit des procédures de rendu, jamais des images.
- La première version vise au minimum un programme persistant installable.
- Le nombre d'emplacements dépendra des tailles mesurées en phase 0.
- CubePainter reste intact tant qu'une décision explicite ne prévoit pas le
  partage ou le remplacement de sa zone EEPROM.
- La compaction s'effectue d'abord dans le compilateur TypeScript.
- Une compression généraliste n'est ajoutée que si son gain net est mesuré.
- L'installation utilise uniquement l'API LAN dans la première version.
- Les IDs et comportements historiques restent inchangés.

## Périmètre de la version 1

Le langage fournit des registres entiers, couleurs, voxels, primitives
géométriques, hasard, calculs bornés, conditions, boucles et temporisations
coopératives. Il ne contient ni flottants obligatoires, ni récursion, ni accès
mémoire arbitraire, ni code natif téléchargeable.

La VM limite le nombre d'instructions exécutées par passage et rend la main sur
`WAIT` ou `YIELD`. Un programme invalide ou bloquant est arrêté sans perturber
Particle, le serveur LAN ou les autres animations.

## Règles transversales

- [x] Conserver Photon et Device OS 2.3.1 comme cible de référence.
- [x] Protéger l'ensemble par `L3D_BYTECODE_ENABLED`.
- [x] Ne pas ajouter de `String`, `new`, `vector`, `malloc` ou allocation dynamique au firmware.
- [x] Ne placer aucun buffer local supérieur à 256 octets sur la pile.
- [x] Réutiliser le scratch partagé seulement pendant le mode bytecode.
- [x] Ne pas réserver un second framebuffer.
- [x] Valider toute longueur, coordonnée, instruction et cible de saut.
- [x] Écrire en EEPROM uniquement lors d'une installation ou suppression explicite.
- [x] Maintenir Particle, l'API LAN et les diagnostics pendant l'exécution.
- [x] Appliquer les règles de commentaires français de `AGENT.md`.
- [ ] Mesurer Flash, RAM, EEPROM et temps de frame après chaque phase firmware. Flash, RAM et EEPROM sont mesurées ; le temps de frame attend le Photon.
- [ ] Réaliser les validations visuelles matérielles avec `B:1`.

## Phase 0 — Faisabilité et choix du stockage

### Mesures

- [x] Recompiler le firmware courant avec `firmware/tools/compile.ps1`.
- [x] Archiver Flash, RAM statique, taille du binaire et marge Flash.
- [x] Relever la mémoire libre et son minimum sur le Photon.
- [ ] Relever `EEPROM.length()` sur le matériel.
- [x] Documenter le layout EEPROM actuel et sa dernière adresse utilisée.
- [x] Calculer la capacité disponible sans modifier CubePainter.
- [x] Confirmer les 1 536 octets disponibles dans le scratch d'animation partagé.

### Prototype TypeScript sans firmware

- [x] Décrire Rain, une sphère rebondissante, Fireworks et Plasma comme corpus de référence.
- [x] Lister les opérations et primitives nécessaires à chaque animation.
- [x] Créer un encodeur expérimental TypeScript sans IHM.
- [x] Définir uniquement les opcodes nécessaires au corpus.
- [x] Compiler les quatre animations dans un premier format compact.
- [x] Mesurer en-tête, instructions et constantes de chaque programme.
- [x] Écarter toute primitive utilisée une seule fois sans gain suffisant.
- [x] Archiver les résultats dans `firmware/docs/BYTECODE_BASELINE.md`.

### Décision

- [x] Fixer la taille maximale d'un programme installé à partir des mesures.
- [x] Décider entre un emplacement unique et plusieurs emplacements fixes.
- [x] Vérifier qu'au moins Rain et la sphère tiennent dans la solution retenue.
- [x] Si la zone libre est insuffisante, comparer partage de CubePainter, mémoire externe et migration matérielle.
- [x] Consigner la décision avant toute modification du layout EEPROM.

### Critère de sortie

- [x] Le corpus est mesuré et le stockage de la version 1 est choisi sans estimation non vérifiée.

## Phase 1 — Format et règles de la VM

### Conteneur

- [x] Définir signature, version, longueur, point d'entrée et capacités requises.
- [x] Définir l'ordre des octets et la taille de chaque champ.
- [x] Ajouter un CRC couvrant l'en-tête utile et le programme.
- [x] Définir un état vide impossible à exécuter.
- [x] Ajouter un nom borné seulement si le budget mesuré le permet.

### Instructions

- [x] Définir `CLEAR`, `VOXEL`, `COLOR`, `WAIT` et `YIELD`.
- [x] Définir chargement, copie, addition, soustraction et comparaison de registres.
- [x] Définir `RAND`, branchements relatifs et boucles.
- [x] Retenir les primitives géométriques justifiées par le corpus.
- [x] Retenir les fonctions compactes de couleur ou de mathématiques nécessaires.
- [x] Réserver les opcodes futurs sans les implémenter.

### Sandbox

- [x] Fixer nombre et largeur des registres.
- [x] Fixer dépassements arithmétiques, division par zéro et graine aléatoire.
- [x] Interdire récursion, pointeurs et accès direct à la mémoire.
- [x] Fixer le quota d'instructions par passage et sans `WAIT` ou `YIELD`.
- [x] Définir arrêt normal, arrêt utilisateur, timeout et faute.
- [x] Définir des codes d'erreur stables et négatifs.
- [x] Documenter le contrat dans `firmware/docs/BYTECODE_FORMAT.md`.

### Critère de sortie

- [x] Toute ressource consommée par un programme est bornée par le format.

## Phase 2 — Assembleur L3D et simulateur TypeScript

Les animations sont écrites directement dans un assembleur textuel `.l3d`.
TypeScript implémente les outils du navigateur, mais ne constitue pas le
langage source des animations.

### Assemblage

- [x] Créer des modules dédiés au format, au CRC, à l'assemblage et à la validation.
- [x] Accepter une syntaxe `.l3d` limitée à une instruction ou un label par ligne.
- [x] Résoudre les labels en deux passes et produire les branchements relatifs.
- [x] Refuser mnémoniques, registres et valeurs hors plage.
- [x] Produire des erreurs indiquant ligne et cause.
- [x] Calculer longueur, capacités requises, point d'entrée et CRC.
- [x] Garantir une sortie binaire identique pour une source et une génération identiques.
- [x] Ajouter un désassembleur minimal pour les tests et diagnostics.

### Encodage compact

- [x] Encoder les paires de registres dans leurs nibbles contractuels.
- [x] Utiliser uniquement les tailles d'opérandes définies par le format version 1.
- [x] Ne pas ajouter d'optimisation de langage, de code mort ou d'expression dans la version 1.
- [x] Mesurer séparément en-tête et payload du corpus assemblé.

### VM de référence

- [x] Implémenter la sémantique complète dans une VM TypeScript indépendante du DOM.
- [x] Appliquer les mêmes quotas et fautes que le futur firmware.
- [x] Produire une trace déterministe des registres et écritures voxel.
- [x] Tester chaque opcode, valeur limite, saut et programme tronqué.
- [x] Écrire Rain, sphère, Fireworks et Plasma comme sources `.l3d` de référence.
- [x] Ajouter des tests déterministes pour les quatre animations du corpus.

### Critère de sortie

- [x] L'assembleur produit un bytecode reproductible que la VM TypeScript exécute dans les limites prévues.

## Phase 3 — Interpréteur dans le firmware

### Structure

- [x] Créer `firmware/src/bytecode/` avec des modules séparés pour format, validation, VM et diagnostics.
- [x] Définir un état fixe : compteur ordinal, registres, couleur, temporisation et faute.
- [x] Réutiliser le scratch partagé pour le programme actif si la phase 0 le valide.
- [x] Retirer toute la fonctionnalité du binaire lorsque `L3D_BYTECODE_ENABLED=0`.

### Validation

- [x] Valider signature, version, longueur, capacités et CRC avant activation.
- [x] Vérifier les frontières d'instructions sans allocation dynamique.
- [x] Vérifier toutes les cibles de branchement avant l'exécution.
- [x] Refuser tout programme trop grand ou nécessitant une capacité absente.
- [x] Conserver le mode courant si la validation échoue.

### Exécution

- [x] Implémenter les opcodes avec la même sémantique que TypeScript.
- [x] Exécuter au plus le quota contractuel à chaque passage.
- [x] Rendre la main sur `WAIT`, `YIELD`, faute ou changement de mode.
- [x] Arrêter les programmes qui dépassent leurs quotas.
- [x] Réinitialiser complètement la VM à l'entrée et à la sortie.
- [x] Ajouter un mode installable sans décaler les IDs historiques.
- [x] Revenir à `Off` après une faute fatale.

### Rendu et tests

- [x] Brancher les opcodes sur les primitives de rendu existantes.
- [x] Valider les coordonnées avant toute écriture de voxel.
- [x] Comparer les traces TypeScript et firmware avec les mêmes graines.
- [x] Tester opcode inconnu, saut invalide, boucle infinie et quota dépassé.
- [x] Vérifier qu'une faute n'écrit ni hors framebuffer, ni dans l'EEPROM.
- [x] Compiler et mesurer Flash, RAM et temps de frame. Les mesures matérielles sont archivées dans le bilan de phase 3.
- [x] Exécuter Rain et la sphère sur le Photon à `B:1`.
- [x] Vérifier Particle, LAN, diagnostics et changements de mode pendant l'exécution.

Les mesures, tests hôte et limites de ce jalon sont archivés dans
[`docs/BYTECODE_PHASE3.md`](docs/BYTECODE_PHASE3.md).

### Critère de sortie

- [ ] Un programme non persistant produit le même comportement dans la VM TypeScript et sur le cube.

## Phase 4 — Persistance et API LAN

### Stockage transactionnel

- [x] Réserver la zone décidée en phase 0 dans un layout EEPROM versionné.
- [x] Vérifier par assertions qu'elle ne chevauche aucun réglage historique.
- [x] Écrire le programme avant de rendre son en-tête valide.
- [x] Vérifier le CRC après écriture et avant activation.
- [x] Invalider proprement l'emplacement avant remplacement ou suppression.
- [x] Ne pas réécrire les octets dont la valeur est inchangée.
- [x] Tolérer une coupure à chaque étape sans exécuter un programme partiel.
- [x] Charger le programme uniquement à l'entrée du mode.
- [x] Documenter migration et rollback du layout.

### API LAN

- [x] Définir les routes de capacité, lecture, installation, suppression et lancement.
- [x] Définir les réponses et codes d'erreur compacts.
- [x] Exposer capacité totale, libre, taille maximale et emplacements.
- [x] Réutiliser le buffer HTTP existant si sa capacité suffit.
- [x] Ajouter un transfert fragmenté uniquement si les mesures l'imposent. La mesure confirme qu'il n'est pas nécessaire.
- [x] Refuser longueur, format, version ou CRC invalides avant activation.
- [x] Garantir qu'une installation échouée conserve l'ancien programme valide.
- [x] Ne jamais exécuter directement le buffer réseau.
- [x] Documenter que toute machine du LAN peut installer un programme sans authentification.

### Tests

- [x] Tester EEPROM vierge, ancien layout et programme valide après redémarrage.
- [x] Tester installation, remplacement et suppression.
- [x] Simuler une coupure pendant chaque étape d'écriture.
- [x] Tester corps vide, tronqué, trop long et mauvais type MIME.
- [x] Tester version inconnue, CRC faux et capacités absentes.
- [x] Vérifier que CubePainter et les réglages restent intacts selon la décision prise.

### Critère de sortie

- [x] Une animation survit à une coupure simulée et peut être remplacée par LAN sans reflasher le firmware.

## Phase 5 — Interface L3D Studio

### Création et simulation

- [x] Ajouter une section dédiée aux animations procédurales.
- [x] Ajouter un éditeur de source simple sans dépendance lourde.
- [x] Fournir Rain, sphère, Fireworks et Plasma comme exemples.
- [x] Afficher les erreurs de compilation en français.
- [x] Afficher taille compilée, limite du Photon et capacités requises.
- [x] Exécuter la VM TypeScript dans l'aperçu 3D existant.
- [x] Ajouter démarrage, pause, arrêt et réinitialisation de la graine.
- [x] Afficher compteur d'instructions, FPS simulé et dernière faute.

### Bibliothèque locale

- [x] Enregistrer les sources utilisateur dans le stockage local du navigateur.
- [x] Permettre de dupliquer, renommer et supprimer une source.
- [x] Permettre export et import sans service distant.
- [x] Ne jamais inclure de token Particle dans un export.

### Installation

- [x] Lire et afficher la capacité et le programme présents sur le Photon.
- [x] Demander confirmation avant remplacement.
- [x] Installer le bytecode puis relire son CRC.
- [x] Afficher progression, succès et erreur éventuelle.
- [x] Permettre lancement, arrêt et suppression.
- [x] Désactiver ces actions lorsque le transport LAN est indisponible.
- [x] Ne pas utiliser Particle comme repli silencieux pour l'installation.

### Critère de sortie

- [x] L'utilisateur peut écrire, simuler, installer et lancer une animation depuis une seule interface.

## Phase 6 — Optimisation guidée par les mesures

- [ ] Comparer automatiquement les traces TypeScript et Photon du corpus final.
- [ ] Classer les opcodes par fréquence et taille.
- [ ] Ajouter une forme compacte uniquement si son gain est mesuré.
- [ ] Retirer les primitives inutilisées qui consomment de la Flash.
- [ ] Mesurer les primitives lourdes et leur pire temps de frame.
- [ ] Vérifier que la VM inactive ne réduit pas la mémoire minimale des modes natifs.
- [ ] Évaluer une compression généraliste uniquement sur le corpus final.
- [ ] Inclure coût du décodeur, en-tête, RAM active et chargement dans le calcul du gain.
- [ ] Rejeter la compression si son bénéfice net est insuffisant.
- [ ] Archiver les mesures finales dans `firmware/docs/BYTECODE_BASELINE.md`.

### Critère de sortie

- [ ] Chaque optimisation conservée possède une mesure avant/après reproductible.

## Phase 7 — Endurance, documentation et livraison

### Endurance

- [ ] Exécuter Rain bytecode au moins deux heures à `B:1`.
- [ ] Enchaîner cent changements entre modes natifs, Stream et bytecode.
- [ ] Réaliser cent installations ou remplacements contrôlés.
- [ ] Couper le Wi-Fi puis vérifier sa reconnexion pendant l'exécution.
- [ ] Couper l'alimentation pendant une installation et vérifier le rollback.
- [ ] Tester démarrage avec programme valide, absent et corrompu.
- [ ] Relever mémoire libre, minimum, OOM, temps de frame et fautes VM.
- [ ] Vérifier Particle et GETDIAG pendant les scénarios longs.

### Documentation

- [x] Documenter le langage avec des exemples simples.
- [x] Documenter chaque opcode, borne et faute.
- [x] Documenter format, CRC, versions et stockage disponible.
- [x] Documenter installation, remplacement, lancement et suppression.
- [x] Documenter sandbox, quotas et absence d'authentification LAN.
- [x] Documenter le rollback par `L3D_BYTECODE_ENABLED=0`.
- [x] Mettre à jour les README, `CHANGELOG.md` et `firmware/docs/BASELINE.md`.
- [x] Produire un binaire identifié sans secret ni configuration personnelle.

### Critère de sortie

- [ ] La fonctionnalité est stable, mesurée et utilisable sans information orale complémentaire.

## Évolutions reportées

- nombres flottants ;
- fonctions, récursion et pile d'appels ;
- authentification ou signature des programmes ;
- installation par Particle Cloud ;
- bibliothèque distante ou place de marché ;
- mémoire externe et migration vers Photon 2.

## Définition de terminé

- [ ] Le corpus est compilé de manière reproductible.
- [ ] TypeScript et Photon produisent les mêmes résultats déterministes.
- [ ] Un programme installé survit à une coupure d'alimentation.
- [ ] Aucun programme invalide ne peut sortir du sandbox ou bloquer la boucle.
- [ ] Particle, LAN et diagnostics restent disponibles pendant l'exécution.
- [ ] Flash, RAM, EEPROM, performances et endurance sont documentées.
- [ ] Tous les tests visuels matériels ont utilisé `B:1`.
- [ ] Aucun secret ou identifiant personnel n'est présent dans les sources ou artefacts.

## Règles de réalisation

Pour chaque tâche :

1. partir d'un test ou d'une mesure reproductible ;
2. modifier une seule responsabilité à la fois ;
3. lancer les tests TypeScript ou hôte concernés ;
4. compiler Photon 2.3.1 après toute modification C++ ;
5. mesurer avant et après toute optimisation revendiquée ;
6. ne cocher que les validations réellement effectuées ;
7. documenter toute divergence ou décision irréversible.
