#ifdef L3D_UNITY_BUILD

/* ========================== 3D life mode routines =========================== */
/*void life() {  
  int changeCount = 0;
  int neighbourCount = 0;
  bool aliveNow;
  bool aliveNext;

  bool liveMap[8][8][8];

  for (int i=0; i<8; i++) {
    for (int j=0; j<8; j++) {
      for (int k=0; k<8; k++) {
        neighbourCount = countNeighbors(i, j, k);
        aliveNow = getPixelColor(i, j, k) != black;
        aliveNext = (aliveNow && neighbourCount > 2 && neighbourCount < 8) || (!aliveNow && neighbourCount == 5);
        liveMap[i][j][k] = aliveNext;
        if (aliveNow != aliveNext) {
          changeCount++;
        }
      }
    }
  }
  background(black);  
  for (int i=0; i<8; i++) {
    for (int j=0; j<8; j++) {
      for (int k=0; k<8; k++) {
        if (liveMap[i][j][k]) {
          //setPixelColor(i, j, k, Color((i+1)*31,(j+1)*31,(k+1)*31));
		  setPixelColor(i, j, k, Color((i+1)*255/60,(j+1)*255/60,(k+1)*255/60));
        } else {
          setPixelColor(i, j, k, black);
        }
      }
    }
  }
  iterationCount++;
  if (changeCount) {
	//delay(speed*3);
	delay(400);
  } else {
    delay(1000);
    lifeResetCube();
    iterationCount = 0;
  }
  //Set Maximum number of iterations here...
  if (iterationCount > MAX_ITERATIONS) {
	delay (1000);
    lifeResetCube();
    iterationCount = 0;
  }
  
  //if(stop || stopDemo) {return;}
  strip.show();
  //Particle.process();
  //showPixels();
  //delay(speed);
  run = TRUE;
}
void lifeResetCube() {
	
	//delay (1000);
    background(black);
	//randomSeed(random(100) * analogRead(MICROPHONE));
	randomSeed(random(100) * analogRead(0));
	for (int i=0; i<8; i++) {
		for (int j=0; j<8; j++) {
			for (int k=0; k<8; k++) {
				if ((random(1, 100) > 40)) {
					//setPixelColor(i, j, k, Color((i+1)*20,(j+1)*20,(k+1)*20));
					setPixelColor(i, j, k, Color((i+1)*255/60,(j+1)*255/60,(k+1)*255/60));
				}
			}
		}
	}
	if(stop || stopDemo) {return;}
	strip.show();
    Particle.process();
	//showPixels();
}

int countNeighbors(int x, int y, int z) {
  int count = 0;

  for (int i=x-1; i<x+2; i++) {
    for (int j=y-1; j<y+2; j++) {
      for (int k=z-1; k<z+2; k++) {
        if ((i >= 0 && j >= 0 && k >= 0) && (i<=7 && j<=7 && k<=7) && !(i == x && j==y && k==z) && getPixelColor(i,j,k) != black) {
          count++;
        }
      }
    }
  }
  return count;
}*/

#endif
