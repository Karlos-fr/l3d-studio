// ============================================================================
// BytecodeNativeHarness - Banc d'essai natif de la VM firmware L3D
// ----------------------------------------------------------------------------
// Ce programme fournit uniquement les primitives Particle et NeoPixel minimales
// necessaires pour executer le vrai validateur et la vraie VM sur l'hote.
// ============================================================================

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Active les implementations normalement rassemblees par le unity build.
#define L3D_UNITY_BUILD 1

// Active explicitement la fonctionnalite testee.
#define L3D_BYTECODE_ENABLED 1

// Rend les donnees flash directement lisibles dans le processus hote.
#define PROGMEM

// Lit une entree de table flash depuis la memoire hote ordinaire.
#define pgm_read_byte(address) (*(address))

#include "../../../src/bytecode/bytecode_vm.h"

// ----------------------------------------------------------------------------
// Simule une EEPROM vide afin de conserver les scenarios transitoires de VM.
//
// Parametres :
// - destination : buffer actif inutilise sans programme persistant.
// - destinationCapacity : capacite inutilisee.
// - containerLength : longueur inutilisee.
// - status : statut optionnel inutilise.
//
// Retour :
// - erreur stable indiquant l'absence de programme installe.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageRead(
        uint8_t* destination,
        size_t destinationCapacity,
        size_t* containerLength,
        BytecodeStorageStatus* status) {
    (void)destination;
    (void)destinationCapacity;
    (void)containerLength;
    (void)status;
    return BYTECODE_ERROR_NO_PROGRAM;
}

// Etat partage remplacant l'union historique pendant le test natif.
static BytecodeVmStorage hostBytecodeStorage = {};

// Alias attendu par l'implementation de la VM.
#define bytecodeStorage hostBytecodeStorage

// Couleur RGB minimale compatible avec les primitives de la VM.
struct Color {
    uint8_t red;
    uint8_t green;
    uint8_t blue;

    // ------------------------------------------------------------------------
    // Construit une couleur compacte depuis trois composantes entieres.
    //
    // Parametres :
    // - redValue : composante rouge.
    // - greenValue : composante verte.
    // - blueValue : composante bleue.
    // ------------------------------------------------------------------------
    Color(int redValue = 0, int greenValue = 0, int blueValue = 0)
        : red(static_cast<uint8_t>(redValue)),
          green(static_cast<uint8_t>(greenValue)),
          blue(static_cast<uint8_t>(blueValue)) {}
};

// Framebuffer RGB simule des 512 voxels.
static Color hostFramebuffer[512] = {};

// Couleur noire partagee avec les fonctions de rendu.
static const Color black(0, 0, 0);

// Horodatage millis controle par les tests.
static uint32_t hostMillis = 0;

// Nombre de presentations du framebuffer.
static uint16_t hostShowCount = 0;

// Nombre de tentatives d'ecriture avec coordonnees invalides.
static uint16_t hostInvalidVoxelWrites = 0;

// Dernier index de mode demande a l'ordonnanceur.
static int hostRequestedModeIndex = -1;

// Drapeau historique requis par l'entree dans le mode.
bool run = false;

// Pilote NeoPixel minimal utilise uniquement par FADE.
struct HostStrip {
    // ------------------------------------------------------------------------
    // Assemble trois composantes en entier RGB888.
    //
    // Parametres :
    // - red : composante rouge.
    // - green : composante verte.
    // - blue : composante bleue.
    //
    // Retour :
    // - couleur RGB888 compacte.
    // ------------------------------------------------------------------------
    static uint32_t Color(uint8_t red, uint8_t green, uint8_t blue) {
        return static_cast<uint32_t>(red) << 16 |
            static_cast<uint32_t>(green) << 8 |
            blue;
    }

    // ------------------------------------------------------------------------
    // Ecrit une couleur RGB888 dans un index physique valide.
    //
    // Parametres :
    // - index : index compris entre zero et 511.
    // - color : couleur RGB888 compacte.
    // ------------------------------------------------------------------------
    void setPixelColor(uint16_t index, uint32_t color) {
        if(index >= 512)
            return;
        hostFramebuffer[index] = Color(
            color >> 16,
            color >> 8,
            color);
    }
};

// Pilote simule visible par la VM incluse.
static HostStrip strip;

// ----------------------------------------------------------------------------
// Retourne l'horodatage controle par le banc d'essai.
//
// Retour :
// - compteur de millisecondes courant.
// ----------------------------------------------------------------------------
uint32_t millis(void) {
    return hostMillis;
}

// ----------------------------------------------------------------------------
// Remplit le framebuffer simule avec une couleur uniforme.
//
// Parametres :
// - color : couleur appliquee aux 512 voxels.
// ----------------------------------------------------------------------------
void background(Color color) {
    for(uint16_t index = 0; index < 512; index++)
        hostFramebuffer[index] = color;
}

// ----------------------------------------------------------------------------
// Simule la presentation du framebuffer.
//
// Retour :
// - un pour conserver le contrat historique.
// ----------------------------------------------------------------------------
int showPixels(void) {
    hostShowCount++;
    return 1;
}

// ----------------------------------------------------------------------------
// Simule une fenetre de services sans effet externe.
// ----------------------------------------------------------------------------
void animationProcessServices(void) {}

// ----------------------------------------------------------------------------
// Convertit trois coordonnees logiques en index du framebuffer hote.
//
// Parametres :
// - x : colonne candidate.
// - y : hauteur candidate.
// - z : plan candidat.
// - color : couleur a ecrire.
//
// Effet de bord :
// - compte une tentative invalide ou modifie un voxel valide.
// ----------------------------------------------------------------------------
void setPixelColor(int x, int y, int z, Color color) {
    if(x < 0 || x >= 8 || y < 0 || y >= 8 || z < 0 || z >= 8) {
        hostInvalidVoxelWrites++;
        return;
    }
    const uint16_t index = static_cast<uint16_t>(z * 64 + x * 8 + y);
    hostFramebuffer[index] = color;
}

// ----------------------------------------------------------------------------
// Lit une couleur physique du framebuffer hote.
//
// Parametres :
// - index : position candidate.
//
// Retour :
// - couleur stockee ou noir hors plage.
// ----------------------------------------------------------------------------
Color getPixelColor(int index) {
    return index >= 0 && index < 512 ? hostFramebuffer[index] : black;
}

// ----------------------------------------------------------------------------
// Retourne l'index fictif du mode Off.
//
// Parametres :
// - modeId : identifiant demande, ignore par le banc borne.
//
// Retour :
// - zero, index du mode Off simule.
// ----------------------------------------------------------------------------
int getModeIndexFromID(int modeId) {
    (void)modeId;
    return 0;
}

// ----------------------------------------------------------------------------
// Memorise une demande de changement de mode cooperative.
//
// Parametres :
// - modeIndex : index demande par la VM.
// ----------------------------------------------------------------------------
void animationSchedulerRequestModeChange(int modeIndex) {
    hostRequestedModeIndex = modeIndex;
}

// Identifiant du mode Off requis par la gestion de faute.
#define STANDBY 0

#include "../../../src/bytecode/bytecode_format.cpp"
#include "../../../src/bytecode/bytecode_validator.cpp"
#include "../../../src/bytecode/bytecode_diagnostics.cpp"
#include "../../../src/bytecode/bytecode_vm.cpp"

// ----------------------------------------------------------------------------
// Echoue le processus avec un message lorsque la condition est fausse.
//
// Parametres :
// - condition : resultat attendu vrai.
// - message : cause affichee sur la sortie d'erreur.
// ----------------------------------------------------------------------------
static void hostRequire(bool condition, const char* message) {
    if(condition)
        return;
    fprintf(stderr, "%s\n", message);
    exit(1);
}

// ----------------------------------------------------------------------------
// Recalcule le CRC d'un conteneur mutable apres une corruption de test.
//
// Parametres :
// - container : conteneur mutable.
// - containerLength : nombre exact d'octets.
// ----------------------------------------------------------------------------
static void hostRefreshCrc(uint8_t* container, size_t containerLength) {
    const uint16_t crc = bytecodeCalculateCrc(container, containerLength);
    container[BYTECODE_CRC_OFFSET] = static_cast<uint8_t>(crc);
    container[BYTECODE_CRC_OFFSET + 1] = static_cast<uint8_t>(crc >> 8);
}

// ----------------------------------------------------------------------------
// Construit un conteneur minimal depuis un payload fourni.
//
// Parametres :
// - destination : buffer d'au moins 197 octets.
// - payload : instructions a copier.
// - payloadLength : longueur comprise entre un et 185.
// - capabilities : capacites annoncees.
//
// Retour :
// - longueur totale du conteneur.
// ----------------------------------------------------------------------------
static size_t hostBuildContainer(
    uint8_t* destination,
    const uint8_t* payload,
    uint8_t payloadLength,
    uint8_t capabilities = 0) {
    memset(destination, 0, BYTECODE_CONTAINER_MAX_SIZE);
    destination[0] = 0x4C;
    destination[1] = 0x33;
    destination[2] = 0x44;
    destination[BYTECODE_FORMAT_VERSION_OFFSET] = BYTECODE_FORMAT_VERSION;
    destination[BYTECODE_VM_VERSION_OFFSET] = BYTECODE_VM_VERSION;
    destination[BYTECODE_CAPABILITIES_OFFSET] = capabilities;
    destination[BYTECODE_PAYLOAD_LENGTH_OFFSET] = payloadLength;
    memcpy(destination + BYTECODE_HEADER_SIZE, payload, payloadLength);
    const size_t containerLength = BYTECODE_HEADER_SIZE + payloadLength;
    hostRefreshCrc(destination, containerLength);
    return containerLength;
}

// ----------------------------------------------------------------------------
// Reinitialise uniquement les doubles materiels entre deux scenarios.
// ----------------------------------------------------------------------------
static void hostResetStubs(void) {
    background(black);
    hostMillis = 0;
    hostShowCount = 0;
    hostInvalidVoxelWrites = 0;
    hostRequestedModeIndex = -1;
}

// ----------------------------------------------------------------------------
// Controle le validateur avec opcode inconnu et saut hors frontiere.
// ----------------------------------------------------------------------------
static void hostTestValidationFaults(void) {
    uint8_t container[BYTECODE_CONTAINER_MAX_SIZE] = {};
    memcpy(container, BYTECODE_DEFAULT_PROGRAM, sizeof(BYTECODE_DEFAULT_PROGRAM));
    container[BYTECODE_HEADER_SIZE] = 0xFF;
    hostRefreshCrc(container, sizeof(BYTECODE_DEFAULT_PROGRAM));
    hostRequire(
        bytecodeValidateContainer(container, sizeof(BYTECODE_DEFAULT_PROGRAM), NULL) ==
            BYTECODE_ERROR_INSTRUCTION,
        "Opcode inconnu non refuse");

    const uint8_t jumpPayload[] = {
        BYTECODE_OPCODE_JUMP, 0x01,
        BYTECODE_OPCODE_SET_U8, 0x00, 0x01,
        BYTECODE_OPCODE_HALT
    };
    const size_t jumpLength = hostBuildContainer(
        container,
        jumpPayload,
        sizeof(jumpPayload));
    hostRequire(
        bytecodeValidateContainer(container, jumpLength, NULL) ==
            BYTECODE_ERROR_JUMP,
        "Saut vers un operande non refuse");
}

// ----------------------------------------------------------------------------
// Controle l'execution deterministe de la Sphere embarquee.
// ----------------------------------------------------------------------------
static void hostTestSphereExecution(void) {
    hostResetStubs();
    hostRequire(bytecodeEnter() == BYTECODE_SUCCESS,
        "Entree Sphere invalide");
    bytecodeTick();

    BytecodeDiagnosticsSnapshot diagnostics = {};
    hostRequire(bytecodeDiagnosticsRead(&diagnostics),
        "Diagnostics Sphere illisibles");
    hostRequire(diagnostics.shownFrames == 1,
        "Premiere frame Sphere absente");
    hostRequire(bytecodeStorage.registers[0] == 3 &&
                bytecodeStorage.registers[1] == 3 &&
                bytecodeStorage.registers[2] == 3,
        "Rebond Sphere different de TypeScript");
    hostRequire(bytecodeStorage.registers[6] == 3,
        "Phase couleur Sphere differente de TypeScript");
    hostRequire(hostInvalidVoxelWrites == 0,
        "Sphere a tente une ecriture hors cube");

    hostMillis = 49;
    bytecodeTick();
    hostRequire(bytecodeStorage.waiting,
        "WAIT Sphere non active");
    hostMillis = 98;
    bytecodeTick();
    bytecodeDiagnosticsRead(&diagnostics);
    hostRequire(diagnostics.shownFrames == 1,
        "WAIT Sphere a repris trop tot");
    bytecodeExit();
}

// ----------------------------------------------------------------------------
// Reproduit une etape du generateur xorshift32 contractuel.
//
// Parametres :
// - state : etat pseudo-aleatoire courant.
//
// Retour :
// - etat suivant, identique a celui de la VM TypeScript.
// ----------------------------------------------------------------------------
static uint32_t hostNextRandomState(uint32_t state) {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return state;
}

// ----------------------------------------------------------------------------
// Controle les tirages deterministes avec la graine partagee TypeScript/C++.
// ----------------------------------------------------------------------------
static void hostTestDeterministicRandom(void) {
    const uint8_t payload[] = {
        BYTECODE_OPCODE_RANDOM_U8, 0x00, 0x00, 0xFF,
        BYTECODE_OPCODE_RANDOM_U8, 0x01, 0x03, 0x07,
        BYTECODE_OPCODE_HALT
    };
    uint8_t container[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t containerLength = hostBuildContainer(
        container,
        payload,
        sizeof(payload));
    hostRequire(
        bytecodeSelectTransientProgram(container, containerLength) == BYTECODE_SUCCESS,
        "Programme aleatoire refuse avant runtime");
    hostResetStubs();
    hostRequire(bytecodeEnter() == BYTECODE_SUCCESS,
        "Entree du programme aleatoire invalide");
    bytecodeTick();

    uint32_t expectedState = hostNextRandomState(BYTECODE_RANDOM_SEED);
    const int16_t firstValue = static_cast<int16_t>(expectedState % 256);
    expectedState = hostNextRandomState(expectedState);
    const int16_t secondValue = static_cast<int16_t>(3 + expectedState % 5);
    hostRequire(bytecodeStorage.registers[0] == firstValue &&
                bytecodeStorage.registers[1] == secondValue,
        "Tirages aleatoires differents de TypeScript");
    bytecodeExit();
}

// ----------------------------------------------------------------------------
// Controle la faute de coordonnee sans ecriture hors framebuffer.
// ----------------------------------------------------------------------------
static void hostTestCoordinateFault(void) {
    const uint8_t payload[] = {
        BYTECODE_OPCODE_SET_I8, 0x00, 0xFF,
        BYTECODE_OPCODE_VOXEL, 0x00, 0x00
    };
    uint8_t container[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t containerLength = hostBuildContainer(
        container,
        payload,
        sizeof(payload));
    hostRequire(
        bytecodeSelectTransientProgram(container, containerLength) == BYTECODE_SUCCESS,
        "Programme de faute refuse avant runtime");
    hostResetStubs();
    hostRequire(bytecodeEnter() == BYTECODE_SUCCESS,
        "Entree du programme de faute invalide");
    bytecodeTick();

    BytecodeDiagnosticsSnapshot diagnostics = {};
    bytecodeDiagnosticsRead(&diagnostics);
    hostRequire(diagnostics.lastError == BYTECODE_ERROR_COORDINATE,
        "Faute de coordonnee non memorisee");
    hostRequire(hostInvalidVoxelWrites == 0,
        "Faute de coordonnee ecrite hors framebuffer");
    hostRequire(hostRequestedModeIndex == 0,
        "Faute runtime sans demande vers Off");
}

// ----------------------------------------------------------------------------
// Controle l'arret d'une boucle sans frontiere apres 256 instructions.
// ----------------------------------------------------------------------------
static void hostTestQuotaFault(void) {
    const uint8_t payload[] = {BYTECODE_OPCODE_JUMP, 0xFE};
    uint8_t container[BYTECODE_CONTAINER_MAX_SIZE] = {};
    const size_t containerLength = hostBuildContainer(
        container,
        payload,
        sizeof(payload));
    hostRequire(
        bytecodeSelectTransientProgram(container, containerLength) == BYTECODE_SUCCESS,
        "Boucle de quota invalide avant runtime");
    hostResetStubs();
    hostRequire(bytecodeEnter() == BYTECODE_SUCCESS,
        "Entree de la boucle de quota invalide");
    for(uint8_t slice = 0; slice < 5 && bytecodeStorage.active; slice++)
        bytecodeTick();

    BytecodeDiagnosticsSnapshot diagnostics = {};
    bytecodeDiagnosticsRead(&diagnostics);
    hostRequire(diagnostics.lastError == BYTECODE_ERROR_QUOTA,
        "Quota cooperatif non applique");
    hostRequire(diagnostics.executedInstructions == 257,
        "Quota declenche a une instruction differente de TypeScript");
}

// ----------------------------------------------------------------------------
// Execute tous les scenarios natifs et retourne zero en cas de succes.
// ----------------------------------------------------------------------------
int main(void) {
    hostTestValidationFaults();
    hostTestSphereExecution();
    hostTestDeterministicRandom();
    hostTestCoordinateFault();
    hostTestQuotaFault();
    return 0;
}
