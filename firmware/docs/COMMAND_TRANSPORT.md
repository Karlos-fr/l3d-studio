# Séparation des commandes et des transports

## Objectif

La phase 1 du serveur LAN retire la validation et les effets métier des
callbacks Particle. Particle Cloud reste entièrement compatible, mais devient
un adaptateur au même titre que le futur serveur HTTP.

## Architecture obtenue

```text
Particle.function(String)
          |
          v
adaptateurs cloud/command_parser.cpp
          |
          v
commandes const char* + longueur
          |
          v
core/command_dispatch.cpp et animations/cube_painter.cpp
```

Le futur serveur LAN pourra fournir directement le pointeur de son corps HTTP
et son `Content-Length`. Il n'aura pas à construire de `String` ni à reproduire
les règles de validation.

## Frontières publiques

| Fonction à buffer fixe | Adaptateur Particle | Responsabilité |
| --- | --- | --- |
| `setModeFromBuffer()` | `SetMode(String)` | Mode, vitesse, luminosité, couleurs, switches et texte de mode |
| `routeCommandFromBuffer()` | `FnRouter(String)` | Heure, lectures, switches auxiliaires, diagnostics et reboot différé |
| `setTextFromBuffer()` | `SetText(String)` | Texte persistant et EEPROM |
| `cubePainterFromBuffer()` | `CubePainter(String)` | Validation puis écriture framebuffer et EEPROM |

Les quatre callbacks Particle transmettent uniquement `command.c_str()` et
`command.length()`. Les fonctions métier n'utilisent ni `String`, ni
`Particle`, ni HTTP.

## Compatibilité conservée

- Les espaces extérieurs sont retirés comme avec `String.trim()` pour SetMode,
  FnRouter et CubePainter.
- Les noms de modes et les types SetMode restent sensibles à la casse comme
  auparavant.
- FnRouter reste insensible à la casse ASCII, ce qui reproduit son ancien
  `toUpperCase()`.
- CubePainter accepte encore les types et couleurs hexadécimales en minuscules
  grâce à une normalisation caractère par caractère sans copie.
- SetText ne retire aucun espace et conserve sa limite de 63 octets utiles.
- Les valeurs de succès et les codes `COMMAND_ERROR` historiques sont
  inchangés.
- Une commande SetMode ou CubePainter invalide est entièrement rejetée avant
  la première modification d'état, de framebuffer ou d'EEPROM.

## Fonctions de validation partagées

`src/cloud/command_validation.h` fournit désormais des helpers sans allocation
pour :

- rechercher un caractère dans une tranche bornée ;
- calculer les bornes correspondant à `String.trim()` ;
- convertir un caractère ASCII vers sa majuscule ;
- comparer une tranche sans distinguer la casse ASCII.

Ces helpers ne copient pas la commande et n'exigent pas de terminaison nulle.

## Validation automatique

La suite hôte contient 132 tests, dont cinq contrôles spécifiques dans
`command-transport-separation.test.mjs` :

- les quatre callbacks Particle sont de simples adaptateurs ;
- le cœur des commandes ne dépend d'aucun transport ;
- SetMode valide avant son premier effet de bord ;
- CubePainter termine sa première passe avant framebuffer et EEPROM ;
- SetText contrôle sa longueur avant l'accès EEPROM.

Les tests historiques couvrent également les commandes valides capturées, les
entrées vides, maximales, tronquées, malformées et hors plage.

Commande de validation :

```powershell
node --test firmware/test/host/*.test.mjs
```

## Mesures

| Variante | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| Phase 0, avant séparation | 111 880 | 13 788 | 111 884 | 19 192 |
| Phase 1, commandes séparées | 111 672 | 13 788 | 111 676 | 19 400 |
| Différence | -208 | 0 | -208 | +208 |

Le gain Flash provient du parcours direct des buffers, qui remplace les
mutations `trim()` et `toUpperCase()` des objets `String`. L'objectif de la
phase reste la séparation architecturale ; aucun gain RAM ne lui est attribué.

## Limites restantes

- Device OS impose encore `String` dans les quatre signatures enregistrées par
  `Particle.function`.
- Les tests hôte contrôlent les contrats et la structure du C++, mais la
  compilation Particle reste le test autoritatif du binaire embarqué.
- Le serveur TCP et le parseur HTTP ne sont pas ajoutés dans cette phase.
- La réactivité pendant les animations longues reste le sujet de la phase 2.
