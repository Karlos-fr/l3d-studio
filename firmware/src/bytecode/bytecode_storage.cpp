// ============================================================================
// BytecodeStorage - Implementation du stockage transactionnel EEPROM L3D
// ----------------------------------------------------------------------------
// Ce module valide chaque banque avant de l'exposer. La banque precedente reste
// executable tant que la signature de la nouvelle n'a pas ete ecrite en dernier.
// ============================================================================

#ifdef L3D_UNITY_BUILD

#if L3D_BYTECODE_ENABLED

static_assert(BYTECODE_STORAGE_BANK_A_ADDRESS + BYTECODE_STORAGE_BANK_SIZE ==
    BYTECODE_STORAGE_BANK_B_ADDRESS,
    "Les deux banques bytecode doivent etre contigues");
static_assert(BYTECODE_STORAGE_BANK_B_ADDRESS + BYTECODE_STORAGE_BANK_SIZE <=
    MAX_EEPROM_SIZE,
    "Les banques bytecode doivent rester dans l'EEPROM Photon");
static_assert(AUXSW_START_ADDR + SHFL * (sizeof(uint8_t) + 1) +
    sizeof(uint8_t) <= BYTECODE_STORAGE_BANK_A_ADDRESS,
    "Le bytecode ne doit chevaucher aucun reglage historique");
static_assert(PAINTER_START_ADDR + PIXEL_CNT * BPP <= TEXT_START_ADDR,
    "CubePainter doit rester avant les reglages historiques");

// ----------------------------------------------------------------------------
// Retourne l'adresse physique d'une banque connue.
//
// Parametres :
// - bank : identifiant A ou B.
//
// Retour :
// - premiere adresse EEPROM de la banque.
// ----------------------------------------------------------------------------
static uint16_t bytecodeStorageBankAddress(int8_t bank) {
    return bank == BYTECODE_STORAGE_BANK_B
        ? BYTECODE_STORAGE_BANK_B_ADDRESS
        : BYTECODE_STORAGE_BANK_A_ADDRESS;
}

// ----------------------------------------------------------------------------
// Calcule la longueur annoncee par un en-tete deja accessible.
//
// Parametres :
// - container : debut d'une banque relue.
//
// Retour :
// - longueur totale potentielle, bornee ensuite par le validateur.
// ----------------------------------------------------------------------------
static size_t bytecodeStorageDeclaredLength(const uint8_t* container) {
    return BYTECODE_HEADER_SIZE +
        static_cast<size_t>(container[BYTECODE_PAYLOAD_LENGTH_OFFSET]);
}

// ----------------------------------------------------------------------------
// Relit une banque complete dans un buffer de travail borne.
//
// Parametres :
// - bank : identifiant A ou B.
// - destination : buffer d'au moins 197 octets.
// ----------------------------------------------------------------------------
static void bytecodeStorageReadBank(int8_t bank, uint8_t* destination) {
    const uint16_t address = bytecodeStorageBankAddress(bank);
    for(uint16_t index = 0; index < BYTECODE_STORAGE_BANK_SIZE; index++)
        destination[index] = EEPROM.read(address + index);
}

// ----------------------------------------------------------------------------
// Ecrit un octet uniquement lorsque sa valeur persistante differe.
//
// Parametres :
// - address : adresse EEPROM valide.
// - value : nouvelle valeur demandee.
// ----------------------------------------------------------------------------
static void bytecodeStorageWriteChanged(uint16_t address, uint8_t value) {
    if(EEPROM.read(address) != value)
        EEPROM.write(address, value);
}

// ----------------------------------------------------------------------------
// Indique si une generation est plus recente modulo 256.
//
// Parametres :
// - candidate : generation candidate.
// - reference : generation deja retenue.
//
// Retour :
// - vrai pour un ecart compris entre un et 127.
// ----------------------------------------------------------------------------
static bool bytecodeStorageGenerationIsNewer(
        uint8_t candidate,
        uint8_t reference) {
    const uint8_t difference = static_cast<uint8_t>(candidate - reference);
    return difference != 0 && difference < 128;
}

// ----------------------------------------------------------------------------
// Copie les metadonnees validees d'une banque dans le statut public.
//
// Parametres :
// - status : destination deja remise a zero.
// - bank : banque valide selectionnee.
// - container : conteneur integral valide.
// - containerLength : longueur exacte validee.
// ----------------------------------------------------------------------------
static void bytecodeStorageFillStatus(
        BytecodeStorageStatus* status,
        int8_t bank,
        const uint8_t* container,
        size_t containerLength) {
    status->installed = true;
    status->bank = bank;
    status->layoutVersion = BYTECODE_STORAGE_LAYOUT_VERSION;
    status->formatVersion = container[BYTECODE_FORMAT_VERSION_OFFSET];
    status->minimumVmVersion = container[BYTECODE_VM_VERSION_OFFSET];
    status->capabilities = container[BYTECODE_CAPABILITIES_OFFSET];
    status->generation = container[BYTECODE_GENERATION_OFFSET];
    status->containerLength = static_cast<uint8_t>(containerLength);
    status->payloadLength = container[BYTECODE_PAYLOAD_LENGTH_OFFSET];
    status->crc = static_cast<uint16_t>(container[BYTECODE_CRC_OFFSET]) |
        static_cast<uint16_t>(container[BYTECODE_CRC_OFFSET + 1]) << 8;
}

// ----------------------------------------------------------------------------
// Inspecte les deux banques et selectionne la generation valide la plus recente.
//
// Parametres :
// - status : destination obligatoire remise a zero avant inspection.
//
// Retour :
// - zero meme sans programme, ou une erreur de stockage.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageInspect(BytecodeStorageStatus* status) {
    if(status == NULL)
        return BYTECODE_ERROR_STORAGE;
    memset(status, 0, sizeof(*status));
    status->bank = BYTECODE_STORAGE_BANK_NONE;
    status->layoutVersion = BYTECODE_STORAGE_LAYOUT_VERSION;

    // Un seul buffer local de taille inferieure a la limite de pile du projet.
    uint8_t candidate[BYTECODE_STORAGE_BANK_SIZE];
    for(int8_t bank = BYTECODE_STORAGE_BANK_A;
        bank <= BYTECODE_STORAGE_BANK_B;
        bank++) {
        bytecodeStorageReadBank(bank, candidate);
        const size_t candidateLength = bytecodeStorageDeclaredLength(candidate);
        if(bytecodeValidateContainer(candidate, candidateLength, NULL) !=
           BYTECODE_SUCCESS)
            continue;
        if(!status->installed || bytecodeStorageGenerationIsNewer(
                candidate[BYTECODE_GENERATION_OFFSET],
                status->generation))
            bytecodeStorageFillStatus(status, bank, candidate, candidateLength);
    }
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Relit le programme persistant selectionne dans un buffer fourni.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageRead(
        uint8_t* destination,
        size_t destinationCapacity,
        size_t* containerLength,
        BytecodeStorageStatus* status) {
    if(destination == NULL || containerLength == NULL ||
       destinationCapacity < BYTECODE_STORAGE_BANK_SIZE)
        return BYTECODE_ERROR_LENGTH;

    BytecodeStorageStatus selected = {};
    const int16_t inspectResult = bytecodeStorageInspect(&selected);
    if(inspectResult != BYTECODE_SUCCESS)
        return inspectResult;
    if(!selected.installed)
        return BYTECODE_ERROR_NO_PROGRAM;

    bytecodeStorageReadBank(selected.bank, destination);
    const size_t selectedLength = selected.containerLength;
    const int16_t validation = bytecodeValidateContainer(
        destination,
        selectedLength,
        NULL);
    if(validation != BYTECODE_SUCCESS)
        return validation;
    *containerLength = selectedLength;
    if(status != NULL)
        *status = selected;
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Verifie une banque encore invalidee en reconstruisant seulement sa signature.
//
// Parametres :
// - bank : banque cible dont le premier octet reste invalide.
// - expectedLength : longueur exacte attendue.
//
// Retour :
// - zero si le contenu et le CRC sont coherents.
// ----------------------------------------------------------------------------
static int16_t bytecodeStorageVerifyBeforeActivation(
        int8_t bank,
        size_t expectedLength) {
    uint8_t candidate[BYTECODE_STORAGE_BANK_SIZE];
    bytecodeStorageReadBank(bank, candidate);
    candidate[0] = 'L';
    return bytecodeValidateContainer(candidate, expectedLength, NULL);
}

// ----------------------------------------------------------------------------
// Installe un conteneur valide dans la banque inactive.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageInstall(
        uint8_t* container,
        size_t containerLength,
        BytecodeStorageStatus* status) {
    const int16_t validation = bytecodeValidateContainer(
        container,
        containerLength,
        NULL);
    if(validation != BYTECODE_SUCCESS)
        return validation;

    BytecodeStorageStatus current = {};
    const int16_t inspectResult = bytecodeStorageInspect(&current);
    if(inspectResult != BYTECODE_SUCCESS)
        return inspectResult;
    const int8_t targetBank = current.installed &&
        current.bank == BYTECODE_STORAGE_BANK_A
        ? BYTECODE_STORAGE_BANK_B
        : BYTECODE_STORAGE_BANK_A;
    container[BYTECODE_GENERATION_OFFSET] = current.installed
        ? static_cast<uint8_t>(current.generation + 1)
        : 0;
    const uint16_t crc = bytecodeCalculateCrc(container, containerLength);
    container[BYTECODE_CRC_OFFSET] = static_cast<uint8_t>(crc);
    container[BYTECODE_CRC_OFFSET + 1] = static_cast<uint8_t>(crc >> 8);

    const uint16_t targetAddress = bytecodeStorageBankAddress(targetBank);
    bytecodeStorageWriteChanged(targetAddress, 0);
    for(size_t index = 1; index < containerLength; index++)
        bytecodeStorageWriteChanged(
            targetAddress + static_cast<uint16_t>(index),
            container[index]);

    if(bytecodeStorageVerifyBeforeActivation(targetBank, containerLength) !=
       BYTECODE_SUCCESS)
        return BYTECODE_ERROR_STORAGE;
    bytecodeStorageWriteChanged(targetAddress, 'L');

    BytecodeStorageStatus confirmed = {};
    const int16_t confirmedResult = bytecodeStorageInspect(&confirmed);
    if(confirmedResult != BYTECODE_SUCCESS || !confirmed.installed ||
       confirmed.bank != targetBank || confirmed.generation !=
       container[BYTECODE_GENERATION_OFFSET])
        return BYTECODE_ERROR_STORAGE;
    if(status != NULL)
        *status = confirmed;
    return BYTECODE_SUCCESS;
}

// ----------------------------------------------------------------------------
// Invalide les deux banques sans effacer leurs payloads.
//
// Retour :
// - zero apres invalidation idempotente.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageRemove(void) {
    bytecodeStorageWriteChanged(BYTECODE_STORAGE_BANK_A_ADDRESS, 0);
    bytecodeStorageWriteChanged(BYTECODE_STORAGE_BANK_B_ADDRESS, 0);
    return BYTECODE_SUCCESS;
}

#endif

#endif
