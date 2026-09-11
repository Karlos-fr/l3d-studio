// ============================================================================
// KittScanner - Implementation du scanner rouge K2000
// ----------------------------------------------------------------------------
// Ce fichier balaie quinze demi-positions sur la face avant et peut prolonger
// la lumiere dans la profondeur. Il n'alloue aucun buffer et ne bloque pas.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// Derniere demi-position, correspondant exactement a la colonne sept.
const uint8_t KITT_LAST_PHASE = 14;

// Nombre de couches allumees lorsque l'effet volumetrique est actif.
const uint8_t KITT_DEPTH = 4;

// Premiere ligne centrale de la barre rouge.
const uint8_t KITT_FIRST_ROW = 3;

// Derniere ligne centrale de la barre rouge.
const uint8_t KITT_LAST_ROW = 4;

// Demi-position courante entre zero et quatorze.
static uint8_t kittPhase;

// Sens courant du balayage, egal a moins un ou un.
static int8_t kittDirection;

// Echeance non bloquante de la prochaine frame.
static uint32_t kittNextFrameAt;

// ----------------------------------------------------------------------------
// Indique si une frame est due en restant correcte apres debordement de millis.
//
// Parametres :
// - now : horodatage courant.
// - deadline : echeance de la prochaine frame.
//
// Retour :
// - vrai lorsque l'echeance est atteinte ou depassee.
// ----------------------------------------------------------------------------
static bool isKittFrameDue(uint32_t now, uint32_t deadline) {
    return static_cast<int32_t>(now - deadline) >= 0;
}

// ----------------------------------------------------------------------------
// Calcule l'intensite rouge d'une colonne autour de la tete lumineuse.
//
// Parametres :
// - x : colonne comprise entre zero et sept.
//
// Retour :
// - intensite de la tete ou de sa trainee, entre zero et 255.
// ----------------------------------------------------------------------------
static uint8_t kittColumnIntensity(uint8_t x) {
    // Distance signee exprimee dans les memes demi-positions que la phase.
    int8_t distance = static_cast<int8_t>(x * 2) - static_cast<int8_t>(kittPhase);
    if(distance < 0)
        distance = -distance;
    switch(distance) {
        case 0: return 255;
        case 1: return 208;
        case 2: return 128;
        case 3: return 72;
        case 4: return 36;
        case 5: return 18;
        case 6: return 8;
        default: return 0;
    }
}

// ----------------------------------------------------------------------------
// Dessine la barre rouge et son prolongement optionnel dans la profondeur.
//
// Effet de bord :
// - remplace le framebuffer logique sans le presenter immediatement.
// ----------------------------------------------------------------------------
static void drawKittScanner() {
    background(black);
    // Nombre de couches dessinees selon l'option exposee dans le catalogue.
    const uint8_t depth = switch1 ? KITT_DEPTH : 1;
    for(uint8_t x = 0; x < SIDE; x++) {
        // Intensite maximale de la colonne sur la face avant.
        const uint8_t columnRed = kittColumnIntensity(x);
        if(columnRed == 0)
            continue;
        for(uint8_t z = 0; z < depth; z++) {
            // Attenuation par puissance de deux, sans multiplication ni division.
            const uint8_t red = columnRed >> z;
            // Coordonnée physique qui part de la face avant z=7 vers le fond.
            const uint8_t cubeZ = SIDE - 1 - z;
            for(uint8_t y = KITT_FIRST_ROW; y <= KITT_LAST_ROW; y++)
                setPixelColor(x, y, cubeZ, Color(red, 0, 0));
        }
    }
}

// ----------------------------------------------------------------------------
// Avance d'une demi-position et inverse le sens sur chaque bord.
//
// Effet de bord :
// - modifie la phase et eventuellement la direction du balayage.
// ----------------------------------------------------------------------------
static void advanceKittScanner() {
    if(kittPhase == KITT_LAST_PHASE)
        kittDirection = -1;
    else if(kittPhase == 0)
        kittDirection = 1;
    kittPhase += kittDirection;
}

// ----------------------------------------------------------------------------
// Reinitialise le balayage sur le bord gauche.
//
// Effet de bord :
// - remet la phase, la direction et l'echeance de frame a leur origine.
// ----------------------------------------------------------------------------
void resetKittScanner() {
    kittPhase = 0;
    kittDirection = 1;
    kittNextFrameAt = 0;
}

// ----------------------------------------------------------------------------
// Produit une frame du scanner lorsque son echeance est atteinte.
//
// Effet de bord :
// - remplace le framebuffer, affiche les LED et avance le balayage.
// ----------------------------------------------------------------------------
void runKittScanner() {
    // Horodatage partage entre le controle d'echeance et sa reprogrammation.
    const uint32_t now = millis();
    if(!isKittFrameDue(now, kittNextFrameAt)) {
        animationProcessServices();
        return;
    }
    drawKittScanner();
    showPixels();
    advanceKittScanner();
    kittNextFrameAt = now + 20 + speed;
}

#endif
