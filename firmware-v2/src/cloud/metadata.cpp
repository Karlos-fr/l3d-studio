#ifdef L3D_UNITY_BUILD

void makeModeList(void) {
    for(int i=0; i<sizeof modeStruct / sizeof modeStruct[0]; i++) {
        char cNameBuff[20];
		char cParamBuff[60];
		if(strlen(modeNameList)+strlen(modeStruct[i].modeName)+1 <= MAX_PUBLISHED_STRING_SIZE) {
            sprintf(cNameBuff,"%s;",modeStruct[i].modeName );
		    strcat(modeNameList,cNameBuff);
		}
		else {
		    sprintf(debug,"Error: modeNameList has reached max size limit");
		}
		
		if(modeStruct[i].numOfColors==0 && modeStruct[i].numOfSwitches==0 && modeStruct[i].textInput == FALSE) {
		    if(isThereEnoughRoomInModeParamList(2)) {
			    strcat(modeParamList,"N;");
		    } else { return; }
		}
		else {
			if(modeStruct[i].numOfColors > 0) {
				if(modeStruct[i].numOfColors > MAX_NUM_COLORS) {
					modeStruct[i].numOfColors = MAX_NUM_COLORS;
				}
				if(isThereEnoughRoomInModeParamList(4)) {
    				sprintf(cParamBuff,"C:%i",modeStruct[i].numOfColors);
    				strcat(modeParamList,cParamBuff);
    				if(modeStruct[i].numOfSwitches == 0 && modeStruct[i].textInput == FALSE) {
    					strcat(modeParamList,";");
    				} else { strcat(modeParamList,","); }
				} else { return; }
			}
			if(modeStruct[i].numOfSwitches > 0) {
			    int switchTitleStructIdx = getSwitchTitleStructIndex(modeStruct[i].modeId);
			    if(switchTitleStructIdx != -1) {
    				if(modeStruct[i].numOfSwitches > MAX_NUM_SWITCHES) {
    					modeStruct[i].numOfSwitches = MAX_NUM_SWITCHES;
    				}
    				if(modeStruct[i].numOfSwitches >= 1) {
    					sprintf(cParamBuff,"S:%i,\"%s\"",modeStruct[i].numOfSwitches,switchTitleStruct[switchTitleStructIdx].switch1Title);
                        //consider this instead: strncat(modeParamList,cParamBuff,MAX_PUBLISHED_STRING_SIZE-strlen(modeParamList)-1);
                        if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
    					    strcat(modeParamList,cParamBuff);
                        } else { return; }
    				}
    				if(modeStruct[i].numOfSwitches >= 2) {
    					sprintf(cParamBuff,"\"%s\"",switchTitleStruct[switchTitleStructIdx].switch2Title);
    					if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
    					    strcat(modeParamList,cParamBuff);
    					} else { return; }
    				}
    				if(modeStruct[i].numOfSwitches >= 3) {
    					sprintf(cParamBuff,"\"%s\"",switchTitleStruct[switchTitleStructIdx].switch3Title);
    					if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
    					    strcat(modeParamList,cParamBuff);
    					} else { return; }
    				}
    				if(modeStruct[i].numOfSwitches >= 4) {
    					sprintf(cParamBuff,"\"%s\"",switchTitleStruct[switchTitleStructIdx].switch4Title);
    					if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
                            strcat(modeParamList,cParamBuff);
    					} else { return; }
    				}
    			    if(modeStruct[i].textInput == FALSE) {
    					strcat(modeParamList,";");
    				}
    				else { strcat(modeParamList,","); }
                } else {
                    sprintf(cParamBuff,"S:E;");
                    if(isThereEnoughRoomInModeParamList(strlen(cParamBuff)+1)) {
                       strcat(modeParamList,cParamBuff);
                    } else { return; }
			    }
			}
			if(modeStruct[i].textInput == TRUE) {
			    if(isThereEnoughRoomInModeParamList(3)) {
				    strcat(modeParamList,"T:;");
			    } else { return; }
			}
		} 
    }
}

bool isThereEnoughRoomInModeParamList(int textSize) {
    if(strlen(modeParamList) + textSize + 1 <= MAX_PUBLISHED_STRING_SIZE) {
        return true;
    }
    int idx = strlen(modeParamList)-1;
	while(modeParamList[idx] != ',' && modeParamList[idx] != ';') {
		idx--;
	}
	modeParamList[idx] = ';';
    sprintf(debug,"Error: modeParamList has reached max size limit");
    return false;
}

int getSwitchTitleStructIndex(int modeId) {
    uint16_t i;
    for(i=0;i<sizeof switchTitleStruct / sizeof switchTitleStruct[0];i++) {
        if(switchTitleStruct[i].modeId == modeId)
            return i;
    }
    sprintf(debug,"Error: Missing Switch Titles for mode %s", modeStruct[getModeIndexFromID(modeId)].modeName);
    return -1;
}

// Uses the auxSwitchStruct to assemble the cloud attainable auxSwtchList variable
// Switch param order: "id,title,onName,offName,switchState;"
void makeAuxSwitchList(void) {
    sprintf(auxSwitchList,"");
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
            sprintf(cNameBuff,"%i,%s,%s,%s,%i;",auxSwitchStruct[i].auxSwitchId,
                                                auxSwitchStruct[i].auxSwitchTitle,
                                                auxSwitchStruct[i].auxSwitchOnName,
                                                auxSwitchStruct[i].auxSwitchOffName,
                                                auxSwitchStruct[i].auxSwitchState ? 1 : 0 );
		    strcat(auxSwitchList,cNameBuff);
		}
		else {
		    sprintf(debug,"Error: auxSwitchList has reached max size limit");
		}

		// Update local Aux Switch variables
		if(-1 == updateAuxSwitches(auxSwitchStruct[i].auxSwitchId))
		    sprintf(debug,"Error: auxSwitch %s failed to update local variable", auxSwitchStruct[i].auxSwitchTitle);
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


void makeDeviceInfo(void) {
  	char cBuff[60];
  	
  	IPAddress myIp = WiFi.localIP();
  	sprintf(deviceInfo,"Local IP Address:\"%d.%d.%d.%d\",",myIp[0], myIp[1], myIp[2], myIp[3]);

  	sprintf(cBuff,"SSID:\"%s\",",WiFi.SSID());
  	strcat(deviceInfo,cBuff);

  	sprintf(cBuff,"WiFi Strength:\"%i\",",WiFi.RSSI());
  	strcat(deviceInfo,cBuff);

  	sprintf(cBuff,"Firmware ID:\"%s\",",BUILD_FILE_NAME);
  	strcat(deviceInfo,cBuff);
  	
  	sprintf(cBuff,"Firmware Rev:\"%s\",",BUILD_REVISION);
  	strcat(deviceInfo,cBuff);
  		
  	sprintf(cBuff,"Particle Build Version:\"%s\",",System.version().c_str());
  	strcat(deviceInfo,cBuff);
  	
  	sprintf(cBuff,"Free Memory (bytes):\"%i\",",System.freeMemory());
  	strcat(deviceInfo,cBuff);
  	
  	sprintf(cBuff,"Current Time On Device:\"%i:%i:%i %s %s %i %i\",",Time.hour(),Time.minute(),Time.second(),getWeekDay(),getMonth(),Time.day(),Time.year());
  	//sprintf(cBuff,"Current Time On Device:\"%s\",",Time.timeStr().c_str());
  	strcat(deviceInfo,cBuff);
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
