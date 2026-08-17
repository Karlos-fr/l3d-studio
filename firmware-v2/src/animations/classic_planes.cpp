// ============================================================================
// ClassicPlanes - Implémentation des plans glissants
// ----------------------------------------------------------------------------
// Ce fichier dessine trois plans partageant une position compacte. Le calcul
// des couleurs et le mapping physique restent dans les primitives communes.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Déplace puis affiche les trois plans colorés SlidingPlanes.
//
// Effet de bord :
// - modifie la position toutes les cinq frames, écrit et affiche le framebuffer
//   puis applique le délai historique.
// ----------------------------------------------------------------------------
void classicPlanes() {
    background(black);

    if (CPframe % 5 == 0) {
        CPpos += CPinc;
    }
    if (CPpos <= 0 || CPpos >= SIDE) {
        CPinc *= -1;
    }

    for (uint8_t x = 0; x < SIDE; x++) {
        for (uint8_t y = 0; y < SIDE; y++) {
            for (uint8_t z = 0; z < SIDE; z++) {
                setPixelColor(
                    CPpos,
                    y,
                    z,
                    getColorFromInteger(
                        colorMap((CPframe + 50) % 100, 0, 200)));
                setPixelColor(
                    x,
                    CPpos,
                    z,
                    getColorFromInteger(
                        colorMap((CPframe + 100) % 1000, 0, 500)));
                setPixelColor(
                    x,
                    y,
                    CPpos,
                    getColorFromInteger(
                        colorMap((CPframe + 150) % 500, 0, 1000)));
            }
        }
    }
    CPframe++;

    if (stop || stopDemo) {
        return;
    }
    showPixels();
    delay(speed);
    run = TRUE;
}

#endif
