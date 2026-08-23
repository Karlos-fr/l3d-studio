// ============================================================================
// CommandDispatch - Implementation des commandes metier Spark Pixels
// ----------------------------------------------------------------------------
// Ce module valide puis applique les commandes depuis des buffers bornes. Il
// ne connait ni Particle Cloud, ni HTTP, ni l'interface TypeScript.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Memorise puis retourne le resultat d'une commande externe.
//
// Parametres :
// - result : code historique ou erreur de validation a conserver.
//
// Retour :
// - valeur result inchangee.
//
// Effet de bord :
// - actualise le dernier resultat expose dans l'etat LAN.
// ----------------------------------------------------------------------------
int recordCommandResult(int result) {
    lastCommandResult = result;
    return result;
}

// ----------------------------------------------------------------------------
// Valide integralement une commande SetMode avant toute modification d'etat.
//
// Parametres :
// - commandText : debut de la commande historique terminee par une virgule.
// - commandLength : nombre exact de caracteres a valider.
//
// Retour :
// - zero si la commande est valide, sinon un code COMMAND_ERROR negatif.
// ----------------------------------------------------------------------------
static int validateSetModeBuffer(
        const char* commandText,
        size_t commandLength) {
    if(commandText == NULL || commandLength == 0)
        return COMMAND_ERROR_EMPTY;
    if(commandLength > CLOUD_COMMAND_MAX_LENGTH)
        return COMMAND_ERROR_TOO_LONG;
    if(commandText[commandLength - 1] != ',')
        return COMMAND_ERROR_MALFORMED;

    int beginIdx = 0;
    int endIdx = findTextCharacter(commandText, commandLength, ',');
    while(endIdx != -1) {
        if(endIdx <= beginIdx)
            return COMMAND_ERROR_MALFORMED;

        char type = commandText[beginIdx];
        if(type == 'M') {
            if(commandText[beginIdx + 1] != ':' || endIdx <= beginIdx + 2 ||
               getModeIndexFromName(
                   commandText + beginIdx + 2,
                   endIdx - beginIdx - 2) < 0)
                return COMMAND_ERROR_MALFORMED;
        }
        else if(type == 'S' || type == 'B') {
            if(commandText[beginIdx + 1] != ':')
                return COMMAND_ERROR_MALFORMED;
            int parsed = 0;
            int maximum = type == 'S'
                ? (int)(sizeof(speedPresets) / sizeof(speedPresets[0])) - 1
                : 100;
            if(!parseUnsignedText(
                    commandText + beginIdx + 2,
                    endIdx - beginIdx - 2,
                    0,
                    maximum,
                    &parsed))
                return COMMAND_ERROR_OUT_OF_RANGE;
        }
        else if(type == 'C') {
            if(beginIdx + 3 > endIdx || commandText[beginIdx + 2] != ':' ||
               commandText[beginIdx + 1] < '1' || commandText[beginIdx + 1] > '6')
                return COMMAND_ERROR_MALFORMED;
            size_t colorLength = endIdx - beginIdx - 3;
            if(colorLength != 6 ||
               !isHexText(commandText + beginIdx + 3, colorLength))
                return COMMAND_ERROR_MALFORMED;
        }
        else if(type == 'T') {
            if(endIdx != beginIdx + 4 || commandText[beginIdx + 2] != ':' ||
               commandText[beginIdx + 1] < '1' || commandText[beginIdx + 1] > '4' ||
               (commandText[beginIdx + 3] != '0' && commandText[beginIdx + 3] != '1'))
                return COMMAND_ERROR_MALFORMED;
        }
        else if(type == 'W') {
            if(commandText[beginIdx + 1] != ':')
                return COMMAND_ERROR_MALFORMED;
            if(endIdx - (beginIdx + 2) >= TEXT_LENGTH)
                return COMMAND_ERROR_TOO_LONG;
        }
        else {
            return COMMAND_ERROR_MALFORMED;
        }

        beginIdx = endIdx + 1;
        endIdx = findTextCharacter(
            commandText,
            commandLength,
            ',',
            static_cast<size_t>(beginIdx));
    }
    return 0;
}

// ----------------------------------------------------------------------------
// Met a jour un switch auxiliaire deja valide.
//
// Parametres :
// - id : identifiant historique du switch auxiliaire.
// - state : nouvel etat booleen.
//
// Retour :
// - resultat historique de updateAuxSwitches ou une erreur hors plage.
//
// Effet de bord :
// - persiste le switch, regenere sa liste Cloud et actualise les flags runtime.
// ----------------------------------------------------------------------------
static int setAuxSwitchState(int id, bool state) {
    int auxSwitchIndex = getAuxSwitchIndexFromID(id);
    if(auxSwitchIndex < 0)
        return COMMAND_ERROR_OUT_OF_RANGE;

    auxSwitchStruct[auxSwitchIndex].auxSwitchState = state;
    int startAddress = AUXSW_START_ADDR + (id * (sizeof(uint8_t) + 1));
    if(EEPROM.length() >= (startAddress + (int)sizeof(uint8_t)))
        EEPROM.write(startAddress, state ? 1 : 0);
    else
        boundedTextFormat(
            debug,
            sizeof(debug),
            "Warning: EEPROM has reached max size limit; %s not updated",
            auxSwitchStruct[auxSwitchIndex].auxSwitchTitle);

    makeAuxSwitchList();
    return updateAuxSwitches(id);
}

// ----------------------------------------------------------------------------
// Applique les segments historiques de selection et de reglage d'un mode.
//
// Parametres :
// - commandText : debut de la commande contenant modes et reglages.
// - commandLength : nombre exact de caracteres disponibles.
//
// Retour :
// - index du mode, code historique de reglage ou code COMMAND_ERROR negatif.
//
// Effet de bord :
// - modifie l'etat du mode et persiste les reglages concernes dans l'EEPROM.
// ----------------------------------------------------------------------------
int setModeFromBuffer(const char* commandText, size_t commandLength) {
	int beginIdx = 0;
	int returnValue = -1;
	int idx = -1;
    bool isNewMode = FALSE;
	bool isNewSpeed = FALSE;
	bool isNewBrightness = FALSE;
    bool isNewColor = FALSE;
    bool isNewSwitch = FALSE;
	/* ========================== SetMode return  Defines  ========================== */
	const int NO_CHANGE		 = 1000;
	const int BRIGHTNESS_SET = 1001;
	const int SPEED_SET		 = 1002;
    size_t trimmedBegin = findTrimmedTextBegin(commandText, commandLength);
    size_t trimmedEnd = findTrimmedTextEnd(
        commandText,
        commandLength,
        trimmedBegin);
    if(commandText != NULL)
        commandText += trimmedBegin;
    commandLength = trimmedEnd - trimmedBegin;

    int validationResult = validateSetModeBuffer(commandText, commandLength);
    if(validationResult != 0)
        return validationResult;
    idx = findTextCharacter(commandText, commandLength, ',');
    
    // Actualise la derniere activite utilisee par l'extinction automatique.
    lastCommandReceived = millis();
    
	while(idx != -1) {
		if(commandText[beginIdx] == 'M') {
			// Active le mode retrouve dans le registre historique.
			int requestedModeIndex = getModeIndexFromName(
                commandText + beginIdx + 2,
				idx - beginIdx - 2);
			returnValue = setNewMode(requestedModeIndex);
			// Une demande invalide conserve le mode courant et ne dereference
			// jamais le registre avec l'index d'erreur negatif.
			int requestedModeID = requestedModeIndex >= 0
				? modeStruct[requestedModeIndex].modeId
				: currentModeID;
			if(requestedModeID == IFTTTWEATHER) { lastDemo = demo; }
			
			//Handle Shuffle stuff here
			if(requestedModeID == SHUFFLE) { stopDemo = shuffleMode = TRUE; }
			else { stopDemo = shuffleMode = FALSE;  }
			setAuxSwitchState(SHFL, shuffleMode ? TRUE : FALSE);
			
			isNewMode = TRUE;
		}
		else if(commandText[beginIdx] == 'S') {
		    int receivedSpeedValue = 0;
            parseUnsignedText(
                commandText + beginIdx + 2,
                idx - beginIdx - 2,
                0,
                (int)(sizeof(speedPresets) / sizeof(speedPresets[0])) - 1,
                &receivedSpeedValue);
		    if (speedIndex != receivedSpeedValue) {
		        // Listener conserve sa vitesse imposee par le flux reseau.
				if(currentModeID != LISTENER) isNewSpeed = TRUE;
			}
			if(isNewSpeed) {
    			speedIndex = receivedSpeedValue;
    			speed = speedPresets[speedIndex];
				// Persiste le nouvel index de vitesse.
        		EEPROM.write(SPEED_START_ADDR, speedIndex);
			}
		}
		else if(commandText[beginIdx] == 'B') {
		    int brightnessPercent = 0;
            parseUnsignedText(
                commandText + beginIdx + 2,
                idx - beginIdx - 2,
                0,
                100,
                &brightnessPercent);
		    int newBrightness = brightnessPercent * (255 * .01);	// Convertit le pourcentage vers 0 a 255.
			if(brightness != newBrightness) {isNewBrightness = TRUE;}
			if(isNewBrightness) {
			    brightness = newBrightness > 0 ? newBrightness : 1;
				// Persiste la nouvelle luminosite interne.
        		EEPROM.write(BRIGHT_START_ADDR, brightness);
            }
			
			// Applique le plafond electrique du mode apres toute nouvelle valeur.
			checkBrightness();
		}
        else if(commandText[beginIdx] == 'C') {
			isNewColor = TRUE;
            uint32_t parsedColor = 0;
            parseHexText(commandText + beginIdx + 3, 6, &parsedColor);
            switch(commandText[beginIdx+1]) {
                case '1':
                    color1 = parsedColor;
					lastColors[0] = color1;
                    break;
                case '2':
                    color2 = parsedColor;
					lastColors[1] = color2;
                    break;
                case '3':
                    color3 = parsedColor;
					lastColors[2] = color3;
                    break;
                case '4':
                    color4 = parsedColor;
					lastColors[3] = color4;
                    break;
                case '5':
                    color5 = parsedColor;
					lastColors[4] = color5;
                    break;
                case '6':
                    color6 = parsedColor;
					lastColors[5] = color6;
                    break;
            }
		}
		else if(commandText[beginIdx] == 'W') {
		    boundedTextCopyRange(
                message,
                sizeof(message),
                commandText + beginIdx + 2,
                idx - beginIdx - 2);
            isNewText = TRUE;
		}

		// Le type historique T attend 0 ou 1 ; S reste reserve a la vitesse.
		else if(commandText[beginIdx] == 'T') {
            isNewSwitch = TRUE;
            switch(commandText[beginIdx+1]) {
                case '1':
                    switch1 = commandText[beginIdx + 3] == '1';
                    lastSwitchState[0] = switch1;
                    break;
                case '2':
                    switch2 = commandText[beginIdx + 3] == '1';
                    lastSwitchState[1] = switch2;
                    break;
                case '3':
                    switch3 = commandText[beginIdx + 3] == '1';
                    lastSwitchState[2] = switch3;
                    break;
                case '4':
                    switch4 = commandText[beginIdx + 3] == '1';
                    lastSwitchState[3] = switch4;
                    break;
            }
		}
		beginIdx = idx + 1;
		idx = findTextCharacter(
            commandText,
            commandLength,
            ',',
            static_cast<size_t>(beginIdx));
	}

    // EEPROM.put() evite les ecritures lorsque les tableaux sont inchanges.
    if(isNewColor) {EEPROM.put(COLORS_START_ADDR, lastColors);}
    if(isNewSwitch) {EEPROM.put(SWITCHES_START_ADDR, lastSwitchState);}
	
	// Un changement de mode interrompt le rendu, contrairement aux seuls reglages.
    if(isNewMode) {
        run = TRUE;
	    stop = TRUE;
    }
    else {
		// Les reglages seuls actualisent l'affichage sans redemarrer l'animation.
		// Listener reste controle par son flux reseau.
		if(currentModeID != LISTENER) showPixels();
		
		if(isNewBrightness) {
		    lastBrightness = brightness;
			// Retourne le code historique de confirmation de luminosite.
			returnValue = BRIGHTNESS_SET;
		}
		else if(isNewSpeed==true) {
			// Retourne le code historique de confirmation de vitesse.
			returnValue = SPEED_SET;
		}
		else {
			// Signale qu'aucune valeur effective n'a change.
			returnValue = NO_CHANGE;
		}
    }

	// still here, so everything must be fine
	return returnValue;
}


// ----------------------------------------------------------------------------
// Route une commande generique recue depuis un transport quelconque.
//
// Parametres :
// - commandText : debut de l'identifiant et de ses parametres eventuels.
// - commandLength : nombre exact de caracteres disponibles.
//
// Retour :
// - valeur historique de la commande ou code COMMAND_ERROR negatif.
//
// Effet de bord :
// - peut regler l'heure, les switches auxiliaires, les diagnostics ou demander
//   un redemarrage differe.
// ----------------------------------------------------------------------------
int routeCommandFromBuffer(const char* commandText, size_t commandLength) {
    size_t trimmedBegin = findTrimmedTextBegin(commandText, commandLength);
    size_t trimmedEnd = findTrimmedTextEnd(
        commandText,
        commandLength,
        trimmedBegin);
    if(commandText != NULL)
        commandText += trimmedBegin;
    commandLength = trimmedEnd - trimmedBegin;

    if(commandText == NULL || commandLength == 0)
        return COMMAND_ERROR_EMPTY;
    if(commandLength > CLOUD_COMMAND_MAX_LENGTH)
        return COMMAND_ERROR_TOO_LONG;
	int beginIdx = 0;
	int colonIdx = findTextCharacter(commandText, commandLength, ':');

#if L3D_DIAGNOSTICS_ENABLED
    // Conserve les diagnostics sur le routeur historique et deviceInfo.
    if(textRangeEqualsIgnoreAsciiCase(commandText, commandLength, "GETDIAG"))
        return GetDiagnostics(FALSE);
    if(textRangeEqualsIgnoreAsciiCase(commandText, commandLength, "RESETDIAG"))
        return GetDiagnostics(TRUE);
#endif

    if(colonIdx <= 0)
        return COMMAND_ERROR_MALFORMED;
	
	// Set time zone offset
	if(textRangeEqualsIgnoreAsciiCase(commandText, colonIdx, "SETTIMEZONE")) {
		//Expect a string like this: SETTIMEZONE:-6
        int parsedTimeZone = 0;
        if(!parseSignedText(
                commandText + colonIdx + 1,
                commandLength - colonIdx - 1,
                -14,
                14,
                &parsedTimeZone))
            return COMMAND_ERROR_OUT_OF_RANGE;
        timeZone = parsedTimeZone;
        Time.zone(timeZone);
        hour = Time.hour();
        return timeZone;
    }
    else if(textRangeEqualsIgnoreAsciiCase(commandText, colonIdx, "GETSWITCHSTATE")) {
		//Expect a string like this: GETSWITCHSTATE:1
        int id = 0;
        if(!parseUnsignedText(
                commandText + colonIdx + 1,
                commandLength - colonIdx - 1,
                1,
                4,
                &id))
            return COMMAND_ERROR_OUT_OF_RANGE;
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
    else if(textRangeEqualsIgnoreAsciiCase(commandText, colonIdx, "GETCOLOR")) {
		//Expect a string like this: GETCOLOR:1
        int id = 0;
        if(!parseUnsignedText(
                commandText + colonIdx + 1,
                commandLength - colonIdx - 1,
                1,
                6,
                &id))
            return COMMAND_ERROR_OUT_OF_RANGE;
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
	else if(textRangeEqualsIgnoreAsciiCase(commandText, colonIdx, "SETAUXSWITCH")) {
		//Expect a string like this: SETAUXSWITCH:1,0;
		// Chaque segment contient un identifiant et un etat : SwitchID,state;
		beginIdx = colonIdx+1;
		int id = 0;
		int lastUpdateResult = -1;
		while(static_cast<size_t>(beginIdx) < commandLength) {
			int commaIdx = findTextCharacter(
                commandText,
                commandLength,
                ',',
                static_cast<size_t>(beginIdx));
			int semiColonIdx = findTextCharacter(
                commandText,
                commandLength,
                ';',
                static_cast<size_t>(beginIdx));
			if(commaIdx <= beginIdx || semiColonIdx != commaIdx + 2)
				return COMMAND_ERROR_MALFORMED;
			if(!parseUnsignedText(
                    commandText + beginIdx,
                    commaIdx - beginIdx,
                    0,
                    255,
                    &id))
				return COMMAND_ERROR_OUT_OF_RANGE;
			char stateText = commandText[commaIdx + 1];
			if(stateText != '0' && stateText != '1')
				return COMMAND_ERROR_MALFORMED;
			bool state = stateText == '1' ? TRUE : FALSE;
			lastUpdateResult = setAuxSwitchState(id, state);
			if(lastUpdateResult < 0)
				return lastUpdateResult;
			
			beginIdx = semiColonIdx + 1;
		}
		
		return lastUpdateResult;
	}
	else if(textRangeEqualsIgnoreAsciiCase(commandText, colonIdx, "REBOOT")) {
        //System.reset();
        reboot = TRUE;
        stop = TRUE;
        return 1;
    }
	
    return -1;  
 }

// ----------------------------------------------------------------------------
// Met a jour le texte persistant depuis un buffer fixe.
//
// Parametres :
// - text : debut du texte a appliquer.
// - textLength : longueur exacte, inferieure a TEXT_LENGTH.
//
// Retour :
// - un en cas de succes ou COMMAND_ERROR_TOO_LONG si le texte depasse.
//
// Effet de bord :
// - lit puis met a jour la zone de texte dans l'EEPROM si necessaire.
// ----------------------------------------------------------------------------
int setTextFromBuffer(const char* text, size_t textLength) {
    if(text == NULL || textLength >= TEXT_LENGTH)
        return COMMAND_ERROR_TOO_LONG;
    bool isTextSet = FALSE;
    /** DEBUG **/
    //clearEEPROM();  //EEPROM.clear();
    
    // Charge le texte existant avant de comparer la nouvelle valeur.
    EEPROM.get(TEXT_START_ADDR, textInputString);
    textInputString[TEXT_LENGTH - 1] = '\0';
    for(int i=0; i<TEXT_LENGTH; i++) {
        if(textInputString[i] != 0xFF) {
            isTextSet = TRUE;
            break;
        }
    }
    if(isTextSet) {
        size_t storedLength = strnlen(textInputString, sizeof(textInputString));
        if(textLength > 0 &&
           (storedLength != textLength || memcmp(textInputString, text, textLength) != 0)) {
            boundedTextCopyRange(
                textInputString,
                sizeof(textInputString),
                text,
                textLength);
            // Persiste uniquement lorsque le contenu a change.
            EEPROM.put(TEXT_START_ADDR, textInputString);
        }
    }
    else {
        boundedTextCopyRange(
            textInputString,
            sizeof(textInputString),
            text,
            textLength);
        // Initialise la zone EEPROM encore vierge.
        EEPROM.put(TEXT_START_ADDR, textInputString);
    }
	return 1;
}

// ----------------------------------------------------------------------------
// Active un mode a partir de son index valide dans `modeStruct`.
//
// Parametres :
// - newModeIndex : index du mode a activer.
//
// Retour :
// - index applique, erreur de borne ou absence de programme bytecode persistant.
//
// Effet de bord :
// - quitte l'ancien mode, met a jour l'EEPROM et les diagnostics, puis initialise
//   entierement le nouvel etat avant sa premiere frame.
// ----------------------------------------------------------------------------
int setNewMode(int newModeIndex) {
    //sprintf(debug,"%i", newModeIndex);
    if(newModeIndex < 0 || newModeIndex >= (int)(sizeof(modeStruct) / sizeof(modeStruct[0])))
        return COMMAND_ERROR_OUT_OF_RANGE;

#if L3D_BYTECODE_ENABLED
    if(modeStruct[newModeIndex].modeId == BYTECODE) {
        BytecodeStorageStatus bytecodeStatus = {};
        const int16_t storageResult = bytecodeStorageInspect(&bytecodeStatus);
        if(storageResult != BYTECODE_SUCCESS)
            return storageResult;
        if(!bytecodeStatus.installed)
            return BYTECODE_ERROR_NO_PROGRAM;
    }
#endif

    if(animationSchedulerDeferModeChange(newModeIndex))
        return newModeIndex;

    // CubePainter et Listener ne doivent pas etre interrompus par une alerte IFTTT.
    if((currentModeID == CUBE_PAINTER || currentModeID == LISTENER) && modeStruct[newModeIndex].modeId == IFTTTWEATHER) 
        return getModeIndexFromID(currentModeID);
    
    if(currentModeID != IFTTTWEATHER && currentModeID != STANDBY && currentModeID != STREAM
#if L3D_BYTECODE_ENABLED
       && currentModeID != BYTECODE
#endif
    )
        previousModeID = currentModeID;

    int oldModeID = currentModeID;
    animationExit(oldModeID);
    currentModeID = modeStruct[newModeIndex].modeId;
	if(currentModeID != oldModeID)
		diagnosticsModeChanged(currentModeID);
			
    // Persiste uniquement les modes utilisateur durables.
    if(currentModeID != IFTTTWEATHER && currentModeID != STANDBY && currentModeID != STREAM
#if L3D_BYTECODE_ENABLED
       && currentModeID != BYTECODE
#endif
    )
        EEPROM.write(LASTMODE_START_ADDR, currentModeID);
    
    boundedTextCopy(currentModeName, sizeof(currentModeName), modeStruct[newModeIndex].modeName);
	animationEnter(currentModeID);

	return newModeIndex;
}

// ----------------------------------------------------------------------------
// Recherche un mode depuis une tranche de texte non terminee.
//
// Parametres :
// - name : debut du nom historique a rechercher.
// - nameLength : longueur exacte du nom.
//
// Retour :
// - index dans modeStruct ou moins un lorsque le nom est inconnu.
// ----------------------------------------------------------------------------
int getModeIndexFromName(const char* name, size_t nameLength) {
    for(int i=0;i<(int)(sizeof modeStruct / sizeof modeStruct[0]); i++) {
        if(textRangeEquals(name, nameLength, modeStruct[i].modeName))
            return i;
    }
    return -1;
}

// ----------------------------------------------------------------------------
// Recherche un mode depuis son identifiant historique.
//
// Parametres :
// - id : identifiant historique recherche.
//
// Retour :
// - index dans modeStruct ou moins un lorsque l'identifiant est inconnu.
// ----------------------------------------------------------------------------
int getModeIndexFromID(int id) {
    for(int i=0; i<(int)(sizeof modeStruct / sizeof modeStruct[0]); i++) {
        if(id == modeStruct[i].modeId)
            return i;
    }
    return -1;
}

// ----------------------------------------------------------------------------
// Recherche un switch auxiliaire depuis son identifiant historique.
//
// Parametres :
// - id : identifiant du switch auxiliaire recherche.
//
// Retour :
// - index dans auxSwitchStruct ou moins un lorsque l'identifiant est inconnu.
// ----------------------------------------------------------------------------
int getAuxSwitchIndexFromID(int id) {
    for(uint16_t i=0;i<(int)(sizeof auxSwitchStruct / sizeof auxSwitchStruct[0]);i++) {
        if(id == auxSwitchStruct[i].auxSwitchId) {
            return i;
        }
    }
    return -1;
}

// ----------------------------------------------------------------------------
// Plafonne la luminosite selon la consommation maximale du mode courant.
//
// Effet de bord :
// - reduit brightness pour proteger l'alimentation des modes les plus denses.
// ----------------------------------------------------------------------------
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
		case TRANQUILITY:
		case GYROPHARE_FR:
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
	
	// PacMan conserve son minimum historique pour rester visible.
	if(currentModeID == PUCKDUDE && brightness < 70)
		brightness  = 70;
	
	if (brightness > maxBright)
		brightness = maxBright;
}

#endif
