// ============================================================================
// MainFirmware - Implémentation de référence du firmware L3D Cube
// ----------------------------------------------------------------------------
// Ce fichier orchestre SparkPixelsMega 1.4 après son découpage mécanique.
// Les modules restent assemblés en unity build pendant la phase 1 afin de
// préserver le linkage, l'ordre d'initialisation et le comportement historique.
// ============================================================================

/**
 ***********************  SPARK PIXELS MEGA  **********************************
 * 
 ************************  ATTENTION  ***********************************
 *  This sketch is a bit long, flashing times may take longer than      *
 *  expected - like up to a few minutes. Check out the Photon under     *
 *  your cube, if it's still flashing magenta, then it's still being    *
 *  flashed.                                                            *
 *  Patience is a virtue here.  Thanks                                  *
 * **********************************************************************
 * 
 * @extended SparkPixels.ino:
 * 	     > Converted some globals to const(s) which reduced RAM usage from
 *             75kB down to 69kB
 * @author  Kevin Carlborg 
 * @version V1.4
 * @date    20200209
 * 
 * @extended SparkPixels.ino:
 * 	     > Commented out modes: Life, Hyper, Roman, and Listener in order to fix
 *  		a panic failure mode. SOS fail code wasn't very obvious of the failure.
 *		Suspect that we were running out of memory since we are already near the 
 *		limit.
 * @author  Kevin Carlborg 
 * @version V1.3
 * @date    20190327
 *
 * @extended SparkPixels.ino:
 * 		  > Fixed compiler issue with map function calls, forced to type cast
 *          float calulcations to ints. 
 * @author  Kevin Carlborg 
 * @version V1.2
 * @date    20181031
 * 
 * @extended SparkPixels.ino:
 * 		  > Updated the Shuffle mode so that it doesn't repeat a mode 
 *			without running through the whole list first. Think of a deck 
 *			of cards - shuffle the deck, then draw one card at a time till 
 *			all the cards are gone. Shuffle them again and repeat.
 *		  > Added @crcowan's update to the Listener mode to wrap an 8x64 Jinx 
 *			matrix across the planes of the cube. (http://cubetube.org/viz/2899/) 
 * @author  Kevin Carlborg 
 * @version V1.1
 * @date    4-MAY-2017
 *
 * @extended SparkPixels.ino:
 *		  > Added some of the features from the Forbin Project by socaljj
 *			The Forbin Project was pulled from the gallery for *Breaking Cubes*
 *			Unfortunately, it got a bad rap due to improper Particle Cloud declaration
 *			handling that was coded in SparkPixels.ino (See Fixes below)
 *			Forbin Project carry-overs are: split CubeClassics into individual modes, 
 *			added checkBrightness() function to prevent some modes from overdriving the cube
 * 			added modes: Collide2, Crumble, RomanCandle, GameOfLife, SnakeChasesRabbit, SlidingPlanes,
 *			DSpiral, Hyper, Matrix, CubeBounce
 * 		  >	Deleted the textSpin option - I found it really hard to read the characters.
 *		Fixes:
 *		  	Fixed the problem where the SparkPixels Android app wouldn't connect
 *			to the cube. This would happen if the Particle Functions and Variables
 *			didn't get properly registered to the cloud. Moved the registering of all cloud 
 * 			variables/functions to the (very) beginning of setup().
 *			This makes interfacing through the Android app much more reliable.
 *			All cloud variables/functions MUST be declared within the first second (or 1.5 sec) after a reset.  
 *			Discussed in the following thread: https://community.particle.io/t/registering-variables-problem/21700
 *		New Modes:
 * 		  >	Shuffle - randomly plays a new mode every 2 minutes. leveraged some of the runDemo code moving   
 *		  	the select random mode code into it's own function - setRandomMode()
 *		  >	RandomPath, Pyramid, Folder, DiagonalPlanes, SlideShow
 *      New Aux Switch:
 *          Shuffle - Aside from being a mode, you can also toggle shuffle on and off through the Aux switches.
 *          The advantage here is that the shuffle mode will be active after a power cycle.
 *		Improvements:
 * 		  >	Added software timer interrupt demoTimer() with the stopDemo flag to advance the Shuffle mode and 
 * 			runDemo() routine. 
 *			This repaced these two lines of code
 *				if(stop) {demo = FALSE; return;}
 *				if(demo) {if(millis() - lastModeSet > twoMinuteInterval) {return;}}
 * 			with only this one line of code
 *				if(stop || stopDemo) {return;}
 *		  >	Truncated all mode names in the modeParams struct to save modeList cloud variable length 
 *			- max is 622 characters, 
 *			- current length is 612 - The easiest way to find the length is through the Android app
 *				From the app go to menu > Paricle Cloud Panel. Select modeList from the drop down
 *				under Particle Variable. Then hit the Get Variable button. Scroll down to the bottom and 
 *				see the character length value. The modeParmList variable is also important to keep an eye
 *				on when adding new modes to this sketch.
 *		  >	Replaced all occurances of random(random(2, 256), random(2, 256)) with just random(256) 
 *	 		This saved 560 bytes of flash!!  I understand the original usage was to get an ultra randomw
 *          value - get a random value bewteen the value of two other random values. However, if the min 
 *          parameter is greater than the max parameter, random returns 0. Guessing that there could be 
 *          up to a 50% chance that case will happen. When using this random statement in the (color) Wheel()
 *          function, you should have expected the color red often.
 *		  > Tried to save RAM space where I could.	
 *	 		- Declared the fontTable as PROGMEM
 *			- Changed all mode ID's from const uint8_t to #define - there is a lot more Flash than RAM
 *		New features:
 * 			Added Device Info option - show whatever info you want in the app
 *			i.e. your WiFi IP, your WiFi SSID, WiFi strength, BUILD_FILE_NAME, BUILD_REVISION,
 *				 Paticle System Firmware version, freeMemory on your device, current time on your device
 * 		Memory Usage:
 *			As indicated in the Particle Web IDE
 *			Total values were updated to reflect the Photon and not the Core - the values are an approximation
 *			- Flash used	110404 / 1048576	10.5 %
 *			- RAM used       42016 /   60000	70.0 %
 * @author  Kevin Carlborg 
 * @version V1.0
 * @date    4-MAY-2017
 *
 * @extended SparkPixels.ino:
 *		New features:
 *		- EEPROM storage: now brightness/speed/current mode are stored internally;
 *		  meaning the cube remembers those across reboots and power-cycles.
 *		  (To enable the last mode memory feature, you need to open the 
 *		  "Aux Switch Panel" in the Android app, and check "Remember Last Mode")
 *		Fixes:
 *		- Attempt to fix the issue where cloud variables aren't correctly published
 *		  for some photons exhibit inconsistent behavior and can't be detected by the app;
 *		  Fixes include: refactoring constant and variable types, moving globals to local,
 *		  moving global variables' initialization from declaration, and also removing a
 *		  a few modes that were not so popular.
 *		New modes:
 *		- ACID RAIN/GOLD RAIN/LIGHTNING (implemented with preexisting code)
 * @author   Werner Moecke
 * @version  V4.0
 * @date     22-July-2016
 *
 * @extended SparkPixels.ino:
 *		Refactored code to retrieve next random mode in runDemo(); similar logic
 *		applied to iftttWeather() on exit;
 *      Added an if() statement to SetMode() in order to control when to store
 *      the demo mode's last state when IFTTT mode is triggered;
 *      Also added an if() statement to setNewMode() in order to better control
 *      when to update the previousModeID variable.
 * @author   Werner Moecke
 * @version  V3.93b
 * @date     10-April-2016 ~ 15-April-2016
 *
 * @extended SparkPixels.ino:
 *		Updating the EEPROM storage area with EEPROM.write() in CUBE PAINTER;
 *		We're not using EEPROM.put() due to huge performance impact in updating the cube
 * @author   Werner Moecke
 * @version  V3.92b
 * @date     07-April-2016 ~ 09-April-2016
 *
 * @extended SparkPixels.ino:
 *		Implemented local EEPROM storage for CUBE PAINTER and TEXT modes
 *      (Per request by LKG -- initial version)
 *      Note: function clearEEPROM() implemented due to the missing clear()
 *            function in the EEPROM class (v0.4.9 firmware)
 * @author   Werner Moecke
 * @version  V3.91b
 * @date     06-April-2016 ~ 07-April-2016
 *
 * @extended SparkPixels.ino:
 *		BIT CLOCK mode fix to dim the separating lines when not sweeping colors
 * @author   Werner Moecke
 * @version  V3.9
 * @date     30-March-2016
 *
 * @extended SparkPixels.ino:
 *		REBOOT is now possible from FnRouter() with a return value to give the
 *		app some feedback before issuing a System.reset() on the photon (thx Kev)
 * @author   Kevin Carlborg, Werner Moecke
 * @version  V3.8
 * @date     28-March-2016
 *
 * @extended SparkPixels.ino:
 *		BIT CLOCK can now select colors for hours/minutes/seconds individually
 *		Added REBOOT command to FnRouter() to cope with remote reboot command
 * @author   Werner Moecke
 * @version  V3.7
 * @date     26-March-2016
 *
 * @extended SparkPixels.ino:
 *		New mode: BIT CLOCK (based on Processing code by user "lapentab")
 *		New Functions: bitClock, strRev(),
 *		integerToBinaryString(), padTo()
 * @author   Werner Moecke
 * @version  V3.6
 * @date     20-March-2016 ~ 22-March-2016
 *
 * @fixed SparkPixels.ino:
 *		Fixed issue in CLOCK mode, where the modeParamList was cleared whenever
 *		switch3 or switch4 were set, due to a sub-dimensioned char array (clockMessage[]).
 * @author   Kevin Carlborg
 * @version  V3.5
 * @date     16-March-2016 ~ 17-March-2016
 *
 * @extended SparkPixels.ino:
 *		CLOCK mode now can sweep the background color, or just not have any (black)
 *      TEXT MARQUEE/TEXT SCROLL/TEXT SPIN modes replaced by TEXT mode
 *      (tap the mode name to switch between effects)
 * @fixed SparkPixels.ino:
 *		Fixed an issue where the text color would switch to black in IFTTT mode,
 *		due to a conflict with switches 2/3
 * @author   Werner Moecke
 * @version  V3.4
 * @date     15-March-2016 ~ 16-March-2016
 *
 * @extended SparkPixels.ino:
 *		New mode: CLOCK
 *		New Functions: showClock, textClock, 
 *		threeDClock (based on Dennis Williamson's "Clock" viz: http://cubetube.org/gallery/newestFirst/258/)
 * @author   Werner Moecke
 * @version  V3.3
 * @date     15-March-2016
 *
 * @fixed SparkPixels.ino:
 *		Renamed IFTTT WEATHER to IFTTT
 *			The new IFTTT input MUST be: M:IFTTT,C6:xxxxxx,
 *		Added text capability to iftttWeather()
 *			The new IFTTT input CAN be: M:IFTTT,C6:xxxxxx,W:<string>,
 *      Fixed a few bugs and glitches
 * @author   Werner Moecke
 * @version  V3.2
 * @date     13-March-2016 ~ 14-March-2016
 *
 * @fixed SparkPixels.ino:
 *      Added color picker and switch to pulse_oneColorAll();
 *      Replaced the original IFTTT WEATHER code with call to pulse_oneColorAll()
 * @author   Werner Moecke
 * @version  V3.1
 * @date     12-March-2016
 *
 * @fixed SparkPixels.ino:
 *      Fixed issue with CUBE CLASSICS mode breaking the loop to runMode() after exit;
 *      Also removed unnecessary calls to transitionAll() within runCubeClassics() and iftttWeather().
 * @author   Werner Moecke, Kevin Carlborg
 * @version  RC V3.0
 * @date     11-March-2016
 *
 * @extended SparkPixels.ino:
 *		New mode: DIGI, CUBE CLASSICS, IFTTT WEATHER
 *		New setting: AUX Switches
 *		New Functions: transitionALl, transitionOne, transitionHelper, getTransitionStep, 
 *                     clamp, makeAuxSwitchList, getAuxSwitchIndexFromID, updateAuxSwitches, 
 *                     iftttWeather
 *      New Cloud Function: SetAuxSwitch
 *      Updated Cloud Function: Renamed the cloud function *Function* to *FnRouter*
 *      New Feature: Added AUX Switchs used to turn things on or off or switch between two 
 *                   options, i.e. switch between using a light sensor or the app to set 
 *                   LED brightness. The Auto Shut Off has migrated to use this function.
 *                   
 *                   IFTTT WEATHER - search for the Spark Pixels recipe on ifttt.com or
 *                   create your own. Just setup your device to call the SetMode 
 *                   function with this input: M:IFTTT WEATHER,C6:0000FF,
 *                   Where 0000FF is the hex value for blue. Color must be in hex formate
 *                   Oh, and Don't forget that last comma,
 * @author   Werner Moecke, Kevin Carlborg
 * @version  BETA V2.8
 * @date     02-February-2016 ~ 10-March-2016
 *
 * @extended SparkPixels.ino:
 * 		Fixed issue with CHEERLIGHTS mode responsiveness to external events;
 *      Keep connection alive in CHEERLIGHTS mode.
 * @author   Werner Moecke
 * @version  V2.7
 * @date     25-January-2016 ~ 01-February-2016
 *
 * @extended SparkPixels.ino:
 *		New mode: FILLER (by Werner Moecke [based on idea by Alex Hornstein])
 *		New Functions: filler()
 *
 * 		Fixed CHEERLIGHTS mode not initializing after changing modes
 * @author   Werner Moecke
 * @version  V2.6
 * @date     16-January-2016 ~ 17-January-2016
 *
 * @extended SparkPixels.ino:
 *		New mode: CHEERLIGHTS (by Alex Hornstein, Werner Moecke [stability fixes, extra effects])
 *		New Functions: cheerlights(), fillX(), fillY(), fillZ()
 *
 * 		Fixed UDP listener stability issues and improved support for multiple cube streaming
 * @author   Werner Moecke
 * @version  V2.5
 * @date     05-January-2016 ~ 16-January-2016
 *
 * @extended SparkPixels.ino:
 *		New mode: CUBES (by Alex Hornstein, C++ port by Werner Moecke)
 *		New Functions: cubes(), drawCube(), cubeInc()
 *
 * 		Fixed demo getting stuck at OFF mode: Re-numbered modeId constant declares
 * @author   Werner Moecke
 * @version  V2.4
 * @date     23-December-2015 ~ 25-December-2015
 *
 * @extended SparkPixels.ino:
 *		New mode: CHRISTMASTREE (by Kevin Carlborg)
 *		New mode: WHIRLWIND (by Bill Marrs)
 *		New setting: Auto Shut Off enable/disable (through cloud function)
 *		New Functions: christmasTree(), whirlWind(), isWhiteColor(),
 *		drawSolidHorizontalCircle(), drawHollowHorizontalCircle(),
 * 		setASO(), randomColor(), randomDecimal(), radius()
 * @author   Werner Moecke
 * @version  V2.3
 * @date     18-November-2015 ~ 21-December-2015
 *
 * @extended SparkPixels.ino:
 *		Function: void publishCloudVariables()
 * @author   Werner Moecke
 * @version  V2.2
 * @date     07-November-2015 ~ 08-November-2015
 *
 * @extended SparkPixels.ino:
 *		New mode: SQUARRAL (ported from original L3D demo)
 *		New mode: PLASMA (ported from original L3D demo)
 *		New Functions: zplasma(), squarral()
 * @added: New instruction, SYSTEM_THREAD(ENABLED) - provided by Particle as of v0.4.6
 * @author   Werner Moecke
 * @version  V2.1
 * @date     28-October-2015 ~ 07-November-2015
 *
 * @extended SparkPixels.ino:
 *		New mode: DEMO (not available through the SparkPixels app menu)
 *		New mode: TWO COLOR CHASE (reworked POLICE LIGHTS CHASE)
 *		New mode: TWO COLOR WIPE (reworked POLICE LIGHTS WIPE)
 *		Changed mode: RAINBOW BURST (after filling all dots, blank one by one)
 *		Functions: transition(), random_seed_from_cloud(), runMode(),
 * 		modeButton(), smoothSwitch(), resetVariables(), twoColorWipe(),
 * 		twoColorChaser(), cubeGreeting(), runDemo()
 * @author   Werner Moecke
 * @version  V2.0
 * @date     12-October-2015 ~ 25-October-2015
 *
 * @extended SparkPixels.ino - New modes:
 *		ACID DREAM, COLOR BREATHE, COLOR PULSE, COLOR STRIPES, COLOR TRANSITION
 *		FLICKER, POLICE LIGHTS, POLICE LIGHTS CHASER, POLICE LIGHTS WIPE, 
 *		RAINBOW BURST, LISTENER
 * @author   Werner Moecke
 * @version  V1.0.2
 * @date     24-September-2015 ~ 02-October-2015
 *
 * @file     SparkPixels.ino
 * @authors  Kevin Carlborg
 * @version  V1.0.0
 * @date     14-July-2015
 * @brief    Neopixel strip Powered by the Spark Core
 *
 * @extended extra-examples.cpp from NEOPIXEL Library
 * @functions: colorAll,colorWipe,rainbow,rainbowCycle,theaterChase,Wheel 
 * @author   Phil Burgess
 * @version  V0.0.6
 * @date     NA
 ******************************************************************************
 Copyright (c) 2015 Kevin Carlborg  All rights reserved.

 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation, either
 version 3 of the License, or (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public
 License along with this program; if not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************/
//SYSTEM_THREAD(ENABLED);

#include "platform/neopixel.h"
#include <avr/pgmspace.h>
#include <math.h>

#define L3D_UNITY_BUILD 1

#include "config/build_config.h"

// Déclaration anticipée normalement générée automatiquement pour un fichier INO.
void advanceDemo(void);

Adafruit_NeoPixel strip = Adafruit_NeoPixel(PIXEL_CNT, PIXEL_PIN, PIXEL_TYPE);

/**
 * Software timer interrupt to advance shuffle/demo mode every 2 minutes
 * 2 minutes = 2*60*1000
 */
Timer demoTimer(2*60*1000, advanceDemo);    

#include "config/mode_ids.h"
#include "core/shared_types.h"
#include "core/bounded_text.h"
#include "cloud/command_validation.h"
#include "core/command_dispatch.h"
#include "bytecode/bytecode_format.h"
#include "bytecode/bytecode_validator.h"
#include "bytecode/bytecode_diagnostics.h"
#include "bytecode/bytecode_storage.h"
#include "bytecode/bytecode_vm.h"

#include "core/legacy_state.h"
#include "core/animation_lifecycle.h"
#include "core/animation_scheduler.h"
#include "animations/animations.h"
#include "diagnostics/runtime_diagnostics.h"
#include "network/local_http_parser.h"
#include "network/local_api_server.h"
#include "network/stream_frames.h"

// ----------------------------------------------------------------------------
// Initialise les endpoints Particle, le hardware et l'etat persistant.
//
// Effet de bord :
// - enregistre les fonctions Cloud, initialise les LED, l'EEPROM, le microphone
//   et les diagnostics.
// ----------------------------------------------------------------------------
void setup() {
    diagnosticsSetupEarly();

    Particle.function("Function",     FnRouter);
    Particle.function("SetMode",      SetMode);
    Particle.function("SetText",      SetText);
    
    Particle.variable("micValue",     micValue);
    Particle.variable("debug",        debug);
    Particle.variable("wifi",         wifi);
    Particle.variable("hour",         hour);
    Particle.variable("speed",        speedIndex);
    Particle.variable("brightness",   brightness);
    Particle.variable("modeList",	  modeNameList);
    Particle.variable("modeParmList", modeParamList);
    Particle.variable("auxSwtchList", auxSwitchList);
    Particle.variable("mode",         currentModeName);
    Particle.variable("deviceInfo",   deviceInfo);
        
    pinMode(PIXEL_PIN, OUTPUT);
	
	//Initialize
	lastSync = lastCommandReceived = previousMillis = millis(); //Take a time stamp
    run = TRUE;                 //was: FALSE;
    stop = isFirstLap = shuffleMode = FALSE;
    demo = lastDemo = stopDemo = TRUE;
    autoShutOff = FALSE;		//Initialize auto shut off mode variable
	rememberLastMode = FALSE;	//Initialize remember last mode variable*/
    reboot = FALSE;				//Initialize reboot request flag variable
	defaultColor = strip.Color(0xfd, 0xf5, 0xe6);   //This seems closer to incandescent color
	//snowFlakeColor = getColorFromInteger(0xFFFFFF);
    //c1 = Wheel(random(256));
    //c2 = Wheel(random(256));
    Serial.begin(9600);
	//Start up the Neopixels
	strip.begin();
    
    //Clear the mode list and mode param list variables
	boundedTextClear(modeNameList, sizeof(modeNameList));
	boundedTextClear(modeParamList, sizeof(modeParamList));
	boundedTextClear(auxSwitchList, sizeof(auxSwitchList));
    
    /***************** DEBUG *****************/
    //clearEEPROM();    // Pre-0.4.9 firmware
    //EEPROM.clear();   // >= 0.4.9 firmware
    /*****************************************/
	makeModeList();		 //Assemble Spark Cloud available modes variable
    makeAuxSwitchList(); //Assemble Spark Cloud available aux switches variable
    makeDeviceInfo();	 //Assemble Spark Cloud available device info variable
    initEEPROM();		 //Check EEPROM area and initialize globals (if values were previoulsy set)
    
    //Get Threads ready
    Time.zone(timeZone);
    wifi = WiFi.RSSI();
    
    // Initialize audio capture
    initMicrophone();
	
	// Initialise chaque index compact avant le premier mélange.
	for(uint8_t i=0;i<sizeof modeStruct / sizeof modeStruct[0];i++)
		modeShuffleOrder[i] = i;

    animationLifecycleStart(currentModeID);
    diagnosticsSetupComplete(currentModeID);
    localApiSetup();
}

#include "cloud/metadata.cpp"

// ----------------------------------------------------------------------------
// Orchestre le rendu courant et les taches periodiques du firmware.
//
// Effet de bord :
// - execute une frame, traite les diagnostics, actualise les metadonnees et
//   peut demander une synchronisation horaire ou un redemarrage.
// ----------------------------------------------------------------------------
void loop() {
	diagnosticsProcessRequests();
    localApiProcess();

    if(run) {
		stop = FALSE;
        animationSchedulerBeginCycle();
        if(demo) { runDemo(); }
		else { animationTick(); }
        animationSchedulerFinishCycle();
    }
	
	if(currentModeID == STANDBY) {
	    micValue = analogRead(MICROPHONE);
    }
    if(reboot) {
        delay(500); //Need this here otherwise the Cloud Function returned response is null
        System.reset();
    }

    unsigned long currentMillis = millis();
 
    if(currentMillis - previousMillis > 5000) {
    //if(currentMillis - previousMillis > oneMinuteInterval) {
        Serial.printf("Info=%s\n",deviceInfo);
        previousMillis = currentMillis;
        hour = Time.hour();    //used to check for correct time zone
        wifi = WiFi.RSSI();
		if(diagnosticsMayRefreshDeviceInfo(currentMillis))
			makeDeviceInfo();

        //Put other timing stuff in here to speed up main loop
        //Time sync interval: 24 hours
        if (currentMillis - lastSync > 24*60*60*1000) {
            // Request time time synchronization from the Spark Cloud
            //sprintf(debug,"Last sync time = %i,", (int)(currentMillis - lastSync));
			Particle.syncTime();
            lastSync = currentMillis;
        }
        
        //Auto off in 1 hr when night time
        if (autoShutOff && (currentMillis - lastCommandReceived > 1*60*60*1000)) {
            //Auto Off Criteria
            //If it's Monday through Friday between 8am and 4pm or between 10pm and 5am any day, turn Off the lights
            if(((Time.weekday() >= 2 && Time.weekday() <=6) && (Time.hour() >= 8 && Time.hour() <= 18)) || (Time.hour() >= 23) || (Time.hour() <= 5)) {
                //No one is home or everyone is sleeping. So shut it down
				//sprintf(debug,"Last auto Off time = %i,", (int)(currentMillis - lastCommandReceived));
				lastCommandReceived = currentMillis;
				setNewMode(getModeIndexFromID(STANDBY));
                run = TRUE;
                demo = FALSE;
            }
        }
    }
}

//Disable random seed from the cloud
#include "network/local_http_parser.cpp"

#include "network/local_api_server.cpp"

#include "core/animation_scheduler.cpp"

#include "bytecode/bytecode_format.cpp"

#include "bytecode/bytecode_validator.cpp"

#include "bytecode/bytecode_diagnostics.cpp"

#include "bytecode/bytecode_storage.cpp"

#include "bytecode/bytecode_vm.cpp"

// Les modules historiques inclus ci-dessous conservent leur syntaxe `delay`,
// mais chaque attente sert desormais Particle Cloud et peut etre abregee.
#define delay(durationMillis) animationCooperativeDelay(durationMillis)

#include "core/mode_runtime.cpp"

#include "core/animation_lifecycle.cpp"

#include "animations/cube_greeting.cpp"

#include "animations/rain_salvos.cpp"

#include "rendering/transitions.cpp"

#include "animations/clock.cpp"

#include "network/ifttt_weather.cpp"

#include "animations/cube_classics.cpp"

#include "animations/digi.cpp"

#include "animations/color_all.cpp"

#include "network/cheerlights.cpp"

#include "animations/filler.cpp"

#include "animations/cubes.cpp"

#include "animations/whirlwind.cpp"

#include "animations/christmas.cpp"

#include "animations/rain.cpp"

#include "animations/lightning.cpp"

#include "animations/warm_fade.cpp"

#include "animations/zone.cpp"

#include "animations/classic_color_effects.cpp"

#include "rendering/primitives.cpp"

#include "network/stream_frames.cpp"

#include "network/udp_listener.cpp"

#include "animations/spectrum.cpp"

#include "animations/cubetube_fft_common.cpp"

#include "animations/fft_joy_legacy.cpp"

#include "animations/fft_meteors_rainbow.cpp"

#include "animations/lightning_in_a_box.cpp"

#include "animations/tranquility.cpp"

#include "animations/gyrophare_fr.cpp"

#include "animations/text.cpp"

#include "animations/squarral.cpp"

#include "animations/collide2.cpp"

#include "animations/puck_dude.cpp"

#include "animations/crumble.cpp"

#include "animations/snake.cpp"

#include "animations/classic_planes.cpp"

#include "animations/d_spiral.cpp"

#include "animations/matrix.cpp"

#include "animations/cube_bounce.cpp"

#include "animations/slideshow.cpp"

#include "core/command_dispatch.cpp"

#include "cloud/command_parser.cpp"

#include "diagnostics/runtime_diagnostics.cpp"

#undef delay

