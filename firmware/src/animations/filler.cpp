// ============================================================================
// Filler - Implémentation des remplissages ordonnés du cube
// ----------------------------------------------------------------------------
// Ce fichier choisit une couleur et un axe puis remplit le framebuffer commun.
// Il ne conserve que l'index de couleur nécessaire entre deux appels.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Choisit une couleur et remplit le cube suivant un axe aléatoire.
//
// Parametres :
// - c1 : première couleur du cycle.
// - c2 : deuxième couleur du cycle.
// - c3 : troisième couleur du cycle.
//
// Effet de bord :
// - avance l'index de couleur statique, consomme cinq tirages aléatoires au
//   plus, modifie le framebuffer et applique les délais historiques.
// ----------------------------------------------------------------------------
void filler(uint32_t c1, uint32_t c2, uint32_t c3) {
    // Index de couleur ; deux reproduit la sentinelle précédant le premier zéro.
    static uint8_t colorIndex = 2;
    Color col;
    run = TRUE;

    if(switch1) {
        col = getColorFromInteger(Wheel(random(256)));
        colorIndex = 2;
    }
    else {
		if(colorIndex >= 2) {colorIndex = 0;} else {colorIndex++;}
	    switch(colorIndex) {
	        case 0:
	            col = getColorFromInteger(c1);
	            break;
	        case 1:
	            col = getColorFromInteger(c2);
	            break;
	        case 2:
	            col = getColorFromInteger(c3);
	            break;
	    }
    }
    
    if(col != lastCol) {
    	lastCol = col;
		// Axe de remplissage choisi uniquement lorsqu'une nouvelle couleur apparaît.
		const uint8_t whichFill = random(0, 3);
        switch(whichFill) {
            case 0:
                fillX(col);
                break;
            case 1:
                fillY(col);
                break;
            case 2:
                fillZ(col);
                break;
        }
    }
    if(stop || stopDemo) {return;}
    delay(speed);
}

void fillX(Color col) {
    int whichX = random(0, 10);
    int whichY = random(0, 10);
    int whichZ = random(0, 10);
    int startX = (whichX%2 == 0) ? SIDE-1 : 0;
    int startY = (whichY%2 == 0) ? SIDE-1 : 0;
    int startZ = (whichZ%2 == 0) ? SIDE-1 : 0;

	for(int x=startX;(startX > 0 ? x>=0 : x<SIDE);(startX > 0 ? x-- : x++))
	    for(int y=startY;(startY > 0 ? y>=0 : y<SIDE);(startY > 0 ? y-- : y++))
			for(int z=startZ;(startZ > 0 ? z>=0 : z<SIDE);(startZ > 0 ? z-- : z++)) {
                int index=z*SIDE*SIDE+y*SIDE+x;
                setPixelColor(x,y,z,col);
                if((index%2==0)||(index==(SIDE*SIDE*SIDE)-1)) {
                    if(stop || stopDemo) {return;}
                    showPixels();
                    delay(speed);
                }
            }
}

void fillY(Color col) {
    int whichX = random(0, 10);
    int whichY = random(0, 10);
    int whichZ = random(0, 10);
    int startX = (whichX%2 == 0) ? SIDE-1 : 0;
    int startY = (whichY%2 == 0) ? SIDE-1 : 0;
    int startZ = (whichZ%2 == 0) ? SIDE-1 : 0;

	for(int y=startY;(startY > 0 ? y>=0 : y<SIDE);(startY > 0 ? y-- : y++))
	    for(int z=startZ;(startZ > 0 ? z>=0 : z<SIDE);(startZ > 0 ? z-- : z++))
			for(int x=startX;(startX > 0 ? x>=0 : x<SIDE);(startX > 0 ? x-- : x++)) {
                int index=z*SIDE*SIDE+y*SIDE+x;
                setPixelColor(x,y,z,col);
                if((index%2==0)||(index==(SIDE*SIDE*SIDE)-1)) {
                    if(stop || stopDemo) {return;}
                    showPixels();
                    delay(speed);
                }
            }
}

void fillZ(Color col) {
    int whichX = random(0, 10);
    int whichY = random(0, 10);
    int whichZ = random(0, 10);
    int startX = (whichX%2 == 0) ? SIDE-1 : 0;
    int startY = (whichY%2 == 0) ? SIDE-1 : 0;
    int startZ = (whichZ%2 == 0) ? SIDE-1 : 0;

	for(int z=startZ;(startZ > 0 ? z>=0 : z<SIDE);(startZ > 0 ? z-- : z++))
	    for(int x=startX;(startX > 0 ? x>=0 : x<SIDE);(startX > 0 ? x-- : x++))
			for(int y=startY;(startY > 0 ? y>=0 : y<SIDE);(startY > 0 ? y-- : y++)) {
                int index=z*SIDE*SIDE+y*SIDE+x;
                setPixelColor(x,y,z,col);
                if((index%2==0)||(index==(SIDE*SIDE*SIDE)-1)) {
                    if(stop || stopDemo) {return;}
                    showPixels();
                    delay(speed);
                }
            }
}

#endif
