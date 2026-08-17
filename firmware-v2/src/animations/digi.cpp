#ifdef L3D_UNITY_BUILD

void digi(uint32_t col) {
    uint16_t i; 
    uint32_t nextCol;
    
    nextCol = switch1? colorWheel+=8 : col;
    
    if(0 == randomPixelFill(nextCol)) { return; }	//Populate the cube
	delay(400);
    if(0 == randomPixelFill(0x0)) { return; }		//Kill off the voxels
	
    run = TRUE;
}

/**
 * digi() helper function
 * Randomly fills the whole strip with a selected color or a random color
 * @param c: Next Color to populate
 * @switch1 = Random Color Fill: Ignore the passed color and choose random colors for each pixel
 */
int randomPixelFill(uint32_t c) {
    uint16_t i; 
    uint32_t pulseRate;
    int pixelFillOrder[strip.numPixels()];
    
    for(i=0; i<strip.numPixels(); i++) {
        pixelFillOrder[i]=i;
    }
    
    arrayShuffle(pixelFillOrder, sizeof pixelFillOrder / sizeof pixelFillOrder[0]);
    
    for(i=0; i<strip.numPixels(); i++) {
        if(stop || stopDemo) {return 0;}
        if(switch2 && c != 0x0) {c = Wheel(random(256));}
        if(switch3) {
            fadeInToColor(pixelFillOrder[i], getColorFromInteger(c));    //transitionOne(getColorFromInteger(c),pixelFillOrder[i],POLAR);
        }
        else {
            strip.setPixelColor(pixelFillOrder[i], c);
            showPixels();
            delay(speed);
        }
    }
    return 1;
}

#endif
