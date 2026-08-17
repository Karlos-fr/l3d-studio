#ifdef L3D_UNITY_BUILD

void matrix_setup() {
  for(int i=8;i>0;i--) {
      voxelXw1[i]=rand()%8;
      voxelZw1[i]=rand()%8;
      voxelXw2[i]=rand()%8;
      voxelZw2[i]=rand()%8;
      voxelXw3[i]=rand()%8;
      voxelZw3[i]=rand()%8;
      voxelXw4[i]=rand()%8;
      voxelZw4[i]=rand()%8;
    }
}

void matrix() {

  if (wave01>-10) {
    for(int i=8;i>0;i--)
      {
        setPixelColor(voxelXw1[i], wave01+9, voxelZw1[i], black);
        setPixelColor(voxelXw1[i], wave01+8, voxelZw1[i], brightLine06);
        setPixelColor(voxelXw1[i], wave01+7, voxelZw1[i], brightLine05);
        setPixelColor(voxelXw1[i], wave01+6, voxelZw1[i], brightLine04);
        setPixelColor(voxelXw1[i], wave01+5, voxelZw1[i], brightLine04);
        setPixelColor(voxelXw1[i], wave01+4, voxelZw1[i], brightLine03);
        setPixelColor(voxelXw1[i], wave01+3, voxelZw1[i], brightLine03);
        setPixelColor(voxelXw1[i], wave01+2, voxelZw1[i], brightLine02);
        setPixelColor(voxelXw1[i], wave01+1, voxelZw1[i], brightLine02);
        setPixelColor(voxelXw1[i], wave01, voxelZw1[i], brightLine01);
      }
    wave01--;
  }
  else {
    wave01=7;
    for(int i=8;i>0;i--)
      {
        voxelXw1[i]=rand()%8;
        voxelZw1[i]=rand()%8;
      }
  }
  if (wave02>-10) {
    for(int i=8;i>0;i--)
      {
        setPixelColor(voxelXw2[i], wave02+9, voxelZw2[i], black);
        setPixelColor(voxelXw2[i], wave02+8, voxelZw2[i], medLine05);
        setPixelColor(voxelXw2[i], wave02+7, voxelZw2[i], medLine04);
        setPixelColor(voxelXw2[i], wave02+6, voxelZw2[i], medLine04);
        setPixelColor(voxelXw2[i], wave02+5, voxelZw2[i], medLine03);
        setPixelColor(voxelXw2[i], wave02+4, voxelZw2[i], medLine03);
        setPixelColor(voxelXw2[i], wave02+3, voxelZw2[i], medLine02);
        setPixelColor(voxelXw2[i], wave02+2, voxelZw2[i], medLine02);
        setPixelColor(voxelXw2[i], wave02+1, voxelZw2[i], medLine02);
        setPixelColor(voxelXw2[i], wave02, voxelZw2[i], medLine01);
      }
    wave02--;
  }
  else {
    wave02=7;
    for(int i=8;i>0;i--)
      {
        voxelXw2[i]=rand()%8;
        voxelZw2[i]=rand()%8;
      }
  }
  if (wave03>-10) {
    for(int i=8;i>0;i--)
      {
        setPixelColor(voxelXw3[i], wave03+9, voxelZw3[i], black);
        setPixelColor(voxelXw3[i], wave03+8, voxelZw3[i], darkLine05);
        setPixelColor(voxelXw3[i], wave03+7, voxelZw3[i], darkLine04);
        setPixelColor(voxelXw3[i], wave03+6, voxelZw3[i], darkLine04);
        setPixelColor(voxelXw3[i], wave03+5, voxelZw3[i], darkLine03);
        setPixelColor(voxelXw3[i], wave03+4, voxelZw3[i], darkLine03);
        setPixelColor(voxelXw3[i], wave03+3, voxelZw3[i], darkLine02);
        setPixelColor(voxelXw3[i], wave03+2, voxelZw3[i], darkLine02);
        setPixelColor(voxelXw3[i], wave03+1, voxelZw3[i], darkLine02);
        setPixelColor(voxelXw3[i], wave03, voxelZw3[i], darkLine01);
      }
    wave03--;
  }
  else {
    wave03=7;
    for(int i=8;i>0;i--)
      {
        voxelXw3[i]=rand()%8;
        voxelZw3[i]=rand()%8;
      }
  }
  if (wave04>-10) {
    for(int i=8;i>0;i--)
      {
        setPixelColor(voxelXw4[i], wave04+9, voxelZw4[i], black);
        setPixelColor(voxelXw4[i], wave04+8, voxelZw4[i], medLine05);
        setPixelColor(voxelXw4[i], wave04+7, voxelZw4[i], medLine04);
        setPixelColor(voxelXw4[i], wave04+6, voxelZw4[i], medLine04);
        setPixelColor(voxelXw4[i], wave04+5, voxelZw4[i], medLine03);
        setPixelColor(voxelXw4[i], wave04+4, voxelZw4[i], medLine03);
        setPixelColor(voxelXw4[i], wave04+3, voxelZw4[i], medLine02);
        setPixelColor(voxelXw4[i], wave04+2, voxelZw4[i], medLine02);
        setPixelColor(voxelXw4[i], wave04+1, voxelZw4[i], medLine02);
        setPixelColor(voxelXw4[i], wave04, voxelZw4[i], medLine01);
      }
    wave04--;
  }
  else {
    wave04=7;
    for(int i=8;i>0;i--)
      {
        voxelXw4[i]=rand()%8;
        voxelZw4[i]=rand()%8;
      }
  }
  
  if(stop || stopDemo) {return;}
  showPixels();
  delay(speed);
  run = TRUE;
}

/* ======================== Cube Bounce mode routines ========================= */

#endif
