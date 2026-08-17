#ifdef L3D_UNITY_BUILD

void random_seed_from_cloud(unsigned int seed) {
   // don't do anything with this. Continue with existing seed.
}

#include "../storage/eeprom.cpp"

void runDemo() {
    static int textMode=0, frameCount=0;
    static int endOfMessage=0, cycleCount=-1;
    static float posInc=.2;
    static bool isTextDone=TRUE;
    run = TRUE;

    if(stop || !demo) {
		run = TRUE; 
		demo = FALSE; 
		if(demoTimer.isActive())
			demoTimer.stop(); 
		return;
	}

    if(isTextDone && stopDemo) {
        // Check if the rememberLastMode flag is set; in which case,
        // we don't set the colors and/or modes randomly
        if(!rememberLastMode) {
            cycleCount++;
            if(cycleCount >= (sizeof(modeStruct) / sizeof(modeStruct[0]))-4) {
                srand(analogRead(MICROPHONE));
                cycleCount = 0;
                textMode = 0;
            }
            setRandomMode();
        }
		frameCount = 0;
		transitionAll(black, LINEAR);
        isTextDone = stopDemo = FALSE;
		demoTimer.start();
    }

    while(!isTextDone) {
        if(stop || !demo) {
			run = TRUE; 
			demo = FALSE; 
			if(demoTimer.isActive())
				demoTimer.stop(); 
			return;
		}
        if(textMode <= 2) {endOfMessage = 13;}					// Show L - 3 - D
        if(textMode == 3) {endOfMessage = strlen(message)*8;}	// Show Welcome Message
        if(textMode >= 4) {endOfMessage = SIDE*map(strlen(message), 1, 63, 1, SIDE)+(strlen(message))*8;}
        cubeGreeting(textMode, frameCount, pos);

        frameCount++;
        pos += posInc;
        if (pos >= endOfMessage) {
            if(textMode <= 5) 
                pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
            else
                pos = map(strlen(message), 1, 63, (int)-(SIDE*.98), 0);
            textMode++;
            if(textMode > 6) {
                if(cycleCount == floor((sizeof(modeStruct) / sizeof(modeStruct[0]))*.25)-1)
                    textMode = 0;
                else 
                    textMode = 4;
                isTextDone = TRUE;
                //We reset the mode cycle timer here for the scrolling text
                //not to interfere with the timeout count and vice-versa.
                //lastModeSet = millis();
				stopDemo = false;
				demoTimer.start();
            } 
            if(textMode <= 4) {
                // Check if the rememberLastMode flag is set; in which case,
                // we jump out of the demo mode after the "L - 3 - D" seq.
                if(textMode == 3) {
                    demo = !rememberLastMode;
			if(shuffleMode) {
				run = stopDemo = TRUE;
				return;
			}
		}
                delay(800); 
                if(!demo && !shuffleMode) {setNewMode(getModeIndexFromID(currentModeID));}
                else {transition(black, true);}
            }
        }
    }
    runMode();
}


void setRandomMode(void) {
	color1 = Wheel(random(256));
    color2 = Wheel(random(256));
    color3 = Wheel(random(256));
    color4 = Wheel(random(256));
	switch1 = random(2);
	switch2 = random(2);
	switch3 = random(2);
	switch4 = random(2);
	
	do {
        //int randomModeIdx = random(0, (int)(sizeof(modeStruct) / sizeof(modeStruct[0])));
        //    currentModeID = modeStruct[randomModeIdx].modeId;
		/** The random technique above can have repeats every few cycles,
		  * so let's replace it and use the modeShuffleOrder array - guaranteeing each 
		  * mode gets played. 
		  */
		if(shuffleIdx >= (int)(sizeof modeShuffleOrder / sizeof modeShuffleOrder[0]))	
			resetShuffleMode();
		currentModeID = modeStruct[modeShuffleOrder[shuffleIdx]].modeId; 
		shuffleIdx++;
    }while((currentModeID == previousModeID)    || 
           (currentModeID == NORMAL)            || 
           (currentModeID == STANDBY)           ||    
           (currentModeID == CHEERLIGHTS)       || 
		   (currentModeID == COLORALL)          ||
           (currentModeID == CUBE_PAINTER)      ||
           (currentModeID == IFTTTWEATHER)      ||
		   (currentModeID == POLICELIGHTS)     	||
		   (currentModeID == SHUFFLE) 	     	||
		   (currentModeID == TEXT)              || 
           (currentModeID == LISTENER));
	
	//sprintf(debug, "currentModeID: %d", currentModeID);
	//Particle.publish(debug);
	setNewMode(getModeIndexFromID(currentModeID));
}

//Shuffle the deck
void resetShuffleMode(void) {
	shuffleIdx = 0;
	arrayShuffle(modeShuffleOrder,(int)(sizeof modeShuffleOrder / sizeof modeShuffleOrder[0]));
}

// Timer Callback to advance Demo/Shuffle Reel
void advanceDemo() {
    stopDemo = true;
}


void runMode() {
	if(shuffleMode) { 
		if(stopDemo) {
			stopDemo = FALSE;
			setRandomMode(); 
			demoTimer.start(); 
		}
	}
    switch (currentModeID) {
        case STANDBY:
            transitionAll(black,LINEAR);	
		    //transition(black, true);  //colorAll(0, demo);
			run = FALSE;
		    break;
		case ACIDDREAM:
		    cycleLerp();
		    break;    
        case ACIDRAIN:
        case GOLDRAIN:
            acidRain();
            break;
     	case CHASER:
		    colorChaser(color1);
			break;
     	case CHEERLIGHTS:
		    cheerlights();
			break;
		case CHRISTMASLIGHTS:
		    christmasLights();
		    break;
		case CHRISTMASTREE:
		    christmasTree();
		    break;
		case CLASSICPLANES:
			classicPlanes(); 
	        break;
		case CLOCK:
		    showClock();
		    break;
		case COLLIDE:
		    collide();
		    break;
		case COLLIDE2:			
	        collide2(); 
	        break;
		case COLORALL:
	        transitionAll(getColorFromInteger(color1),POLAR);	
	        //transition(getColorFromInteger(color1), false);  
	        //colorAll(color1, demo);
	        break;
     	case COLORBREATHE:
	        pulse_oneColorAll(color1);
	        break;
		case COLORFADE:
		    color_fade();
		    break;
		case COLORPULSE:
		    colorPulse();
		    break;
		case COLORSTRIPES:
		    colorStripes();
		    break;
		case CRUMBLE:
			crumble(); 
	        break;
		case CUBEBOUNCE:
			cubeBounce(); 
	        break;
		case CUBE_CLASSICS:
		    runCubeClassics(color1, 0);
		    break;
		case UPNDOWN:
		case ROPECOIL:
		case WORMS:
		case MOREPLANES:
		case VOXELSLEFTBEHIND:
		case PLANESFILLCUBE:
		case BUILDAWALL:
		case VOXELRANDOM:
		case SINEWAVE:
		case LINESPIN:
		case SINELINES:
		case SPHEREMOVE:
		case FIREWORKS:
		case RAND_PATH_AROUND:
		case PYRAMID:
		case FOLDER:
		case DIAGONAL_PLANES:
		    transitionAll(black,LINEAR);
			color1 = Wheel(random(256));
			switch1 = random(2);
		    runCubeClassics(color1, 1);
	        break;
		case CUBE_PAINTER:
		    // Nothing to do; function is called through the Cloud API
		    showPixels();
		    delay(100);
		    break;
		case CUBES:
		    cubes(color1, color2, color3, color4);
		    break;
	    case DIGI:
		    digi(color1);
		    break;
		case DSPIRAL:
			dSpiral(); 
	        break;
		case FILLER:
	        filler(color1, color2, color3); 
	        break;
     	case FLICKER:
		    flicker(color1);
			break;
		case FROZEN:
		    frozen();
		    break;
/*		case HYPER:
			hyper(); 
	        break;*/
		case IFTTTWEATHER:
		    iftttWeather(color6);
    	    break;
/*		case LIFE:
		    transitionAll(black,LINEAR);
			life();
	        break;	*/
		case LIGHTNING:
			if(millis() - lastLightning >= lightningInterval) {
				lastLightning = millis();
				srand(lastLightning);
				do {
					lightningInterval = oneMinuteInterval / random(24, 76);
				}while(lastLightningInterval == lightningInterval);
				lastLightningInterval == lightningInterval;
				lightning();
			}
			else
				transitionAll(black,LINEAR);
		    break;
	/*	case LISTENER:
		    listen();
		    break;*/
		case MATRIX:
			matrix(); 
	        break;
		case PLASMA:
		    zPlasma();
		    break;
		case POLICELIGHTS:
		    police_light_strobo();
		    break;
		case PUCKDUDE:
			puckDude(); 
	        break;
		case RAIN:
		    rain(color1);
		    break;
		case RAINBOW:
		    rainbowCycle();
		    break;
		case RAINBOW_BURST:
		    random_burst();
		    break;
/*		case ROMAN:
		    transitionAll(black,LINEAR);
			romanCandle(); 
	        break;	*/
		case SHUFFLE:
			break;
		case SLIDESHOW:
		    slideshow();
		    break;
		case SNAKE:
			snake(); 
	        break;	
		case SPECTRUM:
		    FFTJoy();
		    break;
		case SQUARRAL:
		    squarral();
		    break;
		case TEXT:
		    showText(color1, color2);
		    break;
		case THEATERCHASE:
		    theaterChaseRainbow();
		    break;
		case TWOCOLORCHASE:
		    twoColorChaser(color1, color2);
		    break;
		case WARMFADE:
		    warmFade();
		    break;
		case WHIRLWIND:
		    whirlWind();
		    break;
		case ZONE:
	        colorZone(color1, color2, color3, color4, (demo || switch1)); 
	        break;
		case ZONECHASER:
	        colorZoneChaser(color1, color2, color3, color4); 
	        break;
		case NORMAL:
		default:
		    transitionAll(getColorFromInteger(defaultColor),LINEAR); 
		    //transition(incandescent, false);    
		    //colorAll(defaultColor, demo);
		    run = FALSE;
			break;
    }    
}


void resetVariables(int modeIndex) {
	if(!shuffleMode && demoTimer.isActive()) {
		demoTimer.stop();
	}
	
    switch (modeIndex) {
        case ACIDRAIN:
        case GOLDRAIN:
            fadingMax=25;
            initSalvos();
            transitionAll(black, LINEAR);
            break;
		case RAIN:
			transitionAll(black, LINEAR);
            // Do we want some lightning to go with the rain? ;-)
            if(switch4) {
				lastLightning = millis();
				lightningInterval = oneMinuteInterval / random(24, 76);
				lastLightningInterval = lightningInterval;
            }
			break;
		case LIGHTNING:
			transitionAll(black, LINEAR);
			lastLightning = millis();
			lightningInterval = oneMinuteInterval / random(24, 76);
			break;
		case COLLIDE2:
		    transitionAll(black, LINEAR);
			initCollide();			
			break;
		case CLOCK:
            hours = minutes = seconds = 0;
            h = m = s = Point(0, 0, 0);
            // digit positions
            h.z = SIDE - 1;
            m.z = SIDE - 4;
            s.z = SIDE - 7;
            hrow = 2;
            mrow = 0;
            srow = 3;
            // set plane to display time elements
            hplane = 6;
            mplane = 3;
            splane = 0;
            thickness = 1;
            sprintf(clockMessage, "00:00:00XX");
            switch(whichTextMode) {
                case 0:
                    pos = map(strlen(clockMessage), 1, 63, (int)-(SIDE*.5), 0);
                    break;
                case 1:
                    pos = map(strlen(clockMessage), 1, 63, (int)-(SIDE*.98), 0);
                    break;
            }
			whichTextMode = (whichTextMode+1)%2;
            //whichTextMode++;
            //if(whichTextMode > 2) {whichTextMode = 0;}
            transitionAll(black,LINEAR);
			break;
		case DSPIRAL:
			transitionAll(black,LINEAR);
			dSpiral_setup();
			break;
		case IFTTTWEATHER:
		{
            lastSwitchState[0] = switch1;
            thickness = 1;
            switch(whichTextMode) {
                case 0:
                case 1:
                    pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
                    break;
                case 2:
                    pos = map(strlen(message), 1, 63,(int)-(SIDE*.98), 0);
                    break;
            }
            transitionAll(black,LINEAR);
			break;
		}
		case CHEERLIGHTS:
			hostname = "api.thingspeak.com";
			path = "/channels/1417/field/2/last.txt";
			response = "";
			pollTime = millis() + POLLING_INTERVAL;
			lastCol = black;
				client.stop();
			connected = client.connect(hostname, 80);
			break;
			case FILLER:
			lastCol = black;
			transitionAll(lastCol,LINEAR);
			break;
		case LISTENER:
		{
			IPAddress myIp = WiFi.localIP();
 //           sprintf(debug, "%d.%d.%d.%d -- %d --%s", myIp[0], myIp[1], myIp[2], myIp[3],expected_packet_size, switch1 ? "true" : "false");
            transitionAll(black,LINEAR);
		    countdown = 0;
        	Udp.stop();
            maximum_received_packet = 0;
            while(!Udp.setBuffer(CUBE_PACKET_SIZE)) { /* Start the UDP */ }
            Udp.begin(65506);
		    break;
		}
		case CUBEBOUNCE:
		    transitionAll(black,LINEAR);
			cubeBounce_setup();
			break;
		case CUBES:
            side=0;
            inc=1;
            mode=0;
            flipColor = TRUE;
			transitionAll(black,LINEAR);	
			break;
		case CHRISTMASTREE:
			isFirstLap = TRUE;
			transitionAll(black,LINEAR);	//fadeToBlack();
			break;
/*		case LIFE:
            transitionAll(black,LINEAR);
			lifeResetCube();			
		    break;*/
		case PLASMA:
            phase = 0.0;
            colorStretch = 0.23;    // Higher numbers will produce tighter color bands 
			fadeSmooth(0, SIDE, 0.125);
			transitionAll(black,LINEAR);	
			break;
		case RAINBOW_BURST:
            idex = 0;
            ihue = 0;
			break;
/*		case ROMAN:
            transitionAll(black,LINEAR);
			initRockets();			
		    break;*/
		case TEXT:
		{
            sprintf(message, textInputString);
            switch(whichTextMode) {
                case 0:
                    pos = map(strlen(message), 1, 63, (int)-(SIDE*.98), 0);
                    break;
                case 1:
                case 2:
                    pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
                    break;
            }
			whichTextMode = (whichTextMode+1)%2;
            //whichTextMode++;
            //if(whichTextMode > 2) {whichTextMode = 0;}
            Color bg = switch2 ? black : getColorFromInteger(color2);
            transitionAll(bg,LINEAR);
			break;
		}
		case SNAKE:
            transitionAll(black,LINEAR);
			srand(analogRead(MICROPHONE));
			snakeResetCube();	
		    break;
		case SQUARRAL:
            frame = 0;
            bound = 0;
            axis = 0;
            boundInc = 1;
            squarral_zInc = 1;
            position = {0,0,0};
            increment = {1,0,0};
			transitionAll(black,LINEAR);	
			break;
		case WHIRLWIND:
			center = { 4.5, 4.5, 4.5 };
			lastRand = lastLastRand = 0;
			lastSwap = millis();
            for (int i=0; i<MAX_DOTS; i++) {
                y[i] = random(SIDE);
                radi[i] = random(MIN_RADI,MAX_RADI) + randomDecimal();
                angle[i] = randomDecimal() * 2 * PI;
                //clr[i] = Color(rand()%16, rand()%16, rand()%16);
                randomColor(&clr[i]);
            }
            transitionAll(black,LINEAR);	
			break;
		case CUBE_PAINTER:
		{
            unsigned char red, green, blue;
            transitionAll(black,LINEAR);	
            
            // (If there's color data previously stored, there's nothing to do)
            // In either case, redraw the cube with the color data from the buffer array
            for(int i=0; i<(PIXEL_CNT*BPP); i+=BPP) {
                red = drawingBuffer[i];
                green = drawingBuffer[i+1];
                blue = drawingBuffer[i+2];
                if((red + green + blue) > 0)
                    strip.setPixelColor(i/3, red, green, blue);
            }
			break;
		}
     	case COLORALL:
			break;
		case CRUMBLE:
			transitionAll(black,LINEAR);
			resetCycle();
			break;
		case MATRIX:
		    transitionAll(black,LINEAR);
			matrix_setup();
			break;
		case DIGI:
		case SLIDESHOW:
			colorWheel = random(256);
			transitionAll(black, LINEAR);
			break;
		case SHUFFLE:
			resetShuffleMode();
			transitionAll(black, LINEAR);
			break;
		case ACIDDREAM:
		case CHASER:
		case CHRISTMASLIGHTS:
		case CLASSICPLANES:
		case COLLIDE:
		case COLORBREATHE:
		case COLORFADE:
		case COLORPULSE:
		case COLORSTRIPES:
		case FLICKER:
		case FROZEN:
		case NORMAL:
		case POLICELIGHTS:
		case PUCKDUDE:
		case RAINBOW:
		case SPECTRUM:
		case STANDBY:
		case THEATERCHASE:
		case TWOCOLORCHASE:
		case WARMFADE:
		case ZONE:
		case ZONECHASER:
		default:
			transitionAll(black,LINEAR);
			break;
    }    
}

#endif
