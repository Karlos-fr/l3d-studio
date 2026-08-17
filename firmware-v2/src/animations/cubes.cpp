#ifdef L3D_UNITY_BUILD

void cubes(uint32_t c1, uint32_t c2, uint32_t c3, uint32_t c4) {
//void cubes() {
    //static int frameCount = 0;
    run = TRUE;
  
    background(black);
    Point topLeft=Point{0, 0, 0};
    
    if(switch2) {
        if (flipColor) {
            cubeCol = getColorFromInteger(Wheel(random(256)));
            flipColor = FALSE;
        }
    }
    
    switch(mode) {
        case(0):
            topLeft=Point{0, 0, 0};
            if(!switch2) {cubeCol=getColorFromInteger(c1);}    //Color{255, 0, 0};
            break;
        case(1):
            topLeft=Point{SIDE-1-side, 0, 0};
            if(!switch2) {cubeCol=getColorFromInteger(c2);}    //Color{255, 255, 0};
            break;
        case(2):
            topLeft=Point{SIDE-1-side, SIDE-1-side, 0};
            if(!switch2) {cubeCol=getColorFromInteger(c3);}    //Color{0, 255, 0};
            break;
        case(3):
            topLeft=Point{0, SIDE-1-side, 0};
            if(!switch2) {cubeCol=getColorFromInteger(c4);}    //Color{0, 0, 255};
            break;
        case(4):
            topLeft=Point{0, 0, SIDE-1-side};
            if(!switch2) {cubeCol=getColorFromInteger(c1);}    //Color{255, 0, 255};
            break;
        case(5):
            topLeft=Point{SIDE-1-side, 0, SIDE-1-side};
            if(!switch2) {cubeCol=getColorFromInteger(c2);}    //Color{0, 255, 255};
            break;
        case(6):
            topLeft=Point{SIDE-1-side, SIDE-1-side, SIDE-1-side};
            if(!switch2) {cubeCol=getColorFromInteger(c3);}    //Color{255, 255, 255};
            break;
        case(7):
            topLeft=Point(0, SIDE-1-side, SIDE-1-side);
            if(!switch2) {cubeCol=getColorFromInteger(c4);}    //Color{0, 180, 130};
            break;
        //frameCount++;
    }
    
    drawCube(topLeft, side, cubeCol);
    //if (frameCount%5==0)
        cubeInc();

    if(stop || stopDemo) {return;}
    showPixels();
    delay(speed);
}

/*========== cubes helper functions ==========*/
void cubeInc() {
    side+=inc;
    if ((side==SIDE-1)||(side==0)) {
        delay(speed+(speed*.5));
        inc*=-1;
    }
    if (side==0) {
        mode++;
        flipColor = TRUE;
        //frameCount = 0;
    }
    if (mode>7)
        mode=0;
}

void drawCube(Point topLeft, int side, Color col) {
    Color complementary=complement(col);
    Point topPoints[4];
    Point bottomPoints[4];
    topPoints[0]=topLeft;
    topPoints[1]=Point{topLeft.x+side, topLeft.y, topLeft.z};
    topPoints[2]=Point{topLeft.x+side, topLeft.y+side, topLeft.z};
    topPoints[3]=Point{topLeft.x, topLeft.y+side, topLeft.z};
    Point bottomLeft=Point{topLeft.x, topLeft.y, topLeft.z+side};
    bottomPoints[0]=bottomLeft;
    bottomPoints[1]=Point{bottomLeft.x+side, bottomLeft.y, bottomLeft.z};
    bottomPoints[2]=Point{bottomLeft.x+side, bottomLeft.y+side, bottomLeft.z};
    bottomPoints[3]=Point{bottomLeft.x, bottomLeft.y+side, bottomLeft.z};
    
    //draw bounding lines
    for (int i=0; i<4; i++) {
        drawLine(topPoints[i], bottomPoints[i], (switch3 ? complementary : col));
        drawLine(topPoints[i], topPoints[(i+1)%4], (switch3 ? complementary : col));
        drawLine(bottomPoints[i], bottomPoints[(i+1)%4], (switch3 ? complementary : col));
        if(stop || stopDemo) {return;}
    }
    
    for (int x=topLeft.x; x<=topLeft.x+side; x++)
        for (int y=topLeft.y; y<=topLeft.y+side; y++)
            for (int z=topLeft.z; z<=topLeft.z+side; z++) {
                //fill the cube?
                if(switch1) {setPixelColor(x,y,z, col);}
                    if((x==topLeft.x || y==topLeft.y || z==topLeft.z) || 
                       (x==topLeft.x+side || y==topLeft.y+side || z==topLeft.z+side)) {
                            //bleed edge color?
                            if (switch3) {setPixelColor(x,y,z, complementary);}
                            //bleed main color?
                            if (switch4) {setPixelColor(x,y,z, col);}
                       }
            }

    if(!switch4) {
        //paint the 4 edges of the cube with a complementary color
        for (int i=0; i<4; i++) {
            setPixelColor(topPoints[i], complementary);
            setPixelColor(bottomPoints[i], complementary);
            if(stop || stopDemo) {return;}
        }
    }
}
/*============================================*/

/** credit: Bill Marrs **/

#endif
