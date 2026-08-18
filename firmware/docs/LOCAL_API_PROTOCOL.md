# Protocole de l'API LAN L3D

## Statut du document

Ce document fige le contrat de la première API LAN avant son implémentation.
Il sert de référence aux tests du firmware et de L3D Studio.

- Version de l'API : `1`.
- Cible : Particle Photon, Device OS 2.3.1.
- Transport : TCP local, sous-ensemble HTTP/1.0 et HTTP/1.1.
- Port par défaut : `8080`.
- Préfixe des routes : `/api/v1`.
- Type des corps : `text/plain; charset=utf-8`.
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
  facultatif ;
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
r=14
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

## Statuts et erreurs du transport

| Statut | Code | Situation |
| --- | ---: | --- |
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

## Évolutions explicitement reportées

- authentification, appairage et signature des requêtes ;
- HTTPS et gestion de certificats ;
- découverte mDNS ou UDP ;
- WebSocket, streaming temps réel et Server-Sent Events ;
- accès depuis Internet ;
- désactivation de Particle Cloud ;
- modification ou suppression des métadonnées historiques.
