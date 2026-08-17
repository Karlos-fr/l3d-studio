// ============================================================================
// Digi - Implémentation du remplissage aléatoire du cube
// ----------------------------------------------------------------------------
// Ce fichier remplit puis efface les voxels dans un ordre mélangé. L'ordre
// temporaire utilise le scratch partagé et le mapping reste dans le pilote LED.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Remplit puis efface le cube selon les switches Digi.
//
// Parametres :
// - color : couleur fixe utilisée lorsque le balayage est désactivé.
//
// Effet de bord :
// - consomme le générateur aléatoire, affiche les voxels et attend 400 ms entre
//   le remplissage et l'effacement.
// ----------------------------------------------------------------------------
void digi(uint32_t color) {
    // Couleur de départ, éventuellement avancée sur la roue historique.
    const uint32_t nextColor = switch1 ? colorWheel += 8 : color;

    if (randomPixelFill(nextColor) == 0) {
        return;
    }
    delay(400);
    if (randomPixelFill(0x0) == 0) {
        return;
    }

    run = TRUE;
}

// ----------------------------------------------------------------------------
// Remplit les pixels dans un ordre aléatoire avec une couleur donnée.
//
// Parametres :
// - color : couleur entière appliquée, sauf si le mode aléatoire est actif.
//
// Retour :
// - un lorsque le remplissage se termine, zéro lorsqu'il est interrompu.
//
// Effet de bord :
// - réutilise l'ordre de pixels du scratch partagé et actualise les LED.
// ----------------------------------------------------------------------------
int randomPixelFill(uint32_t color) {
    // Ordre des 512 pixels, valide uniquement pendant l'appel Digi.
    uint16_t* pixelFillOrder = sharedAnimationScratch.pixelOrder;

    for (uint16_t index = 0; index < strip.numPixels(); index++) {
        pixelFillOrder[index] = index;
    }

    for (uint16_t index = strip.numPixels() - 1; index > 0; index--) {
        // Position échangée dans la partie encore non mélangée.
        const uint16_t otherIndex = random(0, index + 1);
        // Valeur conservée pendant l'échange en place.
        const uint16_t pixelIndex = pixelFillOrder[index];
        pixelFillOrder[index] = pixelFillOrder[otherIndex];
        pixelFillOrder[otherIndex] = pixelIndex;
    }

    for (uint16_t index = 0; index < strip.numPixels(); index++) {
        if (stop || stopDemo) {
            return 0;
        }
        if (switch2 && color != 0x0) {
            color = Wheel(random(256));
        }
        if (switch3) {
            fadeInToColor(
                pixelFillOrder[index],
                getColorFromInteger(color));
        } else {
            strip.setPixelColor(pixelFillOrder[index], color);
            showPixels();
            delay(speed);
        }
    }
    return 1;
}

#endif
