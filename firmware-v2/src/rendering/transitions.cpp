// ============================================================================
// Transitions - Implémentation des transitions et affichages partagés
// ----------------------------------------------------------------------------
// Ce fichier interpole les couleurs et transmet le framebuffer au pilote. Il
// ne décide ni du mode actif ni du mapping logique des coordonnées.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Fait evoluer simultanement les 512 pixels vers une couleur cible.
//
// Parametres :
// - endColor : couleur atteinte a la derniere etape.
// - method : courbe LINEAR ou POLAR utilisee par l'interpolation historique.
//
// Effet de bord :
// - utilise temporairement `drawingBuffer`, affiche huit etapes et traite les
//   evenements Particle entre les affichages.
// ----------------------------------------------------------------------------
void transitionAll(Color endColor, uint16_t method) {
    // Nombre historique d'étapes affichées par une transition globale.
    const uint8_t numSteps = 8;
    // Le buffer RGB persistant de CubePainter sert ici de scratch. Cette duree
    // de vie exclusive retire 2 048 octets de la pile sans second framebuffer.
    // CubePainter recharge ensuite son contenu depuis l'EEPROM a son entree.
    for(int index = 0; index < strip.numPixels(); index++) {
        Color startColor = getColorFromInteger(strip.getPixelColor(index));
        int offset = index * BPP;
        drawingBuffer[offset] = startColor.red;
        drawingBuffer[offset + 1] = startColor.green;
        drawingBuffer[offset + 2] = startColor.blue;
    }

    for(uint8_t step = 1; step <= numSteps; step++) {
        // Progression flottante identique à celle du calcul polaire historique.
        const float progress = static_cast<float>(step) / numSteps;
        // Facteur décroissant commun aux 512 voxels de cette étape.
        const double polarDecreaseFactor =
            method == LINEAR ? 0.0 : sqrt(progress);
        // Facteur croissant commun aux 512 voxels de cette étape.
        const float polarIncreaseFactor =
            method == LINEAR ? 0.0f : progress * progress;
        for(uint16_t index = 0; index < strip.numPixels(); index++) {
            int offset = index * BPP;
            Color startColor = Color(
                drawingBuffer[offset],
                drawingBuffer[offset + 1],
                drawingBuffer[offset + 2]);
            transitionHelper(
                startColor,
                endColor,
                index,
                method,
                numSteps,
                step,
                polarDecreaseFactor,
                polarIncreaseFactor);
            if(stop || stopDemo) {return;}
        }
        showPixels();
        delay(speed);
    }
}

// ----------------------------------------------------------------------------
// Fait évoluer un pixel physique vers une couleur cible.
//
// Parametres :
// - endColor : couleur atteinte à la dernière étape.
// - index : index physique du pixel, prévalidé par l'appelant.
// - method : courbe LINEAR ou POLAR de l'interpolation.
//
// Effet de bord :
// - affiche huit états et traite les événements Particle entre les états.
// ----------------------------------------------------------------------------
void transitionOne(Color endColor, uint16_t index, uint16_t method) {
    // Nombre historique d'étapes affichées pour un pixel.
    const uint8_t numSteps = 8;
    Color startColor = getColorFromInteger(strip.getPixelColor(index));

    for(uint8_t step = 1; step <= numSteps; step++) {
        // Progression flottante identique à celle du calcul polaire historique.
        const float progress = static_cast<float>(step) / numSteps;
        // Facteur décroissant partagé par les trois canaux de cette étape.
        const double polarDecreaseFactor =
            method == LINEAR ? 0.0 : sqrt(progress);
        // Facteur croissant partagé par les trois canaux de cette étape.
        const float polarIncreaseFactor =
            method == LINEAR ? 0.0f : progress * progress;
        transitionHelper(
            startColor,
            endColor,
            index,
            method,
            numSteps,
            step,
            polarDecreaseFactor,
            polarIncreaseFactor);
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
}

// ----------------------------------------------------------------------------
// Calcule puis écrit les trois canaux d'une étape de transition.
//
// Parametres :
// - startColor : couleur capturée au début de la transition.
// - endColor : couleur cible.
// - index : index physique du pixel.
// - method : courbe d'interpolation historique.
// - numSteps : nombre total d'étapes, strictement positif.
// - step : étape courante comprise entre un et numSteps.
// - polarDecreaseFactor : racine de la progression déjà mutualisée.
// - polarIncreaseFactor : carré de la progression déjà mutualisé.
//
// Effet de bord :
// - écrit le pixel dans le framebuffer NeoPixel sans l'afficher.
// ----------------------------------------------------------------------------
void transitionHelper(
    Color startColor,
    Color endColor,
    uint16_t index,
    uint16_t method,
    uint8_t numSteps,
    uint8_t step,
    double polarDecreaseFactor,
    float polarIncreaseFactor) {
    Color col2;

    // Incrément calculé pour le canal rouge.
    const int16_t redStep = getTransitionStep(
        startColor.red, endColor.red, method, numSteps, step,
        polarDecreaseFactor, polarIncreaseFactor);
    // Incrément calculé pour le canal vert.
    const int16_t greenStep = getTransitionStep(
        startColor.green, endColor.green, method, numSteps, step,
        polarDecreaseFactor, polarIncreaseFactor);
    // Incrément calculé pour le canal bleu.
    const int16_t blueStep = getTransitionStep(
        startColor.blue, endColor.blue, method, numSteps, step,
        polarDecreaseFactor, polarIncreaseFactor);

    // Les bornes suivent la direction de chaque canal vers sa cible.
    if(endColor.red   > startColor.red)   col2.red   = clamp(startColor.red   + redStep,  0,             endColor.red);
	else                                  col2.red   = clamp(startColor.red   + redStep,  endColor.red,  0xFF);
	if(endColor.green > startColor.green) col2.green = clamp(startColor.green + greenStep,0,             endColor.green);
	else                                  col2.green = clamp(startColor.green + greenStep,endColor.green,0xFF);
	if(endColor.blue  > startColor.blue)  col2.blue  = clamp(startColor.blue  + blueStep, 0,             endColor.blue);
	else                                  col2.blue  = clamp(startColor.blue  + blueStep, endColor.blue, 0xFF);
	
    // La dernière étape impose la cible exacte malgré les troncatures.
    if(step == numSteps) {
        col2.red   = endColor.red;
        col2.green = endColor.green;
        col2.blue  = endColor.blue;
    }
    
    strip.setPixelColor(index, strip.Color(col2.red, col2.green, col2.blue));
}

// ----------------------------------------------------------------------------
// Calcule l'incrément signé d'un canal pour une étape.
//
// Parametres :
// - startChannel : valeur initiale du canal.
// - endChannel : valeur cible du canal.
// - method : interpolation LINEAR ou polaire historique.
// - numSteps : nombre total d'étapes, strictement positif.
// - step : étape courante comprise entre un et numSteps.
// - polarDecreaseFactor : racine de progression précalculée.
// - polarIncreaseFactor : carré de progression précalculé.
//
// Retour :
// - incrément tronqué comme dans l'implémentation historique.
// ----------------------------------------------------------------------------
int16_t getTransitionStep(
    uint8_t startChannel,
    uint8_t endChannel,
    uint16_t method,
    uint8_t numSteps,
    uint8_t step,
    double polarDecreaseFactor,
    float polarIncreaseFactor) {
    // Écart signé borné entre -255 et 255.
    const int16_t difference =
        static_cast<int16_t>(endChannel) - startChannel;
    if(method == LINEAR) {
        return (step * difference) / numSteps;
    }
    if(endChannel < startChannel) {
        return polarDecreaseFactor * static_cast<float>(difference);
    }
    return polarIncreaseFactor * static_cast<float>(difference);
}

// ----------------------------------------------------------------------------
// Exécute l'ancienne transition globale à pas d'intensité variables.
//
// Parametres :
// - bgcolor : couleur cible, ou noir pour une extinction progressive.
// - loop : indique une extinction historique lorsqu'il vaut vrai.
//
// Effet de bord :
// - modifie `run`, le framebuffer et affiche chaque niveau calculé.
// ----------------------------------------------------------------------------
void transition(Color bgcolor, bool loop) {
    uint32_t maxColorPixel = getHighestValFromRGB(bgcolor);
    uint32_t top = maxColorPixel > 0 ? maxColorPixel : 0xFF;
    Color col2;
    run = loop;
    
    for(int i=0; i<=top; i+=top*.125) {
        for(int index = 0; index < strip.numPixels(); index++) {
            if(maxColorPixel > 0) {
                //Fade in to color
                if(i < bgcolor.red) col2.red = i;
                if(i < bgcolor.green) col2.green = i;
                if(i < bgcolor.blue) col2.blue = i;
            }
            else {
                //Fade out from color
                col2 = getPixelColor(index);
                if(col2.red > 0) col2.red -= col2.red*.125;
                if(col2.green > 0) col2.green -= col2.green*.125;
                if(col2.blue > 0) col2.blue -= col2.blue*.125;
            }
            strip.setPixelColor(index, strip.Color(col2.red, col2.green, col2.blue));
        }
        if(stop) {demo = FALSE; return;}
        showPixels();
        delay(speed);
    }
}

///Fade all pixels to black. Or should it be called fade to off
/*void fadeToBlack(void) {
    uint16_t tryCount = 0;
    bool didWeFindAVoxelStillOn;
    //Fade any voxels still lit
    do {
        didWeFindAVoxelStillOn = FALSE;
        for(int idx = 0; idx < PIXEL_CNT; idx++) {
            if(strip.getPixelColor(idx) > 0) {
                transition(black, true);
                didWeFindAVoxelStillOn = TRUE;
            }
        }
        tryCount++;
    }while(tryCount<6 && didWeFindAVoxelStillOn);
}*/

// ----------------------------------------------------------------------------
// Remplit le framebuffer physique avec une couleur uniforme.
//
// Parametres :
// - col : couleur RGB appliquée aux 512 pixels.
//
// Effet de bord :
// - modifie le framebuffer sans appeler `showPixels`.
// ----------------------------------------------------------------------------
void background(Color col) {
    for(int index = 0; index < strip.numPixels(); index++)
        strip.setPixelColor(index, strip.Color(col.red, col.green, col.blue));
}

// ----------------------------------------------------------------------------
// Applique la luminosité, transmet le framebuffer et traite Particle.
//
// Retour :
// - un, pour conserver le contrat historique des appelants.
//
// Effet de bord :
// - pilote les LEDs puis permet au Cloud de traiter ses événements.
// ----------------------------------------------------------------------------
int showPixels(void) {
	strip.setBrightness(brightness);
    strip.show();
    Particle.process();    //process Spark events
	return 1;
}

#endif
