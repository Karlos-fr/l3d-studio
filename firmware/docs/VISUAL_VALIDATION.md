# Procédure de validation visuelle

## Objectif

Comparer une version candidate avec Spark Pixels Mega 1.4 sans se fier
uniquement à la compilation ou aux mesures mémoire.

## Préparation

- [ ] Vérifier que le binaire stable et la procédure de rollback sont disponibles.
- [ ] Fixer le cube, la caméra et l'éclairage ambiant.
- [ ] Utiliser la même alimentation et le même angle de prise de vue.
- [ ] Relever le mode, la vitesse, la luminosité, les couleurs et les switches.
- [ ] Attendre la connexion Particle Cloud avant chaque séquence.
- [ ] Filmer au minimum 30 secondes par configuration.

## Séquence minimale

- [ ] `ColorAll` avec une couleur primaire.
- [ ] `Chaser` pour vérifier le mapping physique.
- [ ] `Text` avec `HELLO` pour vérifier police et orientation.
- [ ] `Rain` pour vérifier densité, vitesse et transitions.
- [ ] `GoldRain` pour vérifier l'état `salvos`.
- [ ] `Plasma` pour vérifier les calculs flottants et le temps de frame.
- [ ] `Snake` pour vérifier l'état dynamique.
- [ ] `CubePainter` avec un voxel puis un effacement complet.
- [ ] Un changement rapide entre deux modes pendant une animation.

## Comparaison

- [ ] Synchroniser les vidéos sur la première frame visible.
- [ ] Comparer trajectoires, densité, couleurs et durée des cycles.
- [ ] Noter tout écart de mapping, scintillement ou frame manquante.
- [ ] Accepter une différence aléatoire uniquement si la distribution reste comparable.
- [ ] Documenter explicitement tout changement visuel volontaire.

## Résultats

- Baseline de phase 0 validée par l'utilisateur le 2026-08-17.
- Séquence matérielle minimale de phase 1 (`ColorAll`, `Text`, `Rain` et
  `CubePainter`) validée par l'utilisateur le 2026-08-17.
- Aucun changement fonctionnel volontaire signalé.
- Rollback OTA vers Spark Pixels Mega 1.4 exécuté et validé après la phase 1.

La procédure vidéo complète reste disponible pour les futures phases qui
modifieront réellement les algorithmes ou la représentation mémoire.
