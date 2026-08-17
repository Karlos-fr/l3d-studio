# Dispatcher et ordonnanceur coopératif

## Résultat de la phase 8

Le dispatcher historique à base de `switch` est conservé. Les attentes des
modules du unity build passent désormais par un ordonnanceur coopératif qui
sert Particle Cloud au plus tard toutes les 20 ms et peut abréger une attente
lorsqu'un changement de mode est reçu.

Cette phase ne convertit pas les 67 modes actifs en 67 machines d'état. Le
cycle de vie `enter`, `tick`, `exit` demeure la frontière commune, tandis que
les séquences historiques internes restent en place afin de préserver leur
rendu. Elles ne contiennent cependant plus de pause opaque de plusieurs
secondes : leurs appels `delay()` sont redirigés vers l'attente coopérative.

## Décision sur le registre

Le tableau de métadonnées existant n'est pas un registre d'exécution : il
contient les noms et paramètres nécessaires au protocole historique. Ajouter
en plus une table de pointeurs de fonctions aurait un coût minimal de
67 × 4 octets, soit 268 octets de Flash, avant même les fonctions adaptatrices.

Le `switch` actuel :

- ne réserve aucune table supplémentaire en RAM ;
- permet au compilateur ARM et au LTO de choisir la représentation du saut ;
- conserve naturellement les IDs historiques clairsemés ;
- n'ajoute ni classe virtuelle, ni RTTI, ni allocation dynamique.

Le registre de fonctions n'apportant pas de gain mesurable dans le unity build,
il est rejeté pour cette phase. Les métadonnées `const` restent en Flash et le
dispatcher garde le `switch`.

## Fonctionnement de l'ordonnanceur

Au début d'un appel d'animation, `animationSchedulerBeginCycle()` protège
l'état partagé. Pendant un `showPixels()` ou une attente :

1. Particle Cloud est servi dans une fenêtre explicitement identifiée ;
2. un callback `SetMode` valide la demande mais ne remplace pas immédiatement
   l'état utilisé par l'ancienne animation ;
3. la dernière demande est mémorisée et les drapeaux historiques `stop` et
   `stopDemo` sont posés ;
4. l'attente ou la boucle rejoint sa sortie ;
5. `animationSchedulerFinishCycle()` applique `exit` puis `enter` avec une pile
   de rendu redevenue sûre.

La soustraction non signée `millis() - startedAt` garde les attentes correctes
lors du débordement du compteur. Une tranche native de 20 ms borne à 50 Hz les
appels explicites à `Particle.process()` ; la première variante à une
milliseconde a été rejetée car elle surchargeait inutilement Device OS 2.3.1.

Le timer de démonstration continue uniquement à poser `stopDemo`. Il ne change
aucun mode, ne touche pas au scratch et ne lance aucune opération réseau depuis
son callback logiciel.

## Compatibilité visuelle

Les durées demandées par chaque animation restent inchangées. Le traitement
Cloud peut ajouter un faible coût de calcul à une attente, mais il ne change ni
le nombre de frames, ni leur ordre, ni les IDs, couleurs, vitesses ou switches.
Une demande de mode interrompt volontairement la séquence courante au prochain
point coopératif.

## Mesures

| Variante | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| Phase 7 | 111 600 | 13 780 | 111 604 | 19 472 |
| Phase 8 | 111 880 | 13 788 | 111 884 | 19 192 |
| Écart | +280 | +8 | +280 | −280 |

Le surcoût de huit octets correspond aux drapeaux et à l'index de changement
différé. Aucun état proportionnel au nombre de modes n'est ajouté.

## Validation sur Photon

Les essais du 17 août 2026 ont utilisé Device OS 2.3.1 et exclusivement
`B:1`, soit la valeur interne `brightness=2` :

```powershell
particle call chicken_turkey SetMode "M:BuildAWall,S:0,B:1,"
particle call chicken_turkey SetMode "M:Off,B:1,"
particle call chicken_turkey SetMode "M:SlideShow,S:0,B:1,"
particle call chicken_turkey SetMode "M:Off,B:1,"
particle call chicken_turkey Function GETDIAG
Start-Sleep -Seconds 3
particle get chicken_turkey deviceInfo
```

`BuildAWall` et `SlideShow` ont accepté l'interruption Cloud, puis le cube est
resté sur `Off`. Le diagnostic final a indiqué 35 400 octets libres au minimum,
Wi-Fi et Cloud connectés, et aucun événement OOM.

Une OTA du même binaire a également été lancée pendant `BuildAWall`. Le flash a
réussi, le Photon s'est reconnecté, puis a accepté la commande de retour sur
`Off`.

Les tests d'endurance de 24 heures et les coupures réseau physiques restent
des validations longues séparées. Elles ne sont pas remplacées par ce smoke
test.
