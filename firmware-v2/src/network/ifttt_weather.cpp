#ifdef L3D_UNITY_BUILD

void iftttWeather(uint32_t c) {
    unsigned long calculatedInterval;
    unsigned long iftttWeatherInterval = 10*60*1000;    //Revert back to last mode for IFTTT Weather
    
    //If we're displaying text, configure the interval individually
    if(isNewText) {
        switch(whichTextMode) {
            case 0:
                calculatedInterval = iftttWeatherInterval * .2;
                break;
            case 1:
                calculatedInterval = iftttWeatherInterval * .3;
                break;
        }
    }
    else {calculatedInterval = iftttWeatherInterval;}
    
    if((millis() - lastCommandReceived) < calculatedInterval) {
        if(isNewText) {
            background(black);
            
            //(largest_item - smallest_item) maps to (max-min)
            float ratio = (.5 - .05)/((120*.05) - .05);
            //(min + ratio*(value-smallest_item))
            float speedFactor = .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
            pos += speedFactor;

            switch(whichTextMode) {
                case 0:
                    //Can't call textMarquee(col, 0) wrapper directly, due to conflicts with switches 2 and 3
                    marquee(message, pos, getColorFromInteger(c));
                    if (pos >= (SIDE*map(strlen(message), 1, 63, 4, SIDE))+(strlen(message))*8)
                        pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
                    break;
                case 1:
                    //Can't call textScroll(col, 0) wrapper directly, due to conflicts with switches 2 and 3
                    scrollText(message, Point(pos - strlen(message), 0, 6), getColorFromInteger(c));
                    if (pos >= (SIDE*map(strlen(message), 1, 63, 1, SIDE))+(strlen(message))*8)
                        pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
                    break;

            }
            showPixels();
        	if(stop || stopDemo) {return;}
        }
        else {
            switch1 = FALSE;
            pulse_oneColorAll(c);
        }
    }
    else {
        if(isNewText) {
	    whichTextMode = (whichTextMode+1)%2; 
            //whichTextMode++;
            //if(whichTextMode > 2) {whichTextMode = 0;}
            isNewText = FALSE;
        }
        brightness = lastBrightness;
        switch1 = lastSwitchState[0];
        demo = lastDemo;    // restore demo state
        currentModeID = previousModeID;
        setNewMode(getModeIndexFromID(currentModeID));
    }
    run = true;
}

/**
 * Source Credit: http://www.instructables.com/id/Led-Cube-8x8x8/
 * Ported by Kevin Carlborg
 * Some standard cube visuals as seen on you tube
 * stackingRope by Kevin Carlborg
 * mode == 0 : run All
 * mode == 1 : run Single
 */

#endif
