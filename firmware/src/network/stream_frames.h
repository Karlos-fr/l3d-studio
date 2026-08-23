// ============================================================================
// StreamFrames - Declaration du recepteur de frames web RGB332
// ----------------------------------------------------------------------------
// Ce module applique une frame binaire complete au framebuffer logique du cube.
// Il ne possede ni socket, ni file d'attente, ni allocation dynamique.
// ============================================================================

#pragma once

#include <stddef.h>
#include <stdint.h>

// ----------------------------------------------------------------------------
// Applique une frame RGB332 recue integralement par le serveur LAN.
//
// Parametres :
// - frame : 512 octets ranges selon z, puis y, puis x.
// - frameLength : longueur exacte du corps recu.
// - holdFrame : vrai pour conserver l'image sans timeout en mode peinture.
//
// Retour :
// - zero en cas de succes ou code LOCAL_API_ERROR en cas de refus.
//
// Effet de bord :
// - remplace le framebuffer logique, choisit la politique de timeout et
//   declenche un unique showPixels().
// ----------------------------------------------------------------------------
int streamApplyFrame(
    const uint8_t* frame,
    size_t frameLength,
    bool holdFrame);

// ----------------------------------------------------------------------------
// Indique si la frame Stream courante provient du peintre.
//
// Retour :
// - vrai pour une frame maintenue, faux pour un flux anime ou hors Stream.
// ----------------------------------------------------------------------------
bool streamFrameIsHeld(void);

// ----------------------------------------------------------------------------
// Initialise le delai de securite lors de l'entree dans le mode Stream.
//
// Effet de bord :
// - efface le cube et arme le timeout de reception.
// ----------------------------------------------------------------------------
void streamEnter(void);

// ----------------------------------------------------------------------------
// Efface le cube lors de la sortie du mode Stream.
//
// Effet de bord :
// - rend immediatement un framebuffer noir.
// ----------------------------------------------------------------------------
void streamExit(void);

// ----------------------------------------------------------------------------
// Maintient le mode Stream non bloquant et applique son timeout.
//
// Effet de bord :
// - bascule vers Off lorsqu'aucune frame n'arrive pendant la duree bornee.
// ----------------------------------------------------------------------------
void streamTick(void);
