// ============================================================================
// Rain - Implémentation de la pluie voxel historique
// ----------------------------------------------------------------------------
// Ce fichier déplace les gouttes directement dans le framebuffer NeoPixel. Il
// ne partage pas l'état du moteur de salves GoldRain/AcidRain.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Atténue une couleur par une puissance de deux exacte.
//
// Parametres :
// - color : couleur RGB à atténuer.
// - shift : nombre de divisions entières par deux.
//
// Retour :
// - couleur dont chaque canal est décalé vers la droite.
// ----------------------------------------------------------------------------
Color scaleRainColor(Color color, uint8_t shift) {
    color.red >>= shift;
    color.green >>= shift;
    color.blue >>= shift;
    return color;
}

// ----------------------------------------------------------------------------
// Déplace les gouttes, applique leur traînée et crée de nouvelles gouttes.
//
// Parametres :
// - colorValue : couleur entière utilisée lorsque le switch aléatoire est coupé.
//
// Effet de bord :
// - lit et modifie le framebuffer, peut déclencher Lightning, consomme le
//   générateur aléatoire, affiche les LED puis applique le délai historique.
// ----------------------------------------------------------------------------
void rain(uint32_t colorValue) {
    Color dropColor;
    // Multiplicateur historique du délai utilisateur.
    const uint8_t speedFactor = 3;
    run = TRUE;

    // Déplace les gouttes existantes, du bas vers le haut de chaque colonne.
    for (uint8_t x = 0; x < SIDE; x++) {
        for (uint8_t z = 0; z < SIDE; z++) {
            for (int8_t y = 0; y < SIDE; y++) {
                // Couleur actuellement stockée dans le voxel inspecté.
                const Color pixelColor = getPixelColor(x, y, z);
                if (pixelColor != black) {
                    int8_t tailEndPosition = y + 2;
                    if (!switch2 && y == 0) {
                        // Recherche la fin réelle de la traînée au bord inférieur.
                        for (int8_t depth = 0; depth < SIDE; depth++) {
                            if (getPixelColor(x, depth, z) == black) {
                                tailEndPosition = depth - 1;
                                break;
                            }
                        }
                    }

                    if (tailEndPosition >= 2) {
                        setPixelColor(x, y - 1, z, pixelColor);
                        setPixelColor(
                            x,
                            y,
                            z,
                            switch2 ? pixelColor :
                                scaleRainColor(pixelColor, 1));
                        setPixelColor(
                            x,
                            y + 1,
                            z,
                            switch2 ? pixelColor :
                                scaleRainColor(pixelColor, 3));
                    } else if (tailEndPosition == 1) {
                        setPixelColor(
                            x,
                            y,
                            z,
                            switch2 ? pixelColor :
                                scaleRainColor(pixelColor, 2));
                    }
                    setPixelColor(
                        x,
                        tailEndPosition,
                        z,
                        (switch2 || switch3) ? pixelColor : black);
                    // Reprend la recherche au-dessus de la traînée déplacée.
                    y = tailEndPosition;
                }
            }
        }
    }

    if (switch4) {
        lastLightningInterval = lightningInterval;
        if (millis() - lastLightning >= lightningInterval) {
            lastLightning = millis();
            srand(lastLightning);
            do {
                lightningInterval = oneMinuteInterval / random(24, 76);
            } while (lastLightningInterval == lightningInterval);
            lightning();
        }
    }

    // Le mode Matrix atténue tout le framebuffer après le déplacement.
    if (switch2) {
        for (uint8_t x = 0; x < SIDE; x++) {
            for (uint8_t z = 0; z < SIDE; z++) {
                for (int8_t y = SIDE - 1; y >= 0; y--) {
                    setPixelColor(
                        x,
                        y,
                        z,
                        fadeColorSevenEighths(getPixelColor(x, y, z)));
                }
            }
        }
    }

    // Nombre historique de nouvelles gouttes, compris entre cinq et dix.
    const uint8_t rainDropCount = random(5, 11);
    for (uint8_t drop = 0; drop < rainDropCount; drop++) {
        for (uint8_t x = 0; x < SIDE; x++) {
            for (uint8_t z = 0; z < SIDE; z++) {
                if (getPixelColor(x, SIDE - 2, z) == black &&
                    getPixelColor(x, SIDE - 1, z) == black) {
                    int8_t rainDropX;
                    int8_t rainDropZ;
                    do {
                        rainDropX = random(0, SIDE);
                        rainDropZ = random(0, SIDE);
                        if (stop || stopDemo) {
                            return;
                        }
                    } while (
                        getPixelColor(rainDropX, SIDE - 1, rainDropZ) != black ||
                        getPixelColor(rainDropX, SIDE - 2, rainDropZ) != black);

                    if (switch1) {
                        dropColor = getColorFromInteger(Wheel(random(256)));
                    } else {
                        dropColor = getColorFromInteger(colorValue);
                    }
                    setPixelColor(rainDropX, SIDE - 1, rainDropZ, dropColor);
                    // Force la sortie des deux boucles de recherche historiques.
                    x = z = SIDE;
                }
            }
        }
    }
    if (stop || stopDemo) {
        return;
    }
    showPixels();
    delay(speed * speedFactor);
}

#endif
