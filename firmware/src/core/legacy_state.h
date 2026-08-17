// ============================================================================
// LegacyState - Declaration de l'etat global historique du firmware
// ----------------------------------------------------------------------------
// Ce fichier conserve provisoirement les etats partages du unity build. Leur
// mutualisation et la suppression des conteneurs dynamiques viennent plus tard.
// ============================================================================

#pragma once

// État et déclarations historiques conservés tels quels pendant la phase 1.
// Leur redistribution par responsabilité appartient aux phases d'optimisation.

/* ======================= ADD NEW MODE STRUCT HERE. ======================= */
//modeId and modeName should be the same name to prevent confusion
//Use this struct array to neatly organize and correlate Mode name with number of colors needed
//The Android app uses numOfColors to help populate the view 
//and to know how many colors to ask to update
static const modeParams modeStruct[] =
{
    /*     modeId                       modeName                #Colors     #Switches   textInput
     *     --------------- 	            ---------------	        ---------   ---------   --------- */
        {  STANDBY,                     "Off",                  0,          0,      FALSE   },  //credit: Kevin Carlborg
//        {  NORMAL,                      "Light",                0,          0,      FALSE   },  //credit: Kevin Carlborg
		{  SHUFFLE,                     "Shuffle",              0,          0,      FALSE   },  //credit: Kevin Carlborg
        {  ACIDDREAM,                   "AcidDream",            0,          0,      FALSE   },  //credit: Werner Moecke
//        {  ACIDRAIN,                    "AcidRain",             0,          1,      FALSE   },  //credit: Werner Moecke (inspired by Kevin Darrah's "Rain" and based on Alex Hornstein's "Purple Rain")
        {  COLORBREATHE,                "Breathe",              1,          1,      FALSE   },  //credit: Werner Moecke		
		{  CUBEBOUNCE,                  "BouncyCube",           0,          0,      FALSE   },  //credit: Ben mod by socaljj		
        {  RAINBOW_BURST,               "Burst",                0,          0,      FALSE   },  //credit: Werner Moecke
		{  BUILDAWALL,                  "BuildAWall",    	    0,          0,      FALSE   },  //credit ttp://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  CHASER,                      "Chaser",               1,          0,      FALSE   },  //credit: Kevin Carlborg
  		{  CHEERLIGHTS,                 "CheerLights",          0,          0,      FALSE   },  //credit: Alex Hornstein, Werner Moecke (stability fixes, extra transition effects)
        {  CHRISTMASLIGHTS,             "ChristmasLights",      0,          0,      FALSE   },  //credit: Kevin Carlborg, Werner Moecke (L3D Cube port)
        {  CHRISTMASTREE,               "ChristmasTree",        0,          3,      FALSE   },  //credit: Kevin's friggin' xmas tree - there, have it!
        {  CLOCK,                       "Clock",                3,          4,      FALSE   },  //credit: Werner Moecke (based on Dennis Williamson's "Clock" viz: http://cubetube.org/gallery/newestFirst/258/)
        {  COLLIDE,                     "Collide",              0,          0,      FALSE   },  //credit: Kevin Carlborg
		{  COLLIDE2,                    "Collide2",             0,          0,      FALSE   },  //credit: bill marrs
        {  COLORALL,                    "ColorAll",             1,          0,      FALSE   },  //credit: Kevin Carlborg
		{  CRUMBLE,                     "CrumblingPlane",       0,          0,      FALSE   },  //credit: ? mod by socaljj
        {  CUBES,                       "Cubes",                4,          4,      FALSE   },  //credit: Alex Hornstein, Werner Moecke (C++ port, extra settings)
        {  CUBE_CLASSICS,               "CubeClassics",         1,          1,      FALSE   },  //credit: http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port)
        {  CUBE_PAINTER,                "CubePainter",          0,          0,      FALSE   },  //credit: Werner Moecke (based on idea by Alex Hornstein)
		{  DIAGONAL_PLANES,             "DiagonalPlanes",       0,          0,      FALSE   },  //credit: Werner Moecke (based on idea by Alex Hornstein)
        {  DIGI,                        "Digi",                 1,          3,      FALSE   },  //credit: Kevin Carlborg
        {  TWOCOLORCHASE,               "DualChase",            2,          0,      FALSE   },  //credit: Werner Moecke
        {  FILLER,                      "Filler",               3,          1,      FALSE   },  //credit: Werner Moecke (based on idea by Alex Hornstein)
		{  FFT_JOY_LEGACY,              "FFTJoy",               0,          0,      FALSE   },  //credit: CubeTube Library
		{  FFT_METEORS_RAINBOW,         "FFTMeteors",           0,          0,      FALSE   },  //credit: Werner Moecke, CubeTube Library
		{  FIREWORKS,                   "Fireworks",    	    0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  FLICKER,                     "Flicker",              1,          0,      FALSE   },  //credit: Werner Moecke
		{  FOLDER,                      "Folder",               0,          0,      FALSE   },  //credit: Kevin Carlborg
        {  FROZEN,                      "Frozen",               0,          0,      FALSE   },  //credit: Kevin Carlborg, Werner Moecke (flake fading)
//		{  LIFE,                        "GameOfLife",           0,          0,      FALSE   },  //credit: Ben? grajohnt? modded by socaljj
		{  GOLDRAIN,                    "GoldRain",             0,          1,      FALSE   },  //credit: Werner Moecke (based on Alex Hornstein's "Purple Rain")
		{  GYROPHARE_FR,                "GyrophareFR",          0,          3,      FALSE   },  //credit: L3D Studio
//		{  HYPER,                       "HyperBall",            0,          0,      FALSE   },  //credit: fool, mod by socaljj
        {  IFTTTWEATHER,                "IFTTT",                0,          0,      FALSE   },  //credit: Kevin Carlborg, Werner Moecke (code improvements)
//        {  LIGHTNING,                   "Lightning",            0,          0,      FALSE   },  //credit: Bill Marrs
		{  LIGHTNING_BOX,               "LightningBox",         0,          0,      FALSE   },  //credit: CubeTube Library
		{  LINESPIN,                    "LineSpin",    	        0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
		{  DSPIRAL,                     "LineSpiral",           0,          0,      FALSE   },  //credit: sputty01 modded by socaljj     
//        {  LISTENER,                    "Listener",             0,          0,      FALSE   },  //credit: Werner Moecke
		{  MATRIX,                      "Matrix",               0,          0,      FALSE   },  //credit odity,  modded by socaljj
		{  SPHEREMOVE,                  "MovingSphere",   	    0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
		{  PUCKDUDE,                    "PacMan",               0,          0,      FALSE   },  //credit batman,  modded by socaljj
		{  PLANESFILLCUBE,              "PlaneFill",            0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
		{  MOREPLANES,                  "Planes", 		        0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  PLASMA,                      "Plasma",               0,          0,      FALSE   },  //credit: Alex Hornstein, Werner Moecke (speed settings)
		{  POLICELIGHTS,                "Police",               0,          0,      FALSE   },  //credit: Werner Moecke
        {  COLORPULSE,                  "Pulse",                0,          0,      FALSE   },  //credit: Werner Moecke
		{  PYRAMID,                     "Pyramid",              0,          0,      FALSE   },  //credit: http://www.theledcube.com/source-code/, Kevin Carlborg (L3D Cube port)
        {  RAIN,                        "Rain",                 1,          4,      FALSE   },  //credit: Kevin Carlborg, Werner Moecke (Matrix Mode)
        {  RAINBOW,                     "Rainbow",              0,          0,      FALSE   },  //credit: Kevin Carlborg
		{  RAND_PATH_AROUND,            "RandomPath",           0,          0,      FALSE   },  //credit: http://www.theledcube.com/source-code/, Kevin Carlborg (L3D Cube port)
//		{  ROMAN,                       "RomanCandle",          0,          1,      FALSE   },  //credit: alex ?  mod by socaljj
		{  SINELINES,                   "SineLines",  		    0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
		{  SINEWAVE,                    "SineWave",    	        0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
		{  CLASSICPLANES,               "SlidingPlanes",        0,          0,      FALSE   },  //credit: smf mod by socaljj
		{  SLIDESHOW,                   "SlideShow",            0,          0,      FALSE   },  //credit: Werner Moecke, Kevin Carlborg (memory optimization, new images)
		{  SNAKE,                       "Snake",                0,          0,      FALSE   },  //credit: perkbrian modded by socaljj
        {  SQUARRAL,                    "Squarrel",             0,          0,      FALSE   },  //credit: Alex Hornstein
        {  SPECTRUM,                    "Spectrum",	            0,          2,      FALSE   },  //credit: Alex Hornstein, Werner Moecke (extra settings)
        {  COLORSTRIPES,                "Stripes",              0,          0,      FALSE   },  //credit: Werner Moecke
        {  TEXT,                        "Text",                 2,          4,      TRUE    },  //credit: Alex Hornstein, Hans-Peter "Hape", Werner Moecke (C++ port, extra settings)
        {  THEATERCHASE,                "TheaterChase",         0,          0,      FALSE   },  //credit: Kevin Carlborg
		{  TRANQUILITY,                 "Tranquility",          0,          0,      FALSE   },  //credit: CubeTube Library
        {  COLORFADE,                   "Transition",           0,          0,      FALSE   },  //credit: Werner Moecke
		{  UPNDOWN,	               	    "UpDown",               0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  VOXELSLEFTBEHIND,            "VoxelDrop",  		    0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  VOXELRANDOM,                 "VoxelRandom",     		0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  WARMFADE,                    "WarmFade",             0,          0,      FALSE   },  //credit: Kevin Carlborg
        {  WHIRLWIND,                   "Whirlwind",            0,          0,      FALSE   },  //credit: Bill Marrs
		{  WORMS,                       "Worms",    		    0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  ZONE,                        "Zone",                 4,          3,      FALSE   },  //credit: Kevin Carlborg
        {  ZONECHASER,                  "ZoneChase",			4,          0,      FALSE   }   //credit: Werner Moecke
};

static const switchParams switchTitleStruct[] =
{ 
    /*  modeId           S1Title                S2Title                S3Title                S4Title 
     *  ---------------  ---------------------- ---------------------- ---------------------- ----------------------  */
	   {  SPECTRUM,      "Smooth",              "Peaks",               "",                    ""                     },
	   {  TEXT,          "Bolden",              "No BG",               "Black Text",          "Sweep BG"		 },
	   {  CHRISTMASTREE, "Make it Snow",        "Pulse Star",          "Lights On",           ""                     },
	   {  CUBES,         "Fill",                "Sweep BG",            "Bleed Edges",         "Bleed Sides"          },
	   {  RAIN,          "Sweep BG",            "Matrix Mode",         "Fade Bottom",         "Lightning!"           },
	   {  FILLER,        "Sweep BG",            "",                    "",                    ""                     },
	   {  ZONE,          "Loop",                "Sweep BG",            "Lerp",	          ""                     },
	   {  DIGI,          "Color Sweep",         "Random Colors",       "Fade In",            ""                     },
	   {  CUBE_CLASSICS, "Sweep BG",            "",                    "",                    ""                     },
	   {  COLORBREATHE,  "Sweep BG",            "",                    "",                    ""                     },
	   {  CLOCK,         "3D Clock",            "24h/12h",             "Sweep BG",            "No BG"                },
//	   {  ROMAN,         "Sound Reactive",      "",                    "",                    ""                     },
	   {  ACIDRAIN,      "Sound Reactive",      "",                    "",                    ""                     },
	   {  GOLDRAIN,      "Sound Reactive",      "",                    "",                    ""                     },
	   {  GYROPHARE_FR,  "Bicolore",            "Reactif au son",      "Trainee",             ""                     },
};

/* ======================= ADD NEW AUX SWITCH STRUCT HERE. ======================= 
 * Use these switches to turn things on and off or toggle bewteen two options
 * @Param auxSwitchId        The ID of the switch     
 * @Param auxSwitchState     set the default switch state here
 * @Param auxSwitchTitle     Title/Description of the switch read in by the app
 * @Param auxSwitchOnTitle   Title of the ON/TRUE state of the switch read in by the app
 * @Param auxSwitchOffTitle  Title of the OFF/FALSE state of the switch read in by the app
 */
auxSwitchParams auxSwitchStruct[] = 
{ 
     /*    auxSwitchId      auxSwitchState  auxSwitchTitle         auxSwitchOnTitle       auxSwitchOffTitle    
     *     ---------------  --------------  ---------------------- ---------------------- ----------------------*/
	    {  SHFL,            TRUE,			"Shuffle",	           "ON",                  "OFF"                },
	    {  ASO,             TRUE,			"Auto Shut Off",	   "ON",                  "OFF"                },
	    {  RLM,             FALSE,			"On Startup",          "Run Last Mode",       "Run Demo"				   }
	    //{  LIGHTSENSOR,     TRUE,           "Brightness Control",  "Light Sensor",        "App Controlled"     }, //Shown here as an example
};

/* ========== AUTO SHUT OFF (ASO) Defines for Cloud Function: Function ========== */
/*#define ASO_CMD_ON              "ASO_ON"
#define ASO_CMD_OFF             "ASO_OFF"
#define ASO_CMD_STATUS          "ASO_STATUS"
#define ASO_STATUS_OFF          2000
#define ASO_STATUS_ON           2001*/

/* ========================= Local Aux Switch variables =========================== */
bool autoShutOff;   //Should we shut off the lights at certain times? This is toggled from the app
                    //Configure the Auto Shut Off times in the loop() function 
bool rememberLastMode;   //Should we remember the last mode ran? This is toggled from the app and kept in EEPROM

//Preset speed constants
const int speedPresets[] = {120, 100, 80, 70, 50, 30, 20, 10, 1};  //in mSec, slow to fast       

//Time Interval constants            hh*mm*ss*ms    
const unsigned long oneMinuteInterval =     1*60*1000;	//Read temp every minute
//unsigned long twoMinuteInterval =     2*60*1000;	//Change mode every 2 minutes in demo - Now using a Timer
//unsigned long oneHourInterval =       1*60*60*1000; //auto off in 1 hr when night time
//unsigned long oneDayInterval = 	     24*60*60*1000; //time sync interval - 24 hours
//unsigned long iftttWeatherInterval = 10*60*1000;    //revert back to last mode for IFTTT Weather
//unsigned long start;

//Program Flags
bool run;           //Use this for modes that don't need to loop. Set the color, then stop sending commands to the pixels
bool stop;          //Use this to break out of sequence loops when changing to a new mode
bool demo;          //Use this to enable/disable the demo sequence playback 
bool reboot;        //Use this to flag when a System.reset() is requested by the phone app.
bool isFirstLap;
bool shuffleMode;
volatile bool stopDemo;		//Set to TRUE when the Interrupt Timer demoTimer gets triggered

// Le registre actif publie 62 modes historiques et cinq évolutions explicites.
static_assert(sizeof modeStruct / sizeof modeStruct[0] == 67,
    "Le registre actif doit contenir exactement 67 modes");

// Position du prochain mode dans l'ordre mélangé, comprise entre zéro et 67.
uint8_t shuffleIdx;

// Index compacts des 67 entrées actives du registre de modes.
uint8_t modeShuffleOrder[sizeof modeStruct / sizeof modeStruct[0]];

static_assert(sizeof modeShuffleOrder < 256,
    "L'ordre des modes doit rester adressable sur un octet");

//Misc variables
unsigned long previousMillis = 0;
unsigned long lastCommandReceived = 0;
unsigned long lastSync = 0;
//unsigned long lastModeSet=-twoMinuteInterval;   //Registers last time a mode has been changed in Demo mode
uint32_t defaultColor; //The NORMAL mode color
uint32_t color1, color2, color3, color4, color5, color6;

//Variables to hold the settings to each mode requiring them
bool switch1, switch2, switch3, switch4;
bool lastSwitchState[4];
bool lastDemo;
int timeZone;
int currentModeID;  //This is the ID of the current mode selected - used in the case statement
int previousModeID;
int lastBrightness;
Color lastCol;
uint32_t lastColors[6];

//Particle Cloud Variables
int wifi = 0;          //used for general info and setup
int hour = 0;          //used for general info and setup
int speed, brightness;		//speed not to be confused with speedIndex below, this is the local speed (delay) value
int speedIndex;				//Let the cloud know what speed preset we are using
char modeNameList[MAX_PUBLISHED_STRING_SIZE]  = "None";  //Holds all mode info comma delimited. Use this to populate the android app
char modeParamList[MAX_PUBLISHED_STRING_SIZE] = "None";
char auxSwitchList[MAX_PUBLISHED_STRING_SIZE] = "None";
char currentModeName[TEXT_LENGTH]             = "None";  //Holds current selected mode
char deviceInfo[MAX_PUBLISHED_STRING_SIZE]    = "";
char debug[200];                    //We might want some debug text for development
int micValue = 0;

/* ======================== Mode-specific Definitions ======================== */
//CHASER mode specific Start and End Pixels, re-use some from ZONE mode
//int ChaserZone3Section1End   = 177;
//int chaserZone3Section2Start = 189;
//#define CHASER_LENGTH			PIXEL_CNT
const uint16_t zone1Start = 0;
const uint16_t zone1End   = (PIXEL_CNT / 4) - 1;   //127
const uint16_t zone2Start = zone1End + 1;          //128
const uint16_t zone2End   = (zone2Start * 2) - 1;  //255
const uint16_t zone3Start = PIXEL_CNT / 2;         //256
const uint16_t zone3End   = zone3Start + zone1End; //383
const uint16_t zone4Start = zone3End + 1;          //384
const uint16_t zone4End   = PIXEL_CNT - 1;		//511


/* ========================= FROZEN mode Definitions ========================= */
Color snowFlakeColor;

/* ====================== EEPROM Addressing Definitions ====================== */
/************************
 *      constants       *
 ************************/
#define PAINTER_START_ADDR		0		// start address for the drawing buffer in CUBE_PAINTER
#define MAX_EEPROM_SIZE			2047	// the maximum available space in EEPROM storage (Photon)
#define TEXT_START_ADDR			PIXEL_CNT * BPP + 1									// offset for the text store in TEXT mode
#define SWITCHES_START_ADDR		TEXT_START_ADDR + TEXT_LENGTH + 1					// offset for the lastSwitchState store
#define COLORS_START_ADDR		SWITCHES_START_ADDR + sizeof(lastSwitchState) + 1	// offset for the lastColors store
#define LASTMODE_START_ADDR		COLORS_START_ADDR + sizeof(lastColors) + 1			// offset for the currentModeID store
#define SPEED_START_ADDR		LASTMODE_START_ADDR + sizeof(int) + 1               // offset for the speedIndex store
#define BRIGHT_START_ADDR		SPEED_START_ADDR + sizeof(int) + 1                  // offset for the brightness store
#define AUXSW_START_ADDR		BRIGHT_START_ADDR + sizeof(int) + 1                 // offset for the auxSwitchStruct switch store

/* ========================= LISTENER mode Definitions ======================= */
#if L3D_LISTENER_ENABLED
// Package size we expect. The footer byte is included here!
#define TPM2NET_HEADER_SIZE     6
#define CUBE_PACKET_SIZE     (PIXELS_PER_PANEL * SIDE * BPP + TPM2NET_HEADER_SIZE) + 1 // 1536 Data bytes + footer byte
#define SINGLE_PLANE_PACKET_SIZE (PIXELS_PER_PANEL * BPP + TPM2NET_HEADER_SIZE) + 1  // 198 Data bytes + footer byte
// #define EXPECTED_PACKET_SIZE    (PIXELS_PER_PANEL * BPP + TPM2NET_HEADER_SIZE) + 1  // 198 Data bytes + footer byte
//some tpm2.net constants
#define TPM2NET_HEADER_IDENT    0x9C
#define TPM2NET_CMD_DATAFRAME   0xDA
//#define TPM2NET_CMD_COMMAND     0xC0
//#define TPM2NET_CMD_ANSWER      0xAC
//#define TPM2NET_FOOTER_IDENT    0x36
//#define TPM2NET_PACKET_TIMEOUT  0xFA	// 1/4 of a second
UDP Udp;			//an UDP instance to let us receive packets over UDP
uint8_t countdown;	// Keep a watchdog count to 100 max failed UDP buffer read attempts
long maximum_received_packet = 0; // we haven't seen a packet yet
void listen(void);
#endif

/* ====================== AUDIO SPECTRUM mode Definitions ==================== */
#define MICROPHONE              12
#define GAIN_CONTROL            11
//#define SMOOTH_SW               D2
//#define MODE_BT                 D3
#define SAMPLES                 2048
#define M                       4   // If the M value changes, then the 'ARRAY_SIZE' constant also needs
#define ARRAY_SIZE              16  // to be changed to reflect the result of the formula: pow(2,M)
#define INPUTLEVEL              63  // This sets the sensitivity for the onboard AGC circuit (0-255); the higher, the more sensitive
//bool smooth, dotMode;
float maxVal=1000;
void FFTJoy(void);
short FFT(short int dir,int m,float *x,float *y);


/* =========================== Text mode Definitions ========================= */
char message[TEXT_LENGTH];
char textInputString[TEXT_LENGTH];           //Holds the Text for any mode needing a text input - only useful for a Neopixel Matrix
uint8_t thickness=0;
uint8_t whichTextMode = 0;
float pos=0;
bool isNewText = FALSE;
void showChar(char a, Point p, Color col);
void marquee(const char* text, float pos, Color col);
void showText(uint32_t color1, uint32_t color2);
void showMarqueeChar(char a, int pos, Color col);
void textScroll(uint32_t color1, uint32_t color2);
void textMarquee(uint32_t color1, uint32_t color2);
void showChar(char a, Point origin, Point angle, Color col);
void scrollText(const char* text, Point initialPosition, Color col);
void showChar(char a, Point origin, Point pivot, Point angle, Color col);

/*static const unsigned char PROGMEM fontTable[]  =
{
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00	// Char 000 (.)
};*/

static const unsigned char PROGMEM fontTable[2048]  =
{
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00,	// Char 000 (.)
	0x7E, 0x81, 0xA5, 0x81, 0x9D, 0xB9, 0x81, 0x7E,	// Char 001 (.)
	0x7E, 0xFF, 0xDB, 0xFF, 0xE3, 0xC7, 0xFF, 0x7E,	// Char 002 (.)
	0x6C, 0xFE, 0xFE, 0xFE, 0x7C, 0x38, 0x10, 0x00,	// Char 003 (.)
	0x10, 0x38, 0x7C, 0xFE, 0x7C, 0x38, 0x10, 0x00,	// Char 004 (.)
	0x38, 0x7C, 0x38, 0xFE, 0xFE, 0x10, 0x10, 0x7C,	// Char 005 (.)
	0x00, 0x18, 0x3C, 0x7E, 0xFF, 0x7E, 0x18, 0x7E,	// Char 006 (.)
	0x00, 0x00, 0x18, 0x3C, 0x3C, 0x18, 0x00, 0x00,	// Char 007 (.)
	0xFF, 0xFF, 0xE7, 0xC3, 0xC3, 0xE7, 0xFF, 0xFF,	// Char 008 (.)
	0x00, 0x3C, 0x66, 0x42, 0x42, 0x66, 0x3C, 0x00,	// Char 009 (.)
	0xFF, 0xC3, 0x99, 0xBD, 0xBD, 0x99, 0xC3, 0xFF,	// Char 010 (.)
	0x0F, 0x07, 0x0F, 0x7D, 0xCC, 0xCC, 0xCC, 0x78,	// Char 011 (.)
	0x3C, 0x66, 0x66, 0x66, 0x3C, 0x18, 0x7E, 0x18,	// Char 012 (.)
	0x3F, 0x33, 0x3F, 0x30, 0x30, 0x70, 0xF0, 0xE0,	// Char 013 (.)
	0x7F, 0x63, 0x7F, 0x63, 0x63, 0x67, 0xE6, 0xC0,	// Char 014 (.)
	0x99, 0x5A, 0x3C, 0xE7, 0xE7, 0x3C, 0x5A, 0x99,	// Char 015 (.)
	0x80, 0xE0, 0xF8, 0xFE, 0xF8, 0xE0, 0x80, 0x00,	// Char 016 (.)
	0x02, 0x0E, 0x3E, 0xFE, 0x3E, 0x0E, 0x02, 0x00,	// Char 017 (.)
	0x18, 0x3C, 0x7E, 0x18, 0x18, 0x7E, 0x3C, 0x18,	// Char 018 (.)
	0x66, 0x66, 0x66, 0x66, 0x66, 0x00, 0x66, 0x00,	// Char 019 (.)
	0x7F, 0xDB, 0xDB, 0x7B, 0x1B, 0x1B, 0x1B, 0x00,	// Char 020 (.)
	0x3F, 0x60, 0x7C, 0x66, 0x66, 0x3E, 0x06, 0xFC,	// Char 021 (.)
	0x00, 0x00, 0x00, 0x00, 0x7E, 0x7E, 0x7E, 0x00,	// Char 022 (.)
	0x18, 0x3C, 0x7E, 0x18, 0x7E, 0x3C, 0x18, 0xFF,	// Char 023 (.)
	0x18, 0x3C, 0x7E, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 024 (.)
	0x18, 0x18, 0x18, 0x18, 0x7E, 0x3C, 0x18, 0x00,	// Char 025 (.)
	0x00, 0x18, 0x0C, 0xFE, 0x0C, 0x18, 0x00, 0x00,	// Char 026 (.)
	0x00, 0x30, 0x60, 0xFE, 0x60, 0x30, 0x00, 0x00,	// Char 027 (.)
	0x00, 0x00, 0xC0, 0xC0, 0xC0, 0xFE, 0x00, 0x00,	// Char 028 (.)
	0x00, 0x24, 0x66, 0xFF, 0x66, 0x24, 0x00, 0x00,	// Char 029 (.)
	0x00, 0x18, 0x3C, 0x7E, 0xFF, 0xFF, 0x00, 0x00,	// Char 030 (.)
	0x00, 0xFF, 0xFF, 0x7E, 0x3C, 0x18, 0x00, 0x00,	// Char 031 (.)
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 032 ( )
	0x18, 0x18, 0x18, 0x18, 0x18, 0x00, 0x18, 0x00,	// Char 033 (!)
	0x6C, 0x6C, 0x6C, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 034 (")
	0x6C, 0x6C, 0xFE, 0x6C, 0xFE, 0x6C, 0x6C, 0x00,	// Char 035 (#)
	0x18, 0x7E, 0xC0, 0x7C, 0x06, 0xFC, 0x18, 0x00,	// Char 036 ($)
	0x00, 0xC6, 0xCC, 0x18, 0x30, 0x66, 0xC6, 0x00,	// Char 037 (%)
	0x38, 0x6C, 0x38, 0x76, 0xDC, 0xCC, 0x76, 0x00,	// Char 038 (&)
	0x30, 0x30, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 039 (')
	0x0C, 0x18, 0x30, 0x30, 0x30, 0x18, 0x0C, 0x00,	// Char 040 (()
	0x30, 0x18, 0x0C, 0x0C, 0x0C, 0x18, 0x30, 0x00,	// Char 041 ())
	0x00, 0x66, 0x3C, 0xFF, 0x3C, 0x66, 0x00, 0x00,	// Char 042 (*)
	0x00, 0x18, 0x18, 0x7E, 0x18, 0x18, 0x00, 0x00,	// Char 043 (+)
	0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x30,	// Char 044 (,)
	0x00, 0x00, 0x00, 0x7E, 0x00, 0x00, 0x00, 0x00,	// Char 045 (-)
	0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00,	// Char 046 (.)
	0x06, 0x0C, 0x18, 0x30, 0x60, 0xC0, 0x80, 0x00,	// Char 047 (/)
	0x7C, 0xCE, 0xDE, 0xF6, 0xE6, 0xC6, 0x7C, 0x00,	// Char 048 (0)
	0x18, 0x38, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00,	// Char 049 (1)
	0x7C, 0xC6, 0x06, 0x7C, 0xC0, 0xC0, 0xFE, 0x00,	// Char 050 (2)
	0xFE, 0xFE, 0x06, 0x7C, 0x06, 0xFE, 0xFE, 0x00,	// Char 051 (3)
	0x0C, 0xCC, 0xCC, 0xCC, 0xFE, 0x0C, 0x0C, 0x00,	// Char 052 (4)
	0xFE, 0xC0, 0xFC, 0x06, 0x06, 0xC6, 0x7C, 0x00,	// Char 053 (5)
	0x7C, 0xC0, 0xC0, 0xFC, 0xC6, 0xC6, 0x7C, 0x00,	// Char 054 (6)
	0xFE, 0x06, 0x06, 0x0C, 0x18, 0x30, 0x30, 0x00,	// Char 055 (7)
	0x7C, 0xC6, 0xC6, 0x7C, 0xC6, 0xC6, 0x7C, 0x00,	// Char 056 (8)
	0x7C, 0xC6, 0xC6, 0x7E, 0x06, 0x06, 0x7C, 0x00,	// Char 057 (9)
	0x00, 0x18, 0x18, 0x00, 0x00, 0x18, 0x18, 0x00,	// Char 058 (:)
	0x00, 0x18, 0x18, 0x00, 0x00, 0x18, 0x18, 0x30,	// Char 059 (;)
	0x0C, 0x18, 0x30, 0x60, 0x30, 0x18, 0x0C, 0x00,	// Char 060 (<)
	0x00, 0x00, 0x7E, 0x00, 0x7E, 0x00, 0x00, 0x00,	// Char 061 (=)
	0x30, 0x18, 0x0C, 0x06, 0x0C, 0x18, 0x30, 0x00,	// Char 062 (>)
	0x3C, 0x66, 0x0C, 0x18, 0x18, 0x00, 0x18, 0x00,	// Char 063 (?)
	0x7C, 0xC6, 0xDE, 0xDE, 0xDE, 0xC0, 0x7E, 0x00,	// Char 064 (@)
	0x38, 0x6C, 0xC6, 0xC6, 0xFE, 0xC6, 0xC6, 0x00,	// Char 065 (A)
	0xFC, 0xC6, 0xC6, 0xFC, 0xC6, 0xC6, 0xFC, 0x00,	// Char 066 (B)
	0x7C, 0xC6, 0xC0, 0xC0, 0xC0, 0xC6, 0x7C, 0x00,	// Char 067 (C)
	0xF8, 0xCC, 0xC6, 0xC6, 0xC6, 0xCC, 0xF8, 0x00,	// Char 068 (D)
	0xFE, 0xC0, 0xC0, 0xF8, 0xC0, 0xC0, 0xFE, 0x00,	// Char 069 (E)
	0xFE, 0xC0, 0xC0, 0xF8, 0xC0, 0xC0, 0xC0, 0x00,	// Char 070 (F)
	0x7C, 0xC6, 0xC0, 0xC0, 0xCE, 0xC6, 0x7C, 0x00,	// Char 071 (G)
	0xC6, 0xC6, 0xC6, 0xFE, 0xC6, 0xC6, 0xC6, 0x00,	// Char 072 (H)
	0x7E, 0x18, 0x18, 0x18, 0x18, 0x18, 0x7E, 0x00,	// Char 073 (I)
	0x06, 0x06, 0x06, 0x06, 0x06, 0xC6, 0x7C, 0x00,	// Char 074 (J)
	0xC6, 0xCC, 0xD8, 0xF0, 0xD8, 0xCC, 0xC6, 0x00,	// Char 075 (K)
	0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xFE, 0x00,	// Char 076 (L)
	0xC6, 0xEE, 0xFE, 0xFE, 0xD6, 0xC6, 0xC6, 0x00,	// Char 077 (M)
	0xC6, 0xE6, 0xF6, 0xDE, 0xCE, 0xC6, 0xC6, 0x00,	// Char 078 (N)
	0x7C, 0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 079 (O)
	0xFC, 0xC6, 0xC6, 0xFC, 0xC0, 0xC0, 0xC0, 0x00,	// Char 080 (P)
	0x7C, 0xC6, 0xC6, 0xC6, 0xD6, 0xDE, 0x7C, 0x06,	// Char 081 (Q)
	0xFC, 0xC6, 0xC6, 0xFC, 0xD8, 0xCC, 0xC6, 0x00,	// Char 082 (R)
	0x7C, 0xC6, 0xC0, 0x7C, 0x06, 0xC6, 0x7C, 0x00,	// Char 083 (S)
	0xFF, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 084 (T)
	0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0xFE, 0x00,	// Char 085 (U)
	0xC6, 0xC6, 0xC6, 0xC6, 0xC6, 0x7C, 0x38, 0x00,	// Char 086 (V)
	0xC6, 0xC6, 0xC6, 0xC6, 0xD6, 0xFE, 0x6C, 0x00,	// Char 087 (W)
	0xC6, 0xC6, 0x6C, 0x38, 0x6C, 0xC6, 0xC6, 0x00,	// Char 088 (X)
	0xC6, 0xC6, 0xC6, 0x7C, 0x18, 0x30, 0xE0, 0x00,	// Char 089 (Y)
	0xFE, 0x06, 0x0C, 0x18, 0x30, 0x60, 0xFE, 0x00,	// Char 090 (Z)
	0x3C, 0x30, 0x30, 0x30, 0x30, 0x30, 0x3C, 0x00,	// Char 091 ([)
	0xC0, 0x60, 0x30, 0x18, 0x0C, 0x06, 0x02, 0x00,	// Char 092 (\)
	0x3C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x3C, 0x00,	// Char 093 (])
	0x10, 0x38, 0x6C, 0xC6, 0x00, 0x00, 0x00, 0x00,	// Char 094 (^)
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF,	// Char 095 (_)
	0x18, 0x18, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 096 (`)
	0x00, 0x00, 0x7C, 0x06, 0x7E, 0xC6, 0x7E, 0x00,	// Char 097 (a)
	0xC0, 0xC0, 0xC0, 0xFC, 0xC6, 0xC6, 0xFC, 0x00,	// Char 098 (b)
	0x00, 0x00, 0x7C, 0xC6, 0xC0, 0xC6, 0x7C, 0x00,	// Char 099 (c)
	0x06, 0x06, 0x06, 0x7E, 0xC6, 0xC6, 0x7E, 0x00,	// Char 100 (d)
	0x00, 0x00, 0x7C, 0xC6, 0xFE, 0xC0, 0x7C, 0x00,	// Char 101 (e)
	0x1C, 0x36, 0x30, 0x78, 0x30, 0x30, 0x78, 0x00,	// Char 102 (f)
	0x00, 0x00, 0x7E, 0xC6, 0xC6, 0x7E, 0x06, 0xFC,	// Char 103 (g)
	0xC0, 0xC0, 0xFC, 0xC6, 0xC6, 0xC6, 0xC6, 0x00,	// Char 104 (h)
	0x18, 0x00, 0x38, 0x18, 0x18, 0x18, 0x3C, 0x00,	// Char 105 (i)
	0x06, 0x00, 0x06, 0x06, 0x06, 0x06, 0xC6, 0x7C,	// Char 106 (j)
	0xC0, 0xC0, 0xCC, 0xD8, 0xF8, 0xCC, 0xC6, 0x00,	// Char 107 (k)
	0x38, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3C, 0x00,	// Char 108 (l)
	0x00, 0x00, 0xCC, 0xFE, 0xFE, 0xD6, 0xD6, 0x00,	// Char 109 (m)
	0x00, 0x00, 0xFC, 0xC6, 0xC6, 0xC6, 0xC6, 0x00,	// Char 110 (n)
	0x00, 0x00, 0x7C, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 111 (o)
	0x00, 0x00, 0xFC, 0xC6, 0xC6, 0xFC, 0xC0, 0xC0,	// Char 112 (p)
	0x00, 0x00, 0x7E, 0xC6, 0xC6, 0x7E, 0x06, 0x06,	// Char 113 (q)
	0x00, 0x00, 0xFC, 0xC6, 0xC0, 0xC0, 0xC0, 0x00,	// Char 114 (r)
	0x00, 0x00, 0x7E, 0xC0, 0x7C, 0x06, 0xFC, 0x00,	// Char 115 (s)
	0x18, 0x18, 0x7E, 0x18, 0x18, 0x18, 0x0E, 0x00,	// Char 116 (t)
	0x00, 0x00, 0xC6, 0xC6, 0xC6, 0xC6, 0x7E, 0x00,	// Char 117 (u)
	0x00, 0x00, 0xC6, 0xC6, 0xC6, 0x7C, 0x38, 0x00,	// Char 118 (v)
	0x00, 0x00, 0xC6, 0xC6, 0xD6, 0xFE, 0x6C, 0x00,	// Char 119 (w)
	0x00, 0x00, 0xC6, 0x6C, 0x38, 0x6C, 0xC6, 0x00,	// Char 120 (x)
	0x00, 0x00, 0xC6, 0xC6, 0xC6, 0x7E, 0x06, 0xFC,	// Char 121 (y)
	0x00, 0x00, 0xFE, 0x0C, 0x38, 0x60, 0xFE, 0x00,	// Char 122 (z)
	0x0E, 0x18, 0x18, 0x70, 0x18, 0x18, 0x0E, 0x00,	// Char 123 ({)
	0x18, 0x18, 0x18, 0x00, 0x18, 0x18, 0x18, 0x00,	// Char 124 (|)
	0x70, 0x18, 0x18, 0x0E, 0x18, 0x18, 0x70, 0x00,	// Char 125 (})
	0x76, 0xDC, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,	// Char 126 (~)
	0x00, 0x10, 0x38, 0x6C, 0xC6, 0xC6, 0xFE, 0x00,	// Char 127 (.)
	0x7C, 0xC6, 0xC0, 0xC0, 0xC0, 0xD6, 0x7C, 0x30,	// Char 128 (.)
	0xC6, 0x00, 0xC6, 0xC6, 0xC6, 0xC6, 0x7E, 0x00,	// Char 129 (.)
	0x0E, 0x00, 0x7C, 0xC6, 0xFE, 0xC0, 0x7C, 0x00,	// Char 130 (.)
	0x7E, 0x81, 0x3C, 0x06, 0x7E, 0xC6, 0x7E, 0x00,	// Char 131 (.)
	0x66, 0x00, 0x7C, 0x06, 0x7E, 0xC6, 0x7E, 0x00,	// Char 132 (.)
	0xE0, 0x00, 0x7C, 0x06, 0x7E, 0xC6, 0x7E, 0x00,	// Char 133 (.)
	0x18, 0x18, 0x7C, 0x06, 0x7E, 0xC6, 0x7E, 0x00,	// Char 134 (.)
	0x00, 0x00, 0x7C, 0xC6, 0xC0, 0xD6, 0x7C, 0x30,	// Char 135 (.)
	0x7E, 0x81, 0x7C, 0xC6, 0xFE, 0xC0, 0x7C, 0x00,	// Char 136 (.)
	0x66, 0x00, 0x7C, 0xC6, 0xFE, 0xC0, 0x7C, 0x00,	// Char 137 (.)
	0xE0, 0x00, 0x7C, 0xC6, 0xFE, 0xC0, 0x7C, 0x00,	// Char 138 (.)
	0x66, 0x00, 0x38, 0x18, 0x18, 0x18, 0x3C, 0x00,	// Char 139 (.)
	0x7C, 0x82, 0x38, 0x18, 0x18, 0x18, 0x3C, 0x00,	// Char 140 (.)
	0x70, 0x00, 0x38, 0x18, 0x18, 0x18, 0x3C, 0x00,	// Char 141 (.)
	0xC6, 0x10, 0x7C, 0xC6, 0xFE, 0xC6, 0xC6, 0x00,	// Char 142 (.)
	0x38, 0x38, 0x00, 0x7C, 0xC6, 0xFE, 0xC6, 0x00,	// Char 143 (.)
	0x0E, 0x00, 0xFE, 0xC0, 0xF8, 0xC0, 0xFE, 0x00,	// Char 144 (.)
	0x00, 0x00, 0x7F, 0x0C, 0x7F, 0xCC, 0x7F, 0x00,	// Char 145 (.)
	0x3F, 0x6C, 0xCC, 0xFF, 0xCC, 0xCC, 0xCF, 0x00,	// Char 146 (.)
	0x7C, 0x82, 0x7C, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 147 (.)
	0x66, 0x00, 0x7C, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 148 (.)
	0xE0, 0x00, 0x7C, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 149 (.)
	0x7C, 0x82, 0x00, 0xC6, 0xC6, 0xC6, 0x7E, 0x00,	// Char 150 (.)
	0xE0, 0x00, 0xC6, 0xC6, 0xC6, 0xC6, 0x7E, 0x00,	// Char 151 (.)
	0x66, 0x00, 0x66, 0x66, 0x66, 0x3E, 0x06, 0x7C,	// Char 152 (.)
	0xC6, 0x7C, 0xC6, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 153 (.)
	0xC6, 0x00, 0xC6, 0xC6, 0xC6, 0xC6, 0xFE, 0x00,	// Char 154 (.)
	0x18, 0x18, 0x7E, 0xD8, 0xD8, 0xD8, 0x7E, 0x18,	// Char 155 (.)
	0x38, 0x6C, 0x60, 0xF0, 0x60, 0x66, 0xFC, 0x00,	// Char 156 (.)
	0x66, 0x66, 0x3C, 0x18, 0x7E, 0x18, 0x7E, 0x18,	// Char 157 (.)
	0xF8, 0xCC, 0xCC, 0xFA, 0xC6, 0xCF, 0xC6, 0xC3,	// Char 158 (.)
	0x0E, 0x1B, 0x18, 0x3C, 0x18, 0x18, 0xD8, 0x70,	// Char 159 (.)
	0x0E, 0x00, 0x7C, 0x06, 0x7E, 0xC6, 0x7E, 0x00,	// Char 160 (.)
	0x1C, 0x00, 0x38, 0x18, 0x18, 0x18, 0x3C, 0x00,	// Char 161 (.)
	0x0E, 0x00, 0x7C, 0xC6, 0xC6, 0xC6, 0x7C, 0x00,	// Char 162 (.)
	0x0E, 0x00, 0xC6, 0xC6, 0xC6, 0xC6, 0x7E, 0x00,	// Char 163 (.)
	0x00, 0xFE, 0x00, 0xFC, 0xC6, 0xC6, 0xC6, 0x00,	// Char 164 (.)
	0xFE, 0x00, 0xC6, 0xE6, 0xF6, 0xDE, 0xCE, 0x00,	// Char 165 (.)
	0x3C, 0x6C, 0x6C, 0x3E, 0x00, 0x7E, 0x00, 0x00,	// Char 166 (.)
	0x3C, 0x66, 0x66, 0x3C, 0x00, 0x7E, 0x00, 0x00,	// Char 167 (.)
	0x18, 0x00, 0x18, 0x18, 0x30, 0x66, 0x3C, 0x00,	// Char 168 (.)
	0x00, 0x00, 0x00, 0xFC, 0xC0, 0xC0, 0x00, 0x00,	// Char 169 (.)
	0x00, 0x00, 0x00, 0xFC, 0x0C, 0x0C, 0x00, 0x00,	// Char 170 (.)
	0xC6, 0xCC, 0xD8, 0x3F, 0x63, 0xCF, 0x8C, 0x0F,	// Char 171 (.)
	0xC3, 0xC6, 0xCC, 0xDB, 0x37, 0x6D, 0xCF, 0x03,	// Char 172 (.)
	0x18, 0x00, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 173 (.)
	0x00, 0x33, 0x66, 0xCC, 0x66, 0x33, 0x00, 0x00,	// Char 174 (.)
	0x00, 0xCC, 0x66, 0x33, 0x66, 0xCC, 0x00, 0x00,	// Char 175 (.)
	0x38, 0x28, 0x28, 0x28, 0x2E, 0x22, 0x3E, 0x00,	// Char 176 (.)
	0x3C, 0x66, 0xC3, 0xA5, 0x99, 0xDB, 0x66, 0x3C,	// Char 177 (.)
	0xFC, 0xCE, 0xC7, 0xC3, 0xC3, 0xC7, 0x0E, 0xFC,	// Char 178 (.)
	0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18,	// Char 179 (.)
	0x18, 0x18, 0x18, 0x18, 0xF8, 0x18, 0x18, 0x18,	// Char 180 (.)
	0x18, 0x18, 0xF8, 0x18, 0xF8, 0x18, 0x18, 0x18,	// Char 181 (.)
	0x36, 0x36, 0x36, 0x36, 0xF6, 0x36, 0x36, 0x36,	// Char 182 (.)
	0x00, 0x00, 0x00, 0x00, 0xFE, 0x36, 0x36, 0x36,	// Char 183 (.)
	0x00, 0x00, 0xF8, 0x18, 0xF8, 0x18, 0x18, 0x18,	// Char 184 (.)
	0x36, 0x36, 0xF6, 0x06, 0xF6, 0x36, 0x36, 0x36,	// Char 185 (.)
	0x36, 0x36, 0x36, 0x36, 0x36, 0x36, 0x36, 0x36,	// Char 186 (.)
	0x00, 0x00, 0xFE, 0x06, 0xF6, 0x36, 0x36, 0x36,	// Char 187 (.)
	0x36, 0x36, 0xF6, 0x06, 0xFE, 0x00, 0x00, 0x00,	// Char 188 (.)
	0x36, 0x36, 0x36, 0x36, 0xFE, 0x00, 0x00, 0x00,	// Char 189 (.)
	0x18, 0x18, 0xF8, 0x18, 0xF8, 0x00, 0x00, 0x00,	// Char 190 (.)
	0x00, 0x00, 0x00, 0x00, 0xF8, 0x18, 0x18, 0x18,	// Char 191 (.)
	0x18, 0x18, 0x18, 0x18, 0x1F, 0x00, 0x00, 0x00,	// Char 192 (.)
	0x18, 0x18, 0x18, 0x18, 0xFF, 0x00, 0x00, 0x00,	// Char 193 (.)
	0x00, 0x00, 0x00, 0x00, 0xFF, 0x18, 0x18, 0x18,	// Char 194 (.)
	0x18, 0x18, 0x18, 0x18, 0x1F, 0x18, 0x18, 0x18,	// Char 195 (.)
	0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00,	// Char 196 (.)
	0x18, 0x18, 0x18, 0x18, 0xFF, 0x18, 0x18, 0x18,	// Char 197 (.)
	0x18, 0x18, 0x1F, 0x18, 0x1F, 0x18, 0x18, 0x18,	// Char 198 (.)
	0x36, 0x36, 0x36, 0x36, 0x37, 0x36, 0x36, 0x36,	// Char 199 (.)
	0x36, 0x36, 0x37, 0x30, 0x3F, 0x00, 0x00, 0x00,	// Char 200 (.)
	0x00, 0x00, 0x3F, 0x30, 0x37, 0x36, 0x36, 0x36,	// Char 201 (.)
	0x36, 0x36, 0xF7, 0x00, 0xFF, 0x00, 0x00, 0x00,	// Char 202 (.)
	0x00, 0x00, 0xFF, 0x00, 0xF7, 0x36, 0x36, 0x36,	// Char 203 (.)
	0x36, 0x36, 0x37, 0x30, 0x37, 0x36, 0x36, 0x36,	// Char 204 (.)
	0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0x00,	// Char 205 (.)
	0x36, 0x36, 0xF7, 0x00, 0xF7, 0x36, 0x36, 0x36,	// Char 206 (.)
	0x18, 0x18, 0xFF, 0x00, 0xFF, 0x00, 0x00, 0x00,	// Char 207 (.)
	0x36, 0x36, 0x36, 0x36, 0xFF, 0x00, 0x00, 0x00,	// Char 208 (.)
	0x00, 0x00, 0xFF, 0x00, 0xFF, 0x18, 0x18, 0x18,	// Char 209 (.)
	0x00, 0x00, 0x00, 0x00, 0xFF, 0x36, 0x36, 0x36,	// Char 210 (.)
	0x36, 0x36, 0x36, 0x36, 0x3F, 0x00, 0x00, 0x00,	// Char 211 (.)
	0x18, 0x18, 0x1F, 0x18, 0x1F, 0x00, 0x00, 0x00,	// Char 212 (.)
	0x00, 0x00, 0x1F, 0x18, 0x1F, 0x18, 0x18, 0x18,	// Char 213 (.)
	0x00, 0x00, 0x00, 0x00, 0x3F, 0x36, 0x36, 0x36,	// Char 214 (.)
	0x36, 0x36, 0x36, 0x36, 0xFF, 0x36, 0x36, 0x36,	// Char 215 (.)
	0x18, 0x18, 0xFF, 0x18, 0xFF, 0x18, 0x18, 0x18,	// Char 216 (.)
	0x18, 0x18, 0x18, 0x18, 0xF8, 0x00, 0x00, 0x00,	// Char 217 (.)
	0x00, 0x00, 0x00, 0x00, 0x1F, 0x18, 0x18, 0x18,	// Char 218 (.)
	0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,	// Char 219 (.)
	0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF,	// Char 220 (.)
	0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0, 0xF0,	// Char 221 (.)
	0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F, 0x0F,	// Char 222 (.)
	0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00,	// Char 223 (.)
	0x00, 0x00, 0x76, 0xDC, 0xC8, 0xDC, 0x76, 0x00,	// Char 224 (.)
	0x38, 0x6C, 0x6C, 0x78, 0x6C, 0x66, 0x6C, 0x60,	// Char 225 (.)
	0x00, 0xFE, 0xC6, 0xC0, 0xC0, 0xC0, 0xC0, 0x00,	// Char 226 (.)
	0x00, 0x00, 0xFE, 0x6C, 0x6C, 0x6C, 0x6C, 0x00,	// Char 227 (.)
	0xFE, 0x60, 0x30, 0x18, 0x30, 0x60, 0xFE, 0x00,	// Char 228 (.)
	0x00, 0x00, 0x7E, 0xD8, 0xD8, 0xD8, 0x70, 0x00,	// Char 229 (.)
	0x00, 0x66, 0x66, 0x66, 0x66, 0x7C, 0x60, 0xC0,	// Char 230 (.)
	0x00, 0x76, 0xDC, 0x18, 0x18, 0x18, 0x18, 0x00,	// Char 231 (.)
	0x7E, 0x18, 0x3C, 0x66, 0x66, 0x3C, 0x18, 0x7E,	// Char 232 (.)
	0x3C, 0x66, 0xC3, 0xFF, 0xC3, 0x66, 0x3C, 0x00,	// Char 233 (.)
	0x3C, 0x66, 0xC3, 0xC3, 0x66, 0x66, 0xE7, 0x00,	// Char 234 (.)
	0x0E, 0x18, 0x0C, 0x7E, 0xC6, 0xC6, 0x7C, 0x00,	// Char 235 (.)
	0x00, 0x00, 0x7E, 0xDB, 0xDB, 0x7E, 0x00, 0x00,	// Char 236 (.)
	0x06, 0x0C, 0x7E, 0xDB, 0xDB, 0x7E, 0x60, 0xC0,	// Char 237 (.)
	0x38, 0x60, 0xC0, 0xF8, 0xC0, 0x60, 0x38, 0x00,	// Char 238 (.)
	0x78, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0x00,	// Char 239 (.)
	0x00, 0x7E, 0x00, 0x7E, 0x00, 0x7E, 0x00, 0x00,	// Char 240 (.)
	0x18, 0x18, 0x7E, 0x18, 0x18, 0x00, 0x7E, 0x00,	// Char 241 (.)
	0x60, 0x30, 0x18, 0x30, 0x60, 0x00, 0xFC, 0x00,	// Char 242 (.)
	0x18, 0x30, 0x60, 0x30, 0x18, 0x00, 0xFC, 0x00,	// Char 243 (.)
	0x0E, 0x1B, 0x1B, 0x18, 0x18, 0x18, 0x18, 0x18,	// Char 244 (.)
	0x18, 0x18, 0x18, 0x18, 0x18, 0xD8, 0xD8, 0x70,	// Char 245 (.)
	0x18, 0x18, 0x00, 0x7E, 0x00, 0x18, 0x18, 0x00,	// Char 246 (.)
	0x00, 0x76, 0xDC, 0x00, 0x76, 0xDC, 0x00, 0x00,	// Char 247 (.)
	0x38, 0x6C, 0x6C, 0x38, 0x00, 0x00, 0x00, 0x00,	// Char 248 (.)
	0x00, 0x00, 0x00, 0x18, 0x18, 0x00, 0x00, 0x00,	// Char 249 (.)
	0x00, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00,	// Char 250 (.)
	0x0F, 0x0C, 0x0C, 0x0C, 0xEC, 0x6C, 0x3C, 0x1C,	// Char 251 (.)
	0x78, 0x6C, 0x6C, 0x6C, 0x6C, 0x00, 0x00, 0x00,	// Char 252 (.)
	0x7C, 0x0C, 0x7C, 0x60, 0x7C, 0x00, 0x00, 0x00,	// Char 253 (.)
	0x00, 0x00, 0x3C, 0x3C, 0x3C, 0x3C, 0x00, 0x00,	// Char 254 (.)
	0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00	// Char 255 (.)
};


/* ====================== RAINBOW BURST mode Definitions ====================== */
// Index de voxel Rainbow Burst, compris entre zéro et 511.
uint16_t idex;

// Teinte Rainbow Burst, comprise entre zéro et 255.
uint8_t ihue;

void random_burst(void);


/* ======================== SQUARRAL mode Definitions ========================= */
// Nombre historique de positions dessinées dans la traînée Squarrel.
const uint8_t SQUARREL_TRAIL_LENGTH = 50;

// Position Squarrel compacte dont chaque axe reste entre 0 et 7.
typedef struct SquarrelPosition {
    CubeAxisIndex x;
    CubeAxisIndex y;
    CubeAxisIndex z;
} SquarrelPosition;

// Incrément Squarrel signé dont chaque axe reste entre -1 et 1.
typedef struct SquarrelIncrement {
    int8_t x;
    int8_t y;
    int8_t z;
} SquarrelIncrement;

static_assert(sizeof(SquarrelPosition) == 3,
    "Une position Squarrel doit tenir sur trois octets");
static_assert(sizeof(SquarrelIncrement) == 3,
    "Un incrément Squarrel doit tenir sur trois octets");

// Etat complet de Squarrel, actif uniquement pendant ce mode.
struct SquarrelState {
    int frame;
    uint8_t bound;
    int8_t boundInc;
    int8_t zIncrement;
    bool rainbowColor;
    uint8_t axis;
    SquarrelPosition trailPoints[SQUARREL_TRAIL_LENGTH];
    SquarrelPosition position;
    SquarrelIncrement increment;
    SquarrelPosition pixel;
};

static_assert(sizeof(((SquarrelState*)0)->trailPoints) == 150,
    "La traînée Squarrel doit occuper exactement 150 octets");
static_assert(sizeof(SquarrelState) == 168,
    "L'etat Squarrel complet doit occuper exactement 168 octets");

void squarral(void);
void add(SquarrelPosition& position, const SquarrelIncrement& increment);


/* ========================== PLASMA mode Definitions ========================= */
float phase, colorStretch;
void zPlasma(void);


/* ========================== PuckDude mode defines ========================== */
#define PDSPEED 10
int PDframe=0;
void puckDude(void);
void rotate_x(PackedPoint& a, int b);

// Nombre d'entrées incluant la sentinelle zéro pour PacMan et les fantômes.
const uint8_t PUCK_DUDE_MAIN_POINT_COUNT = 38;

// Nombre d'entrées incluant la sentinelle zéro pour les yeux des fantômes.
const uint8_t PUCK_DUDE_EYE_POINT_COUNT = 5;

// Sprites temporaires PacMan limités aux indices réellement dessinés.
struct PuckDudeScratch {
    PackedPoint puckDude[PUCK_DUDE_MAIN_POINT_COUNT];
    PackedPoint ghost[PUCK_DUDE_MAIN_POINT_COUNT];
    PackedPoint ghostEye[PUCK_DUDE_EYE_POINT_COUNT];
};

static_assert(sizeof(PuckDudeScratch) == 243,
    "Les sprites utiles PacMan doivent occuper exactement 243 octets");


/* ========================= Transition Definitions ========================= */
#define LINEAR		0
#define POLAR       1
#define RED         0
#define GREEN       1
#define BLUE        2
uint8_t clamp(unsigned value, unsigned lowClamp, unsigned highClamp);
void transitionAll(Color endColor, uint16_t method);
void transitionOne(Color endColor, uint16_t index, uint16_t method);
void transitionHelper(
    Color startColor,
    Color endColor,
    uint16_t index,
    uint16_t method,
    uint8_t numSteps,
    uint8_t step,
    double polarDecreaseFactor,
    float polarIncreaseFactor);
int16_t getTransitionStep(
    uint8_t startChannel,
    uint8_t endChannel,
    uint16_t method,
    uint8_t numSteps,
    uint8_t step,
    double polarDecreaseFactor,
    float polarIncreaseFactor);


/* ======================== Whirlwind mode Definitions ======================== */
#define CYCLE_INTERVAL          60000 // milliseconds between restart
#define MAX_DOTS                19
#define                         MIN_RADI 1
#define                         MAX_RADI 5

// État temporaire Whirlwind regroupé pour rejoindre le scratch partagé.
struct WhirlwindState {
    PackedColor colors[MAX_DOTS];
    float angles[MAX_DOTS];
    float radii[MAX_DOTS];
    float heights[MAX_DOTS];
    int lastRand;
    int lastLastRand;
    unsigned long lastSwap;
    GeometryScalar center[3];
};

static_assert(sizeof(WhirlwindState) >= 288,
    "L'état Whirlwind doit contenir ses quatre tableaux historiques");
static_assert(sizeof(WhirlwindState) == 312,
    "L'etat Whirlwind complet doit occuper exactement 312 octets");
void whirlWind(void);
void randomColor(struct Color* color);
void randomPackedColor(PackedColor* color);
float randomDecimal(void);
//float radius(float x, float y, float z);


/* ============================ Snake 3D mode defines ========================= */
// Nombre maximal de segments, égal au nombre de positions du cube.
const uint16_t SNAKE_CAPACITY = PIXEL_CNT;

// Longueur atteinte automatiquement avant de dépendre des cibles mangées.
const uint8_t SNAKE_INITIAL_LENGTH = 10;

// Nombre de directions orthogonales possibles dans un espace à trois axes.
const uint8_t SNAKE_DIRECTION_COUNT = 6;

// Nombre maximal de tirages aléatoires avant le parcours déterministe de repli.
const uint16_t SNAKE_TREAT_RANDOM_ATTEMPTS = PIXEL_CNT;

// Borne exclusive historique de random(0, 7) pour chaque axe d'une cible.
const uint8_t SNAKE_TREAT_SIDE = SIDE - 1;

// Position discrète compacte utilisée par le corps et la cible de Snake.
struct voxel {
  CubeCoordinate j;
  CubeCoordinate k;
  CubeCoordinate l;
};

static_assert(sizeof(voxel) == 3, "Un voxel Snake doit tenir sur trois octets signes");

// Six déplacements orthogonaux conservés dans l'ordre de priorité historique.
const voxel possibleDirections[SNAKE_DIRECTION_COUNT] = {
  { 1,  0,  0},
  {-1,  0,  0},
  { 0,  1,  0},
  { 0, -1,  0},
  { 0,  0,  1},
  { 0,  0, -1}
};

// Nombre de segments actuellement valides dans le scratch partagé.
uint16_t snakeLength;

// Cible unique actuellement affichée par Snake.
voxel snakeTreat;

// Indique si snakeTreat contient une cible à afficher et poursuivre.
bool snakeTreatActive;

// Index signé dans possibleDirections ; -1 indique que le serpent est bloqué.
int8_t snakeDirectionIndex;

// Numéro de frame courant depuis la dernière réinitialisation de Snake.
uint32_t snakeFrameCount;

// Frame de collision ; zéro indique que le serpent est encore vivant.
uint32_t snakeDeathFrame;
void snakeResetCube(void);
void snake(void);


/* ========================== clasic planes mode defines ======================= */
// Incrément signé de SlidingPlanes, limité à moins un ou un.
int8_t CPinc = 1;

// Position de plan SlidingPlanes, comprise entre zéro et huit.
int8_t CPpos = 0;

// Compteur de frames SlidingPlanes utilisé par les cycles de couleur.
uint32_t CPframe = 0;
void classicPlanes();


/* =========================== 3D spiral mode defines ========================== */
// Sens de variation du niveau intérieur de LineSpiral.
bool INCREASE_LOOP = true;

// Sens de déplacement de la cible LineSpiral.
bool INCREASE_TARGET = true;

// Position entière de la cible, toujours comprise entre zéro et sept.
int8_t TARGET = 0;

// Luminosité brute mémorisée à l'entrée de LineSpiral.
uint8_t SPbrightness;

// Niveau intérieur de la spirale, compris entre zéro et trois.
uint8_t LOOP_NO = 0;

// Pas entier historique de la cible LineSpiral.
const uint8_t SPIRAL_STEP = 1;

// Côté courant de la spirale, compris entre un et quatre.
uint8_t DSSIDE = 1;

// Phase de rotation des couleurs, comprise entre zéro et trente.
uint8_t ColourRotatorState = 0;

static_assert(sizeof(CPinc) + sizeof(CPpos) == 2,
    "La position et l'incrément SlidingPlanes doivent occuper deux octets");
static_assert(sizeof(TARGET) + sizeof(SPbrightness) + sizeof(LOOP_NO) +
    sizeof(DSSIDE) + sizeof(ColourRotatorState) == 5,
    "L'état numérique LineSpiral doit occuper cinq octets");
void dSpiral(void);
void dSpiral_setup(void);


/* =========================== Hyper Cube mode defines ========================= */
/*#define		HCdiameter  3.5
#define		TWO_PI     	2.0*PI
#define		TWO_OVER_PI	2.0/PI
#define		HALF_PI		PI/2.0
float		HCdist;
float	 	HCdim = 1;
float	 	HCphase=0;
Color 		HCdrawColor=Color(255,150,100);
void hyper (void);
float HCfmod(float a, float b);
int HCfloor(float x);
float HCcos_32s(float x);
float HCcos_32(float x);
float HCsin_32(float x);
float HCdistance(float x, float y, float z, float x1, float y1, float z1);
float HCfmap(float input, float inMin, float inMax, float outMin, float outMax);
float HCtoFloat(int x);
*/

/* =========================== Matrix mode defines ========================== */
// Nombre de cases conservant les index historiques 1 à 8 de chaque flux.
const uint8_t MATRIX_COORDINATE_SLOTS = SIDE + 1;

// Etat complet de Matrix, actif uniquement pendant ce mode.
struct MatrixState {
    CubeAxisIndex voxelXw1[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelZw1[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelXw2[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelZw2[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelXw3[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelZw3[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelXw4[MATRIX_COORDINATE_SLOTS];
    CubeAxisIndex voxelZw4[MATRIX_COORDINATE_SLOTS];
    int8_t wave01;
    int8_t wave02;
    int8_t wave03;
    int8_t wave04;
};

static_assert(
    sizeof(((MatrixState*)0)->voxelXw1) + sizeof(((MatrixState*)0)->voxelZw1) +
    sizeof(((MatrixState*)0)->voxelXw2) + sizeof(((MatrixState*)0)->voxelZw2) +
    sizeof(((MatrixState*)0)->voxelXw3) + sizeof(((MatrixState*)0)->voxelZw3) +
    sizeof(((MatrixState*)0)->voxelXw4) + sizeof(((MatrixState*)0)->voxelZw4) == 72,
    "Les coordonnées Matrix doivent occuper exactement 72 octets");
static_assert(sizeof(MatrixState) == 76,
    "L'etat Matrix complet doit occuper exactement 76 octets");
Color brightLine01 = Color(244, 241, 250);
Color brightLine02 = Color(98, 193, 97);
Color brightLine03 = Color(30, 131, 30);
Color brightLine04 = Color(5, 45, 6);
Color brightLine05 = Color(6, 25, 3);
Color brightLine06 = Color(8, 15, 3);
Color medLine01 = Color(20, 158, 18);
Color medLine02 = Color(41, 114, 41);
Color medLine03 = Color(5, 45, 6);
Color medLine04 = Color(6, 25, 3);
Color medLine05 = Color(8, 15, 3);
Color darkLine01 = Color(10, 70, 10);
Color darkLine02 = Color(5, 55, 4);
Color darkLine03 = Color(3, 30, 4);
Color darkLine04 = Color(2, 15, 1);
Color darkLine05 = Color(1, 8, 1);
void matrix_setup(void);
void matrix(void);


/* =========================== Cube Bounce mode defines ========================== */
// Longueur constante du cube BouncyCube sur chacun des trois axes.
const uint8_t CUBE_BOUNCE_SIDE = 2;

// Coin du cube, borné entre zéro et six après chaque collision.
int8_t topLeftVoxel[3];

// Compteur de frames utilisé pour le changement de direction périodique.
uint32_t CBframe;

// Direction de chaque axe, bornée entre moins un et un.
int8_t CBdirection[3] = { 1, 1, 1};

static_assert(sizeof(topLeftVoxel) + sizeof(CBdirection) == 6,
    "Les positions et directions BouncyCube doivent occuper six octets");

Color cubeColor;
void cubeBounce_setup(void);
void cubeBounce(void);


/* ======================== LIGHTNING mode Definitions ======================= */
unsigned long lastLightning, lightningInterval, lastLightningInterval;
void lightning(void);


/* ============================ Collide mode defines ============================ */
// Nombre historique de points animés simultanément par Collide2.
const uint8_t COLLIDE_DOT_COUNT = 72;

// Point Collide2 compact : position 0 à 7, direction -1 à 1 et couleur RGB.
typedef struct CompactCollideDot {
    CubeAxisIndex x;
    CubeAxisIndex y;
    CubeAxisIndex z;
    int8_t directionX;
    int8_t directionY;
    int8_t directionZ;
    PackedColor color;
} CompactCollideDot;

static_assert(sizeof(CompactCollideDot) == 9,
    "Un point Collide2 compact doit tenir sur neuf octets");

// Etat complet de Collide2, actif uniquement pendant ce mode.
struct CollideState {
    CompactCollideDot dots[COLLIDE_DOT_COUNT];
};

static_assert(sizeof(CollideState) == 648,
    "Les 72 points Collide2 doivent occuper 648 octets");

void initCollide(void);
void collide2();
CubeAxisIndex wrapCollideCoordinate(int16_t coordinate);
void randomizeCollideDirection(CompactCollideDot& dot);
void sphere(Point center, float radius, Color color);


/* ========================== Cubes mode Definitions ========================= */
uint8_t side, inc, mode;
bool flipColor;
Color cubeCol;
void cubeInc(void);
void cubes(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4);
void drawLine(Point p1, Point p2, Color col);
void drawCube(Point topLeft, int side, Color col);


/* ======================= Cheerlights mode Definitions ====================== */
// Intervalle historique entre deux requêtes CheerLights, en millisecondes.
const uint32_t CHEERLIGHTS_POLLING_INTERVAL = 3000;

// Durée maximale d'attente du début de réponse HTTP, en millisecondes.
const uint32_t CHEERLIGHTS_RESPONSE_TIMEOUT = 500;

// Port HTTP historique du service ThingSpeak.
const uint16_t CHEERLIGHTS_HTTP_PORT = 80;

// Taille exacte d'une réponse #RRGGBB avec son terminateur nul.
const uint8_t CHEERLIGHTS_RESPONSE_CAPACITY = 8;

// Hôte historique du canal CheerLights sur ThingSpeak.
const char CHEERLIGHTS_HOST[] = "api.thingspeak.com";

// Chemin historique du dernier champ couleur CheerLights.
const char CHEERLIGHTS_PATH[] = "/channels/1417/field/2/last.txt";

// Client TCP unique utilisé uniquement par CheerLights.
TCPClient client;

// Réponse bornée à sept caractères utiles et un terminateur nul.
char cheerLightsResponse[CHEERLIGHTS_RESPONSE_CAPACITY];

// Longueur saturée à huit ; huit représente toute réponse trop longue.
uint8_t cheerLightsResponseLength;

// État de la dernière connexion TCP tentée.
bool connected;

// Horodatage du début de l'attente HTTP courante.
uint32_t requestTime;

// Horodatage de la dernière interrogation CheerLights.
uint32_t pollTime;

static_assert(sizeof(cheerLightsResponse) == 8,
    "La réponse CheerLights doit occuper exactement huit octets");

void cheerlights(void);
void resetCheerLightsResponse(void);
void appendCheerLightsResponse(char character);
bool hasValidCheerLightsResponse(void);
bool connectCheerLightsClient(void);


/* ======================= CUBE PAINTER mode Definitions ===================== */
// Espace partage de 1 536 octets utilise par des animations mutuellement
// exclusives. Le membre `bytes` conserve l'API historique de CubePainter.
union SharedAnimationScratch {
    unsigned char bytes[PIXEL_CNT * BPP];
    uint16_t pixelOrder[PIXEL_CNT];
    float particles[50][6];
    PuckDudeScratch puckDude;
    voxel snakeVoxels[SNAKE_CAPACITY];
    uint8_t crumbleRemaining[SIDE * SIDE];
    float spectrumSamples[2][ARRAY_SIZE];
    WhirlwindState whirlwind;
};
static_assert(sizeof(uint16_t) * (int)(PIXEL_CNT * 0.1) <=
    sizeof(((SharedAnimationScratch*)0)->pixelOrder),
    "Les positions Frozen doivent tenir dans l'ordre de pixels partagé");
static_assert(sizeof(((SharedAnimationScratch*)0)->bytes) == 1536,
    "Le buffer CubePainter doit occuper exactement 1 536 octets");
static_assert(sizeof(((SharedAnimationScratch*)0)->pixelOrder) == 1024,
    "L'ordre complet des pixels doit occuper exactement 1 024 octets");
static_assert(sizeof(((SharedAnimationScratch*)0)->particles) == 1200,
    "Les particules Fireworks doivent occuper exactement 1 200 octets");
static_assert(sizeof(((SharedAnimationScratch*)0)->puckDude) == 243,
    "Les sprites PacMan doivent occuper exactement 243 octets du scratch");
static_assert(sizeof(((SharedAnimationScratch*)0)->snakeVoxels) == 1536,
    "Le corps Snake complet doit occuper exactement 1 536 octets");
static_assert(sizeof(((SharedAnimationScratch*)0)->crumbleRemaining) == 64,
    "L'ordre CrumblingPlane doit occuper exactement 64 octets");
static_assert(sizeof(((SharedAnimationScratch*)0)->spectrumSamples) == 128,
    "Les deux tableaux FFT Spectrum doivent occuper 128 octets du scratch");
static_assert(sizeof(SharedAnimationScratch) == PIXEL_CNT * BPP,
    "Le scratch partage ne doit pas ajouter un second framebuffer");
int CubePainter(String command);
int cubePainterFromBuffer(const char* commandText, size_t commandLength);


/* ====================== CLOCK mode Definitions =================== */
char clockMessage[11];
uint8_t hrow, hplane;
uint8_t mrow, mplane;
uint8_t srow, splane;
uint8_t seconds, minutes, hours;
Point s, m, h;
byte currentBg, nextBg;
void showClock(void);
void textClock(void);
void threeDClock(void);
void drawCube(int w, int h, int d, Point corner, Color voxelColor);
void display_digits(int number, int drow, int dplane, Color numcolor);


/* ====================== Roman Candle mode Definitions =================== */
/*#define NUM_ROCKETS 50
float RCmaxVal=0;
float sample;
float offset=0;
struct Rocket	
{
        float x,y,z;
        float xVel, yVel, zVel;
        float gravity;
        Color col;
	Rocket():x((SIDE-1)/2), y(0), z((SIDE-1)/2), col(Color(255,0,0)){}
};
Rocket rockets[NUM_ROCKETS];
void romanCandle();
void mirror();
void initRockets();
*/


/* ====================== 3D Life mode Definitions =================== */
/*#define MAX_ITERATIONS 100
int iterationCount = 0;
void lifeResetCube();
void life();
int countNeighbors(int x, int y, int z);
*/

/* ====================== CRUMBLE mode Definitions =================== */
// Nombre de positions distinctes dans un plan 8 x 8.
const uint8_t CRUMBLE_POSITION_COUNT = SIDE * SIDE;

// Nombre de retournements avant de sélectionner l'axe suivant.
const uint8_t NUM_FLIPS = 1;

// Indique si la profondeur logique est reflétée pendant le cycle courant.
bool Cmirror = true;

// Axe courant, compris entre zéro et deux.
uint8_t CRaxis = 1;

// Position linéaire courante dans le plan, comprise entre zéro et 63.
uint8_t pick;

// Profondeur courante du voxel déplacé, comprise entre zéro et huit.
uint8_t Coffset;

// Nombre de retournements effectués sur l'axe courant.
uint8_t flips;

// Nombre d'éléments valides dans crumbleRemaining.
uint8_t crumbleRemainingCount;

Color clearColor = Color( 0, 0, 0 );
Color mainColor = Color( 0, 31, 0 );
void crumble();
void setVoxel( int x, int y, int z, bool clear );
bool shift();
uint8_t draw();
void resetCycle();

/* ====================== CUBE CLASSICS mode Definitions ===================== */
#define AXIS_X	0x78
#define AXIS_Y	0x79
#define AXIS_Z	0x7a
uint8_t colorWheel;

const unsigned char PROGMEM paths[44] = {0x07,0x06,0x05,0x04,0x03,0x02,0x01,0x00,0x10,0x20,0x30,0x40,0x50,0x60,0x70,0x71,
										 0x72,0x73,0x74,0x75,0x76,0x77,0x67,0x57,0x47,0x37,0x27,0x17,0x04,0x03,0x12,0x21,
										 0x30,0x40,0x51,0x62,0x73,0x74,0x65,0x56,0x47,0x37,0x26,0x15}; // circle, len 16, offset 28

// defines each cube edge by it's two vertices
// Store as a byte to save on memory
const unsigned char cubeEdgeVertices[] PROGMEM= {
	0b00000100, // A(0,0,0)  B(7,0,0)
	0b00000010, // A(0,0,0)  B(0,7,0)
	0b00000001, // A(0,0,0)  B(0,0,7)
	0b00110010, // A(7,7,0)  B(0,7,0)
	0b00011010, // A(0,7,7)  B(0,7,0)
	0b00101001, // A(7,0,7)  B(0,0,7)
	0b00011001, // A(0,7,7)  B(0,0,7)
	0b00101100, // A(7,0,7)  B(7,0,0)
	0b00110100, // A(7,7,0)  B(7,0,0)
	0b00011111, // A(0,7,7)  B(7,7,7)
	0b00110111, // A(7,7,0)  B(7,7,7)
	0b00101111  // A(7,0,7)  B(7,7,7)
};

enum CubeSide {
	cubeTop,
	cubeBottom,
	cubeLeft,
	cubeRight,
	cubeFront,
	cubeBack,
};

const uint8_t validSideToFlipTo[][6] = {
	{cubeTop,   cubeLeft,cubeRight,cubeFront,cubeBack},
	{cubeBottom,cubeLeft,cubeRight,cubeFront,cubeBack},
	{cubeLeft, cubeTop,cubeBottom,cubeFront,cubeBack},
	{cubeRight,cubeTop,cubeBottom,cubeFront,cubeBack},
	{cubeFront,cubeTop,cubeBottom,cubeLeft,cubeRight},
	{cubeBack, cubeTop,cubeBottom,cubeLeft,cubeRight}
};

uint8_t findRandomNextSide(uint8_t thisSide);
void setCubeVertices(int8_t index, Point& vertexA, Point& vertexB);
void runCubeClassics(uint32_t c, uint8_t mode);
void setplane_x (int x, Color col);
void setplane_y (int y, Color col);
void setplane_z (int z, Color col);
void setplane (char axis, unsigned char i, Color col);
void font_getpath (unsigned char path, unsigned char *destination, int length);
void effect_pathmove (unsigned char *path, int length);
//int collapsingSides(Color col);
int shift(char axis, int direction);
int ripples (int iterations, Color col);
int effect_loadbar(int axis, Color col);
int spheremove (int iterations, Color col);
int effect_planboing (int plane, Color col);
int fireworks (int iterations, int n, Color col);
int effect_telcstairs_do(int x, int val, Color col);
int linespin (int iterations, char axis, Color col);
int sinelines (int iterations, char axis, Color col);
int effect_rand_patharound (int iterations, Color col);
int effect_telcstairs (int invert, int val, Color col);
int stackingRope(int mode, Color col);
int effect_z_updown (int iterations, Color col);
int effect_axis_updown_randsuspend (char axis, int sleep, int invert, Color col);
int effect_boxside_randsend_parallel (char axis, int origin, int mode, Color col);
int effect_wormsqueeze (int size, int axis, int direction, int iterations, Color col);
int draw_positions_axis (char axis, unsigned char positions[64], int invert, Color col);
int boingboing(uint16_t iterations, unsigned char mode, unsigned char drawmode, Color col);
int effect_z_updown_move (unsigned char positions[64], unsigned char destinations[64], char axis, Color col);
int diagonal_planes(Point pA, Point pB, int8_t mode, Color col);
int zoom_pyramid_clear(Color col);
int zoom_pyramid(Color col);
void box_walls(int x1, int y1, int z1, int x2, int y2, int z2, Color col);
void box_wireframe(int x1, int y1, int z1, int x2, int y2, int z2, Color col);
void argorder(int ix1, int ix2, int *ox1, int *ox2);
int folder(uint8_t sideStart, uint8_t sideEnd, Color col);
float distance2d (float x1, float y1, float x2, float y2);
float distance3dSquared(float x1, float y1, float z1, float x2, float y2, float z2);


/* ========================== ACID/GOLD RAIN Definitions ===================== */
// Nombre maximal historique de gouttes dans une salve.
const uint8_t RAIN_MAX_DROPS = 128;

// Facteur exact représentant les positions et vitesses par pas de 0,05.
const int16_t RAIN_POSITION_SCALE = 20;

// Position verticale initiale, juste au-dessus du cube logique.
const int16_t RAIN_INITIAL_Y = SIDE * RAIN_POSITION_SCALE;

// Espacement minimal historique entre deux salves automatiques.
const uint32_t MIN_SALVO_SPACING = 0;

// Goutte compacte conservant exactement les sept vitesses historiques.
typedef struct CompactRainDrop {
    int16_t yTwentieths;
    uint8_t speedTwentieths;
    CubeAxisIndex x;
    CubeAxisIndex z;
    PackedColor color;
} CompactRainDrop;

// Salve compacte ; un compteur nul indique que la salve est inactive.
typedef struct CompactRainSalvo {
    CompactRainDrop drops[RAIN_MAX_DROPS];
    uint8_t dropCount;
} CompactRainSalvo;

static_assert(sizeof(CompactRainDrop) == 8,
    "Une goutte Rain compacte doit tenir sur huit octets");
static_assert(sizeof(CompactRainSalvo) == 1026,
    "Une salve Rain compacte doit tenir sur 1 026 octets");

// Etat complet des modes AcidRain et GoldRain.
struct RainSalvosState {
    CompactRainSalvo salvos[SIDE];
    int fadingMax;
    uint16_t ledColor;
    uint32_t timeAboveThreshhold;
};

static_assert(sizeof(((RainSalvosState*)0)->salvos) == 8208,
    "Les huit salves Rain doivent conserver 1 024 emplacements compacts");
static_assert(sizeof(RainSalvosState) == 8220,
    "L'etat Rain complet doit occuper exactement 8 220 octets");

// Zone unique couvrant le plus gros état d'animation actif.
union SharedAnimationState {
    RainSalvosState rain;
    SharedAnimationScratch scratch;
    MatrixState matrix;
    SquarrelState squarrel;
    CollideState collide;
#if L3D_LISTENER_ENABLED
    char listenerData[CUBE_PACKET_SIZE];
#endif
};

SharedAnimationState sharedAnimationState;

static_assert(alignof(SharedAnimationState) >= alignof(float),
    "La zone d'animation partagée doit rester alignée pour les flottants");
static_assert(sizeof(SharedAnimationState) == sizeof(RainSalvosState),
    "Rain doit rester le plus gros état de la zone partagée");

// Alias historiques limitant la modification des animations déjà auditées.
#define sharedAnimationScratch sharedAnimationState.scratch
#define drawingBuffer sharedAnimationScratch.bytes
#define snakeVoxels sharedAnimationScratch.snakeVoxels
#define crumbleRemaining sharedAnimationScratch.crumbleRemaining
#define spectrumReal sharedAnimationScratch.spectrumSamples[0]
#define spectrumImaginary sharedAnimationScratch.spectrumSamples[1]
#define randomFlakes sharedAnimationScratch.pixelOrder
#define whirlwindColors sharedAnimationScratch.whirlwind.colors
#define whirlwindAngles sharedAnimationScratch.whirlwind.angles
#define whirlwindRadii sharedAnimationScratch.whirlwind.radii
#define whirlwindHeights sharedAnimationScratch.whirlwind.heights
#define whirlwindLastRand sharedAnimationScratch.whirlwind.lastRand
#define whirlwindLastLastRand sharedAnimationScratch.whirlwind.lastLastRand
#define whirlwindLastSwap sharedAnimationScratch.whirlwind.lastSwap
#define whirlwindCenterX sharedAnimationScratch.whirlwind.center[0]
#define whirlwindCenterY sharedAnimationScratch.whirlwind.center[1]
#define whirlwindCenterZ sharedAnimationScratch.whirlwind.center[2]
#define voxelXw1 sharedAnimationState.matrix.voxelXw1
#define voxelZw1 sharedAnimationState.matrix.voxelZw1
#define voxelXw2 sharedAnimationState.matrix.voxelXw2
#define voxelZw2 sharedAnimationState.matrix.voxelZw2
#define voxelXw3 sharedAnimationState.matrix.voxelXw3
#define voxelZw3 sharedAnimationState.matrix.voxelZw3
#define voxelXw4 sharedAnimationState.matrix.voxelXw4
#define voxelZw4 sharedAnimationState.matrix.voxelZw4
#define wave01 sharedAnimationState.matrix.wave01
#define wave02 sharedAnimationState.matrix.wave02
#define wave03 sharedAnimationState.matrix.wave03
#define wave04 sharedAnimationState.matrix.wave04
#define collideDots sharedAnimationState.collide.dots
#define salvos sharedAnimationState.rain.salvos
#define fadingMax sharedAnimationState.rain.fadingMax
#define ledColor sharedAnimationState.rain.ledColor
#define timeAboveThreshhold sharedAnimationState.rain.timeAboveThreshhold
#if L3D_LISTENER_ENABLED
#define data sharedAnimationState.listenerData
#endif
void acidRain(void);
void initSalvos(void);
void drawSalvos(void);
void updateSalvos(void);
void checkMicrohpone(void);
void launchRain(int amplitude);
uint8_t setNewSpeed(void);


/* ========================== SLIDESHOW Definitions ===================== */
#define TRAIL_LENGTH	50
const  unsigned char PROGMEM table_3p[][8]= { //3p char
	0x20,0x40,0x20,0xFC,0xFA,0xFA,0xFC,0xF8,	//Cup of Coffee
	0x7E,0x81,0xA5,0x81,0xA5,0x99,0x81,0x7E,	//Smiley
	0x44,0x7C,0x54,0x7C,0x38,0x10,0x54,0x38,	//Flower Face
	0x99,0xBD,0x5A,0x7E,0x42,0x3C,0xDB,0x81,	//Retro Monster 1
	0x24,0x3C,0x3C,0x5A,0xBD,0x3C,0x66,0x42,	//Retro Monster 2
	0x42,0x81,0xFF,0x5A,0x66,0x7E,0x66,0x42,	//Retro Monster 3
	0x24,0x7E,0xFF,0xDB,0x7E,0x42,0xBD,0x81,	//Retro Monster 4
	0x42,0x81,0xBD,0x5A,0x66,0x3C,0x66,0xA5,	//Retro Monster 5
	0x42,0x66,0x24,0x7E,0xC3,0xBD,0x66,0x42,	//Retro Monster 6
	0x42,0x3C,0x7E,0xDB,0xFF,0x66,0xA5,0x81,	//Retro Monster 7
	0x18,0x3C,0x7E,0xDB,0xBD,0x18,0x66,0x42,	//Retro Monster 8
	0xA5,0x5A,0x24,0x3C,0x7E,0xDB,0xFF,0x66,	//Retro Monster 9
	0x3C,0x7E,0xFF,0xDB,0x7E,0x3C,0x7E,0xDB,	//Retro Monster 10
	0xE7,0x3C,0x3C,0x5A,0x7E,0x18,0x66,0x24,	//Retro Monster 11
	0xC3,0x7E,0x42,0x5A,0x42,0x7E,0x5A,0x24,	//Retro Monster 12
	0x18,0x3C,0x7E,0xDB,0xFF,0x3C,0x7E,0xA5,	//Retro Monster 13
	0x3C,0x7E,0xFF,0xFF,0x7E,0x5A,0x3C,0x5A,	//Retro Monster 14
	0x24,0x42,0x24,0x7E,0x99,0xFF,0x66,0xA5,	//Retro Monster 15
	0x42,0x66,0x24,0x18,0x3C,0x5A,0xFF,0x66,	//Retro Monster 16
	0x38,0x7C,0x92,0xD6,0x7C,0x6C,0x7C,0x54,	//Skull
	0x00,0x18,0x36,0x42,0xA5,0x81,0x99,0x7E,	//Face
	0x99,0x5A,0x3C,0xE7,0xE7,0x3C,0x5A,0x99,	//betlehem star (could be a snowflake?)
	0x66,0xFF,0xFF,0xFF,0x7E,0x3C,0x18,0x00		//heart	
};

void slideshow(void);
void roll_apeak_yz(unsigned char n, unsigned int speedFactor);


/* ======================= Helper Functions Prototypes ======================= */
int hexToInt(char val);
int antipodal_index(int i);
int randomPixelFill(uint32_t c);
//int isValidMode(String newMode);
//void getCheerlights(void);
//void initCheerLights(void);
void background(Color col);
bool isWhiteColor(Color col);
void add(Point& a, Point& b);
void setPixelColor(Point p, Color col);
void transition(Color bgcolor, bool loop);
void mixVoxel(Point currentPoint, Color col);
void fadeInToColor(uint32_t index, Color col);
void fadeOutFromColor(uint32_t index, Color col);
void setPixelColor(int x, int y, int z, Color col);
void arrayShuffle(uint8_t arrayToShuffle[], uint8_t arraySize);
void fadeSmooth(char lowerLim, char upperLim, float scaleFactor);
void drawSolidHorizontalCircle(int xOrigin, int yOrigin, int z, int radius, Color col);
void drawHollowHorizontalCircle(int xOrigin, int yOrigin, int z, int radius, Color col, bool rndColor);
//float squareRoot(float x);
Color getPixelColor(Point p);
Color getPixelColor(int index);
Color complement(Color original);
Color getColorFromInteger(uint32_t col);
Color getPixelColor(int x, int y, int z);
Color fadeColor(Color col, float scaleFactor);
Color fadeColorSevenEighths(Color color);
uint8_t fadeSqRt(float value);
uint8_t fadeSquare(float value);
uint8_t fadeLinear(float value);
uint32_t getHighestValFromRGB(Color col);
uint32_t Wheel(byte WheelPos, float opacity=1.0);
uint32_t colorMap(float val, float minVal, float maxVal);
uint32_t lerpColor(uint32_t c1, uint32_t c2, uint32_t val, uint32_t minVal, uint32_t maxVal);

/* ========================= Spark Pixel Prototypes ========================== */
void frozen(void);
void collide(void);
void rainbow(void);
void runMode(void);
void runDemo(void);
void setRandomMode(void);
void resetShuffleMode(void);
void warmFade(void);
void checkBrightness(void);
void cycleLerp(void);
void color_fade(void);
void colorPulse(void);
void fillX(Color col);
void fillY(Color col);
void fillZ(Color col);
void rain(uint32_t c);
//void modeButton(void);
//void smoothSwitch(void);
void colorStripes(void);
void rainbowCycle(void);
void makeModeList(void);    //Added new function to make mode and parameter lists
void christmasTree(void);
void christmasLights(void);
void flicker(uint32_t c);
void initMicrophone(void);
void digi(uint32_t col);
void makeAuxSwitchList(void);
void colorChaser(uint32_t c);
void iftttWeather(uint32_t c);
void police_light_strobo(void);
void theaterChaseRainbow(void);
void resetVariables(int modeIndex);
void pulse_oneColorAll(uint32_t color1);
void findRandomSnowFlakesPositions(int numFlakes);
void random_seed_from_cloud(unsigned int seed);     //Disable random seed from the cloud 
void flipVoxel(int x, int y, int z, Color newCol);
void filler(uint32_t c1, uint32_t c2, uint32_t c3);
void twoColorChaser(uint32_t color1, uint32_t color2);
void cubeGreeting(int textMode, int frameCount, float pos);
void colorZoneChaser(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4);
int showPixels(void);
int setNewMode(int newMode);
int updateAuxSwitches(int id);
int getModeIndexFromID(int id);
int getAuxSwitchIndexFromID(int id);
int getModeIndexFromName(const char* name, size_t nameLength);
int getSwitchTitleStructIndex(int modeId);
int colorZone(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4, bool loop);
bool isThereEnoughRoomInModeParamList(int textSize);

// Déclarations anticipées auparavant générées par le préprocesseur Particle INO.
int FnRouter(String command);
int SetMode(String command);
int SetText(String command);
int routeCommandFromBuffer(const char* commandText, size_t commandLength);
int setModeFromBuffer(const char* commandText, size_t commandLength);
int setTextFromBuffer(const char* text, size_t textLength);
void makeDeviceInfo(void);
inline void initEEPROM(void);
char* getWeekDay(void);
char* getMonth(void);
void moveSnake(void);
void updateDirection(void);
bool addTreat(void);


