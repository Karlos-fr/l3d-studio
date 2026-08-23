// ============================================================================
// BytecodeValidator - Implementation de la validation complete L3D
// ----------------------------------------------------------------------------
// Le validateur parcourt deux fois au plus 185 octets avec un bit par frontiere.
// Il n'alloue rien, ne copie rien et ne touche ni au rendu ni a l'EEPROM.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_BYTECODE_ENABLED

// Signature ASCII L3D du conteneur version 1.
static const uint8_t BYTECODE_MAGIC[3] = {0x4C, 0x33, 0x44};

// Nombre d'octets necessaires pour marquer les 185 offsets possibles.
const uint8_t BYTECODE_BOUNDARY_BYTES =
    (BYTECODE_PAYLOAD_MAX_SIZE + 7U) / 8U;

// Duree maximale acceptee par WAIT.
const uint16_t BYTECODE_WAIT_MAX_MS = 60000U;

// Valeur initiale du CRC-16/CCITT-FALSE.
const uint16_t BYTECODE_CRC_INITIAL = 0xFFFFU;

// Polynome non reflechi du CRC-16/CCITT-FALSE.
const uint16_t BYTECODE_CRC_POLYNOMIAL = 0x1021U;

// ----------------------------------------------------------------------------
// Integre un octet au CRC-16/CCITT-FALSE courant.
//
// Parametres :
// - current : CRC avant l'octet.
// - value : octet a integrer.
//
// Retour :
// - CRC actualise sur seize bits.
// ----------------------------------------------------------------------------
static uint16_t bytecodeUpdateCrc(uint16_t current, uint8_t value) {
    uint16_t crc = static_cast<uint16_t>(current ^
        static_cast<uint16_t>(value << 8));
    for(uint8_t bitIndex = 0; bitIndex < 8; bitIndex++) {
        crc = (crc & 0x8000U) != 0
            ? static_cast<uint16_t>((crc << 1) ^ BYTECODE_CRC_POLYNOMIAL)
            : static_cast<uint16_t>(crc << 1);
    }
    return crc;
}

// ----------------------------------------------------------------------------
// Calcule le CRC contractuel sans lire le champ CRC lui-meme.
//
// Parametres :
// - container : conteneur dont la longueur est deja validee.
// - containerLength : nombre exact d'octets accessibles.
//
// Retour :
// - CRC des champs 3 a 9 puis du payload.
// ----------------------------------------------------------------------------
static uint16_t bytecodeCalculateCrc(
    const uint8_t* container,
    size_t containerLength) {
    uint16_t crc = BYTECODE_CRC_INITIAL;
    for(uint8_t offset = BYTECODE_FORMAT_VERSION_OFFSET;
        offset <= BYTECODE_FLAGS_OFFSET;
        offset++) {
        crc = bytecodeUpdateCrc(crc, container[offset]);
    }
    for(size_t offset = BYTECODE_HEADER_SIZE;
        offset < containerLength;
        offset++) {
        crc = bytecodeUpdateCrc(crc, container[offset]);
    }
    return crc;
}

// ----------------------------------------------------------------------------
// Lit un entier little-endian sur seize bits.
//
// Parametres :
// - source : buffer contenant les deux octets.
// - offset : position du premier octet.
//
// Retour :
// - valeur non signee reconstruite.
// ----------------------------------------------------------------------------
static uint16_t bytecodeReadUint16(const uint8_t* source, uint8_t offset) {
    return static_cast<uint16_t>(source[offset]) |
        static_cast<uint16_t>(source[offset + 1] << 8);
}

// ----------------------------------------------------------------------------
// Marque un offset comme debut valide d'instruction.
//
// Parametres :
// - boundaries : bitset local des frontieres.
// - offset : position comprise entre zero et 184.
//
// Effet de bord :
// - positionne exactement un bit dans boundaries.
// ----------------------------------------------------------------------------
static void bytecodeMarkBoundary(uint8_t* boundaries, uint8_t offset) {
    boundaries[offset >> 3] = static_cast<uint8_t>(
        boundaries[offset >> 3] | (1U << (offset & 0x07U)));
}

// ----------------------------------------------------------------------------
// Indique si un offset correspond au debut d'une instruction.
//
// Parametres :
// - boundaries : bitset local entierement construit.
// - offset : position candidate.
// - payloadLength : longueur qui borne l'offset.
//
// Retour :
// - vrai lorsque l'offset est dans le payload et marque.
// ----------------------------------------------------------------------------
static bool bytecodeIsBoundary(
    const uint8_t* boundaries,
    int16_t offset,
    uint8_t payloadLength) {
    if(offset < 0 || offset >= payloadLength)
        return false;
    return (boundaries[offset >> 3] & (1U << (offset & 0x07U))) != 0;
}

// ----------------------------------------------------------------------------
// Indique si le nibble reserve d'un registre seul est nul.
//
// Parametres :
// - value : octet compact a verifier.
//
// Retour :
// - vrai lorsque l'index est canonique entre R0 et R15.
// ----------------------------------------------------------------------------
static bool bytecodeIsSingleRegisterValid(uint8_t value) {
    return (value & 0xF0U) == 0;
}

// ----------------------------------------------------------------------------
// Valide les operandes dont les bornes sont independantes du runtime.
//
// Parametres :
// - instruction : pointeur vers l'opcode et ses operandes complets.
//
// Retour :
// - zero ou la premiere faute statique.
// ----------------------------------------------------------------------------
static int16_t bytecodeValidateStaticOperands(const uint8_t* instruction) {
    // Opcode dont les operandes suivent immediatement dans le buffer.
    const uint8_t opcode = instruction[0];
    if(opcode == BYTECODE_OPCODE_COLOR_WHEEL ||
       opcode == BYTECODE_OPCODE_SET_I8 ||
       opcode == BYTECODE_OPCODE_SET_U8 ||
       opcode == BYTECODE_OPCODE_ADD_I8 ||
       opcode == BYTECODE_OPCODE_RANDOM_U8) {
        if(!bytecodeIsSingleRegisterValid(instruction[1]))
            return BYTECODE_ERROR_REGISTER;
    }

    if(opcode == BYTECODE_OPCODE_COLOR_REGISTERS ||
       opcode == BYTECODE_OPCODE_VOXEL ||
       opcode == BYTECODE_OPCODE_SPHERE) {
        if((instruction[2] & 0x0FU) != 0)
            return BYTECODE_ERROR_REGISTER;
    }

    if(opcode == BYTECODE_OPCODE_RANDOM_U8 &&
       instruction[2] > instruction[3])
        return BYTECODE_ERROR_VALUE;

    if(opcode == BYTECODE_OPCODE_SPHERE &&
       (instruction[3] < 1 || instruction[3] > 7))
        return BYTECODE_ERROR_VALUE;

    if(opcode == BYTECODE_OPCODE_BOUNCE &&
       static_cast<int8_t>(instruction[2]) >
       static_cast<int8_t>(instruction[3]))
        return BYTECODE_ERROR_VALUE;

    if(opcode == BYTECODE_OPCODE_PARTICLE_CONFIGURE &&
       (instruction[1] < 1 ||
        instruction[1] > BYTECODE_PARTICLE_LIMIT ||
        instruction[4] < 1))
        return BYTECODE_ERROR_PARTICLE_LIMIT;

    if(opcode == BYTECODE_OPCODE_WAIT &&
       bytecodeReadUint16(instruction, 1) > BYTECODE_WAIT_MAX_MS)
        return BYTECODE_ERROR_VALUE;

    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Valide entierement un conteneur version 1 sans allocation.
//
// Parametres :
// - container : en-tete et payload candidats.
// - containerLength : nombre exact d'octets accessibles.
// - errorOffset : destination facultative du premier offset fautif.
//
// Retour :
// - zero en cas de succes, sinon un code d'erreur public negatif.
// ----------------------------------------------------------------------------
int16_t bytecodeValidateContainer(
    const uint8_t* container,
    size_t containerLength,
    uint8_t* errorOffset) {
    if(errorOffset != NULL)
        *errorOffset = 0;
    if(container == NULL ||
       containerLength < BYTECODE_HEADER_SIZE + 1U ||
       containerLength > BYTECODE_CONTAINER_MAX_SIZE ||
       container[0] != BYTECODE_MAGIC[0] ||
       container[1] != BYTECODE_MAGIC[1] ||
       container[2] != BYTECODE_MAGIC[2])
        return BYTECODE_ERROR_CONTAINER;
    if(container[BYTECODE_FORMAT_VERSION_OFFSET] != BYTECODE_FORMAT_VERSION)
        return BYTECODE_ERROR_FORMAT_VERSION;
    if(container[BYTECODE_VM_VERSION_OFFSET] > BYTECODE_VM_VERSION)
        return BYTECODE_ERROR_VM_VERSION;

    // Longueur du payload annoncee par l'en-tete.
    const uint8_t payloadLength =
        container[BYTECODE_PAYLOAD_LENGTH_OFFSET];
    if(payloadLength < 1 ||
       payloadLength > BYTECODE_PAYLOAD_MAX_SIZE ||
       containerLength != BYTECODE_HEADER_SIZE + payloadLength)
        return BYTECODE_ERROR_LENGTH;

    // Capacites optionnelles annoncees par le producteur.
    const uint8_t capabilities = container[BYTECODE_CAPABILITIES_OFFSET];
    if((capabilities & static_cast<uint8_t>(~BYTECODE_KNOWN_CAPABILITIES)) != 0)
        return BYTECODE_ERROR_CAPABILITY;
    if(container[BYTECODE_FLAGS_OFFSET] != 0)
        return BYTECODE_ERROR_CONTAINER;

    // Controle d'integrite little-endian stocke dans l'en-tete.
    const uint16_t storedCrc =
        bytecodeReadUint16(container, BYTECODE_CRC_OFFSET);
    if(storedCrc != bytecodeCalculateCrc(container, containerLength))
        return BYTECODE_ERROR_CRC;

    // Debut des instructions apres l'en-tete fixe.
    const uint8_t* payload = container + BYTECODE_HEADER_SIZE;
    uint8_t boundaries[BYTECODE_BOUNDARY_BYTES] = {};
    uint8_t requiredCapabilities = 0;
    uint8_t offset = 0;
    while(offset < payloadLength) {
        bytecodeMarkBoundary(boundaries, offset);
        // Taille contractuelle de l'instruction courante.
        const uint8_t instructionSize = bytecodeInstructionSize(payload[offset]);
        if(instructionSize == 0 ||
           static_cast<uint16_t>(offset) + instructionSize > payloadLength) {
            if(errorOffset != NULL)
                *errorOffset = offset;
            return BYTECODE_ERROR_INSTRUCTION;
        }

        // Premiere faute statique detectee dans les operandes.
        const int16_t operandError =
            bytecodeValidateStaticOperands(payload + offset);
        if(operandError != BYTECODE_SUCCESS) {
            if(errorOffset != NULL)
                *errorOffset = offset;
            return operandError;
        }
        requiredCapabilities = static_cast<uint8_t>(requiredCapabilities |
            bytecodeRequiredCapability(payload[offset]));
        offset = static_cast<uint8_t>(offset + instructionSize);
    }

    if((capabilities & requiredCapabilities) != requiredCapabilities)
        return BYTECODE_ERROR_CAPABILITY;

    // Point d'entree relatif au payload.
    const uint8_t entryPoint = container[BYTECODE_ENTRY_POINT_OFFSET];
    if(!bytecodeIsBoundary(boundaries, entryPoint, payloadLength)) {
        if(errorOffset != NULL)
            *errorOffset = entryPoint;
        return BYTECODE_ERROR_ENTRY_POINT;
    }

    offset = 0;
    while(offset < payloadLength) {
        // Opcode examine pendant la passe des branchements.
        const uint8_t opcode = payload[offset];
        // Taille necessaire au calcul de la cible relative.
        const uint8_t instructionSize = bytecodeInstructionSize(opcode);
        if(opcode == BYTECODE_OPCODE_JUMP ||
           opcode == BYTECODE_OPCODE_JUMP_IF_LESS) {
            // Position de l'offset relatif selon la forme du branchement.
            const uint8_t relativeIndex =
                opcode == BYTECODE_OPCODE_JUMP ? 1 : 2;
            // Cible absolue signee dans le payload.
            const int16_t target = static_cast<int16_t>(offset) +
                instructionSize +
                static_cast<int8_t>(payload[offset + relativeIndex]);
            if(!bytecodeIsBoundary(boundaries, target, payloadLength)) {
                if(errorOffset != NULL)
                    *errorOffset = offset;
                return BYTECODE_ERROR_JUMP;
            }
        }
        offset = static_cast<uint8_t>(offset + instructionSize);
    }
    return BYTECODE_SUCCESS;
}

static_assert(BYTECODE_BOUNDARY_BYTES <= 24,
    "Le bitset de validation doit rester sous 24 octets");

#endif

#endif
