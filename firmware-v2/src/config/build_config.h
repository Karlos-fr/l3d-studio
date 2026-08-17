#pragma once

//NEOPIXEL Defines
#define PIXEL_CNT               512
#define PIXEL_PIN               D0
#define PIXEL_TYPE              WS2812B

//Global Defines
#define BUILD_FILE_NAME         "Spark Pixels Mega"
#define BUILD_REVISION          "1.4"
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


