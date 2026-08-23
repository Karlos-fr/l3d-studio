// ============================================================================
// BytecodeVm - Declaration de l'etat fixe et du cycle de la VM L3D
// ----------------------------------------------------------------------------
// Ce module decrit l'etat place dans le scratch partage et les operations du
// mode non persistant. Il ne connait ni EEPROM ni protocole LAN.
// ============================================================================

#pragma once

#include "bytecode_diagnostics.h"
#include "bytecode_storage.h"
#include "bytecode_validator.h"

#if L3D_BYTECODE_ENABLED

// Particule Q4.4 compacte et preallouee.
struct BytecodeParticle {
    int16_t x;
    int16_t y;
    int16_t z;
    int8_t vx;
    int8_t vy;
    int8_t vz;
    uint8_t life;
    uint8_t red;
    uint8_t green;
    uint8_t blue;
    bool active;
};

// Etat complet reutilise uniquement lorsque le mode bytecode est actif.
struct BytecodeVmStorage {
    uint8_t container[BYTECODE_CONTAINER_MAX_SIZE];
    int16_t registers[BYTECODE_REGISTER_COUNT];
    BytecodeParticle particles[BYTECODE_PARTICLE_LIMIT];
    uint32_t randomState;
    uint32_t waitDeadline;
    uint16_t instructionsWithoutBoundary;
    uint8_t containerLength;
    uint8_t payloadLength;
    uint8_t programCounter;
    uint8_t currentRed;
    uint8_t currentGreen;
    uint8_t currentBlue;
    uint8_t particleCount;
    int8_t particleGravity;
    uint8_t particleDrag;
    uint8_t particleLife;
    bool active;
    bool waiting;
    bool halted;
};

static_assert(sizeof(BytecodeParticle) <= 16,
    "Une particule bytecode doit rester compacte");
static_assert(sizeof(BytecodeVmStorage) <= 1536,
    "La VM bytecode doit tenir dans le scratch partage");

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
    size_t containerLength);

// ----------------------------------------------------------------------------
// Charge puis initialise le programme persistant ou transitoire selectionne.
//
// Retour :
// - zero en cas de succes, sinon un code d'erreur public negatif.
// ----------------------------------------------------------------------------
int16_t bytecodeEnter(void);

// ----------------------------------------------------------------------------
// Efface completement l'etat VM lors de la sortie du mode.
// ----------------------------------------------------------------------------
void bytecodeExit(void);

// ----------------------------------------------------------------------------
// Execute une tranche cooperative du programme actif.
// ----------------------------------------------------------------------------
void bytecodeTick(void);

#endif
