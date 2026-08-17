// ============================================================================
// Clock - Declaration des horloges texte et tridimensionnelle
// ----------------------------------------------------------------------------
// Ce fichier expose la sélection Clock et le rendu de ses chiffres. Les
// primitives de chaînes restent déclarées par le module Text.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Lit l'heure courante puis sélectionne le rendu texte ou 3D.
// ----------------------------------------------------------------------------
void showClock();

// ----------------------------------------------------------------------------
// Formate et affiche l'heure sous forme de texte animé.
// ----------------------------------------------------------------------------
void textClock();

// ----------------------------------------------------------------------------
// Dessine l'heure sous forme de trois nombres répartis dans le cube.
// ----------------------------------------------------------------------------
void threeDClock();

// ----------------------------------------------------------------------------
// Dessine les deux chiffres d'un nombre avec les glyphes compacts en Flash.
//
// Parametres :
// - number : nombre de zéro à 99 à séparer en deux chiffres.
// - drow : décalage vertical historique.
// - dplane : plan Z de destination.
// - numcolor : couleur RGB des chiffres.
// ----------------------------------------------------------------------------
void display_digits(int number, int drow, int dplane, Color numcolor);
