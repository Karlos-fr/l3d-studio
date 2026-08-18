# Diagnostics runtime

La phase 2 ajoute une instrumentation numérique statique, compilable avec
Device OS 2.3.1. Elle est activée par défaut avec
`L3D_DIAGNOSTICS_ENABLED=1` dans `src/config/build_config.h` et peut être
retirée entièrement du binaire en passant cette valeur à `0`.

## Accès Cloud

Le firmware réutilise les deux endpoints historiques pour ne pas payer le coût
RAM runtime d'enregistrements Particle supplémentaires :

- `Function("GETDIAG")` demande une mesure ;
- `Function("RESETDIAG")` remet d'abord à zéro le minimum global et les
  statistiques du mode courant ;
- la réponse est lue dans la variable existante `deviceInfo`.

La fonction retourne un numéro de séquence. La réponse est produite au début
d'un passage ultérieur dans `loop()` ; le client attend donc la fin de la frame
en cours, puis lit `deviceInfo` et vérifie que sa clé `y` correspond au numéro
retourné.

### Test avec Particle CLI

Les commandes suivantes s'exécutent depuis PowerShell à la racine du dépôt.
Elles supposent que le CLI Particle est déjà authentifié et que le Photon porte
le nom `chicken_turkey`.

Vérifier que le Photon est connecté :

```powershell
particle list
```

Demander une mesure actualisée :

```powershell
particle call chicken_turkey Function GETDIAG
Start-Sleep -Seconds 3
particle get chicken_turkey deviceInfo
```

La première commande retourne un numéro de séquence. La réponse compacte doit
contenir la même valeur dans `y=<numéro>`. Elle reste disponible pendant
15 secondes ; `deviceInfo` reprend ensuite automatiquement son contenu
historique.

Remettre à zéro le minimum global et les statistiques du mode courant :

```powershell
particle call chicken_turkey Function RESETDIAG
Start-Sleep -Seconds 3
particle get chicken_turkey deviceInfo
```

Tester Rain avec une luminosité impérativement limitée à 1 % :

```powershell
particle call chicken_turkey SetMode "M:Rain,S:4,B:1,C1:0000FF,"
particle get chicken_turkey brightness
```

La variable `brightness` doit afficher `2`, valeur entière correspondant à
environ 1 % de 255. Ne pas augmenter `B:1` lors des essais de démonstration.
Après quelques secondes d'animation, relever les diagnostics :

```powershell
particle call chicken_turkey Function GETDIAG
Start-Sleep -Seconds 3
particle get chicken_turkey deviceInfo
```

La réponse n'utilise aucune allocation applicative et est générée avec
`snprintf` uniquement à la demande et hors du handler Cloud. Pour ne pas
réserver un second gros buffer,
la réponse et `deviceInfo` partagent le buffer historique de 622 octets.
Après la demande, la réponse compacte est conservée pendant 15 secondes, puis
`deviceInfo` reprend automatiquement son contenu historique.

## Accès LAN

La phase 3 du serveur local expose directement :

```text
GET  /api/v1/health
GET  /api/v1/diagnostics
POST /api/v1/diagnostics/reset
```

Vérifier la santé :

```powershell
curl.exe http://<adresse-ip-du-photon>:8080/api/v1/health
```

Lire un instantané sans modifier les statistiques :

```powershell
curl.exe http://<adresse-ip-du-photon>:8080/api/v1/diagnostics
```

Réinitialiser explicitement les minimums et les statistiques du mode :

```powershell
curl.exe -X POST -H "Content-Length: 0" `
  http://<adresse-ip-du-photon>:8080/api/v1/diagnostics/reset
```

Chaque réponse LAN possède sa propre séquence `y`, monotone depuis le démarrage
du serveur. La lecture est immédiate et ne consomme aucune Data Operation
Particle. Le reset n'est exécuté que par la troisième commande.

Le producteur numérique est commun aux deux transports. Particle conserve son
parcours différé et son stockage temporaire dans `deviceInfo`. Le LAN réutilise
le buffer du corps HTTP après validation de la requête ; il n'écrase donc jamais
`deviceInfo` et ne réserve aucun second buffer de 622 octets.

Le serveur est appelé à chaque point de coopération des animations longues.
Les diagnostics restent ainsi disponibles entre deux images internes même si
la fonction historique ne revient pas immédiatement dans `loop()`.

## Format compact version 1

| Clé | Valeur |
| --- | --- |
| `v` | version du format |
| `y` | numéro de séquence de la réponse |
| `m` | ID historique du mode observé |
| `u` | uptime en secondes |
| `r` | code de la cause du dernier reset |
| `d` | donnée associée au reset, notamment le code panic |
| `s` | mémoire libre après initialisation complète |
| `f` | mémoire libre lors de la demande |
| `n` | minimum global de mémoire libre observé |
| `b` | mémoire libre avant la dernière frame |
| `a` | mémoire libre après la dernière frame |
| `q` | minimum mémoire du mode courant |
| `c` | nombre de frames observées pour le mode courant |
| `l` | durée de la dernière frame en microsecondes |
| `g` | durée moyenne d'une frame en microsecondes |
| `w` | pire durée de frame en microsecondes |
| `p` | FPS moyens multipliés par 10 |
| `x` | nombre de changements de mode depuis le démarrage |
| `i` | Wi-Fi prêt, `0` ou `1` |
| `k` | Particle Cloud connecté, `0` ou `1` |
| `o` | taille de la dernière allocation refusée, `-1` si aucune |
| `z` | nombre d'événements `out_of_memory` |

La durée mesurée englobe l'appel réel du mode, temporisation historique
comprise. Elle représente donc le rythme visible de l'animation et non un
benchmark isolé du seul calcul CPU.

## Chemin chaud

`diagnosticsBeginFrame()` et `diagnosticsEndFrame()` effectuent uniquement :

- des lectures de `micros()` et `System.freeMemory()` ;
- des comparaisons et opérations sur des entiers statiques ;
- aucune construction de `String`, publication Cloud ou allocation.

Le handler `out_of_memory` ne publie rien, n'alloue rien et ne redémarre pas le
Photon. Il mémorise seulement la taille refusée et incrémente un compteur.

Le routage de la demande, qui peut être invoqué depuis `Particle.process()` au cœur
d'une animation, ne formate aucune chaîne. Il pose seulement deux drapeaux ; la
mise en forme est différée au début de `loop()` afin de conserver une pile
courte.

La séquence de bienvenue historique conserve longtemps la main dans
`runDemo()`. Elle traite donc aussi le drapeau entre deux frames, après le
retour de `cubeGreeting()`, afin que la mesure reste disponible à la demande
sans déplacer le formatage dans le callback Cloud.

## Marge mémoire observée

Une première implémentation exposait trois endpoints dédiés (`GetDiag`,
`diagnostics`, `diagSeq`). Ils ont été supprimés au profit des endpoints
historiques ci-dessus. La mesure après suppression est toutefois restée à
9 144 octets libres au démarrage : ces enregistrements n'étaient donc pas la
cause du Kio manquant et aucun gain ne leur est attribué.

La référence historique exposait 10 200 octets libres, soit déjà 40 octets de
moins que 10 Kio (10 240 octets). Le seuil absolu de 10 Kio ne peut donc pas
être déclaré respecté par la phase 2 sans optimisation du firmware existant.
Le firmware instrumenté mesure actuellement 9 144 octets après initialisation.
Le coût runtime restant doit encore être isolé entre l'activation persistante
de `FEATURE_RESET_INFO`, le handler `out_of_memory` et les autres effets du
démarrage. Le seuil reste donc volontairement non validé.

### Mesure du serveur local — phase 3

La compilation Photon Device OS 2.3.1 du 17 août 2026 utilise 116 392 octets de
Flash, 15 164 octets de RAM statique et laisse 14 680 octets de marge Flash.
La RAM statique est identique à la phase 2 grâce à la réutilisation du corps de
requête HTTP ; le coût de la phase 3 est donc uniquement de 400 octets de Flash.

Sur le Photon réel :

- les instantanés Particle et LAN ont exposé le même mode et les mêmes clés ;
- un appel LAN n'a pas modifié le diagnostic conservé dans `deviceInfo` ;
- deux lectures ordinaires n'ont pas réinitialisé les minimums ;
- `/diagnostics/reset` a produit `c=0` et des minimums recalés sur la mémoire
  libre courante ;
- `LineSpin,S:0,B:1` a répondu en 166 ms ;
- 100 lectures LAN successives ont réussi, avec 34 024 octets libres et un
  minimum stable à 31 832 octets ;
- le cube a été remis sur `M:Off,B:1,`, luminosité interne 2/255.

Le test continu d'au moins une heure reste volontairement regroupé avec les
tests d'endurance de la phase 9.

## Cause de reset

`FEATURE_RESET_INFO` est activé au démarrage. La cause peut être indisponible
au tout premier démarrage suivant cette activation ; les démarrages suivants
exposent `System.resetReason()` et `System.resetReasonData()`.
