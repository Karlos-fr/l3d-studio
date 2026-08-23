// ============================================================================
// BytecodeDiagnostics - Declaration des compteurs runtime de la VM L3D
// ----------------------------------------------------------------------------
// Ce module memorise seulement de petits compteurs persistants entre deux
// sessions. Il ne formate aucune chaine et ne pilote aucun transport.
// ============================================================================

#pragma once

#include "bytecode_format.h"

#if L3D_BYTECODE_ENABLED

// Instantane compact des diagnostics bytecode.
struct BytecodeDiagnosticsSnapshot {
    uint32_t executedInstructions;
    uint16_t shownFrames;
    int16_t lastError;
    uint8_t lastProgramCounter;
    bool active;
    bool halted;
};

// ----------------------------------------------------------------------------
// Reinitialise les compteurs de session avant une nouvelle activation.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsBegin(void);

// ----------------------------------------------------------------------------
// Enregistre une instruction executee.
//
// Parametres :
// - programCounter : offset de l'instruction executee.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsInstruction(uint8_t programCounter);

// ----------------------------------------------------------------------------
// Enregistre une frame envoyee par SHOW.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsShow(void);

// ----------------------------------------------------------------------------
// Enregistre l'arret normal du programme.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsHalt(void);

// ----------------------------------------------------------------------------
// Enregistre une faute runtime et desactive la session.
//
// Parametres :
// - errorCode : code public negatif de la faute.
// - programCounter : offset de l'instruction fautive.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsFault(int16_t errorCode, uint8_t programCounter);

// ----------------------------------------------------------------------------
// Marque la sortie du mode sans effacer la derniere faute.
// ----------------------------------------------------------------------------
void bytecodeDiagnosticsExit(void);

// ----------------------------------------------------------------------------
// Copie un instantane coherent des compteurs courants.
//
// Parametres :
// - snapshot : destination obligatoire de l'instantane.
//
// Retour :
// - vrai lorsque la destination est valide.
// ----------------------------------------------------------------------------
bool bytecodeDiagnosticsRead(BytecodeDiagnosticsSnapshot* snapshot);

#endif
