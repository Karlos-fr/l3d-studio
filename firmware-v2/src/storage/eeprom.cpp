// ============================================================================
// EepromStorage - Initialisation de la persistance historique
// ----------------------------------------------------------------------------
// Ce fichier charge les reglages persistants. Le buffer CubePainter reste dans
// la zone d'animation et n'est recharge que lors de l'entree dans ce mode.
// ============================================================================

#ifdef L3D_UNITY_BUILD

/***************************************************************
 * NOTE ON MY USE OF THE 'inline' QUALIFIER IN BELOW FUNCTIONS:
 * Using this provides a slight improvement in speed, with the
 * cost of adding an extra overhead, because it replaces each 
 * call with the whole function code; doing so because I know
 * both functions below will be called ONLY ONCE in the entire
 * run - clearEEPROM() is only called in DEBUG situations and
 * initEEPROM() is only called once within setup().
 ***************************************************************/
/* Function clearEEPROM() implemented due to the missing clear()
 * function in the EEPROM class (<= v0.4.9 firmware)
 */
inline void clearEEPROM(void) {
    for(int i = 0; i < MAX_EEPROM_SIZE; i++)
        EEPROM.write(i, 0xFF);
}

// ----------------------------------------------------------------------------
// Charge les reglages persistants et initialise les zones EEPROM vierges.
//
// Effet de bord :
// - initialise texte, vitesse, luminosite, mode, couleurs et switches ;
// - inspecte et initialise la zone CubePainter sans conserver son image en RAM.
// ----------------------------------------------------------------------------
inline void initEEPROM(void) {
	//Initialize local flags
    bool colorsStored, switchesStored, clearBuffer;
    colorsStored = switchesStored = FALSE;
    clearBuffer = TRUE;
	
	// Initialize textInputString variable
	SetText("");
    
    // Inspecte directement l'EEPROM sans monopoliser la zone d'animation.
    for(int i=0; i<(PIXEL_CNT*BPP); i++) {
        if(EEPROM.read(PAINTER_START_ADDR + i) != 0xFF) {
            clearBuffer = FALSE;
            break;
        }
    }
    // If there is no color data stored in EEPROM area then blank the entire buffer
    // (EEPROM.get() returns an array filled with 255, so we need to fill it with 0's)
    if(clearBuffer) {
        for(int i=0; i<(PIXEL_CNT*BPP); i++)
            EEPROM.write(PAINTER_START_ADDR + i, 0);
    }

	// Initialize speed variable
	speedIndex = EEPROM.read(SPEED_START_ADDR);
	if(speedIndex == 0xFF) {
	    speedIndex = 5; 
	    // Initialize EEPROM storage area
	    EEPROM.write(SPEED_START_ADDR, speedIndex);
    }
    speed = speedPresets[speedIndex];
    
    // Initialize brightness variable
	brightness = EEPROM.read(BRIGHT_START_ADDR);
	if(brightness == 0xFF) {
	    brightness = 20 * (255 * .01);	// Scale 0-100 to 0-255;
	    // Initialize EEPROM storage area
        EEPROM.write(BRIGHT_START_ADDR, brightness);
    }
  	lastBrightness = brightness;
    
    // Initialize currentModeID variable
	currentModeID = EEPROM.read(LASTMODE_START_ADDR);
	if(currentModeID == 0xFF) {
	    currentModeID = getModeIndexFromID(NORMAL);
	    // Initialize EEPROM storage area
	    EEPROM.write(LASTMODE_START_ADDR, currentModeID);
    }
	previousModeID = currentModeID;

    // Initialize colors
	EEPROM.get(COLORS_START_ADDR, lastColors);
	for(int i=0; i<sizeof(lastColors); i++) {
		if(lastColors[i] != 0xFFFFFFFF) {
			colorsStored = TRUE;
			break;
		}
	}
    if(colorsStored) {
        color1 = lastColors[0];
        color2 = lastColors[1];
        color3 = lastColors[2];
        color4 = lastColors[3];
        color5 = lastColors[4];
        color6 = lastColors[5];
    }
    else {
        color1 = lastColors[0] = 0;
        color2 = lastColors[1] = 0;
        color3 = lastColors[2] = 0;
        color4 = lastColors[3] = 0;
        color5 = lastColors[4] = 0;
        color6 = lastColors[5] = 0;
        // Initialize EEPROM storage area
        EEPROM.put(COLORS_START_ADDR, lastColors);
    }
    
    // Initialize switches
	EEPROM.get(SWITCHES_START_ADDR, lastSwitchState);
	for(int i=0; i<sizeof(lastSwitchState); i++) {
		if(lastSwitchState[i] != 0xFF) {
			switchesStored = TRUE;
			break;
		}
	}
	if(switchesStored) {
        switch1 = lastSwitchState[0];
        switch2 = lastSwitchState[1];
        switch3 = lastSwitchState[2];
        switch4 = lastSwitchState[3];
	}
	else {
        switch1 = lastSwitchState[0] = FALSE;
        switch2 = lastSwitchState[1] = FALSE;
        switch3 = lastSwitchState[2] = FALSE;
        switch4 = lastSwitchState[3] = FALSE;
        // Initialize EEPROM storage area
        EEPROM.put(SWITCHES_START_ADDR, lastSwitchState);
	}
}

#endif
