#ifdef L3D_UNITY_BUILD

void initCollide() {
  for (int i=0; i<COMAX_DOTS; i++) {
    //COdots[i] = { rand()%cube.size, rand()%cube.size, rand()%cube.size };
	COdots[i] = { rand()%SIDE, rand()%SIDE, rand()%SIDE };
    randomColor(&COclr[i]);
    int d[3], a;
    do {
		d[0] = rand()%3-1;
		d[1] = rand()%3-1;
		d[2] = rand()%3-1;
		a = abs(d[0]) + abs(d[1]) + abs(d[2]);
	} while (a != 1);
    COdir[i] = { d[0], d[1], d[2] };
  }
}
	int wrapIf (int n) {
    //if (n >= cube.size) n = 0;
    //if (n < 0) n = cube.size - 1;
	if(n >= SIDE)  n = 0;
    if(n < 0)  n = SIDE - 1;
    return n;
}

void collide2() {
    //cube.background(black); 
	background(black); 
	
	for(int i=0; i<COMAX_DOTS; ++i) {
		setPixelColor(COdots[i], Color(COclr[i].red/8, COclr[i].green/8, COclr[i].blue/8));
		COdots[i].x += COdir[i].x;
		COdots[i].y += COdir[i].y;
		COdots[i].z += COdir[i].z;
		COdots[i].x = wrapIf(COdots[i].x);
		COdots[i].y = wrapIf(COdots[i].y);
		COdots[i].z = wrapIf(COdots[i].z);
		//Color test = cube.getVoxel(COdots[i]);
		Color test = getPixelColor(COdots[i].x, COdots[i].y, COdots[i].z);
		Color uc = COclr[i];
		bool bang = false;
		if(test.red != 0 || test.green != 0 || test.blue != 0) 
			bang = true;
		if(bang) {
			uc = Color(128, 128, 128);
			//cube.sphere(COdots[i], 1, Color(4, 4, 4));
			sphere(COdots[i], 1, Color(4, 4, 4));
		}
		setPixelColor(COdots[i], uc);
		if(bang) 
			//COdots[i] = { rand()%cube.size, rand()%cube.size, rand()%cube.size };
			COdots[i] = { rand()%SIDE, rand()%SIDE, rand()%SIDE };
	}

	for(int i=0; i<COMAX_DOTS; i++) {
		if (rand()%16 != 0) continue;
		int d[3], a;
		
		do {
			d[0] = rand()%3-1;
			d[1] = rand()%3-1;
			d[2] = rand()%3-1;
			a = abs(d[0]) + abs(d[1]) + abs(d[2]);
		} while (a != 1);
	
		COdir[i] = { d[0], d[1], d[2] };
	}
	
	if(stop || stopDemo) {return;}
	showPixels();
	delay(speed);
	run = TRUE;
}


// draws a hollow  centered around the 'center' Point, with radius
// radius and color col
void sphere(Point center, float radius, Color col) {
	float res = 30;
	for (float m = 0; m < res; m++) {
		for (float n = 0; n < res; n++) {
			//setVoxel(
			//		center.x + radius * sin((float) PI * m / res) * cos((float) 2 * PI * n / res),
			//		center.y + radius * sin((float) PI * m / res) * sin((float) 2 * PI * n / res),
			//		center.z + radius * cos((float) PI * m / res), 
			//		col);
			setPixelColor(
					(int) (center.x + radius * sin((float) PI * m / res) * cos((float) 2 * PI * n / res)),
					(int) (center.y + radius * sin((float) PI * m / res) * sin((float) 2 * PI * n / res)),
					(int) (center.z + radius * cos((float) PI * m / res)), 
					col);
		}
	}
}


/* ========================== PuckDude mode routines =========================== */

#endif
