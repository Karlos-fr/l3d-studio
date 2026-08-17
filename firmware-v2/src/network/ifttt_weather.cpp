// ============================================================================
// IftttWeather - Implémentation de l'affichage temporaire IFTTT
// ----------------------------------------------------------------------------
// Ce fichier réutilise les primitives texte et restaure le mode précédent. Il
// n'ouvre aucune connexion réseau et ne possède aucun buffer de réponse.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Affiche la couleur ou le texte IFTTT pendant l'intervalle historique.
//
// Parametres :
// - c : couleur entière transmise par la commande externe.
//
// Effet de bord :
// - avance le texte, modifie le framebuffer puis restaure éventuellement le
//   mode, la luminosité et les switches précédents.
// ----------------------------------------------------------------------------
void iftttWeather(uint32_t c) {
    uint32_t calculatedInterval;
    // Durée maximale historique avant le retour au mode précédent.
    const uint32_t iftttWeatherInterval = 10UL * 60UL * 1000UL;
    // Longueur bornée réutilisée par le positionnement et les seuils du texte.
    const size_t messageLength = strnlen(message, sizeof(message));
    
    //If we're displaying text, configure the interval individually
    if(isNewText) {
        switch(whichTextMode) {
            case 0:
                calculatedInterval = iftttWeatherInterval * .2;
                break;
            case 1:
                calculatedInterval = iftttWeatherInterval * .3;
                break;
        }
    }
    else {calculatedInterval = iftttWeatherInterval;}
    
    if((millis() - lastCommandReceived) < calculatedInterval) {
        if(isNewText) {
            background(black);
            
            //(largest_item - smallest_item) maps to (max-min)
            // Rapport constant entre la vitesse utilisateur et le déplacement.
            const float ratio = (.5 - .05)/((120*.05) - .05);
            //(min + ratio*(value-smallest_item))
            // Déplacement du texte calculé une fois pour la frame.
            const float speedFactor = .05 +
                ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
            pos += speedFactor;

            switch(whichTextMode) {
                case 0:
                    //Can't call textMarquee(col, 0) wrapper directly, due to conflicts with switches 2 and 3
                    marquee(message, pos, getColorFromInteger(c));
                    if (pos >= (SIDE*map(messageLength, 1, 63, 4, SIDE))+
                        messageLength*8)
                        pos = map(messageLength, 1, 63, (int)-(SIDE*.5), 0);
                    break;
                case 1:
                    //Can't call textScroll(col, 0) wrapper directly, due to conflicts with switches 2 and 3
                    scrollText(
                        message,
                        Point(pos - messageLength, 0, 6),
                        getColorFromInteger(c));
                    if (pos >= (SIDE*map(messageLength, 1, 63, 1, SIDE))+
                        messageLength*8)
                        pos = map(messageLength, 1, 63, (int)-(SIDE*.5), 0);
                    break;

            }
            showPixels();
        	if(stop || stopDemo) {return;}
        }
        else {
            switch1 = FALSE;
            pulse_oneColorAll(c);
        }
    }
    else {
        if(isNewText) {
	    whichTextMode = (whichTextMode+1)%2; 
            //whichTextMode++;
            //if(whichTextMode > 2) {whichTextMode = 0;}
            isNewText = FALSE;
        }
        brightness = lastBrightness;
        switch1 = lastSwitchState[0];
        demo = lastDemo;    // restore demo state
        setNewMode(getModeIndexFromID(previousModeID));
    }
    run = true;
}

/**
 * Source Credit: http://www.instructables.com/id/Led-Cube-8x8x8/
 * Ported by Kevin Carlborg
 * Some standard cube visuals as seen on you tube
 * stackingRope by Kevin Carlborg
 * mode == 0 : run All
 * mode == 1 : run Single
 */

#endif
