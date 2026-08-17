// ============================================================================
// Clock - Implementation des horloges texte et tridimensionnelle
// ----------------------------------------------------------------------------
// Ce fichier formate l'heure et dessine ses glyphes compacts. Le rendu des
// chaînes C est délégué aux primitives partagées de Text.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Masques de trois bits des marqueurs A et P, rangée par rangée.
const uint8_t PROGMEM CLOCK_AM_PM_GLYPHS[2][3] = {
  {3, 3, 3},
  {3, 3, 2}
};

// Masques de trois bits des dix chiffres, sur cinq rangées chacun.
const uint8_t PROGMEM CLOCK_DIGIT_GLYPHS[10][5] = {
  {7, 5, 5, 5, 7},
  {2, 6, 2, 2, 7},
  {6, 1, 3, 4, 7},
  {6, 1, 6, 1, 6},
  {5, 5, 7, 1, 1},
  {7, 4, 7, 1, 6},
  {3, 4, 7, 5, 7},
  {7, 1, 2, 2, 2},
  {7, 5, 7, 5, 7},
  {7, 5, 7, 1, 6}
};

// ----------------------------------------------------------------------------
// Lit l'heure courante puis sélectionne le rendu texte ou 3D.
//
// Effet de bord :
// - actualise heures, minutes et secondes avant de dessiner une frame.
// ----------------------------------------------------------------------------
void showClock() {
    run = TRUE;

	if (switch2)    // Le switch 2 sélectionne le format 24 heures.
    	hours = Time.hour();
	else
    	hours = Time.hourFormat12();
	minutes = Time.minute();
	seconds = Time.second();
	
	if(stop || stopDemo) {return;}

    if(switch1) 
        threeDClock();
    else
        textClock();
}

// ----------------------------------------------------------------------------
// Formate et affiche l'heure sous forme de texte anime.
//
// Effet de bord :
// - met a jour `clockMessage` dans ses bornes puis affiche le texte sur le cube.
// ----------------------------------------------------------------------------
void textClock() {
    Color bg = getColorFromInteger(color1);
    int hTenths = hours / 10;
    int hUnits = hours % 10;
    int mTenths = minutes / 10;
    int mUnits = minutes % 10;
    int sTenths = seconds / 10;
    int sUnits = seconds % 10;
    run = TRUE;
    
	if (switch3) {
      if (currentBg == nextBg)
          nextBg = rand()%256;
      else if (nextBg > currentBg)
          currentBg++;
      else
          currentBg--;

      bg = getColorFromInteger(Wheel(currentBg));
    }
    if(switch4)
        background(black);
    else
        if(switch3)
            background(fadeColor(complement(bg), 0.25));
        else
            background(fadeColor(getColorFromInteger(color2), 0.25));

    // Rapport historique entre la vitesse utilisateur et le pas de texte.
    const float ratio = (.5 - .05)/((120*.05) - .05);
    // Pas fractionnaire historique de la position courante.
    const float speedFactor = .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
    pos += speedFactor;

    boundedTextFormat(clockMessage, sizeof(clockMessage), "%i%i:%i%i:%i%i%s", hTenths, hUnits, mTenths, mUnits, sTenths, sUnits, switch2 ? "" : Time.isAM() ? "AM" : "PM");
	if(stop || stopDemo) {return;}
	// Longueur du message calculée une seule fois pour cette frame.
	const size_t clockMessageLength = strlen(clockMessage);
	
	switch(whichTextMode) {
        case 0:
        {
            marquee(clockMessage, pos, bg);
            if (pos >= (SIDE*map(clockMessageLength, 1, 63, 4, SIDE))+(clockMessageLength)*8)
                pos = map(clockMessageLength, 1, 63, (int)-(SIDE*.5), 0);
            break;
        }
        case 1:
        {
            scrollText(clockMessage, Point(pos - clockMessageLength, 0, 6), bg);
            if (pos >= (SIDE*map(clockMessageLength, 1, 63, 1, SIDE))+(clockMessageLength)*8)
                pos = map(clockMessageLength, 1, 63, (int)-(SIDE*.5), 0);
            break;
        }
    }    
    showPixels();
	if(stop || stopDemo) {return;}
}

// ----------------------------------------------------------------------------
// Dessine l'heure sous forme de trois nombres répartis dans le cube.
//
// Effet de bord :
// - efface le framebuffer, dessine marqueur, points et chiffres puis affiche.
// ----------------------------------------------------------------------------
void threeDClock() {
	// Ces couleurs restent non initialisées au premier tracé pour compatibilité.
	Color scolor, mcolor, hcolor;
	Color hdcolor, mdcolor, sdcolor;
    run = TRUE;
  	
    background(black);
	
	// Orange atténué du marqueur AM.
	const Color amcolor = fadeColor(Color(0xf9, 0x73, 0x06), 0.4);
	// Turquoise atténué du marqueur PM.
	const Color pmcolor = fadeColor(Color(0x02, 0x93, 0x86), 0.4);
	if (!switch2) {
		if (Time.isAM()) {
          for (int row = 0; row < 3; row++)
			for (int col = 0; col < 2; col++)
              if (CLOCK_AM_PM_GLYPHS[0][row] & (1 << (1 - col)))
                setPixelColor(col, SIDE - (row + 1), SIDE - 1, amcolor);
        }
    	else {
          for (int row = 0; row < 3; row++)
			for (int col = 0; col < 2; col++)
              if (CLOCK_AM_PM_GLYPHS[1][row] & (1 << (1 - col)))
                setPixelColor(col, SIDE - (row + 1), SIDE - 1, pmcolor);
        }
    }

	s.x = seconds % SIDE;
	s.y = seconds / SIDE;

	m.x = minutes % SIDE;
	m.y = minutes / SIDE;

	h.x = hours % SIDE;
	h.y = hours / SIDE;

	setPixelColor(h, hcolor);
	setPixelColor(m, mcolor);
	setPixelColor(s, scolor);
	
	// Les plages historiques font varier séparément les trois couleurs.
  	if(switch3) {
    	hdcolor=getColorFromInteger(Wheel(map(hours, (switch2 ? 0 : 1), (switch2 ? 23 : 12), 0, 255), 0.6));
    	mdcolor=getColorFromInteger(Wheel(map(minutes, 0, 59, 0, 255), 0.7));
        sdcolor=getColorFromInteger(Wheel(map(seconds, 0, 59, 0, 255), 0.8));
  	}
  	else {
    	hdcolor=getColorFromInteger(color1);
    	mdcolor=getColorFromInteger(color2);
        sdcolor=getColorFromInteger(color3);
  	}
	// Les points indicateurs utilisent une version atténuée des couleurs.
	hcolor = fadeColor(hdcolor, 0.6);
	mcolor = fadeColor(mdcolor, 0.6);
	scolor = fadeColor(sdcolor, 0.6);

  	display_digits(hours, hrow, hplane, hdcolor);
	display_digits(minutes, mrow, mplane, mdcolor);
	display_digits(seconds, srow, splane, sdcolor);

	showPixels();
	if(stop || stopDemo) {return;}
	delay(25);
}

// ----------------------------------------------------------------------------
// Dessine les deux chiffres d'un nombre avec les glyphes compacts en Flash.
//
// Parametres :
// - number : nombre de zéro à 99 à séparer en deux chiffres.
// - drow : décalage vertical historique.
// - dplane : plan Z de destination.
// - numcolor : couleur RGB des chiffres.
//
// Effet de bord :
// - écrit les bits actifs des deux glyphes dans le framebuffer.
// ----------------------------------------------------------------------------
void display_digits(int number, int drow, int dplane, Color numcolor) {
	int indiv[2];
    run = TRUE;

    indiv[0] = number / 10;
    indiv[1] = number % 10;

	int dcol = 0;

	for (int d = 0; d <= 1; d++){
        for (int row = 0; row < 5; row++)
            for (int col = 0; col < 3; col++) {
            	if(stop || stopDemo) {return;}
                if (CLOCK_DIGIT_GLYPHS[indiv[d]][row] & (1 << (2 - col)))
                    setPixelColor(dcol + col, SIDE - row - drow - 1, dplane, numcolor);
            }
    	dcol = 5;
	}
}


/** Allow ifttt.com to trigger this mode based off of a weather recipe. 
 *  Search for Spark Pixels on ifttt.com for an example.
 *  The IFTTT input must be: M:IFTTT WEATHER,C6:xxxxxx,
 *  Don't forget that last comma
 *  Where 0000FF is the hex value for whatever color you want in r-g-b order.
 *  Selecting this mode from the app, will do nothing.
 *  After ifttt.com triggers this mode, the mode will run for 10 minutes, then revert
 *  back to the last running mode.
 *  10 minute time interval is set by the iftttWeatherInterval variable, change this to what you want.
 *  This method will drive all LEDs to 'Breathe' the selected color, just like the RGB
 *  LED on the Photon.
 *  Breathing LED code credit: http://sean.voisen.org/blog/2011/10/breathing-led-with-arduino/
**/

#endif
