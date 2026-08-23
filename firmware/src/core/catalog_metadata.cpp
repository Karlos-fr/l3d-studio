#ifdef L3D_UNITY_BUILD

// ============================================================================
// CatalogMetadata - Construction bornee des catalogues LAN
// ----------------------------------------------------------------------------
// Ce module assemble les listes de modes et de switches servies par le LAN. Il ne
// modifie pas le protocole de commande ni le rendu des animations.
// ============================================================================

// ----------------------------------------------------------------------------
// Construit les listes compactes des modes et de leurs parametres.
//
// Effet de bord :
// - remplit `modeNameList`, `modeParamList` et `debug` avec des ecritures
//   bornees.
// ----------------------------------------------------------------------------
void makeModeList(void) {
    for(int i=0; i<sizeof modeStruct / sizeof modeStruct[0]; i++) {
#if L3D_BYTECODE_ENABLED
        // Le format compact est deja proche de sa limite de 621 octets.
        // La phase 4 publiera ce mode installable par son API LAN dediee.
        if(modeStruct[i].modeId == BYTECODE)
            continue;
#endif
        char cNameBuff[20];
		char cParamBuff[60];
		if(boundedTextFormat(cNameBuff, sizeof(cNameBuff), "%s;", modeStruct[i].modeName) &&
           boundedTextAppend(modeNameList, sizeof(modeNameList), cNameBuff)) {
		}
		else {
		    boundedTextCopy(debug, sizeof(debug), "Error: modeNameList has reached max size limit");
		}
		
		if(modeStruct[i].numOfColors==0 && modeStruct[i].numOfSwitches==0 && modeStruct[i].textInput == FALSE) {
		    if(isThereEnoughRoomInModeParamList(2)) {
			    boundedTextAppend(modeParamList, sizeof(modeParamList), "N;");
		    } else { return; }
		}
		else {
			if(modeStruct[i].numOfColors > 0) {
				// Nombre de couleurs borné sans modifier la table désormais en flash.
				const uint8_t colorCount = modeStruct[i].numOfColors > MAX_NUM_COLORS
					? MAX_NUM_COLORS
					: modeStruct[i].numOfColors;
				if(isThereEnoughRoomInModeParamList(4)) {
				    boundedTextFormat(cParamBuff, sizeof(cParamBuff), "C:%i", colorCount);
				    boundedTextAppend(modeParamList, sizeof(modeParamList), cParamBuff);
				    if(modeStruct[i].numOfSwitches == 0 && modeStruct[i].textInput == FALSE) {
					    boundedTextAppend(modeParamList, sizeof(modeParamList), ";");
				    } else { boundedTextAppend(modeParamList, sizeof(modeParamList), ","); }
				} else { return; }
			}
			if(modeStruct[i].numOfSwitches > 0) {
			    int switchTitleStructIdx = getSwitchTitleStructIndex(modeStruct[i].modeId);
				if(switchTitleStructIdx != -1) {
					// Nombre de switches borné sans modifier la table désormais en flash.
					const uint8_t switchCount = modeStruct[i].numOfSwitches > MAX_NUM_SWITCHES
						? MAX_NUM_SWITCHES
						: modeStruct[i].numOfSwitches;
					if(switchCount >= 1) {
					    boundedTextFormat(cParamBuff, sizeof(cParamBuff), "S:%i,\"%s\"", switchCount, switchTitleStruct[switchTitleStructIdx].switch1Title);
                        //consider this instead: strncat(modeParamList,cParamBuff,MAX_PUBLISHED_STRING_SIZE-strlen(modeParamList)-1);
                        if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
						    boundedTextAppend(modeParamList, sizeof(modeParamList), cParamBuff);
                        } else { return; }
    				}
					if(switchCount >= 2) {
					    boundedTextFormat(cParamBuff, sizeof(cParamBuff), "\"%s\"", switchTitleStruct[switchTitleStructIdx].switch2Title);
    					if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
						    boundedTextAppend(modeParamList, sizeof(modeParamList), cParamBuff);
    					} else { return; }
    				}
					if(switchCount >= 3) {
					    boundedTextFormat(cParamBuff, sizeof(cParamBuff), "\"%s\"", switchTitleStruct[switchTitleStructIdx].switch3Title);
    					if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
						    boundedTextAppend(modeParamList, sizeof(modeParamList), cParamBuff);
    					} else { return; }
    				}
					if(switchCount >= 4) {
					    boundedTextFormat(cParamBuff, sizeof(cParamBuff), "\"%s\"", switchTitleStruct[switchTitleStructIdx].switch4Title);
    					if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
                            boundedTextAppend(modeParamList, sizeof(modeParamList), cParamBuff);
    					} else { return; }
    				}
    			    if(modeStruct[i].textInput == FALSE) {
					    boundedTextAppend(modeParamList, sizeof(modeParamList), ";");
				    }
				    else { boundedTextAppend(modeParamList, sizeof(modeParamList), ","); }
                } else {
				    boundedTextCopy(cParamBuff, sizeof(cParamBuff), "S:E;");
                    if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
                       boundedTextAppend(modeParamList, sizeof(modeParamList), cParamBuff);
                    } else { return; }
			    }
			}
			if(modeStruct[i].textInput == TRUE) {
			    if(isThereEnoughRoomInModeParamList(3)) {
				    boundedTextAppend(modeParamList, sizeof(modeParamList), "T:;");
			    } else { return; }
			}
		} 
    }
}

// ----------------------------------------------------------------------------
// Verifie la place restante avant un ajout dans `modeParamList`.
//
// Parametres :
// - textSize : nombre d'octets a ajouter, hors terminaison finale.
//
// Retour :
// - vrai si l'ajout tient, faux lorsque la liste doit etre terminee.
//
// Effet de bord :
// - remplace si necessaire le dernier separateur valide par un point-virgule.
// ----------------------------------------------------------------------------
bool isThereEnoughRoomInModeParamList(int textSize) {
    if(strlen(modeParamList) + textSize + 1 <= MAX_PUBLISHED_STRING_SIZE) {
        return true;
    }
    int idx = strlen(modeParamList)-1;
	while(modeParamList[idx] != ',' && modeParamList[idx] != ';') {
		idx--;
	}
	modeParamList[idx] = ';';
    boundedTextCopy(debug, sizeof(debug), "Error: modeParamList has reached max size limit");
    return false;
}

// ----------------------------------------------------------------------------
// Recherche les titres de switches associes a un ID de mode.
//
// Parametres :
// - modeId : ID historique du mode.
//
// Retour :
// - index trouve ou moins un si les titres sont absents.
// ----------------------------------------------------------------------------
int getSwitchTitleStructIndex(int modeId) {
    uint16_t i;
    for(i=0;i<sizeof switchTitleStruct / sizeof switchTitleStruct[0];i++) {
        if(switchTitleStruct[i].modeId == modeId)
            return i;
    }
    boundedTextFormat(debug, sizeof(debug), "Error: Missing Switch Titles for mode %s", modeStruct[getModeIndexFromID(modeId)].modeName);
    return -1;
}

// Uses the auxSwitchStruct to assemble the cloud attainable auxSwtchList variable
// Switch param order: "id,title,onName,offName,switchState;"
// ----------------------------------------------------------------------------
// Construit la liste Cloud des switches auxiliaires.
//
// Effet de bord :
// - lit leurs etats EEPROM, actualise les variables runtime et remplit
//   `auxSwitchList` avec des ecritures bornees.
// ----------------------------------------------------------------------------
void makeAuxSwitchList(void) {
    boundedTextClear(auxSwitchList, sizeof(auxSwitchList));
    for(uint16_t i=0;i<sizeof auxSwitchStruct / sizeof auxSwitchStruct[0];i++) {
        // Update Aux Switch states from EEPROM
        int START_ADDRESS = AUXSW_START_ADDR + (auxSwitchStruct[i].auxSwitchId * (sizeof(uint8_t) + 1));
        if(EEPROM.length() >= (START_ADDRESS + sizeof(uint8_t))) {
            uint8_t state = EEPROM.read(START_ADDRESS);
            if(state != 0xFF)
                auxSwitchStruct[i].auxSwitchState = (state == 1 ? TRUE : FALSE);
        }
        
        char cNameBuff[62];
		if(strlen(auxSwitchList)+strlen(auxSwitchStruct[i].auxSwitchTitle)+strlen(auxSwitchStruct[i].auxSwitchOnName)+strlen(auxSwitchStruct[i].auxSwitchOffName)+9 <= MAX_PUBLISHED_STRING_SIZE) {
            boundedTextFormat(cNameBuff, sizeof(cNameBuff), "%i,%s,%s,%s,%i;", auxSwitchStruct[i].auxSwitchId,
                                                auxSwitchStruct[i].auxSwitchTitle,
                                                auxSwitchStruct[i].auxSwitchOnName,
                                                auxSwitchStruct[i].auxSwitchOffName,
                                                auxSwitchStruct[i].auxSwitchState ? 1 : 0 );
		    boundedTextAppend(auxSwitchList, sizeof(auxSwitchList), cNameBuff);
		}
		else {
		    boundedTextCopy(debug, sizeof(debug), "Error: auxSwitchList has reached max size limit");
		}

		// Update local Aux Switch variables
		if(-1 == updateAuxSwitches(auxSwitchStruct[i].auxSwitchId))
		    boundedTextFormat(debug, sizeof(debug), "Error: auxSwitch %s failed to update local variable", auxSwitchStruct[i].auxSwitchTitle);
	}
}

/** Update local Aux Switch variables
 *  @id the Aux Switch ID to update
 *  @return current state of the switch (0 or 1)
 *  @return -1 if Switch ID was not found
 */
int updateAuxSwitches(int id) {
    switch(id) {
        case ASO:
            return autoShutOff = auxSwitchStruct[getAuxSwitchIndexFromID(id)].auxSwitchState;
        case RLM:
            return rememberLastMode = auxSwitchStruct[getAuxSwitchIndexFromID(id)].auxSwitchState;
	case SHFL:
		shuffleMode = auxSwitchStruct[getAuxSwitchIndexFromID(id)].auxSwitchState;
		run = TRUE;
		if(shuffleMode) { stopDemo = TRUE; resetShuffleMode();}
		else if( demoTimer.isActive()) { demoTimer.stop(); }
	    return shuffleMode;
    }
    return -1;
}


char* getWeekDay(void) {
  	int weekDay = Time.weekday();   
  	
  	switch(weekDay) {
  		case 1: return "Sun";
  		case 2: return "Mon";
  		case 3: return "Tue";
  		case 4: return "Wed";
  		case 5: return "Thu";
  		case 6: return "Fri";
  		case 7: return "Sat";
  	}
  	return "Not Found";
  }

  char* getMonth(void) {
  	int month = Time.month();
  	
  	switch(month) {
  		case 1: return "Jan";
  		case 2: return "Feb";
  		case 3: return "Mar";
  		case 4: return "Apr";
  		case 5: return "May";
  		case 6: return "Jun";
  		case 7: return "Jul";
  		case 8: return "Aug";
  		case 9: return "Sep";
  		case 10: return "Oct";
  		case 11: return "Nov";
  		case 12: return "Dec";
  	}
	return "Not Found";
  }


//delay (or speed) is global 

#endif
