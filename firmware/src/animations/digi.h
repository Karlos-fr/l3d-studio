// ============================================================================
// Digi - Déclaration du remplissage aléatoire du cube
// ----------------------------------------------------------------------------
// Ce fichier expose le cycle Digi et son remplissage interruptible. Le tableau
// d'ordre appartient au scratch partagé du firmware.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Remplit puis efface le cube selon les switches Digi.
//
// Parametres :
// - color : couleur fixe utilisée lorsque le balayage est désactivé.
// ----------------------------------------------------------------------------
void digi(uint32_t color);

// ----------------------------------------------------------------------------
// Remplit les pixels dans un ordre aléatoire avec une couleur donnée.
//
// Parametres :
// - color : couleur entière appliquée.
//
// Retour :
// - un lorsque le remplissage se termine, zéro lorsqu'il est interrompu.
// ----------------------------------------------------------------------------
int randomPixelFill(uint32_t color);
