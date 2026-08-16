# Instructions Agent - L3D Studio

Ce fichier definit les regles de travail pour les agents intervenant sur ce depot.

## Contexte Projet

L3D Studio est une application TypeScript minimale, sans React, destinee a remplacer l'ancienne application Android Spark Pixels pour piloter un cube L3D 8x8x8 via Particle Photon et le firmware `SparkPixelsMega`.

Le projet doit rester simple :

- Vite
- TypeScript
- HTML genere ou manipule directement
- CSS simple
- Vitest pour les tests unitaires
- Pas de framework UI sauf decision explicite ulterieure
- Pas de backend tant que le pilotage Particle Cloud suffit

## Regles Generales

- Ne pas modifier le firmware telecharge dans `download/` sauf demande explicite.
- Traiter `download/` comme une reference upstream, pas comme du code applicatif principal.
- Preferer des modules petits et explicites.
- Isoler le protocole Spark Pixels de l'interface utilisateur.
- Isoler les appels Particle Cloud dans un client dedie.
- Ne jamais committer de token Particle, d'identifiant secret ou de configuration personnelle.
- Les commentaires de code source doivent etre en francais.

## Organisation du Projet

Garder le projet decoupe en modules petits et concentres.

Pour ce projet TypeScript, preferer un fichier par responsabilite claire, par exemple :

- `particle/client.ts` pour les appels Particle Cloud ;
- `particle/types.ts` pour les types Particle Cloud ;
- `sparkpixels/protocol.ts` pour construire les commandes firmware ;
- `sparkpixels/parsers.ts` pour parser les variables publiees par le firmware ;
- `ui/render.ts` pour produire ou mettre a jour le DOM ;
- `ui/events.ts` pour connecter les evenements utilisateur ;
- `ui/state.ts` pour l'etat applicatif minimal.

Eviter les gros fichiers fourre-tout. Si un fichier commence a melanger des responsabilites sans rapport direct, extraire un nouveau module.

Ne pas ajouter de fichier utilitaire large comme `utils.ts` ou `helpers.ts` sauf si plusieurs modules partagent vraiment la meme logique. Preferer un nom de module precis, lie a la responsabilite reelle.

Garder `main.ts` concentre sur l'orchestration de l'application uniquement :

- charger la configuration initiale ;
- initialiser l'etat ;
- brancher les modules ;
- lancer le premier rendu.

`main.ts` ne doit pas contenir :

- le detail des appels Particle ;
- le parsing du protocole Spark Pixels ;
- la construction des commandes firmware ;
- la logique de rendu complexe ;
- la logique metier des controles du cube.

Garder le rendu dans des modules dedies au rendu ou a la mise en page.

Garder separes :

- acces aux donnees Particle ;
- reglages utilisateur ;
- stockage local ;
- rendu HTML ;
- gestion des evenements ;
- menus ;
- outils de couleur ;
- localisation si elle est ajoutee ;
- protocole firmware.

Quand une fonctionnalite est ajoutee, chercher d'abord le module existant qui possede cette responsabilite. Creer un nouveau module uniquement si la fonctionnalite a une responsabilite distincte.

L'objectif est de reduire la charge cognitive, de rendre les futures sessions moins couteuses en tokens et de permettre a Codex d'inspecter seulement les fichiers pertinents pour la tache en cours.

## Regles de Commentaires

Toutes les sources doivent respecter les regles ci-dessous.

### Langue

Tous les commentaires dans les fichiers source doivent etre ecrits en francais.

Cette regle concerne notamment :

- fichiers TypeScript `.ts`
- fichiers JavaScript si presents `.js`
- fichiers CSS `.css`
- fichiers HTML contenant des commentaires
- tests unitaires
- scripts de build ou d'outillage

### En-tete de fichier

Chaque fichier source doit commencer par un commentaire d'en-tete en francais decrivant :

- le nom du module ;
- la responsabilite du module ;
- les limites importantes avec les autres modules.

Pour les fichiers TypeScript et JavaScript, utiliser cette structure :

```ts
// ============================================================================
// ParticleClient - Implementation du client Particle Cloud
// ----------------------------------------------------------------------------
// Ce fichier centralise les appels HTTP vers l'API Particle Cloud. Il ne connait
// pas les details de rendu de l'interface ni la structure interne du firmware.
// ============================================================================
```

Pour les fichiers de declaration TypeScript `.d.ts`, utiliser `Declaration` :

```ts
// ============================================================================
// ParticleTypes - Declaration des types Particle Cloud
// ----------------------------------------------------------------------------
// Ce fichier decrit les types partages pour les reponses Particle. Il ne lance
// aucun appel reseau et ne contient pas de logique de rendu.
// ============================================================================
```

Pour les fichiers CSS, adapter la structure en commentaire CSS :

```css
/* ============================================================================
 * StylesGlobaux - Implementation des styles de base
 * ----------------------------------------------------------------------------
 * Ce fichier definit les styles globaux de l'application. Il ne doit pas porter
 * de logique metier ni encoder le protocole Particle.
 * ========================================================================= */
```

Pour les fichiers HTML, adapter la structure en commentaire HTML :

```html
<!-- =========================================================================
     Index - Implementation du point d'entree HTML
     -------------------------------------------------------------------------
     Ce fichier fournit le conteneur initial de l'application. La logique de
     rendu reste dans les modules TypeScript.
     ========================================================================= -->
```

Placer l'en-tete avant les imports, declarations, styles ou code.

Le titre doit rester concis et specifique au module.

### Commentaires de fonctions

Chaque fonction doit avoir un commentaire d'en-tete en francais decrivant :

- ce que fait la fonction ;
- ses parametres, quand c'est pertinent ;
- sa valeur de retour, quand c'est pertinent ;
- tout effet de bord important, quand c'est pertinent.

Utiliser cette structure exacte pour les fonctions TypeScript :

```ts
// ----------------------------------------------------------------------------
// Calcule une valeur pseudo-aleatoire stable entre 0 et 1.
//
// Parametres :
// - seed : valeur source utilisee pour decorreler les gouttes.
//
// Retour :
// - valeur pseudo-aleatoire stable.
//
// Effet de bord :
// - decrire ici tout changement d'etat ou appel systeme important.
// ----------------------------------------------------------------------------
```

Omettre `Parametres`, `Retour` ou `Effet de bord` uniquement quand la section ne s'applique vraiment pas.

Documenter toutes les fonctions, notamment :

- fonctions exportees ;
- fonctions internes ;
- callbacks d'evenements DOM ;
- callbacks `fetch`, timers et promesses ;
- constructeurs de classes si des classes sont introduites ;
- fonctions de test ;
- helpers locaux ;
- fonctions flechees assignees a une constante ;
- fonctions par defaut ou supprimees si un langage ou outil en introduit.

Nommer chaque parametre documente exactement comme dans la signature.

Pour les callbacks DOM, documenter :

- l'evenement consomme ;
- l'element ou l'etat modifie ;
- l'appel reseau eventuel ;
- le comportement de retour si pertinent.

Conserver les lignes separatrices ouvrante et fermante autour de chaque commentaire de fonction.

### Constantes

Chaque constante doit avoir un commentaire dedie en francais expliquant ce qu'elle represente.

Placer le commentaire immediatement au-dessus de la constante.

Exemple :

```ts
// URL de base de l'API Particle Cloud actuelle.
const PARTICLE_API_BASE_URL = "https://api.particle.io/v1";
```

Ne pas utiliser un commentaire partage pour plusieurs constantes.

Documenter les constantes dans :

- modules TypeScript ;
- fichiers de test ;
- modules internes ;
- espaces ou objets de configuration ;
- fichiers CSS quand une variable CSS represente une decision importante.

### Qualite des commentaires

Preferer les commentaires utiles qui expliquent :

- l'intention ;
- les frontieres entre modules ;
- les hypotheses ;
- les effets de bord ;
- les contraintes Particle Cloud ;
- les contraintes du firmware `SparkPixelsMega`.

Eviter les commentaires vides qui repetent simplement le code.

## Adaptation au Projet TypeScript

### Modules attendus

Le code applicatif doit tendre vers cette separation :

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

### Frontieres importantes

- `particle/` connait l'API Particle Cloud, mais pas les modes Spark Pixels.
- `sparkpixels/` connait le protocole du firmware, mais pas le DOM.
- `ui/` connait le DOM, mais delegue les commandes au protocole et au client Particle.
- `main.ts` assemble les modules et initialise l'application.
- Les tests doivent cibler en priorite les parseurs et generateurs de commandes.

### API Particle Cloud

Utiliser l'API Particle actuelle :

- domaine : `https://api.particle.io/v1`
- authentification : header `Authorization: Bearer <token>`

Ne pas reprendre tel quel l'ancien modele Android :

- ancien domaine `api.spark.io`
- token passe en query string `access_token=...`

### Protocole Spark Pixels

Les commandes envoyees au firmware doivent rester construites par un module dedie.

Exemples de commandes a supporter :

```text
M:ColorAll,S:4,B:80,C1:FF0000,
S:4,B:80,
SETAUXSWITCH:1,0;
```

L'interface ne doit pas assembler ces chaines directement.

## Verification Avant Livraison

Avant de terminer une modification applicative :

- lancer les tests disponibles ;
- lancer le build si le projet est initialise ;
- verifier que les commentaires nouveaux respectent ces regles ;
- verifier qu'aucun token ou secret n'a ete ajoute ;
- verifier que `download/` n'a pas ete modifie sans demande explicite.
