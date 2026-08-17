#ifdef L3D_UNITY_BUILD

void classicPlanes() {
	background(black); 
 
	if(CPframe%5==0) 
		CPpos+=CPinc;  
	//if((CPpos<=0)||(CPpos>=cube.size)) 
	if((CPpos<=0)||(CPpos>=SIDE)) 
		CPinc*=-1; 
	for(int x=0;x<SIDE;x++) {
		for(int y=0;y<SIDE;y++) {
			for(int z=0;z<SIDE;z++) {
				setPixelColor(CPpos, y, z, getColorFromInteger(colorMap((CPframe+50)%100,0,200)));  
				setPixelColor(x, CPpos, z, getColorFromInteger(colorMap((CPframe+100)%1000,0,500))); 
				setPixelColor(x, y, CPpos, getColorFromInteger(colorMap((CPframe+150)%500,0,1000)));  
			}
		}
	}
//    cube.show(); //the cube won't show any new information without this line -- always necessary
    CPframe++;  //this is how we're updating the color shift on each pass through the loop
	
	if(stop || stopDemo) {return;}
	showPixels();
	delay(speed);
	run = TRUE;	
}


/* ======================== 3D spiral mode routines ======================== */

#endif
