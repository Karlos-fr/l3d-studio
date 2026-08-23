// ============================================================================
// RuntimeDiagnostics - Declaration des diagnostics runtime bornes
// ----------------------------------------------------------------------------
// Ce module expose les mesures sans connaitre Particle, HTTP ou le stockage des
// reponses. Le buffer de destination appartient toujours a l'appelant.
// ============================================================================

#pragma once

#if L3D_DIAGNOSTICS_ENABLED

// Initialise la cause de reset et le handler memoire avant le setup principal.
void diagnosticsSetupEarly(void);

// Capture la memoire disponible apres le setup pour le mode fourni.
void diagnosticsSetupComplete(int modeId);

// Capture la memoire et l'heure au debut d'une frame du mode fourni.
void diagnosticsBeginFrame(int modeId);

// Termine la mesure de la frame courante et actualise ses agregats.
void diagnosticsEndFrame(void);

// Reinitialise les statistiques propres au nouveau mode fourni.
void diagnosticsModeChanged(int modeId);

// Ecrit un instantane versionne dans un buffer fourni et retourne sa longueur.
int diagnosticsWriteSnapshot(
    char* destination,
    size_t capacity,
    bool resetRequested,
    int32_t sequence);

#else

inline void diagnosticsSetupEarly(void) {}
inline void diagnosticsSetupComplete(int) {}
inline void diagnosticsBeginFrame(int) {}
inline void diagnosticsEndFrame(void) {}
inline void diagnosticsModeChanged(int) {}
inline int diagnosticsWriteSnapshot(char*, size_t, bool, int32_t) { return -1; }

#endif
