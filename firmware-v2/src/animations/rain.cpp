#ifdef L3D_UNITY_BUILD

void rain(uint32_t c) {
    Color col;
    int speedfactor = 3;    //increase the delay time
    run = TRUE;
    
    //In case we don't have blank playing field yet, make it blank
    /*if(isFirstLap) {
        transitionAll(black, LINEAR);    //fadeToBlack();
        isFirstLap = FALSE;
    }*/
	
    //First lets move any drops that exist
    //Start at the bottom and look up each y-axis column
    for(int x=0;x<SIDE;x++) {
        for(int z=0;z<SIDE;z++) {
            for(int y=0;y<SIDE;y++) {
                Color pixelColor = getPixelColor(x,y,z);
                if(pixelColor != black) {
                    //We found a color!
                    int tailEndPosition=y+2;    
                    float firstScaledFactor = switch2 ? 1 : 0.5;    //faded tail scaling
                    float secondScaledFactor = switch2 ? 1 : 0.125;  //faded tail scaling
                    if(!switch2) {
                        if(y==0) {
                            //If we are at the bottom lets diminish the tail properly by finding it's end position
                            for(int d=0;d<SIDE;d++) {
                                if(getPixelColor(x,d,z) == black) {
                                    tailEndPosition = d-1;
                                    break;
                                }
                            }
                        }
                    }
                    if(tailEndPosition>=2) {
                        setPixelColor(x,y-1,z,pixelColor);
                        setPixelColor(x,y  ,z,fadeColor(pixelColor,firstScaledFactor));
                        setPixelColor(x,y+1,z,fadeColor(pixelColor,secondScaledFactor)); 
                    } else if(tailEndPosition==1) {
                        setPixelColor(x,y  ,z,fadeColor(pixelColor,secondScaledFactor/firstScaledFactor));
                    }
                    setPixelColor(x,tailEndPosition,z,((switch2 || switch3) ? pixelColor : black));   //setPixelColor(x,tailEndPosition,z,black);
                    y=tailEndPosition; //Lets look for another rain drop above this one
                }
            }
        }
    }
    
    // Do we want some lightning to go with the rain? ;-)
    if(switch4) {
        lastLightningInterval = lightningInterval;
        if(millis() - lastLightning >= lightningInterval) {
            lastLightning = millis();
            srand(lastLightning);
            do {
                lightningInterval = oneMinuteInterval / random(24, 76);
            }while(lastLightningInterval == lightningInterval);
            lightning();
        }
    }
    
    // Slowly fade out previously-lit pixels to black, leaving a nice "trailing" effect
    if(switch2) {
        for(int x=0;x<SIDE;x++) {
            for(int z=0;z<SIDE;z++) {
                for(int y=SIDE-1;y>=0;y--) {
                    Color pixelColor = getPixelColor(x,y,z);
                    if(pixelColor.red > 0) pixelColor.red-=pixelColor.red*.125;
                    if(pixelColor.green > 0) pixelColor.green-=pixelColor.green*.125;
                    if(pixelColor.blue > 0) pixelColor.blue-=pixelColor.blue*.125;
                    setPixelColor(x,y,z, pixelColor);
                }
            }
        }
    }
    
    //Let's make some new drops at the top anywher from 5 to 15 at a time
    int numRainDrops = random(5,11);
    for(uint16_t i=0;i<numRainDrops;i++) {
        //We don't want to start a drop unless there are two black pixels at the top of the column
        //So let's look to see if it's possible to start the next drop
        for(int x=0;x<SIDE;x++) {
            for(int z=0;z<SIDE;z++) {
                if(getPixelColor(x,SIDE-2,z)==black && getPixelColor(x,SIDE-1,z)==black) {
                    //It's possible to make a drop in at least one spot, so let's make one
                    Point rainDrop = {0,SIDE-1,0};
                    do{
                        rainDrop.x = random(0,SIDE);
                        rainDrop.z = random(0,SIDE);
                        //let's bail out if we need to
                        if(stop || stopDemo) {return;}
                        //Lets keep looking for a new rain drop if we found a drop or it's tail
                        //And lets leave an extra space between 1 drop (w/ tail) and the next drop too
                    } while(getPixelColor(rainDrop)!=black || getPixelColor(rainDrop.x,SIDE-2,rainDrop.z)!=black);
                        
                    //Random color drop or predetermined
                    if(switch1) { col = getColorFromInteger(Wheel(random(256))); } 
                    else        { col = getColorFromInteger(c); }
                    //make a rain drop
                    setPixelColor(rainDrop,col);
                    x=z=SIDE;
                }
            }
        }
    }
    if(stop || stopDemo) {return;}
    showPixels();
    delay(speed*speedfactor);
}

/** credit: Bill Marrs **/

#endif
