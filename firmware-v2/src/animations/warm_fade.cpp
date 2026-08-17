// ============================================================================
// WarmFade - Implementation du fondu chaud RGB
// ----------------------------------------------------------------------------
// Ce fichier calcule les trois courbes de couleur historiques sans connaitre
// le mapping physique des LED.
// ============================================================================

#ifdef L3D_UNITY_BUILD

void warmFade(void) {
    float i; 
    Color col;
    run = TRUE;
    
    for(i=0; i<256; i++) {
        col = {fadeSqRt(i),fadeLinear(i),fadeSquare(i)};
        background(col);
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
    for(i=255; i>0; i--) {
        col = {fadeSqRt(i),fadeLinear(i),fadeSquare(i)};
        background(col);
        if(stop || stopDemo) {return;}
        showPixels();
        delay(speed);
    }
}

// ----------------------------------------------------------------------------
// Calcule la composante quadratique du fondu chaud.
//
// Parametres :
// - value : intensite source comprise entre 0 et 255.
//
// Retour :
// - intensite quadratique tronquee sur un octet.
// ----------------------------------------------------------------------------
uint8_t fadeSquare(float value) {
    // Intensite ramenee dans l'intervalle unitaire avant mise au carre.
    const float normalizedValue = value / 255.0f;
    return static_cast<uint8_t>(255.0f * normalizedValue * normalizedValue);
}

// warmFade helper function
uint8_t fadeSqRt(float value) {
    return (uint8_t)(255*sqrt(value/255));
}

// warmFade helper function
uint8_t fadeLinear(float value) {
    return (uint8_t) value;
}

#endif
