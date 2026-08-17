#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Fait evoluer simultanement les 512 pixels vers une couleur cible.
//
// Parametres :
// - endColor : couleur atteinte a la derniere etape.
// - method : courbe LINEAR ou POLAR utilisee par l'interpolation historique.
//
// Effet de bord :
// - utilise temporairement `drawingBuffer`, affiche huit etapes et traite les
//   evenements Particle entre les affichages.
// ----------------------------------------------------------------------------
void transitionAll(Color endColor, uint16_t method) {
    int numSteps = 8;
    //run = FALSE;

    // Le buffer RGB persistant de CubePainter sert ici de scratch. Cette duree
    // de vie exclusive retire 2 048 octets de la pile sans second framebuffer.
    // CubePainter recharge ensuite son contenu depuis l'EEPROM a son entree.
    for(int index = 0; index < strip.numPixels(); index++) {
        Color startColor = getColorFromInteger(strip.getPixelColor(index));
        int offset = index * BPP;
        drawingBuffer[offset] = startColor.red;
        drawingBuffer[offset + 1] = startColor.green;
        drawingBuffer[offset + 2] = startColor.blue;
    }

    for(int i=1; i<=numSteps; i++) {
        for(int index = 0; index < strip.numPixels(); index++) {
            int offset = index * BPP;
            Color startColor = Color(
                drawingBuffer[offset],
                drawingBuffer[offset + 1],
                drawingBuffer[offset + 2]);
            transitionHelper(startColor, endColor, index, method, numSteps, i);
            if(stop || stopDemo) {return;}
        }
        showPixels();
        delay(speed);
    }
}

//Same as transitionAll but only for one pixel
void transitionOne(Color endColor, uint16_t index, uint16_t method) {
    int numSteps = 8;
    Color startColor = getColorFromInteger(strip.getPixelColor(index));

    for(int i=1; i<=numSteps; i++) {
        transitionHelper(startColor, endColor, index, method, numSteps, i);
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
}

//Used to set the next color step for transitionAll and transitionOne
void transitionHelper(Color startColor, Color endColor, uint16_t index, uint16_t method, int16_t numSteps, int16_t step) {
    Color col2;

    //Find the step
    int16_t redStep   = getTransitionStep(startColor, endColor, method, numSteps, step, RED);
    int16_t greenStep = getTransitionStep(startColor, endColor, method, numSteps, step, GREEN);
    int16_t blueStep  = getTransitionStep(startColor, endColor, method, numSteps, step, BLUE);

    //Add the increment to get the next color segments
    //If new color is a higher value, set the high clamp to the new color
    //If new color is a smaller value, set the low clamp to the new color
    if(endColor.red   > startColor.red)   col2.red   = clamp(startColor.red   + redStep,  0,             endColor.red);
	else                                  col2.red   = clamp(startColor.red   + redStep,  endColor.red,  0xFF);
	if(endColor.green > startColor.green) col2.green = clamp(startColor.green + greenStep,0,             endColor.green);
	else                                  col2.green = clamp(startColor.green + greenStep,endColor.green,0xFF);
	if(endColor.blue  > startColor.blue)  col2.blue  = clamp(startColor.blue  + blueStep, 0,             endColor.blue);
	else                                  col2.blue  = clamp(startColor.blue  + blueStep, endColor.blue, 0xFF);
	
    //Let's make sure we hit the target
    if(step == numSteps) {
        col2.red   = endColor.red;
        col2.green = endColor.green;
        col2.blue  = endColor.blue;
    }
    
    strip.setPixelColor(index, strip.Color(col2.red, col2.green, col2.blue));
}

//Used to get the next color step for transitionHelper()
int16_t getTransitionStep(Color startColor, Color endColor, uint16_t method, int16_t numSteps, int16_t step, uint8_t whichColor) {
	int16_t increment=0;

    if(method == LINEAR) {
        if(whichColor == RED)        increment = (step * (endColor.red-startColor.red))     / numSteps;
        else if(whichColor == GREEN) increment = (step * (endColor.green-startColor.green)) / numSteps;
        else if(whichColor == BLUE)  increment = (step * (endColor.blue-startColor.blue))   / numSteps;
    }
	else { // Not Quite POLAR     
	    if(whichColor == RED) {
	        if(endColor.red < startColor.red)
	            increment = sqrt(float(step)/numSteps) * float(endColor.red-startColor.red);
	        else
	            increment = (float(step)/numSteps) * (float(step)/numSteps) * float(endColor.red-startColor.red);
	    }
	    else if(whichColor == GREEN) {
	        if(endColor.green < startColor.green)
	            increment = sqrt(float(step)/numSteps) * float(endColor.green-startColor.green);
	        else
	            increment = (float(step)/numSteps) * (float(step)/numSteps) * float(endColor.green-startColor.green);
	    }
	    else if(whichColor == BLUE) {
	        if(endColor.blue < startColor.blue)
	            increment = sqrt(float(step)/numSteps) * float(endColor.blue-startColor.blue);
	        else 
	            increment = (float(step)/numSteps) * (float(step)/numSteps) * float(endColor.blue-startColor.blue);
	    }
	}

    return increment;
}

//Used to make smooth transitions between colors; we give it the color we
//want to get to, and it figures out how to make it happen by estimating the
//maximum color level achievable from the given color (if that makes sense)
// @loop: always FALSE when fading IN to a color; TRUE when fading to black.
void transition(Color bgcolor, bool loop) {
    uint32_t maxColorPixel = getHighestValFromRGB(bgcolor);
    uint32_t top = maxColorPixel > 0 ? maxColorPixel : 0xFF;
    Color col2;
    run = loop;
    
    for(int i=0; i<=top; i+=top*.125) {
        for(int index = 0; index < strip.numPixels(); index++) {
            if(maxColorPixel > 0) {
                //Fade in to color
                if(i < bgcolor.red) col2.red = i;
                if(i < bgcolor.green) col2.green = i;
                if(i < bgcolor.blue) col2.blue = i;
            }
            else {
                //Fade out from color
                col2 = getPixelColor(index);
                if(col2.red > 0) col2.red -= col2.red*.125;
                if(col2.green > 0) col2.green -= col2.green*.125;
                if(col2.blue > 0) col2.blue -= col2.blue*.125;
            }
            strip.setPixelColor(index, strip.Color(col2.red, col2.green, col2.blue));
        }
        if(stop) {demo = FALSE; return;}
        showPixels();
        delay(speed);
    }
}

///Fade all pixels to black. Or should it be called fade to off
/*void fadeToBlack(void) {
    uint16_t tryCount = 0;
    bool didWeFindAVoxelStillOn;
    //Fade any voxels still lit
    do {
        didWeFindAVoxelStillOn = FALSE;
        for(int idx = 0; idx < PIXEL_CNT; idx++) {
            if(strip.getPixelColor(idx) > 0) {
                transition(black, true);
                didWeFindAVoxelStillOn = TRUE;
            }
        }
        tryCount++;
    }while(tryCount<6 && didWeFindAVoxelStillOn);
}*/

/** Set the entire cube to one color.
  @param col The color to set all LEDs in the cube to.
*/
void background(Color col) {
    for(int index = 0; index < strip.numPixels(); index++)
        strip.setPixelColor(index, strip.Color(col.red, col.green, col.blue));
}

//Used in all modes to set the brightness, show the lights, process Spark events and delay
int showPixels(void) {
	strip.setBrightness(brightness);
    strip.show();
    Particle.process();    //process Spark events
	return 1;
}

#endif
