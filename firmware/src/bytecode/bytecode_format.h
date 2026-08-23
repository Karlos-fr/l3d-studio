// ============================================================================
// BytecodeFormat - Declaration du contrat binaire L3D version 1
// ----------------------------------------------------------------------------
// Ce module fixe tailles, opcodes, capacites et erreurs. Il ne valide aucun
// conteneur et ne connait ni le framebuffer, ni l'EEPROM, ni le reseau.
// ============================================================================

#pragma once

#include <stddef.h>
#include <stdint.h>

#include "../config/build_config.h"

#if L3D_BYTECODE_ENABLED

// Taille fixe de l'en-tete persistant version 1.
const uint8_t BYTECODE_HEADER_SIZE = 12;

// Taille maximale d'un conteneur dans une banque transactionnelle.
const uint8_t BYTECODE_CONTAINER_MAX_SIZE = 197;

// Taille maximale du payload d'instructions.
const uint8_t BYTECODE_PAYLOAD_MAX_SIZE = 185;

// Version du format binaire prise en charge.
const uint8_t BYTECODE_FORMAT_VERSION = 1;

// Version de la VM embarquee.
const uint8_t BYTECODE_VM_VERSION = 1;

// Nombre fixe de registres signes sur seize bits.
const uint8_t BYTECODE_REGISTER_COUNT = 16;

// Nombre maximal d'instructions executees par passage du firmware.
const uint8_t BYTECODE_SLICE_INSTRUCTION_LIMIT = 64;

// Nombre maximal d'instructions sans frontiere cooperative explicite.
const uint16_t BYTECODE_COOPERATIVE_INSTRUCTION_LIMIT = 256;

// Nombre maximal de particules actives.
const uint8_t BYTECODE_PARTICLE_LIMIT = 32;

// Masque de toutes les capacites connues par la version 1.
const uint8_t BYTECODE_KNOWN_CAPABILITIES = 0x07;

// Valeur de succes commune aux operations bytecode.
const int16_t BYTECODE_SUCCESS = 0;

// Offsets stables des champs de l'en-tete.
enum BytecodeHeaderOffset : uint8_t {
    BYTECODE_FORMAT_VERSION_OFFSET = 3,
    BYTECODE_VM_VERSION_OFFSET = 4,
    BYTECODE_CAPABILITIES_OFFSET = 5,
    BYTECODE_GENERATION_OFFSET = 6,
    BYTECODE_PAYLOAD_LENGTH_OFFSET = 7,
    BYTECODE_ENTRY_POINT_OFFSET = 8,
    BYTECODE_FLAGS_OFFSET = 9,
    BYTECODE_CRC_OFFSET = 10
};

// Capacites optionnelles annoncees par le conteneur.
enum BytecodeCapability : uint8_t {
    BYTECODE_CAPABILITY_GEOMETRY = 0x01,
    BYTECODE_CAPABILITY_PARTICLES = 0x02,
    BYTECODE_CAPABILITY_MATH8 = 0x04
};

// Opcodes stables de la VM version 1.
enum BytecodeOpcode : uint8_t {
    BYTECODE_OPCODE_HALT = 0x00,
    BYTECODE_OPCODE_CLEAR = 0x01,
    BYTECODE_OPCODE_SHOW = 0x02,
    BYTECODE_OPCODE_YIELD = 0x03,
    BYTECODE_OPCODE_FADE = 0x04,
    BYTECODE_OPCODE_SET_I8 = 0x10,
    BYTECODE_OPCODE_SET_U8 = 0x11,
    BYTECODE_OPCODE_COPY = 0x12,
    BYTECODE_OPCODE_ADD_I8 = 0x13,
    BYTECODE_OPCODE_ADD_REG = 0x14,
    BYTECODE_OPCODE_SUB_REG = 0x15,
    BYTECODE_OPCODE_SIN8 = 0x16,
    BYTECODE_OPCODE_RANDOM_U8 = 0x17,
    BYTECODE_OPCODE_COLOR_RGB = 0x20,
    BYTECODE_OPCODE_COLOR_WHEEL = 0x21,
    BYTECODE_OPCODE_COLOR_REGISTERS = 0x22,
    BYTECODE_OPCODE_VOXEL = 0x30,
    BYTECODE_OPCODE_SPHERE = 0x31,
    BYTECODE_OPCODE_BOUNCE = 0x32,
    BYTECODE_OPCODE_PARTICLE_CONFIGURE = 0x38,
    BYTECODE_OPCODE_PARTICLE_EMIT = 0x39,
    BYTECODE_OPCODE_PARTICLE_STEP = 0x3A,
    BYTECODE_OPCODE_JUMP = 0x40,
    BYTECODE_OPCODE_JUMP_IF_LESS = 0x41,
    BYTECODE_OPCODE_WAIT = 0x50
};

// Codes d'erreur publics partages avec l'application.
enum BytecodeErrorCode : int16_t {
    BYTECODE_ERROR_CONTAINER = -300,
    BYTECODE_ERROR_FORMAT_VERSION = -301,
    BYTECODE_ERROR_VM_VERSION = -302,
    BYTECODE_ERROR_LENGTH = -303,
    BYTECODE_ERROR_CRC = -304,
    BYTECODE_ERROR_CAPABILITY = -305,
    BYTECODE_ERROR_INSTRUCTION = -306,
    BYTECODE_ERROR_JUMP = -307,
    BYTECODE_ERROR_ENTRY_POINT = -308,
    BYTECODE_ERROR_REGISTER = -309,
    BYTECODE_ERROR_COORDINATE = -310,
    BYTECODE_ERROR_VALUE = -311,
    BYTECODE_ERROR_QUOTA = -312,
    BYTECODE_ERROR_PARTICLE_LIMIT = -313,
    BYTECODE_ERROR_NO_PROGRAM = -314,
    BYTECODE_ERROR_STATE = -315,
    BYTECODE_ERROR_STORAGE = -316
};

// ----------------------------------------------------------------------------
// Retourne la taille binaire exacte d'un opcode version 1.
//
// Parametres :
// - opcode : octet d'operation a reconnaitre.
//
// Retour :
// - taille totale de l'instruction, ou zero pour un opcode inconnu.
// ----------------------------------------------------------------------------
uint8_t bytecodeInstructionSize(uint8_t opcode);

// ----------------------------------------------------------------------------
// Retourne la capacite optionnelle exigee par un opcode.
//
// Parametres :
// - opcode : operation version 1 deja reconnue.
//
// Retour :
// - bit de capacite, ou zero pour le coeur de la VM.
// ----------------------------------------------------------------------------
uint8_t bytecodeRequiredCapability(uint8_t opcode);

#endif
