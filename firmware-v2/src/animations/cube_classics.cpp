#ifdef L3D_UNITY_BUILD

void runCubeClassics(uint32_t c, uint8_t mode) {
    int i, loop, numModes2Run, cubeMode;
	uint16_t iterations;
    colorWheel = random(256);
	
	int effectOrder[] = { UPNDOWN,			
						  ROPECOIL,		
						  WORMS,			
						  MOREPLANES,		
						  VOXELSLEFTBEHIND,
						  PLANESFILLCUBE,  
						  BUILDAWALL,	  	
						  VOXELRANDOM,	  	
						  SINEWAVE,		
						  LINESPIN,		
						  SINELINES,		
						  SPHEREMOVE,	  	
						  FIREWORKS,
						  RAND_PATH_AROUND,
						  PYRAMID,
						  FOLDER,
						  DIAGONAL_PLANES};
							  
							  
	if(mode == 0) {	//Run All and Shuffle them
		//for(i=0;i<13;i++) effectOrder[i]=i;
		numModes2Run = sizeof effectOrder / sizeof effectOrder[0];
		arrayShuffle(effectOrder, numModes2Run);
	}
	else {			//Run Single
		numModes2Run = 1;
	}
    
	for(i=0;i<numModes2Run;i++) {
		if(mode == 0) 	
			cubeMode = effectOrder[i];	// Run All Cube Modes
		else 
			cubeMode = currentModeID;	// Run Single Cube Mode
			
    	transitionAll(black, LINEAR);
		switch(cubeMode) {
			case UPNDOWN:
			{
			    iterations = 20;
			    if(0 == effect_z_updown(iterations, getColorFromInteger(c))) { return; }
				break;
			}
			case ROPECOIL:
			{
			    for(loop=0;loop<2;loop++) {
			        transitionAll(black, LINEAR);
			        if(0 == stackingRope(0, getColorFromInteger(c))) { return; }
			        transitionAll(black, LINEAR);
			        if(0 == stackingRope(1, getColorFromInteger(c))) { return; }
    			}
				break;
			}
			case WORMS:
			{
			    iterations = 100;
			    for(int axis=AXIS_X;axis<=AXIS_Z;axis++) {
			        if(0 == effect_wormsqueeze(2, axis, -1, iterations, getColorFromInteger(c))) { return; }
			    }
				break;
			}
			case MOREPLANES: 
			{
			    for(loop=0;loop<5;loop++) {
			        for(int axis=AXIS_X;axis<=AXIS_Z;axis++) {
			           if(0 == effect_planboing(axis, getColorFromInteger(c))) { return; }
			        }
			    }
				break;
			}
			case VOXELSLEFTBEHIND:
			{
			    int suspendTime = 1300;
			    for(loop=0;loop<5;loop++) {
			        for(int axis=AXIS_X;axis<=AXIS_Z;axis++) {
			            for(int j=0;j<4;j++) {
			                if(0 == effect_axis_updown_randsuspend(axis, suspendTime,j%2,getColorFromInteger(c))) { return; }
			            }
			        }
			    }
				break;
			}
			case PLANESFILLCUBE:
			{
				for(loop=0;loop<5;loop++) {
			    	for(int axis=AXIS_Z;axis>=AXIS_X;axis--) {
			            for(int j=0;j<4;j++) {
			                if(0 == effect_loadbar(axis, getColorFromInteger(c))) { return; }
			            }
			    	}
			    }
				break;
			}
			case BUILDAWALL:
			{
				for(loop=0;loop<3;loop++) {
			    	for(int axis=AXIS_X;axis<=AXIS_Z;axis++) {
			    	    for(int mode=1;mode<=2;mode++) {
			                for(int origin=0;origin<=1;origin++) {
			                    if(0 == effect_boxside_randsend_parallel (axis, origin, mode, getColorFromInteger(c))) { return; }
			                    delay(1500);
			                }
			    	    }
			    	}
				}
				break;
			}
			case VOXELRANDOM:
			{
				iterations = 120;
			    for(int mode=0;mode<=1;mode++) {
			        for(int drawmode=1;drawmode<=3;drawmode++) {
			            if(0 == boingboing(iterations, mode, drawmode, getColorFromInteger(c))) { return; }
			        }
			    }
				break;
			}
			case SINEWAVE:
			{
			    iterations = 2000;
			    if(0 == ripples (iterations, getColorFromInteger(c))) { return; }
				break;
			}
			case LINESPIN:
			{
			    iterations = 1200;
			    for(int axis=AXIS_X;axis<=AXIS_Z;axis++) {
			        if(0 == linespin (iterations, axis, getColorFromInteger(c))) { return; }
			    }
				break;
			}
			case SINELINES:
			{
			    iterations = 1200;
			    for(int axis=AXIS_X;axis<=AXIS_Z;axis++) {
			        if(0 == sinelines (iterations, axis, getColorFromInteger(c))) { return; }
			    }
				break;
			}
			case SPHEREMOVE:
			{
			    iterations = 1500;
			    if(0 == spheremove (iterations,  getColorFromInteger(c))) { return; }
				break;
			}
			case FIREWORKS:
			{
			    iterations = 20;
			    if(0 == fireworks(iterations, 50, getColorFromInteger(c))) { return; }
				break;
			}
			case RAND_PATH_AROUND:
			{
				iterations = 100;
				if(0 == effect_rand_patharound(iterations, getColorFromInteger(c))) { return; }
				break;
			}
			case PYRAMID:
			{
				if(0 == zoom_pyramid(getColorFromInteger(c))) { return; }
				if(0 == zoom_pyramid_clear(getColorFromInteger(c))) { return; }
				break;
			}
			case FOLDER:
			{
				iterations = 50;
				uint8_t firstSide = random(6); 
				uint8_t nextSide = 0;
				for(int i=0;i<iterations;i++) {
					nextSide = findRandomNextSide(firstSide);
					if(0 == folder(firstSide, nextSide, getColorFromInteger(c))) { return; }
					firstSide = nextSide;
				}
				break;
			}
			case DIAGONAL_PLANES:
			default:
			{
				for(int8_t mode=0;mode<=1;mode++) {
					for(int8_t cubeEdge=0;cubeEdge<sizeof cubeEdgeVertices / sizeof cubeEdgeVertices[0];cubeEdge++) {
						setCubeVertices(cubeEdge);
						//char tempBuf1[60];
						//sprintf(tempBuf1,"%i A(%1.0f,%1.0f,%1.0f) B(%1.0f,%1.0f,%1.0f)",cubeEdge, cubeVerticesA.x,cubeVerticesA.y,cubeVerticesA.z,cubeVerticesB.x,cubeVerticesB.y,cubeVerticesB.z);
						//Particle.publish(tempBuf1);y
						if(0 == diagonal_planes(cubeVerticesA, cubeVerticesB,  mode, getColorFromInteger(c))) { return; }
					}
				}
				/*
				if(0 == diagonal_planes(Point(0,0,0), Point(7,0,0), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(0,0,0), Point(0,7,0), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(0,0,0), Point(0,0,7), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(7,7,0), Point(0,7,0), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(0,7,7), Point(0,7,0), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(7,0,7), Point(0,0,7), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(0,7,7), Point(0,0,7), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(7,0,7), Point(7,0,0), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(7,7,0), Point(7,0,0), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(0,7,7), Point(7,7,7), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(7,7,0), Point(7,7,7), 0, getColorFromInteger(c))) { return; }
				if(0 == diagonal_planes(Point(7,0,7), Point(7,7,7), 0, getColorFromInteger(c))) { return; }
				*/

				break;
			}
		}
	}
    run = TRUE;
}

uint8_t findRandomNextSide(uint8_t thisSide) {
	for(int i=0;i<sizeof(validSideToFlipTo)/sizeof(validSideToFlipTo[0]);i++) {
		if(validSideToFlipTo[i][0] == thisSide) {
			return validSideToFlipTo[i][random(1,5)];
		}
	}
	return 0;
}

int effect_z_updown (int iterations, Color col) {
	uint8_t positions[64];
	uint8_t destinations[64];
	int i,y,move;
	int speedFactor = 10;
	
	if(switch1) col = getColorFromInteger(Wheel(colorWheel+=4));
    //else if(switch2) col = cheerLightsColor;
        
	for (i=0; i<64; i++) {
		positions[i] = 4;
		destinations[i] = rand()%8;
	}

	for (move=0; move<4; move++)	{
		if(0 == effect_z_updown_move(positions, destinations, AXIS_Z, col)) return 0 ;
		showPixels();
		if(stop || stopDemo) {return 0;}
		delay(speed*speedFactor);
	}
	
	for (i=0;i<iterations;i++) {
	    for (y=0;y<32;y++) {
			destinations[rand()%64] = rand()%8;
		}
		for (move=0;move<5;move++) {
			if(0 == effect_z_updown_move(positions, destinations, AXIS_Z, col)) return 0;
			showPixels();
		    if(stop || stopDemo) {return 0;}
			delay(speed*speedFactor);
		}
        if(stop || stopDemo) {return 0;}
	//	delay(setDdelay);

		
	}
	return 1;
}

int effect_z_updown_move (unsigned char positions[64], unsigned char destinations[64], char axis, Color col) {
	int px;
	// Some effects can render on different axis
	// for example send pixels along an axis
	//const char AXIS_Z=0x7a;
	
	for (px=0; px<64; px++)	{
		if (positions[px]<destinations[px])	{
			positions[px]++;
		}
		if (positions[px]>destinations[px])	{
			positions[px]--;
		}
	}
	if(stop || stopDemo) {return 0;}
    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=4));
    //else if(switch2) col = cheerLightsColor;
	if(0 == draw_positions_axis (AXIS_Z, positions,0,col)) return 0;
	
	return 1;
}

int draw_positions_axis (char axis, unsigned char positions[64], int invert, Color col) {
	int x, y, p;
	
	background(black);
	
	for (x=0; x<SIDE; x++)	{
		for (y=0; y<SIDE; y++)	{
			if (invert)	{
				p = (7-positions[(x*8)+y]);
			} else {
				p = positions[(x*8)+y];
			}
			if (axis == AXIS_Y) {
			    setPixelColor(x,y,p,col); //Z
			}
			if (axis == AXIS_Z)	{
			    setPixelColor(x,p,y,col); //Y
			}
			if (axis == AXIS_X)	{
                setPixelColor(p,y,x,col);
			}
            if(stop || stopDemo) {return 0;}
		}
	}
	return 1;
}
 

/**
 * @param mode == 0: gradient color rainbow as the rope stacks
 *        mode == 1: Each side is a random color
 */
int stackingRope(int mode, Color col) {
    int x, y, z;
    uint8_t sideColor1, sideColor2, sideColor3, sideColor4;
    
    if(mode == 1) {
        sideColor1 = random(256);
        sideColor2 = sideColor1 + 60;
        sideColor3 = sideColor2 + 60;
        sideColor4 = sideColor3 + 60;
    }
    
    for(y=0;y<SIDE;y++) {
        for(z=0;z<SIDE;z++) {
            if(stop || stopDemo) {return 0;}
            if(mode == 1) col = getColorFromInteger(Wheel(sideColor1));
            else if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
            //else if(switch2) col = cheerLightsColor;
            setPixelColor(0,y,z,col);
            showPixels();
            delay(speed);
        }
        for(x=1;x<SIDE;x++) {
            if(stop || stopDemo) {return 0;}
            if(mode == 1) col = getColorFromInteger(Wheel(sideColor2));
            else if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
            //else if(switch2) col = cheerLightsColor;
            setPixelColor(x,y,SIDE-1,col);
            showPixels();
            delay(speed);
        }
        for(z=SIDE-2;z>=0;z--) {
            if(stop || stopDemo) {return 0;}
            if(mode == 1) col = getColorFromInteger(Wheel(sideColor3));
            else if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
            //else if(switch2) col = cheerLightsColor;
            setPixelColor(SIDE-1,y,z,col);
            showPixels();
            delay(speed);
        }
         for(x=SIDE-2;x>=1;x--) {
            if(stop || stopDemo) {return 0;}
            if(mode == 1) col = getColorFromInteger(Wheel(sideColor4));
            else if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
            //else if(switch2) col = cheerLightsColor;
            setPixelColor(x,y,0,col);
            showPixels();
            delay(speed);
        }
    }
	return 1;
}

/**
 * Assumes the four side planes are alrady drawn
 * TODO: Finish the code to make it actually work
 */
/*int collapsingSides(Color col) {
    int x, y, z;
    
    Color currentColor = getPixelColor(SIDE/2,0,0);
    for(z=1;z<SIDE-2;z++) {
        for(y=SIDE-2;y>=0;y--) {
            for(x=1;x<SIDE-2;x++) {
                drawLine(Point(x,y-1,z-1),Point(SIDE-1,0,z),black);
                drawLine(Point(x,y,z),Point(SIDE-1,0,z),currentColor);
                if(stop || stopDemo) {return 0;}
            }
        }
        showPixels();
        delay(speed);
    }
	return 1;
}*/

int effect_wormsqueeze (int size, int axis, int direction, int iterations, Color col) {
	int x, y, i,j,k, dx, dy;
	int cube_size;
	int origin = 0;
	
	if (direction == -1)
		origin = 7;
	
	cube_size = 8-(size-1);
	
	x = rand()%cube_size;
	y = rand()%cube_size;
	
	for (i=0; i<iterations; i++) {
		dx = ((rand()%3)-1);
		dy = ((rand()%3)-1);
	
		if ((x+dx) > 0 && (x+dx) < cube_size)
			x += dx;
			
		if ((y+dy) > 0 && (y+dy) < cube_size)
			y += dy;
	
		if(0 == shift(axis, direction)) return 0;
		
        if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
		for (j=0; j<size;j++) {
			for (k=0; k<size;k++) {
				if (axis == AXIS_Y) //z
					setPixelColor(x+j,y+k,origin,col);
					
				if (axis == AXIS_Z) //Y
					setPixelColor(x+j,origin,y+k,col);
					
				if (axis == AXIS_X)
					setPixelColor(origin,y+j,x+k,col);
			
				showPixels();
                if(stop || stopDemo) {return 0;}
			}
		}
		delay(speed*10);
		if(i==iterations-1)
		    transitionAll(black, POLAR);
	}
	return 1;
}

// Shift the entire contents of the cube along an axis
// This is great for effects where you want to draw something
// on one side of the cube and have it flow towards the other
// side. Like rain flowing down the Z axiz.
int shift (char axis, int direction) {
	int i, x ,y;
	int ii, iii;
	Color state;

	for (i = 0; i < SIDE; i++)	{
		if (direction == -1) {
			ii = i;
		} 
		else {
			ii = (7-i);
		}	
	
	    for (x = 0; x < SIDE; x++)	{
			for (y = 0; y < SIDE; y++)	{
				if (direction == -1) {
					iii = ii+1;
				} 
				else {
					iii = ii-1;
				}
				
				if (axis == AXIS_Y)	{ //Z
					state = getPixelColor(x,y,iii);
					setPixelColor(x,y,ii,state);
				}
				
				if (axis == AXIS_Z)	{  //Y
					state = getPixelColor(x,iii,y);
					setPixelColor(x,ii,y,state);
				}
				
				if (axis == AXIS_X)	{
					state = getPixelColor(iii,y,x);
					setPixelColor(ii,y,x,state);
				}
				if(stop || stopDemo) {return 0;}
			}
		}
	}
	
	if (direction == -1) {
		i = 7;
	} 
	else {
		i = 0;
	}	
	
	for (x = 0; x < SIDE; x++) {
	    for (y = 0; y < SIDE; y++)	{
			if (axis == AXIS_Y) //Z
				setPixelColor(x,y,i,black);
			if (axis == AXIS_Z) //Y
				setPixelColor(x,i,y,black);
			if (axis == AXIS_X)
				setPixelColor(i,y,x,black);
			if(stop || stopDemo) {return 0;}
		}
	}
	return 1;
}

// Draw a plane on one axis and send it back and forth once.
int effect_planboing (int plane, Color col) {
	int speedFactor = 4;
	int i;

	for (i=0;i<SIDE;i++) {
	    background(black);
		if(switch1) col = getColorFromInteger(Wheel(colorWheel+=4));
        //else if(switch2) col = cheerLightsColor;
		setplane(plane, i, col);
        showPixels();
        if(stop || stopDemo) {return 0;}
		delay(speed*speedFactor);
	}
	
	for (i=7;i>=0;i--) {
		background(black);
		if(switch1) col = getColorFromInteger(Wheel(colorWheel+=4));
        //else if(switch2) col = cheerLightsColor;
        setplane(plane,i, col);
        showPixels();
        if(stop || stopDemo) {return 0;}
		delay(speed*speedFactor);
	}
	transitionAll(black, POLAR);
	return 1;
}

void setplane (char axis, unsigned char i, Color col) {
	switch (axis)
    {
        case AXIS_X:
            setplane_x(i, col);
            break;
        case AXIS_Y:
            setplane_y(i, col);
            break;
        case AXIS_Z:
            setplane_z(i, col);
            break;
    }
}

// Sets all voxels along a X/Y plane at a given point
// on axis Z
void setplane_z (int z, Color col) {
	int x,y;
	if (z>=0 && z<SIDE) {
	for (x=0;x<SIDE;x++) 
	    for (y=0;y<SIDE;y++)
	        setPixelColor(x,y,z,col);
	}
}

void setplane_x (int x, Color col) {
	int y,z;
	if (x>=0 && x<SIDE) {
		for (z=0;z<SIDE;z++)
			for (y=0;y<SIDE;y++)
                 setPixelColor(x,y,z,col);
	}
}

void setplane_y (int y, Color col) {
	int x,z;
	if (y>=0 && y<SIDE) {
	    for (x=0;x<SIDE;x++)
		    for (z=0;z<SIDE;z++)
                setPixelColor(x,y,z,col);
	} 
}

int effect_telcstairs (int invert, int val, Color col) {
	int x;

	//background(black);
	if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
    //else if(switch2) col = cheerLightsColor;
	if(invert) {
		for(x = SIDE*2; x >= 0; x--) {
			x = effect_telcstairs_do(x,val,col);
			if(-2 == x) return 0;
		}
	} 
	else {
		for(x = 0; x < SIDE*2; x++) {
			x = effect_telcstairs_do(x,val,col);
			if(-2 == x) return 0;
		}
	}
	return 1;
}


int effect_telcstairs_do(int x, int val, Color col) {
	int speedFactor = 2;
	int y,z;
	
	for(y = 0, z = x; y <= z; y++, x--)	{
		if(x < SIDE && y < SIDE) {
			setPixelColor(x,z,y,col);
		}
	}
	showPixels();
	if(stop || stopDemo) {return 0;}
	delay(speed*speedFactor);
	return z;
}

/**
 * Planes advancing in a diagonal fashion
 * Given two points that make up one of the box edges - this is our starting edge
 * Then draw a diagonal plane passing through this line
 * The plane is drawn using the drawline() function
 * @param mode = 0: planes fill the cube, then get blacked out one by one. 
 *        mode = 1: planes move one by one through the cube (previous plane is blacked out)
 *
 *  Possible Given Pnts   (Line Start Pnt) (Line End Pnt)		pnt1 	pnt2
 *  A(0,0,0)  B(7,0,0) -> (  0, 0-4, 0+4)  (  0, 0+4, 0-4)  sweep x++	z++	y++	
 *  A(0,0,0)  B(0,7,0) -> (0-4,   0, 0+4)  (0+4,   0, 0-4)  sweep y++	z++	x++	z
 *  A(0,0,0)  B(0,0,7) -> (0-4, 0+4,   0)  (0+4, 0-4,   0)  sweep z++	y++	x++	
 
 *  A(7,7,0)  B(0,7,0) -> (0  , 7+4, 0+4)  (0  , 7-4, 0-4)  sweep x++	z++	y--	
 *  A(0,7,7)  B(0,7,0) -> (0+4, 7+4,   0)  (0-4, 7-4,   0)  sweep z++	x++	y--	
 *  A(7,0,7)  B(0,0,7) -> (  0, 0+4, 7+4)  (  0, 0-4, 7-4)  sweep x++	y++	z--	
 *  A(0,7,7)  B(0,0,7) -> (0+4,   0, 7+4)  (0-4,   0, 7-4)  sweep y++	x++	z--	x
 *  A(7,0,7)  B(7,0,0) -> (7+4, 0+4,   0)  (7-4, 0-4,   0)  sweep z++	y++	x--	
 *  A(7,7,0)  B(7,0,0) -> (7+4,   0, 0+4)  (7-4,   0, 0-4)  sweep y++	z++	x--	z
	
 *  A(0,7,7)  B(7,7,7) -> (  0, 7+4, 7-4)  (  0, 7-4, 7+4)  sweep x++	z--     y--     	
 *  A(7,7,0)  B(7,7,7) -> (7+4, 7-4,   0)  (7-4, 7+4,   0)  sweep z++	y--     x-- 	    	
 *  A(7,0,7)  B(7,7,7) -> (7+4,   0, 7-4)  (7-4,   0, 7+4)  sweep y++	z--     x--     z	
 *  
**/
int diagonal_planes(Point pA, Point pB, int8_t mode, Color col) {
	int8_t blackOutAtEnd, blackOutDuring;
	int moveIdx, sweepAxis;
	int moveIdx1 = 0;
	int moveIdx2 = 0;
	int firstStart  = 4;
	int secondStart = 4;
	int pntADir = 1;
	int pntBDir = -1;
	int ax,ay,az,bx,by,bz;
	Color color = col;
	
	//if(((pA.x == pA.y)&&(pA.x == pA.z)) || ((pB.x == pB.y)&&(pB.x == pB.z)))
	if((pA.x == pA.y)&&(pA.x == pA.z)) {		//PntA = (0,0,0)
		firstStart = -4;
		pntBDir = 1;
	} else if ((pB.x == pB.y)&&(pB.x == pB.z)) {	//PntB = (7,7,7)
		secondStart = -4;
		pntADir = -1;
	}
	
	for(blackOutAtEnd=1;blackOutAtEnd>=mode;blackOutAtEnd--) {
		for (moveIdx=0;moveIdx<15;moveIdx++) {
			for(blackOutDuring=0;blackOutDuring<=mode;blackOutDuring++) {
				if(blackOutDuring == 1 || blackOutAtEnd == 0) { color = black; }
				else if(switch1) {color = getColorFromInteger(Wheel(colorWheel+=2));}
				else { color = col;} 
				for (sweepAxis=0;sweepAxis<8;sweepAxis++) {
					//Look at the two coordinates, the axis that are not equal is the axis that we sweep across
					if(pA.x != pB.x) {
						if(pA==Point(7.0,0.0,7.0) && pB==Point(0.0,0.0,7.0)) {
							moveIdx1 = moveIdx;
							moveIdx2 = 0;
						} else {
							moveIdx1 = 0;
							moveIdx2 = moveIdx;
						}
						ax = sweepAxis;
						ay = ((int)pA.y & (int)pB.y) + firstStart + (pntADir*moveIdx1);
						az = ((int)pA.z & (int)pB.z) + secondStart + (pntADir*moveIdx2);
						bx = sweepAxis;
						by = ((int)pA.y & (int)pB.y) + (-1*firstStart) + (pntBDir*moveIdx2);
						bz = ((int)pA.z & (int)pB.z) + (-1*secondStart) + (pntBDir*moveIdx1);
					} else if(pA.y != pB.y) {	
						if(pA==Point(0.0,7.0,7.0) && pB==Point(0.0,0.0,7.0)){ 
							moveIdx1 = moveIdx;
							moveIdx2 = 0;
						} else {
							moveIdx1 = 0;
							moveIdx2 = moveIdx;
						}
						ax = ((int)pA.x & (int)pB.x) + firstStart + (pntADir*moveIdx1);
						ay = sweepAxis;
						az = ((int)pA.z & (int)pB.z) + secondStart + (pntADir*moveIdx2);
						bx = ((int)pA.x & (int)pB.x) + (-1*firstStart) + (pntBDir*moveIdx2);
						by = sweepAxis;
						bz = ((int)pA.z & (int)pB.z) + (-1*secondStart) + (pntBDir*moveIdx1);
					} else {
						if(pA==Point(0.0,7.0,7.0) && pB==Point(0.0,7.0,0.0)) { 
							moveIdx1 = moveIdx;
							moveIdx2 = 0;
						} else {
							moveIdx1 = 0;
							moveIdx2 = moveIdx;
						}
						ax = ((int)pA.x & (int)pB.x) + firstStart + (pntADir*moveIdx1);
						ay = ((int)pA.y & (int)pB.y) + secondStart + (pntADir*moveIdx2);
						az = sweepAxis;
						bx = ((int)pA.x & (int)pB.x) + (-1*firstStart) + (pntBDir*moveIdx2);
						by = ((int)pA.y & (int)pB.y) + (-1*secondStart) + (pntBDir*moveIdx1);
						bz = sweepAxis;
					}
					drawLine(Point((float)ax,(float)ay,(float)az), Point((float)bx,(float)by,(float)bz), color);
				}
				showPixels();
				if(stop || stopDemo) {return 0;}
				if(blackOutDuring == 0)
					delay(speed*5);
			}
		}
	} 
	return 1;
}


void setCubeVertices(int8_t index) {
	cubeVerticesB.z = (1 == ((cubeEdgeVertices[index] >> 0) & 1)) ? 7.0 : 0.0; 
	cubeVerticesB.y = (1 == ((cubeEdgeVertices[index] >> 1) & 1)) ? 7.0 : 0.0; 
	cubeVerticesB.x = (1 == ((cubeEdgeVertices[index] >> 2) & 1)) ? 7.0 : 0.0; 
	cubeVerticesA.z = (1 == ((cubeEdgeVertices[index] >> 3) & 1)) ? 7.0 : 0.0; 
	cubeVerticesA.y = (1 == ((cubeEdgeVertices[index] >> 4) & 1)) ? 7.0 : 0.0; 
	cubeVerticesA.x = (1 == ((cubeEdgeVertices[index] >> 5) & 1)) ? 7.0 : 0.0; 
}

int folder(uint8_t sideStart, uint8_t sideEnd, Color col) {
	int moveIdx, blackOut, sweepAxis;
	int ax,ay,az,bx,by,bz;
	
	for(moveIdx=0;moveIdx<15;moveIdx++) {
		for(blackOut=0;blackOut<2;blackOut++) {
			for (sweepAxis=0;sweepAxis<8;sweepAxis++) {
				switch(sideStart) {
					case cubeTop:
						ay = 7;
						by = 7-moveIdx;
						switch(sideEnd) {
							case cubeLeft:
								ax = 0;
								az = sweepAxis;
								bx = 14-moveIdx;
								bz = sweepAxis;
								break;
							case cubeRight:
								ax = 7;
								az = sweepAxis;
								bx = -7+moveIdx;
								bz = sweepAxis;
								break;
							case cubeFront:
								ax = sweepAxis;
								az = 7;
								bx = sweepAxis;
								bz = -7+moveIdx;
								break;
							case cubeBack:
								ax = sweepAxis;
								az = 0;
								bx = sweepAxis;
								bz = 14-moveIdx;
								break;
						}
						break;
					case cubeBottom:
						ay = 0;
						by = moveIdx;
						switch(sideEnd) {
							case cubeLeft:
								ax = 0;
								az = sweepAxis;
								bx = 14-moveIdx;
								bz = sweepAxis;
								break;
							case cubeRight:
								ax = 7;
								az = sweepAxis;
								bx = -7+moveIdx;
								bz = sweepAxis;
								break;
							case cubeFront:
								ax = sweepAxis;
								az = 7;
								bx = sweepAxis;
								bz = -7+moveIdx;
								break;
							case cubeBack:
								ax = sweepAxis;
								az = 0;
								bx = sweepAxis;
								bz = 14-moveIdx;
								break;
						}
						break;
					case cubeLeft:
						ax = 0;
						bx = moveIdx;
						switch(sideEnd) {
							case cubeTop:
								ay = 7;
								az = sweepAxis;
								by = -7+moveIdx;
								bz = sweepAxis;
								break;
							case cubeBottom:
								ay = 0;
								az = sweepAxis;
								by = 14-moveIdx;
								bz = sweepAxis;
								break;
							case cubeFront:
								ay = sweepAxis;
								az = 7;
								by = sweepAxis;
								bz = -7+moveIdx;
								break;
							case cubeBack:
								ay = sweepAxis;
								az = 0;
								by = sweepAxis;
								bz = 14-moveIdx;
								break;
						}
						break;
					case cubeRight:
						ax = 7;
						bx = 7-moveIdx;
						switch(sideEnd) {
							case cubeTop:
								ay = 7;
								az = sweepAxis;
								by = -7+moveIdx;
								bz = sweepAxis;
								break;
							case cubeBottom:
								ay = 0;
								az = sweepAxis;
								by = 14-moveIdx;
								bz = sweepAxis;
								break;
							case cubeFront:
								ay = sweepAxis;
								az = 7;
								by = sweepAxis;
								bz = -7+moveIdx;
								break;
							case cubeBack:
								ay = sweepAxis;
								az = 0;
								by = sweepAxis;
								bz = 14-moveIdx;
								break;
						}
						break;
					case cubeFront:
						az = 7;
						bz= 7-moveIdx;
						switch(sideEnd) {
							case cubeLeft:
								ax = 0;
								ay = sweepAxis;
								bx = 14-moveIdx;
								by = sweepAxis;
								break;
							case cubeRight:
								ax = 7;
								ay = sweepAxis;
								bx = -7.0+moveIdx;
								by = sweepAxis;
								break;
							case cubeTop:
								ax = sweepAxis;
								ay = 7;
								bx = sweepAxis;
								by = -7+moveIdx;
								break;
							case cubeBottom:
								ax = sweepAxis;
								ay = 0;
								bx = sweepAxis;
								by = 14-moveIdx;
								break;
						}
						break;
					case cubeBack:
						az = 0;
						bz= moveIdx;
						switch(sideEnd) {
							case cubeLeft:
								ax = 0;
								ay = sweepAxis;
								bx = 14-moveIdx;
								by = sweepAxis;
								break;
							case cubeRight:
								ax = 7;
								ay = sweepAxis;
								bx = -7+moveIdx;
								by = sweepAxis;
								break;
							case cubeTop:
								ax = sweepAxis;
								ay = 7;
								bx = sweepAxis;
								by = -7+moveIdx;
								break;
							case cubeBottom:
								ax = sweepAxis;
								ay = 0;
								bx = sweepAxis;
								by = 14-moveIdx;
								break;
						}
						break;
				}
				if(blackOut == 0) {
					if(switch1) {col = getColorFromInteger(Wheel(colorWheel+=4));}
					drawLine(Point((float)ax,(float)ay,(float)az), Point((float)bx,(float)by,(float)bz), col);
				}
				else
					drawLine(Point((float)ax,(float)ay,(float)az), Point((float)bx,(float)by,(float)bz), black);
			}
			
			if(stop || stopDemo) {return 0;}
			if(blackOut == 0) {
				showPixels();
				delay(speed*3);
			}
		}
	}
	return 1;
}

int effect_axis_updown_randsuspend (char axis, int sleep, int invert, Color col) {
	int speedFactor = 2;
	int i,px;
	uint8_t positions[PIXELS_PER_PANEL];
	uint8_t destinations[PIXELS_PER_PANEL];
	
    // Set 64 random positions
	for (i=0; i<PIXELS_PER_PANEL; i++) {
		positions[i] = 0; // Set all starting positions to 0
		destinations[i] = rand()%SIDE;
	}

    // Loop 8 times to allow destination 7 to reach all the way
	for (i=0; i<SIDE; i++)	{
        // For every iteration, move all position one step closer to their destination
		for (px=0; px<PIXELS_PER_PANEL; px++)	{
			if (positions[px]<destinations[px])	{
				positions[px]++;
			}
		}
		if(switch1) col = getColorFromInteger(Wheel(colorWheel+=8));
        //else if(switch2) col = cheerLightsColor;
        // Draw the positions and take a nap
		if(0 == draw_positions_axis (axis, positions,invert,col)) {
		    transitionAll(black, LINEAR);
		    return 0;
		}
		showPixels();
		if(stop || stopDemo) {return 0;}
	    /*
		if(stop) {
		    transitionAll(black, LINEAR);
	        demo = FALSE; 
	        return 0;
	    }
        if(demo) {
            if(millis() - lastModeSet > twoMinuteInterval) {
    		    transitionAll(black, LINEAR);
                return 0;
            }
        }
		*/
        delay(speed*speedFactor);
	}
	
    // Set all destinations to 7 (opposite from the side they started out)
	for (i=0; i<PIXELS_PER_PANEL; i++) {
		destinations[i] = 7;
	}
	
    // Suspend the positions in mid-air for a while
	delay(sleep);
	
	if(switch1) col = getColorFromInteger(Wheel(colorWheel+=8));
    //else if(switch2) col = cheerLightsColor;
    // Then do the same thing one more time
	for (i=0; i<SIDE; i++)	{
		for (px=0; px<PIXELS_PER_PANEL; px++)	{
			if (positions[px]<destinations[px])	{
				positions[px]++;
			}
			if (positions[px]>destinations[px])	{
				positions[px]--;
			}
		}
		if(0 == draw_positions_axis (axis, positions,invert,col)) {
		    transitionAll(black, LINEAR);
		    return 0;
		}
		showPixels();
		if(stop || stopDemo) {return 0;}
		/*
	    if(stop) {
		    transitionAll(black, LINEAR);
	        demo = FALSE; 
	        return 0;
	    }
        if(demo) {
            if(millis() - lastModeSet > twoMinuteInterval) {
    		    transitionAll(black, LINEAR);
                return 0;
            }
        }
		*/
	    delay(speed*speedFactor);
	}
    //transitionAll(black, POLAR);
	return 1;
}

// Light all leds layer by layer,
// then unset layer by layer
int effect_loadbar(int axis, Color col) {
    int i;
    int speedFactor = 3;
    
	//background(black);

	for (i=0;i<SIDE;i++) {
	    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=4));
        //else if(switch2) col = cheerLightsColor;
    	setplane(axis,i,col);
        showPixels();
        if(stop || stopDemo) {return 0;}
    	delay(speed*speedFactor);
	}
	
	delay(speed*3);
	
	for (i=0;i<SIDE;i++) {
		if(i==SIDE-1)
		    transitionAll(black, POLAR);
		else
    	    setplane(axis,i,black);
        showPixels();
        if(stop || stopDemo) {return 0;}
    	delay(speed*speedFactor);
	}
    //transitionAll(black, POLAR);
	return 1;
}

int effect_boxside_randsend_parallel (char axis, int origin, int mode, Color col) {
	int speedFactor = 2;
	int i, done;
	int notdone = 1;
	int notdone2 = 1;
	int sent = 0;
	uint8_t cubepos[PIXELS_PER_PANEL];
	uint8_t pos[PIXELS_PER_PANEL];
	
	for (i=0;i<PIXELS_PER_PANEL;i++) {
	    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=4));
        //else if(switch2) col = cheerLightsColor;
		pos[i] = 0;
	}
	
	while (notdone)	{
		if (mode == 1) {
			notdone2 = 1;
			while (notdone2 && sent<PIXELS_PER_PANEL)	{
				i = rand()%PIXELS_PER_PANEL;
				if (pos[i] == 0) {
					sent++;
					pos[i] += 1;
					notdone2 = 0;
				}
			}
		} 
		else if (mode == 2)	{
			if (sent<PIXELS_PER_PANEL) {
				pos[sent] += 1;
				sent++;
			}
		}
		
		done = 0;
		for (i=0;i<PIXELS_PER_PANEL;i++) {
			if (pos[i] > 0 && pos[i] <7) {
				pos[i] += 1;
			}
				
			if (pos[i] == 7)
				done++;
		}
		
		if (done == PIXELS_PER_PANEL)
			notdone = 0;
		
		for (i=0;i<PIXELS_PER_PANEL;i++) {
			if (origin == 0) {
				cubepos[i] = pos[i];
			} 
			else {
				cubepos[i] = (7-pos[i]);
			}
		}
		//delay(speed);
		if(0 == draw_positions_axis(axis,cubepos,0,col)) {
		    transitionAll(black, LINEAR);
		    return 0;
		}
		showPixels();
		if(stop || stopDemo) {return 0;}
		/*
	    if(stop) {
		    transitionAll(black, LINEAR);
	        demo = FALSE; 
	        return 0;
	    }
        if(demo) {
            if(millis() - lastModeSet > twoMinuteInterval) {
    		    transitionAll(black, LINEAR);
                return 0;
            }
        }
		*/
		delay(speed*speedFactor);
	}
	return 1;
}

// Big ugly function :p but it looks pretty
int boingboing(uint16_t iterations, unsigned char mode, unsigned char drawmode, Color col) {
    int speedFactor = 4;
	int x, y, z;		// Current coordinates for the point
	int dx, dy, dz;	// Direction of movement
	int lol, i;		// lol?
	uint8_t crash_x, crash_y, crash_z;

	background(black);		// Blank the cube
	
	y = rand()%SIDE;
	x = rand()%SIDE;
	z = rand()%SIDE;

	// Coordinate array for the snake.
	int snake[8][3];
	for (i=0;i<SIDE;i++) {
		snake[i][0] = x;
		snake[i][1] = y;
		snake[i][2] = z;
	}
	
	dx = 1;
	dy = 1;
	dz = 1;
	
	while(iterations) {
		crash_x = 0;
		crash_y = 0;
		crash_z = 0;
	
		// Let's mix things up a little:
		if (rand()%3 == 0) {
			// Pick a random axis, and set the speed to a random number.
			lol = rand()%3;
			if (lol == 0) dx = rand()%3 - 1;
			if (lol == 1) dy = rand()%3 - 1;
			if (lol == 2) dz = rand()%3 - 1;
		}

	    // The point has reached 0 on the x-axis and is trying to go to -1
        // aka a crash
		if (dx == -1 && x == 0)	{
			crash_x = 0x01;
			if (rand()%3 == 1) dx = 1;
			else dx = 0;
		}
		
        // y axis 0 crash
		if (dy == -1 && y == 0) {
			crash_y = 0x01;
			if (rand()%3 == 1) dy = 1;
			else dy = 0;
		}
		
        // z axis 0 crash
		if (dz == -1 && z == 0) {
			crash_z = 0x01;
			if (rand()%3 == 1) dz = 1;
			else dz = 0;
		}
	    
        // x axis 7 crash
		if (dx == 1 && x == 7) {
			crash_x = 0x01;
			if (rand()%3 == 1) dx = -1;
			else dx = 0;
		}
		
        // y axis 7 crash
		if (dy == 1 && y == 7) {
			crash_y = 0x01;
			if (rand()%3 == 1) dy = -1;
			else dy = 0;
		}
		
        // z azis 7 crash
		if (dz == 1 && z == 7) {
			crash_z = 0x01;
			if (rand()%3 == 1) dz = -1;
			else dz = 0;
		}
		
		// mode bit 0 sets crash action enable
		if (mode | 0x01) {
			if (crash_x) {
				if (dy == 0) {
					if (y == 7) dy = -1;
					else if (y == 0) dy = +1;
					else {
						if (rand()%2 == 0) dy = -1;
						else dy = 1;
					}
				}
				if (dz == 0) {
					if (z == 7)	dz = -1;
					else if (z == 0) dz = 1;
					else {
						if (rand()%2 == 0) dz = -1;
				        else dz = 1;
					}	
				}
			}
			
			if (crash_y) {
				if (dx == 0) {
					if (x == 7)	dx = -1;
					else if (x == 0) dx = 1;
					else {
						if (rand()%2 == 0) dx = -1;
						else dx = 1;
					}
				}
				if (dz == 0) {
					if (z == 3)	dz = -1;
					else if (z == 0) dz = 1;
					else {
						if (rand()%2 == 0) dz = -1;
						else dz = 1;
					}	
				}
			}
			
			if (crash_z) {
				if (dy == 0) {
					if (y == 7)	dy = -1;
					else if (y == 0) dy = 1;
					else {
						if (rand()%2 == 0) dy = -1;
						else dy = 1;
					}	
				}
				if (dx == 0) {
					if (x == 7)	dx = -1;
					else if (x == 0) dx = 1;
					else {
						if (rand()%2 == 0) dx = -1;
						else dx = 1;
					}	
				}
			}
		}
		
		// mode bit 1 sets corner avoid enable
		if (mode | 0x02) {
			if (	// We are in one of 8 corner positions
				(x == 0 && y == 0 && z == 0) ||
				(x == 0 && y == 0 && z == 7) ||
				(x == 0 && y == 7 && z == 0) ||
				(x == 0 && y == 7 && z == 7) ||
				(x == 7 && y == 0 && z == 0) ||
				(x == 7 && y == 0 && z == 7) ||
				(x == 7 && y == 7 && z == 0) ||
				(x == 7 && y == 7 && z == 7)
			) {
				// At this point, the voxel would bounce
				// back and forth between this corner,
				// and the exact opposite corner
				// We don't want that!
			
				// So we alter the trajectory a bit,
				// to avoid corner stickyness
				lol = rand()%3;
				if (lol == 0) dx = 0;
				if (lol == 1) dy = 0;
				if (lol == 2) dz = 0;
			}
		}

        // one last sanity check
        if (x == 0 && dx == -1) dx = 1;
	    if (y == 0 && dy == -1) dy = 1;
        if (z == 0 && dz == -1) dz = 1;
        if (x == 7 && dx == 1)  dx = -1;
        if (y == 7 && dy == 1)  dy = -1;
        if (z == 7 && dz == 1)  dz = -1;
	
		// Finally, move the voxel.
		x = x + dx;
		y = y + dy;
		z = z + dz;
		
		if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
		if (drawmode == 0x01) {// show one voxel at time
			setPixelColor(x,y,z,col);
			showPixels();
	        if(stop || stopDemo) {return 0;}
			delay(speed*speedFactor);
			setPixelColor(x,y,z,black);	
		} 
		else if (drawmode == 0x02) {// flip the voxel in question
			flipVoxel(x,y,z,col);
			showPixels();
	        if(stop || stopDemo) {return 0;}
			delay(speed*speedFactor);
		} 
		if (drawmode == 0x03) {// draw a snake
			for (i=SIDE-1;i>=0;i--) {
				snake[i][0] = snake[i-1][0];
				snake[i][1] = snake[i-1][1];
				snake[i][2] = snake[i-1][2];
			}
			snake[0][0] = x;
			snake[0][1] = y;
			snake[0][2] = z;
				
			for (i=0;i<SIDE;i++) {
				setPixelColor(snake[i][0],snake[i][1],snake[i][2],col);
				showPixels();
	            if(stop || stopDemo) {return 0;}
			}
			delay(speed*speedFactor);
			for (i=0;i<SIDE;i++) {
				setPixelColor(snake[i][0],snake[i][1],snake[i][2],black);
				showPixels();
			}
		}
		iterations--;
	}
	transitionAll(black, POLAR);
	return 1;
}

void flipVoxel(int x, int y, int z, Color newCol) {
    Color currentCol = getPixelColor(x,y,z);
    if(currentCol.red==0 && currentCol.green==0 && currentCol.blue==0)
        setPixelColor(x,y,z,newCol);
    else
        setPixelColor(x,y,z,black);
}

// Display a sine wave running out from the center of the cube.
int ripples (int iterations, Color col) {
	float origin_x, origin_y, distance, height, ripple_interval;
	int x,z,i;
    
    //background(black);

	for (i=0;i<iterations;i++) {
	    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
		for (x=0;x<SIDE;x++) {
			for (z=0;z<SIDE;z++) {
				distance = distance2d(3.5,3.5,x,z)/9.899495*8;
				//distance = distance2d(3.5,3.5,x,y);
				ripple_interval =1.3;
				height = 4+sin(distance/ripple_interval+(float) i/50)*4;

				setPixelColor(x,(int) height, z, col);	
			}
		}
		showPixels();
	    if(stop || stopDemo) {return 0;}
		//delay(speed);
		if(i==iterations-1)
		    transitionAll(black, POLAR);
		else
		    background(black);
	}
	return 0;
}

/*inline float Hill(float x) {
  const float a0 = 1.0f;
  const float a2 = 2.0f / PI - 12.0f / (PI * PI);
  const float a3 = 16.0f / (PI * PI * PI) - 4.0f / (PI * PI);
  const float xx = x * x;
  const float xxx = xx * x;
 
  return a0 + a2 * xx + a3 * xxx;
}

float sine(float x) {
  // wrap x within [0, (2.0f * PI))
  const float a = x * (1.0f / (2.0f * PI));
  x -= static_cast<int>(a) * (2.0f * PI);
  if (x < 0.0f)
    x += (2.0f * PI);
 
  // 4 pieces of hills
  if (x < (0.5f * PI))
    return Hill((0.5f * PI) - x);
  else if (x < PI)
    return Hill(x - (0.5f * PI));
  else if (x < 3.0f * (0.5f * PI))
    return -Hill(3.0f * (0.5f * PI) - x);
  else
    return -Hill(x - 3.0f * (0.5f * PI));
}

float cosine(float x) {
    return sine(x + (0.5f * PI));
}

float squareRoot(float x) {
  unsigned int i = *(unsigned int*) &x;

  // adjust bias
  i  += 127 << 23;
  // approximation of square root
  i >>= 1;

  return *(float*) &i;
}*/

float distance2d (float x1, float y1, float x2, float y2) {	
	float dist;
	dist = sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));

	return dist;
}

int linespin (int iterations, char axis, Color col) {
	float top_x, top_y, top_z, bot_x, bot_y, bot_z, sin_base;
	float center_x, center_y;
	int i, z;
    
    //transitionAll(black, POLAR);
    
	center_x = 4;
	center_y = 4;

	for (i=0;i<iterations;i++) {

		//printf("Sin base %f \n",sin_base);
        if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
        
		for (z = 0; z < SIDE; z++)	{

    		sin_base = (float)i/50 + (float)z/(10+(7*sin((float)i/200)));
    
    		top_x = center_x + sin(sin_base)*5;
    		top_y = center_x + cos(sin_base)*5;
    		//top_z = center_x + cos(sin_base/100)*2.5;
    
    		bot_x = center_x + sin(sin_base+3.14)*10;
    		bot_y = center_x + cos(sin_base+3.14)*10;
    		//bot_z = 7-top_z;
    		
    		bot_z = z;
    		top_z = z;
    
    		//setPixelColor((int) top_x, (int) top_y, 7);
    		//setPixelColor((int) bot_x, (int) bot_y, 0);
    		//sprintf(debug, "P1: %i %i %i P2: %i %i %i \n", (int) top_x, (int) top_y, 7, (int) bot_x, (int) bot_y, 0);
    
			/*switch(axis){
    		    case AXIS_X:
                    drawLine(Point((int)top_z, (int)top_x, (int)top_y), Point((int)bot_z, (int)bot_x, (int)bot_y), col); 
                    break;
                case AXIS_Y:
                    drawLine(Point((int)top_x, (int)top_z, (int)top_y), Point((int)bot_x, (int)bot_z, (int)bot_y), col);
                    break;
                case AXIS_Z:
                    drawLine(Point((int)top_x, (int)top_y, (int)top_z), Point((int)bot_x, (int)bot_y, (int)bot_z), col);
                    break;
            }*/
    		switch(axis){
    		    case AXIS_X:
                    drawLine(Point(top_z, top_x, top_y), Point(bot_z, bot_x, bot_y), col); 
                    break;
                case AXIS_Y:
                    drawLine(Point(top_x, top_z, top_y), Point(bot_x, bot_z, bot_y), col);
                    break;
                case AXIS_Z:
                    drawLine(Point(top_x, top_y, top_z), Point(bot_x, bot_y, bot_z), col);
                    break;
            }
			
		}
        showPixels();
	    if(stop || stopDemo) {return 0;}
		delay(speed);
		if(i==iterations-1)
		    transitionAll(black, POLAR);
		else
		    background(black);
	}
	return 1;
}

int sinelines (int iterations, char axis, Color col) {
	float left, right, sine_base, x_dividor,ripple_height;
	int i,x;
    
    //transitionAll(black, POLAR);

	for (i=0; i<iterations; i++) {
	    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
		for (x=0; x<SIDE ;x++)	{
			x_dividor = 2 + sin((float)i/100)+1;
			ripple_height = 3 + (sin((float)i/200)+1)*6;

			sine_base = (float) i/40 + (float) x/x_dividor;

			left = 4 + sin(sine_base)*ripple_height;
			right = 4 + cos(sine_base)*ripple_height;
			right = 7-left;

			//printf("%i %i \n", (int) left, (int) right);

			//line_3d(0-3, x, (int) left, 7+3, x, (int) right, col);

			/*switch(axis){
    		    case AXIS_X:
                    drawLine(Point(x, 0-3, (int)left), Point(x, 7+3, (int)right), col);
                    break;
                case AXIS_Y:
                    drawLine(Point(0-3, x, (int)left), Point(7+3, x, (int)right), col);
                    break;
                case AXIS_Z:
                    drawLine(Point(0-3, (int)left, x), Point(7+3, (int)right, x), col);
                    break;
            }*/
			
			switch(axis){
    		    case AXIS_X:
                    drawLine(Point(x, 0-3, left), Point(x, 7+3, right), col);
                    break;
                case AXIS_Y:
                    drawLine(Point(0-3, x, left), Point(7+3, x, right), col);
                    break;
                case AXIS_Z:
                    drawLine(Point(0-3, left, x), Point(7+3, right, x), col);
                    break;
            }
			
		}
	
	    showPixels();
	    if(stop || stopDemo) {return 0;}
		delay(speed);
		if(i==iterations-1)
		    transitionAll(black, POLAR);
		else
		    background(black);
	}
	return 1;
}

int spheremove (int iterations, Color col) {
	float origin_x, origin_y, origin_z, distance, diameter;

    //background(black);

	origin_x = 0;
	origin_y = 3.5;
	origin_z = 3.5;

	diameter = 3;

	int x, y, z, i;

	for (i=0; i<iterations; i++) {
	    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
		origin_x = 3.5+sin((float)i/50)*2.5;
		origin_y = 3.5+cos((float)i/50)*2.5;
		origin_z = 3.5+cos((float)i/30)*2;

		diameter = 2+sin((float)i/150);

		for (x=0; x<SIDE; x++)	{
			for (y=0; y<SIDE; y++)	{
				for (z=0; z<SIDE; z++)	{
					distance = distance3d(x,y,z, origin_x, origin_y, origin_z);
					//printf("Distance: %f \n", distance);

					if (distance>diameter && distance<diameter+1) {
						setPixelColor(x,z,y,col);
					}
				}
			}
		}
        showPixels();
	    if(stop || stopDemo) {return 0;}
		delay(speed);
		if(i==iterations-1)
		    transitionAll(black, POLAR);
		else
		    background(black);
	}
	return 1;
}

float distance3d (float x1, float y1, float z1, float x2, float y2, float z2) {	
	float dist;
	dist = sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) + (z1-z2)*(z1-z2));

	return dist;
}

// ----------------------------------------------------------------------------
// Anime une serie d'explosions avec un nombre borne de particules.
//
// Parametres :
// - iterations : nombre d'explosions successives.
// - n : nombre de particules, compris entre 1 et 50.
// - col : couleur de base de l'explosion.
//
// Retour :
// - un apres execution, zero en cas d'interruption ou de borne invalide.
//
// Effet de bord :
// - reutilise la zone de particules du scratch partage et affiche les frames.
// ----------------------------------------------------------------------------
int fireworks (int iterations, int n, Color col) {
    int i,f,e;
    int rand_y, rand_x, rand_z;
    float origin_x = 3;
	float origin_y = 3;
	float origin_z = 3;
	float slowrate, gravity;
	if(n < 1 || n > 50)
		return 0;
	float (*particles)[6] = sharedAnimationScratch.particles;
    
	//background(black);

	for (i=0; i<iterations; i++) {

		origin_x = (rand()%4) + 2;
		origin_y = (rand()%4) + 2;
		origin_z = (rand()%2) + 5;

		// shoot a particle up in the air
		if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
        //else if(switch2) col = cheerLightsColor;
        
		for (e=0;e<origin_z;e++) {
			setPixelColor(origin_x,e, origin_y,col);
			showPixels();
	        if(stop || stopDemo) {return 0;}
			delay(speed*e);
			background(black);
		}

		// Fill particle array
		for (f=0; f<n; f++)	{
			// Position
			particles[f][0] = origin_x;
			particles[f][1] = origin_y;
			particles[f][2] = origin_z;
			
			rand_x = rand()%200;
			rand_y = rand()%200;
			rand_z = rand()%200;

			// Movement
			particles[f][3] = 1-(float)rand_x/100; // dx
			particles[f][4] = 1-(float)rand_y/100; // dy
			particles[f][5] = 1-(float)rand_z/100; // dz
		}

		// explode
		for (e=0; e<25; e++) {
		    if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
            //else if(switch2) col = cheerLightsColor;
			slowrate = 1+tan((e+0.1)/20)*10;
			
			gravity = tan((e+0.1)/20)/2;

			for (f=0; f<n; f++) {
				particles[f][0] += particles[f][3]/slowrate;
				particles[f][1] += particles[f][4]/slowrate;
				particles[f][2] += particles[f][5]/slowrate;
				particles[f][2] -= gravity;

				setPixelColor(particles[f][0],particles[f][2],particles[f][1],col);
			}
            showPixels();
	        if(stop || stopDemo) {return 0;}
			delay(speed*5);
			background(black);
		}
		if(i==iterations-1)
		    transitionAll(black, POLAR);
		else
		    background(black);
	}
	return 1;
}


int effect_rand_patharound (int iterations, Color col) {
	int z, dz, i;
	z = 4;
	unsigned char path[28];
	
	font_getpath(0,path,28);
	
	for (i = 0; i < iterations; i++) {
		dz = ((rand()%3)-1);
		z += dz;
		
		if (z>7)
			z = 7;
			
		if (z<0)
			z = 0;
		
		if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
		effect_pathmove(path, 28);
		setPixelColor(0,7,z,col);
		
		showPixels();
	    if(stop || stopDemo) {return 0;}
		delay(speed*5);
	}
	return 1;
}

void font_getpath (unsigned char path, unsigned char *destination, int length) {
	int i;
	int offset = 0;
	
	if (path == 1)
		offset=28;
	
	for (i = 0; i < length; i++)
		destination[i] = pgm_read_byte(&paths[i+offset]);
}

void effect_pathmove (unsigned char *path, int length) {
	int i,z;
	//unsigned char state;
	Color col;
	
	for (i=(length-1);i>=1;i--) {
		for (z=0;z<8;z++) {
			col = getPixelColor(((path[(i-1)]>>4) & 0x0f), (path[(i-1)] & 0x0f), z);
			//altervoxel(((path[i]>>4) & 0x0f), (path[i] & 0x0f), z, state);
			setPixelColor(((path[i]>>4) & 0x0f), (path[i] & 0x0f), z, col);
		}
	}
	for (i=0;i<8;i++)
		//clrvoxel(((path[0]>>4) & 0x0f), (path[0] & 0x0f),i);
		setPixelColor(((path[0]>>4) & 0x0f), (path[0] & 0x0f),i, black);
}


//**************************************************
int zoom_pyramid_clear(Color col) {
  
  //1
  /*if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
  box_walls(0,0,0,7,0,7, col);
  showPixels();
  if(stop || stopDemo) {return 0;}  
  delay(speed*5);  
  */
  //2
  //Pyramid
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
  //box_wireframe(0,0,0,7,0,1, col);    
  setplane_y(0, black);
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed*5);  
  
  //3
  //Pyramid  
  setplane_y(1, black);
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2)); 
  //box_walls(0,2,0,7,2,7, col); 
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //4
  //Pyramid
  setplane_y(2, black);
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2)); 
  //box_walls(0,3,0,7,3,7, col);  
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //5
  //Pyramid
  setplane_y(3, black);
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
  //box_walls(0,4,0,7,4,7, col); 
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //5
  //Pyramid
  setplane_y(4, black);
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
  //box_walls(0,5,0,7,5,7, col);
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //6
  //Pyramid
  setplane_y(5, black);
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
  //box_walls(0,6,0,7,6,7, col); 
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //7
  //Pyramid
  setplane_y(6, black);
  //if(switch1) col = getColorFromInteger(Wheel(colorWheel+=2));
  //box_walls(0,7,0,7,7,7, col);
  showPixels();
  if(stop || stopDemo) {return 0;}  
  delay(speed*5);  

  setplane_y(7, black);
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed);
  
  return 1;
}

int zoom_pyramid(Color col) {
  int i,j,k,time;
  uint8_t startColor = random(256);
  
  //1
  background(black);
  col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_walls(0,0,0,7,0,7, col);
  box_walls(0,0,0,7,7,0, col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);  
  
  //2
  background(black);  
  //Pyramid
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,0,1,col);    
  //box_walls(0,1,0,7,1,7,col);   
  box_wireframe(0,0,0,7,1,0,col);    
  box_walls(0,0,1,7,7,1,col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);  
  
  //3
  background(black);
  //Pyramid  
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,1,1,col);
  //box_wireframe(1,1,2,6,1,3,col);  
  //box_walls(0,2,0,7,2,7,col); 
  box_wireframe(0,0,0,7,1,1,col);
  box_wireframe(1,2,1,6,3,1,col);  
  box_walls(0,0,2,7,7,2,col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //4
  background(black);
  //Pyramid
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,2,1,col);
  //box_wireframe(1,1,2,6,2,3,col);  
  //box_wireframe(2,2,4,5,2,5,col);  
  //box_walls(0,3,0,7,3,7,col);  
  box_wireframe(0,0,0,7,1,2,col);
  box_wireframe(1,2,1,6,3,2,col);  
  box_wireframe(2,4,2,5,5,2,col);  
  box_walls(0,0,3,7,7,3,col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //5
  background(black);
  //Pyramid
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,3,1,col);
  //box_wireframe(1,1,2,6,3,3,col);  
  //box_wireframe(2,2,4,5,3,5,col);
  //box_wireframe(3,3,6,4,3,7,col);
  //box_walls(0,4,0,7,4,7,col); 
  box_wireframe(0,0,0,7,1,3,col);
  box_wireframe(1,2,1,6,3,3,col);  
  box_wireframe(2,4,2,5,5,3,col);
  box_wireframe(3,6,3,4,7,3,col);
  box_walls(0,0,4,7,7,4,col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);

  //5
  background(black);
  //Pyramid
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,4,1,col);
  //box_wireframe(1,1,2,6,4,3,col);  
  //box_wireframe(2,2,4,5,4,5,col);
  //box_wireframe(3,3,6,4,4,7,col);
  //box_walls(0,5,0,7,5,7,col); 
  box_wireframe(0,0,0,7,1,4,col);
  box_wireframe(1,2,1,6,3,4,col);  
  box_wireframe(2,4,2,5,5,4,col);
  box_wireframe(3,6,3,4,7,4,col);
  box_walls(0,0,5,7,7,5,col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);
  //6
  
  background(black);
  //Pyramid
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,5,1,col);
  //box_wireframe(1,1,2,6,5,3,col);  
  //box_wireframe(2,2,4,5,5,5,col);
  //box_wireframe(3,3,6,4,4,7,col);
  //box_walls(0,6,0,7,6,7,col); 
  box_wireframe(0,0,0,7,1,5,col);
  box_wireframe(1,2,1,6,3,5,col);  
  box_wireframe(2,4,2,5,5,5,col);
  box_wireframe(3,6,3,4,7,4,col);
  box_walls(0,0,6,7,7,6,col); 
  if(stop || stopDemo) {return 0;}
  delay(speed*5);
  
  //7
  background(black);  
  //Pyramid
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
  //box_wireframe(0,0,0,7,6,1,col);
  //box_wireframe(1,1,2,6,6,3,col);  
  //box_wireframe(2,2,4,5,5,5,col);
  //box_wireframe(3,3,6,4,4,7,col);
  //box_walls(0,7,0,7,7,7,col);  
  box_wireframe(0,0,0,7,1,6,col);
  box_wireframe(1,2,1,6,3,6,col);  
  box_wireframe(2,4,2,5,5,5,col);
  box_wireframe(3,6,3,4,7,4,col);
  box_walls(0,0,7,7,7,7,col);  
  if(stop || stopDemo) {return 0;}  
  delay(speed*5);  
    
  background(black);
  //col = switch1 ? getColorFromInteger(Wheel(startColor+=2)) : getColorFromInteger(color1); 
 // box_wireframe(0,0, 0, 7, 7, 1,col);      
 // box_wireframe(1,1, 2, 6, 6, 3,col);      
  //box_wireframe(2,2, 4, 5, 5, 5,col);         
  //box_wireframe(3,3, 6, 4, 4, 7,col); 
  box_wireframe(0,0, 0, 7, 1, 7, col);      
  box_wireframe(1,2, 1,  6, 3, 6, col);      
  box_wireframe(2,4, 2,  5, 5, 5,col);         
  box_wireframe(3,6, 3,  4, 7, 4, col);
  showPixels();
  if(stop || stopDemo) {return 0;}
  delay(speed);  
  
  return 1;  
}

// Draw a hollow box with side walls.
void box_walls(int x1, int y1, int z1, int x2, int y2, int z2, Color col) {
	int ix,iy,iz;
	
	argorder(x1, x2, &x1, &x2);
	argorder(y1, y2, &y1, &y2);
	argorder(z1, z2, &z1, &z2);

	for (iz=z1;iz<=z2;iz++) {
		for (iy=y1;iy<=y2;iy++) {	
			for (ix=x1;ix<=x2;ix++) {
				if (iy == y1 || iy == y2 || iz == z1 || iz == z2) {
					//cube[iz][iy] = byteline(x1,x2);
					setPixelColor(ix,y1,z1,col);
				} else {
					//cube[iz][iy] |= ((0x01 << x1) | (0x01 << x2));
					setPixelColor(x1,y1,z1,col);
					setPixelColor(x2,y1,z1,col);
				}
			}
		}
	}
	showPixels();
}


// Draw a wireframe box. This only draws the corners and edges,
// no walls.
void box_wireframe(int x1, int y1, int z1, int x2, int y2, int z2, Color col) {
	int ix, iy, iz;

	argorder(x1, x2, &x1, &x2);
	argorder(y1, y2, &y1, &y2);
	argorder(z1, z2, &z1, &z2);

	// Lines along X axis
	//cube[z1][y1] = byteline(x1,x2);
	//cube[z1][y2] = byteline(x1,x2);
	//cube[z2][y1] = byteline(x1,x2);
	//cube[z2][y2] = byteline(x1,x2);
	for (ix=x1;ix<=x2;ix++) {
		setPixelColor(ix,y1,z1,col);
		setPixelColor(ix,y1,z2,col);
		setPixelColor(ix,y2,z1,col);
		setPixelColor(ix,y2,z2,col);
	}
	
	// Lines along Y axis
	for (iy=y1;iy<=y2;iy++) {
		setPixelColor(x1,iy,z1,col);
		setPixelColor(x1,iy,z2,col);
		setPixelColor(x2,iy,z1,col);
		setPixelColor(x2,iy,z2,col);
	}

	// Lines along Z axis
	for (iz=z1;iz<=z2;iz++) {
		setPixelColor(x1,y1,iz,col);
		setPixelColor(x1,y2,iz,col);
		setPixelColor(x2,y1,iz,col);
		setPixelColor(x2,y2,iz,col);
	}

}

// Returns a byte with a row of 1's drawn in it.
// byteline(2,5) gives 0b00111100
//char byteline (int start, int end) {
//	return ((0xff<<start) & ~(0xff<<(end+1)));
//}

// Makes sure x1 is alwas smaller than x2
// This is usefull for functions that uses for loops,
// to avoid infinite loops
void argorder(int ix1, int ix2, int *ox1, int *ox2) {
	if (ix1>ix2) {
		int tmp;
		tmp = ix1;
		ix1= ix2;
		ix2 = tmp;
	}
	*ox1 = ix1;
	*ox2 = ix2;
}


/**
 * Pick a random color, then randomly fill the whole strip with that color
 * But make sure the next color has some contrast from the current color
 * Then randomly turn off each pixel
 * @randomPixelFill(): helper function to do the dirty work
 * @switch1 = Random Color Fill: Used in randomPixelFill() to fill the strip with random colors
 * @switch2 = Slow Transition: 
 */

#endif
