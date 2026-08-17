// ============================================================================
// Plasma - Implementation des champs de distance animes
// ----------------------------------------------------------------------------
// Ce fichier calcule trois centres de Lissajous et 512 couleurs. Il réduit les
// racines redondantes tout en conservant une tolérance maximale d'un canal.
// ============================================================================

#ifdef L3D_UNITY_BUILD

// ----------------------------------------------------------------------------
// Calcule et affiche une frame Plasma à partir de trois centres mobiles.
//
// Effet de bord :
// - avance la phase, écrit les 512 voxels et affiche le framebuffer.
// ----------------------------------------------------------------------------
void zPlasma() {
  // Facteur historique de luminosité, compris entre zéro et un.
  const float plasmaBrightness =
    constrain(map(brightness, 0, 255, 0, 100), 0, 100) * .01;
  Color plasmaColor;
  run = TRUE;

  // Rapport historique entre la vitesse utilisateur et le pas de phase.
  const float ratio = (.18 - .003) / ((120 * .003) - .003);
  // Pas fractionnaire appliqué à la phase courante.
  const float phaseStep =
    .003 + ratio * ((map(speed, 1, 120, 120, 1) * .003) - .003);
  phase += phaseStep;

  // Premier centre Lissajous dans le domaine logique zéro à huit.
  const Point point1 = {
    (sin(phase * 1.000) + 1.0) * 4,
    (sin(phase * 1.310) + 1.0) * 4.0,
    (sin(phase * 1.380) + 1.0) * 4.0
  };
  // Deuxième centre Lissajous dans le domaine logique zéro à huit.
  const Point point2 = {
    (sin(phase * 1.770) + 1.0) * 4,
    (sin(phase * 2.865) + 1.0) * 4.0,
    (sin(phase * 1.410) + 1.0) * 4.0
  };
  // Troisième centre Lissajous dans le domaine logique zéro à huit.
  const Point point3 = {
    (sin(phase * 0.250) + 1.0) * 4,
    (sin(phase * 0.750) + 1.0) * 4.0,
    (sin(phase * 0.380) + 1.0) * 4.0
  };

  for (uint8_t row = 0; row < SIDE; row++) {
    // Coordonnée float de la rangée, calculée une fois par boucle.
    const float rowValue = static_cast<float>(row);
    for (uint8_t column = 0; column < SIDE; column++) {
      // Coordonnée float de la colonne, calculée une fois par boucle.
      const float columnValue = static_cast<float>(column);
      for (uint8_t depth = 0; depth < SIDE; depth++) {
        // Coordonnée float de la profondeur courante.
        const float depthValue = static_cast<float>(depth);

        // Écarts du voxel vers le premier centre.
        const float delta1X = columnValue - point1.x;
        const float delta1Y = rowValue - point1.y;
        const float delta1Z = depthValue - point1.z;
        // Distance au carré vers le premier centre.
        const float distanceSquared1 =
          delta1X * delta1X + delta1Y * delta1Y + delta1Z * delta1Z;

        // Écarts du voxel vers le deuxième centre.
        const float delta2X = columnValue - point2.x;
        const float delta2Y = rowValue - point2.y;
        const float delta2Z = depthValue - point2.z;
        // Distance au carré vers le deuxième centre.
        const float distanceSquared2 =
          delta2X * delta2X + delta2Y * delta2Y + delta2Z * delta2Z;

        // Écarts du voxel vers le troisième centre.
        const float delta3X = columnValue - point3.x;
        const float delta3Y = rowValue - point3.y;
        const float delta3Z = depthValue - point3.z;
        // Distance au carré vers le troisième centre.
        const float distanceSquared3 =
          delta3X * delta3X + delta3Y * delta3Y + delta3Z * delta3Z;

        // Produit des deux premières distances avec une seule racine carrée.
        const float distanceProduct = sqrt(distanceSquared1 * distanceSquared2);
        // Modulation historique sinusoïdale des trois canaux.
        const float modulation =
          sin(distanceProduct * colorStretch) + 2.0 * 0.5;

        plasmaColor.red = distanceSquared1 * modulation * plasmaBrightness;
        plasmaColor.green = distanceSquared2 * modulation * plasmaBrightness;
        plasmaColor.blue = distanceSquared3 * modulation * plasmaBrightness;

        if (stop || stopDemo) {
          return;
        }
        setPixelColor(row, column, depth, plasmaColor);
      }
    }
  }

  if (stop || stopDemo) {
    return;
  }
  showPixels();
}

#endif
