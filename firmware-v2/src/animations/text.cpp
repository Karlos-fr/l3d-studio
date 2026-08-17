#ifdef L3D_UNITY_BUILD

void showText(uint32_t color1, uint32_t color2) {
	uint32_t c1, c2;
	c1 = color1;
	c2 = color2;
  	
	if (switch4) {  //BG
		if (currentBg == nextBg)
			nextBg = rand()%256;
		else if (nextBg > currentBg)
			currentBg++;
		else
			currentBg--;

		c1 = Wheel(currentBg);
		Color bg = complement(getColorFromInteger(c1));
		c2 = strip.Color(bg.red, bg.green, bg.blue);
    }
    
	switch(whichTextMode) {
        case 0:
            textMarquee(c1, c2);
            break;
        case 1:
            textScroll(c1, c2);
            break;
    }
}


void textScroll(uint32_t color1, uint32_t color2) {
    run = TRUE;
    
    thickness = switch1;
    if(switch2) {color2 = 0;}
    if(switch3) {color1 = 0;}
    
    if(switch3)
        background(fadeColor(getColorFromInteger(color2), 0.5));
    else
        background(fadeColor(getColorFromInteger(color2), 0.25));
    
    scrollText(message, Point(pos - strlen(message), 0, 6), getColorFromInteger(color1));
    showPixels();
    if(stop) {return;}
    //(largest_item - smallest_item) maps to (max-min)
    float ratio = (.5 - .05)/((120*.05) - .05);
    //(min + ratio*(value-smallest_item))
    float speedFactor = .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
    pos += speedFactor;
    if (pos >= (SIDE*map(strlen(message), 1, 63, 1, SIDE))+(strlen(message))*8)
        pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
}

void textMarquee(uint32_t color1, uint32_t color2) {
    run = TRUE;
    
    thickness = switch1;
    if(switch2) {color2 = 0;}
    if(switch3) {color1 = 0;}
    
    if(switch3)
        background(fadeColor(getColorFromInteger(color2), 0.5));
    else
        background(fadeColor(getColorFromInteger(color2), 0.25));
    
    marquee(message, pos, getColorFromInteger(color1));
    showPixels();
    if(stop) {return;}
    //(largest_item - smallest_item) maps to (max-min)
    float ratio = (.5 - .05)/((120*.05) - .05);
    //(min + ratio*(value-smallest_item))
    float speedFactor = .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
    pos += speedFactor;
    if (pos >= (SIDE*map(strlen(message), 1, 63, 4, SIDE))+(strlen(message))*8)
        pos = map(strlen(message), 1, 63, (int)-(SIDE*.5), 0);
}


void showChar(char a, Point p, Color col) {
    for(int row=0; row<SIDE; row++)
        for(int bit=0; bit<8; bit++)
			if(((fontTable[((int)a)*8+row]>>(7-bit))&0x01)==1)
                for(int th=0; th<thickness+1; th++)
                    setPixelColor(p.x+bit, p.y+(SIDE-1-row), p.z-th, col);
}

void showChar(char a, Point origin, Point angle, Color col) {
    showChar(a, origin, Point(ceil((SIDE-1)*.5),0,0), angle, col);
}

void showChar(char a, Point origin, Point pivot, Point angle, Color col) {
    for(int row=0; row<SIDE; row++)
        for(int bit=0; bit<8; bit++)
			if(((fontTable[((int)a)*8+(7-row)]>>(7-bit))&0x01)==1)
                for(int th=0; th<thickness+1; th++)
                    setPixelColor(origin.x+((float)bit-pivot.x)*cos(angle.y)-th, 
                    origin.y+((float)row-pivot.y)*cos(angle.x), 
                    origin.z+((float)row-pivot.y)*sin(angle.x)+((float)bit-pivot.y)*sin(angle.y)-th, col);
}

void scrollText(String text, Point initialPosition, Color col) {
    for(int i=0; i<strlen(text); i++)
        showChar(text.charAt(i), Point(SIDE*i-initialPosition.x, initialPosition.y, initialPosition.z), col);
}

void marquee(String text, float pos, Color col) {
    for(int i=0; i<strlen(text); i++)
        showMarqueeChar(text.charAt(i), (int)pos - SIDE*i, col);
}

void showMarqueeChar(char a, int pos, Color col) {
    for(int row=0; row<SIDE; row++)
        for(int bit=0; bit<8; bit++)
			if(((fontTable[((int)a)*8+row]>>(7-bit))&0x01)==1) {
                for(int th=0; th<thickness+1; th++) {
                    if((pos-bit)<SIDE)
                        setPixelColor(SIDE-1-th, SIDE-1-row, pos-bit, col);
                    if(((pos-bit)>=SIDE)&&((pos-bit)<2*SIDE))
                        setPixelColor((SIDE-1-th)-(pos-bit-SIDE-th), SIDE-1-row, SIDE-1-th, col);
                    if(((pos-bit)>=2*SIDE)&&((pos-bit)<3*SIDE))
                        setPixelColor(th, SIDE-1-row, SIDE-1-(pos-bit-2*SIDE), col);
                    if((pos-bit)>3*SIDE)
                        setPixelColor(pos-bit-3*SIDE, SIDE-1-row, th, col);
                }
            }
}

/* ============================ Squarral functions ============================ */

#endif
