#ifdef L3D_UNITY_BUILD

int SetMode(String command) {
	int beginIdx = 0;
	int returnValue = -1;
	int idx = command.indexOf(',');
    bool isNewMode = FALSE;
	bool isNewSpeed = FALSE;
	bool isNewBrightness = FALSE;
    bool isNewColor = FALSE;
    bool isNewSwitch = FALSE;
	/* ========================== SetMode return  Defines  ========================== */
	const int NO_CHANGE		 = 1000;
	const int BRIGHTNESS_SET = 1001;
	const int SPEED_SET		 = 1002;

    // Trim extra spaces
    command.trim();
    // Convert it to upper-case for easier matching
    //command.toUpperCase();	//Don't do this if the mode names are not all uppercase
    
    //keep track or the last command received for the auto off feature
    lastCommandReceived = millis();
    
    //sprintf(debug,"%s", command.c_str());
	//Particle.publish(debug);
	
	while(idx != -1) {
		if(command.charAt(beginIdx) == 'M') {
			//set the new mode from modeStruct array index
			returnValue = setNewMode(getModeIndexFromName(command.substring(beginIdx+2, idx).c_str())); 
			if(currentModeID == IFTTTWEATHER) { lastDemo = demo; }
			
			//Handle Shuffle stuff here
			if(currentModeID == SHUFFLE) { stopDemo = shuffleMode = TRUE; }
			else { stopDemo = shuffleMode = FALSE;  }
			char tempBuf[20];
			sprintf(tempBuf,"SETAUXSWITCH:%i,%i;",SHFL,shuffleMode?1:0);
			FnRouter(tempBuf);  //update to reflect on or off states of shuffle
			
			isNewMode = TRUE;
		}
		else if(command.charAt(beginIdx) == 'S') {
		    int receivedSpeedValue = command.substring(beginIdx+2, idx).toInt();
		    if(receivedSpeedValue > (int)(sizeof(speedPresets)/sizeof(int)))
		        receivedSpeedValue = sizeof(speedPresets)/sizeof(int) - 1;
		    if (speedIndex != receivedSpeedValue) {
		        //we don't update the speed when currently in LISTENER mode
				if(currentModeID != LISTENER) isNewSpeed = TRUE;
			}
			if(isNewSpeed) {
    			speedIndex = receivedSpeedValue;
    			speed = speedPresets[speedIndex];
        		// Update the EEPROM storage area
        		EEPROM.write(SPEED_START_ADDR, speedIndex);
			}
		}
		else if(command.charAt(beginIdx) == 'B') {
		    int newBrightness = command.substring(beginIdx+2, idx).toInt() * (255 * .01);	//Scale 0-100 to 0-255
			if(brightness != newBrightness) {isNewBrightness = TRUE;}
			if(isNewBrightness) {
			    brightness = newBrightness > 0 ? newBrightness : 1;
        		// Update the EEPROM storage area
        		EEPROM.write(BRIGHT_START_ADDR, brightness);
            }
			
			// added this test to make sure when a bright mode switches from itself
			// to a possible overdriven mode we do not start in a brightness beyond
			// what it can support
			checkBrightness();
		}
        else if(command.charAt(beginIdx) == 'C') {
            char * p;
			isNewColor = TRUE;
            switch(command.charAt(beginIdx+1)) {
                case '1':
                    color1 = strtoul( command.substring(beginIdx+3, idx).c_str(), & p, 16 );  //Convert hex string to int
					lastColors[0] = color1;
                    break;
                case '2':
                    color2 = strtoul( command.substring(beginIdx+3, idx).c_str(), & p, 16 );  //Convert hex string to int
					lastColors[1] = color2;
                    break;
                case '3':
                    color3 = strtoul( command.substring(beginIdx+3, idx).c_str(), & p, 16 );  //Convert hex string to int
					lastColors[2] = color3;
                    break;
                case '4':
                    color4 = strtoul( command.substring(beginIdx+3, idx).c_str(), & p, 16 );  //Convert hex string to int
					lastColors[3] = color4;
                    break;
                case '5':
                    color5 = strtoul( command.substring(beginIdx+3, idx).c_str(), & p, 16 );  //Convert hex string to int
					lastColors[4] = color5;
                    break;
                case '6':
                    color6 = strtoul( command.substring(beginIdx+3, idx).c_str(), & p, 16 );  //Convert hex string to int
					lastColors[5] = color6;
                    break;
            }
		}
		else if(command.charAt(beginIdx) == 'W') {
		    if(strlen(command.substring(beginIdx+2, idx).c_str()) > 63)
		        sprintf(message,"%s", command.substring(beginIdx+2, beginIdx+65).c_str());
            else
                sprintf(message,"%s", command.substring(beginIdx+2, idx).c_str());
            isNewText = TRUE;
		}

		// T for Toggle switch - expect 0 or 1 for false or true
		// S for Switch would have made more sense, but want to keep this backwards compatible and S is alreay Speed
		else if(command.charAt(beginIdx) == 'T') { 
            isNewSwitch = TRUE;
            switch(command.charAt(beginIdx+1)) {
                case '1':
                    switch1 = command.substring(beginIdx+3, idx).toInt() & 1;
                    lastSwitchState[0] = switch1;
                    break;
                case '2':
                    switch2 = command.substring(beginIdx+3, idx).toInt() & 1;
                    lastSwitchState[1] = switch2;
                    break;
                case '3':
                    switch3 = command.substring(beginIdx+3, idx).toInt() & 1;
                    lastSwitchState[2] = switch3;
                    break;
                case '4':
                    switch4 = command.substring(beginIdx+3, idx).toInt() & 1;
                    lastSwitchState[3] = switch4;
                    break;
            }
		}
		beginIdx = idx + 1;
		idx = command.indexOf(',', beginIdx);
	}

    // Update the EEPROM storage area; EEPROM.put() only updates as necessary
    if(isNewColor) {EEPROM.put(COLORS_START_ADDR, lastColors);}
    if(isNewSwitch) {EEPROM.put(SWITCHES_START_ADDR, lastSwitchState);}
	
	//Set the flags if it's a new mode
	//Need this when just updating speed and brightness so a currently running mode doesn't start over
    if(isNewMode) {
        run = TRUE;
	    stop = TRUE;
    }
    else {
		//I guess we're updating only the speed or brightness, so let's update the Pixels
		//we don't update the speed or brightness when currently in LISTENER mode
		if(currentModeID != LISTENER) showPixels();
		
		if(isNewBrightness) {
		    lastBrightness = brightness;
			//Let the sender know we got the new brightness command
			returnValue = BRIGHTNESS_SET;
		}
		else if(isNewSpeed==true) {
			//Let the sender know we got the new speed command
			returnValue = SPEED_SET;
		}
		else {
			//If we got here, it's possible that a command was set to update speed or brightness
			//But neither one was a new value. The new values, equal the current values
			returnValue = NO_CHANGE;
		}
    }

	// still here, so everything must be fine
	return returnValue;
}


/** 
 * Miscellaneous Cloud Function Router
 * Expect a string with a single function identifier 
 * followed by a colon followed by parameters
 **/
int FnRouter(String command) {
	// Trim extra spaces
    command.trim();
    // Convert it to upper-case for easier matching
    command.toUpperCase();
	
    int beginIdx = 0;
	int colonIdx = command.indexOf(':');
	
    // Set time zone offset
    if(command.substring(beginIdx, colonIdx)=="SETTIMEZONE") {
		//Expect a string like this: SETTIMEZONE:-6
        timeZone = command.substring(colonIdx+1).toInt();
        Time.zone(timeZone);
        hour = Time.hour();
        return timeZone;
    }
    else if(command.substring(beginIdx, colonIdx)=="GETSWITCHSTATE") {
		//Expect a string like this: GETSWITCHSTATE:1
        int id = command.substring(colonIdx+1).toInt();
        switch(id) {
            case 1:
                return (switch1 ? 1 : 0);
            case 2:
                return (switch2 ? 1 : 0);
            case 3:
                return (switch3 ? 1 : 0);
            case 4:
                return (switch4 ? 1 : 0);
            default:
                return -1;
        }
    }
    else if(command.substring(beginIdx, colonIdx)=="GETCOLOR") {
		//Expect a string like this: GETCOLOR:1
        int id = command.substring(colonIdx+1).toInt();
        switch(id) {
            case 1:
                return color1;
            case 2:
                return color2;
            case 3:
                return color3;
            case 4:
                return color4;
            case 5:
                return color5;
            case 6:
                return color6;
            default:
                return -1;
        }
    }
	else if(command.substring(beginIdx, colonIdx)=="SETAUXSWITCH") {
		//Expect a string like this: SETAUXSWITCH:1,0;
		//That breaks down to: SwitchID,state;
		beginIdx = colonIdx+1;
		int commaIdx = command.indexOf(',');
		int semiColonIdx = command.indexOf(';');
		int id = 0;
		while(semiColonIdx != -1) {
			id = (int) command.substring(beginIdx, commaIdx).toInt();
			bool state = command.substring(commaIdx+1,semiColonIdx).equals("1") ? TRUE : FALSE;
			auxSwitchStruct[getAuxSwitchIndexFromID(id)].auxSwitchState = state;
			
			// Update EEPROM storage area
			int START_ADDRESS = AUXSW_START_ADDR + (id * (sizeof(uint8_t) + 1));
			if(EEPROM.length() >= (START_ADDRESS + sizeof(uint8_t)))
			    EEPROM.write(START_ADDRESS, state ? 1 : 0);
            else 
                sprintf(debug,"Warning: EEPROM has reached max size limit; %s not updated", auxSwitchStruct[getAuxSwitchIndexFromID(id)].auxSwitchTitle);
			
			beginIdx = semiColonIdx + 1;
			commaIdx = command.indexOf(',', beginIdx);
			semiColonIdx = command.indexOf(';', commaIdx);
		}
		
		//Update the list
		makeAuxSwitchList();
		
		//Update Switch flags
		return updateAuxSwitches(id);
	}
    else if(command.substring(beginIdx, colonIdx)=="REBOOT") {
        //System.reset();
        reboot = TRUE;
        stop = TRUE;
        return 1;
    }
	
    return -1;  
 }

//Added Particle Function to get Text Input
int SetText(String command) {
    bool isTextSet = FALSE;
    /** DEBUG **/
    //clearEEPROM();  //EEPROM.clear();
    
    // Check EEPROM area and initialize text variable with data previoulsy set
    EEPROM.get(TEXT_START_ADDR, textInputString);
    for(int i=0; i<TEXT_LENGTH; i++) {
        if(textInputString[i] != 0xFF) {
            isTextSet = TRUE;
            break;
        }
    }
    if(isTextSet) {
        if(strcmp(textInputString, command.c_str()) != 0 && strlen(command.c_str()) > 0) {
            sprintf(textInputString,"%s", command.c_str());
            // Update the EEPROM storage area with EEPROM.put();
            EEPROM.put(TEXT_START_ADDR, textInputString);
        }
    }
    else {
        sprintf(textInputString,"%s", command.c_str());
        // Update the EEPROM storage area with EEPROM.put();
        EEPROM.put(TEXT_START_ADDR, textInputString);
    }
	return 1;
}

//Change Mode based on the modeStruct array index
int setNewMode(int newModeIndex) {
    //sprintf(debug,"%i", newModeIndex);
    // We don't want to switch the cube to a IFTTT alert even when it's set, when the cube
    // is in CUBE PAINTER or LISTENER modes, to keep from disrupting the user experience
    if((currentModeID == CUBE_PAINTER || currentModeID == LISTENER) && modeStruct[newModeIndex].modeId == IFTTTWEATHER) 
        return getModeIndexFromID(currentModeID);
    
    if(currentModeID != IFTTTWEATHER && currentModeID != STANDBY) 
        previousModeID = currentModeID;

    currentModeID = modeStruct[newModeIndex].modeId;
			
    // Update the EEPROM storage area
    if(currentModeID != IFTTTWEATHER && currentModeID != STANDBY) 
        EEPROM.write(LASTMODE_START_ADDR, currentModeID);
    
    sprintf(currentModeName,"%s", modeStruct[newModeIndex].modeName);
	resetVariables(modeStruct[newModeIndex].modeId);

	return newModeIndex;
}

int getModeIndexFromName(String name) {
    for(int i=0;i<(int)(sizeof modeStruct / sizeof modeStruct[0]); i++) {
        if(name.equals(String(modeStruct[i].modeName)))
            return i;
    }
    return -1;
}

int getModeIndexFromID(int id) {
    for(int i=0; i<(int)(sizeof modeStruct / sizeof modeStruct[0]); i++) {
        if(id == modeStruct[i].modeId)
            return i;
    }
    return -1;
}

int getAuxSwitchIndexFromID(int id) {
    for(uint16_t i=0;i<(int)(sizeof auxSwitchStruct / sizeof auxSwitchStruct[0]);i++) {
        if(id == auxSwitchStruct[i].auxSwitchId) {
            return i;
        }
    }
    return -1;
}

// Had to put this in to keep the modes that use all the voxels
// could overdrive the power supply and cause the cube to act
// in a strange manor.
void checkBrightness(void) {
	
	uint8_t maxBright = brightness;
		
    switch (currentModeID)  {
		case WARMFADE:
			maxBright = 20;
			break;	
			
		case ACIDDREAM:
		//case COLLISIONS:
		case COLORALL:
		case COLORFADE:	
		case COLORPULSE:
		case COLORBREATHE:
		case DIGI:
		case FILLER:
		case FLICKER:
		case NORMAL:
			maxBright = 37;
			break;	
		
		case ZONE:
			maxBright = 60;
			break;		
			
		case COLORSTRIPES:
			maxBright = 50;
			break;	
		
		case POLICELIGHTS:		
		case RAINBOW:
			maxBright = 75;
			break;		
	}
	
	//THe PacMan mode is a little dim, so lets make it a little brighter
	if(currentModeID == PUCKDUDE && brightness < 70)
		brightness  = 70;
	
	if (brightness > maxBright)
		brightness = maxBright;
}

#endif
