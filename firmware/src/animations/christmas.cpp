// ============================================================================
// Christmas - Implémentation des deux animations de Noël
// ----------------------------------------------------------------------------
// Ce fichier dessine les motifs lumineux et le sapin sur le framebuffer commun.
// Il ne gère ni le mapping physique ni la sélection des modes.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Anime les huit passages historiques de guirlandes multicolores.
//
// Effet de bord :
// - remplit la bande physique, l'affiche et applique les délais historiques.
// ----------------------------------------------------------------------------
void christmasLights(void) {
    uint16_t i;
    uint8_t f;
    // Multiplicateur historique du délai utilisateur.
    const uint8_t speedfactor = 12;
    run = TRUE;
    
    for (f=0; f < SIDE; f++) {
        for (i=0; i < strip.numPixels(); i++) {
            if(i%(SIDE-1)==0) strip.setPixelColor(i, 255,0,0 );
            if(i%(SIDE-1)==1) strip.setPixelColor(i, 255,255,0 );
            if(i%(SIDE-1)==2) strip.setPixelColor(i, 0,255,0 );
            if(i%(SIDE-1)==3) strip.setPixelColor(i, 0,255,255 );
            if(i%(SIDE-1)==4) strip.setPixelColor(i, 0,0,255 );
            if(i%(SIDE-1)==5) strip.setPixelColor(i, 255,0,255 );
            if(i%(SIDE-1)==6) strip.setPixelColor(i, 249,115,6 );
            if(i%(SIDE-1)==7) strip.setPixelColor(i, 194,0,120 );
        }
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed*speedfactor);
        for (uint16_t i=0; i < strip.numPixels(); i++)
            if(i%(SIDE-1)==f) strip.setPixelColor(i, 0,0,0 );
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed*speedfactor);
    }
}

// ----------------------------------------------------------------------------
// Dessine le sapin puis anime ses lumières, son étoile et sa neige.
//
// Effet de bord :
// - modifie les états statiques de l'étoile, consomme le générateur aléatoire
//   selon les switches et affiche le framebuffer.
// ----------------------------------------------------------------------------
void christmasTree(void) {
    // Abscisse centrale du sapin.
    const uint8_t xOrigin = 3;
    // Profondeur centrale du sapin.
    const uint8_t yOrigin = 3;
    // Multiplicateur historique du délai utilisateur.
    const uint8_t speedfactor = 8;
    float radius  = 4;
    // Intensité courante de l'étoile, bornée entre 8 et 128.
    static uint8_t starColorIdx = 16;
    // Vrai pendant la phase descendante du clignotement de l'étoile.
    static bool flipped = FALSE;
    run = TRUE;

    if(isFirstLap) {
        //Paint the tree
        for(int z=0;z<7;z+=2,radius--) {
            drawSolidHorizontalCircle(xOrigin, yOrigin, z, radius, green);
            drawSolidHorizontalCircle(xOrigin, yOrigin, z+1, radius-2, green);
            //drawHollowHorizontalCircle(xOrigin, yOrigin, z-1, radius-1, black, TRUE);
            //drawHollowHorizontalCircle(xOrigin, yOrigin, z, radius, black, TRUE);
        }
        //make the star
        setPixelColor(xOrigin,7,yOrigin,yellow);
        isFirstLap = FALSE;
    }
    
    //draw lights?
    if(switch3) {   //drawing a friggin' inverse conical helix with just a friggin' 8-bit 3D resolution is a friggin' PAIN!!
        Color col;
        radius = 4;
        for(int z=0;z<7;z++) {
            for(int d=0; d<=(2*PI); d++)
                if(z%2>0) {
                    randomColor(&col);
                    setPixelColor(xOrigin+((radius-.75)*cos(d)), z, yOrigin+((radius-.75)*sin(d)), col);  
                }
                else {
                    randomColor(&col);
                    setPixelColor(xOrigin+(radius*cos(d)), z, yOrigin+(radius*sin(d)), col);    
                }
            if(z%2>0)   //Yeah, tryin' to slow down the friggin' helix turns from tightening up too fast
                radius-=.75;
            else
                radius-=.25;
        }
    }
    
    //make the star pulse?
    if(switch2) {
        Color starColor;
        if (!flipped)
            if(starColorIdx < 128)
                starColorIdx+=8;
            else {
                starColorIdx = 128;
                flipped = TRUE;
            }
        else
            if(starColorIdx > 8)
                starColorIdx-=8;
            else {
                starColorIdx = 8;
                flipped = FALSE;
            }
        if(switch1)
            starColor = {fadeSqRt(starColorIdx),fadeLinear(starColorIdx),fadeSquare(starColorIdx)};
        else
            starColor = getColorFromInteger(lerpColor(strip.Color(starColor.red, starColor.green, starColor.blue), strip.Color(yellow.red, yellow.green, yellow.blue), starColorIdx, 16, 128));
        setPixelColor(xOrigin,7,yOrigin,starColor);
    }

    //make it snow?
    if(switch1) {
        //So you want some snow, do ya
        uint8_t whiteLevel;
        Color flakeColor;
        
        //First lets move any flakes that exist
        for(int x=0;x<8;x++) {
            for(int z=0;z<8;z++) {
                for(int y=0;y<8;y++) {
                    if(isWhiteColor(getPixelColor(x,z,y))) {
                        setPixelColor(x,z,y,black);  // If the voxel is white turn it black
                        if(getPixelColor(x,z-1,y)==black) {
                            //If the next voxel is black then continue the flake down
                            //Otherwise the flake melts, magically disapears, or whatever ya wanna call it
                            whiteLevel = random(80, 255);
                            flakeColor = {whiteLevel, whiteLevel, whiteLevel};
                            setPixelColor(x,z-1,y,flakeColor);  
                        }
                    }
                }
            }
        }
        //Now lets make new flakes - anywhere between 1 and 4 at a time
        uint8_t numFlakes = random(1,4);
        for(uint16_t i=0;i<numFlakes;i++) {
            uint8_t flakeX = 0;
            uint8_t flakeZ = 0;
            do{
                flakeX = random(0,7);
                flakeZ = random(0,7);
            } while(getPixelColor(flakeX, 7, flakeZ)!=black);
            //make a flake
            whiteLevel = random(80, 255);
            flakeColor = {whiteLevel, whiteLevel, whiteLevel};
            setPixelColor(flakeX, 7, flakeZ, flakeColor);
        }
    }
    if(stop || stopDemo) {return;}
    showPixels();
    delay(speed*speedfactor);
}

/* Trailing Rain Drops
 * @param c1 Selected rain drop color from the app
 *           or use boolean switch1 to toggle random rain drop colors */

#endif
