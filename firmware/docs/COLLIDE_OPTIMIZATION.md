# Audit de Collide

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `11` |
| Symbole | `COLLIDE` |
| Nom Particle | `Collide` |
| État | actif |
| Implémentation | `src/animations/classic_color_effects.cpp` |
| Paramètres | vitesse |

Collide fait croître deux couleurs depuis les extrémités de la bande physique,
puis enchaîne trois transitions lors de leur rencontre.

## Audit et décision

Le mode ne possède aucun tableau, état global ou allocation dynamique propre.
Ses variables sont des compteurs locaux et ses transitions réutilisent le
scratch partagé. Les index 512 et les boucles physiques sont protégés par le
pilote NeoPixel et font partie du comportement historique.

Une transformation en animation non bloquante améliorerait fortement la
réactivité, mais changerait l'ordonnancement de quatre couples de couleurs et
des transitions. Elle est refusée dans cette passe d'optimisation compatible.

## Mesures

Le build de référence avant audit était de 111 688 octets de flash et
19 108 octets de RAM statique. Collide n'a reçu aucun changement de code ; le
build suivant de 111 512 octets et 19 076 octets inclut uniquement Rain,
SlidingPlanes et LineSpiral.

```powershell
particle call chicken_turkey SetMode "M:Collide,S:8,B:1,"
```

À `B:1`, la commande a lancé Collide, mais aucune réponse diagnostique nouvelle
n'était disponible après 12 secondes : `deviceInfo` conservait la séquence du
mode précédent. La commande `Off` a interrompu le mode. La frame complète et la
comparaison visuelle restent donc explicitement en attente.

## Validation

- [x] Absence d'état permanent et d'allocation dynamique confirmée.
- [x] Les transitions utilisent le scratch partagé existant.
- [x] La décision de conserver la frame bloquante est documentée.
- [x] La suite complète des 72 tests hôte réussit après le jalon voisin.
- [x] La compilation Photon 2.3.1 réussit sans régression attribuable à Collide.
- [x] Collide est uniquement lancé à `B:1`, puis interrompu par `Off`.
- [ ] Une frame complète et l'apparence physique Collide sont validées.
