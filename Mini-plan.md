Oui. Je propose de remplacer CubePainter par un éditeur web utilisant le framebuffer et le protocole RGB332 du streaming existant.

## Mini-plan

### 1. Adapter légèrement le serveur LAN

- [x] Ajouter `POST /api/v1/painter/frame`, recevant exactement la même frame RGB332 de 512 octets que `/stream/frame`.
- [x] Mutualiser entièrement le décodage et le rendu avec `streamApplyFrame()`.
- [x] Maintenir la dernière image affichée sans timeout en mode peinture.
- [x] Conserver le timeout actuel pour le streaming animé.
- [x] Ne créer aucun nouveau framebuffer ni aucune allocation dynamique.

### 2. Ajouter l’éditeur dans L3D Studio

- [x] Ajouter deux onglets dans le bloc Streaming : `Animations` et `Peinture`.
- [x] Réutiliser le `StreamingFramebuffer` et les aperçus 3D/couches existants.
- [x] Ajouter uniquement les outils essentiels :
  - couleur ;
  - crayon ;
  - gomme ;
  - effacement complet.
- [x] Permettre de peindre par clic-glisser dans la vue par couches.
- [x] Envoyer la frame complète après modification, avec temporisation courte et un seul appel HTTP actif.
- [x] Conserver localement le dernier dessin dans le navigateur.

### 3. Retirer l’ancien CubePainter

- [x] Supprimer la fonction Particle `CubePainter`.
- [x] Supprimer l’ancienne route texte `/api/v1/cube-painter`.
- [x] Supprimer son parseur, ses écritures EEPROM et son fichier d’animation.
- [x] Supprimer les méthodes `sendCubePainter()` devenues inutiles dans l’application.
- [x] Retirer CubePainter du registre des modes, mais garder l’ID `33` réservé pour ne jamais le réattribuer.
- [x] Ne pas supprimer le scratch partagé de 1 536 octets s’il reste utilisé par les transitions et animations.

### 4. Vérifier et documenter

- [x] Tester peinture, gomme, effacement, coordonnées et couleurs RGB332.
- [x] Vérifier qu’une image reste affichée après fermeture de la page tant que le cube ne change pas de mode.
- [x] Tester sur le cube avec une luminosité de 1 %.
- [x] Compiler le firmware Photon 2.3.1 et mesurer Flash/RAM.
- [x] Mettre à jour les README, l’API LAN et le changelog.

La différence volontaire avec l’ancien CubePainter est l’absence de persistance dans l’EEPROM du Photon : après redémarrage, le dessin disparaît, mais L3D Studio le conserve dans le navigateur et peut le renvoyer. Cela simplifie nettement le firmware et évite l’usure de l’EEPROM.
