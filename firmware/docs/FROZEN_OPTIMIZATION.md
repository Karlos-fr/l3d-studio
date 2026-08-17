# Optimisation de Frozen

## Identification

| Élément | Valeur |
| --- | --- |
| ID historique | `10` |
| Symbole | `FROZEN` |
| Nom Particle | `Frozen` |
| État | actif |
| Implémentation | `src/animations/classic_color_effects.cpp` |
| Paramètres | vitesse |

Frozen fait varier un fond bleu-violet et superpose jusqu'à 10 % de flocons.
Son appel parcourt les deux sens de la gamme de teintes dans une seule longue
frame, avec un délai à chaque teinte.

## Audit et optimisation

Le tableau global `randomFlakes[51]` réservait 102 octets en permanence. Ses
indices `uint16_t`, bornés entre 0 et 511, sont nécessaires et ne doivent pas
être réduits à huit bits. Le tableau réutilise désormais `pixelOrder` dans le
scratch de 1 536 octets. Frozen et les autres utilisateurs du scratch sont des
modes exclusifs, et la transition d'entrée se termine avant l'appel du mode.

La longue frame historique est conservée dans ce jalon pour ne pas mêler un
changement d'ordonnancement au déplacement mémoire.

## Mesures

| Mesure build du jalon partagé | Avant | Après | Différence |
| --- | ---: | ---: | ---: |
| Flash | 111 976 | 111 944 | −32 |
| RAM statique | 19 524 | 19 132 | −392 |
| Taille binaire | 111 980 | 111 948 | −32 |

Le gain RAM inclut aussi les 288 octets de l'état Whirlwind et l'alignement des
anciens tableaux. Le gain propre attendu de Frozen est de 102 octets.

```powershell
particle call chicken_turkey SetMode "M:Frozen,S:4,B:1,"
```

Avant modification, un relevé après 12 secondes indiquait 31 872 octets libres
mais aucune frame terminée (`c=0`). Après flash, le redémarrage a restauré
Frozen depuis l'EEPROM ; la longue frame a fait expirer la commande CLI avant
qu'une mesure comparable soit produite. Le cube a été replacé en mode `Off`
avec une luminosité brute de `2`. Aucun test plus long n'est lancé à ce jalon.

## Validation

- [x] Le tableau permanent de 102 octets est supprimé.
- [x] Les positions utilisent le tableau `uint16_t` du scratch partagé.
- [x] La capacité historique de 51 flocons est conservée.
- [x] La suite complète des 60 tests hôte réussit.
- [x] La compilation Photon 2.3.1 réussit et les mesures sont reportées.
- [x] Frozen a uniquement été lancé à `B:1`, puis le mode `Off` a été restauré.
- [ ] Une frame Frozen complète et son apparence physique sont validées.
