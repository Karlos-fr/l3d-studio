# Plan simple de refonte de l'interface L3D Studio

## Objectif

Remplacer la longue page actuelle par des espaces de travail clairs, adaptés au
PC et au mobile, sans modifier les fonctions disponibles ni introduire de
framework UI. La navigation restera gérée en TypeScript dans une seule
application Vite.

## Direction retenue

- Reprendre la navigation par pages de la seconde maquette.
- Conserver les informations, commandes et états réalistes de la première.
- Garder six espaces : Cube, Animations, Streaming, Procédural, Firmware et
  Diagnostics.
- Rendre la connexion LAN accessible partout sans occuper en permanence le
  contenu principal.
- Ne pas afficher de donnée que le firmware ne fournit pas.
- Ne pas ajouter de routeur, de backend, de framework ou de nouvelle API LAN.

## Phase 0 — Cadrer les écrans

- [x] Associer chaque composant actuel à l'un des six espaces de travail.
- [x] Définir les éléments globaux : connexion, statut, navigation et dernière
  erreur.
- [x] Définir les états vides, chargement, succès, erreur et indisponibilité de
  chaque écran.
- [x] Établir les références visuelles PC et mobile avant de modifier le rendu.

### Cadrage validé

| Espace | Contenu existant conservé |
| --- | --- |
| Cube | état général du cube |
| Animations | SetMode, animations embarquées, couleurs, switches et texte du mode |
| Streaming | animations web, peinture, aperçu 3D/couches et statistiques |
| Procédural | éditeur, bibliothèque locale, simulation et programme Photon |
| Firmware | switches globaux, texte persistant, FnRouter et dernière réponse |
| Diagnostics | collecte, KPI, alertes et graphiques mémoire/frame/FPS |

Les deux maquettes du 23 août 2026 servent de références visuelles PC et
mobile. Le statut LAN, la destination, la navigation et le dernier message
applicatif restent globaux. Chaque espace doit couvrir les états non lu, prêt,
occupé, succès, erreur et indisponible avec les données déjà présentes dans
`AppState`.

## Phase 1 — Créer la nouvelle coque responsive

- [x] Ajouter une navigation latérale sur PC : Cube, Animations, Streaming,
  Procédural, Firmware et Diagnostics.
- [x] Ajouter sur mobile un en-tête compact et une navigation basse donnant
  accès aux mêmes espaces.
- [x] Conserver l'espace sélectionné dans l'état UI et dans le stockage local.
- [x] Afficher dans l'en-tête le statut LAN et la destination active.
- [x] Ouvrir la configuration LAN dans un panneau compact depuis l'en-tête ou
  l'entrée Connexion.
- [x] Vérifier la navigation au clavier, le focus visible et les libellés ARIA.

## Phase 2 — Construire les espaces Cube et Animations

- [x] Séparer l’état du cube et la commande SetMode dans deux écrans voisins.
- [x] Afficher Mode, Luminosité, Vitesse et RSSI sous forme de KPI compacts.
- [x] Conserver le sélecteur d'animation, les sliders et le bouton Envoyer.
- [x] Afficher les couleurs, switches et texte dans une zone secondaire
  dépliable sur mobile.
- [x] Conserver les limites réelles : six couleurs maximum et texte de 63
  caractères.
- [x] Ne pas simuler une vue en direct du cube pour les modes natifs tant que le
  firmware ne fournit pas son framebuffer.

## Phase 3 — Construire l'espace Streaming

- [x] Déplacer sans réécriture fonctionnelle les onglets Animations et Peinture.
- [x] Conserver la sélection d'animation, Cadence, Vitesse, Luminosité et le
  bouton Démarrer ou Arrêter.
- [x] Conserver les statistiques Cible, Mesurée, Envoyées et Ignorées.
- [x] Donner la priorité visuelle à l'aperçu du cube.
- [x] Conserver les vues 3D et Couches z ainsi que la rotation et la peinture au
  pointeur.
- [x] Empiler proprement contrôles, statistiques et aperçu sur mobile.

## Phase 4 — Construire l'espace Procédural

- [x] Organiser l'espace en trois vues : Éditeur, Simulation et Photon.
- [x] Conserver sur PC une disposition permettant de voir éditeur et simulation
  côte à côte.
- [x] Distinguer clairement les exemples intégrés, la bibliothèque du navigateur
  et l'unique programme installé sur le Photon.
- [x] Conserver toutes les actions de bibliothèque : enregistrer, dupliquer,
  renommer, supprimer, importer et exporter.
- [x] Conserver compilation, taille, capacités et messages d'erreur.
- [x] Conserver l'aperçu et les commandes de simulation.
- [x] Conserver Lire, Installer, Lancer, Arrêter et Supprimer du Photon.
- [x] Présenter explicitement la limite d'un seul programme installé et de 197
  octets.

## Phase 5 — Construire les espaces Firmware et Diagnostics

- [x] Regrouper dans Firmware les switches globaux, le texte persistant et les
  commandes FnRouter.
- [x] Isoler visuellement les actions dangereuses comme Redémarrer et remise à
  zéro des minimums.
- [x] Intégrer la dernière réponse LAN dans Firmware sous forme de zone
  dépliable avec une action Copier.
- [x] Conserver dans Diagnostics les commandes de lecture, la surveillance
  périodique, l'intervalle et la fenêtre historique.
- [x] Conserver tous les KPI actuellement fournis par le firmware.
- [x] Adapter les trois graphiques Mémoire, Temps de frame et FPS aux petits
  écrans sans inventer Température ou Tension.

## Phase 6 — Harmoniser l'apparence et l'usage

- [x] Centraliser couleurs, espacements, rayons, tailles et états interactifs
  dans les variables CSS existantes.
- [x] Uniformiser boutons principaux, secondaires, destructifs, badges, champs
  et cartes KPI.
- [x] Réduire la densité sur mobile avec des groupes repliables sans masquer les
  actions essentielles.
- [x] Vérifier contrastes, tailles tactiles, débordements, textes longs et
  largeur minimale de 320 px.
- [x] Ajouter des retours visibles pour chargement, succès et erreur sans
  dépendre uniquement de la couleur.

## Phase 7 — Valider et documenter

- [x] Mettre à jour les tests de rendu et de navigation.
- [ ] Tester tous les formulaires, sliders, onglets, canvas et actions LAN sur
  PC et mobile.
- [ ] Vérifier que le streaming et la surveillance périodique survivent aux
  changements d'espace.
- [x] Lancer la suite Vitest et le build de production.
- [ ] Comparer les écrans finaux aux références PC et mobile.
- [ ] Mettre à jour le README de l'application et le CHANGELOG.

## Hors périmètre

- Nouvelle fonction firmware ou nouvelle route LAN.
- Aperçu temps réel des animations natives.
- Température, tension ou KPI absents de l'API actuelle.
- Multiples programmes procéduraux stockés sur le Photon.
- Authentification, backend, framework UI ou routeur externe.
