// ============================================================================
// BytecodeDiagnostics - Implementation des compteurs runtime de la VM L3D
// ----------------------------------------------------------------------------
// Ces compteurs restent fixes et sans allocation. Leur exposition par LAN
// appartiendra a la phase API et n'est pas realisee ici.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_BYTECODE_ENABLED

// Dernier instantane conserve meme apres la sortie du mode.
static BytecodeDiagnosticsSnapshot bytecodeDiagnosticsState = {};

// ----------------------------------------------------------------------------
// Reinitialise les compteurs de session avant une nouvelle activation.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsBegin(void) {
    bytecodeDiagnosticsState = {};
    bytecodeDiagnosticsState.active = true;
}

// ----------------------------------------------------------------------------
// Enregistre une instruction executee.
//
// Parametres :
// - programCounter : offset de l'instruction executee.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsInstruction(uint8_t programCounter) {
    bytecodeDiagnosticsState.executedInstructions++;
    bytecodeDiagnosticsState.lastProgramCounter = programCounter;
}

// ----------------------------------------------------------------------------
// Enregistre une frame envoyee par SHOW.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsShow(void) {
    bytecodeDiagnosticsState.shownFrames++;
}

// ----------------------------------------------------------------------------
// Enregistre l'arret normal du programme.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsHalt(void) {
    bytecodeDiagnosticsState.active = false;
    bytecodeDiagnosticsState.halted = true;
}

// ----------------------------------------------------------------------------
// Enregistre une faute runtime et desactive la session.
//
// Parametres :
// - errorCode : code public negatif de la faute.
// - programCounter : offset de l'instruction fautive.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsFault(int16_t errorCode, uint8_t programCounter) {
    bytecodeDiagnosticsState.active = false;
    bytecodeDiagnosticsState.halted = false;
    bytecodeDiagnosticsState.lastError = errorCode;
    bytecodeDiagnosticsState.lastProgramCounter = programCounter;
}

// ----------------------------------------------------------------------------
// Marque la sortie du mode sans effacer la derniere faute.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsExit(void) {
    bytecodeDiagnosticsState.active = false;
}

// ----------------------------------------------------------------------------
// Copie un instantane coherent des compteurs courants.
//
// Parametres :
// - snapshot : destination obligatoire de l'instantane.
//
// Retour :
// - vrai lorsque la destination est valide.
// ----------------------------------------------------------------------------
bool bytecodeDiagnosticsRead(BytecodeDiagnosticsSnapshot* snapshot) {
    if(snapshot == NULL)
        return false;
    *snapshot = bytecodeDiagnosticsState;
    return true;
}

#endif

#endif
