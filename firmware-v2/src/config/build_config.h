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


