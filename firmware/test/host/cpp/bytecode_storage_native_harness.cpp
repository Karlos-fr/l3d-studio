// ============================================================================
// BytecodeStorageNativeHarness - Banc d'essai EEPROM transactionnel L3D
// ----------------------------------------------------------------------------
// Ce programme execute le vrai stockage firmware avec une EEPROM simulable. Il
// ne teste ni HTTP, ni le framebuffer, ni le materiel Particle.
// ============================================================================

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Active les implementations normalement rassemblees par le unity build.
#define L3D_UNITY_BUILD 1

// Active explicitement le stockage teste.
#define L3D_BYTECODE_ENABLED 1

// Nombre d'adresses EEPROM utilisables sur le Photon historique.
#define MAX_EEPROM_SIZE 2047

// Debut historique du framebuffer CubePainter.
#define PAINTER_START_ADDR 0

// Nombre de voxels du cube.
#define PIXEL_CNT 512

// Nombre de composantes stockees par voxel CubePainter.
#define BPP 3

// Premiere adresse du texte historique.
#define TEXT_START_ADDR 1537

// Premiere adresse des switches auxiliaires historiques.
#define AUXSW_START_ADDR 1647

// Identifiant du switch auxiliaire historique le plus haut.
#define SHFL 2

#include "../../../src/bytecode/bytecode_storage.h"

// EEPROM hote dont les ecritures peuvent etre interrompues apres un quota.
struct HostEeprom {
    uint8_t values[MAX_EEPROM_SIZE];
    int writeBudget;
    int writeCount;

    // ------------------------------------------------------------------------
    // Initialise une EEPROM effacee sans limite d'ecriture.
    // ------------------------------------------------------------------------
    HostEeprom() : writeBudget(-1), writeCount(0) {
        memset(values, 0xFF, sizeof(values));
    }

    // ------------------------------------------------------------------------
    // Lit un octet a une adresse valide.
    //
    // Parametres :
    // - address : adresse comprise dans la capacite Photon.
    //
    // Retour :
    // - valeur persistante courante.
    // ------------------------------------------------------------------------
    uint8_t read(int address) const {
        return values[address];
    }

    // ------------------------------------------------------------------------
    // Ecrit un octet tant que la coupure simulee ne bloque pas la suite.
    //
    // Parametres :
    // - address : adresse comprise dans la capacite Photon.
    // - value : nouvelle valeur persistante.
    // ------------------------------------------------------------------------
    void write(int address, uint8_t value) {
        if(writeBudget >= 0 && writeCount >= writeBudget)
            return;
        values[address] = value;
        writeCount++;
    }

    // ------------------------------------------------------------------------
    // Configure le nombre d'ecritures qui survivent a une coupure.
    //
    // Parametres :
    // - budget : nombre d'ecritures acceptees, ou moins un sans coupure.
    // ------------------------------------------------------------------------
    void setWriteBudget(int budget) {
        writeBudget = budget;
        writeCount = 0;
    }
};

// Instance EEPROM attendue par le stockage firmware inclus.
static HostEeprom EEPROM;

#include "../../../src/bytecode/bytecode_format.cpp"
#include "../../../src/bytecode/bytecode_validator.cpp"
#include "../../../src/bytecode/bytecode_storage.cpp"

// ----------------------------------------------------------------------------
// Interrompt le banc avec une cause lorsque la condition est fausse.
//
// Parametres :
// - condition : resultat attendu vrai.
// - message : cause affichee avant l'arret.
// ----------------------------------------------------------------------------
static void hostRequire(bool condition, const char* message) {
    if(condition)
        return;
    fprintf(stderr, "%s\n", message);
    exit(1);
}

// ----------------------------------------------------------------------------
// Construit un petit conteneur valide distinct par sa couleur immediate.
//
// Parametres :
// - destination : buffer d'au moins 197 octets.
// - red : composante qui distingue les versions de test.
//
// Retour :
// - longueur exacte du conteneur.
// ----------------------------------------------------------------------------
static size_t hostBuildProgram(uint8_t* destination, uint8_t red) {
    const uint8_t payload[] = {
        BYTECODE_OPCODE_CLEAR,
        BYTECODE_OPCODE_COLOR_RGB, red, 0x20, 0x30,
        BYTECODE_OPCODE_SET_U8, 0x00, 0x03,
        BYTECODE_OPCODE_VOXEL, 0x00, 0x00,
        BYTECODE_OPCODE_SHOW,
        BYTECODE_OPCODE_HALT
    };
    memset(destination, 0, BYTECODE_CONTAINER_MAX_SIZE);
    destination[0] = 'L';
    destination[1] = '3';
    destination[2] = 'D';
    destination[BYTECODE_FORMAT_VERSION_OFFSET] = BYTECODE_FORMAT_VERSION;
    destination[BYTECODE_VM_VERSION_OFFSET] = BYTECODE_VM_VERSION;
    destination[BYTECODE_PAYLOAD_LENGTH_OFFSET] = sizeof(payload);
    memcpy(destination + BYTECODE_HEADER_SIZE, payload, sizeof(payload));
    const size_t containerLength = BYTECODE_HEADER_SIZE + sizeof(payload);
    const uint16_t crc = bytecodeCalculateCrc(destination, containerLength);
    destination[BYTECODE_CRC_OFFSET] = static_cast<uint8_t>(crc);
    destination[BYTECODE_CRC_OFFSET + 1] = static_cast<uint8_t>(crc >> 8);
    return containerLength;
}

// ----------------------------------------------------------------------------
// Verifie EEPROM vierge, installation, remplacement et suppression.
// ----------------------------------------------------------------------------
static void hostTestLifecycle(void) {
    EEPROM = HostEeprom();
    for(uint16_t address = 0; address < BYTECODE_STORAGE_BANK_A_ADDRESS; address++)
        EEPROM.values[address] = static_cast<uint8_t>(address);

    BytecodeStorageStatus status = {};
    hostRequire(bytecodeStorageInspect(&status) == BYTECODE_SUCCESS &&
                !status.installed,
        "Une EEPROM vierge expose un programme");

    uint8_t first[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t firstLength = hostBuildProgram(first, 0x10);
    hostRequire(bytecodeStorageInstall(first, firstLength, &status) ==
                BYTECODE_SUCCESS,
        "Premiere installation refusee");
    hostRequire(status.bank == BYTECODE_STORAGE_BANK_A &&
                status.generation == 0,
        "Premiere generation ou banque incorrecte");

    uint8_t second[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t secondLength = hostBuildProgram(second, 0x90);
    hostRequire(bytecodeStorageInstall(second, secondLength, &status) ==
                BYTECODE_SUCCESS,
        "Remplacement refuse");
    hostRequire(status.bank == BYTECODE_STORAGE_BANK_B &&
                status.generation == 1,
        "Remplacement non selectionne");

    uint8_t loaded[BYTECODE_CONTAINER_MAX_SIZE] = {};
    size_t loadedLength = 0;
    hostRequire(bytecodeStorageRead(
            loaded,
            sizeof(loaded),
            &loadedLength,
            &status) == BYTECODE_SUCCESS &&
            loadedLength == secondLength &&
            loaded[BYTECODE_HEADER_SIZE + 2] == 0x90,
        "Programme remplace non relu apres redemarrage simule");

    for(uint16_t address = 0; address < BYTECODE_STORAGE_BANK_A_ADDRESS; address++)
        hostRequire(EEPROM.values[address] == static_cast<uint8_t>(address),
            "Un reglage historique ou CubePainter a ete modifie");

    hostRequire(bytecodeStorageRemove() == BYTECODE_SUCCESS,
        "Suppression refusee");
    hostRequire(bytecodeStorageInspect(&status) == BYTECODE_SUCCESS &&
                !status.installed,
        "Suppression encore visible");
}

// ----------------------------------------------------------------------------
// Simule une coupure apres chaque ecriture possible d'un remplacement.
// ----------------------------------------------------------------------------
static void hostTestInterruptedReplacement(void) {
    EEPROM = HostEeprom();
    uint8_t oldProgram[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t oldLength = hostBuildProgram(oldProgram, 0x11);
    hostRequire(bytecodeStorageInstall(oldProgram, oldLength, NULL) ==
                BYTECODE_SUCCESS,
        "Programme initial de coupure refuse");

    // Image stable restauree avant chaque point de coupure.
    static uint8_t stableEeprom[MAX_EEPROM_SIZE];
    memcpy(stableEeprom, EEPROM.values, sizeof(stableEeprom));
    for(int budget = 0; budget < 64; budget++) {
        memcpy(EEPROM.values, stableEeprom, sizeof(stableEeprom));
        EEPROM.setWriteBudget(budget);
        uint8_t newProgram[BYTECODE_CONTAINER_MAX_SIZE] = {};
        const size_t newLength = hostBuildProgram(newProgram, 0xEE);
        bytecodeStorageInstall(newProgram, newLength, NULL);
        EEPROM.setWriteBudget(-1);

        uint8_t loaded[BYTECODE_CONTAINER_MAX_SIZE] = {};
        size_t loadedLength = 0;
        hostRequire(bytecodeStorageRead(
                loaded,
                sizeof(loaded),
                &loadedLength,
                NULL) == BYTECODE_SUCCESS,
            "Une coupure a supprime les deux generations");
        const uint8_t red = loaded[BYTECODE_HEADER_SIZE + 2];
        hostRequire(red == 0x11 || red == 0xEE,
            "Une coupure expose un programme partiel");
    }
}

// ----------------------------------------------------------------------------
// Verifie qu'un conteneur refuse ne remplace jamais la generation courante.
// ----------------------------------------------------------------------------
static void hostTestRejectedInstall(void) {
    EEPROM = HostEeprom();
    uint8_t validProgram[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t validLength = hostBuildProgram(validProgram, 0x22);
    hostRequire(bytecodeStorageInstall(validProgram, validLength, NULL) ==
                BYTECODE_SUCCESS,
        "Programme de reference refuse");

    uint8_t invalidProgram[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t invalidLength = hostBuildProgram(invalidProgram, 0x77);
    invalidProgram[BYTECODE_CRC_OFFSET] ^= 0x01;
    hostRequire(bytecodeStorageInstall(invalidProgram, invalidLength, NULL) ==
                BYTECODE_ERROR_CRC,
        "CRC corrompu accepte");

    uint8_t loaded[BYTECODE_CONTAINER_MAX_SIZE] = {};
    size_t loadedLength = 0;
    hostRequire(bytecodeStorageRead(
            loaded,
            sizeof(loaded),
            &loadedLength,
            NULL) == BYTECODE_SUCCESS &&
            loaded[BYTECODE_HEADER_SIZE + 2] == 0x22,
        "Installation refusee ayant remplace le programme valide");
}

// ----------------------------------------------------------------------------
// Execute les scenarios transactionnels natifs.
// ----------------------------------------------------------------------------
int main(void) {
    hostTestLifecycle();
    hostTestInterruptedReplacement();
    hostTestRejectedInstall();
    return 0;
}
