// ============================================================================
// KittScanner - Declaration du scanner rouge K2000
// ----------------------------------------------------------------------------
// Ce module expose le cycle de vie du balayage natif. Le rendu materiel reste
// dans son implementation et utilise les primitives communes du cube.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Reinitialise le balayage sur le bord gauche.
//
// Effet de bord :
// - remet la phase, la direction et l'echeance de frame a leur origine.
// ----------------------------------------------------------------------------
void resetKittScanner();

// ----------------------------------------------------------------------------
// Produit une frame du scanner lorsque son echeance est atteinte.
//
// Effet de bord :
// - remplace le framebuffer, affiche les LED et avance le balayage.
// ----------------------------------------------------------------------------
void runKittScanner();
