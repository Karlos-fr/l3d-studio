// ============================================================================
// FftJoyLegacy - Implementation du spectre CubeTube original
// ----------------------------------------------------------------------------
// Ce fichier conserve les barres verticales et leur copie en profondeur. Les
// tableaux dynamiques implicites de la source sont remplaces par le scratch.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Delai historique entre les echantillons du FFTJoy original.
const uint16_t FFT_JOY_SAMPLE_DELAY_US = 212;

// Canal maximal de la palette du FFTJoy original.
const uint8_t FFT_JOY_MAX_CHANNEL = 50;

// Maximum audio adaptatif propre au FFTJoy original.
static float fftJoyMaximum;

// ----------------------------------------------------------------------------
// Reinitialise le maximum adaptatif de FftJoyLegacy.
//
// Effet de bord :
// - garantit un diviseur audio initial non nul.
// ----------------------------------------------------------------------------
void resetFftJoyLegacy() {
    fftJoyMaximum = 1.0f;
}

// ----------------------------------------------------------------------------
// Capture et affiche une frame du FFTJoy CubeTube original.
//
// Effet de bord :
// - utilise le scratch FFT, modifie le framebuffer et affiche les pixels.
// ----------------------------------------------------------------------------
void runFftJoyLegacy() {
    run = TRUE;
    captureCubeTubeFft(FFT_JOY_SAMPLE_DELAY_US);

    for (uint8_t index = 0; index < ARRAY_SIZE; index++) {
        if (spectrumImaginary[index] > fftJoyMaximum) {
            fftJoyMaximum = spectrumImaginary[index];
        }
    }
    if (fftJoyMaximum > 100.0f) {
        fftJoyMaximum -= 1.0f;
    }

    for (uint8_t band = 0; band < SIDE; band++) {
        const float normalized =
            SIDE * spectrumImaginary[band] / fftJoyMaximum;
        const uint8_t peak = normalized >= SIDE - 1
            ? SIDE - 1
            : static_cast<uint8_t>(normalized);

        for (uint8_t y = 0; y <= peak; y++) {
            setPixelColor(
                band,
                y,
                SIDE - 1,
                cubeTubeColorMap(y, SIDE, FFT_JOY_MAX_CHANNEL));
        }
        for (uint8_t y = peak + 1; y < SIDE; y++) {
            setPixelColor(band, y, SIDE - 1, black);
        }
    }

    for (uint8_t z = 0; z < SIDE - 1; z++) {
        for (uint8_t x = 0; x < SIDE; x++) {
            for (uint8_t y = 0; y < SIDE; y++) {
                setPixelColor(x, y, z, getPixelColor(x, y, z + 1));
            }
        }
    }

    showPixels();
}

#endif
