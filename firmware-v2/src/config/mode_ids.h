#pragma once

/* ======================= ADD NEW MODE ID HERE. ======================= */
// Mode ID Defines
#define STANDBY                      0  //credit: Kevin Carlborg
#define NORMAL                       1  //credit: Kevin Carlborg
#define COLORALL                     2  //credit: Kevin Carlborg
#define CHASER                       3  //credit: Kevin Carlborg
#define ZONE                         4  //credit: Kevin Carlborg
#define COLORPULSE                   5  //credit: Werner Moecke
#define COLORSTRIPES                 6  //credit: Werner Moecke
#define ACIDDREAM                    7  //credit: Werner Moecke
#define RAINBOW                      8  //credit: Neopixel Library
#define THEATERCHASE                 9  //credit: Neopixel Library
#define FROZEN                       10 //credit: Kevin Carlborg
#define COLLIDE                      11 //credit: Kevin Carlborg
#define COLORFADE                    12 //credit: Werner Moecke
#define RAINBOW_BURST                13 //credit: Werner Moecke
#define FLICKER                      14 //credit: Werner Moecke
#define COLORBREATHE                 15 //credit: Werner Moecke
#define POLICELIGHTS                 16 //credit: Werner Moecke
#define TWOCOLORCHASE                17 //credit: Werner Moecke
#define LISTENER                     18 //credit: Werner Moecke
#define ZONECHASER                   19 //credit: Werner Moecke
#define SPECTRUM                     20 //credit: Alex Hornstein, Werner Moecke (extra settings)
#define SQUARRAL                     21 //credit: Alex Hornstein
#define PLASMA                       22 //credit: Alex Hornstein, Werner Moecke (speed settings)
#define WARMFADE                     23 //credit: Kevin Carlborg
#define CHRISTMASTREE                24 //credit: Kevin's friggin' xmas tree - there, have it!
#define CHRISTMASLIGHTS              25 //credit: Kevin Carlborg, Werner Moecke (L3D Cube port)
#define SHUFFLE                      26 //credit: Kevin Carlborg
#define TEXT                         27 //credit: Alex Hornstein, Hans-Peter "Hape", Werner Moecke (C++ port, extra settings)
#define WHIRLWIND                    28 //credit: Bill Marrs
#define CUBES                        29 //credit: Alex Hornstein, Werner Moecke (C++ port, extra settings)
#define RAIN                         30 //credit: Kevin Carlborg, Werner Moecke (Matrix Mode)
#define CHEERLIGHTS                  31 //credit: Alex Hornstein, Werner Moecke (stability fixes, extra transition effects)
#define FILLER                       32 //credit: Werner Moecke (based on idea by Alex Hornstein)
#define CUBE_PAINTER                 33 //credit: Werner Moecke (based on idea by Alex Hornstein)
#define CUBE_CLASSICS                34 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port)
#define IFTTTWEATHER                 35 //credit: Kevin Carlborg, Werner Moecke (code improvements)
#define DIGI                         36 //credit: Kevin Carlborg
#define CLOCK                        37 //credit: Werner Moecke (based on Dennis Williamson's "Clock" viz: http://cubetube.org/gallery/newestFirst/258/)
#define ACIDRAIN                     39 //credit: Werner Moecke (inspired by Kevin Darrah's "Rain" and based on Alex Hornstein's "Purple Rain")
#define GOLDRAIN                     40 //credit: Werner Moecke (based on Alex Hornstein's "Purple Rain")
#define LIGHTNING                    41 //credit: Bill Marrs
#define COLLIDE2                   	 42 //credit: Bill Marrs
#define UPNDOWN					     43 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define ROPECOIL					 44 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define WORMS					     45 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define MOREPLANES			         46 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define VOXELSLEFTBEHIND 		     47 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define PLANESFILLCUBE   		     48 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define BUILDAWALL	  		         49 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define VOXELRANDOM	  		         50 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define SINEWAVE		  		     51 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define LINESPIN					 52 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define SINELINES		  		     53 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define SPHEREMOVE	  		         54 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define FIREWORKS		  		     55 //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions) 
#define PUCKDUDE				     56 //credit: batman modded by socaljj
#define CRUMBLE					     57 //credit: ? modded by socaljj
//#define ROMAN						 58 //credit: alex ? modded by socaljj
//#define LIFE                         59 //credit: Ben? grajohnt? modded by socaljj
#define SNAKE						 60 //credit: perkbrian modded by socaljj
#define CLASSICPLANES				 61 //credit: smf modded by socaljj
#define DSPIRAL					     62 //credit: sputty01 modded by socaljj
//#define HYPER						 63 //credit: fool, modded by socaljj
#define MATRIX					     64 //credit: odity,  modded by socaljj
#define CUBEBOUNCE				     65 //credit: Ben, modded by socaljj
#define RAND_PATH_AROUND			 66 //credit: http://www.theledcube.com/source-code/, Kevin Carlborg (L3D Cube port)
#define PYRAMID                      67 //credit: http://www.theledcube.com/source-code/, Kevin Carlborg (L3D Cube port)
#define FOLDER						 68 //credit: Kevin Carlborg 
#define DIAGONAL_PLANES              69 //credit: Kevin Carlborg
#define SLIDESHOW		             70	//credit: Werner Moecke, Kevin Carlborg (memory optimization, new images)
#define LIGHTNING_BOX                71 //credit: CubeTube Library
#define FFT_METEORS_RAINBOW          72 //credit: Werner Moecke, CubeTube Library
#define FFT_JOY_LEGACY               73 //credit: CubeTube Library
#define TRANQUILITY                  74 //credit: CubeTube Library

/* ======================= ADD NEW AUX SWITCH ID HERE. ======================= */
// AUX SWITCH ID Defines
#define ASO  	0
#define RLM  	1
#define SHFL	2

