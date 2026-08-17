// ============================================================================
// CubeGreeting - Déclaration des messages de démonstration internes
// ----------------------------------------------------------------------------
// Ce fichier expose uniquement le rendu d'une frame de bienvenue. Il ne porte
// ni état de démonstration ni primitive de texte.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Prépare et affiche une frame de la séquence de bienvenue.
//
// Parametres :
// - textMode : message ou style historique à afficher.
// - frameCount : index de la frame courante.
// - pos : position de défilement du texte.
//
// Effet de bord :
// - remplace le buffer `message` par une copie bornée et affiche les LEDs.
// ----------------------------------------------------------------------------
void cubeGreeting(int textMode, int frameCount, float pos);
