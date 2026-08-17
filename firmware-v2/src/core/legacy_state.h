#pragma once

// État et déclarations historiques conservés tels quels pendant la phase 1.
// Leur redistribution par responsabilité appartient aux phases d'optimisation.

/* ======================= ADD NEW MODE STRUCT HERE. ======================= */
//modeId and modeName should be the same name to prevent confusion
//Use this struct array to neatly organize and correlate Mode name with number of colors needed
//The Android app uses numOfColors to help populate the view 
//and to know how many colors to ask to update
static modeParams modeStruct[] =
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
		{  FIREWORKS,                   "Fireworks",    	    0,          0,      FALSE   },  //credit :http://www.instructables.com/id/Led-Cube-8x8x8/, Kevin Carlborg (L3D Cube port), Werner Moecke (smooth transitions)
        {  FLICKER,                     "Flicker",              1,          0,      FALSE   },  //credit: Werner Moecke
		{  FOLDER,                      "Folder",               0,          0,      FALSE   },  //credit: Kevin Carlborg
        {  FROZEN,                      "Frozen",               0,          0,      FALSE   },  //credit: Kevin Carlborg, Werner Moecke (flake fading)
//		{  LIFE,                        "GameOfLife",           0,          0,      FALSE   },  //credit: Ben? grajohnt? modded by socaljj
		{  GOLDRAIN,                    "GoldRain",             0,          1,      FALSE   },  //credit: Werner Moecke (based on Alex Hornstein's "Purple Rain")
//		{  HYPER,                       "HyperBall",            0,          0,      FALSE   },  //credit: fool, mod by socaljj
        {  IFTTTWEATHER,                "IFTTT",                0,          0,      FALSE   },  //credit: Kevin Carlborg, Werner Moecke (code improvements)
//        {  LIGHTNING,                   "Lightning",            0,          0,      FALSE   },  //credit: Bill Marrs
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

switchParams switchTitleStruct[] = 
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

/**
  * Shuffle Mode Helpers
  * Use the array below to prevent shuffled modes from playing more than once without cycling through all the 
  * modes first. The array will get populated with values 0 through (the number of modes - 1). Then we'll shuffle
  * the array up and step through the array during the Shuffle mode. the shuffleIdx will keep track of our position 
  * in the modeShuffleOrder array.
  */
int shuffleIdx;
int modeShuffleOrder[(int)(sizeof modeStruct / sizeof modeStruct[0])];

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
uint16_t randomFlakes[(int)(PIXEL_CNT*0.1)]; // holds the snowflake positions no more than 10% of total number of pixels
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
char data[CUBE_PACKET_SIZE];
long maximum_received_packet = 0; // we haven't seen a packet yet
void listen(void);

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
float real[ARRAY_SIZE];             //[(int)pow(2,M)]
float imaginary[ARRAY_SIZE];        //[(int)pow(2,M)]
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
void marquee(String text, float pos, Color col);
void showText(uint32_t color1, uint32_t color2);
void showMarqueeChar(char a, int pos, Color col);
void textScroll(uint32_t color1, uint32_t color2);
void textMarquee(uint32_t color1, uint32_t color2);
void showChar(char a, Point origin, Point angle, Color col);
void scrollText(String text, Point initialPosition, Color col);
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
int idex, ihue; //We define these here as they serve to flag if we need
				//to blank the cube every time the mode is called
void random_burst(void);


/* ======================== SQUARRAL mode Definitions ========================= */
#define	TRAIL_LENGTH	50
int frame, bound, boundInc, squarral_zInc;
bool rainbowColor;
unsigned char axis;
Point trailPoints[TRAIL_LENGTH];
Point position, increment, pixel;
void squarral(void);


/* ========================== PLASMA mode Definitions ========================= */
float phase, colorStretch;
void zPlasma(void);


/* ========================== PuckDude mode defines ========================== */
#define PDSPEED 10
int PDframe=0;
Color voxelColor;
void puckDude(void);
void rotate_x(Point& a, int b);


/* ========================= Transition Definitions ========================= */
#define LINEAR		0
#define POLAR       1
#define RED         0
#define GREEN       1
#define BLUE        2
uint8_t clamp(unsigned value, unsigned lowClamp, unsigned highClamp);
void transitionAll(Color endColor, uint16_t method);
void transitionOne(Color endColor, uint16_t index, uint16_t method);
void transitionHelper(Color startColor, Color endColor, uint16_t index, uint16_t method, int16_t numSteps, int16_t step);
int16_t getTransitionStep(Color startColor, Color endColor, uint16_t method, int16_t numSteps, int16_t step, uint8_t whichColor);


/* ======================== Whirlwind mode Definitions ======================== */
#define CYCLE_INTERVAL          60000 // milliseconds between restart
#define MAX_DOTS                19
#define                         MIN_RADI 1
#define                         MAX_RADI 5
Color clr[MAX_DOTS];
float angle[MAX_DOTS];
float radi[MAX_DOTS];
float y[MAX_DOTS];
int lastRand, lastLastRand;
unsigned long lastSwap;
Point center;
void whirlWind(void);
void randomColor(struct Color *clr);
float randomDecimal(void);
//float radius(float x, float y, float z);


/* ============================ Snake 3D mode defines ========================= */
int deathFrame;
int SNframeCount;
int initialSnakeLength;

struct voxel {
  int j;
  int k;
  int l;
  
  voxel(int j=0, int k=0, int l=0) 
    : j(j), k(k), l(l)
	{
  };

  bool operator==(const voxel& v) const
  {
      return (v.j == j && v.k == k && v.l == l);
  };

  bool operator!=(const voxel& v) const
  {
      return (v.j != j || v.k != k || v.l != l);
  };

  double distance(const voxel& v) const {
    return sqrt(
      pow((v.j - j), 2) +
      pow((v.k - k), 2) +
      pow((v.l - l), 2)
    );
  };
};
    
voxel operator+(const voxel& v1, const voxel& v2) {
  return voxel(v1.j + v2.j, v1.k + v2.k, v1.l + v2.l);    
}

std::vector<voxel> SNsnake;
std::vector<voxel> treats;
voxel* snakeDirection;

std::vector<voxel> possibleDirections = {
  { 1,  0,  0},
  {-1,  0,  0},
  { 0,  1,  0},
  { 0, -1,  0},
  { 0,  0,  1},
  { 0,  0, -1}
};
void snakeResetCube(void);
void snake(void);


/* ========================== clasic planes mode defines ======================= */
int CPinc=1;  
int CPpos=0;  
int CPframe=0;
void classicPlanes();


/* =========================== 3D spiral mode defines ========================== */
bool INCREASE_LOOP=true;
bool INCREASE_TARGET = true;
float TARGET = 0;
int SPbrightness;
int fade_factor = 2;
int LOOP_NO=0;
int STEPS = 1;
int PAUSE = 0;
int DSSIDE=1;
int ColourRotatorState=0;
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
#define VOX_POINTS 64
int voxelXw1[VOX_POINTS];
int voxelZw1[VOX_POINTS];
int voxelXw2[VOX_POINTS];
int voxelZw2[VOX_POINTS];
int voxelXw3[VOX_POINTS];
int voxelZw3[VOX_POINTS];
int voxelXw4[VOX_POINTS];
int voxelZw4[VOX_POINTS];
int voxDelay(150);
int wave01(7);
int wave02(10);
int wave03(15);
int wave04(19);
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
bool collided;
int topLeftVoxel[3];
int CBframe;
int delayTime;
int CBdirection[3] = { 1, 1, 1};
int bounds[3] = { 2, 2, 2};
Color cubeColor;
void cubeBounce_setup(void);
void cubeBounce(void);


/* ======================== LIGHTNING mode Definitions ======================= */
unsigned long lastLightning, lightningInterval, lastLightningInterval;
void lightning(void);


/* ============================ Collide mode defines ============================ */
#define COMAX_DOTS 72
Point COdots[COMAX_DOTS];
Point COdir[COMAX_DOTS];
Color COclr[COMAX_DOTS];
void initCollide(void);
void collide2();
void sphere(Point center, float radius, Color col);


/* ========================== Cubes mode Definitions ========================= */
uint8_t side, inc, mode;
bool flipColor;
Color cubeCol;
void cubeInc(void);
void cubes(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4);
void drawLine(Point p1, Point p2, Color col);
void drawCube(Point topLeft, int side, Color col);


/* ======================= Cheerlights mode Definitions ====================== */
#define POLLING_INTERVAL        3000    // how often the photon polls the cheerlights API
#define RESPONSE_TIMEOUT        500     // the timeout (in ms) to wait for a response from the cheerlights API
TCPClient client;       // a TCP instance to let us query the cheerlights API over TCP
String hostname, path;  // the URL and path to cheerlights' thingspeak directory
String response;        // the response read from querying cheerlights' thingspeak directory
bool connected;         // flag if we have a solid TCP connection
bool cheerLightsEnabled;
//Color cheerLightsColor;
int requestTime, pollTime;
//Thread* cheerlightsThread;  //https://community.particle.io/t/particle-photon-multi-blink-sample-using-threads/16214/3
//https://github.com/pipprojects/WM/blob/master/water-meter-2.ino
void cheerlights(void);


/* ======================= CUBE PAINTER mode Definitions ===================== */
unsigned char drawingBuffer[PIXEL_CNT*BPP];
int CubePainter(String command);


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
std::string strRev(std::string str);
std::string integerToBinaryString(int number);
std::string padTo(std::string str, const size_t num, const char paddingChar);


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
bool Cmirror = true; 
const int NUM_FLIPS = 1;
int CRaxis = 1;
int pick, Coffset, flips;
std::vector< int > remaining;
Color clearColor = Color( 0, 0, 0 );
Color mainColor = Color( 0, 31, 0 );
void crumble();
void setVoxel( int x, int y, int z, bool clear );
bool shift();
int draw();
void resetCycle();

/* ====================== CUBE CLASSICS mode Definitions ===================== */
#define AXIS_X	0x78
#define AXIS_Y	0x79
#define AXIS_Z	0x7a
uint8_t colorWheel;

const unsigned char PROGMEM paths[44] = {0x07,0x06,0x05,0x04,0x03,0x02,0x01,0x00,0x10,0x20,0x30,0x40,0x50,0x60,0x70,0x71,
										 0x72,0x73,0x74,0x75,0x76,0x77,0x67,0x57,0x47,0x37,0x27,0x17,0x04,0x03,0x12,0x21,
										 0x30,0x40,0x51,0x62,0x73,0x74,0x65,0x56,0x47,0x37,0x26,0x15}; // circle, len 16, offset 28

Point cubeVerticesA, cubeVerticesB;
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
void setCubeVertices(int8_t index);
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
float distance3d (float x1, float y1, float z1, float x2, float y2, float z2);


/* ========================== ACID/GOLD RAIN Definitions ===================== */
#define MAX_POINTS            128
#define MIN_SALVO_SPACING     0
typedef struct {
	Point raindrop;
  	float speed;
  	Color color;
  	bool flipped;
  	bool dead;
} raindrop;

typedef struct {
    raindrop raindrops[MAX_POINTS];
    bool dead;
} salvo;

salvo salvos[SIDE];
int fadingMax, ledColor;
long timeAboveThreshhold;
void acidRain(void);
void initSalvos(void);
void drawSalvos(void);
void updateSalvos(void);
void checkMicrohpone(void);
void launchRain(int amplitude);
float setNewSpeed(void);


/* ========================== SLIDESHOW Definitions ===================== */
#define TRAIL_LENGTH	50
Color trailColor;
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
void arrayShuffle(int arrayToShuffle[], int arraySize);
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
int SetASO(String command);
int setNewMode(int newMode);
int updateAuxSwitches(int id);
int getModeIndexFromID(int id);
int getAuxSwitchIndexFromID(int id);
int getModeIndexFromName(String name);
int getSwitchTitleStructIndex(int modeId);
int colorZone(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4, bool loop);
bool isThereEnoughRoomInModeParamList(int textSize);

// Déclarations anticipées auparavant générées par le préprocesseur Particle INO.
int FnRouter(String command);
int SetMode(String command);
int SetText(String command);
void makeDeviceInfo(void);
inline void initEEPROM(void);
char* getWeekDay(void);
char* getMonth(void);
void moveSnake(void);
void updateDirection(void);
void addTreat(void);


