# Suppression des allocations dynamiques applicatives

## Resultat de la phase 7

Le firmware applicatif n'utilise plus `std::vector`, `std::string`, `new`,
`malloc` ou `realloc`. Snake et CrumblingPlane emploient des tableaux bornes,
et leurs comportements lorsque la capacite est atteinte sont couverts par les
tests hote existants.

Les quatre callbacks imposes par Particle conservent un parametre `String` :

- `SetMode` ;
- `FnRouter` ;
- `SetText` ;
- `CubePainter`.

Ces objets sont construits par Device OS avant l'entree dans le firmware. Le
code applicatif ne cree plus de `String` supplementaire et ne produit plus de
sous-chaines temporaires avec `substring()`.

## Parsing sans allocation

Les commandes sont maintenant traitees comme des tranches du buffer retourne
par `String::c_str()` :

- comparaison directe des noms et fonctions ;
- conversion decimale bornee sans copie ;
- conversion hexadecimale bornee sans `strtoul` ni sous-chaine ;
- copie des messages avec `boundedTextCopyRange()` ;
- mise a jour directe du switch Shuffle sans rappeler `FnRouter` avec une
  nouvelle chaine ;
- initialisation EEPROM du texte via un buffer C fixe.

Le pointeur vers `c_str()` n'est conservé que pendant le callback et n'est
jamais stocke dans un etat d'animation.

## Allocations inevitables

Le pilote NeoPixel local conserve une allocation unique de 1 536 octets. Sa
taille est connue au demarrage, elle vit pendant toute la duree du firmware et
n'est jamais redimensionnee. Son `free()` symetrique appartient au destructeur,
qui n'est normalement pas execute sur le Photon.

Device OS conserve egalement ses propres allocations internes pour Particle
Cloud, Wi-Fi, TCP et les parametres `String` des callbacks. Elles sont hors du
controle du code applicatif et sont surveillees par les diagnostics de memoire.

## Mesure Photon 2.3.1

| Variante | Flash | RAM statique | Binaire | Flash restante |
| --- | ---: | ---: | ---: | ---: |
| Apres phase 6 | 112 608 | 13 780 | 112 612 | 18 464 |
| Apres phase 7 | 111 600 | 13 780 | 111 604 | 19 472 |
| Difference | **-1 008** | 0 | **-1 008** | +1 008 |

Le gain concerne surtout la Flash. L'objectif principal en RAM est la
stabilite du heap : les commandes successives ne creent plus de petits objets
temporaires susceptibles de le fragmenter.

## Validation

- tests hote sur les capacites Snake et CrumblingPlane ;
- garde-fou global contre les allocations applicatives interdites ;
- tests des commandes vides, maximales, tronquees et hors plage ;
- compilation Particle Photon Device OS 2.3.1 reussie ;
- flash OTA et commandes mode, vitesse, luminosite, six couleurs, quatre
  switches, texte, diagnostics et erreur CubePainter valides a `B:1` ;
- minimum libre observe de 35 408 octets, aucun OOM, puis retour sur `Off` avec
  la luminosite interne `2` ;
- test d'endurance de 24 heures volontairement conserve dans les baselines
  longues reportees ; il ne doit pas etre confondu avec un smoke test court.
