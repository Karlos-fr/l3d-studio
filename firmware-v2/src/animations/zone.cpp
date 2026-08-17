// ============================================================================
// Zone - Implémentation des quatre zones physiques et de leurs chasers
// ----------------------------------------------------------------------------
// Ce fichier conserve le découpage historique de la bande. L'atténuation RGB
// commune reste fournie par les primitives de rendu.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Colore successivement les quatre quarts physiques de la bande.
//
// Parametres :
// - c1 : couleur de la première zone.
// - c2 : couleur de la deuxième zone.
// - c3 : couleur de la troisième zone.
// - c4 : couleur de la quatrième zone.
// - loop : état historique appliqué à la variable globale run.
//
// Retour :
// - un après les quatre fondus, zéro en cas d'interruption.
//
// Effet de bord :
// - modifie le framebuffer, la roue chromatique et l'état run.
// ----------------------------------------------------------------------------
int colorZone(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4, bool loop) {
    uint32_t maxColorPixel, increment;
    colorWheel += 2;
    Color col1 = ((switch2 || switch3) ? getColorFromInteger(Wheel(colorWheel)) : getColorFromInteger(c1));
    Color c, col2, col3, col4;
    run = loop;
    if(switch2) {
		col2 = getColorFromInteger(Wheel(colorWheel+=8));
		col3 = getColorFromInteger(Wheel(colorWheel+=16));
		col4 = getColorFromInteger(Wheel(colorWheel+=32));
    }
    if(switch3) {
		Color compl2 = complement(col1);
		Color compl3 = complement(col2);
		Color compl4 = complement(col3);
		col2 = getColorFromInteger(lerpColor(strip.Color(col1.red, col1.green, col1.blue), 
				strip.Color(compl2.red, compl2.green, compl4.blue), getHighestValFromRGB(col1), 0, 255));
		col3 = getColorFromInteger(lerpColor(strip.Color(col2.red, col2.green, col2.blue), 
				strip.Color(compl3.red, compl3.green, compl4.blue), getHighestValFromRGB(col2), 0, 255));
		col4 = getColorFromInteger(lerpColor(strip.Color(col3.red, col3.green, col3.blue), 
				strip.Color(compl4.red, compl4.green, compl4.blue), getHighestValFromRGB(col3), 0, 255));
    }
	if ((!switch2) && (!switch3)) {
		col2 = getColorFromInteger(c2);
		col3 = getColorFromInteger(c3);
		col4 = getColorFromInteger(c4);
	}
    
    maxColorPixel = getHighestValFromRGB(col1);
    increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
    for(int j=0; j<=maxColorPixel; j+=increment) {
		run = TRUE;
		if(stop || stopDemo) {return 0;}
        if(run || (c != col1)) {
            if(j <= col1.red) c.red = j;
            if(j <= col1.green) c.green = j;
            if(j <= col1.blue) c.blue = j;
            for(int i=zone1Start; i<=zone1End; i++)
                strip.setPixelColor(i, strip.Color(c.red, c.green, c.blue));
            showPixels();
            delay(speed);
        }
    }
    maxColorPixel = getHighestValFromRGB(col2);
    increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
    for(int j=0; j<=maxColorPixel; j+=increment) {
        if(stop || stopDemo) {return 0;}
        if(run || (c != col2)) {
            if(j <= col2.red) c.red = j;
            if(j <= col2.green) c.green = j;
            if(j <= col2.blue) c.blue = j;
            for(int i=zone2Start; i<=zone2End; i++)
                strip.setPixelColor(i, strip.Color(c.red, c.green, c.blue));
            showPixels();
            delay(speed);
        }
    }
    maxColorPixel = getHighestValFromRGB(col3);
    increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
    for(int j=0; j<=maxColorPixel; j+=increment) {
        if(stop || stopDemo) {return 0;}
        if(run || (c != col3)) {
            if(j <= col3.red) c.red = j;
            if(j <= col3.green) c.green = j;
            if(j <= col3.blue) c.blue = j;
            for(int i=zone3Start; i<=zone3End; i++)
                strip.setPixelColor(i, strip.Color(c.red, c.green, c.blue));
            showPixels();
            delay(speed);
        }
    }
    maxColorPixel = getHighestValFromRGB(col4);
    increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
    for(int j=0; j<=maxColorPixel; j+=increment) {
        if(stop || stopDemo) {return 0;}
        if(run || (c != col4)) {
            if(j <= col4.red) c.red = j;
            if(j <= col4.green) c.green = j;
            if(j <= col4.blue) c.blue = j;
            for(int i=zone4Start; i<=zone4End; i++)
                strip.setPixelColor(i, strip.Color(c.red, c.green, c.blue));
            showPixels();
            delay(speed);
        }
    }
    return 1;
}

// ----------------------------------------------------------------------------
// Fait rebondir un chaser dans chacun des quatre quarts physiques.
//
// Parametres :
// - c1 : couleur du premier chaser.
// - c2 : couleur du deuxième chaser.
// - c3 : couleur du troisième chaser.
// - c4 : couleur du quatrième chaser.
//
// Effet de bord :
// - avance les huit états statiques, atténue les traînées et affiche la bande.
// ----------------------------------------------------------------------------
void colorZoneChaser(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4) {
	// Index du premier chaser, borné au premier quart.
	static uint16_t idexZone1 = random(zone1Start, zone1End+1);
    // Index du deuxième chaser, borné au deuxième quart.
    static uint16_t idexZone2 = random(zone2Start, zone2End+1);
    // Index du troisième chaser, borné au troisième quart.
    static uint16_t idexZone3 = random(zone3Start, zone3End+1);
    // Index du quatrième chaser, borné au quatrième quart.
    static uint16_t idexZone4 = random(zone4Start, zone4End+1);
    static bool bounce1 = false;
    static bool bounce2 = false;
    static bool bounce3 = false;
    static bool bounce4 = false;
    Color col1 = getColorFromInteger(c1);
    Color col2 = getColorFromInteger(c2);
    Color col3 = getColorFromInteger(c3);
    Color col4 = getColorFromInteger(c4);
    Color colZ1, colZ2, colZ3, colZ4;
    uint32_t maxColorPixel = max(max(getHighestValFromRGB(col1), getHighestValFromRGB(col2)), max(getHighestValFromRGB(col3), getHighestValFromRGB(col4)));
    uint32_t increment = map(speed, 1, 120, (int)(maxColorPixel*.25), 5);
	run = TRUE;
    
    for(int i=0; i<=maxColorPixel; i+=increment) {
        //Slowly fade in the currently indexed pixels
        if(i <= col1.red) colZ1.red = i;
        if(i <= col1.green) colZ1.green = i;
        if(i <= col1.blue) colZ1.blue = i;
        if(i <= col2.red) colZ2.red = i;
        if(i <= col2.green) colZ2.green = i;
        if(i <= col2.blue) colZ2.blue = i;
        if(i <= col3.red) colZ3.red = i;
        if(i <= col3.green) colZ3.green = i;
        if(i <= col3.blue) colZ3.blue = i;
        if(i <= col4.red) colZ4.red = i;
        if(i <= col4.green) colZ4.green = i;
        if(i <= col4.blue) colZ4.blue = i;
        strip.setPixelColor(idexZone1, strip.Color(colZ1.red, colZ1.green, colZ1.blue));
        strip.setPixelColor(idexZone2, strip.Color(colZ2.red, colZ2.green, colZ2.blue));
        strip.setPixelColor(idexZone3, strip.Color(colZ3.red, colZ3.green, colZ3.blue));
        strip.setPixelColor(idexZone4, strip.Color(colZ4.red, colZ4.green, colZ4.blue));
        
        //Then slowly fade out previously-lit pixels to black, leaving a nice "trailing" effect
        for(int j=0; j<PIXEL_CNT; j++) {
            if ((j != idexZone1) && (j != idexZone2) && (j != idexZone3) && (j != idexZone4)) {
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
    if(bounce1) {idexZone1--;} else {idexZone1++;}
    if(bounce2) {idexZone2--;} else {idexZone2++;}
    if(bounce3) {idexZone3--;} else {idexZone3++;}
    if(bounce4) {idexZone4--;} else {idexZone4++;}
    
    //Check beginning-of-trail
    if (idexZone1 <= zone1Start) {
        idexZone1 = zone1Start;
        bounce1 = false;
    }
    if (idexZone2 <= zone2Start) {
        idexZone2 = zone2Start;
        bounce2 = false;
    }
    if (idexZone3 <= zone3Start) {
        idexZone3 = zone3Start;
        bounce3 = false;
    }
    if (idexZone4 <= zone4Start) {
        idexZone4 = zone4Start;
        bounce4 = false;
    }
    
    //Check end-of-trail
    if (idexZone1 >= zone1End) {
        idexZone1 = zone1End;
        bounce1 = true;
    }
    if (idexZone2 >= zone2End) {
        idexZone2 = zone2End;
        bounce2 = true;
    }
    if (idexZone3 >= zone3End) {
        idexZone3 = zone3End;
        bounce3 = true;
    }
    if (idexZone4 >= zone4End-1) {
        idexZone4 = zone4End-1;
        bounce4 = true;
    }
}

//Fade through colors over all LEDs

#endif
