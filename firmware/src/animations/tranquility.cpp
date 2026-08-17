// ============================================================================
// Tranquility - Implementation du fondu plein-cube CubeTube
// ----------------------------------------------------------------------------
// Ce fichier retire les couleurs aleatoires inutilisees de la source et garde
// son cycle visible de 256 couleurs, limite a 75 par canal, toutes les 20 ms.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Canal maximal apres la mise a l'echelle 75/255 de la source.
const uint8_t TRANQUILITY_MAX_CHANNEL = 75;

// Intervalle historique entre deux couleurs, en millisecondes.
const uint8_t TRANQUILITY_FRAME_INTERVAL_MS = 20;

// Position courante dans le cycle de 256 couleurs.
static uint8_t tranquilityValue;

// Date de la prochaine frame Tranquility.
static uint32_t tranquilityNextFrameAt;

// ----------------------------------------------------------------------------
// Reinitialise la phase et l'horloge de Tranquility.
//
// Effet de bord :
// - force le rendu de la premiere couleur au prochain tick.
// ----------------------------------------------------------------------------
void resetTranquility() {
    tranquilityValue = 0;
    tranquilityNextFrameAt = 0;
}

// ----------------------------------------------------------------------------
// Affiche une couleur Tranquility lorsque son intervalle est ecoule.
//
// Effet de bord :
// - remplit et affiche le cube sans bloquer la boucle principale.
// ----------------------------------------------------------------------------
void runTranquility() {
    run = TRUE;
    const uint32_t now = millis();
    if (static_cast<int32_t>(now - tranquilityNextFrameAt) < 0) {
        return;
    }

    background(cubeTubeColorMap(
        tranquilityValue,
        255,
        TRANQUILITY_MAX_CHANNEL));
    showPixels();
    tranquilityValue++;
    tranquilityNextFrameAt = now + TRANQUILITY_FRAME_INTERVAL_MS;
}

#endif
