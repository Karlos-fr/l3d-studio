#ifdef L3D_UNITY_BUILD

void digi(uint32_t col) {
    uint16_t i; 
    uint32_t nextCol;
    
    nextCol = switch1? colorWheel+=8 : col;
    
    if(0 == randomPixelFill(nextCol)) { return; }	//Populate the cube
	delay(400);
    if(0 == randomPixelFill(0x0)) { return; }		//Kill off the voxels
	
    run = TRUE;
}

// ----------------------------------------------------------------------------
// Remplit les pixels dans un ordre aleatoire avec une couleur donnee.
//
// Parametres :
// - c : couleur entiere appliquee, sauf si le mode aleatoire est actif.
//
// Retour :
// - un lorsque le remplissage se termine, zero lorsqu'il est interrompu.
//
// Effet de bord :
// - reutilise l'ordre de pixels du scratch partage et actualise les LED.
// ----------------------------------------------------------------------------
int randomPixelFill(uint32_t c) {
    uint16_t i; 
    uint32_t pulseRate;
    uint16_t* pixelFillOrder = sharedAnimationScratch.pixelOrder;
    
    for(i=0; i<strip.numPixels(); i++) {
        pixelFillOrder[i]=i;
    }
    
    for(i = strip.numPixels() - 1; i > 0; i--) {
        uint16_t other = random(0, i + 1);
        uint16_t value = pixelFillOrder[i];
        pixelFillOrder[i] = pixelFillOrder[other];
        pixelFillOrder[other] = value;
    }
    
    for(i=0; i<strip.numPixels(); i++) {
        if(stop || stopDemo) {return 0;}
        if(switch2 && c != 0x0) {c = Wheel(random(256));}
        if(switch3) {
            fadeInToColor(pixelFillOrder[i], getColorFromInteger(c));    //transitionOne(getColorFromInteger(c),pixelFillOrder[i],POLAR);
        }
        else {
            strip.setPixelColor(pixelFillOrder[i], c);
            showPixels();
            delay(speed);
        }
    }
    return 1;
}

#endif
