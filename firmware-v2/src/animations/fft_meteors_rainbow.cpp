// ============================================================================
// FftMeteorsRainbow - Implementation du spectre CubeTube lisse
// ----------------------------------------------------------------------------
// Ce fichier porte la variante 2015 de Werner Moecke. Les tableaux FFT sont
// mutualises et les couleurs utilisent une interpolation entiere compacte.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Delai historique entre les echantillons de FftMeteorsRainbow.
const uint16_t FFT_METEORS_SAMPLE_DELAY_US = 120;

// Delai historique applique pendant la propagation dans la profondeur.
const uint8_t FFT_METEORS_TRAIL_DELAY_US = 20;

// Canal maximal de la palette originale.
const uint8_t FFT_METEORS_MAX_CHANNEL = 80;

// Coefficient fixe utilise pour effacer rapidement les points precedents.
const uint8_t FFT_METEORS_TRAIL_LENGTH = 50;

// Maximum audio adaptatif propre a cette variante FFT.
static float fftMeteorsMaximum;

// ----------------------------------------------------------------------------
// Attenue un canal en soustrayant un coefficient avec saturation a zero.
//
// Parametres :
// - channel : canal RGB courant.
// - decrement : valeur a soustraire.
//
// Retour :
// - canal attenue sans repliement entier.
// ----------------------------------------------------------------------------
static uint8_t subtractFftMeteorsChannel(
    uint8_t channel,
    uint8_t decrement) {
    return channel > decrement ? channel - decrement : 0;
}

// ----------------------------------------------------------------------------
// Multiplie les trois canaux par une fraction entiere.
//
// Parametres :
// - color : couleur source.
// - numerator : numerateur de la fraction.
// - denominator : denominateur non nul de la fraction.
//
// Retour :
// - couleur mise a l'echelle avec la troncature historique.
// ----------------------------------------------------------------------------
static Color scaleFftMeteorsColor(
    Color color,
    uint8_t numerator,
    uint8_t denominator) {
    color.red = static_cast<uint16_t>(color.red) * numerator / denominator;
    color.green = static_cast<uint16_t>(color.green) * numerator / denominator;
    color.blue = static_cast<uint16_t>(color.blue) * numerator / denominator;
    return color;
}

// ----------------------------------------------------------------------------
// Reinitialise le niveau adaptatif de FftMeteorsRainbow.
//
// Effet de bord :
// - replace le maximum audio a sa valeur CubeTube initiale.
// ----------------------------------------------------------------------------
void resetFftMeteorsRainbow() {
    fftMeteorsMaximum = 8.0f;
}

// ----------------------------------------------------------------------------
// Capture et affiche une frame de FftMeteorsRainbow.
//
// Effet de bord :
// - utilise le scratch FFT, modifie le framebuffer et affiche les pixels.
// ----------------------------------------------------------------------------
void runFftMeteorsRainbow() {
    run = TRUE;
    captureCubeTubeFft(FFT_METEORS_SAMPLE_DELAY_US);

    for (uint8_t index = 0; index < ARRAY_SIZE; index++) {
        if (spectrumImaginary[index] > fftMeteorsMaximum) {
            fftMeteorsMaximum = spectrumImaginary[index];
        }
    }

    for (uint8_t band = 0; band < SIDE; band++) {
        const float normalized =
            SIDE * spectrumImaginary[band] / fftMeteorsMaximum;
        const uint8_t peak = normalized >= SIDE - 1
            ? SIDE - 1
            : static_cast<uint8_t>(normalized);

        for (uint8_t y = 0; y <= peak; y++) {
            const Color color = cubeTubeColorMap(
                y,
                SIDE,
                FFT_METEORS_MAX_CHANNEL);
            setPixelColor(band, y, SIDE - 1, color);

            const uint8_t previousY = y > 0 ? y - 1 : 1;
            Color previous = getPixelColor(band, previousY, SIDE - 1);
            const uint8_t decrement = FFT_METEORS_TRAIL_LENGTH +
                FFT_METEORS_MAX_CHANNEL / (y + 1);
            previous.red = subtractFftMeteorsChannel(previous.red, decrement);
            previous.green = subtractFftMeteorsChannel(previous.green, decrement);
            previous.blue = subtractFftMeteorsChannel(previous.blue, decrement);
            setPixelColor(band, previousY, SIDE - 1, previous);
        }

        for (uint8_t y = peak + 1; y < SIDE; y++) {
            Color color = getPixelColor(band, y, SIDE - 1);
            color = scaleFftMeteorsColor(color, SIDE - y, SIDE - 1);
            setPixelColor(band, y, SIDE - 1, color);
        }
    }

    for (uint8_t z = 0; z < SIDE - 1; z++) {
        for (uint8_t x = 0; x < SIDE; x++) {
            for (uint8_t y = 0; y < SIDE; y++) {
                Color trail = getPixelColor(x, y, z + 1);
                trail = scaleFftMeteorsColor(trail, SIDE, SIDE - 1);
                setPixelColor(x, y, z, trail);
                if (stop || stopDemo) {
                    return;
                }
                delayMicroseconds(FFT_METEORS_TRAIL_DELAY_US);
            }
        }
    }

    fftMeteorsMaximum = fftMeteorsMaximum >= 120.0f
        ? fftMeteorsMaximum - 2.0f
        : (fftMeteorsMaximum < 8.0f
            ? 8.0f
            : fftMeteorsMaximum - 0.8f);
    showPixels();
}

#endif
