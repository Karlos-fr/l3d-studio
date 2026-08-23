// ============================================================================
// StreamFrames - Implementation du recepteur de frames web RGB332
// ----------------------------------------------------------------------------
// Le corps HTTP existant est decode directement vers les primitives logiques.
// Aucune copie persistante ni file de frames n'est ajoutee au firmware.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Horodatage de la derniere frame acceptee dans le mode Stream.
static uint32_t streamLastFrameMillis = 0;

// ----------------------------------------------------------------------------
// Etend une composante sur trois bits vers huit bits.
//
// Parametres :
// - value : composante comprise entre zero et sept.
//
// Retour :
// - composante etendue sur toute la plage 0 a 255.
// ----------------------------------------------------------------------------
static uint8_t streamExpandThreeBits(uint8_t value) {
    return static_cast<uint8_t>((value << 5) | (value << 2) | (value >> 1));
}

// ----------------------------------------------------------------------------
// Etend une composante sur deux bits vers huit bits.
//
// Parametres :
// - value : composante comprise entre zero et trois.
//
// Retour :
// - composante etendue sur toute la plage 0 a 255.
// ----------------------------------------------------------------------------
static uint8_t streamExpandTwoBits(uint8_t value) {
    return static_cast<uint8_t>(value * 85U);
}

int streamApplyFrame(const uint8_t* frame, size_t frameLength) {
    if(currentModeID != STREAM)
        return LOCAL_API_ERROR_STATE;
    if(frame == NULL || frameLength != STREAM_FRAME_BYTES)
        return LOCAL_API_ERROR_BAD_REQUEST;

    size_t frameIndex = 0;
    for(uint8_t z = 0; z < SIDE; z++) {
        for(uint8_t y = 0; y < SIDE; y++) {
            for(uint8_t x = 0; x < SIDE; x++) {
                const uint8_t packedColor = frame[frameIndex++];
                const Color color(
                    streamExpandThreeBits(static_cast<uint8_t>(packedColor >> 5)),
                    streamExpandThreeBits(static_cast<uint8_t>((packedColor >> 2) & 0x07U)),
                    streamExpandTwoBits(static_cast<uint8_t>(packedColor & 0x03U)));
                setPixelColor(x, y, z, color);
            }
        }
    }
    streamLastFrameMillis = millis();
    showPixels();
    return 0;
}

void streamEnter(void) {
    // Un depart depuis Off herite sinon de son drapeau d'execution arrete.
    run = TRUE;
    streamLastFrameMillis = millis();
    background(black);
    showPixels();
}

void streamExit(void) {
    background(black);
    showPixels();
}

void streamTick(void) {
    if(static_cast<uint32_t>(millis() - streamLastFrameMillis) <
       STREAM_FRAME_TIMEOUT_MS)
        return;

    const int standbyModeIndex = getModeIndexFromID(STANDBY);
    if(standbyModeIndex >= 0)
        animationSchedulerRequestModeChange(standbyModeIndex);
}

#endif
