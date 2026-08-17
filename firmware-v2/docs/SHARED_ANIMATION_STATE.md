# Etats d'animations mutualises

## Objectif

La phase 6 remplace les etats volumineux concurrents par une seule union
statique. Un mode doit passer par `animationExit()`, puis `animationEnter()` ;
`animationTick()` verifie que le mode courant possede bien cette zone avant le
rendu.

Cette discipline exclut tout pointeur persistant vers l'union. Les alias et
references utilises par les animations restent locaux a une frame et deviennent
invalides des la sortie du mode.

## Inventaire final sur Photon

Les tailles sont imposees par des `static_assert` et validees par la compilation
Particle Photon avec Device OS 2.3.1.

| Vue de la zone | Taille | Initialisation d'entree |
| --- | ---: | --- |
| Rain/GoldRain/AcidRain | 8 220 octets | compteurs de salves et scalaires remis a zero |
| scratch CubePainter/transition/Snake/FFT/etc. | 1 536 octets | portion utile initialisee par le mode |
| Listener UDP optionnel | 1 543 octets | socket et compteurs reinitialises |
| Collide2 | 648 octets | 72 points entierement retires |
| Whirlwind | 312 octets | tableaux, historique et centre entierement initialises |
| Squarrel | 168 octets | structure remise a zero puis increments initialises |
| Matrix | 76 octets | compteurs, case sentinelle et 64 coordonnees initialises |

L'union `SharedAnimationState` occupe 8 220 octets, soit exactement la taille de
son plus gros membre Rain. Son alignement est au moins celui d'un `float`.

## Ressources et persistance

- CheerLights ferme son client TCP dans `animationExit()`.
- Listener ferme UDP, annule la taille de paquet et son compteur lorsqu'il est
  compile.
- CubePainter recharge ses 1 536 octets depuis l'EEPROM apres la transition a
  chaque entree ; le demarrage inspecte directement l'EEPROM sans charger ce
  buffer.
- Le buffer Listener est une vue conditionnelle de la meme union et ne reserve
  aucune RAM lorsque `L3D_LISTENER_ENABLED=0`.
- Les changements Shuffle et IFTTT ne modifient plus `currentModeID` en dehors
  de `setNewMode()`.

## Mesure

| Variante | Flash | RAM statique | Binaire | Flash restante |
| --- | ---: | ---: | ---: | ---: |
| Avant phase 6, GyrophareFR inclus | 112 624 | 16 236 | 112 628 | 18 448 |
| Apres phase 6 | 112 608 | 13 780 | 112 612 | 18 464 |
| Difference | -16 | **-2 456** | -16 | +16 |

Le gain provient de la superposition des 8 220 octets Rain avec le scratch et
les etats Matrix, Squarrel et Collide. Aucun effacement de 8 Kio n'est effectue
lors d'un changement : seuls les compteurs et membres logiquement necessaires
sont reinitialises.

## Validation

- tests hote de cycle de vie, tailles, ordre `exit/enter` et rechargement
  CubePainter ;
- compilation Particle Photon Device OS 2.3.1 reussie ;
- flash OTA et huit changements de modes rapides valides sur `chicken_turkey`
  avec `B:1`, sans reset ni OOM ;
- minimum libre observe : 35 408 octets, puis retour sur `Off` avec la
  luminosite interne `2`.
