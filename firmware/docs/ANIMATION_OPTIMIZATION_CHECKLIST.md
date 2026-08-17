# Checklist d'optimisation d'une animation

## Objectif

Cette checklist définit le passage obligatoire pour chaque animation du
firmware. Elle permet de comparer les changements avec une méthode constante,
de préserver le protocole historique et de refuser une optimisation dont le
gain ou l'équivalence ne peut pas être démontré.

Une animation ne doit être marquée comme terminée dans le tableau de suivi
qu'après satisfaction de son critère de sortie. Les validations matérielles
utilisent toujours une commande contenant explicitement `B:1`.

## Règles de traitement

- Traiter une animation ou une famille réellement indissociable par branche et
  commit distincts.
- Ne pas mélanger une optimisation avec une évolution visuelle volontaire.
- Capturer les mesures avant de modifier l'implémentation.
- Ne pas remplacer une fonction trigonométrique ou un calcul flottant sans
  comparaison numérique et, si le résultat est visible, comparaison physique.
- Ne pas introduire de nouvelle allocation dynamique dans le rendu.
- Conserver les IDs, noms, paramètres et valeurs de retour historiques.
- Relire les règles de commentaires de `AGENT.md` avant de modifier une source.
- Ajouter ou corriger les commentaires dans le même changement que le code
  concerné, sans reporter cette tâche à une passe documentaire globale.
- Laisser une case décochée lorsqu'une vérification n'a pas été exécutée.
- Inscrire `N/A` avec une justification lorsque le contrôle ne s'applique pas.

## 1. Identification et périmètre

- [ ] Relever l'ID, le symbole et le nom Particle historiques.
- [ ] Identifier le fichier d'implémentation et les fonctions réellement
  exécutées par le mode.
- [ ] Identifier les fonctions, primitives et états partagés avec d'autres
  animations.
- [ ] Relever les couleurs, switches, vitesse, texte et dépendances réseau.
- [ ] Définir ce qui doit rester visuellement et temporellement identique.
- [ ] Vérifier si le mode est actif, masqué, désactivé ou seulement interne.

## 2. Baseline avant modification

- [ ] Compiler la version courante pour Photon avec Device OS 2.3.1.
- [ ] Enregistrer la Flash, la RAM statique et la taille du binaire.
- [ ] Relever `System.freeMemory()` au démarrage, à l'entrée du mode et son
  minimum pendant l'essai lorsque le mode est actif.
- [ ] Relever le temps moyen de frame, le pire temps de frame et les FPS.
- [ ] Capturer une commande Particle représentative avec `B:1`.
- [ ] Décrire ou enregistrer une séquence visuelle de référence suffisamment
  longue pour observer un cycle utile.

## 3. État mémoire

- [ ] Inventorier chaque variable globale ou statique appartenant au mode.
- [ ] Mesurer `sizeof` des structures et tableaux critiques sur la cible.
- [ ] Identifier les buffers permanents qui ne sont utiles que lorsque le mode
  est actif.
- [ ] Identifier les buffers locaux et confirmer qu'aucun buffer de plus de
  256 octets n'est placé sur la pile.
- [ ] Vérifier les padding, alignements, booléens séparés et types plus larges
  que leurs valeurs réelles.
- [ ] Utiliser `uint8_t` seulement pour une valeur garantie entre `0` et `255`.
- [ ] Utiliser un type signé pour les sentinelles ou coordonnées pouvant être
  négatives.
- [ ] Évaluer un fixed-point documenté pour les positions et vitesses
  fractionnaires.
- [ ] Déterminer si un scratch partagé peut remplacer un buffer résident sans
  chevauchement de durée de vie.
- [ ] Ajouter des assertions statiques pour les tailles qui constituent un
  contrat mémoire.

## 4. Allocations et durée de vie

- [ ] Rechercher `String`, `std::string`, `vector`, `new`, `malloc` et les
  temporaires susceptibles d'allouer.
- [ ] Remplacer les conteneurs dynamiques applicatifs par des tableaux à
  capacité fixe et un compteur borné.
- [ ] Définir le comportement lorsque la capacité fixe est atteinte.
- [ ] Éviter les copies de conteneurs et de chaînes dans le chemin de rendu.
- [ ] Initialiser entièrement l'état à l'entrée du mode.
- [ ] Fermer ou réinitialiser sockets, timers et ressources logiques à la
  sortie du mode.
- [ ] Vérifier qu'aucun pointeur ne survit à l'état auquel il se réfère.

## 5. Rendu et sécurité des accès

- [ ] Faire passer les coordonnées logiques par le mapping centralisé.
- [ ] Valider toute coordonnée et tout index avant lecture ou écriture.
- [ ] Vérifier les sentinelles `-1` et `8`, les coins, les arêtes et les plans
  concernés par l'animation.
- [ ] Utiliser le buffer NeoPixel existant comme framebuffer principal.
- [ ] Ne pas ajouter de second framebuffer permanent de 1 536 octets.
- [ ] Conserver le contrat RGB logique et le mapping physique historique.
- [ ] Vérifier que les sorties anticipées laissent le framebuffer et l'état
  dans une situation cohérente.

## 6. Calculs et boucle chaude

- [ ] Rechercher les `double`, `pow`, racines, divisions, trigonométries et
  conversions exécutés pour chaque voxel ou chaque frame.
- [ ] Remplacer les carrés et petits exposants entiers par des multiplications.
- [ ] Remplacer une distance par sa valeur au carré lorsque seul le classement
  est utilisé.
- [ ] Précomputer une constante uniquement si la mesure montre un intérêt.
- [ ] Comparer avant/après chaque conversion de `double` vers entier,
  fixed-point ou `float`.
- [ ] Vérifier que la distribution des tirages aléatoires reste équivalente.
- [ ] Relever les boucles imbriquées, appels bloquants, `delay()`, attentes
  réseau et appels Particle dans le chemin de frame.
- [ ] Vérifier que le mode peut être interrompu avec une latence acceptable.

## 7. Commentaires obligatoires selon AGENT.md

- [ ] Placer en tête de chaque nouveau fichier source un commentaire français
  décrivant le nom du module, sa responsabilité et ses limites.
- [ ] Utiliser les séparateurs `// ===` pour l'en-tête d'un fichier C++ ou
  JavaScript et `// ---` pour le commentaire d'une fonction.
- [ ] Documenter chaque nouvelle fonction, y compris les fonctions internes,
  helpers, callbacks de tests, timers et fonctions fléchées.
- [ ] Ajouter ou corriger le commentaire d'en-tête de toute fonction historique
  dont le corps ou le contrat est modifié.
- [ ] Décrire les paramètres avec leur nom exact lorsqu'ils sont pertinents.
- [ ] Décrire la valeur de retour et les effets de bord lorsqu'ils existent.
- [ ] Ajouter un commentaire français dédié immédiatement au-dessus de chaque
  nouvelle constante, y compris dans les tests et modules internes.
- [ ] Expliquer l'intention, la borne protégée, la durée de vie d'un scratch ou
  la contrainte de compatibilité plutôt que de paraphraser le code.
- [ ] Ne pas introduire de nouveau commentaire anglais ; les commentaires
  historiques hors du périmètre modifié peuvent rester temporairement.
- [ ] Vérifier les commentaires des fichiers de test avec les mêmes exigences
  que les sources du firmware.
- [ ] Relire le diff pour confirmer que chaque fichier et fonction touchés sont
  conformes avant compilation et commit.

## 8. Tests hôte

- [ ] Ajouter un test de chaque calcul pur modifié.
- [ ] Tester les valeurs minimales, maximales, sentinelles et débordements.
- [ ] Comparer les résultats avant/après avec une tolérance documentée.
- [ ] Tester les capacités fixes, états vides, états pleins et suppressions.
- [ ] Tester les invariants de mapping lorsque le mode calcule des index.
- [ ] Lancer l'ensemble des tests hôte :

```powershell
node --test firmware/test/host/*.test.mjs
```

## 9. Compilation et mesures après modification

- [ ] Compiler avec le script reproductible :

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
```

- [ ] Enregistrer la Flash, la RAM statique, la taille du binaire et leurs
  différences par rapport à la baseline de l'animation.
- [ ] Refuser tout dépassement de la limite de 131 072 octets de Flash.
- [ ] Expliquer une régression de Flash ou de RAM, même si elle reste dans le
  budget global.
- [ ] Vérifier que `git diff --check` ne signale aucune erreur.
- [ ] Vérifier que les empreintes de baseline et les secrets locaux n'ont pas été modifiés.

## 10. Flash et validation physique

- [ ] Flasher le binaire compilé sur `chicken_turkey`.
- [ ] Vérifier le retour en ligne et la présence des fonctions et variables
  Particle historiques.
- [ ] Envoyer une commande de test contenant explicitement `B:1`.
- [ ] Comparer trajectoires, densité, couleurs, vitesse et durée du cycle.
- [ ] Tester les couleurs et switches supportés par le mode.
- [ ] Vérifier le minimum de mémoire libre et les temps de frame pendant le
  test.
- [ ] Revenir en mode `Off` avec `B:1` après l'essai.
- [ ] Ne cocher les essais longs que lorsqu'ils ont réellement été exécutés.

Commande de retour au repos :

```powershell
particle call chicken_turkey SetMode "M:Off,B:1,"
```

## 11. Documentation et livraison

- [ ] Documenter les structures, calculs et compromis retenus.
- [ ] Reporter les mesures avant/après dans le journal de référence.
- [ ] Reporter les écarts visuels acceptés ou confirmer leur absence.
- [ ] Mettre à jour le tableau de suivi de toutes les animations.
- [ ] Confirmer le passage complet de la section « Commentaires obligatoires ».
- [ ] Créer un commit limité à l'animation ou à la famille traitée.
- [ ] Conserver un chemin de rollback identifié.

## Fiche de mesures à recopier

| Mesure | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | — | — | — |
| RAM statique | — | — | — |
| Taille binaire | — | — | — |
| Mémoire libre au démarrage | — | — | — |
| Mémoire libre minimale dans le mode | — | — | — |
| Temps moyen de frame | — | — | — |
| Pire temps de frame | — | — | — |
| FPS moyen | — | — | — |

## Critère de sortie d'une animation

Une animation est terminée lorsque :

- toutes les vérifications applicables sont cochées ou justifiées `N/A` ;
- les tests hôte et la compilation Photon 2.3.1 réussissent ;
- les mesures avant/après sont enregistrées ;
- la validation physique à `B:1` est acceptée lorsqu'elle est possible ;
- aucun changement de protocole, d'ID ou de comportement n'est involontaire ;
- la documentation et le commit dédiés sont disponibles.
