// ============================================================================
// Snake - Implementation de l'animation du serpent autonome
// ----------------------------------------------------------------------------
// Ce fichier gere le corps et la cible dans un stockage fixe. Les 1 536 octets
// du corps partagent le scratch des modes mutuellement exclusifs.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Indique si deux positions discretes de Snake sont identiques.
//
// Parametres :
// - left : première position à comparer.
// - right : seconde position à comparer.
//
// Retour :
// - vrai lorsque les trois coordonnées sont égales.
// ----------------------------------------------------------------------------
bool snakeVoxelsEqual(const voxel& left, const voxel& right) {
  return left.j == right.j && left.k == right.k && left.l == right.l;
}

// ----------------------------------------------------------------------------
// Additionne une position et un déplacement discret.
//
// Parametres :
// - position : position de départ.
// - direction : déplacement signé sur les trois axes.
//
// Retour :
// - position résultante, qui peut contenir une sentinelle -1 ou 8.
// ----------------------------------------------------------------------------
voxel addSnakeVoxels(const voxel& position, const voxel& direction) {
  return {
    static_cast<CubeCoordinate>(position.j + direction.j),
    static_cast<CubeCoordinate>(position.k + direction.k),
    static_cast<CubeCoordinate>(position.l + direction.l)
  };
}

// ----------------------------------------------------------------------------
// Calcule la distance euclidienne au carré entre deux voxels.
//
// Parametres :
// - source : position de départ.
// - target : position cible.
//
// Retour :
// - somme entière des carrés, suffisante pour classer les directions.
// ----------------------------------------------------------------------------
int16_t snakeDistanceSquared(const voxel& source, const voxel& target) {
  // Écart signé sur l'axe j, conservé sur 16 bits avant multiplication.
  const int16_t deltaJ = static_cast<int16_t>(target.j) - source.j;
  // Écart signé sur l'axe k, conservé sur 16 bits avant multiplication.
  const int16_t deltaK = static_cast<int16_t>(target.k) - source.k;
  // Écart signé sur l'axe l, conservé sur 16 bits avant multiplication.
  const int16_t deltaL = static_cast<int16_t>(target.l) - source.l;
  return deltaJ * deltaJ + deltaK * deltaK + deltaL * deltaL;
}

// ----------------------------------------------------------------------------
// Recherche un voxel dans une liste fixe bornée.
//
// Parametres :
// - voxels : début de la liste à parcourir.
// - count : nombre d'éléments valides dans voxels.
// - candidate : position recherchée.
//
// Retour :
// - vrai si candidate est déjà présente dans la liste.
// ----------------------------------------------------------------------------
bool containsSnakeVoxel(const voxel* voxels, uint16_t count, const voxel& candidate) {
  for (uint16_t index = 0; index < count; index++) {
    if (snakeVoxelsEqual(voxels[index], candidate)) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------
// Affiche une frame de Snake avec son corps et sa cible éventuelle.
//
// Effet de bord :
// - avance l'état, remplit le framebuffer, affiche les LED et applique le délai
//   historique commandé par la vitesse globale.
// ----------------------------------------------------------------------------
void snake() {
  Color segmentColor;
  snakeFrameCount++;

  if (snakeDeathFrame == 0) {
    moveSnake();
  } else if (snakeFrameCount - snakeDeathFrame > 48) {
    snakeResetCube();
  }

  background(black);
  for (uint16_t index = 0; index < snakeLength; index++) {
    // Segment courant lu dans le scratch partagé réservé à Snake.
    const voxel& segment = snakeVoxels[index];
    if (snakeDeathFrame != 0 && snakeFrameCount % 16 < 8) {
      segmentColor = Color(255, 255, 255);
    } else if (snakeDeathFrame != 0) {
      segmentColor = Color(255, 0, 0);
    } else {
      segmentColor = Color(
        (segment.j + 1) * 255 / SIDE,
        (segment.k + 1) * 255 / SIDE,
        (segment.l + 1) * 255 / SIDE
      );
    }
    setPixelColor(segment.j, segment.k, segment.l, segmentColor);
  }

  if (snakeDeathFrame == 0 && snakeTreatActive) {
    setPixelColor(snakeTreat.j, snakeTreat.k, snakeTreat.l, Color(150, 255, 0));
  }

  if (stop || stopDemo) {
    return;
  }
  showPixels();
  delay(speed);
  run = TRUE;
}

// ----------------------------------------------------------------------------
// Avance le corps d'un voxel selon la direction choisie.
//
// Effet de bord :
// - déplace le contenu du scratch, consomme éventuellement la cible et marque
//   la frame de collision lorsque plus aucun déplacement n'est possible.
// ----------------------------------------------------------------------------
void moveSnake() {
  updateDirection();
  if (snakeDirectionIndex < 0) {
    snakeDeathFrame = snakeFrameCount;
    return;
  }

  bool grow = snakeLength < SNAKE_INITIAL_LENGTH;
  // Nouvelle tête calculée avant le déplacement du tableau en place.
  const voxel front = addSnakeVoxels(
    snakeVoxels[0],
    possibleDirections[snakeDirectionIndex]
  );

  if (snakeTreatActive && snakeVoxelsEqual(snakeTreat, front)) {
    snakeTreatActive = false;
    grow = true;
  }

  // Nouvelle longueur bornée à la capacité exacte du cube.
  const uint16_t nextLength = grow && snakeLength < SNAKE_CAPACITY
    ? snakeLength + 1
    : snakeLength;

  for (uint16_t index = nextLength; index > 1; index--) {
    snakeVoxels[index - 1] = snakeVoxels[index - 2];
  }
  snakeVoxels[0] = front;
  snakeLength = nextLength;

  if (!snakeTreatActive) {
    addTreat();
  }
}

// ----------------------------------------------------------------------------
// Vérifie si une direction reste dans le cube et évite le corps.
//
// Parametres :
// - directionIndex : index candidat dans possibleDirections.
//
// Retour :
// - vrai si la future tête peut occuper la position calculée.
// ----------------------------------------------------------------------------
bool canMove(uint8_t directionIndex) {
  if (directionIndex >= SNAKE_DIRECTION_COUNT || snakeLength == 0) {
    return false;
  }

  // Position candidate pouvant atteindre les sentinelles -1 ou 8.
  const voxel next = addSnakeVoxels(
    snakeVoxels[0],
    possibleDirections[directionIndex]
  );
  return isVoxelCoordinateValid(next.j) &&
         isVoxelCoordinateValid(next.k) &&
         isVoxelCoordinateValid(next.l) &&
         !containsSnakeVoxel(snakeVoxels, snakeLength, next);
}

// ----------------------------------------------------------------------------
// Place une cible libre sans allocation ni boucle aléatoire non bornée.
//
// Retour :
// - vrai lorsqu'une cible a été placée, faux si le domaine historique est plein.
//
// Effet de bord :
// - actualise snakeTreat et snakeTreatActive.
// ----------------------------------------------------------------------------
bool addTreat() {
  snakeTreatActive = false;

  for (uint16_t attempt = 0; attempt < SNAKE_TREAT_RANDOM_ATTEMPTS; attempt++) {
    // Candidat aléatoire conservant la borne exclusive historique random(0, 7).
    const voxel candidate = {
      static_cast<CubeCoordinate>(random(0, SNAKE_TREAT_SIDE)),
      static_cast<CubeCoordinate>(random(0, SNAKE_TREAT_SIDE)),
      static_cast<CubeCoordinate>(random(0, SNAKE_TREAT_SIDE))
    };
    if (!containsSnakeVoxel(snakeVoxels, snakeLength, candidate)) {
      snakeTreat = candidate;
      snakeTreatActive = true;
      return true;
    }
  }

  for (CubeAxisIndex j = 0; j < SNAKE_TREAT_SIDE; j++) {
    for (CubeAxisIndex k = 0; k < SNAKE_TREAT_SIDE; k++) {
      for (CubeAxisIndex l = 0; l < SNAKE_TREAT_SIDE; l++) {
        // Candidat déterministe garantissant la terminaison du placement.
        const voxel candidate = {
          static_cast<CubeCoordinate>(j),
          static_cast<CubeCoordinate>(k),
          static_cast<CubeCoordinate>(l)
        };
        if (!containsSnakeVoxel(snakeVoxels, snakeLength, candidate)) {
          snakeTreat = candidate;
          snakeTreatActive = true;
          return true;
        }
      }
    }
  }

  return false;
}

// ----------------------------------------------------------------------------
// Conserve ou choisit la direction valide la plus proche de la cible.
//
// Effet de bord :
// - actualise snakeDirectionIndex, ou le place à -1 lorsque Snake est bloqué.
// ----------------------------------------------------------------------------
void updateDirection() {
  if (snakeDirectionIndex >= 0 &&
      canMove(static_cast<uint8_t>(snakeDirectionIndex)) &&
      random(0, 100) < 80) {
    return;
  }

  uint8_t allowedDirections[SNAKE_DIRECTION_COUNT];
  uint8_t allowedCount = 0;
  for (uint8_t directionIndex = 0;
       directionIndex < SNAKE_DIRECTION_COUNT;
       directionIndex++) {
    if (canMove(directionIndex)) {
      allowedDirections[allowedCount++] = directionIndex;
    }
  }

  if (allowedCount == 0) {
    snakeDirectionIndex = -1;
    return;
  }

  if (!snakeTreatActive) {
    snakeDirectionIndex = allowedDirections[0];
    return;
  }

  int16_t leastDistance = INT16_MAX;
  snakeDirectionIndex = allowedDirections[0];
  for (uint8_t allowedIndex = 0; allowedIndex < allowedCount; allowedIndex++) {
    // Index de direction conservant l'ordre de priorité historique.
    const uint8_t directionIndex = allowedDirections[allowedIndex];
    // Future tête évaluée sans modifier le corps.
    const voxel next = addSnakeVoxels(
      snakeVoxels[0],
      possibleDirections[directionIndex]
    );
    // Distance entière utilisée uniquement pour le classement des directions.
    const int16_t distance = snakeDistanceSquared(next, snakeTreat);
    if (distance < leastDistance) {
      leastDistance = distance;
      snakeDirectionIndex = directionIndex;
    }
  }
}

// ----------------------------------------------------------------------------
// Réinitialise entièrement l'état fixe de Snake.
//
// Effet de bord :
// - efface le rendu, initialise un segment, remet les compteurs à zéro et place
//   une nouvelle cible dans le domaine historique.
// ----------------------------------------------------------------------------
void snakeResetCube() {
  background(black);
  snakeDirectionIndex = 0;
  snakeLength = 1;
  snakeVoxels[0] = {0, 0, 0};
  snakeDeathFrame = 0;
  snakeFrameCount = 0;
  snakeTreatActive = false;
  addTreat();
}

#endif
