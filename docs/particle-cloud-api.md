# API Particle Cloud actuelle

Ce document fixe les decisions d'integration Particle Cloud pour L3D Studio.
Il complete `docs/firmware-protocol.md`, qui decrit le protocole expose par le
firmware `SparkPixelsMega`.

Sources principales :

- Documentation officielle Particle Cloud API : https://docs.particle.io/reference/cloud-apis/api/
- Firmware analyse : `download/Spark_Pixels/Firmware/Neopixel_Library/SparkPixels_L3D_Cube/SparkPixelsMega.ino`

## Decisions validees

| Sujet | Decision |
| --- | --- |
| Domaine API | Utiliser `https://api.particle.io`. |
| Version API | Utiliser `/v1` pour les devices, variables et fonctions. |
| Authentification des appels API | Utiliser le header `Authorization: Bearer <token>`. |
| Token dans l'URL | Ne pas utiliser `access_token=...`, car cette forme est depreciee. |
| Token dans le body | Ne pas utiliser `access_token` dans le body des appels fonction. |
| Generation de token | Utiliser `POST https://api.particle.io/oauth/token`. |
| Format du endpoint token | Body `application/x-www-form-urlencoded`, pas JSON. |
| Client OAuth developpeur | `particle:particle` reste documente pour controler son propre compte developpeur. |
| Appel de fonction Particle | Utiliser le parametre `arg`, pas l'ancien `params` Android. |
| Reponse API | Particle repond en JSON. |

## Flux d'authentification retenu

Le MVP affiche un ecran de connexion Particle.

Champs UI :

- email ou login Particle ;
- mot de passe Particle ;
- code MFA uniquement si la phase de test confirme un flux supportable sans backend.

Flux sans MFA :

1. L'utilisateur saisit son email et son mot de passe Particle.
2. L'application appelle `POST /oauth/token`.
3. Particle retourne un `access_token`.
4. L'application stocke le token localement.
5. L'application oublie immediatement le mot de passe.
6. Les appels suivants utilisent `Authorization: Bearer <token>`.

Flux avec MFA :

1. L'application appelle `POST /oauth/token`.
2. Particle peut retourner `403` avec `error=mfa_required` et un `mfa_token`.
3. La phase de test avec compte reel doit confirmer le endpoint exact permettant
   de fournir le code MFA.
4. Tant que ce flux n'est pas valide, l'UI doit afficher que MFA n'est pas encore
   supportee et proposer l'utilisation d'un token cree via Particle CLI.

## Commandes curl de reference

Les commandes ci-dessous sont des modeles. Ne jamais committer les vraies
valeurs de `PARTICLE_USERNAME`, `PARTICLE_PASSWORD`, `PARTICLE_TOKEN` ou
`PARTICLE_DEVICE_ID`.

### Creer un token

```sh
curl https://api.particle.io/oauth/token \
  -u particle:particle \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d grant_type=password \
  -d "username=${PARTICLE_USERNAME}" \
  -d "password=${PARTICLE_PASSWORD}" \
  -d expires_in=3600
```

Reponse attendue sans MFA :

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

Reponse attendue si les identifiants sont invalides :

```json
{
  "error": "invalid_grant",
  "error_description": "User credentials are invalid"
}
```

Reponse documentee si MFA est requis :

```json
{
  "error": "mfa_required",
  "error_description": "Multifactor authentication required",
  "mfa_token": "..."
}
```

### Verifier le token courant

```sh
curl https://api.particle.io/v1/access_tokens/current \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}"
```

### Supprimer le token courant

```sh
curl -X DELETE https://api.particle.io/v1/access_tokens/current \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}"
```

Cette commande est le modele de deconnexion cote application.

### Lister les devices

```sh
curl https://api.particle.io/v1/devices \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}"
```

### Lire le detail d'un device

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}"
```

### Lire une variable firmware

Exemple avec le mode courant :

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}/mode" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}"
```

Exemple avec la liste des modes :

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}/modeList" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}"
```

### Appeler `SetMode`

Forme retenue :

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}/SetMode" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "arg=M:ColorAll,S:4,B:80,C1:FF0000,"
```

Forme JSON possible d'apres la documentation Particle :

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}/SetMode" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"arg":"M:ColorAll,S:4,B:80,C1:FF0000,"}'
```

Decision MVP : commencer avec `application/x-www-form-urlencoded`, car c'est le
format le plus proche des exemples Particle et de l'ancien client Android, tout
en remplacant `params` par `arg`.

### Appeler `Function` / `FnRouter`

Exemple pour changer un interrupteur global :

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}/Function" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "arg=SETAUXSWITCH:1,0;"
```

### Appeler `SetText`

```sh
curl "https://api.particle.io/v1/devices/${PARTICLE_DEVICE_ID}/SetText" \
  -H "Authorization: Bearer ${PARTICLE_TOKEN}" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "arg=BONJOUR"
```

## Erreurs a gerer dans l'application

| Situation | Signal attendu | Comportement UI |
| --- | --- | --- |
| Identifiants invalides | `400`, `error=invalid_grant` | Afficher que login ou mot de passe est invalide. |
| MFA requise | `403`, `error=mfa_required` | Afficher une etape MFA ou un message temporaire de non-support. |
| Token invalide | `401` ou `403` selon endpoint | Supprimer le token local et demander une reconnexion. |
| Token absent | `400`, `error=invalid_request` | Demander une connexion avant tout appel Particle. |
| Token expire | Appel refuse, ou `expires_in` a zero/proche de zero | Demander une reconnexion ou renouveler si le flux est valide. |
| Device offline | Reponse fonction signalant device non disponible ou timeout | Afficher que le Photon est hors ligne. |
| Variable inconnue | Reponse d'erreur Particle | Afficher une erreur de compatibilite firmware. |
| Fonction inconnue | Reponse d'erreur Particle | Afficher une erreur de firmware ou de commande. |
| Timeout Photon | Erreur reseau ou timeout Particle | Proposer de reessayer. |

## Limites de securite

Le choix "login + mot de passe dans l'app" simplifie l'usage mais a des limites :

- le mot de passe Particle ne doit jamais etre stocke ;
- le token doit etre stocke seulement en local ;
- le token donne acces aux devices Particle du compte ;
- un token expose dans le navigateur peut etre copie par une personne ayant acces a la machine ;
- le client OAuth `particle:particle` est public et acceptable seulement pour un compte developpeur personnel ;
- pour une application partagee publiquement, un flux OAuth `web` avec backend ou redirection dediee sera plus approprie.

Decision MVP :

- accepter ce risque pour une application personnelle locale ;
- documenter explicitement le risque ;
- ajouter une deconnexion qui supprime le token courant cote Particle et cote navigateur ;
- ne jamais stocker le mot de passe.

## Tests realises pendant cette phase

Valide sans identifiants reels :

- consultation de la documentation officielle Particle ;
- confirmation du domaine `api.particle.io` ;
- confirmation du header `Authorization: Bearer <token>` ;
- confirmation de `POST /oauth/token` ;
- confirmation du client `particle:particle` documente ;
- confirmation du parametre de fonction `arg`.
- appel sans token de `GET /v1/devices` : HTTP `400`, `error=invalid_request`.
- appel sans token de `GET /v1/access_tokens/current` : HTTP `400`, `error=invalid_request`.

Valide avec le compte Particle cible :

- creation d'un token avec login et mot de passe : HTTP `200`, token Bearer obtenu ;
- absence de challenge MFA sur ce compte lors du test ;
- lecture de `GET /v1/devices` : HTTP `200` ;
- un device visible : `chicken_turkey`, offline, suffixe d'identifiant `383037`, `platform_id=6`, `product_id=6`.

Teste mais bloque par l'etat offline du Photon :

- lecture de `mode` : HTTP `408`, `error=Timed out.` ;
- appel de `SetMode` avec `arg=S:4,B:80,` : HTTP `400`, `error=Timed out.`.

Non valide sans compte Particle avec MFA activee et Photon online :

- comportement exact MFA de bout en bout ;
- lecture reelle de `mode`, `modeList`, `modeParmList` avec Photon online ;
- appel reel de `SetMode` applique par le firmware.

## Taches restantes avant implementation

- Allumer ou reconnecter le Photon du cube.
- Relancer les commandes curl de lecture de variable.
- Confirmer que le firmware expose bien les variables documentees sur le device cible.
- Confirmer que `SetMode` repond avec les codes attendus quand le device est online.
- Tester un compte Particle avec MFA activee, ou decider officiellement que MFA n'est pas supportee dans le MVP.
