// ============================================================================
// ColorAll - Implémentation du chaser monochrome
// ----------------------------------------------------------------------------
// Ce fichier conserve uniquement ColorChaser ; le remplissage global obsolète
// reste remplacé par les transitions communes du firmware.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Fait avancer un voxel coloré et atténue sa traînée.
//
// Parametres :
// - colorValue : couleur entière appliquée au voxel courant.
//
// Effet de bord :
// - modifie l'index et le sens statiques, écrit et affiche le framebuffer puis
//   applique le délai historique à chaque niveau de fondu.
// ----------------------------------------------------------------------------
void colorChaser(uint32_t colorValue) {
    // Index du voxel courant, compris entre zéro et 511.
    static uint16_t pixelIndex = 0;
    // Sens de parcours courant de la bande physique.
    static bool reverseDirection = false;
    Color currentColor;
    // Couleur cible décomposée en canaux RGB.
    const Color targetColor = getColorFromInteger(colorValue);
    // Canal maximal déterminant le nombre de pas de fondu.
    const uint32_t maximumChannel = getHighestValFromRGB(targetColor);
    // Incrément historique dérivé de la vitesse utilisateur.
    const uint32_t increment = map(
        speed,
        1,
        120,
        static_cast<int>(maximumChannel * .25),
        5);
    run = TRUE;

    for (uint16_t level = 0; level <= 0xFF; level += increment) {
        if (level <= targetColor.red) {
            currentColor.red = level;
        }
        if (level <= targetColor.green) {
            currentColor.green = level;
        }
        if (level <= targetColor.blue) {
            currentColor.blue = level;
        }
        strip.setPixelColor(
            pixelIndex,
            strip.Color(
                currentColor.red,
                currentColor.green,
                currentColor.blue));

        for (uint16_t index = 0; index < PIXEL_CNT; index++) {
            if (index != pixelIndex) {
                // Couleur de traînée après l'atténuation entière commune.
                const Color fadedColor = fadeColorSevenEighths(
                    getColorFromInteger(strip.getPixelColor(index)));
                strip.setPixelColor(
                    index,
                    strip.Color(
                        fadedColor.red,
                        fadedColor.green,
                        fadedColor.blue));
            }
        }
        if (stop || stopDemo) {
            return;
        }
        showPixels();
        delay(speed);
    }

    if (reverseDirection) {
        pixelIndex--;
    } else {
        pixelIndex++;
    }

    if (pixelIndex == 0) {
        reverseDirection = false;
    }
    if (pixelIndex >= PIXEL_CNT) {
        pixelIndex = PIXEL_CNT - 2;
        reverseDirection = true;
    }
}

#endif
