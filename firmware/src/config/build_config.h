// ============================================================================
// BuildConfig - Déclaration des options de compilation du firmware
// ----------------------------------------------------------------------------
// Ce fichier centralise les capacités matérielles et les drapeaux de build. Il
// ne contient ni état runtime ni logique propre aux animations.
// ============================================================================

#pragma once

//NEOPIXEL Defines
#define PIXEL_CNT               512
#define PIXEL_PIN               D0
#define PIXEL_TYPE              WS2812B

//Global Defines
#define BUILD_FILE_NAME         "Spark Pixels Mega"
#define BUILD_REVISION          "1.4"
// Version Device OS de la cible de reference exposee par la sante LAN.
#define BUILD_DEVICE_OS_VERSION "2.3.1"
#define ON                      1
#define OFF                     0
#define BPP                     3       //3 bytes per pixel or 24bit (RGB)
#define SIDE                    8		//8x8x8 Cube size
#define REFRESH_CONTROL         D1
#define PIXELS_PER_PANEL        (PIXEL_CNT / SIDE)

#ifndef PI
#define PI  3.1415926535
#endif

//SYSTEM_MODE(AUTOMATIC); 

/*  Particle Cloud Constraint Defines  */
#define MAX_PUBLISHED_STRING_SIZE	622	//Max character length for a Cloud String Variable
#define TEXT_LENGTH					64	//Max character length passed to a Cloud Function

// Active ou retire entierement les diagnostics runtime a la compilation.
#ifndef L3D_DIAGNOSTICS_ENABLED
#define L3D_DIAGNOSTICS_ENABLED 1
#endif

// Active le récepteur TPM2.net, absent du registre historique actuel.
#ifndef L3D_LISTENER_ENABLED
#define L3D_LISTENER_ENABLED 0
#endif

// Active ou retire entierement le premier serveur HTTP du reseau local.
#ifndef L3D_LOCAL_API_ENABLED
#define L3D_LOCAL_API_ENABLED 1
#endif

// Port TCP par defaut du serveur HTTP local.
#define LOCAL_API_PORT                     8080

// Capacite du chemin HTTP, caractere nul final compris.
#define LOCAL_API_PATH_LENGTH              64

// Capacite de la ligne de requete, caractere nul final compris.
#define LOCAL_API_REQUEST_LINE_LENGTH      96

// Capacite d'une ligne d'en-tete, caractere nul final compris.
#define LOCAL_API_HEADER_LINE_LENGTH       128

// Nombre cumule maximal d'octets d'en-tetes, separateurs CRLF compris.
#define LOCAL_API_HEADER_BYTES_MAX         512

// Nombre maximal de lignes d'en-tetes acceptees.
#define LOCAL_API_HEADER_COUNT_MAX         12

// Taille maximale d'un corps de requete, hors terminaison locale.
#define LOCAL_API_BODY_LENGTH              622

// Taille maximale contractuelle d'un corps de reponse envoye par segments.
#define LOCAL_API_RESPONSE_BODY_MAX        1536

// Version independante du schema d'etat et des catalogues LAN.
#define LOCAL_API_STATE_VERSION            1

// Version independante du format compact des diagnostics runtime.
#define DIAGNOSTICS_FORMAT_VERSION         1

// Nombre maximal d'octets lus ou ecrits par passage dans le service LAN.
#define LOCAL_API_BYTES_PER_TICK           256

// Duree maximale sans progres d'une transaction locale.
#define LOCAL_API_IDLE_TIMEOUT_MS          2000UL

// Duree totale maximale d'une transaction locale.
#define LOCAL_API_TOTAL_TIMEOUT_MS         5000UL

// Codes reserves aux erreurs de transport de l'API LAN.
#define LOCAL_API_ERROR_BAD_REQUEST        -200
#define LOCAL_API_ERROR_TOO_LARGE          -201
#define LOCAL_API_ERROR_METHOD             -202
#define LOCAL_API_ERROR_MEDIA_TYPE         -203
#define LOCAL_API_ERROR_NOT_FOUND          -204
#define LOCAL_API_ERROR_TIMEOUT            -205
#define LOCAL_API_ERROR_BUSY               -206
#define LOCAL_API_ERROR_INTERNAL           -207

// Taille maximale de la reponse compacte des diagnostics.
#define DIAGNOSTICS_TEXT_LENGTH 256

// Longueur maximale acceptee pour une commande Particle Cloud.
#define CLOUD_COMMAND_MAX_LENGTH    (MAX_PUBLISHED_STRING_SIZE - 1)

// Code retourne lorsqu'une commande obligatoire est vide.
#define COMMAND_ERROR_EMPTY         -100

// Code retourne lorsqu'une commande ou un champ depasse sa capacite.
#define COMMAND_ERROR_TOO_LONG      -101

// Code retourne lorsque la structure d'une commande est invalide.
#define COMMAND_ERROR_MALFORMED     -102

// Code retourne lorsqu'une valeur valide depasse ses bornes autorisees.
#define COMMAND_ERROR_OUT_OF_RANGE  -103


