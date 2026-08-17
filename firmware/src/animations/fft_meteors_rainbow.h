// ============================================================================
// FftMeteorsRainbow - Declaration du spectre CubeTube lisse
// ----------------------------------------------------------------------------
// Ce fichier expose le port du spectre arc-en-ciel. Il partage la FFT existante
// mais conserve son adaptation de niveau et sa trainee propres.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Reinitialise le niveau adaptatif de FftMeteorsRainbow.
//
// Effet de bord :
// - replace le maximum audio a sa valeur CubeTube initiale.
// ----------------------------------------------------------------------------
void resetFftMeteorsRainbow();

// ----------------------------------------------------------------------------
// Capture et affiche une frame de FftMeteorsRainbow.
//
// Effet de bord :
// - utilise le scratch FFT, modifie le framebuffer et affiche les pixels.
// ----------------------------------------------------------------------------
void runFftMeteorsRainbow();
