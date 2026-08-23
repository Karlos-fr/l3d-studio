// ============================================================================
// BytecodeValidator - Declaration de la validation complete L3D
// ----------------------------------------------------------------------------
// Ce module controle un conteneur avant activation. Il ne copie pas le
// programme et n'ecrit ni dans le framebuffer, ni dans l'EEPROM.
// ============================================================================

#pragma once

#include "bytecode_format.h"

#if L3D_BYTECODE_ENABLED

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
    uint8_t* errorOffset);

#endif
