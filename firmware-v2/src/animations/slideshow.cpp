#ifdef L3D_UNITY_BUILD

void slideshow() {
	unsigned char i,j,k,z,c;
	int numSlides = sizeof table_3p /  8;
	int slideShowOrder[numSlides];
	j=0;
	for (i=0; i<numSlides; i++) { slideShowOrder[i] = i; }
	arrayShuffle(slideShowOrder, numSlides);
	
	for (c=0; c<8; c++) {
		roll_apeak_yz(j,3);
		if(++j > 3) j=0;
	}
	for (i=0; i<numSlides; i++) {
		for (j=0; j<8; j++) {
			for (k=0; k<8; k++) {
				trailColor = getPixelColor(7-k,7-j,0);
				if ((table_3p[slideShowOrder[i]][j]>>k)&1) {
					for (z=1; z<8; z++) {
						setPixelColor(7-k,7-j,0,black);
						setPixelColor(7-k,7-j,z,trailColor);
						if (z-1)
							setPixelColor(7-k,7-j,z-1,black);
						if(stop || stopDemo) { return;}
						showPixels();
						delay(speed/3);
					}
				}
			}
		}
		if(stop || stopDemo) { return;}
		delay(speed*50);
		j=0;
		for (c=0; c<4; c++) {
			roll_apeak_yz(j,3);
			if(++j > 3) j=0;
		}
	}
}

void roll_apeak_yz(unsigned char n, unsigned int speedFactor) {
	unsigned char i, j;
	
	for (i=0; i<8; i++) {
		for (j=0; j<8; j++) {
			trailColor = getColorFromInteger(Wheel(colorWheel));
			switch(n) {
				case 0:
					setPixelColor(j, 7, i, trailColor);
					setPixelColor(j, i, 0, black);
					break;
				case 1:
					setPixelColor(j, 7-i, 7, trailColor);
					setPixelColor(j, 7, i, black);
					break;
				case 2:
					setPixelColor(j, 0, 7-i, trailColor);
					setPixelColor(j, 8-i, 7, black);
					break;
				case 3:
					setPixelColor(j, i, 0, trailColor);
					setPixelColor(j, 0, 8-i, black);
					break;
			}
		}
		if(++colorWheel >= 256) colorWheel = 2;
		if(stop || stopDemo) { return;}
		showPixels();
		delay(speed/speedFactor);
	}
}



//Spark Cloud Mode
//Expect a string like thisto change the mode Mode: M:ZONE,S:30,B:120,C1:002BFF,C2:FF00DB,C3:FF4600,C4:23FF00,
//Or simply this to just update speed or brightness:        S:30,B:120,
//Received command should have an ending comma, it makes this code easier
//All colors are in hex format
//If the mode Mode is changing, return the enum value of the mode
//Else if only the speed or brightness is being updated return the following:
//returnValue = 1000 - command was recieved to update speed or brightness, but new values  are == to old values
//returnValue = 1001 - Brightness has been updated
//returnValue = 1002 - Speed has been updated

#endif
