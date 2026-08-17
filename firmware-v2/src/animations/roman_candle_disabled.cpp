#ifdef L3D_UNITY_BUILD

/* ========================= Roman Candle mode routines ======================== */
/*void romanCandle() {
	background(black);
	
	// ARRAY_SIZE = pow(2,M), where M=4
    for(int i=0;i<ARRAY_SIZE;i++) {
	if(switch1)
		real[i]=analogRead(MICROPHONE)-2048;  //adapted for the 0.8v bias point of the big cube 
	else {
		randomSeed(random(100) * analogRead(MICROPHONE));
		real[i] = random(100,4096);
	}
        delayMicroseconds(212);  
        imaginary[i]=0;
    }
 
    FFT(1, M, real, imaginary);
    for(int i=0;i<ARRAY_SIZE;i++) {
        imaginary[i]=sqrt(pow(imaginary[i],2)+pow(real[i],2));
        if(imaginary[i]>RCmaxVal)
            RCmaxVal=imaginary[i];
    }
    if(RCmaxVal>100)
        RCmaxVal--;
    int rocketsToFire=0;
    for(int i=0;i<ARRAY_SIZE/2;i++) {
		imaginary[i]=SIDE*imaginary[i]/RCmaxVal;
		if(imaginary[i]>SIDE/2)
			rocketsToFire++;
    }	
	
	for(int i=0;i<NUM_ROCKETS;i++) {
		rockets[i].yVel+=rockets[i].gravity;
		rockets[i].x+=rockets[i].xVel;
		rockets[i].y+=rockets[i].yVel;
		rockets[i].z+=rockets[i].zVel;
		if(rockets[i].col.green>5)
			rockets[i].col.green-=5;
		if(rockets[i].col.blue>5)
			rockets[i].col.blue-=5;
		if(rocketsToFire>0) {
			if(rockets[i].y<0) {
				rocketsToFire--;
				rockets[i].gravity=-0.01;
				rockets[i].y=0;
				//rockets[i].x=cube.center.x;
				rockets[i].x=(SIDE-1)/2;
				//rockets[i].z=cube.center.z;
				rockets[i].z=(SIDE-1)/2;
				rockets[i].col=Color(random(100),random(100),random(100));
				rockets[i].xVel=(float)random(10)/10;//((float)random(10)/10)-0.5;
				rockets[i].yVel=(float)random(10)/10;
				rockets[i].zVel=((float)random(5)/10);
			}
	    }
	}
	
	for(int i=0;i<(NUM_ROCKETS%2==0?NUM_ROCKETS:NUM_ROCKETS-1);i+=2) {
		//cube.line(rockets[i].x*cos(offset), rockets[i].y, rockets[i].z*sin(offset),rockets[i+1].x, rockets[i+1].y, rockets[i+1].z,rockets[i].col);
		drawLine(Point(rockets[i].x*cos(offset), rockets[i].y, rockets[i].z*sin(offset)), Point(rockets[i+1].x, rockets[i+1].y, rockets[i+1].z), rockets[i].col);
	}
	offset+=0.1;
	mirror();
	
	if(stop || stopDemo) {return;}
	//showPixels();
	strip.show();
	//delay(speed);
	run = TRUE;
}
void mirror() {
	int center = (SIDE-1)/2;
	for(int x=center;x<SIDE;x++)
		for(int y=0;y<SIDE;y++)
			for(int z=center;z<SIDE;z++) {
				//setPixelColor(cube.center.x-(x-cube.center.x),y,z, cube.getVoxel(x,y,z));
				//setPixelColor(cube.center.x-(x-cube.center.x),y,cube.center.z-(z-cube.center.z), cube.getVoxel(x,y,z));
				//setPixelColor(x,y,cube.center.z-(z-cube.center.z), cube.getVoxel(x,y,z));
				setPixelColor(center-(x-center),y,z, getPixelColor(x,y,z));
				setPixelColor(center-(x-center),y,center-(z-center), getPixelColor(x,y,z));
				setPixelColor(x,y,center-(z-center), getPixelColor(x,y,z));
			}
}

void initRockets() {
    for(int i=0;i<NUM_ROCKETS;i++) {
        rockets[i].gravity=-0.01;
        rockets[i].y=0;
	rockets[i].x=(SIDE-1)/2;
        rockets[i].z=(SIDE-1)/2;
        rockets[i].col=Color(255,0,0);
        rockets[i].xVel=-.5;//(random(10)/10)-0.5;
        rockets[i].yVel=0.25;//random(10)/10;
        rockets[i].zVel=0.25;//(random(10)/10)-0.5;
     }
}*/

#endif
