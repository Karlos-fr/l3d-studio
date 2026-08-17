# GyrophareFR

## Intention

`GyrophareFR` est un nouveau mode autonome portant l'ID 75. Contrairement au
mode historique `Police`, qui alterne un stroboscope sur deux moitiés physiques
de la bande LED, il dessine deux demi-faisceaux verticaux opposés dans le
framebuffer logique du cube. Les faisceaux tournent autour de l'axe `y`.

Le mode reste bleu par défaut, conformément à un gyrophare français. Le rouge
est une variante visuelle volontaire, activée par le premier switch.

## Contrôles

| Switch | Désactivé | Activé |
| --- | --- | --- |
| `Bicolore` | deux demi-faisceaux bleus | faisceau avant bleu, opposé rouge |
| `Reactif au son` | intensité constante | intensité modulée par le microphone |
| `Trainee` | framebuffer effacé à chaque orientation | anciennes orientations divisées par deux |

La vitesse générale du firmware reste prise en compte. Une frame est programmée
toutes les `20 + speed` millisecondes sans appel bloquant à `delay()`.

## Choix d'implémentation

- huit couples de directions `int8_t` décrivent un tour complet ;
- le produit vectoriel entier sélectionne les voxels du plan lumineux ;
- les deux lignes voisines d'une diagonale sont dessinées à demi-intensité
  pour éviter une pulsation lumineuse pendant la rotation ;
- la projection signée distingue les deux demi-faisceaux pour le mode bicolore ;
- le centre pair du cube est représenté en coordonnées doublées, sans `float` ;
- quatre lectures ADC calculent un pic absolu autour du biais `SAMPLES` ;
- une enveloppe entière décroissante lisse la réaction sonore ;
- aucune FFT n'est utilisée, car seule l'amplitude globale est nécessaire ;
- l'état permanent contient sept octets utiles, mesurés à huit avec
  l'alignement : orientation, échéance `millis()` et enveloppe audio ;
- aucune allocation dynamique, chaîne `String`, trigonométrie runtime ou pile
  locale importante n'est ajoutée.

Le mode rejoint le plafond de luminosité 37 déjà appliqué aux rendus pouvant
allumer une part importante des 512 voxels.

## Mesures

| Mesure | Avant | Après | Écart |
| --- | ---: | ---: | ---: |
| Flash | 111 856 | 112 624 | +768 |
| RAM statique | 16 228 | 16 236 | +8 |
| Taille binaire | 111 860 | 112 628 | +768 |
| Marge Flash | 19 216 | 18 448 | −768 |

La compilation cible Particle Photon avec Device OS 2.3.1.

## Validation

Tests hôte :

```powershell
node --test firmware-v2/test/host/*.test.mjs
```

Compilation :

```powershell
powershell -ExecutionPolicy Bypass -File firmware-v2/tools/compile.ps1
```

Commandes de smoke test, toujours à 1 % :

```powershell
particle call chicken_turkey SetMode "M:GyrophareFR,S:4,B:1,T1:0,T2:0,T3:0,"
particle call chicken_turkey SetMode "M:GyrophareFR,S:4,B:1,T1:1,T2:0,T3:1,"
particle call chicken_turkey SetMode "M:GyrophareFR,S:4,B:1,T1:1,T2:1,T3:1,"
particle call chicken_turkey SetMode "M:Off,B:1,"
```

Le smoke test ne valide pas à lui seul le sens apparent de rotation, la largeur
des diagonales, la sensibilité audio ou la qualité de la traînée. Ces points
restent à observer physiquement sur le cube.

Le 2026-08-17, le binaire a été flashé par OTA sur `chicken_turkey`. Les trois
configurations ci-dessus ont répondu à `B:1`. Les diagnostics du dernier essai
ont confirmé le mode 75, sans reset ni manque de mémoire signalé. Le cube a
ensuite été remis sur `M:Off,B:1,` avec `brightness=2`.
