# Stockage et API LAN des animations procédurales

## Stockage transactionnel

La version 1 expose un seul programme logique, conservé dans deux banques
EEPROM physiques. Les réglages historiques et CubePainter ne sont pas déplacés.

| Zone | Adresses | Octets utilisés |
| --- | --- | ---: |
| Réglages historiques et CubePainter | 0 à 1 651 | 1 652 |
| Banque bytecode A | 1 652 à 1 848 | 197 |
| Banque bytecode B | 1 849 à 2 045 | 197 |
| Réserve | 2 046 | 1 |

Chaque banque contient directement le conteneur décrit dans
[`BYTECODE_FORMAT.md`](BYTECODE_FORMAT.md). Le champ `generation` permet de
choisir la version valide la plus récente modulo 256.

Une installation suit cet ordre :

1. valider intégralement le corps reçu avant toute écriture ;
2. choisir la banque qui ne contient pas la génération courante ;
3. invalider son premier octet de signature ;
4. écrire uniquement les octets différents, avec la nouvelle génération et le nouveau CRC ;
5. relire et valider le contenu en reconstruisant temporairement la signature ;
6. écrire le premier octet `L` en dernier ;
7. relire les deux banques et confirmer que la nouvelle génération est active.

Une coupure avant l'étape 6 laisse la banque précédente active. Une coupure
après l'étape 6 expose un conteneur déjà intégralement relu et validé. La banque
précédente reste valide jusqu'au prochain remplacement.

La suppression invalide le premier octet des deux banques. Une coupure pendant
cette opération peut donc laisser l'ancienne animation disponible, mais ne peut
jamais créer un programme partiel.

## Routes LAN

Toutes les routes utilisent le préfixe
`http://<photon>:8080/api/v1`. Elles sont disponibles uniquement lorsque
`L3D_LOCAL_API_ENABLED=1` et `L3D_BYTECODE_ENABLED=1`.

| Méthode | Route | Corps | Résultat |
| --- | --- | --- | --- |
| `GET` | `/bytecode` | aucun | capacités et statut texte |
| `GET` | `/bytecode/program` | aucun | conteneur `application/octet-stream` |
| `POST` | `/bytecode/program` | conteneur binaire | installation puis statut confirmé |
| `POST` | `/bytecode/delete` | vide | suppression puis statut vide |
| `POST` | `/bytecode/run` | vide | lancement du mode ID 77 |
| `POST` | `/bytecode/stop` | vide | retour idempotent vers `Off` |

La réponse de statut possède le format suivant :

```text
v=1
layout=1
installed=1
slots=1
capacity=197
payloadMax=185
used=61
free=136
bank=1
generation=7
format=1
vm=1
capabilities=1
crc=14A2
```

`capacity` inclut l'en-tête de douze octets ; `payloadMax` est la limite des
instructions. `bank` vaut `-1` sans programme, `0` pour A et `1` pour B. Le CRC
est toujours écrit sur quatre chiffres hexadécimaux uppercase.

L'installation accepte exclusivement `application/octet-stream`, entre 13 et
197 octets après validation. Le serveur reçoit le corps complet dans son buffer
HTTP existant de 622 octets : aucun transfert fragmenté supplémentaire n'est
nécessaire. Le programme n'est jamais exécuté depuis ce buffer réseau. La VM le
relit depuis l'EEPROM dans le scratch partagé uniquement à l'entrée du mode.

## Exemples PowerShell

```powershell
$api = "http://192.168.1.25:8080/api/v1"

curl.exe "$api/bytecode"
curl.exe --output programme.l3d.bin "$api/bytecode/program"
curl.exe -H "Content-Type: application/octet-stream" `
  --data-binary "@programme.l3d.bin" "$api/bytecode/program"
curl.exe -X POST -H "Content-Length: 0" "$api/bytecode/run"
curl.exe -X POST -H "Content-Length: 0" "$api/bytecode/stop"
curl.exe -X POST -H "Content-Length: 0" "$api/bytecode/delete"
```

Ne pas répéter automatiquement une installation après un timeout : le Photon
peut avoir activé la nouvelle banque avant la perte de la réponse. Relire
`/bytecode` et comparer le CRC permet de déterminer le résultat sans nouvelle
écriture.

## Parcours dans L3D Studio

1. renseigner l'adresse et le port LAN du Photon puis utiliser **Tester le LAN** ;
2. compiler la source dans **Animations procédurales** ;
3. utiliser **Lire** pour connaître le programme et la capacité disponibles ;
4. utiliser **Installer** ; si un programme existe, confirmer son remplacement ;
5. attendre la relecture du conteneur et la confirmation de son CRC ;
6. utiliser **Lancer**, puis **Arrêter** pour revenir à `Off` ;
7. utiliser **Supprimer du Photon** pour invalider explicitement le programme.

Un remplacement n'efface pas d'abord le programme courant : il écrit et valide
la banque inactive, puis l'active. Une annulation dans la boîte de confirmation
n'envoie aucune installation. Après une erreur ou un timeout, relire le statut
avant toute nouvelle tentative.

## Erreurs

Les erreurs `-300` à `-313` correspondent au format, au CRC, aux capacités ou
aux instructions et produisent HTTP `422`. `-314` indique l'absence de
programme et produit HTTP `404`. `-315` décrit un état incompatible et produit
HTTP `409`. `-316` signale une relecture EEPROM incohérente et produit HTTP
`500`. Les erreurs HTTP génériques du serveur restent décrites dans
[`LOCAL_API_PROTOCOL.md`](LOCAL_API_PROTOCOL.md).

## Sécurité

Cette première version ne possède volontairement ni authentification, ni TLS,
ni signature cryptographique. Toute machine pouvant joindre le port 8080 peut
remplacer, lancer ou supprimer l'animation. Le Photon doit rester sur un réseau
local de confiance sans redirection de port Internet.

## Migration et rollback

Les adresses 1 652 à 2 046 étaient libres dans le layout historique. Une mise à
jour depuis un ancien firmware ne déplace donc aucune donnée. Des octets
aléatoires ou effacés dans cette zone sont ignorés tant qu'ils ne forment pas un
conteneur `L3D` complet avec version, longueur, capacités et CRC valides.

Le rollback fonctionnel consiste à définir `L3D_BYTECODE_ENABLED=0`, recompiler
et reflasher. Le mode, la VM, le stockage et les routes bytecode disparaissent
du binaire. Les octets EEPROM sont laissés intacts et restent ignorés par le
firmware sans VM ; ils redeviennent disponibles si la fonctionnalité est
réactivée. La suppression explicite par `/bytecode/delete` est nécessaire si
l'utilisateur souhaite les invalider avant le rollback.
