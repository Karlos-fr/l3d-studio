// ============================================================================
// ClassicColorEffects - Implémentation des effets couleur historiques
// ----------------------------------------------------------------------------
// Ce fichier regroupe les effets parcourant la bande physique. Les primitives
// de couleur et l'atténuation commune restent dans le module de rendu.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Affiche une frame de fondu sur la roue chromatique.
//
// Effet de bord :
// - avance la teinte statique, remplit et affiche les LED puis applique le délai.
// ----------------------------------------------------------------------------
void color_fade() {
   // Teinte courante ; 255 permet au premier incrément de produire zéro.
   static uint8_t hue = 255;
   run = TRUE;

   hue++;
   for(int idex = 0 ; idex < PIXEL_CNT; idex++ ) {
      strip.setPixelColor(idex, Wheel(hue));
   }
   if(stop || stopDemo) {return;}
   showPixels();
   delay(speed);
}

//Flicker effect - random flashing of all LEDs
void flicker(uint32_t c) {
    Color c2, c1 = getColorFromInteger(c);
    int ibright = random(brightness*.25, brightness+1);  //(brightness*.25) + (rand() % brightness);
    int random_delay = random(1, map(speed, 1, 120, 100, 10)+1);  //1 + (rand() % map(speed, 1, 120, 100, 10));
    uint32_t maxColorPixel = floor(max(ibright, getHighestValFromRGB(c1)));
    uint32_t increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
	run = TRUE;

    for(int j=random((int)(maxColorPixel*.25), (int)(maxColorPixel*.5)+1); j<=maxColorPixel; j+=increment) {
        for(int i = 0; i < PIXEL_CNT; i++ ) {
            if(j <= c1.red) c2.red = j;
            if(j <= c1.green) c2.green = j;
            if(j <= c1.blue) c2.blue = j;
            strip.setPixelColor(i, strip.Color(c2.red, c2.green, c2.blue));
        }
        if(stop || stopDemo) {return;}
        strip.show();
        animationProcessServices();
        delay(random_delay);
    }
}

// ----------------------------------------------------------------------------
// Fait respirer une couleur entre zéro et la luminosité courante.
//
// Parametres :
// - color1 : couleur fixe utilisée lorsque le switch aléatoire est désactivé.
//
// Effet de bord :
// - modifie l'intensité et le sens statiques, puis affiche toutes les LED.
// ----------------------------------------------------------------------------
void pulse_oneColorAll(uint32_t color1) {
    // Intensité courante, bornée autour de la luminosité 0 à 255.
    static int16_t ival = 0;
    static uint32_t xhue = switch1 ? Wheel(random(256)) : color1;
    // Vrai pendant la phase descendante du cycle respiratoire.
    static bool bouncedirection = false;
    float isteps = constrain(brightness*.03, .6, brightness*.25);
	run = TRUE;
    
    if (bouncedirection == 0) {
    ival += isteps;
    if (ival >= brightness)
        bouncedirection = 1;
    }
    if (bouncedirection == 1) {
        ival -= isteps;
        if (ival <= 0) {
            bouncedirection = 0;
            xhue = switch1 ? Wheel(random(256)) : color1;
        }
    }
    for(int i = 0; i < PIXEL_CNT; i++) {
        strip.setPixelColor(i, xhue);
        strip.setBrightness(ival);
    }
  
    if(stop || stopDemo) {return;}
    strip.show();
    animationProcessServices();
    delay(speed);
}

// ----------------------------------------------------------------------------
// Alterne un stroboscope bleu et rouge sur les deux moitiés physiques.
//
// Effet de bord :
// - avance les deux états statiques, écrit et affiche la bande puis attend.
// ----------------------------------------------------------------------------
void police_light_strobo() {
	// Dernier index du premier quart physique.
	const uint16_t zone1End = (PIXEL_CNT / 4) - 1;
	// Premier index du deuxième quart physique.
	const uint16_t zone2Start = zone1End + 1;
	// Dernier index de la première moitié physique.
	const uint16_t zone2End = (zone2Start * 2) - 1;
    // Séparation historique entre les moitiés bleue et rouge.
    const uint16_t middle = zone2End;
    // État allumé ou éteint alterné à chaque frame.
    static bool color = false;
    // Compteur de côté, compris entre zéro et vingt.
    static uint8_t left_right = 0;
	run = TRUE;
    
    if (left_right > 19)
        left_right = 0;
    
    color = !color;
    
    for (int i = 0; i < PIXEL_CNT; i++) {
        if (i <= middle && left_right < 10) {
            if (color)
                strip.setPixelColor(i, strip.Color(0, 0, 255));
            else
                strip.setPixelColor(i, 0);
        }
        else if (i > middle && left_right >= 10) {
            if (color)
                strip.setPixelColor(i, strip.Color(255, 0, 0));
            else
                strip.setPixelColor(i, 0);
        }
        if(stop || stopDemo) {return;}
    }
    
    if(stop || stopDemo) {return;}
    showPixels();
    delay(speed);
    left_right++;
}

// ----------------------------------------------------------------------------
// Fait rebondir deux chasers colorés sur les deux moitiés physiques.
//
// Parametres :
// - color1 : couleur du premier chaser.
// - color2 : couleur du second chaser.
//
// Effet de bord :
// - modifie les index et sens statiques, atténue puis affiche la traînée.
// ----------------------------------------------------------------------------
void twoColorChaser(uint32_t color1, uint32_t color2) {
    // Index du premier chaser, borné à la première moitié physique.
    static uint16_t idex1 = random(zone1Start, zone2End+1);
    // Index du second chaser, borné à la deuxième moitié physique.
    static uint16_t idex2 = random(zone3Start, zone4End+1);
    static bool bounce1 = false;
    static bool bounce2 = false;
    Color col1, c1 = getColorFromInteger(color1);
    Color col2, c2 = getColorFromInteger(color2);
    uint32_t maxColorPixel = max(getHighestValFromRGB(c1), getHighestValFromRGB(c2));
    uint32_t increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
	run = TRUE;
    
    for(int i=0; i<=maxColorPixel; i+=increment) {
        //Slowly fade in the currently indexed pixels to blue and red
        if(i <= c1.red) col1.red = i;
        if(i <= c1.green) col1.green = i;
        if(i <= c1.blue) col1.blue = i;
        if(i <= c2.red) col2.red = i;
        if(i <= c2.green) col2.green = i;
        if(i <= c2.blue) col2.blue = i;
        strip.setPixelColor(idex1, strip.Color(col1.red, col1.green, col1.blue));
        strip.setPixelColor(idex2, strip.Color(col2.red, col2.green, col2.blue));
        
        //Then slowly fade out previously-lit pixels to black, leaving a nice "trailing" effect
        for(int j=0; j<PIXEL_CNT; j++) {
            if ((j != idex1) && (j != idex2)) {
                Color pixelColor = fadeColorSevenEighths(
                    getColorFromInteger(strip.getPixelColor(j)));
                strip.setPixelColor(j, strip.Color(pixelColor.red, pixelColor.green, pixelColor.blue));
            }
        }
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
    
    //Check direction
    if(bounce1) {idex1--;} else {idex1++;}
    if(bounce2) {idex2--;} else {idex2++;}
    
    //Check beginning-of-trail
    if (idex1 <= zone1Start) {
        idex1 = zone1Start;
        bounce1 = FALSE;
    }
    if (idex2 <= zone3Start) {
        idex2 = zone3Start;
        bounce2 = FALSE;
    }
    
    //Check end-of-trail
    if (idex1 >= zone2End) {
        idex1 = zone2End;
        bounce1 = TRUE;
    }
    if (idex2 >= zone4End-1) {
        idex2 = zone4End-1;
        bounce2 = TRUE;
    }
}

//Pulse all dots with pseudo-random colors
void colorPulse() {
    uint32_t pulseRate;
	uint32_t c1, c2;
	run = TRUE;
    
    c1 = Wheel(random(256));
    c2 = Wheel(random(256));
    
    for(int j=0; j<=c2; j++) {
        for(int i=0; i<strip.numPixels(); i++) {
            pulseRate = abs(255-(speed+j));
            strip.setPixelColor(i, Wheel(lerpColor(j, speed, pulseRate, 0, 255)));
        }
        if(pulseRate > 3840) {return;}  //Too fast - bail out.
        if(stop || stopDemo) {return;}
        showPixels();
		delay(speed);
    }
}

//Fill the dots with patterns from colors interpolated between 2 random colors
void cycleLerp() {
    uint32_t rate;
	uint32_t c1, c2;
	run = TRUE;
    
    c1 = Wheel(random(256));
    c2 = Wheel(random(256));
    
    for(int j=0; j<=c2; j++) {
        for(int i=0; i<strip.numPixels(); i++) {
            rate = abs(i-(speed+j));
            strip.setPixelColor(i, Wheel(lerpColor(j, c1, rate, 0, 255)));
        }
        if(rate > 7680) {return;}   //Gettin' weird - bail out.
        if(stop || stopDemo) {return;}
        showPixels();
		delay(speed);
    }
}

//Randomly fill the dots with colors interpolated between the 2 chosen colors
void colorStripes() {
	uint32_t c1, c2;
	run = TRUE;

    c1 = Wheel(random(256));
    c2 = Wheel(random(256));
    
    for(int j=0; j<=c2; j++) {
        if(stop || stopDemo) {return;}
        for(int i=0; i<strip.numPixels(); i++)
            strip.setPixelColor(i, lerpColor(j, c1, abs(i-j), 0, 255));
        showPixels();
        delay(speed);
    }
}

void rainbow(void) {
	run = TRUE;
    
    for(int j=0; j<256; j++) {
        for(int i=0; i<strip.numPixels(); i++)
            strip.setPixelColor(i, Wheel((i+j) & 255));
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
}

// Slightly different, this makes the rainbow equally distributed throughout, then wait (ms)
void rainbowCycle(void) {
  run = TRUE;

    for(int j=0; j<256; j++) { // 1 cycle of all colors on wheel
        for(int i=0; i< strip.numPixels(); i++)
            strip.setPixelColor(i, Wheel(((i * 256 / strip.numPixels()) + j) & 255));
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
}

// ----------------------------------------------------------------------------
// Remplit puis efface progressivement des voxels de couleurs aléatoires.
//
// Effet de bord :
// - modifie les compteurs statiques et globaux, consomme le générateur
//   aléatoire et appelle les transitions d'un voxel.
// ----------------------------------------------------------------------------
void random_burst() {
    // Nombre de voxels considérés remplis, compris entre zéro et 512.
    static uint16_t pixelCount = 0;
    static bool isAllFilled = FALSE;
    Color c1;
    uint32_t c2;
	run = TRUE;

    if(idex + ihue == 0) {
        pixelCount = 0;         //Careful to reset our variables to
        isAllFilled = FALSE;    //ensure a new cycle will start fresh
        //Then we need to fade any voxels still lit
        for(int idx = 0; idx < PIXEL_CNT; idx++) {
            if(strip.getPixelColor(idx) > 0) {
                transition(black, true);
                return;
            }
        }
    }
    idex = random(PIXEL_CNT);
    ihue = random(256);
    
    ///DEBUG: sprintf(debug,"pixelCount = %i, isAllFilled = %i", pixelCount, isAllFilled);
    if(stop || stopDemo) {return;}

    //Filling every voxel with a random color - this may
    //reset voxels already filled before; we want this
    if(!isAllFilled) {
        c1 = getColorFromInteger(Wheel(ihue));
        c2 = strip.getPixelColor(idex);
        if(c2 > 0) {fadeOutFromColor(idex, getColorFromInteger(c2));}
        else {pixelCount++;}
        if(pixelCount < PIXEL_CNT) {fadeInToColor(idex, c1);}
        else {pixelCount--; isAllFilled = TRUE;}
    }
    else {  //When all voxels are filled, we begin fading them
        c2 = strip.getPixelColor(idex);
        if(c2 > 0) {pixelCount--;}
        if(pixelCount > 1) {fadeOutFromColor(idex, getColorFromInteger(c2));}
        else {idex = 0; ihue = 0;}  //When all but 1 voxels are blanked, we reset our variables for another
    }                               //cycle (we let transition() take care of that one last voxel)
    delay(speed);
}

//Theatre-style crawling lights with rainbow effect
void theaterChaseRainbow(void) {
	run = TRUE;

    for (int j=0; j<256; j++) {     //cycle all 256 colors in the wheel
        for (int q=0; q<3; q++) {
            for (int i=0; i < strip.numPixels(); i+=3)
                strip.setPixelColor(i+q, Wheel( (i+j) % 255));  //turn every third pixel on
            if(stop || stopDemo) {return;}
            showPixels();
        	delay(speed);
            for (int i=0; i < strip.numPixels(); i=i+3)
                strip.setPixelColor(i+q, 0);    //turn every third pixel off
        }
    }
}

//Fade from teal to blue to purple then back to blue then teal, repeat
//Random snowflakes twinkle white for random amounts of time 
//The snowflakes will hang around no faster than MIN_DELAY and no slower than MAX_DELAY
void frozen(void) {
    uint32_t startColor = 140;  //Hue for teal
    uint32_t stopColor  = 210;  //Hue for purple
    const int MIN_DELAY = 400;  //in ms
    const int MAX_DELAY = 700;  //in ms
    const int MIN_FLAKES = strip.numPixels()*0.01;	//  1% of total number of pixels
    const int MAX_FLAKES = strip.numPixels()*0.1;	// 10% of total number of pixels
    int numSnowFlakes = random(MIN_FLAKES, MAX_FLAKES+1);	//How many flakes should we have at a time
    unsigned long previousMillis = millis();
    unsigned long flakeLifeSpan = random(MIN_DELAY, MAX_DELAY+1); //How long will a snowflake last
    int increment = constrain(map(speed, 1, 120, 4, 8), 4, 8);  //How fast/slow a snowflake will dim
	run = TRUE;
    
    //forwards
    for(int j=startColor; j<stopColor; j++) { 	//cycle through the colors
        for(int i=0; i<strip.numPixels(); i++) {
            strip.setPixelColor(i, Wheel(j));	//first set all pixels to the same color
            if(millis() - previousMillis > flakeLifeSpan) {
        		previousMillis = millis();						//reset time interval
        		flakeLifeSpan = random(MIN_DELAY, MAX_DELAY+1);	//set new lifespan	
        		numSnowFlakes = random(MIN_FLAKES, MAX_FLAKES+1); //set new number of flakes
                findRandomSnowFlakesPositions(numSnowFlakes);	//get the list of flake positions
                //avoid our snowflakes fading out by brightening them up every now and then
                if(strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue) < 0xFFFFFF) {
                    if(snowFlakeColor.red < 0xFF) snowFlakeColor.red+=(0xFF-(snowFlakeColor.red))*.5;
                    if(snowFlakeColor.green < 0xFF) snowFlakeColor.green+=(0xFF-(snowFlakeColor.green))*.5;
                    if(snowFlakeColor.blue < 0xFF) snowFlakeColor.blue+=(0xFF-(snowFlakeColor.blue))*.5;
                    for(int k=0; k<numSnowFlakes; k++)
                        strip.setPixelColor(randomFlakes[k], strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue)); //Set snowflake
                    if(stop || stopDemo) {return;}
                    showPixels();
                }
                increment = constrain(map(speed, 1, 120, 4, 8), 4, 8);  //refresh dim rate
            }
        }
        if(snowFlakeColor.red > 0) snowFlakeColor.red-=increment;
        if(snowFlakeColor.green > 0) snowFlakeColor.green-=increment;
        if(snowFlakeColor.blue > 0) snowFlakeColor.blue-=increment;
        for(int k=0; k<numSnowFlakes; k++)
            strip.setPixelColor(randomFlakes[k], strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue)); //Set snowflake
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
        increment = constrain(map(speed, 1, 120, 4, 8), 4, 8);  //refresh dim rate
    }
    
    //backwards
    for(int j=stopColor; j>startColor; j--) { 	//cycle through the colors
        for(int i=0; i<strip.numPixels(); i++) {
            strip.setPixelColor(i, Wheel(j));	//first set all pixels to the same color
            if(millis() - previousMillis > flakeLifeSpan) {
        		previousMillis = millis();						//reset time interval
        		flakeLifeSpan = random(MIN_DELAY, MAX_DELAY+1);	//set new lifespan	
        		numSnowFlakes = random(MIN_FLAKES, MAX_FLAKES+1); //set new number of flakes
                findRandomSnowFlakesPositions(numSnowFlakes);	//get the list of flake positions
                //avoid our snowflakes fading out by brightening them up every now and then
                if(strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue) < 0xFFFFFF) {
                    if(snowFlakeColor.red < 0xFF) snowFlakeColor.red+=(0xFF-(snowFlakeColor.red))*.5;
                    if(snowFlakeColor.green < 0xFF) snowFlakeColor.green+=(0xFF-(snowFlakeColor.green))*.5;
                    if(snowFlakeColor.blue < 0xFF) snowFlakeColor.blue+=(0xFF-(snowFlakeColor.blue))*.5;
                    for(int k=0; k<numSnowFlakes; k++)
                        strip.setPixelColor(randomFlakes[k], strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue)); //Set snowflake
                    if(stop || stopDemo) {return;}
                    showPixels();
                }
                increment = constrain(map(speed, 1, 120, 4, 8), 4, 8);  //refresh dim rate
                if(strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue) <= 0) snowFlakeColor = getColorFromInteger(0xFFFFFF);
            }
        }
        if(snowFlakeColor.red > 0) snowFlakeColor.red-=increment;
        if(snowFlakeColor.green > 0) snowFlakeColor.green-=increment;
        if(snowFlakeColor.blue > 0) snowFlakeColor.blue-=increment;
        for(int k=0; k<numSnowFlakes; k++)
            strip.setPixelColor(randomFlakes[k], strip.Color(snowFlakeColor.red, snowFlakeColor.green, snowFlakeColor.blue)); //Set snowflake
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
        increment = constrain(map(speed, 1, 120, 4, 8), 4, 8);  //refresh dim rate
    }
}

void findRandomSnowFlakesPositions(int numFlakes) {
    for(int i=0;i<numFlakes;i++) {
        randomFlakes[i] = random(PIXEL_CNT);
        if(i > 0) {
            for(int j=0; j<i; j++) {
				//make sure we didn't already set that position
                while(randomFlakes[i] == randomFlakes[j])
                    randomFlakes[i] = random(PIXEL_CNT);
            }
        }
    }
}

//Color Blender
//Red starts at 1 end and green at the other. They increment towards each other. 
//When they meet, they eplode into the combined color
void collide(void) {
	uint32_t color1, color2;
	run = TRUE;
	
	for(color1=0; color1<256; color1+=85) {
	//for(color1=0; color1<=255; color1+=170) {
	    for(color2=color1+42; color2<=color1+85; color2+=43) {
	    //for(color2=color1+85; color2<=color1+170; color2+=85) {
    		for(int i=0; i<=strip.numPixels()/2; i++) { 
    			if(i*2 >= strip.numPixels()) {
    				//Explode the colors
					int tempSpeed = speed;
					speed = 5;
					transitionAll(white, LINEAR);
					delay(100);
					transitionAll(getColorFromInteger(Wheel((((color2-color1)/2)+color1)&0xFF)), POLAR);
					delay(100);
					speed = 100;
					transitionAll(black,LINEAR);
					speed = tempSpeed;
    				/*for(int j=0; j<strip.numPixels(); j++) {
    					strip.setPixelColor(j, Wheel((((color2-color1)/2)+color1)&0xFF));
    					if(j%5==0)
    					    showPixels();
    				}*/
                    if(stop || stopDemo) {return;}
    				showPixels();
					delay(speed);
    				break;
    			}
    			else {
    				//Grow the two colors from either end of the strip
    				strip.setPixelColor(i, Wheel(color1));
    				strip.setPixelColor(strip.numPixels()-i, Wheel((color2)&0xFF));
                    if(stop || stopDemo) {return;}
    				showPixels();
					delay(speed);
    			}
    		}
	    }
	}
}

// Input a value 0 to 255 to get a color value.
// The colours are a transition r - g - b - back to r.
uint32_t Wheel(byte WheelPos, float opacity) {
	if(WheelPos < 85) {
		return strip.Color((WheelPos * 3) * opacity, (255 - WheelPos * 3) * opacity, 0);
	}
	else if(WheelPos < 170) {
		WheelPos -= 85;
		return strip.Color((255 - WheelPos * 3) * opacity, 0, (WheelPos * 3) * opacity);
	}
	else {
		WheelPos -= 170;
		return strip.Color(0, (WheelPos * 3) * opacity, (255 - WheelPos * 3) * opacity);
    }
}

/** Linear interpolation between colors.
  @param a, b The colors to interpolate between.
  @param val Position on the line between color a and color b.
  When equal to min the output is color a, and when equal to max the output is color b.
  @param minVal Minimum value that val will take.
  @param maxVal Maximum value that val will take.

  @return Color between colors a and b.*/
uint32_t lerpColor(uint32_t c1, uint32_t c2, uint32_t val, uint32_t minVal, uint32_t maxVal) {
    Color a = getColorFromInteger(c1);
    Color b = getColorFromInteger(c2);
    int red = a.red + (b.red-a.red) * (val-minVal) / (maxVal-minVal);
    int green = a.green + (b.green-a.green) * (val-minVal) / (maxVal-minVal);
    int blue = a.blue + (b.blue-a.blue) * (val-minVal) / (maxVal-minVal);
    
    return strip.Color(red, green, blue);
}

/** Returns a color from a set of colors fading from blue to green to red and back again
    the color is returned based on where the parameter *val* falls between the parameters
    *min* and *max*.  If *val* is min, the function returns a blue color.  If *val* is halfway
    between *min* and *max*, the function returns a yellow color.*/  
uint32_t colorMap(float val, float minVal, float maxVal) {
    const float range = 2048;
    val = range * (val-minVal) / (maxVal-minVal);
    
    Color colors[6];
    
    colors[0].red = 0;
    colors[0].green = 0;
    colors[0].blue = brightness;
    
    colors[1].red = 0;
    colors[1].green = brightness;
    colors[1].blue = brightness;
    
    colors[2].red = 0;
    colors[2].green = brightness;
    colors[2].blue = 0;
    
    colors[3].red = brightness;
    colors[3].green = brightness;
    colors[3].blue = 0;
    
    colors[4].red = brightness;
    colors[4].green = 0;
    colors[4].blue = 0;
    
    colors[5].red = brightness;
    colors[5].green = 0;
    colors[5].blue = brightness;
    
    if(val <= range/6)
        return lerpColor(strip.Color(colors[0].red, colors[0].green, colors[0].blue), strip.Color(colors[1].red, colors[1].green, colors[1].blue), val, 0, range/6);
    else if(val <= 2 * range / 6)
        return(lerpColor(strip.Color(colors[1].red, colors[1].green, colors[1].blue), strip.Color(colors[2].red, colors[2].green, colors[2].blue), val, range / 6, 2 * range / 6));
    else if(val <= 3 * range / 6)
        return(lerpColor(strip.Color(colors[2].red, colors[2].green, colors[2].blue), strip.Color(colors[3].red, colors[3].green, colors[3].blue), val, 2 * range / 6, 3*range / 6));
    else if(val <= 4 * range / 6)
        return(lerpColor(strip.Color(colors[3].red, colors[3].green, colors[3].blue), strip.Color(colors[4].red, colors[4].green, colors[4].blue), val, 3 * range / 6, 4*range / 6));
    else if(val <= 5 * range / 6)
        return(lerpColor(strip.Color(colors[4].red, colors[4].green, colors[4].blue), strip.Color(colors[5].red, colors[5].green, colors[5].blue), val, 4 * range / 6, 5*range / 6));
    else
        return(lerpColor(strip.Color(colors[5].red, colors[5].green, colors[5].blue), strip.Color(colors[0].red, colors[0].green, colors[0].blue), val, 5 * range / 6, range));
}

void mixVoxel(Point currentPoint, Color col) {
  Color currentCol=getPixelColor(currentPoint);
  Color newCol=Color{currentCol.red+col.red, currentCol.green+col.green, currentCol.blue+col.blue};
  setPixelColor(currentPoint, newCol);
}

// @param scaleFactor is a percentage of the current color in decimal form, i.e 0.125
Color fadeColor(Color col, float scaleFactor) {
    col.red=col.red*scaleFactor;
    col.green=col.green*scaleFactor;
    col.blue=col.blue*scaleFactor;
    return col;
}

/** Fade out all voxels to black
  @param scaleFactor is a percentage of the current color in decimal form, i.e 0.125 */
void fadeSmooth(char lowerLim, char upperLim, float scaleFactor) {
    for(int x=0;x<SIDE;x++)
        for(int y=lowerLim;y<upperLim;y++)
            for(int z=0;z<SIDE;z++) {
                Color voxelColor=getPixelColor(x,y,z);
                if(voxelColor.red > 0) voxelColor.red-=voxelColor.red*scaleFactor;
                //voxelColor.red=constrain(voxelColor.red*scaleFactor, 0, brightness);
                if(voxelColor.green > 0) voxelColor.green-=voxelColor.green*scaleFactor;
                //voxelColor.green=constrain(voxelColor.green*scaleFactor, 0, brightness);
                if(voxelColor.blue > 0) voxelColor.blue-=voxelColor.blue*scaleFactor;
                //voxelColor.blue=constrain(voxelColor.blue*scaleFactor, 0, brightness);
                setPixelColor(x,y,z, voxelColor);   
            }
}

Color complement(Color original) {
  float R = original.red;
  float G = original.green;
  float B = original.blue;
  float minRGB = min(R, min(G, B));
  float maxRGB = max(R, max(G, B));
  float minPlusMax = minRGB + maxRGB;
  return Color{minPlusMax-R, minPlusMax-G, minPlusMax-B};;
}

//Exactly what you think it does
//credit: http://stackoverflow.com/questions/1201200/fast-algorithm-for-drawing-filled-circles
void drawSolidHorizontalCircle(int xOrigin, int yOrigin, int z, int radius, Color col) {
    for(int y=-radius; y<=radius; y++)
        for(int x=-radius; x<=radius; x++)
            if(x*x+y*y <= radius*radius)
                setPixelColor(xOrigin+x, z, yOrigin+y, col);
}

void drawHollowHorizontalCircle(int xOrigin, int yOrigin, int z, int radius, Color col, bool rndColor=FALSE) {
    for(int y=-radius; y<=radius; y++) {
        for(int x=-radius; x<=radius; x++) {
            if(x*x+y*y == radius*radius) {
                if(rndColor)
                    setPixelColor(xOrigin+x, z, yOrigin+y, getColorFromInteger(Wheel(random(256))));
                else
                    setPixelColor(xOrigin+x, z, yOrigin+y, col);
            }
        }
    }
}

// draws a line from point p1 to p2 and colors each of the points according
// to the col parameter
// p1 and p2 can be outside of the cube, but it will only draw the parts of
// the line that fall
// inside the cube

#endif
