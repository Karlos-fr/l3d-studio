// ============================================================================
// FftJoyLegacy - Declaration du spectre CubeTube original
// ----------------------------------------------------------------------------
// Ce fichier expose le port compact de FFTJoy. Il ne remplace pas Spectrum ni
// FftMeteorsRainbow et conserve sa palette et son echantillonnage historiques.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Reinitialise le maximum adaptatif de FftJoyLegacy.
//
// Effet de bord :
// - garantit un diviseur audio initial non nul.
// ----------------------------------------------------------------------------
void resetFftJoyLegacy();

// ----------------------------------------------------------------------------
// Capture et affiche une frame du FFTJoy CubeTube original.
//
// Effet de bord :
// - utilise le scratch FFT, modifie le framebuffer et affiche les pixels.
// ----------------------------------------------------------------------------
void runFftJoyLegacy();
