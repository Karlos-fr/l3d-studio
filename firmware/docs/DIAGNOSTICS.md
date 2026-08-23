# Diagnostics LAN

Les diagnostics du firmware sont disponibles exclusivement sur le serveur
local. Aucun callback ou buffer publié sur Particle Cloud n'est conservé.

## Commandes

```powershell
curl.exe http://192.168.1.25:8080/api/v1/diagnostics
curl.exe -X POST http://192.168.1.25:8080/api/v1/diagnostics/reset
```

La lecture ordinaire n'altère pas les minimums. Le reset remet explicitement à
zéro les minimums globaux et les statistiques du mode avant de renvoyer un
nouvel instantané.

## KPI

| Clé | Signification |
| --- | --- |
| `m` | ID du mode courant |
| `u` | uptime en secondes |
| `s`, `f`, `n` | RAM au démarrage, libre et minimum global |
| `b`, `a`, `q` | RAM avant frame, après frame et minimum du mode |
| `c` | nombre de frames du mode |
| `l`, `g`, `w` | dernière, moyenne et pire durée de frame en µs |
| `p` | FPS moyen multiplié par dix |
| `x` | nombre de changements de mode |
| `i` | Wi-Fi prêt |
| `k` | connexion système au cloud disponible pour l'OTA |
| `o`, `z` | taille du dernier refus d'allocation et nombre de refus |

Une baisse continue de `f` ou `n` à activité comparable peut signaler une fuite
ou une fragmentation. Une hausse de `w` sans baisse de mémoire pointe plutôt
vers une frame coûteuse. Une rupture d'uptime révèle un redémarrage.

L3D Studio peut échantillonner périodiquement ces valeurs et conserve un
historique borné dans le navigateur. Cette collecte n'utilise aucune Data
Operation Particle.

Le format exact est documenté dans
[LOCAL_API_PROTOCOL.md](LOCAL_API_PROTOCOL.md#diagnostics).
