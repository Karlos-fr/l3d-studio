// ============================================================================
// BytecodeVm - Implementation de la machine virtuelle procedurale L3D
// ----------------------------------------------------------------------------
// La VM execute un conteneur valide depuis le scratch partage et dessine dans
// le framebuffer NeoPixel existant. Elle n'alloue rien et n'accede pas a EEPROM.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_BYTECODE_ENABLED

#include <string.h>

// Echelle Q4.4 des positions de particules.
const int16_t BYTECODE_FIXED_SCALE = 16;

// Plus grande position Q4.4 contenue dans le cube.
const int16_t BYTECODE_FIXED_MAX = SIDE * BYTECODE_FIXED_SCALE - 1;

// Graine non nulle du generateur xorshift32.
const uint32_t BYTECODE_RANDOM_SEED = 0x6D2B79F5UL;

// Programme Sphere non persistant utilise avant la future installation LAN.
static const uint8_t BYTECODE_DEFAULT_PROGRAM[] PROGMEM = {
    0x4C, 0x33, 0x44, 0x01, 0x01, 0x01, 0x00, 0x31, 0x00, 0x00, 0x2D, 0x14,
    0x11, 0x00, 0x02, 0x11, 0x01, 0x02, 0x11, 0x02, 0x02, 0x10, 0x03, 0x01,
    0x10, 0x04, 0x01, 0x10, 0x05, 0x01, 0x11, 0x06, 0x00, 0x01, 0x21, 0x06,
    0x31, 0x01, 0x20, 0x01, 0x32, 0x03, 0x01, 0x06, 0x32, 0x14, 0x01, 0x06,
    0x32, 0x25, 0x01, 0x06, 0x13, 0x06, 0x03, 0x02, 0x50, 0x32, 0x00, 0x40,
    0xE4
};

// Table exacte de SIN8 partagee avec la VM TypeScript version 1.
static const uint8_t BYTECODE_SIN8_TABLE[256] PROGMEM = {
    128, 131, 134, 137, 140, 143, 146, 149, 152, 155, 158, 162, 165, 167, 170, 173,
    176, 179, 182, 185, 188, 190, 193, 196, 198, 201, 203, 206, 208, 211, 213, 215,
    218, 220, 222, 224, 226, 228, 230, 232, 234, 235, 237, 238, 240, 241, 243, 244,
    245, 246, 248, 249, 250, 250, 251, 252, 253, 253, 254, 254, 254, 255, 255, 255,
    255, 255, 255, 255, 254, 254, 254, 253, 253, 252, 251, 250, 250, 249, 248, 246,
    245, 244, 243, 241, 240, 238, 237, 235, 234, 232, 230, 228, 226, 224, 222, 220,
    218, 215, 213, 211, 208, 206, 203, 201, 198, 196, 193, 190, 188, 185, 182, 179,
    176, 173, 170, 167, 165, 162, 158, 155, 152, 149, 146, 143, 140, 137, 134, 131,
    128, 124, 121, 118, 115, 112, 109, 106, 103, 100, 97, 93, 90, 88, 85, 82,
    79, 76, 73, 70, 67, 65, 62, 59, 57, 54, 52, 49, 47, 44, 42, 40,
    37, 35, 33, 31, 29, 27, 25, 23, 21, 20, 18, 17, 15, 14, 12, 11,
    10, 9, 7, 6, 5, 5, 4, 3, 2, 2, 1, 1, 1, 0, 0, 0,
    0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 4, 5, 5, 6, 7, 9,
    10, 11, 12, 14, 15, 17, 18, 20, 21, 23, 25, 27, 29, 31, 33, 35,
    37, 40, 42, 44, 47, 49, 52, 54, 57, 59, 62, 65, 67, 70, 73, 76,
    79, 82, 85, 88, 90, 93, 97, 100, 103, 106, 109, 112, 115, 118, 121, 124
};

// Source immutable retenue pour la prochaine entree dans le mode.
static const uint8_t* bytecodeSelectedProgram = BYTECODE_DEFAULT_PROGRAM;

// Longueur de la source immutable retenue.
static size_t bytecodeSelectedProgramLength = sizeof(BYTECODE_DEFAULT_PROGRAM);

// ----------------------------------------------------------------------------
// Reboucle une valeur sur un entier signe de seize bits.
//
// Parametres :
// - value : resultat arithmetique sur 32 bits.
//
// Retour :
// - valeur equivalente modulo 65536.
// ----------------------------------------------------------------------------
static int16_t bytecodeWrapInt16(int32_t value) {
    return static_cast<int16_t>(static_cast<uint16_t>(value));
}

// ----------------------------------------------------------------------------
// Lit un registre valide de la VM active.
//
// Parametres :
// - registerIndex : index compris entre zero et quinze.
//
// Retour :
// - valeur signee du registre.
// ----------------------------------------------------------------------------
static int16_t bytecodeReadRegister(uint8_t registerIndex) {
    return bytecodeStorage.registers[registerIndex & 0x0FU];
}

// ----------------------------------------------------------------------------
// Ecrit un registre avec rebouclage signe sur seize bits.
//
// Parametres :
// - registerIndex : index compris entre zero et quinze.
// - value : valeur arithmetique a ramener sur seize bits.
//
// Effet de bord :
// - modifie exactement un registre du scratch actif.
// ----------------------------------------------------------------------------
static void bytecodeWriteRegister(uint8_t registerIndex, int32_t value) {
    bytecodeStorage.registers[registerIndex & 0x0FU] = bytecodeWrapInt16(value);
}

// ----------------------------------------------------------------------------
// Indique si une valeur de registre est une coordonnee du cube.
//
// Parametres :
// - coordinate : valeur signee candidate.
//
// Retour :
// - vrai pour un entier compris entre zero et sept.
// ----------------------------------------------------------------------------
static bool bytecodeCoordinateValid(int16_t coordinate) {
    return coordinate >= 0 && coordinate < SIDE;
}

// ----------------------------------------------------------------------------
// Remplace la couleur courante par trois composantes RGB.
//
// Parametres :
// - red : composante rouge.
// - green : composante verte.
// - blue : composante bleue.
//
// Effet de bord :
// - modifie la couleur des prochains dessins et emissions.
// ----------------------------------------------------------------------------
static void bytecodeSetColor(uint8_t red, uint8_t green, uint8_t blue) {
    bytecodeStorage.currentRed = red;
    bytecodeStorage.currentGreen = green;
    bytecodeStorage.currentBlue = blue;
}

// ----------------------------------------------------------------------------
// Convertit une phase de roue en couleur RGB888 historique.
//
// Parametres :
// - position : phase modulo 256.
//
// Retour :
// - couleur RGB compacte.
// ----------------------------------------------------------------------------
static Color bytecodeWheelColor(uint8_t position) {
    // Phase inversee conservant l'ordre NeoPixel historique.
    const uint8_t inverted = static_cast<uint8_t>(255U - position);
    if(inverted < 85U)
        return Color(255U - inverted * 3U, 0, inverted * 3U);
    if(inverted < 170U) {
        // Position locale dans le deuxieme tiers de la roue.
        const uint8_t shifted = static_cast<uint8_t>(inverted - 85U);
        return Color(0, shifted * 3U, 255U - shifted * 3U);
    }
    // Position locale dans le dernier tiers de la roue.
    const uint8_t shifted = static_cast<uint8_t>(inverted - 170U);
    return Color(shifted * 3U, 255U - shifted * 3U, 0);
}

// ----------------------------------------------------------------------------
// Tire un entier uniforme inclusif avec xorshift32.
//
// Parametres :
// - minimum : borne basse incluse.
// - maximum : borne haute incluse.
//
// Retour :
// - valeur pseudo-aleatoire deterministe dans la plage.
// ----------------------------------------------------------------------------
static uint8_t bytecodeRandomBetween(uint8_t minimum, uint8_t maximum) {
    uint32_t value = bytecodeStorage.randomState;
    value ^= value << 13;
    value ^= value >> 17;
    value ^= value << 5;
    bytecodeStorage.randomState = value;
    // Nombre de resultats possibles dans l'intervalle inclusif.
    const uint16_t range = static_cast<uint16_t>(maximum - minimum) + 1U;
    return static_cast<uint8_t>(minimum + value % range);
}

// ----------------------------------------------------------------------------
// Dessine un voxel apres validation des trois registres de coordonnees.
//
// Parametres :
// - xRegister : registre de la coordonnee x.
// - yRegister : registre de la coordonnee y.
// - zRegister : registre de la coordonnee z.
//
// Retour :
// - zero ou une faute de coordonnee.
// ----------------------------------------------------------------------------
static int16_t bytecodeDrawVoxel(
    uint8_t xRegister,
    uint8_t yRegister,
    uint8_t zRegister) {
    // Coordonnee x lue dans le premier registre.
    const int16_t x = bytecodeReadRegister(xRegister);
    // Coordonnee y lue dans le deuxieme registre.
    const int16_t y = bytecodeReadRegister(yRegister);
    // Coordonnee z lue dans le troisieme registre.
    const int16_t z = bytecodeReadRegister(zRegister);
    if(!bytecodeCoordinateValid(x) ||
       !bytecodeCoordinateValid(y) ||
       !bytecodeCoordinateValid(z))
        return BYTECODE_ERROR_COORDINATE;
    setPixelColor(x, y, z, Color(
        bytecodeStorage.currentRed,
        bytecodeStorage.currentGreen,
        bytecodeStorage.currentBlue));
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Dessine une sphere pleine bornee sans racine carree.
//
// Parametres :
// - xRegister : registre du centre x.
// - yRegister : registre du centre y.
// - zRegister : registre du centre z.
// - radius : rayon entier deja valide.
//
// Retour :
// - zero ou une faute de coordonnee du centre.
// ----------------------------------------------------------------------------
static int16_t bytecodeDrawSphere(
    uint8_t xRegister,
    uint8_t yRegister,
    uint8_t zRegister,
    uint8_t radius) {
    // Centre x entier lu depuis la VM.
    const int16_t centerX = bytecodeReadRegister(xRegister);
    // Centre y entier lu depuis la VM.
    const int16_t centerY = bytecodeReadRegister(yRegister);
    // Centre z entier lu depuis la VM.
    const int16_t centerZ = bytecodeReadRegister(zRegister);
    if(!bytecodeCoordinateValid(centerX) ||
       !bytecodeCoordinateValid(centerY) ||
       !bytecodeCoordinateValid(centerZ))
        return BYTECODE_ERROR_COORDINATE;

    // Rayon au carre evitant une racine dans la boucle voxel.
    const int16_t radiusSquared = radius * radius;
    // Couleur immutable utilisee pendant tout le parcours.
    const Color color(
        bytecodeStorage.currentRed,
        bytecodeStorage.currentGreen,
        bytecodeStorage.currentBlue);
    for(uint8_t z = 0; z < SIDE; z++) {
        for(uint8_t y = 0; y < SIDE; y++) {
            for(uint8_t x = 0; x < SIDE; x++) {
                // Distance signee au centre sur x.
                const int16_t deltaX = static_cast<int16_t>(x) - centerX;
                // Distance signee au centre sur y.
                const int16_t deltaY = static_cast<int16_t>(y) - centerY;
                // Distance signee au centre sur z.
                const int16_t deltaZ = static_cast<int16_t>(z) - centerZ;
                if(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ <=
                   radiusSquared)
                    setPixelColor(x, y, z, color);
            }
        }
    }
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Attenue le framebuffer physique avec une arithmetique entiere.
//
// Parametres :
// - factor : multiplicateur rapporte a 255.
//
// Effet de bord :
// - remplace les 512 couleurs sans appeler showPixels.
// ----------------------------------------------------------------------------
static void bytecodeFade(uint8_t factor) {
    for(uint16_t index = 0; index < PIXEL_CNT; index++) {
        // Couleur RGB888 courante du pixel physique.
        const Color color = getPixelColor(index);
        strip.setPixelColor(index, strip.Color(
            static_cast<uint8_t>(static_cast<uint16_t>(color.red) * factor / 255U),
            static_cast<uint8_t>(static_cast<uint16_t>(color.green) * factor / 255U),
            static_cast<uint8_t>(static_cast<uint16_t>(color.blue) * factor / 255U)));
    }
}

// ----------------------------------------------------------------------------
// Avance une position et inverse sa vitesse avant une sortie de plage.
//
// Parametres :
// - positionRegister : registre de position.
// - velocityRegister : registre de vitesse.
// - minimum : borne basse incluse.
// - maximum : borne haute incluse.
//
// Retour :
// - zero ou une faute si le rebond ne peut produire une position valide.
// ----------------------------------------------------------------------------
static int16_t bytecodeBounce(
    uint8_t positionRegister,
    uint8_t velocityRegister,
    int8_t minimum,
    int8_t maximum) {
    // Position avant le pas courant.
    const int16_t position = bytecodeReadRegister(positionRegister);
    int16_t velocity = bytecodeReadRegister(velocityRegister);
    int16_t next = static_cast<int16_t>(position + velocity);
    if(next < minimum || next > maximum) {
        velocity = bytecodeWrapInt16(-velocity);
        next = static_cast<int16_t>(position + velocity);
        bytecodeWriteRegister(velocityRegister, velocity);
    }
    if(next < minimum || next > maximum)
        return BYTECODE_ERROR_VALUE;
    bytecodeWriteRegister(positionRegister, next);
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Borne un entier sur l'octet signe utilise par une vitesse Q4.4.
//
// Parametres :
// - value : vitesse intermediaire.
//
// Retour :
// - valeur comprise entre -128 et 127.
// ----------------------------------------------------------------------------
static int8_t bytecodeClampInt8(int16_t value) {
    if(value < -128)
        return -128;
    if(value > 127)
        return 127;
    return static_cast<int8_t>(value);
}

// ----------------------------------------------------------------------------
// Applique le freinage d'une vitesse avec troncature vers zero.
//
// Parametres :
// - value : vitesse Q4.4 courante.
// - drag : multiplicateur rapporte a 255.
//
// Retour :
// - vitesse freinee sur un octet signe.
// ----------------------------------------------------------------------------
static int8_t bytecodeApplyDrag(int8_t value, uint8_t drag) {
    return static_cast<int8_t>(
        static_cast<int16_t>(value) * drag / 255);
}

// ----------------------------------------------------------------------------
// Choisit une particule libre ou la victime a la vie la plus courte.
//
// Retour :
// - adresse d'un emplacement prealloue dans le scratch actif.
// ----------------------------------------------------------------------------
static BytecodeParticle* bytecodeSelectParticle(void) {
    BytecodeParticle* selected = &bytecodeStorage.particles[0];
    for(uint8_t index = 0; index < bytecodeStorage.particleCount; index++) {
        BytecodeParticle* candidate = &bytecodeStorage.particles[index];
        if(!candidate->active)
            return candidate;
        if(candidate->life < selected->life)
            selected = candidate;
    }
    return selected;
}

// ----------------------------------------------------------------------------
// Emet une particule depuis six registres valides.
//
// Parametres :
// - registers : index x, y, z, vx, vy et vz.
//
// Retour :
// - zero ou une faute d'etat ou de coordonnee.
// ----------------------------------------------------------------------------
static int16_t bytecodeEmitParticle(const uint8_t* registers) {
    if(bytecodeStorage.particleCount < 1)
        return BYTECODE_ERROR_STATE;
    // Coordonnee initiale x en voxel entier.
    const int16_t x = bytecodeReadRegister(registers[0]);
    // Coordonnee initiale y en voxel entier.
    const int16_t y = bytecodeReadRegister(registers[1]);
    // Coordonnee initiale z en voxel entier.
    const int16_t z = bytecodeReadRegister(registers[2]);
    if(!bytecodeCoordinateValid(x) ||
       !bytecodeCoordinateValid(y) ||
       !bytecodeCoordinateValid(z))
        return BYTECODE_ERROR_COORDINATE;

    BytecodeParticle* particle = bytecodeSelectParticle();
    particle->x = static_cast<int16_t>(x * BYTECODE_FIXED_SCALE);
    particle->y = static_cast<int16_t>(y * BYTECODE_FIXED_SCALE);
    particle->z = static_cast<int16_t>(z * BYTECODE_FIXED_SCALE);
    particle->vx = static_cast<int8_t>(bytecodeReadRegister(registers[3]) & 0xFF);
    particle->vy = static_cast<int8_t>(bytecodeReadRegister(registers[4]) & 0xFF);
    particle->vz = static_cast<int8_t>(bytecodeReadRegister(registers[5]) & 0xFF);
    particle->life = bytecodeStorage.particleLife;
    particle->red = bytecodeStorage.currentRed;
    particle->green = bytecodeStorage.currentGreen;
    particle->blue = bytecodeStorage.currentBlue;
    particle->active = true;
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Avance, elimine et dessine les particules actives.
//
// Effet de bord :
// - modifie les particules et le framebuffer sans appeler showPixels.
// ----------------------------------------------------------------------------
static void bytecodeStepParticles(void) {
    for(uint8_t index = 0; index < bytecodeStorage.particleCount; index++) {
        BytecodeParticle* particle = &bytecodeStorage.particles[index];
        if(!particle->active)
            continue;
        particle->vy = bytecodeClampInt8(
            static_cast<int16_t>(particle->vy) + bytecodeStorage.particleGravity);
        particle->vx = bytecodeApplyDrag(particle->vx, bytecodeStorage.particleDrag);
        particle->vy = bytecodeApplyDrag(particle->vy, bytecodeStorage.particleDrag);
        particle->vz = bytecodeApplyDrag(particle->vz, bytecodeStorage.particleDrag);
        particle->x = static_cast<int16_t>(particle->x + particle->vx);
        particle->y = static_cast<int16_t>(particle->y + particle->vy);
        particle->z = static_cast<int16_t>(particle->z + particle->vz);
        particle->life--;
        if(particle->life == 0 ||
           particle->x < 0 || particle->x > BYTECODE_FIXED_MAX ||
           particle->y < 0 || particle->y > BYTECODE_FIXED_MAX ||
           particle->z < 0 || particle->z > BYTECODE_FIXED_MAX) {
            particle->active = false;
            continue;
        }
        setPixelColor(
            particle->x >> 4,
            particle->y >> 4,
            particle->z >> 4,
            Color(particle->red, particle->green, particle->blue));
    }
}

// ----------------------------------------------------------------------------
// Memorise une faute, efface le cube et demande le passage differe vers Off.
//
// Parametres :
// - errorCode : code public de la faute.
// - programCounter : offset de l'instruction fautive.
//
// Effet de bord :
// - arrete la VM, affiche noir et programme un changement de mode sur.
// ----------------------------------------------------------------------------
static void bytecodeFail(int16_t errorCode, uint8_t programCounter) {
    bytecodeStorage.active = false;
    bytecodeStorage.waiting = false;
    bytecodeDiagnosticsFault(errorCode, programCounter);
    background(black);
    showPixels();
    // Index du mode Off utilise comme repli sur.
    const int standbyModeIndex = getModeIndexFromID(STANDBY);
    if(standbyModeIndex >= 0)
        animationSchedulerRequestModeChange(standbyModeIndex);
}

// ----------------------------------------------------------------------------
// Selectionne un conteneur immutable non persistant apres validation complete.
//
// Parametres :
// - container : conteneur dont la duree de vie depasse la session suivante.
// - containerLength : nombre exact d'octets accessibles.
//
// Retour :
// - zero en cas de succes, sinon un code d'erreur public negatif.
//
// Effet de bord :
// - remplace la source de la prochaine entree dans le mode sans l'activer.
// ----------------------------------------------------------------------------
int16_t bytecodeSelectTransientProgram(
    const uint8_t* container,
    size_t containerLength) {
    // Resultat complet obtenu avant de modifier la selection courante.
    const int16_t validation =
        bytecodeValidateContainer(container, containerLength, NULL);
    if(validation != BYTECODE_SUCCESS)
        return validation;
    bytecodeSelectedProgram = container;
    bytecodeSelectedProgramLength = containerLength;
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Copie et initialise le programme selectionne dans le scratch actif.
//
// Retour :
// - zero en cas de succes, sinon un code d'erreur public negatif.
// ----------------------------------------------------------------------------
int16_t bytecodeEnter(void) {
    memset(&bytecodeStorage, 0, sizeof(bytecodeStorage));
    size_t activeContainerLength = 0;
    // Le programme persistant est relu uniquement apres attribution du scratch.
    const int16_t storageResult = bytecodeStorageRead(
        bytecodeStorage.container,
        sizeof(bytecodeStorage.container),
        &activeContainerLength,
        NULL);
    if(storageResult == BYTECODE_ERROR_NO_PROGRAM) {
        // Le programme transitoire conserve le banc de phase 3 et les tests hote.
        const int16_t validation = bytecodeValidateContainer(
            bytecodeSelectedProgram,
            bytecodeSelectedProgramLength,
            NULL);
        if(validation != BYTECODE_SUCCESS)
            return validation;
        memcpy(
            bytecodeStorage.container,
            bytecodeSelectedProgram,
            bytecodeSelectedProgramLength);
        activeContainerLength = bytecodeSelectedProgramLength;
    } else if(storageResult != BYTECODE_SUCCESS) {
        return storageResult;
    }
    bytecodeStorage.containerLength =
        static_cast<uint8_t>(activeContainerLength);
    bytecodeStorage.payloadLength =
        bytecodeStorage.container[BYTECODE_PAYLOAD_LENGTH_OFFSET];
    bytecodeStorage.programCounter =
        bytecodeStorage.container[BYTECODE_ENTRY_POINT_OFFSET];
    bytecodeStorage.randomState = BYTECODE_RANDOM_SEED;
    bytecodeStorage.particleDrag = 255;
    bytecodeStorage.particleLife = 1;
    bytecodeStorage.active = true;
    run = true;
    bytecodeDiagnosticsBegin();
    background(black);
    showPixels();
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Efface completement l'etat VM lors de la sortie du mode.
// ----------------------------------------------------------------------------
void bytecodeExit(void) {
    memset(&bytecodeStorage, 0, sizeof(bytecodeStorage));
    bytecodeDiagnosticsExit();
    background(black);
    showPixels();
}

// ----------------------------------------------------------------------------
// Execute une tranche cooperative du programme actif.
// ----------------------------------------------------------------------------
void bytecodeTick(void) {
    if(!bytecodeStorage.active || bytecodeStorage.halted)
        return;

    // Horodatage unique utilise par tous les WAIT de la tranche.
    const uint32_t now = millis();
    if(bytecodeStorage.waiting) {
        if(static_cast<int32_t>(now - bytecodeStorage.waitDeadline) < 0) {
            animationProcessServices();
            return;
        }
        bytecodeStorage.waiting = false;
    }

    // Debut des instructions dans la copie du scratch.
    const uint8_t* payload =
        bytecodeStorage.container + BYTECODE_HEADER_SIZE;
    for(uint8_t instructionCount = 0;
        instructionCount < BYTECODE_SLICE_INSTRUCTION_LIMIT;
        instructionCount++) {
        // Offset de l'instruction courante conserve pour les diagnostics.
        const uint8_t instructionOffset = bytecodeStorage.programCounter;
        if(instructionOffset >= bytecodeStorage.payloadLength) {
            bytecodeFail(BYTECODE_ERROR_INSTRUCTION, instructionOffset);
            return;
        }
        // Opcode courant relu dans la copie valide.
        const uint8_t opcode = payload[instructionOffset];
        // Taille defensive de l'instruction courante.
        const uint8_t instructionSize = bytecodeInstructionSize(opcode);
        if(instructionSize == 0 ||
           static_cast<uint16_t>(instructionOffset) + instructionSize >
           bytecodeStorage.payloadLength) {
            bytecodeFail(BYTECODE_ERROR_INSTRUCTION, instructionOffset);
            return;
        }

        // Premier operande immediat apres l'opcode.
        const uint8_t* operands = payload + instructionOffset + 1;
        bytecodeStorage.programCounter =
            static_cast<uint8_t>(instructionOffset + instructionSize);
        bytecodeStorage.instructionsWithoutBoundary++;
        bytecodeDiagnosticsInstruction(instructionOffset);
        int16_t runtimeError = BYTECODE_SUCCESS;

        switch(opcode) {
            case BYTECODE_OPCODE_HALT:
                bytecodeStorage.active = false;
                bytecodeStorage.halted = true;
                bytecodeDiagnosticsHalt();
                animationProcessServices();
                return;
            case BYTECODE_OPCODE_CLEAR:
                background(black);
                break;
            case BYTECODE_OPCODE_SHOW:
                bytecodeStorage.instructionsWithoutBoundary = 0;
                bytecodeDiagnosticsShow();
                showPixels();
                return;
            case BYTECODE_OPCODE_YIELD:
                bytecodeStorage.instructionsWithoutBoundary = 0;
                animationProcessServices();
                return;
            case BYTECODE_OPCODE_FADE:
                bytecodeFade(operands[0]);
                break;
            case BYTECODE_OPCODE_SET_I8:
                bytecodeWriteRegister(operands[0],
                    static_cast<int8_t>(operands[1]));
                break;
            case BYTECODE_OPCODE_SET_U8:
                bytecodeWriteRegister(operands[0], operands[1]);
                break;
            case BYTECODE_OPCODE_COPY: {
                // Registre recevant la copie.
                const uint8_t destination = operands[0] >> 4;
                // Registre lu par la copie.
                const uint8_t source = operands[0] & 0x0FU;
                bytecodeWriteRegister(destination, bytecodeReadRegister(source));
                break;
            }
            case BYTECODE_OPCODE_ADD_I8:
                bytecodeWriteRegister(
                    operands[0],
                    static_cast<int32_t>(bytecodeReadRegister(operands[0])) +
                    static_cast<int8_t>(operands[1]));
                break;
            case BYTECODE_OPCODE_ADD_REG: {
                // Registre accumulant l'addition.
                const uint8_t destination = operands[0] >> 4;
                // Registre ajoute a la destination.
                const uint8_t source = operands[0] & 0x0FU;
                bytecodeWriteRegister(
                    destination,
                    static_cast<int32_t>(bytecodeReadRegister(destination)) +
                    bytecodeReadRegister(source));
                break;
            }
            case BYTECODE_OPCODE_SUB_REG: {
                // Registre accumulant la soustraction.
                const uint8_t destination = operands[0] >> 4;
                // Registre soustrait de la destination.
                const uint8_t source = operands[0] & 0x0FU;
                bytecodeWriteRegister(
                    destination,
                    static_cast<int32_t>(bytecodeReadRegister(destination)) -
                    bytecodeReadRegister(source));
                break;
            }
            case BYTECODE_OPCODE_SIN8: {
                // Registre recevant l'amplitude non signee.
                const uint8_t destination = operands[0] >> 4;
                // Registre fournissant la phase basse.
                const uint8_t source = operands[0] & 0x0FU;
                // Phase modulo 256 utilisee comme index flash.
                const uint8_t phase = static_cast<uint8_t>(
                    bytecodeReadRegister(source) & 0xFF);
                bytecodeWriteRegister(destination,
                    pgm_read_byte(&BYTECODE_SIN8_TABLE[phase]));
                break;
            }
            case BYTECODE_OPCODE_RANDOM_U8:
                bytecodeWriteRegister(
                    operands[0],
                    bytecodeRandomBetween(operands[1], operands[2]));
                break;
            case BYTECODE_OPCODE_COLOR_RGB:
                bytecodeSetColor(operands[0], operands[1], operands[2]);
                break;
            case BYTECODE_OPCODE_COLOR_WHEEL: {
                // Couleur calculee depuis l'octet bas du registre.
                const Color color = bytecodeWheelColor(static_cast<uint8_t>(
                    bytecodeReadRegister(operands[0]) & 0xFF));
                bytecodeSetColor(color.red, color.green, color.blue);
                break;
            }
            case BYTECODE_OPCODE_COLOR_REGISTERS:
                bytecodeSetColor(
                    static_cast<uint8_t>(bytecodeReadRegister(operands[0] >> 4)),
                    static_cast<uint8_t>(bytecodeReadRegister(operands[0] & 0x0FU)),
                    static_cast<uint8_t>(bytecodeReadRegister(operands[1] >> 4)));
                break;
            case BYTECODE_OPCODE_VOXEL:
                runtimeError = bytecodeDrawVoxel(
                    operands[0] >> 4,
                    operands[0] & 0x0FU,
                    operands[1] >> 4);
                break;
            case BYTECODE_OPCODE_SPHERE:
                runtimeError = bytecodeDrawSphere(
                    operands[0] >> 4,
                    operands[0] & 0x0FU,
                    operands[1] >> 4,
                    operands[2]);
                break;
            case BYTECODE_OPCODE_BOUNCE:
                runtimeError = bytecodeBounce(
                    operands[0] >> 4,
                    operands[0] & 0x0FU,
                    static_cast<int8_t>(operands[1]),
                    static_cast<int8_t>(operands[2]));
                break;
            case BYTECODE_OPCODE_PARTICLE_CONFIGURE:
                bytecodeStorage.particleCount = operands[0];
                bytecodeStorage.particleGravity = static_cast<int8_t>(operands[1]);
                bytecodeStorage.particleDrag = operands[2];
                bytecodeStorage.particleLife = operands[3];
                for(uint8_t index = 0;
                    index < BYTECODE_PARTICLE_LIMIT;
                    index++)
                    bytecodeStorage.particles[index].active = false;
                break;
            case BYTECODE_OPCODE_PARTICLE_EMIT: {
                // Six index developpes depuis les trois paires compactes.
                const uint8_t registers[6] = {
                    static_cast<uint8_t>(operands[0] >> 4),
                    static_cast<uint8_t>(operands[0] & 0x0FU),
                    static_cast<uint8_t>(operands[1] >> 4),
                    static_cast<uint8_t>(operands[1] & 0x0FU),
                    static_cast<uint8_t>(operands[2] >> 4),
                    static_cast<uint8_t>(operands[2] & 0x0FU)
                };
                runtimeError = bytecodeEmitParticle(registers);
                break;
            }
            case BYTECODE_OPCODE_PARTICLE_STEP:
                bytecodeStepParticles();
                break;
            case BYTECODE_OPCODE_JUMP:
                bytecodeStorage.programCounter = static_cast<uint8_t>(
                    bytecodeStorage.programCounter +
                    static_cast<int8_t>(operands[0]));
                break;
            case BYTECODE_OPCODE_JUMP_IF_LESS: {
                // Registre gauche de la comparaison signee.
                const uint8_t left = operands[0] >> 4;
                // Registre droit de la comparaison signee.
                const uint8_t right = operands[0] & 0x0FU;
                if(bytecodeReadRegister(left) < bytecodeReadRegister(right))
                    bytecodeStorage.programCounter = static_cast<uint8_t>(
                        bytecodeStorage.programCounter +
                        static_cast<int8_t>(operands[1]));
                break;
            }
            case BYTECODE_OPCODE_WAIT: {
                // Duree little-endian deja bornee par le validateur.
                const uint16_t duration = static_cast<uint16_t>(operands[0]) |
                    static_cast<uint16_t>(operands[1] << 8);
                bytecodeStorage.instructionsWithoutBoundary = 0;
                if(duration > 0) {
                    bytecodeStorage.waitDeadline = now + duration;
                    bytecodeStorage.waiting = true;
                }
                animationProcessServices();
                return;
            }
            default:
                runtimeError = BYTECODE_ERROR_INSTRUCTION;
                break;
        }

        if(runtimeError != BYTECODE_SUCCESS) {
            bytecodeFail(runtimeError, instructionOffset);
            return;
        }
        if(bytecodeStorage.instructionsWithoutBoundary >
           BYTECODE_COOPERATIVE_INSTRUCTION_LIMIT) {
            bytecodeFail(BYTECODE_ERROR_QUOTA, instructionOffset);
            return;
        }
    }
    animationProcessServices();
}

static_assert(sizeof(BYTECODE_DEFAULT_PROGRAM) == 61,
    "Le programme Sphere embarque doit occuper 61 octets");
static_assert(sizeof(BYTECODE_SIN8_TABLE) == 256,
    "La table SIN8 doit couvrir toutes les phases d'un octet");

#endif

#endif
