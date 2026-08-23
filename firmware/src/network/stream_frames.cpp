// ============================================================================
// StreamFrames - Implementation du recepteur de frames web RGB332
// ----------------------------------------------------------------------------
// Le corps HTTP existant est decode directement vers les primitives logiques.
// Aucune copie persistante ni file de frames n'est ajoutee au firmware.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Horodatage de la derniere frame acceptee dans le mode Stream.
static uint32_t streamLastFrameMillis = 0;

// Indique que la derniere frame provient du peintre et reste affichee.
static bool streamFrameHeld = false;

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

// ----------------------------------------------------------------------------
// Decode et affiche une frame RGB332 avec la politique de timeout demandee.
//
// Parametres :
// - frame : 512 octets ranges selon z, puis y, puis x.
// - frameLength : longueur exacte du corps recu.
// - holdFrame : vrai pour conserver l'image sans timeout en mode peinture.
//
// Retour :
// - zero en cas de succes ou code LOCAL_API_ERROR en cas de refus.
//
// Effet de bord :
// - remplace le framebuffer logique et declenche un unique showPixels().
// ----------------------------------------------------------------------------
int streamApplyFrame(
        const uint8_t* frame,
        size_t frameLength,
        bool holdFrame) {
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
    streamFrameHeld = holdFrame;
    showPixels();
    return 0;
}

// ----------------------------------------------------------------------------
// Indique si la derniere frame Stream doit rester affichee sans timeout.
//
// Retour :
// - valeur courante de la politique de maintien du peintre.
// ----------------------------------------------------------------------------
bool streamFrameIsHeld(void) {
    return streamFrameHeld;
}

// ----------------------------------------------------------------------------
// Initialise le mode Stream avec son timeout anime par defaut.
//
// Effet de bord :
// - efface le cube, reactive le rendu et annule tout maintien de peinture.
// ----------------------------------------------------------------------------
void streamEnter(void) {
    // Un depart depuis Off herite sinon de son drapeau d'execution arrete.
    run = TRUE;
    streamLastFrameMillis = millis();
    streamFrameHeld = false;
    background(black);
    showPixels();
}

// ----------------------------------------------------------------------------
// Termine le mode Stream et efface son dernier rendu.
//
// Effet de bord :
// - annule le maintien de peinture et rend immediatement un cube noir.
// ----------------------------------------------------------------------------
void streamExit(void) {
    streamFrameHeld = false;
    background(black);
    showPixels();
}

// ----------------------------------------------------------------------------
// Applique le timeout uniquement aux frames du streaming anime.
//
// Effet de bord :
// - demande le mode Off apres une interruption du flux non maintenu.
// ----------------------------------------------------------------------------
void streamTick(void) {
    if(streamFrameHeld)
        return;
    if(static_cast<uint32_t>(millis() - streamLastFrameMillis) <
       STREAM_FRAME_TIMEOUT_MS)
        return;

    const int standbyModeIndex = getModeIndexFromID(STANDBY);
    if(standbyModeIndex >= 0)
        animationSchedulerRequestModeChange(standbyModeIndex);
}

#endif
