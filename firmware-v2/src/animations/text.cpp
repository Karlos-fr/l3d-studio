// ============================================================================
// Text - Implementation du rendu de texte sans copie dynamique
// ----------------------------------------------------------------------------
// Ce fichier rend les buffers C bornes de Text, Clock, IFTTT et CubeGreeting.
// Il ne gere ni la reception Cloud du texte ni sa persistance EEPROM.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Sélectionne la variante Text et prépare ses couleurs de premier plan et fond.
//
// Parametres :
// - color1 : couleur historique du texte.
// - color2 : couleur historique du fond.
//
// Effet de bord :
// - actualise éventuellement le fond cyclique puis exécute une frame de texte.
// ----------------------------------------------------------------------------
void showText(uint32_t color1, uint32_t color2) {
  uint32_t foregroundColor = color1;
  uint32_t backgroundColor = color2;

  if (switch4) {
    if (currentBg == nextBg) {
      nextBg = rand() % 256;
    } else if (nextBg > currentBg) {
      currentBg++;
    } else {
      currentBg--;
    }

    foregroundColor = Wheel(currentBg);
    // Complément RGB utilisé comme fond pendant le balayage historique.
    const Color complementColor = complement(getColorFromInteger(foregroundColor));
    backgroundColor = strip.Color(
      complementColor.red,
      complementColor.green,
      complementColor.blue
    );
  }

  switch (whichTextMode) {
    case 0:
      textMarquee(foregroundColor, backgroundColor);
      break;
    case 1:
      textScroll(foregroundColor, backgroundColor);
      break;
  }
}

// ----------------------------------------------------------------------------
// Dessine une frame de texte défilant sur un plan du cube.
//
// Parametres :
// - color1 : couleur du texte.
// - color2 : couleur du fond.
//
// Effet de bord :
// - dessine, affiche la frame et avance la position partagée du texte.
// ----------------------------------------------------------------------------
void textScroll(uint32_t color1, uint32_t color2) {
  run = TRUE;
  thickness = switch1;
  if (switch2) {
    color2 = 0;
  }
  if (switch3) {
    color1 = 0;
  }

  if (switch3) {
    background(fadeColor(getColorFromInteger(color2), 0.5));
  } else {
    background(fadeColor(getColorFromInteger(color2), 0.25));
  }

  // Longueur bornée du message, calculée une seule fois pour cette frame.
  const size_t messageLength = strlen(message);
  scrollText(
    message,
    Point(pos - messageLength, 0, 6),
    getColorFromInteger(color1)
  );
  showPixels();
  if (stop) {
    return;
  }

  // Rapport historique entre la vitesse utilisateur et le pas de défilement.
  const float ratio = (.5 - .05) / ((120 * .05) - .05);
  // Pas fractionnaire historique de la position courante.
  const float speedFactor =
    .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
  pos += speedFactor;
  if (
    pos >=
    (SIDE * map(messageLength, 1, 63, 1, SIDE)) + messageLength * 8
  ) {
    pos = map(messageLength, 1, 63, static_cast<int>(-(SIDE * .5)), 0);
  }
}

// ----------------------------------------------------------------------------
// Dessine une frame de texte circulant autour des faces du cube.
//
// Parametres :
// - color1 : couleur du texte.
// - color2 : couleur du fond.
//
// Effet de bord :
// - dessine, affiche la frame et avance la position partagée du texte.
// ----------------------------------------------------------------------------
void textMarquee(uint32_t color1, uint32_t color2) {
  run = TRUE;
  thickness = switch1;
  if (switch2) {
    color2 = 0;
  }
  if (switch3) {
    color1 = 0;
  }

  if (switch3) {
    background(fadeColor(getColorFromInteger(color2), 0.5));
  } else {
    background(fadeColor(getColorFromInteger(color2), 0.25));
  }

  // Longueur bornée du message, calculée une seule fois pour cette frame.
  const size_t messageLength = strlen(message);
  marquee(message, pos, getColorFromInteger(color1));
  showPixels();
  if (stop) {
    return;
  }

  // Rapport historique entre la vitesse utilisateur et le pas de défilement.
  const float ratio = (.5 - .05) / ((120 * .05) - .05);
  // Pas fractionnaire historique de la position courante.
  const float speedFactor =
    .05 + ratio * ((map(speed, 1, 120, 120, 1) * .05) - .05);
  pos += speedFactor;
  if (
    pos >=
    (SIDE * map(messageLength, 1, 63, 4, SIDE)) + messageLength * 8
  ) {
    pos = map(messageLength, 1, 63, static_cast<int>(-(SIDE * .5)), 0);
  }
}

// ----------------------------------------------------------------------------
// Dessine un caractère non tourné depuis la fonte 8×8.
//
// Parametres :
// - character : code du caractère à dessiner.
// - position : origine logique du caractère.
// - color : couleur RGB du caractère.
//
// Effet de bord :
// - écrit les voxels actifs de la fonte dans le framebuffer.
// ----------------------------------------------------------------------------
void showChar(char character, Point position, Color color) {
  for (int row = 0; row < SIDE; row++) {
    for (int bit = 0; bit < 8; bit++) {
      if (((fontTable[static_cast<int>(character) * 8 + row] >> (7 - bit)) & 0x01) == 1) {
        for (int depth = 0; depth < thickness + 1; depth++) {
          setPixelColor(
            position.x + bit,
            position.y + (SIDE - 1 - row),
            position.z - depth,
            color
          );
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Dessine un caractère tourné autour du pivot horizontal historique.
//
// Parametres :
// - character : code du caractère à dessiner.
// - origin : origine logique de la rotation.
// - angle : angles de rotation sur les axes X et Y.
// - color : couleur RGB du caractère.
//
// Effet de bord :
// - délègue au rendu tourné avec le pivot historique.
// ----------------------------------------------------------------------------
void showChar(char character, Point origin, Point angle, Color color) {
  showChar(
    character,
    origin,
    Point(ceil((SIDE - 1) * .5), 0, 0),
    angle,
    color
  );
}

// ----------------------------------------------------------------------------
// Dessine un caractère tourné autour d'un pivot explicite.
//
// Parametres :
// - character : code du caractère à dessiner.
// - origin : origine logique de la rotation.
// - pivot : pivot local du caractère.
// - angle : angles de rotation sur les axes X et Y.
// - color : couleur RGB du caractère.
//
// Effet de bord :
// - calcule puis écrit chaque voxel actif et chaque niveau d'épaisseur.
// ----------------------------------------------------------------------------
void showChar(char character, Point origin, Point pivot, Point angle, Color color) {
  for (int row = 0; row < SIDE; row++) {
    for (int bit = 0; bit < 8; bit++) {
      if (
        ((fontTable[static_cast<int>(character) * 8 + (7 - row)] >> (7 - bit)) & 0x01) == 1
      ) {
        for (int depth = 0; depth < thickness + 1; depth++) {
          setPixelColor(
            origin.x + (static_cast<float>(bit) - pivot.x) * cos(angle.y) - depth,
            origin.y + (static_cast<float>(row) - pivot.y) * cos(angle.x),
            origin.z + (static_cast<float>(row) - pivot.y) * sin(angle.x) +
              (static_cast<float>(bit) - pivot.y) * sin(angle.y) - depth,
            color
          );
        }
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Dessine un texte C borné sur un plan avec un espacement de huit voxels.
//
// Parametres :
// - text : chaîne C terminée fournie par un buffer firmware borné.
// - initialPosition : origine logique du défilement.
// - color : couleur RGB du texte.
//
// Effet de bord :
// - écrit chaque caractère dans le framebuffer sans allocation dynamique.
// ----------------------------------------------------------------------------
void scrollText(const char* text, Point initialPosition, Color color) {
  // Longueur calculée une seule fois pour borner la boucle de caractères.
  const size_t textLength = strlen(text);
  for (size_t index = 0; index < textLength; index++) {
    showChar(
      text[index],
      Point(SIDE * index - initialPosition.x, initialPosition.y, initialPosition.z),
      color
    );
  }
}

// ----------------------------------------------------------------------------
// Dessine un texte C borné autour des faces du cube.
//
// Parametres :
// - text : chaîne C terminée fournie par un buffer firmware borné.
// - position : position fractionnaire du défilement.
// - color : couleur RGB du texte.
//
// Effet de bord :
// - écrit chaque caractère dans le framebuffer sans allocation dynamique.
// ----------------------------------------------------------------------------
void marquee(const char* text, float position, Color color) {
  // Longueur calculée une seule fois pour borner la boucle de caractères.
  const size_t textLength = strlen(text);
  for (size_t index = 0; index < textLength; index++) {
    showMarqueeChar(
      text[index],
      static_cast<int>(position) - SIDE * static_cast<int>(index),
      color
    );
  }
}

// ----------------------------------------------------------------------------
// Dessine un caractère aux quatre segments successifs du chapiteau cubique.
//
// Parametres :
// - character : code du caractère à dessiner.
// - position : position entière autour des faces.
// - color : couleur RGB du caractère.
//
// Effet de bord :
// - écrit les voxels visibles du caractère dans le framebuffer.
// ----------------------------------------------------------------------------
void showMarqueeChar(char character, int position, Color color) {
  for (int row = 0; row < SIDE; row++) {
    for (int bit = 0; bit < 8; bit++) {
      if (((fontTable[static_cast<int>(character) * 8 + row] >> (7 - bit)) & 0x01) == 1) {
        for (int depth = 0; depth < thickness + 1; depth++) {
          if ((position - bit) < SIDE) {
            setPixelColor(SIDE - 1 - depth, SIDE - 1 - row, position - bit, color);
          }
          if ((position - bit) >= SIDE && (position - bit) < 2 * SIDE) {
            setPixelColor(
              (SIDE - 1 - depth) - (position - bit - SIDE - depth),
              SIDE - 1 - row,
              SIDE - 1 - depth,
              color
            );
          }
          if ((position - bit) >= 2 * SIDE && (position - bit) < 3 * SIDE) {
            setPixelColor(
              depth,
              SIDE - 1 - row,
              SIDE - 1 - (position - bit - 2 * SIDE),
              color
            );
          }
          if ((position - bit) > 3 * SIDE) {
            setPixelColor(position - bit - 3 * SIDE, SIDE - 1 - row, depth, color);
          }
        }
      }
    }
  }
}

#endif
