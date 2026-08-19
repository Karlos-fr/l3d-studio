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

## Différences entre LAN et Particle

Les deux transports utilisent le même producteur numérique et exposent les
mêmes clés. Ils diffèrent uniquement par leur acheminement :

| Aspect | LAN | Particle Cloud |
| --- | --- | --- |
| Déclenchement | `GET /api/v1/diagnostics` | `Function("GETDIAG")` |
| Lecture | réponse HTTP immédiate | lectures répétées de `deviceInfo` jusqu'à la bonne séquence `y` |
| Portée | même réseau local | accès distant via Internet et Particle |
| Authentification | aucune dans la v1 | token Particle et TLS Cloud |
| Data Operations | aucune | appel de fonction et lectures de variable comptabilisés |
| Séquence | générée pour la requête LAN | retournée par la fonction, puis vérifiée dans `deviceInfo` |
| Latence affichée | aller-retour HTTP direct | fonction plus attente et lectures de la variable |
| Dépendance | Wi-Fi local prêt | Wi-Fi, Internet et connexion Particle prêts |
| Effet sur `deviceInfo` | aucun | réponse temporaire pendant 15 secondes |

Le mode **Automatique** de L3D Studio privilégie le LAN et utilise Particle en
repli. Un instantané provenant d'un transport n'est pas plus précis que l'autre
une fois produit. En revanche, comparer directement leurs latences n'est pas un
benchmark du firmware : le chemin Particle inclut le Cloud et son protocole
différé. La remise à zéro reste toujours explicite sur les deux transports.

## KPI et interprétation des courbes

L3D Studio conserve un historique circulaire borné. La fenêtre **5 minutes**
filtre l'affichage sans supprimer les mesures ; **Tout l'historique** montre les
points encore présents dans le buffer. Une rupture est insérée après une
interruption ou un redémarrage afin de ne pas relier artificiellement deux
périodes sans données.

### Courbe Mémoire

| Série | Source | Interprétation |
| --- | --- | --- |
| Libre | `f` | mémoire disponible au moment de la demande ; de petites variations sont normales |
| Minimum global | `n` | plus faible valeur depuis le démarrage ou le dernier reset explicite |
| Minimum du mode | `q` | plus faible valeur depuis l'entrée dans le mode courant ou son reset statistique |

Les minimums ne peuvent que rester stables ou baisser entre deux resets. Une
baisse ponctuelle suivie d'une valeur libre stable décrit un pic d'utilisation.
Une baisse régulière de `f`, `n` ou `q` à charge comparable peut signaler une
fuite, une fragmentation ou un état de plus en plus coûteux. Comparer de
préférence un même mode et une même séquence, car changer d'animation change
légitimement sa consommation. `o >= 0` ou une hausse de `z` indique un refus
d'allocation et doit être considéré comme anormal.

### Courbe Temps de frame

| Série | Source | Interprétation |
| --- | --- | --- |
| Dernière | `l` | durée de la dernière frame, utile pour voir les variations immédiates |
| Moyenne | `g` | tendance du mode courant, moins sensible à une frame isolée |
| Pire | `w` | plus longue frame observée dans les statistiques courantes |

Les valeurs firmware sont en microsecondes et l'application les affiche en
millisecondes. La durée englobe les temporisations historiques de l'animation :
elle représente son rythme visible, pas uniquement son temps CPU. Un pic isolé
de `l` peut provenir du réseau ou d'une transition. Une hausse durable de `g`,
accompagnée d'une baisse des FPS, indique un ralentissement réel. `w` reste
élevé après un seul pic jusqu'au changement de mode ou au reset statistique.

### Courbe FPS

La série utilise `p / 10`. Elle évolue à l'inverse de la durée moyenne : une
animation comportant volontairement de longues pauses peut avoir peu de FPS
sans dysfonctionnement. Rechercher surtout une dégradation progressive dans un
même mode et avec les mêmes réglages. Les animations web en streaming possèdent
leurs propres compteurs de frames envoyées et ignorées ; ils ne doivent pas être
confondus avec ce FPS firmware.

### Repères et autres indicateurs

- **Mode** (`m`, `x`) : sépare des consommations ou rythmes non comparables ;
- **Redémarrage** (`u`, `r`, `d`) : l'uptime repart et la cause permet de
  distinguer mise à jour, reset demandé et panic ;
- **Interruption** : aucune mesure n'a été reçue pendant cette portion ;
- **OOM** (`o`, `z`) : taille du dernier refus et compteur cumulé ;
- **Wi-Fi / Particle** (`i`, `k`) : distinguent un cube actif localement d'une
  perte de connexion Cloud ;
- **Latence L3D Studio** : mesure le transport complet, tandis que
  `X-L3D-Service-Us` mesure seulement le service interne LAN lorsqu'il est
  présent.

Les courbes aident à détecter une dérive ; elles ne prouvent pas à elles seules
sa cause. Confirmer une anomalie en reproduisant le même mode, la même vitesse
et une luminosité de test `B:1`.

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
