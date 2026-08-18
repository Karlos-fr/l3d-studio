# Serveur HTTP local — phase 2

## Périmètre

La phase 2 ajoute un socle HTTP local minimal au firmware Photon. Il écoute sur
le port `8080`, conserve un seul client et ferme chaque connexion après sa
réponse. À ce stade, seule la route suivante fournit une réponse métier :

```text
GET /api/v1/health
```

Réponse compacte :

```text
v=1
status=ok
```

Les routes de commandes et les diagnostics détaillés restent réservés aux
phases suivantes. Particle Cloud reste actif et inchangé.

## Architecture

- `src/network/local_http_parser.*` reçoit la requête octet par octet dans des
  buffers fixes et ne connaît ni TCP ni les commandes du cube ;
- `src/network/local_api_server.*` gère le Wi-Fi, l'unique `TCPClient`, les
  timeouts, le routage minimal et l'envoi progressif ;
- `src/core/animation_scheduler.*` sert désormais Particle et le LAN par une
  fonction commune pendant les attentes historiques ;
- `loop()` sert également le LAN entre deux frames.

`SYSTEM_THREAD(ENABLED)` reste désactivé et ne remplacerait pas cette
coopération : le thread système peut maintenir le réseau, mais le code
applicatif doit toujours lire le socket et produire la réponse.

## Bornes et comportement

Les limites exactes sont décrites dans `LOCAL_API_PROTOCOL.md` et centralisées
dans `src/config/build_config.h` : chemin de 63 caractères utiles, ligne de
requête de 95, ligne d'en-tête de 127, 512 octets d'en-têtes, 12 en-têtes et
622 octets de corps.

Le serveur :

- traite au plus 256 octets par passage ;
- accepte `GET`, `POST` et `OPTIONS` ;
- refuse les autres méthodes, `Transfer-Encoding`, les tailles ambiguës et les
  corps trop grands avant leur copie ;
- abandonne une requête inactive après 2 secondes et toute transaction après
  5 secondes ;
- n'utilise aucune allocation dynamique applicative ;
- redémarre son écoute après le retour du Wi-Fi ;
- répond aux preflights CORS, y compris la demande d'accès au réseau privé.

La version actuelle ne fournit volontairement ni authentification ni TLS. Elle
ne doit pas être exposée par une redirection de port Internet.

## Commandes de vérification

Compiler pour la cible de référence :

```powershell
firmware/tools/compile.ps1
```

Exécuter les tests hôte :

```powershell
node --test firmware/test/host/*.test.mjs
```

Tester la santé depuis le même réseau local :

```powershell
curl.exe -i http://<adresse-ip-du-photon>:8080/api/v1/health
```

Tester un preflight :

```powershell
curl.exe -i -X OPTIONS `
  -H "Access-Control-Request-Private-Network: true" `
  http://<adresse-ip-du-photon>:8080/api/v1/health
```

Le rollback fonctionnel consiste à compiler avec
`L3D_LOCAL_API_ENABLED=0`. Le serveur et ses buffers sont alors retirés du
binaire sans retirer Particle Cloud.

## Mesures et validation du 17 août 2026

| Variante Photon 2.3.1 | Flash | RAM statique | Binaire | Marge Flash |
| --- | ---: | ---: | ---: | ---: |
| Serveur désactivé | 111 640 | 13 788 | 111 644 | 19 432 |
| Serveur activé | 115 992 | 15 164 | 115 996 | 15 080 |
| Coût du serveur | +4 352 | +1 376 | +4 352 | -4 352 |

La variante active a été flashée sur le Photon de test. Les contrôles ont
validé :

- la route `/health`, la fragmentation octet par octet et le preflight ;
- les statuts `405`, `408` et `413` sur des entrées invalides ;
- 100 requêtes successives sans échec ;
- une réponse pendant `BuildAWall,S:0,B:1` et Particle Cloud encore accessible ;
- un minimum mémoire inchangé à 31 928 octets avant et après la série ;
- le retour final sur `M:Off,B:1,` avec une luminosité interne de 2/255.

Le redémarrage consécutif au flash a aussi confirmé que le serveur reprend son
écoute lorsque le Wi-Fi redevient prêt. Un test matériel provoquant une perte
Wi-Fi prolongée reste prévu dans la validation d'endurance de la phase 9.

## Évolution de phase 3

Le serveur expose désormais la santé complète, les diagnostics directs et leur
reset explicite :

```text
GET  /api/v1/health
GET  /api/v1/diagnostics
POST /api/v1/diagnostics/reset
```

Le détail du format, les commandes de test et les mesures se trouvent dans
`firmware/docs/DIAGNOSTICS.md`. La génération réutilise le corps de requête et
n'ajoute aucun buffer statique. Les réponses restent disponibles dans les
animations longues grâce au service réseau coopératif.

## Évolution de phase 4

Les routes de lecture suivantes sont maintenant actives :

```text
GET /api/v1/state
GET /api/v1/modes
GET /api/v1/aux-switches
```

`state` expose le mode, la luminosité interne, la vitesse, les six couleurs,
les quatre switches, les connexions et le dernier résultat de commande. Une
lecture attend l'application d'un éventuel changement de mode différé afin de
ne jamais mélanger l'ancien mode et les nouveaux réglages.

Le catalogue complet atteint actuellement 1 208 caractères. Il est envoyé en
cinq tranches directement depuis `modeNameList` et `modeParamList`. Son maximum
théorique de 1 261 octets reste sous la limite de 1 536 : aucune pagination ni
copie temporaire n'est nécessaire. Les switches auxiliaires utilisent le même
principe avec trois tranches.

La validation du 18 août 2026 a comparé les trois réponses aux variables
Particle historiques, sans différence. Après 90 lectures, la mémoire libre est
restée à 33 992 octets et le minimum à 31 896 octets. Le cube a été remis sur
`M:Off,B:1,`.

## Évolution de phase 5

Les quatre fonctions historiques sont maintenant accessibles sur le LAN sans
dupliquer leur logique métier :

```text
POST /api/v1/command
POST /api/v1/mode
POST /api/v1/text
POST /api/v1/cube-painter
```

Chaque corps contient directement la commande historique. Une réussite renvoie
`200` et un refus du parseur métier renvoie `422`, dans les deux cas avec le
code d'origine :

```text
v=1
result=-103
```

Exemples PowerShell, toujours avec `B:1` pour une commande visuelle :

```powershell
$base = "http://<adresse-ip-du-photon>:8080/api/v1"

curl.exe -H "Content-Type: text/plain" `
  --data-binary "GETSWITCHSTATE:1" "$base/command"

curl.exe -H "Content-Type: text/plain" `
  --data-binary "M:ColorAll,S:4,B:1,C1:0000FF," "$base/mode"

curl.exe -X POST -H "Content-Type: text/plain" `
  -H "Content-Length: 0" "$base/text"

curl.exe -H "Content-Type: text/plain" `
  --data-binary "I512,#FF0000," "$base/cube-painter"
```

Le verrou de commande empêche un rappel coopératif imbriqué du serveur pendant
l'exécution synchrone du parseur. Cette protection est nécessaire car certaines
commandes de mode servent volontairement le réseau pendant leurs attentes. Une
requête interrompue avant son `Content-Length` complet est abandonnée sans
appeler le parseur métier.

Le 18 août 2026, la matrice `command`, `mode`, `text` et `cube-painter` a donné
les mêmes codes via Particle et le LAN. Le refus du voxel 512 a rendu `-103`
et HTTP 422 sans écriture. Huit changements rapides puis trente changements
supplémentaires entre `ColorAll` et `Off` ont réussi à `B:1`. Une commande
partielle fermée avant sa fin n'a changé ni le mode ni le dernier résultat.
Après reboot, le LAN et Particle sont redevenus disponibles, mais aucune
fenêtre avec Wi-Fi prêt et Particle encore déconnecté n'a été observée ; ce cas
précis reste à provoquer pendant l'endurance de phase 9.
