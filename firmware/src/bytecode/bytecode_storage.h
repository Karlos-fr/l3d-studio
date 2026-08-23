// ============================================================================
// BytecodeStorage - Declaration du stockage transactionnel EEPROM L3D
// ----------------------------------------------------------------------------
// Ce module expose une animation logique sur deux banques physiques fixes. Il
// ne connait ni HTTP, ni le mode courant, ni le framebuffer de la VM.
// ============================================================================

#pragma once

#include "bytecode_validator.h"

#if L3D_BYTECODE_ENABLED

// Version du layout transactionnel reserve a la VM version 1.
const uint8_t BYTECODE_STORAGE_LAYOUT_VERSION = 1;

// Premiere adresse de la banque transactionnelle A.
const uint16_t BYTECODE_STORAGE_BANK_A_ADDRESS = 1652;

// Premiere adresse de la banque transactionnelle B.
const uint16_t BYTECODE_STORAGE_BANK_B_ADDRESS = 1849;

// Nombre d'octets contractuels de chaque banque.
const uint16_t BYTECODE_STORAGE_BANK_SIZE = BYTECODE_CONTAINER_MAX_SIZE;

// Identifiant d'une banque absente ou invalide.
const int8_t BYTECODE_STORAGE_BANK_NONE = -1;

// Identifiant compact de la banque A.
const int8_t BYTECODE_STORAGE_BANK_A = 0;

// Identifiant compact de la banque B.
const int8_t BYTECODE_STORAGE_BANK_B = 1;

// Etat public du programme persistant selectionne.
struct BytecodeStorageStatus {
    bool installed;
    int8_t bank;
    uint8_t layoutVersion;
    uint8_t formatVersion;
    uint8_t minimumVmVersion;
    uint8_t capabilities;
    uint8_t generation;
    uint8_t containerLength;
    uint8_t payloadLength;
    uint16_t crc;
};

// ----------------------------------------------------------------------------
// Inspecte les deux banques et selectionne la generation valide la plus recente.
//
// Parametres :
// - status : destination obligatoire remise a zero avant inspection.
//
// Retour :
// - zero meme sans programme, ou une erreur de stockage.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageInspect(BytecodeStorageStatus* status);

// ----------------------------------------------------------------------------
// Relit le programme persistant selectionne dans un buffer fourni.
//
// Parametres :
// - destination : buffer d'au moins 197 octets.
// - destinationCapacity : capacite exacte accessible.
// - containerLength : destination de la longueur relue.
// - status : destination optionnelle des metadonnees selectionnees.
//
// Retour :
// - zero ou un code d'erreur bytecode negatif.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageRead(
    uint8_t* destination,
    size_t destinationCapacity,
    size_t* containerLength,
    BytecodeStorageStatus* status);

// ----------------------------------------------------------------------------
// Installe un conteneur valide dans la banque inactive.
//
// Parametres :
// - container : buffer mutable contenant exactement le conteneur a installer.
// - containerLength : nombre d'octets accessibles et persistants.
// - status : destination optionnelle de l'etat confirme apres relecture.
//
// Retour :
// - zero ou un code d'erreur bytecode negatif.
//
// Effet de bord :
// - remplace generation et CRC dans le buffer ;
// - ecrit uniquement les octets EEPROM differents et la signature en dernier.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageInstall(
    uint8_t* container,
    size_t containerLength,
    BytecodeStorageStatus* status);

// ----------------------------------------------------------------------------
// Invalide les deux banques sans effacer leurs payloads.
//
// Retour :
// - zero apres invalidation idempotente.
// ----------------------------------------------------------------------------
int16_t bytecodeStorageRemove(void);

#endif
