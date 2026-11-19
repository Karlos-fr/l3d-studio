// ============================================================================
// EmulatorPgmspace - Acces memoire programme pour le Photon virtuel
// ----------------------------------------------------------------------------
// Sur WebAssembly comme sur le Photon, la memoire programme est adressable
// directement : ces macros se contentent de lire la memoire ordinaire.
// ============================================================================

#pragma once
#include <stdint.h>
#include <string.h>

#define PROGMEM
#define PGM_P const char*
#define PSTR(s) (s)
#define pgm_read_byte(address) (*reinterpret_cast<const uint8_t*>(address))
#define pgm_read_word(address) (*reinterpret_cast<const uint16_t*>(address))
#define pgm_read_dword(address) (*reinterpret_cast<const uint32_t*>(address))
#define pgm_read_float(address) (*reinterpret_cast<const float*>(address))
#define strcpy_P strcpy
#define strlen_P strlen
#define memcpy_P memcpy
