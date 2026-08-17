#ifdef L3D_UNITY_BUILD

void showClock() {
    run = TRUE;

	if (switch2)    //use24hr
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

void textClock() {
    Color bg = getColorFromInteger(color1);
    //static int frameCount = 0;
    int hTenths = hours / 10;
    int hUnits = hours % 10;
    int mTenths = minutes / 10;
    int mUnits = minutes % 10;
    int sTenths = seconds / 10;
    int sUnits = seconds % 10;
    run = TRUE;
    
  	if (switch3) {  //BG
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

    //(largest_item - smallest_item) maps to (max-min)
    float ratio = (.5 - .05)/((120*.05) - .05);
    //(min + ratio*(value-smallest_item))
    float speedFactor = .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
    pos += speedFactor;

    sprintf(clockMessage, "%i%i:%i%i:%i%i%s", hTenths, hUnits, mTenths, mUnits, sTenths, sUnits, switch2 ? "" : Time.isAM() ? "AM" : "PM");
	if(stop || stopDemo) {return;}
	
	switch(whichTextMode) {
        case 0:
        {
            //Can't call textMarquee(col, 0) wrapper directly, due to conflicts with switches 2 and 3
            marquee(clockMessage, pos, bg);
            if (pos >= (SIDE*map(strlen(clockMessage), 1, 63, 4, SIDE))+(strlen(clockMessage))*8)
                pos = map(strlen(clockMessage), 1, 63, (int)-(SIDE*.5), 0);
            break;
        }
        case 1:
        {
            //Can't call textScroll(col, 0) wrapper directly, due to conflicts with switches 2 and 3
            scrollText(clockMessage, Point(pos - strlen(clockMessage), 0, 6), bg);
            if (pos >= (SIDE*map(strlen(clockMessage), 1, 63, 1, SIDE))+(strlen(clockMessage))*8)
                pos = map(strlen(clockMessage), 1, 63, (int)-(SIDE*.5), 0);
            break;
        }
    }    
    showPixels();
	if(stop || stopDemo) {return;}
    //frameCount++;
    //if(frameCount > 10000) {frameCount = 0;}
}

/** Based on Dennis Williamson's "Clock" viz:
 *  http://cubetube.org/gallery/newestFirst/258/
**/
void threeDClock() {
	//Color bg = getColorFromInteger(color1);    //adjustGamma(Color(70, 70, 70), 0.5);
	Color scolor, mcolor, hcolor;
	Color hdcolor, mdcolor, sdcolor;
	bool ampm[2][3][2] = {
		{	// "A":
			{1, 1},
			{1, 1},
			{1, 1}
		},
		{	// "P":
			{1, 1},
			{1, 1},
			{1, 0}
		}
	};
    run = TRUE;
  	
    background(black);
	
	Color amcolor = fadeColor(Color(0xf9, 0x73, 0x06), 0.4);	//dim orange;
	Color pmcolor = fadeColor(Color(0x02, 0x93, 0x86), 0.4);	//dim teal;
	if (!switch2) { //!use24hr
		if (Time.isAM()) {
          for (int row = 0; row < 3; row++)
			for (int col = 0; col < 2; col++)
              if (ampm[0][row][col])
                setPixelColor(col, SIDE - (row + 1), SIDE - 1, amcolor);    //setVoxel(col, SIDE - (row + 1), SIDE - 1, amcolor);
        }
    	else {
          for (int row = 0; row < 3; row++)
			for (int col = 0; col < 2; col++)
              if (ampm[1][row][col])
                setPixelColor(col, SIDE - (row + 1), SIDE - 1, pmcolor);    //setVoxel(col, SIDE - (row + 1), SIDE - 1, pmcolor);
        }
    }

	s.x = seconds % SIDE;
	s.y = seconds / SIDE;

	m.x = minutes % SIDE;
	m.y = minutes / SIDE;

	h.x = hours % SIDE;
	h.y = hours / SIDE;

	setPixelColor(h, hcolor); //setVoxel(h, hcolor);
	setPixelColor(m, mcolor); //setVoxel(m, mcolor);
	setPixelColor(s, scolor); //setVoxel(s, scolor);
	
  	//this sets the color tones and the ranges for
  	//varying each color; if you don't like going too
  	//wild, you can try narrowing the ranges to create
  	//more subtle tones to match your taste...  ;-P
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
  	//adjust color intensity (dim by percent)
  	hcolor = fadeColor(hdcolor, 0.6); //adjustGamma(hdcolor, 0.6);
  	mcolor = fadeColor(mdcolor, 0.6); //adjustGamma(mdcolor, 0.6);
  	scolor = fadeColor(sdcolor, 0.6); //adjustGamma(sdcolor, 0.6);

  	display_digits(hours, hrow, hplane, hdcolor);
	display_digits(minutes, mrow, mplane, mdcolor);
	display_digits(seconds, srow, splane, sdcolor);

	showPixels();
	if(stop || stopDemo) {return;}
  	delay(25);	// Sets the update rate for the background color
}

void display_digits(int number, int drow, int dplane, Color numcolor) {
	int indiv[2];
	bool digits[10][5][3] = {
		{	// "0":
			{1, 1, 1},
			{1, 0, 1},
			{1, 0, 1},
			{1, 0, 1},
			{1, 1, 1}
		},
		{	// "1":
			{0, 1, 0},
			{1, 1, 0},
			{0, 1, 0},
			{0, 1, 0},
			{1, 1, 1}
		},
		{	// "2":
			{1, 1, 0},
			{0, 0, 1},
			{0, 1, 1},
			{1, 0, 0},
			{1, 1, 1}
		},
		{	// "3":
			{1, 1, 0},
			{0, 0, 1},
			{1, 1, 0},
			{0, 0, 1},
			{1, 1, 0}
		},
		{	// "4":
			{1, 0, 1},
			{1, 0, 1},
			{1, 1, 1},
			{0, 0, 1},
			{0, 0, 1}
		},
		{	// "5":
			{1, 1, 1},
			{1, 0, 0},
			{1, 1, 1},
			{0, 0, 1},
			{1, 1, 0}
		},
		{	// "6":
			{0, 1, 1},
			{1, 0, 0},
			{1, 1, 1},
			{1, 0, 1},
			{1, 1, 1}
		},
		{	// "7":
			{1, 1, 1},
			{0, 0, 1},
			{0, 1, 0},
			{0, 1, 0},
			{0, 1, 0}
		},
		{	// "8":
			{1, 1, 1},
			{1, 0, 1},
			{1, 1, 1},
			{1, 0, 1},
			{1, 1, 1}
		},
		{	// "9":
			{1, 1, 1},
			{1, 0, 1},
			{1, 1, 1},
			{0, 0, 1},
			{1, 1, 0}
		}
	};
    run = TRUE;

    indiv[0] = number / 10;
    indiv[1] = number % 10;

	int dcol = 0;

	for (int d = 0; d <= 1; d++){
        for (int row = 0; row < 5; row++)
            for (int col = 0; col < 3; col++) {
            	if(stop || stopDemo) {return;}
                if (digits[indiv[d]][row][col])
                    setPixelColor(dcol + col, SIDE - row - drow - 1, dplane, numcolor); //setVoxel(dcol + col, SIDE - row - drow - 1, dplane, numcolor);
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
