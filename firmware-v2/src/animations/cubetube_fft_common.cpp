// ============================================================================
// CubeTubeFftCommon - Implementation des primitives FFT CubeTube
// ----------------------------------------------------------------------------
// Ce fichier mutualise la capture et la palette des deux imports FFT. Le rendu
// et l'adaptation dynamique du niveau restent propres a chaque animation.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Nombre de segments de la palette CubeTube cyclique.
const uint8_t CUBETUBE_COLOR_SEGMENT_COUNT = 6;

// Resolution entiere de chaque segment de couleur.
const uint16_t CUBETUBE_COLOR_SEGMENT_SCALE = 256;

// ----------------------------------------------------------------------------
// Echantillonne le microphone puis calcule les 16 magnitudes FFT.
//
// Parametres :
// - sampleDelayMicros : intervalle historique entre deux echantillons.
//
// Effet de bord :
// - ecrase les deux tableaux FFT du scratch partage.
// ----------------------------------------------------------------------------
void captureCubeTubeFft(uint16_t sampleDelayMicros) {
    for (uint8_t index = 0; index < ARRAY_SIZE; index++) {
        spectrumReal[index] = analogRead(MICROPHONE) - SAMPLES;
        spectrumImaginary[index] = 0.0f;
        delayMicroseconds(sampleDelayMicros);
    }

    FFT(1, M, spectrumReal, spectrumImaginary);

    for (uint8_t index = 0; index < ARRAY_SIZE; index++) {
        const float realValue = spectrumReal[index];
        const float imaginaryValue = spectrumImaginary[index];
        spectrumImaginary[index] = sqrt(
            imaginaryValue * imaginaryValue + realValue * realValue);
    }
}

// ----------------------------------------------------------------------------
// Interpole un canal entre zero et sa valeur maximale.
//
// Parametres :
// - position : position comprise entre zero et 255.
// - maximumChannel : intensite maximale du canal.
//
// Retour :
// - canal interpole avec une arithmetique entiere bornee.
// ----------------------------------------------------------------------------
static uint8_t cubeTubeInterpolatedChannel(
    uint16_t position,
    uint8_t maximumChannel) {
    return static_cast<uint32_t>(maximumChannel) * position /
        (CUBETUBE_COLOR_SEGMENT_SCALE - 1);
}

// ----------------------------------------------------------------------------
// Produit la palette cyclique bleue, cyan, verte, jaune, rouge et magenta.
//
// Parametres :
// - level : position courante dans la palette.
// - maximumLevel : borne correspondant au retour final vers le bleu.
// - maximumChannel : intensite maximale d'un canal RGB.
//
// Retour :
// - couleur interpolee sans calcul flottant.
// ----------------------------------------------------------------------------
Color cubeTubeColorMap(
    uint16_t level,
    uint16_t maximumLevel,
    uint8_t maximumChannel) {
    if (maximumLevel == 0 || level >= maximumLevel) {
        return Color(0, 0, maximumChannel);
    }

    const uint32_t palettePosition =
        static_cast<uint32_t>(level) *
        CUBETUBE_COLOR_SEGMENT_COUNT *
        CUBETUBE_COLOR_SEGMENT_SCALE /
        maximumLevel;
    const uint8_t segment =
        palettePosition / CUBETUBE_COLOR_SEGMENT_SCALE;
    const uint16_t position =
        palettePosition % CUBETUBE_COLOR_SEGMENT_SCALE;
    const uint8_t rising =
        cubeTubeInterpolatedChannel(position, maximumChannel);
    const uint8_t falling = maximumChannel - rising;

    switch (segment) {
        case 0:
            return Color(0, rising, maximumChannel);
        case 1:
            return Color(0, maximumChannel, falling);
        case 2:
            return Color(rising, maximumChannel, 0);
        case 3:
            return Color(maximumChannel, falling, 0);
        case 4:
            return Color(maximumChannel, 0, rising);
        default:
            return Color(falling, 0, maximumChannel);
    }
}

#endif
