# Protocole de l'API LAN L3D

## Statut du document

Ce document décrit le contrat implémenté de la première API LAN. Il sert de
référence aux tests du firmware, à L3D Studio et aux appels manuels.

- Version de l'API : `1`.
- Cible : Particle Photon, Device OS 2.3.1.
- Transport : TCP local, sous-ensemble HTTP/1.0 et HTTP/1.1.
- Port par défaut : `8080`.
- Préfixe des routes : `/api/v1`.
- Type des corps : `text/plain; charset=utf-8`, sauf la frame RGB332 binaire.
- Connexion : une requête, une réponse, puis fermeture.
- Sécurité : aucune authentification ni aucun chiffrement dans cette version.

Le serveur reste limité au LAN. Il ne doit pas être exposé directement sur
Internet et Particle Cloud reste actif pendant toute la migration.

## Constantes prévues

| Constante | Valeur | Rôle |
| --- | ---: | --- |
| `LOCAL_API_PORT` | 8080 | Port TCP d'écoute |
| `LOCAL_API_PATH_LENGTH` | 64 | Chemin maximal, terminaison comprise |
| `LOCAL_API_REQUEST_LINE_LENGTH` | 96 | Ligne de requête maximale, terminaison comprise |
| `LOCAL_API_HEADER_LINE_LENGTH` | 128 | Ligne d'en-tête maximale, terminaison comprise |
| `LOCAL_API_HEADER_BYTES_MAX` | 512 | Somme maximale des en-têtes reçus |
| `LOCAL_API_HEADER_COUNT_MAX` | 12 | Nombre maximal d'en-têtes |
| `LOCAL_API_BODY_LENGTH` | 622 | Corps maximal, terminaison applicative non comprise |
| `LOCAL_API_RESPONSE_BODY_MAX` | 1536 | Corps maximal calculé ou envoyé par segments |
| `LOCAL_API_BYTES_PER_TICK` | 256 | Travail maximal de lecture ou écriture par passage |
| `LOCAL_API_IDLE_TIMEOUT_MS` | 2000 | Inactivité maximale d'un client |
| `LOCAL_API_TOTAL_TIMEOUT_MS` | 5000 | Durée totale maximale d'une transaction |

Les buffers persistants sont statiques. Aucun buffer supérieur à 256 octets
n'est placé sur la pile. Une réponse longue, notamment le catalogue des modes,
est produite par segments sans réserver un buffer de 1 536 octets.

Les longueurs historiques relevées pendant la phase 0 sont de 613 octets pour
`modeList`, 577 pour `modeParmList` et 82 pour `auxSwtchList`. La limite de
réponse permet donc d'exposer les deux listes de modes dans une transaction.

## Exemples `curl`

Les exemples PowerShell utilisent `curl.exe` pour éviter l'alias historique de
`Invoke-WebRequest`. Remplacer l'adresse une seule fois :

```powershell
$api = "http://192.168.1.25:8080/api/v1"

curl.exe "$api/health"
curl.exe "$api/diagnostics"
curl.exe "$api/state"
curl.exe "$api/modes"
curl.exe "$api/aux-switches"
curl.exe -X POST -H "Content-Length: 0" "$api/diagnostics/reset"
curl.exe -H "Content-Type: text/plain" --data-binary "GETSWITCHSTATE:1" "$api/command"
curl.exe -H "Content-Type: text/plain" --data-binary "M:ColorAll,S:4,B:1,C1:0000FF," "$api/mode"
curl.exe -H "Content-Type: text/plain" --data-binary "Bonjour" "$api/text"
curl.exe -H "Content-Type: text/plain" --data-binary "I511,#FF0000," "$api/cube-painter"
```

Équivalent dans un terminal POSIX :

```bash
api="http://192.168.1.25:8080/api/v1"
curl "$api/health"
curl "$api/diagnostics"
curl -X POST -H 'Content-Length: 0' "$api/diagnostics/reset"
curl -H 'Content-Type: text/plain' --data-binary 'M:ColorAll,S:4,B:1,C1:0000FF,' "$api/mode"
```

`--data-binary` conserve exactement le corps historique. Une commande visuelle
de validation doit rester à `B:1`. Ne pas relancer automatiquement un `POST`
après un timeout : la commande peut avoir été exécutée avant la perte de sa
réponse. La route de streaming reçoit un fichier de 512 octets RGB332 :

```powershell
curl.exe -H "Content-Type: application/octet-stream" `
  --data-binary "@frame.rgb332" "$api/stream/frame"
```

## Traitement d'une requête

Le serveur accepte une seule connexion et une seule requête à la fois. Il ne
prend pas en charge le keep-alive, le pipelining, les corps fragmentés avec
`Transfer-Encoding: chunked`, les plages, la compression ou les chemins avec
paramètres de requête.

Règles de validation :

- les versions `HTTP/1.0` et `HTTP/1.1` sont acceptées ;
- seules les méthodes `GET`, `POST` et `OPTIONS` sont reconnues ;
- un `POST` exige un `Content-Length` décimal, même lorsque sa valeur est zéro ;
- un `GET` ou `OPTIONS` ne doit pas contenir de corps ;
- un corps non vide exige `Content-Type: text/plain`, avec `charset=utf-8`
  facultatif, ou `application/octet-stream` pour la seule route de frame ;
- les chemins sont comparés exactement et ne sont pas décodés comme des URL ;
- tout dépassement est refusé avant copie dans le buffer correspondant ;
- une commande n'est exécutée qu'après réception et validation du corps entier ;
- une déconnexion ou un timeout invalide toute commande partielle.

Le serveur doit être relancé après une reconnexion Wi-Fi. Son traitement doit
être appelé assez souvent par la boucle et les animations coopératives pour
respecter les timeouts ci-dessus.

## En-têtes de réponse

Une réponse normale contient :

```text
HTTP/1.1 <statut>\r\n
Content-Type: text/plain; charset=utf-8\r\n
Content-Length: <taille>\r\n
Cache-Control: no-store\r\n
Connection: close\r\n
Access-Control-Allow-Origin: *\r\n
\r\n
```

Le serveur n'accepte pas les cookies ni les requêtes avec credentials. Le
caractère générique CORS est volontaire pour cette première version non
sécurisée.

Une requête `OPTIONS` valide reçoit `204 No Content` avec :

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 600
```

Si la requête contient `Access-Control-Request-Private-Network: true`, la
réponse ajoute `Access-Control-Allow-Private-Network: true`. Cette compatibilité
ne remplace pas l'autorisation d'accès au réseau local demandée par certains
navigateurs.

## Formats de réponse

À l'exception des diagnostics historiques, une réponse est composée de lignes
`clé=valeur` terminées par `\n`. Les clés sont ASCII, sans espace. Une version
inconnue doit être refusée par le client plutôt qu'interprétée partiellement.

Les listes historiques sont renvoyées sans transformation. Elles ne doivent
contenir ni retour chariot ni saut de ligne. Les chaînes libres, notamment le
texte persistant et `debug`, ne sont pas renvoyées par la version 1 de l'état.

### Santé

`GET /api/v1/health`

```text
v=1
fw=1.4
os=2.3.1
u=3564
i=1
k=1
```

| Clé | Signification |
| --- | --- |
| `v` | Version du format de santé |
| `fw` | Révision du firmware L3D |
| `os` | Version Device OS ciblée |
| `u` | Uptime en secondes |
| `i` | Wi-Fi prêt, `0` ou `1` |
| `k` | Particle Cloud connecté, `0` ou `1` |

Cette route ne génère pas de diagnostic complet et doit rester la route la
moins coûteuse pour tester une adresse LAN.

### Diagnostics

`GET /api/v1/diagnostics`

La réponse réutilise exactement le format compact décrit dans
`firmware/docs/DIAGNOSTICS.md` :

```text
v=1,y=4,m=30,u=3564,r=40,d=0,s=37944,f=35400,n=34024,b=37928,a=35400,q=35400,c=73,l=152989,g=152282,w=152989,p=65,x=20,i=1,k=1,o=-1,z=0
```

Sur le LAN, `y` est incrémenté pour chaque instantané produit. Il ne nécessite
pas l'aller-retour différé de la fonction Particle. La génération est réalisée
entre deux frames et la réponse correspond toujours à la requête courante.

`POST /api/v1/diagnostics/reset` avec `Content-Length: 0` remet à zéro le
minimum global et les statistiques du mode, puis retourne un instantané au même
format. Aucun autre endpoint ne remet ces valeurs à zéro.

La latence aller-retour est mesurée par L3D Studio. Le firmware mesure le temps
écoulé entre l'acceptation du client et le début de la réponse et l'envoie dans
l'en-tête entier facultatif `X-L3D-Service-Us`.

### État courant

`GET /api/v1/state`

```text
v=1
m=2
name=ColorAll
b=2
s=4
colors=0000FF;FF0000;00FF00;0000FF;FFFF00;00FFFF
switches=0;0;0;0
i=1
k=1
r=14
```

`b` est la valeur interne historique de luminosité comprise entre 1 et 255,
pas le pourcentage reçu dans une commande. Les couleurs sont six valeurs RGB
hexadécimales sans `#`. Les quatre switches locaux sont `0` ou `1`.
`r` est le dernier code retourné par une commande externe, qu'elle ait réussi
ou échoué. Le schéma d'état possède sa propre version et peut donc évoluer
indépendamment du format des diagnostics.

### Catalogue des modes

`GET /api/v1/modes`

```text
v=1
names=<contenu historique de modeList>
params=<contenu historique de modeParmList>
```

Les deux listes conservent leurs séparateurs et leur ordre historiques. Leur
association reste faite par index. La réponse est envoyée par segments depuis
les buffers existants. Aucune pagination n'est nécessaire : même avec deux
listes remplies à leur capacité utile de 621 caractères, le corps maximal est
de 1 261 octets, sous la limite contractuelle de 1 536 octets.

### Switches auxiliaires

`GET /api/v1/aux-switches`

```text
v=1
switches=<contenu historique de auxSwtchList>
```

### Commandes

Les endpoints de commande reçoivent directement le corps texte historique :

| Route | Corps |
| --- | --- |
| `POST /api/v1/command` | Commande destinée à `FnRouter` |
| `POST /api/v1/mode` | Commande destinée à `SetMode` |
| `POST /api/v1/text` | Texte destiné à `SetText` |
| `POST /api/v1/cube-painter` | Commande destinée à `CubePainter` |

Exemple de corps pour `/api/v1/mode` :

```text
M:ColorAll,S:4,B:1,C1:0000FF,
```

Une commande exécutée avec succès retourne `200 OK` :

```text
v=1
result=14
```

Une commande reçue intégralement mais refusée par son parseur retourne
`422 Unprocessable Content` et conserve son code historique :

```text
v=1
result=-103
```

Le client ne doit pas renvoyer automatiquement un `POST` après un timeout : la
commande a pu être appliquée avant la perte de la réponse.

### Frame de streaming web

`POST /api/v1/stream/frame`

Cette route exige simultanement :

- le mode courant `Stream`, ID 76 ;
- `Content-Type: application/octet-stream` sans parametre ;
- `Content-Length: 512` ;
- exactement un octet RGB332 par voxel, range selon `z`, puis `y`, puis `x`.

Le corps est valide integralement avant toute modification des LEDs. Il est
decode directement depuis le buffer HTTP existant vers le mapping logique du
cube. Une frame acceptee produit un seul `showPixels()` et retourne :

```text
v=1
result=0
```

Une longueur differente jusqu'a la capacite HTTP retourne `400`. Un corps qui
depasse la capacite HTTP retourne `413`. Le type incorrect retourne `415` et
une frame recue hors du mode Stream retourne `409` avec le code `-208`.

## Statuts et erreurs du transport

| Statut | Code | Situation |
| --- | ---: | --- |
| `409 Conflict` | `-208` | Frame valide recue hors du mode `Stream` |
| `400 Bad Request` | `-200` | Syntaxe HTTP, longueur ou en-tête invalide |
| `404 Not Found` | `-204` | Route inconnue |
| `405 Method Not Allowed` | `-202` | Méthode connue mais interdite pour la route |
| `408 Request Timeout` | `-205` | Timeout d'inactivité ou total |
| `413 Content Too Large` | `-201` | Ligne, en-têtes, corps ou réponse trop grands |
| `415 Unsupported Media Type` | `-203` | Type de corps non pris en charge |
| `422 Unprocessable Content` | code `COMMAND_ERROR` | Commande complète refusée par le firmware |
| `503 Service Unavailable` | `-206` | Serveur ou commande déjà occupé |
| `500 Internal Server Error` | `-207` | Échec interne sans réponse partielle |

Une erreur du transport utilise :

```text
v=1
error=-204
```

Les codes `-200` à `-207` sont réservés au serveur LAN. Ils ne remplacent pas
les codes historiques de commandes commençant actuellement à `-100`.

## Vecteurs de validation du contrat

- `GET /api/v1/health HTTP/1.1` sans corps doit retourner `200` et six clés.
- `GET /api/v1/diagnostics` doit incrémenter `y` sans remettre `n` ou `q` à zéro.
- `POST /api/v1/diagnostics/reset` avec une longueur nulle doit retourner un
  diagnostic dont les minimums ont été réinitialisés.
- `OPTIONS /api/v1/mode` ne doit jamais modifier le cube.
- `POST /api/v1/mode` avec la commande d'exemple doit conserver `B:1` et
  retourner le résultat historique de `SetMode`.
- un corps de 622 octets atteint la borne autorisée ; 623 octets retourne 413 ;
- une ligne d'en-tête incomplète pendant deux secondes provoque un timeout ;
- une route avec query string, une méthode `PUT` ou un corps chunked est refusé ;
- une déconnexion au milieu d'une commande ne doit produire aucun effet ;
- deux clients concurrents ne doivent jamais partager leurs buffers ou corps.
- une frame vide, tronquee, de 511 ou 513 octets ne doit modifier aucun voxel ;
- une frame valide doit suivre l'ordre `z`, `y`, `x` et produire un seul rendu.

## Évolutions explicitement reportées

- authentification, appairage et signature des requêtes ;
- HTTPS et gestion de certificats ;
- découverte mDNS ou UDP ;
- WebSocket et Server-Sent Events ;
- accès depuis Internet ;
- désactivation de Particle Cloud ;
- modification ou suppression des métadonnées historiques.

## Contraintes des navigateurs

Le serveur répond en HTTP sur une adresse privée. L'application et le Photon
doivent appartenir au même réseau, sans isolation des clients Wi-Fi. Un pare-feu
local, un réseau invité ou une règle de point d'accès peut bloquer le port 8080.
Le nom `photon.local` dépend de mDNS et n'est pas garanti ; utiliser l'IPv4 du
Photon lorsqu'il ne se résout pas.

Une application publiée en HTTPS peut être empêchée d'appeler une ressource
HTTP locale à cause du contenu mixte. Les navigateurs peuvent aussi demander
une autorisation d'accès au réseau local ou exécuter un preflight Private
Network Access. Les réponses CORS et `Access-Control-Allow-Private-Network`
du firmware permettent le dialogue, mais ne contournent ni le contenu mixte,
ni un refus utilisateur, ni la politique du navigateur. Le parcours de
référence consiste donc à servir L3D Studio localement en HTTP avec
`npm run dev`, puis à utiliser l'adresse affichée par Vite.

Les timers d'un onglet masqué peuvent être ralentis ou suspendus. La
surveillance des diagnostics continue en mode best effort, sans chevauchement
et sans rattrapage, mais sa cadence exacte n'est garantie qu'au premier plan.

Références : [MDN — Mixed content](https://developer.mozilla.org/docs/Web/Security/Mixed_content),
[Chrome — Local Network Access](https://developer.chrome.com/blog/local-network-access/)
et [MDN — timers inactifs](https://developer.mozilla.org/docs/Web/API/Window/setTimeout#timeouts_in_inactive_tabs).

## Sécurité volontairement absente

La version 1 ne possède ni authentification, ni appairage, ni autorisation par
commande, ni TLS. Toute machine pouvant joindre le port 8080 peut lire l'état,
changer de mode, modifier le texte, écrire via CubePainter, remettre les
diagnostics à zéro et envoyer des frames. Le joker CORS `*` est cohérent avec
ce choix temporaire ; il ne constitue pas une protection.

Le Photon doit rester sur un LAN de confiance. Ne pas ouvrir ni rediriger le
port 8080 sur Internet et ne pas placer le cube sur un réseau public. Particle
Cloud conserve son authentification et reste le transport à employer hors du
réseau local. L'authentification LAN est explicitement reportée à une version
ultérieure.

## Rollback fonctionnel

Définir `L3D_LOCAL_API_ENABLED` à `0` dans
`firmware/src/config/build_config.h`, puis recompiler et flasher :

```cpp
#define L3D_LOCAL_API_ENABLED 0
```

```powershell
powershell -ExecutionPolicy Bypass -File firmware/tools/compile.ps1
particle flash <nom-ou-id-du-photon> firmware/build/l3d-studio-photon-2.3.1.bin
```

Ce rollback retire le serveur, ses routes LAN et ses buffers à la compilation.
Il ne restaure pas un ancien firmware et ne modifie ni les IDs, ni l'EEPROM.
Particle Cloud, les animations natives et les commandes historiques restent
disponibles. Remettre la valeur à `1` et recompiler pour réactiver l'API.
