// ============================================================================
// HyperDisabled - Archive du prototype HyperBall désactivé
// ----------------------------------------------------------------------------
// Ce fichier conserve le prototype historique uniquement comme référence. Il
// ne compile aucune animation et ne réserve aucun état dans le firmware actif.
// ============================================================================

#ifdef L3D_UNITY_BUILD

/* ======================== HYPER Cube mode routines ======================== */
/*void hyper() {
	background(black);		
   
	HCphase += PI/12.0; 
	int HCp = int(HCphase) % 511;
	if (HCp > 255) 
	{
		HCp = 511 - HCp;
	}
	float HCdilaton = HCfmap(HCtoFloat(HCp),HCtoFloat(0),HCtoFloat(256),-HCdiameter + .8,1);
	
	for(int x = 0; x < SIDE; x++) {
		for(int y = 0; y < SIDE; y++) {
			for(int z = 0; z < SIDE; z++) {
				HCdist = HCdistance(HCtoFloat(x), HCtoFloat(y), HCtoFloat(z), 3.5, 3.5, 3.5);
				if (HCdist < HCdiameter + HCdilaton) {
					HCdim = 0.1;
					if (HCdist > HCtoFloat(HCfloor(HCdiameter + HCdilaton))) {
						HCdim = 0.7;
					}
					setPixelColor(x, y, z, Color(int(150 * HCdim),
                        int(HCfmap(HCdist,HCtoFloat(0),HCtoFloat(HCdiameter + HCdilaton),HCtoFloat(0),HCtoFloat(255)) * HCdim),
                        int(100 * HCdim)));
				}
			}
		}
	}
	
	//if(stop || stopDemo) {return;}
	//showPixels();
	//delay(speed);
	strip.show();
	run = TRUE;
}
float HCfmod(float a, float b) {
  return (a - b * HCfloor(a / b));
}

int HCfloor(float x) {
	if (x >= 0) {
        return (int)x;
    }
    else {
        int y = (int)x;
        return ((float)y == x) ? y : y - 1;
    }
}

float HCcos_32s(float x) {
	float HCc1= 0.99940307;
	float HCc2=-0.49558072;
	float HCc3= 0.03679168;
	float HCx2= x*x;				// The input argument squared			

	//HCx2=pow(x, 2);
	return (HCc1 + HCx2*(HCc2 + HCc3 * HCx2));
}*/

/**
 *  This is the main cosine approximation "driver"
 * It reduces the input argument's range to [0, pi/2],
 * and then calls the approximator. 
 * See the notes for an explanation of the range reduction.
**/
/*
float HCcos_32(float x) {
	int quad;						// what quadrant are we in?	

	x=HCfmod(x, TWO_PI);			// Get rid of values > 2* pi	
	if(x<0)x=-x;					// cos(-x) = cos(x)
	quad=int(x * TWO_OVER_PI);	// Get quadrant # (0 to 3) we're in
	
	switch (quad)
	{
		case 0: return  HCcos_32s(x);
		case 1: return -HCcos_32s(PI-x);
		case 2: return -HCcos_32s(x-PI);
		case 3: return  HCcos_32s(TWO_PI-x);
	}
}*/

/**
 *  The sine is just cosine shifted a half-pi, so
 * we'll adjust the argument and call the cosine approximation.
**/
/*
float HCsin_32(float x){
	return HCcos_32(HALF_PI - x);
}

float HCdistance(float x, float y, float z, float x1, float y1, float z1){
  return(sqrt(pow(x-x1,2)+pow(y-y1,2)+pow(z-z1,2)));
}

float HCfmap(float input, float inMin, float inMax, float outMin, float outMax) {
    float out;
    out = (input-inMin)/(inMax-inMin)*(outMax-outMin) + outMin;
    return out;
}

float HCtoFloat(int x) {
  return float(x);
}*/

#endif
