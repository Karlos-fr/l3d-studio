// ============================================================================
// Spectrum - Implementation de la visualisation FFT du microphone
// ----------------------------------------------------------------------------
// Ce fichier echantillonne et affiche le spectre historique. Il ne modifie pas
// le mapping logique du cube ni le protocole Particle.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Calcule puis affiche une frame du spectre audio historique.
//
// Effet de bord :
// - echantillonne le microphone, actualise les pics et ecrit le debug avec une
//   taille bornee.
// ----------------------------------------------------------------------------
void FFTJoy() {
    run = TRUE;
    
    for(int i=0; i<ARRAY_SIZE; i++) {
        spectrumReal[i]=analogRead(MICROPHONE)-SAMPLES;
        delayMicroseconds(120);  /* 210 this sets our 'sample rate'.  I went through a bunch of trial and error to 
                                  * find a good sample rate to put a soprano's vocal range in the spectrum of the cube
    							  *
      							  * 120 gets the entire range from bass to soprano within the cube's spectrum
      							  * *From bass to soprano: https://youtu.be/6jqCuE7C3rg */
        spectrumImaginary[i]=0;
    }
    
    FFT(1, M, spectrumReal, spectrumImaginary);
    
    /* In this loop we can trim our 'viewing window', in regards to
     * what range of the audio spectrum we want to see at all times.
     * We do that by means of slightly 'shifting' the array index in
     * both imaginary[] and real[] arrays - the greater the index,
     * the more our 'window' will shift towards high frequencies. */
    for(int i=0; i<ARRAY_SIZE; i++) {
		int ii = (i+1) < ARRAY_SIZE ? i+1 : i;
        spectrumImaginary[i]=sqrt(
          spectrumImaginary[ii] * spectrumImaginary[ii] +
          spectrumReal[ii] * spectrumReal[ii]
        );
        //imaginary[i]=sqrt(pow(imaginary[i+1],2)+pow(real[i+1],2));
        if(spectrumImaginary[i]>maxVal)
            maxVal=spectrumImaginary[i];
    }
        
    boundedTextFormat(debug, sizeof(debug), "%f", maxVal);
    /* We try to keep the baseline reading at 450.0 when idle;                          *
     * when peaking, readings can get upwards from 1000.0 to 1200.0 (clipping occurs);  *
     * maxVal is constantly adjusted to keep mean readings within optimal capture range */
    if(maxVal>=650) maxVal-=maxVal*0.0625;      // As maxVal gets too high, cube starts not picking up any signals
    if(maxVal<650 && maxVal>450) maxVal-=0.3;   // This is the range where audio capture and display is optimal
    if(maxVal<=450) maxVal+=0.5;                // We cutoff maxVal to keep from clipping due to excess peaking

    for(int i=0; i<ARRAY_SIZE/2; i++) {
        spectrumImaginary[i]=SIDE*spectrumImaginary[i]/maxVal;
        Color pixelColor;
        int y, pixIdx, pixUppIdx, pixLowIdx;
        for(y=0; y<=spectrumImaginary[i]; y++) {
            pixelColor=y<SIDE-1 ? getColorFromInteger(colorMap(y,0,SIDE+2)) : Color(191,0,15);
          	//pixelColor=getColorFromInteger(colorMap(y,0,SIDE+2));
            uint16_t mappedIndex;
            if (!tryVoxelIndex(i, y, SIDE - 1, &mappedIndex)) {
                break;
            }
            pixIdx=mappedIndex;
            strip.setPixelColor(pixIdx, strip.Color(pixelColor.red, pixelColor.green, pixelColor.blue));
    		if(switch2) {
    		    //Down-top fade/blanking
                pixelColor=black;
                pixLowIdx=pixIdx-(pixIdx%SIDE);
                for(int j=pixLowIdx; j<pixIdx; j++) {
                    if(switch1) {
                        pixelColor=getPixelColor(j);
                        //This causes a nice and smooth 'trailing' effect
                      	//from the base of the cube (y-axis) towards the peak
                        if(pixelColor.red > 0) pixelColor.red-=pixelColor.red*(map(j%SIDE, 0, SIDE-1, SIDE-1, 1)*.05);
                        if(pixelColor.green > 0) pixelColor.green-=pixelColor.green*(map(j%SIDE, 0, SIDE-1, SIDE-1, 1)*.05);
                        if(pixelColor.blue > 0) pixelColor.blue-=pixelColor.blue*(map(j%SIDE, 0, SIDE-1, SIDE-1, 1)*.05);
                    }
        			strip.setPixelColor(j, strip.Color(pixelColor.red, pixelColor.green, pixelColor.blue));
                }
            }
    	}
        
        //Topdown fade/blanking
        pixelColor=black;
        pixUppIdx=pixIdx+(SIDE-(pixIdx%SIDE));
        for(int j=pixUppIdx-1; j>pixIdx; j--) {
            if(switch1) {
                pixelColor=getPixelColor(j);
              	//This causes a nice and smooth 'trailing' effect
              	//from the top of the cube (y-axis) towards the peak
                if(pixelColor.red > 0) pixelColor.red-=pixelColor.red*(map(j%SIDE, 0, SIDE-1, 1, SIDE-1)*.05);
                if(pixelColor.green > 0) pixelColor.green-=pixelColor.green*(map(j%SIDE, 0, SIDE-1, 1, SIDE-1)*.05);
                if(pixelColor.blue > 0) pixelColor.blue-=pixelColor.blue*(map(j%SIDE, 0, SIDE-1, 1, SIDE-1)*.05);
            }
            strip.setPixelColor(j, strip.Color(pixelColor.red, pixelColor.green, pixelColor.blue));
        }
    }
    
    /*if(maxVal>=700) 
        maxVal-=maxVal*0.125;
    if(maxVal<=200 && maxVal>=100)
        maxVal-=0.25;*/

    //Fade the 'trail' to black over the length of the cube's z-axis
    for(int x=0; x<SIDE; x++)
        for(int y=0; y<SIDE; y++)
            for(int z=0; z<SIDE-1; z++) {
                uint16_t pixIdx=voxelIndexUnchecked(x, y, z + 1);
                Color trailColor=getPixelColor(pixIdx);
                if(switch1) {
                  	//This is responsible for the 'meteors' shooting towards the back of 
                  	//the cube; otherwise it would look like they were 'going backwards'
                    if(trailColor.red > 0) trailColor.red-=trailColor.red*(map(z%SIDE, 0, SIDE-1, 1, SIDE-1)*.05); //.125;
                    if(trailColor.green > 0) trailColor.green-=trailColor.green*(map(z%SIDE, 0, SIDE-1, 1, SIDE-1)*.05); //.125;
                    if(trailColor.blue > 0) trailColor.blue-=trailColor.blue*(map(z%SIDE, 0, SIDE-1, 1, SIDE-1)*.05); //.125;
                }
                uint16_t destinationIndex=voxelIndexUnchecked(x, y, z);
                strip.setPixelColor(destinationIndex, strip.Color(trailColor.red, trailColor.green, trailColor.blue));
                if(stop || stopDemo) {return;}
                delayMicroseconds(speed);  //introducing a little bit of delay to 'smoothen-out' transitions
            }
    
    //maxVal= (maxVal>=120) ? maxVal-2 : (maxVal<8) ? 8 : maxVal-.8;
	
	if(stop || stopDemo) {return;}
    if(demo) {
        strip.setBrightness(127);
        strip.show();
        Particle.process();    //process Spark events
    }
    else {showPixels();}
}

/*
void smoothSwitch() {
    smooth = !digitalRead(SMOOTH_SW);
}

void modeButton() {
    dotMode = !dotMode;
}
*/

void initMicrophone() {
    pinMode(GAIN_CONTROL, OUTPUT);
    analogWrite(GAIN_CONTROL, INPUTLEVEL);  //digitalWrite(GAIN_CONTROL, LOW);
    //Seed the random number generator.  THINGS WILL NEVER BE THE SAME AGAIN
    srand(analogRead(MICROPHONE)); 
}

short FFT(short int dir,int m,float *x,float *y) {
   int n,i,i1,j,k,i2,l,l1,l2;
   float c1,c2,tx,ty,t1,t2,u1,u2,z;

   /* Calculate the number of points */
   n = 1;
   for (i=0;i<m;i++) 
      n *= 2;

   /* Do the bit reversal */
   i2 = n >> 1;
   j = 0;
   for (i=0;i<n-1;i++) {
      if (i < j) {
         tx = x[i];
         ty = y[i];
         x[i] = x[j];
         y[i] = y[j];
         x[j] = tx;
         y[j] = ty;
      }
      k = i2;
      while (k <= j) {
         j -= k;
         k >>= 1;
      }
      j += k;
   }

   /* Compute the FFT */
   c1 = -1.0; 
   c2 = 0.0;
   l2 = 1;
   for (l=0;l<m;l++) {
      l1 = l2;
      l2 <<= 1;
      u1 = 1.0; 
      u2 = 0.0;
      for (j=0;j<l1;j++) {
         for (i=j;i<n;i+=l2) {
            i1 = i + l1;
            t1 = u1 * x[i1] - u2 * y[i1];
            t2 = u1 * y[i1] + u2 * x[i1];
            x[i1] = x[i] - t1; 
            y[i1] = y[i] - t2;
            x[i] += t1;
            y[i] += t2;
         }
         z =  u1 * c1 - u2 * c2;
         u2 = u1 * c2 + u2 * c1;
         u1 = z;
      }
      c2 = sqrt((1.0 - c1) / 2.0);
      if (dir == 1) 
         c2 = -c2;
      c1 = sqrt((1.0 + c1) / 2.0);
   }

   /* Scaling for forward transform */
   if (dir == 1) {
      for (i=0;i<n;i++) {
         x[i] /= n;
         y[i] /= n;
      }
   }

   return(0);
}

/* ============================== Text functions ============================== */

#endif
