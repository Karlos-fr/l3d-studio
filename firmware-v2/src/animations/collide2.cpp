// ============================================================================
// Collide2 - Implementation compacte des points en collision
// ----------------------------------------------------------------------------
// Ce fichier anime 72 points sans allocation dynamique. La sphère historique
// conserve volontairement ses calculs flottants pour préserver son rendu.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Tire une direction orthogonale unitaire pour un point Collide2.
//
// Parametres :
// - dot : point dont les trois composantes de direction sont remplacées.
//
// Effet de bord :
// - consomme des tirages rand jusqu'à obtenir exactement un axe non nul.
// ----------------------------------------------------------------------------
void randomizeCollideDirection(CompactCollideDot& dot) {
  int8_t direction[3];
  uint8_t axisCount;
  do {
    direction[0] = rand() % 3 - 1;
    direction[1] = rand() % 3 - 1;
    direction[2] = rand() % 3 - 1;
    axisCount = abs(direction[0]) + abs(direction[1]) + abs(direction[2]);
  } while (axisCount != 1);

  dot.directionX = direction[0];
  dot.directionY = direction[1];
  dot.directionZ = direction[2];
}

// ----------------------------------------------------------------------------
// Initialise les 72 points, couleurs et directions de Collide2.
//
// Effet de bord :
// - remplit l'état compact en conservant l'ordre historique des tirages rand.
// ----------------------------------------------------------------------------
void initCollide() {
  for (uint8_t index = 0; index < COLLIDE_DOT_COUNT; index++) {
    CompactCollideDot& dot = collideDots[index];
    dot.x = rand() % SIDE;
    dot.y = rand() % SIDE;
    dot.z = rand() % SIDE;
    randomPackedColor(&dot.color);
    randomizeCollideDirection(dot);
  }
}

// ----------------------------------------------------------------------------
// Replie une coordonnée Collide2 sur l'axe logique 0 à 7.
//
// Parametres :
// - coordinate : coordonnée après un déplacement unitaire.
//
// Retour :
// - coordonnée opposée aux frontières, selon le comportement historique.
// ----------------------------------------------------------------------------
CubeAxisIndex wrapCollideCoordinate(int16_t coordinate) {
  if (coordinate >= SIDE) {
    return 0;
  }
  if (coordinate < 0) {
    return SIDE - 1;
  }
  return static_cast<CubeAxisIndex>(coordinate);
}

// ----------------------------------------------------------------------------
// Exécute une frame des 72 points Collide2.
//
// Effet de bord :
// - efface le cube, déplace et dessine les points, traite les collisions puis
//   modifie occasionnellement leurs directions avant d'afficher la frame.
// ----------------------------------------------------------------------------
void collide2() {
  background(black);

  for (uint8_t index = 0; index < COLLIDE_DOT_COUNT; index++) {
    CompactCollideDot& dot = collideDots[index];
    setPixelColor(
      dot.x,
      dot.y,
      dot.z,
      Color(dot.color.red / 8, dot.color.green / 8, dot.color.blue / 8)
    );

    dot.x = wrapCollideCoordinate(dot.x + dot.directionX);
    dot.y = wrapCollideCoordinate(dot.y + dot.directionY);
    dot.z = wrapCollideCoordinate(dot.z + dot.directionZ);

    // Couleur déjà présente à la future position du point.
    const Color occupiedColor = getPixelColor(dot.x, dot.y, dot.z);
    // Collision détectée dès qu'un canal du voxel cible est non nul.
    const bool collision =
      occupiedColor.red != 0 || occupiedColor.green != 0 || occupiedColor.blue != 0;
    Color renderedColor(dot.color.red, dot.color.green, dot.color.blue);
    if (collision) {
      renderedColor = Color(128, 128, 128);
      sphere(Point(dot.x, dot.y, dot.z), 1, Color(4, 4, 4));
    }
    setPixelColor(dot.x, dot.y, dot.z, renderedColor);

    if (collision) {
      dot.x = rand() % SIDE;
      dot.y = rand() % SIDE;
      dot.z = rand() % SIDE;
    }
  }

  for (uint8_t index = 0; index < COLLIDE_DOT_COUNT; index++) {
    if (rand() % 16 != 0) {
      continue;
    }
    randomizeCollideDirection(collideDots[index]);
  }

  if (stop || stopDemo) {
    return;
  }
  showPixels();
  delay(speed);
  run = TRUE;
}

// ----------------------------------------------------------------------------
// Dessine la sphère creuse historique autour d'un centre.
//
// Parametres :
// - center : centre logique de la sphère.
// - radius : rayon historique, égal à un dans Collide2.
// - color : couleur écrite pour chaque échantillon valide.
//
// Effet de bord :
// - effectue 900 tentatives d'écriture avec la troncature flottante historique.
// ----------------------------------------------------------------------------
void sphere(Point center, float radius, Color color) {
  // Résolution angulaire historique sur chacun des deux axes.
  const float resolution = 30;
  for (float m = 0; m < resolution; m++) {
    for (float n = 0; n < resolution; n++) {
      setPixelColor(
        static_cast<int>(
          center.x + radius * sin(static_cast<float>(PI) * m / resolution) *
          cos(static_cast<float>(2) * PI * n / resolution)
        ),
        static_cast<int>(
          center.y + radius * sin(static_cast<float>(PI) * m / resolution) *
          sin(static_cast<float>(2) * PI * n / resolution)
        ),
        static_cast<int>(
          center.z + radius * cos(static_cast<float>(PI) * m / resolution)
        ),
        color
      );
    }
  }
}

#endif
