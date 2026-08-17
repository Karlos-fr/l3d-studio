#ifdef L3D_UNITY_BUILD

void cubeBounce_setup()  {
	background(black);
	topLeftVoxel[0] = random(0, 8);
	topLeftVoxel[1] = random(0, 8);
	topLeftVoxel[2] = random(0, 8);
	cubeColor = Color(random(256), random(256), random(256));
	CBframe = 0;
}

void cubeBounce() {
  background(black);  
  collided = false;

  topLeftVoxel[0] += CBdirection[0];
  topLeftVoxel[1] += CBdirection[1];
  topLeftVoxel[2] += CBdirection[2];

  if (topLeftVoxel[0] < 0 || topLeftVoxel[0] > 6) {
    topLeftVoxel[0] -= 2*CBdirection[0];
    CBdirection[0] = -CBdirection[0];
    collided = true;
  }
  if (topLeftVoxel[1] < 0 || topLeftVoxel[1] > 6) {
    
    topLeftVoxel[1] -= 2*CBdirection[1];
    CBdirection[1] = -CBdirection[1];
    collided = true;
  }
  if (topLeftVoxel[2] < 0 || topLeftVoxel[2] > 6) {
    
    topLeftVoxel[2] -= 2*CBdirection[2];
    CBdirection[2] = -CBdirection[2];
    collided = true;
  }
  if (collided) {
    cubeColor = Color(random(256), random(256), random(256));
  }
  CBframe++;
  if (CBframe % 25 == 0) {
    while (true) {
      CBdirection[0] = random(-1, 1);
      CBdirection[1] = random(-1, 1);
      CBdirection[2] = random(-1, 1);
      if (!(CBdirection[0] == 0 && CBdirection[1] == 0 && CBdirection[2] == 0)) {
        break;
      }
    }
  }
  for (int i=topLeftVoxel[0]; i<topLeftVoxel[0]+bounds[0]; i++) {
    for (int j=topLeftVoxel[1]; j<topLeftVoxel[1]+bounds[1]; j++) {
      for (int k=topLeftVoxel[2]; k<topLeftVoxel[2]+bounds[2]; k++) {
        setPixelColor(i, j, k, cubeColor);
      }
    }
  }
  
  if(stop || stopDemo) {return;}
  showPixels();
  delay(speed);
  run = TRUE;	
}


// Displays a slideshow from the char table with transitions in between

#endif
