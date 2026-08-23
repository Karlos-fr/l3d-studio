# L3D Studio

Application web TypeScript pour piloter un cube L3D 8 × 8 × 8 directement sur
le réseau local. Elle ne possède ni compte, ni token, ni transport Particle
Cloud : toutes les lectures et commandes passent par le serveur HTTP du Photon.

## Lancement local

Depuis la racine du dépôt :

```powershell
npm install
npm run dev
```

Ouvrir ensuite l'adresse affichée par Vite, généralement
`http://127.0.0.1:5173/`.

Dans **Transport du cube**, saisir l'IPv4 du Photon, conserver le port `8080`,
puis utiliser **Tester le LAN** et **Lire le cube**. L'adresse reste uniquement
dans `localStorage` et n'est jamais versionnée.

## Fonctionnalités

- lecture des modes et réglages du cube ;
- lancement des animations natives et réglage de leurs paramètres ;
- texte persistant et commandes avancées ;
- peinture voxel par voxel envoyée automatiquement après chaque modification ;
- streaming RGB332 d'animations calculées dans le navigateur ;
- édition, simulation et installation d'animations bytecode procédurales ;
- diagnostics périodiques et graphiques de RAM, durée de frame, FPS et uptime.

La surveillance des diagnostics utilise un Worker afin de continuer lorsque
l'onglet est en arrière-plan. Le navigateur doit toutefois rester ouvert et le
poste doit pouvoir joindre directement le Photon.

## Réseau et sécurité

L'API locale v1 n'a volontairement aucune authentification. Le cube doit rester
sur un réseau local de confiance et son port `8080` ne doit pas être exposé sur
Internet. Selon le navigateur et le contexte d'hébergement, l'accès à une IP
privée peut nécessiter une autorisation de réseau local ou être bloqué depuis
une page HTTPS publique.

Le protocole complet, les erreurs et les exemples `curl` sont documentés dans
[LOCAL_API_PROTOCOL.md](../firmware/docs/LOCAL_API_PROTOCOL.md). Le langage
procédural est décrit dans
[BYTECODE_LANGUAGE.md](../firmware/docs/BYTECODE_LANGUAGE.md).

## Organisation

```text
app/src/
  bytecode/      assembleur, validation, simulation et bibliothèque locale
  diagnostics/   collecte, historique et courbes
  lan/           client HTTP et parseurs de l'API locale
  painting/      modèle et envoi regroupé du dessin voxel
  sparkpixels/   protocole métier du firmware
  streaming/     animations web et sérialisation RGB332
  transport/     adaptation du client LAN aux opérations du cube
  ui/            état, rendu et événements DOM
```

## Vérification

Depuis la racine du dépôt :

```powershell
npm test -- --run
npm run build
```
