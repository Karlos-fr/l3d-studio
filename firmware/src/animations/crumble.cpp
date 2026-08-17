// ============================================================================
// Crumble - Implementation de l'effondrement par plans
// ----------------------------------------------------------------------------
// Ce fichier retire les 64 positions d'un tableau fixe dans le scratch partagé.
// Il ne conserve aucune allocation dynamique entre les frames.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Avance ou sélectionne la prochaine colonne du plan à effondrer.
//
// Effet de bord :
// - actualise pick et Coffset, affiche une étape et applique le délai historique.
// ----------------------------------------------------------------------------
void crumble() {
  if (shift()) {
    return;
  }

  pick = draw();
  Coffset = 0;

  if (stop || stopDemo) {
    return;
  }
  showPixels();
  delay(speed);
  run = TRUE;
}

// ----------------------------------------------------------------------------
// Convertit une position du cycle en coordonnées logiques puis écrit sa couleur.
//
// Parametres :
// - x : première coordonnée du plan.
// - y : seconde coordonnée du plan.
// - z : profondeur courante.
// - clear : vrai pour effacer le voxel, faux pour utiliser mainColor.
//
// Effet de bord :
// - écrit un voxel via la primitive bornée setPixelColor().
// ----------------------------------------------------------------------------
void setVoxel(int x, int y, int z, bool clear) {
  if (Cmirror) {
    z = SIDE - 1 - z;
  }

  int temporaryCoordinate;
  switch (CRaxis) {
    case 0:
      temporaryCoordinate = y;
      y = z;
      z = temporaryCoordinate;
      break;
    case 1:
      temporaryCoordinate = x;
      x = z;
      z = temporaryCoordinate;
      break;
    case 2:
      temporaryCoordinate = x;
      x = y;
      y = temporaryCoordinate;
      break;
  }

  setPixelColor(x, y, z, clear ? clearColor : mainColor);
}

// ----------------------------------------------------------------------------
// Déplace d'une profondeur la colonne sélectionnée.
//
// Retour :
// - vrai tant que la colonne possède une profondeur supplémentaire à afficher.
//
// Effet de bord :
// - allume la profondeur courante, efface la précédente et incrémente Coffset.
// ----------------------------------------------------------------------------
bool shift() {
  // Première coordonnée du plan encodée dans pick.
  const uint8_t x = pick / SIDE;
  // Seconde coordonnée du plan encodée dans pick.
  const uint8_t y = pick % SIDE;

  setVoxel(x, y, Coffset, false);
  if (Coffset > 0) {
    setVoxel(x, y, Coffset - 1, true);
  }
  return ++Coffset < SIDE;
}

// ----------------------------------------------------------------------------
// Retire aléatoirement une position encore disponible dans le plan.
//
// Retour :
// - position linéaire choisie entre zéro et 63.
//
// Effet de bord :
// - compacte le tableau et réinitialise le cycle lorsque le plan devient vide.
// ----------------------------------------------------------------------------
uint8_t draw() {
  if (crumbleRemainingCount == 0) {
    resetCycle();
  }

  uint64_t scaledRandom =
    static_cast<uint64_t>(rand()) * (crumbleRemainingCount - 1);
  // Index obtenu avec la même mise à l'échelle que le calcul historique.
  const uint8_t randomIndex = static_cast<uint8_t>(scaledRandom / RAND_MAX);
  // Position du plan renvoyée avant compactage du tableau.
  const uint8_t selectedPosition = crumbleRemaining[randomIndex];

  for (uint8_t index = randomIndex + 1; index < crumbleRemainingCount; index++) {
    crumbleRemaining[index - 1] = crumbleRemaining[index];
  }
  crumbleRemainingCount--;

  if (crumbleRemainingCount == 0) {
    mainColor = Color(rand() % 255, rand() % 255, rand() % 255);
    resetCycle();
  }
  return selectedPosition;
}

// ----------------------------------------------------------------------------
// Réinitialise entièrement le plan et sélectionne l'orientation suivante.
//
// Effet de bord :
// - alterne le miroir, avance éventuellement l'axe, efface le cube et recharge
//   exactement les 64 positions dans le scratch partagé.
// ----------------------------------------------------------------------------
void resetCycle() {
  pick = 0;
  Coffset = 0;
  Cmirror = !Cmirror;
  if (++flips >= NUM_FLIPS) {
    if (++CRaxis > 2) {
      CRaxis = 0;
    }
    flips = 0;
  }

  for (uint8_t x = 0; x < SIDE; x++) {
    for (uint8_t y = 0; y < SIDE; y++) {
      for (uint8_t z = 0; z < SIDE; z++) {
        setVoxel(x, y, z, true);
      }
    }
  }

  crumbleRemainingCount = 0;
  for (uint8_t position = 0; position < CRUMBLE_POSITION_COUNT; position++) {
    crumbleRemaining[crumbleRemainingCount++] = position;
    // Première coordonnée du plan restaurée.
    const uint8_t x = position / SIDE;
    // Seconde coordonnée du plan restaurée.
    const uint8_t y = position % SIDE;
    setVoxel(x, y, 0, false);
  }
}

#endif
