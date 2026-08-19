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

Le poste et le Photon doivent être sur le même réseau. Le serveur firmware ne
possède actuellement ni authentification ni chiffrement : il doit rester sur un
LAN de confiance.

Selon la politique du navigateur, une page publiée en HTTPS peut être empêchée
d’appeler directement le serveur HTTP privé du Photon. Pour tester ou utiliser
le transport LAN sans ce blocage de contenu mixte, lancer l’application
localement avec `npm run dev`.

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

La syntaxe historique des commandes Spark Pixels est décrite dans
[../docs/firmware-protocol.md](../docs/firmware-protocol.md).

## Surveillance des diagnostics

Le panneau **Diagnostics** peut effectuer une lecture immédiate ou activer une
surveillance toutes les 5, 10, 30 ou 60 secondes. La surveillance est
désactivée par défaut, suspendue lorsque l’onglet est masqué et ralentie après
plusieurs erreurs.

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

## Architecture du code

```text
app/src/
  diagnostics/  collecte, historique circulaire et graphiques SVG
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
