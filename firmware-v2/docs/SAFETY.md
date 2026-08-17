# Securisation de la pile et des buffers

La phase 3 retire les gros buffers locaux, borne les chaines C et valide les
commandes Particle avant toute modification du framebuffer ou de l'EEPROM.
La cible reste le Photon sous Device OS 2.3.1.

## Scratch statique partage

Le buffer historique CubePainter de 1 536 octets est conserve, mais expose sous
la forme de l'union `SharedAnimationScratch`. Ses vues sont mutuellement
exclusives :

| Utilisation | Ancienne pile maximale | Vue partagee |
| --- | ---: | --- |
| `transitionAll` | 2 048 octets | RGB, 1 536 octets |
| Digi | 2 048 octets | 512 index `uint16_t`, 1 024 octets |
| Fireworks | 1 200 octets | 50 × 6 `float`, 1 200 octets |
| PuckDude | environ 3 120 octets | 4 × 65 `PackedPoint`, 780 octets |

La taille statique totale ne change pas. `transitionAll()` conserve les couleurs
de depart RGB et le calcul historique exact. Lors de l'entree dans CubePainter,
le dessin autoritatif est recharge depuis l'EEPROM apres la transition.

L'audit des tableaux locaux actifs ne trouve plus aucun buffer individuel de
plus de 256 octets. Les autres grands etats permanents ne sont pas deplaces sur
la pile.

## Chaines bornees

`src/core/bounded_text.h` centralise les operations suivantes :

- effacement avec terminaison nulle ;
- copie et ajout bornes ;
- formatage `vsnprintf` borne ;
- signalement de toute troncature.

Le code actif n'utilise plus `sprintf`, `strcat`, `strcpy` ou `vsprintf`. Les
metadonnees Cloud, messages, noms de modes et buffers de debug utilisent le
writer commun.

## Validation des commandes Cloud

Les erreurs de validation sont negatives pour ne pas entrer en conflit avec
les index de modes et retours historiques :

| Code | Signification |
| ---: | --- |
| `-100` | commande obligatoire vide |
| `-101` | commande ou champ trop long |
| `-102` | structure ou caractere invalide |
| `-103` | valeur hors plage |

`SetMode` valide toute la commande avant de modifier l'etat. `SetText` refuse
les textes qui ne tiennent pas dans ses 64 octets. `FnRouter` controle les IDs,
la timezone et les switches auxiliaires.

CubePainter accepte uniquement les voxels `0..511`, les couleurs de six chiffres
hexadecimaux et les plages croissantes incluses dans le cube. Sa commande est
entierement validee avant la premiere ecriture dans le buffer ou l'EEPROM.

## Tests

Les tests hote s'executent depuis la racine :

```powershell
node --test firmware-v2/test/host/*.test.mjs
```

Ils couvrent les fixtures historiques, les entrees vides, maximales, tronquees,
malformees et hors plage, ainsi que les invariants du scratch et des fonctions
de chaine interdites.

La compilation cible reste :

```powershell
powershell -ExecutionPolicy Bypass -File firmware-v2/tools/compile.ps1
```

## Mesures

| Variante | Flash | RAM statique | Binaire |
| --- | ---: | ---: | ---: |
| Phase 2 | 115 368 | 39 932 | 115 372 |
| Phase 3 | 115 896 | 39 932 | 115 900 |

La securisation ajoute 528 octets de flash et aucune RAM statique.

Sur ColorAll a `B:1`, la transition mesuree par les diagnostics est passee
d'environ 447 896 µs en moyenne avant phase 3 a 441 236 µs apres phase 3. Le
pire temps observe est passe de 448 255 µs a 441 988 µs. Ces valeurs courtes ne
remplacent pas la validation visuelle ni les tests de stabilite longs.

## Validation CLI realisee

Le binaire de phase 3 a ete flashe sur `chicken_turkey`. Les trois listes Cloud
sont restees strictement identiques aux fixtures. Les commandes invalides ont
retourne les codes attendus, CubePainter n'a accepte aucun index hors plage et
la luminosite est restee a `2/255`, soit la commande `B:1`.

La comparaison visuelle de toutes les LED pendant les transitions reste a
valider par le mainteneur.
