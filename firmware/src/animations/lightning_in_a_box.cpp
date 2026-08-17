// ============================================================================
// LightningInABox - Implementation de l'eclair CubeTube
// ----------------------------------------------------------------------------
// Ce fichier conserve les quatre segments et temporisations de la source PDE.
// Les longs delay sont remplaces par une machine d'etat interrogee par loop().
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Duree entre deux niveaux de luminosite de l'eclair, en millisecondes.
const uint16_t LIGHTNING_BOX_FLASH_INTERVAL_MS = 100;

// Pause historique precedant l'extinction de l'eclair, en millisecondes.
const uint16_t LIGHTNING_BOX_HOLD_INTERVAL_MS = 200;

// Pause minimale suivant l'extinction, en millisecondes.
const uint16_t LIGHTNING_BOX_COOLDOWN_MIN_MS = 200;

// Etendue aleatoire ajoutee a la pause entre deux eclairs.
const uint16_t LIGHTNING_BOX_COOLDOWN_RANGE_MS = 3000;

// Phase courante : trois couleurs, attente, extinction puis nouveau cycle.
static uint8_t lightningBoxPhase;

// Prochaine date a laquelle la machine d'etat peut avancer.
static uint32_t lightningBoxNextActionAt;

// Origine haute de l'eclair courant.
static PackedPoint lightningBoxTop;

// Point de bifurcation de l'eclair courant.
static PackedPoint lightningBoxBranch;

// Premiere extremite basse de l'eclair courant.
static PackedPoint lightningBoxBottomA;

// Seconde extremite basse de l'eclair courant.
static PackedPoint lightningBoxBottomB;

// Couleur sombre aleatoire de la premiere impulsion.
static PackedColor lightningBoxInitialColor;

// ----------------------------------------------------------------------------
// Indique si une date millis est atteinte en restant sure lors du debordement.
//
// Parametres :
// - now : date courante fournie par millis().
// - deadline : date attendue par la machine d'etat.
//
// Retour :
// - vrai lorsque la date est atteinte ou depassee.
// ----------------------------------------------------------------------------
static bool isLightningBoxActionDue(uint32_t now, uint32_t deadline) {
    return static_cast<int32_t>(now - deadline) >= 0;
}

// ----------------------------------------------------------------------------
// Tire les quatre points et la premiere couleur d'un nouvel eclair.
//
// Effet de bord :
// - consomme les tirages aleatoires historiques et remplace l'etat du trait.
// ----------------------------------------------------------------------------
static void generateLightningBoxStrike() {
    lightningBoxTop = {
        static_cast<CubeCoordinate>(rand() % SIDE),
        static_cast<CubeCoordinate>(SIDE - 1),
        static_cast<CubeCoordinate>(rand() % SIDE)};
    lightningBoxBranch = {
        static_cast<CubeCoordinate>(rand() % SIDE),
        static_cast<CubeCoordinate>(rand() % 3),
        static_cast<CubeCoordinate>(rand() % SIDE)};
    lightningBoxBottomA = {
        static_cast<CubeCoordinate>((rand() % 4) - 2 + lightningBoxBranch.x),
        0,
        static_cast<CubeCoordinate>((rand() % 4) - 2 + lightningBoxBranch.z)};
    lightningBoxBottomB = {
        static_cast<CubeCoordinate>((rand() % 4) - 2 + lightningBoxBranch.x),
        0,
        static_cast<CubeCoordinate>((rand() % 4) - 2 + lightningBoxBranch.z)};
    lightningBoxInitialColor = {
        static_cast<uint8_t>(rand() % 2),
        static_cast<uint8_t>(rand() % 2),
        static_cast<uint8_t>(rand() % 16)};
}

// ----------------------------------------------------------------------------
// Dessine les trois branches de l'eclair dans une couleur donnee.
//
// Parametres :
// - color : couleur appliquee aux trois segments.
//
// Effet de bord :
// - ecrit uniquement les voxels valides traverses par les lignes.
// ----------------------------------------------------------------------------
static void drawLightningBoxStrike(Color color) {
    const Point top(
        lightningBoxTop.x,
        lightningBoxTop.y,
        lightningBoxTop.z);
    const Point branch(
        lightningBoxBranch.x,
        lightningBoxBranch.y,
        lightningBoxBranch.z);
    const Point bottomA(
        lightningBoxBottomA.x,
        lightningBoxBottomA.y,
        lightningBoxBottomA.z);
    const Point bottomB(
        lightningBoxBottomB.x,
        lightningBoxBottomB.y,
        lightningBoxBottomB.z);
    drawLine(top, branch, color);
    drawLine(branch, bottomA, color);
    drawLine(branch, bottomB, color);
}

// ----------------------------------------------------------------------------
// Reinitialise la machine d'etat de LightningInABox.
//
// Effet de bord :
// - force la generation d'un nouvel eclair au prochain tick.
// ----------------------------------------------------------------------------
void resetLightningInABox() {
    lightningBoxPhase = 0;
    lightningBoxNextActionAt = 0;
}

// ----------------------------------------------------------------------------
// Execute une etape due du cycle LightningInABox.
//
// Effet de bord :
// - dessine ou efface l'eclair et actualise son prochain delai sans bloquer.
// ----------------------------------------------------------------------------
void runLightningInABox() {
    run = TRUE;
    const uint32_t now = millis();
    if (!isLightningBoxActionDue(now, lightningBoxNextActionAt)) {
        return;
    }

    switch (lightningBoxPhase) {
        case 0:
            background(black);
            generateLightningBoxStrike();
            drawLightningBoxStrike(Color(
                lightningBoxInitialColor.red,
                lightningBoxInitialColor.green,
                lightningBoxInitialColor.blue));
            showPixels();
            lightningBoxPhase = 1;
            lightningBoxNextActionAt = now + LIGHTNING_BOX_FLASH_INTERVAL_MS;
            break;
        case 1:
            drawLightningBoxStrike(Color(128, 128, 128));
            showPixels();
            lightningBoxPhase = 2;
            lightningBoxNextActionAt = now + LIGHTNING_BOX_FLASH_INTERVAL_MS;
            break;
        case 2:
            drawLightningBoxStrike(Color(0, 0, 2));
            showPixels();
            lightningBoxPhase = 3;
            lightningBoxNextActionAt = now + LIGHTNING_BOX_FLASH_INTERVAL_MS;
            break;
        case 3:
            lightningBoxPhase = 4;
            lightningBoxNextActionAt = now + LIGHTNING_BOX_HOLD_INTERVAL_MS;
            break;
        default:
            background(black);
            showPixels();
            lightningBoxPhase = 0;
            lightningBoxNextActionAt = now +
                LIGHTNING_BOX_COOLDOWN_MIN_MS +
                rand() % LIGHTNING_BOX_COOLDOWN_RANGE_MS;
            break;
    }
}

#endif
