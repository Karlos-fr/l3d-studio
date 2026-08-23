# Application L3D Studio

Application web TypeScript permettant de piloter un cube L3D 8 × 8 × 8 depuis
un navigateur. Elle utilise au choix le serveur HTTP local du Photon, Particle
Cloud ou un mode automatique combinant les deux.

Le projet reste volontairement minimal : TypeScript, Vite, HTML généré sans
framework UI, CSS simple et tests Vitest.

La cible embarquée, sa compilation et son architecture sont présentées dans
[../firmware/README.md](../firmware/README.md).

## Lancement local

Les dépendances et les scripts npm se trouvent à la racine du dépôt. Depuis
cette racine :

```powershell
npm install
npm run dev
```

Ouvrir ensuite :

```text
http://127.0.0.1:5173/l3d-studio/
```

Autres commandes utiles :

```powershell
npm test
npm run build
npm run preview
```

Le build statique est produit dans `dist/`. L’application publiée par GitHub
Pages est accessible à <https://karlos-fr.github.io/l3d-studio/>.

## Transports

L’interface propose trois choix.

### LAN

Le navigateur communique directement avec le serveur HTTP du Photon. Indiquer
uniquement son nom local ou son IPv4, par exemple `photon.local` ou
`192.168.1.25`, puis conserver le port `8080` et utiliser **Tester le LAN**.

Configuration recommandée :

1. relever l'IPv4 du Photon dans l'interface du routeur ou avec Particle ;
2. lancer L3D Studio localement avec `npm run dev` ;
3. ouvrir l'adresse HTTP affichée par Vite, généralement
   `http://127.0.0.1:5173/l3d-studio/` ;
4. saisir uniquement `192.168.1.25` dans **Adresse LAN**, sans `http://`, port,
   chemin ni barre finale ;
5. conserver **Port LAN** à `8080` ;
6. cliquer sur **Tester le LAN** et attendre la confirmation de `/health` ;
7. choisir **LAN** pour l'imposer ou **Automatique** pour conserver Particle en
   secours.

L'adresse, le port et le transport sont enregistrés dans le stockage local du
navigateur. Ils ne sont pas ajoutés au dépôt. Si `photon.local` ne fonctionne
pas, utiliser directement l'IPv4 et, idéalement, lui réserver un bail DHCP dans
le routeur afin qu'elle reste stable.

Le poste et le Photon doivent être sur le même réseau. Le serveur firmware ne
possède actuellement ni authentification ni chiffrement. Toute machine du LAN
pouvant joindre le port 8080 peut commander le cube. Il doit rester sur un
réseau de confiance et le port ne doit jamais être redirigé vers Internet.

Selon la politique du navigateur, une page publiée en HTTPS peut être empêchée
d’appeler directement le serveur HTTP privé du Photon. Le navigateur peut aussi
demander une autorisation d'accès au réseau local. CORS ne contourne ni ce
blocage de contenu mixte, ni un refus utilisateur. Pour le parcours le plus
prévisible, lancer l’application localement en HTTP avec `npm run dev`. Les
réseaux invités, pare-feu et options d'isolation Wi-Fi peuvent bloquer le port
8080.

Le protocole appelé par l’IHM est documenté dans
[../firmware/docs/LOCAL_API_PROTOCOL.md](../firmware/docs/LOCAL_API_PROTOCOL.md).
La mise en œuvre embarquée est décrite dans
[../firmware/docs/LOCAL_API_SERVER.md](../firmware/docs/LOCAL_API_SERVER.md).

### Particle

L’utilisateur se connecte avec son compte Particle, sélectionne un Photon puis
utilise les variables et fonctions historiques Spark Pixels. Le mot de passe
sert uniquement à obtenir un token et n’est pas conservé. Le token est stocké
localement par le navigateur et doit rester privé.

Les appels employés et leurs limites sont présentés dans
[../docs/particle-cloud-api.md](../docs/particle-cloud-api.md).

### Automatique

Les lectures essaient d’abord le LAN, puis utilisent Particle si le LAN est
indisponible et qu’un Photon Particle online est sélectionné.

Avant une commande, l’application teste la santé du LAN afin de choisir une
seule destination. Après l’envoi d’un `POST`, elle ne répète jamais
automatiquement la commande sur Particle : le Photon a pu l’appliquer même si
la réponse réseau s’est perdue.

## Fonctionnalités de l’IHM

- connexion Particle et sélection du Photon ;
- configuration et test de l’adresse LAN ;
- lecture du mode, de la luminosité, de la vitesse et des capacités ;
- sélection des animations avec couleurs, switches et texte associés ;
- contrôle du texte persistant ;
- commandes avancées Spark Pixels et switches auxiliaires ;
- affichage des réponses et erreurs de transport ;
- diagnostics ponctuels ou périodiques ;
- courbes de mémoire, temps de frame et FPS ;
- repères de changement de mode, redémarrage, interruption et OOM.
- éditeur assembleur d'animations procédurales avec Rain, Sphère, Fireworks et
  Plasma comme exemples ;
- compilation et simulation locale dans l'aperçu 3D, avec pause, graine,
  instructions, FPS et faute ;
- bibliothèque locale exportable et importable, sans service distant ;
- installation, lecture, lancement et suppression du programme procédural par
  le LAN uniquement, avec confirmation et vérification du CRC relu.

## Animations procédurales

La section **Animations procédurales** accepte directement le langage
assembleur `.l3d` décrit dans
[../firmware/docs/BYTECODE_LANGUAGE.md](../firmware/docs/BYTECODE_LANGUAGE.md).
Compiler une source affiche sa taille et ses capacités avant de rendre les
boutons de simulation et d'installation disponibles.

Les sources utilisateur restent dans `localStorage`. L'export JSON contient
uniquement identifiants, noms, sources et dates de modification : il ne contient
ni token Particle, ni adresse LAN, ni préférence. L'import remplace la
bibliothèque locale après validation intégrale du document.

L'installation nécessite une adresse LAN valide. L3D Studio lit d'abord le
statut du Photon, demande confirmation si un programme existe, écrit le binaire
dans la banque inactive puis relit le conteneur et compare son CRC. Aucun appel
Particle n'est utilisé comme repli silencieux. Le protocole et ses erreurs sont
détaillés dans
[../firmware/docs/BYTECODE_STORAGE_API.md](../firmware/docs/BYTECODE_STORAGE_API.md).
Le format binaire, les versions, le CRC et les fautes sont la référence plus
technique de
[../firmware/docs/BYTECODE_FORMAT.md](../firmware/docs/BYTECODE_FORMAT.md).

La syntaxe historique des commandes Spark Pixels est décrite dans
[../docs/firmware-protocol.md](../docs/firmware-protocol.md).

## Surveillance des diagnostics

Le panneau **Diagnostics** peut effectuer une lecture immédiate ou activer une
surveillance toutes les 5, 10, 30 ou 60 secondes. La surveillance est
désactivée par défaut, continue en arrière-plan en mode best effort et ralentit
progressivement après plusieurs erreurs.

En LAN, une lecture appelle directement `/api/v1/diagnostics` et ne consomme
aucune Data Operation Particle. En transport Particle, l’application appelle
`GETDIAG`, puis relit `deviceInfo` jusqu’à obtenir la séquence demandée ; le
nombre estimé de Data Operations est affiché.

La remise à zéro des minimums n’est jamais automatique. Elle exige le bouton
dédié et une confirmation utilisateur. Le dernier échantillon valide reste
affiché après une erreur.

Les graphiques conservent un historique circulaire borné, offrent une fenêtre
de cinq minutes ou l’historique complet et peuvent être effacés sans supprimer
le dernier KPI instantané. Le format des mesures est documenté dans
[../firmware/docs/DIAGNOSTICS.md](../firmware/docs/DIAGNOSTICS.md).

Elle ne lance pas de lectures simultanées et ne rattrape pas les intervalles
manqués. Le navigateur peut toutefois ralentir ou suspendre les timers d'un
onglet masqué ; aucune page web ne peut collecter lorsqu'elle est déchargée,
fermée ou lorsque l'ordinateur est en veille.

## Streaming web

La section **Streaming web** calcule des animations dans le navigateur et envoie
des frames RGB332 de 512 octets au serveur LAN configuré. Un registre léger
isole chaque animation du moteur et permet de changer de choix sans couper le
flux. La sphère reste l'animation par défaut. Le lecteur de sprites 8x8 fournit
aussi les cinq séquences **Repos**, **Mange**, **Décollage**, **Vol** et
**Atterrissage** du pack CC0
[Lil' Birb](https://casual-garage-coder.itch.io/lil-birb), projetées sur la face
avant du cube. L'interface propose
une cadence entière de 10 à 30 FPS par pas de 1, affiche les frames envoyées et abandonnées, et projette les
512 voxels dans un Canvas leger. Deux onglets proposent la projection 3D,
rotative par glisser-deposer a la souris, et l'ancienne vue des huit couches z,
sans bibliotheque 3D externe.

La sphere conserve un volume fixe de 33 voxels et se translate d'une position
entiere a la suivante : elle ne se deforme pas entre deux centres. Sa direction
varie aleatoirement aux rebonds, tandis qu'un motif multicolore tourne sur son
volume et change progressivement de teinte. La vitesse
de translation et la luminosite physique sont configurables avant le demarrage ;
les valeurs initiales sont 10 deplacements par seconde et 1 %. Les sliders de
cadence, de vitesse et de luminosite restent actifs pendant la lecture : la
cadence et la vitesse changent localement sans reinitialiser la sphere, et la
luminosite est envoyee apres la frame LAN en cours.
Tous les sliders conservent leur noeud DOM pendant le glisser ; leur valeur est
actualisee en direct et le rendu complet intervient seulement au relachement.

Le bouton bascule **Démarrer / Arrêter** active ou interrompt le mode firmware
`Stream`, avec une luminosité initiale de 1 %. Un seul appel HTTP peut être actif ;
une frame devenue ancienne est abandonnée au lieu d'être mise en file. **Arrêter** annule immédiatement la
cadence et demande le retour a `Off`. Le firmware possede aussi un timeout de
trois secondes si la page ou le reseau disparait.

L'onglet **Peinture** réutilise le même framebuffer et la vue des huit couches.
Il propose une couleur, un crayon, une gomme et l'effacement complet. Après un
premier clic sur **Afficher sur le cube**, chaque changement envoie
automatiquement la frame la plus récente : le premier part immédiatement, les
gestes rapides sont regroupés à 12,5 FPS maximum et aucun POST ne se chevauche.
Le Photon maintient la dernière image sans timeout ; le navigateur conserve le
brouillon dans `localStorage` et peut le renvoyer après un redémarrage. Le
dessin n'est volontairement plus écrit dans l'EEPROM du Photon.

Cette fonction exige l'adresse LAN du Photon et une application servie
localement en HTTP, car le Photon ne propose pas HTTPS. Le format et les mesures
sont documentes dans
[../firmware/docs/WEB_STREAMING.md](../firmware/docs/WEB_STREAMING.md).

## Architecture du code

```text
app/src/
  diagnostics/  collecte, historique circulaire et graphiques SVG
  painting/     outils, persistance locale et file de frames de peinture
  streaming/    framebuffer, primitives, animation pilote et cadence RGB332
  lan/          client HTTP, parseurs et types du serveur local
  particle/     client Cloud, session et types Particle
  sparkpixels/  protocole et métadonnées historiques
  transport/    contrat commun et stratégies LAN/Particle/Automatique
  ui/           état, rendu, événements et contrôles
  main.ts       assemblage de l’application
  styles.css    styles globaux et graphiques
```

Les appels réseau restent séparés du rendu. Les transports produisent des types
communs et l’IHM ne construit pas directement les requêtes HTTP ou Particle.

## Tests et validation

Exécuter les tests et le build depuis la racine :

```powershell
npm test
npm run build
```

Les tests couvrent notamment le protocole Spark Pixels, les clients LAN et
Particle, le fallback automatique, les diagnostics, le buffer circulaire, les
échelles et le rendu SVG. Une validation matérielle reste nécessaire pour les
commandes visuelles et doit conserver `B:1`, soit 1 % de luminosité.

Le plan détaillé du serveur, de l’IHM et de leur validation se trouve dans
[../firmware/LOCAL_SERVER_IMPLEMENTATION_PLAN.md](../firmware/LOCAL_SERVER_IMPLEMENTATION_PLAN.md).
