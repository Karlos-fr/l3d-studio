#ifdef L3D_UNITY_BUILD

void acidRain() {
    run = TRUE;

    switch(currentModeID) {
        case ACIDRAIN:
            fadeSmooth(1, SIDE, 0.125);
            break;
        case GOLDRAIN:
            fadeSmooth(0, SIDE-1, 0.08);
            break;
    }
    
    if(switch1)
		checkMicrohpone();
    else {
        if((timeAboveThreshhold-millis())>MIN_SALVO_SPACING) {
            timeAboveThreshhold=millis();
            srand(timeAboveThreshhold);
            launchRain(random(8, MAX_POINTS+1));
        }
    }
    updateSalvos();
    drawSalvos();
    
    ledColor++;
    if(ledColor>400) {
        srand(millis());
        ledColor=0;
    }
    if((ledColor%3)==0) {
        if(currentModeID==ACIDRAIN)
            fadeSmooth(0, 1, 0.06);         //base
        if(currentModeID==GOLDRAIN)
            fadeSmooth(SIDE-1, SIDE, 0.18);	//ceiling
    }

	if(stop || demo) {return;}
    delay(speed);
    showPixels();
}

// ----------------------------------------------------------------------------
// Echantillonne le microphone et actualise le niveau utilise par AcidRain.
//
// Effet de bord :
// - met a jour les statistiques audio et le buffer de debug borne.
// ----------------------------------------------------------------------------
void checkMicrohpone() {
	const uint8_t NUM_SAMPLES=5;
  	int runningAverage=0;
	
	for(uint8_t i=0;i<NUM_SAMPLES;i++) {
		/* the microphone values from the ADC range from                             *
		 * 0 to 4095.  The mic is an AC signal, biased around 1.65v,                 *
		 * so a flat line from the mic reads as 2048.  If we want the amplitude      *
		 * of the audio signal, we have to look at the difference between the signal *
		 * and a flat DC signal, so I look at how far the sample is from 2048        */
		int sample=analogRead(MICROPHONE)-SAMPLES;
		if(sample<0)
			sample=0;
		if(sample>maxVal) {
			maxVal=sample;
			runningAverage+=sample;
		}
		if(stop || stopDemo) {return;}
	}
  	runningAverage/=NUM_SAMPLES;
		boundedTextFormat(debug, sizeof(debug), "%f", maxVal);
    /* We try to keep the baseline reading at 450.0 when idle;                          *
     * when peaking, readings can get upwards from 1000.0 to 1200.0 (clipping occurs);  *
     * maxVal is constantly adjusted to keep mean readings within optimal capture range */
    if(maxVal>=650) maxVal-=maxVal*0.0625;      // As maxVal gets too high, cube starts not picking up any signals
    if(maxVal<650 && maxVal>450) maxVal-=0.9;   // This is the range where audio capture and display is optimal
    if(maxVal<450) maxVal+=0.5;                 // We cutoff maxVal to keep from clipping due to excess peaking
	launchRain(runningAverage);
}

void launchRain(int amplitude) {
	uint8_t r, g, b;
    int i;
	
    for(i=0;((i<SIDE)&&(!salvos[i].dead));i++)
        ;
    if(i<SIDE) {
        if(!switch1)
            if(amplitude>maxVal)
                maxVal=amplitude;
      	
      	int numDrops=map(amplitude, 0, (int)maxVal, 0, MAX_POINTS);
        for(int j=0;j<numDrops;j++) {
            salvos[i].dead=false;
          	salvos[i].raindrops[j].dead=false;
          	salvos[i].raindrops[j].flipped=false;
          	salvos[i].raindrops[j].speed=setNewSpeed();
            salvos[i].raindrops[j].raindrop.x=rand()%SIDE;
            salvos[i].raindrops[j].raindrop.z=rand()%SIDE;
      		salvos[i].raindrops[j].raindrop.y=SIDE;

        	switch (currentModeID) {
        	    case GOLDRAIN:
					r=random(95, 128);
					g=random(80, 96);
					b=random(16, 26);
					salvos[i].raindrops[j].color=Color(r, g, b);
        	        //salvos[i].raindrops[j].color=Color( 127, 80, 16 );
        	        break;
                case ACIDRAIN:
                    if(ledColor<200)
                        salvos[i].raindrops[j].color=Color( 0, 50, 150 );
                    if(ledColor>=200 && ledColor<=400)
                        salvos[i].raindrops[j].color=Color( 150, 150, 0 );
                    break;
                default:
                    break;
        	}
        }
      
        for(int j=numDrops;j<MAX_POINTS;j++) {
            salvos[i].raindrops[j].raindrop.x=-1;
            salvos[i].raindrops[j].raindrop.z=-1;
        }
    }
}

void initSalvos() {
    // Seed the random number generator
    srand(millis()); 
    if(currentModeID==ACIDRAIN) ledColor=0;

    for(int i=0;i<SIDE;i++) {
        for(int j=0;j<MAX_POINTS;j++) {
            salvos[i].raindrops[j].raindrop.x=-1;
            salvos[i].raindrops[j].raindrop.z=-1;
          	salvos[i].raindrops[j].speed=0;
          	salvos[i].raindrops[j].flipped=false;
          	salvos[i].raindrops[j].color=black;
          	salvos[i].raindrops[j].dead=true;
        }
        salvos[i].dead=true;
    }
}

void drawSalvos() {
    for(int i=0;i<SIDE;i++) {
        if(!salvos[i].dead) {
            for(int j=0;j<MAX_POINTS;j++) {
              	if(!salvos[i].raindrops[j].dead) {
                	if(currentModeID==ACIDRAIN) {
						if(ledColor<200) {
							if(salvos[i].raindrops[j].raindrop.y>=6 && salvos[i].raindrops[j].raindrop.y<7) salvos[i].raindrops[j].color=Color( 0, 10, 90 );
							if(salvos[i].raindrops[j].raindrop.y>=5 && salvos[i].raindrops[j].raindrop.y<6) salvos[i].raindrops[j].color=Color( 0, 0, 100 );
							if(salvos[i].raindrops[j].raindrop.y>=4 && salvos[i].raindrops[j].raindrop.y<5) salvos[i].raindrops[j].color=Color( 10, 0, 110 );
							if(salvos[i].raindrops[j].raindrop.y>=3 && salvos[i].raindrops[j].raindrop.y<4) salvos[i].raindrops[j].color=Color( 30, 0, 120 );
							if(salvos[i].raindrops[j].raindrop.y>=2 && salvos[i].raindrops[j].raindrop.y<3) salvos[i].raindrops[j].color=Color( 100, 0, 150 );
							if(salvos[i].raindrops[j].raindrop.y>=1 && salvos[i].raindrops[j].raindrop.y<2) salvos[i].raindrops[j].color=Color( 100, 0, 100 );
							if(salvos[i].raindrops[j].raindrop.y>=0 && salvos[i].raindrops[j].raindrop.y<1) salvos[i].raindrops[j].color=Color( random(100, 161), 0, 10 );
						}
						if(ledColor>=200 && ledColor<=400) {   
							if(salvos[i].raindrops[j].raindrop.y>=6 && salvos[i].raindrops[j].raindrop.y<7) salvos[i].raindrops[j].color=Color( 100, 100, 0 );
							if(salvos[i].raindrops[j].raindrop.y>=5 && salvos[i].raindrops[j].raindrop.y<6) salvos[i].raindrops[j].color=Color( 150, 50, 0 );
							if(salvos[i].raindrops[j].raindrop.y>=4 && salvos[i].raindrops[j].raindrop.y<5) salvos[i].raindrops[j].color=Color( 150, 20, 0 );
							if(salvos[i].raindrops[j].raindrop.y>=3 && salvos[i].raindrops[j].raindrop.y<4) salvos[i].raindrops[j].color=Color( 150, 10, 0 );
							if(salvos[i].raindrops[j].raindrop.y>=2 && salvos[i].raindrops[j].raindrop.y<3) salvos[i].raindrops[j].color=Color( 150, 0, 0 );
							if(salvos[i].raindrops[j].raindrop.y>=1 && salvos[i].raindrops[j].raindrop.y<2) salvos[i].raindrops[j].color=Color( 120, 0, 0 );
							if(salvos[i].raindrops[j].raindrop.y>=0 && salvos[i].raindrops[j].raindrop.y<1) salvos[i].raindrops[j].color=Color( random(100, 160), random(0, 21), 0 );
						}
						//Draw the lake pseudo-randomly by mirroring falling raindrops at every cycle
						//if((ledColor%3)==0) {
							if(ledColor<200)
								setPixelColor(salvos[i].raindrops[j].raindrop.x, 0, salvos[i].raindrops[j].raindrop.z, Color( random(100, 161), 0, 10 ));
							if(ledColor>=200 && ledColor<=400)
								setPixelColor(salvos[i].raindrops[j].raindrop.x, 0, salvos[i].raindrops[j].raindrop.z, Color( random(100, 160), random(0, 21), 0 ));
						//}
                	}
                	setPixelColor(salvos[i].raindrops[j].raindrop.x, salvos[i].raindrops[j].raindrop.y, salvos[i].raindrops[j].raindrop.z, salvos[i].raindrops[j].color);
              	}
            }
        }
	}
}

void updateSalvos() {
    for(int i=0;i<SIDE;i++) {
        for(int j=0;j<MAX_POINTS;j++) {
            salvos[i].raindrops[j].raindrop.y-=salvos[i].raindrops[j].speed;
            if(salvos[i].raindrops[j].raindrop.y<0)
                salvos[i].raindrops[j].dead=true;
			if(currentModeID==GOLDRAIN) {
				//Increase the 'golden glow' as drops fall down further
				salvos[i].raindrops[j].color.red+=(1 + salvos[i].raindrops[j].speed);
				salvos[i].raindrops[j].color.green+=(1 + salvos[i].raindrops[j].speed);
				salvos[i].raindrops[j].color.blue+=(0.5 + salvos[i].raindrops[j].speed);
			}
        }
      	
    	int offCube=true;
      	for(int j=0;j<MAX_POINTS;j++) {
          	if(!salvos[i].raindrops[j].dead) {
				offCube=false;
              	break;
            }
        }
      	if(offCube)
            salvos[i].dead=true;
    }
}

float setNewSpeed() {
  	float ret;
    int rndSpeed=random(0, 7);
    switch(rndSpeed) {
      case 0:
        ret=0.5;
        break;
      case 1:
        ret=0.15;
        break;
      case 2:
        ret=0.1;
        break;
      case 3:
        ret=0.25;
        break;
      case 4:
        ret=0.2;
        break;
      case 5:
        ret=0.35;
        break;
      case 6:
        ret=0.3;
        break;
    }
  	return ret;
}

/** 
 * Used to make linear transitions between colors by drawing a linear line from
 * the current color to the end color in the HSV model.
 * Assumes every pixel is at a different color value.
 * If the current color is blue and the next color is yellow, it will pass 
 * through the white spectrum to get there.
 * If the current color is red and the next color is blue, it will pass 
 * through pink/purple to get there.
 */

#endif
