#ifdef L3D_UNITY_BUILD

void whirlWind() {
	const int arcs = 180; 
    run = TRUE;
    
    if (millis() - lastSwap > CYCLE_INTERVAL) {
        lastSwap = millis();
        for (int i=0; i<MAX_DOTS; i++) {
            y[i] = random(SIDE);
            radi[i] = random(MIN_RADI,MAX_RADI) + randomDecimal();
            angle[i] = randomDecimal() * 2 * PI;
            //clr[i] = Color(rand()%16, rand()%16, rand()%16);
            randomColor(&clr[i]);
        }    
    }
    
    background(black);
    
    for (int i=0; i<MAX_DOTS; i++) {
        //draw dots
        for (int i=0; i<MAX_DOTS; i++) {
            setPixelColor(center.x + radi[i] * cos(angle[i]), y[i], center.z + radi[i] * sin(angle[i]), clr[i]);
        }    
        if(stop || stopDemo) {return;}
        
        //move dots
        for (int i=0; i<MAX_DOTS; i++) {
            angle[i] += 2 * PI / arcs; 
            if (angle[i] > 2 * PI) {angle[i] -= 2*PI;}
        
            radi[i] += randomDecimal() / 200;
            y[i]    += randomDecimal() / 100;
            
            if (y[i] > SIDE || radi[i] > MAX_RADI) {
                y[i] = 0;
                radi[i] = MIN_RADI;
            }
        }    
        if(stop || stopDemo) {return;}
    }    
    showPixels();
    delay(speed * .5);
}

/*========== whirlWind helper functions ==========*/
void randomColor(struct Color *clr) {
  int r;
  do {
    r = random(7);
  } while (r == lastRand || r == lastLastRand);
  
  switch (r) {
    case 0: 
      clr->red   = random(3,128);
      clr->green = random(3,128);
      clr->blue  = random(3,128);
      break;
    case 1: 
      clr->red   = random(3,128);
      clr->green = random(2);
      clr->blue  = random(2);
      break;
    case 2: 
      clr->red   = random(2);
      clr->green = random(3,128);
      clr->blue  = random(2);
      break;
    case 3: 
      clr->red   = random(2);
      clr->green = random(2);
      clr->blue  = random(3,128);
      break;
    case 4: 
      clr->red   = random(2);
      clr->green = random(3,128);
      clr->blue  = random(3,128);
      break;
    case 5: 
      clr->red   = random(3,128);
      clr->green = random(2);
      clr->blue  = random(3,128);
      break;
    case 6: 
      clr->red   = random(3,128);
      clr->green = random(3,128);
      clr->blue  = random(2);
      break;
  }
  lastLastRand = lastRand;
  lastRand = r;
}
/*================================================*/

//A colored Christmas light string that twinkles

#endif
