// ============================================================================
// Text - Declaration du rendu de texte sans copie dynamique
// ----------------------------------------------------------------------------
// Ce fichier expose les variantes Text et les primitives partagées par Clock,
// IFTTT et CubeGreeting. La réception Cloud reste dans le parseur dédié.
// ============================================================================

#pragma once

// ----------------------------------------------------------------------------
// Sélectionne la variante Text et prépare ses couleurs.
// ----------------------------------------------------------------------------
void showText(uint32_t color1, uint32_t color2);

// ----------------------------------------------------------------------------
// Dessine une frame de texte défilant sur un plan du cube.
// ----------------------------------------------------------------------------
void textScroll(uint32_t color1, uint32_t color2);

// ----------------------------------------------------------------------------
// Dessine une frame de texte circulant autour des faces du cube.
// ----------------------------------------------------------------------------
void textMarquee(uint32_t color1, uint32_t color2);

// ----------------------------------------------------------------------------
// Dessine un caractère non tourné depuis la fonte 8×8.
// ----------------------------------------------------------------------------
void showChar(char character, Point position, Color color);

// ----------------------------------------------------------------------------
// Dessine un caractère tourné autour du pivot horizontal historique.
// ----------------------------------------------------------------------------
void showChar(char character, Point origin, Point angle, Color color);

// ----------------------------------------------------------------------------
// Dessine un caractère tourné autour d'un pivot explicite.
// ----------------------------------------------------------------------------
void showChar(char character, Point origin, Point pivot, Point angle, Color color);

// ----------------------------------------------------------------------------
// Dessine un texte C borné sur un plan avec un espacement de huit voxels.
// ----------------------------------------------------------------------------
void scrollText(const char* text, Point initialPosition, Color color);

// ----------------------------------------------------------------------------
// Dessine un texte C borné autour des faces du cube.
// ----------------------------------------------------------------------------
void marquee(const char* text, float position, Color color);

// ----------------------------------------------------------------------------
// Dessine un caractère aux quatre segments successifs du chapiteau cubique.
// ----------------------------------------------------------------------------
void showMarqueeChar(char character, int position, Color color);
